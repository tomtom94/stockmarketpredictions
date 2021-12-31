import React, { useEffect, useCallback, useState, useRef } from "react";
import { hot } from "react-hot-loader/root";
import Highcharts, { css } from "highcharts";
import HighchartsReact from "highcharts-react-official";
import * as tf from "@tensorflow/tfjs";
import { SMA, RSI, stochastic } from "./technicalindicators";

import stockMarketData from "./stockMarketData.json";

const Main = () => {
  const [data, setData] = useState([]);
  const [series, setSeries] = useState([]);
  const [isModelTraining, setIsModelTraining] = useState(false);
  const [modelLogs, setModelLogs] = useState([]);
  const [modelResultTraining, setModelResultTraining] = useState(null);
  const modelLogsRef = useRef([]);
  const [dataSma20, setDataSma20] = useState(null);
  const [dataSma50, setDataSma50] = useState(null);
  const [dataSma100, setDataSma100] = useState(null);
  const [dataRsi14, setDataRsi14] = useState(null);
  const [dataRsi28, setDataRsi28] = useState(null);
  const [dataStochastic14, setDataStochastic14] = useState(null);
  const [sampleData, setSampleData] = useState(null);

  useEffect(() => {
    const isSplitDataReady =
      data.length > 0 &&
      dataSma20 &&
      dataSma50 &&
      dataSma100 &&
      dataRsi14 &&
      dataRsi28 &&
      dataStochastic14;
    if (isSplitDataReady) {
      const sampleDataRaw = sliceData([0.98, 1]).map((e) => e[1]);
      const {
        dataNormalized: sampleDataNormalized,
        dimensionParams: sampleDimensionParams,
      } = normalizeData(sampleDataRaw);
      setSampleData({ sampleDataRaw, sampleDataNormalized });
    }
  }, [
    data,
    dataSma20,
    dataSma50,
    dataSma100,
    dataRsi14,
    dataRsi28,
    dataStochastic14,
  ]);

  useEffect(() => {
    if (data.length) {
      setDataStochastic14(
        stochastic({
          period: 14,
          data,
        })
      );
      setDataRsi14(
        RSI({
          period: 14,
          data,
        })
      );
      setDataRsi28(
        RSI({
          period: 28,
          data,
        })
      );
      setDataSma20(
        SMA({
          period: 20,
          data,
        })
      );
      setDataSma50(
        SMA({
          period: 50,
          data,
        })
      );
      setDataSma100(
        SMA({
          period: 100,
          data,
        })
      );
    }
  }, [data]);

  useEffect(() => {
    setData(
      Object.entries(stockMarketData["Time Series (Daily)"]).sort(
        (a, b) => new Date(a[0]) - new Date(b[0])
      )
    );
  }, []);

  useEffect(() => {
    if (
      data.length &&
      series.findIndex((serie) => serie.name === "Stock price") === -1
    ) {
      setSeries([
        ...series,
        {
          type: "area",
          name: "Stock price",
          data: data.map((serie) => [
            new Date(serie[0]).getTime(),
            Number(serie[1]["4. close"]),
          ]),
        },
      ]);
    }
  }, [data, series]);

  // useEffect(() => {
  //   if (
  //     dataSma20 &&
  //     series.findIndex((serie) => serie.name === "SMA 20 periods") === -1
  //   ) {
  //     setSeries([
  //       ...series,
  //       {
  //         type: "area",
  //         name: "SMA 20 periods",
  //         data: dataSma20.map((e) => [new Date(e[0]).getTime(), e]),
  //       },
  //     ]);
  //   }
  // }, [dataSma20, series]);

  // useEffect(() => {
  //   if (
  //     dataSma50 &&
  //     series.findIndex((serie) => serie.name === "SMA 50 periods") === -1
  //   ) {
  //     setSeries([
  //       ...series,
  //       {
  //         type: "area",
  //         name: "SMA 50 periods",
  //         data: dataSma50.map((e) => [new Date(e[0]).getTime(), e]),
  //       },
  //     ]);
  //   }
  // }, [dataSma50, series]);

  useEffect(() => {
    if (
      dataSma100 &&
      series.findIndex((serie) => serie.name === "SMA 100 periods") === -1
    ) {
      setSeries([
        ...series,
        {
          type: "area",
          name: "SMA 100 periods",
          data: dataSma100.map((e) => [new Date(e[0]).getTime(), e]),
        },
      ]);
    }
  }, [dataSma100, series]);

  const sliceData = (trainingRange) => {
    const descSma20 = JSON.parse(JSON.stringify(dataSma20)).reverse();
    const descSma50 = JSON.parse(JSON.stringify(dataSma50)).reverse();
    const descSma100 = JSON.parse(JSON.stringify(dataSma100)).reverse();
    const descRsi14 = JSON.parse(JSON.stringify(dataRsi14)).reverse();
    const descRsi28 = JSON.parse(JSON.stringify(dataRsi28)).reverse();
    const descStochastic14 = JSON.parse(
      JSON.stringify(dataStochastic14)
    ).reverse();
    const dataRaw = JSON.parse(JSON.stringify(data))
      .reverse()
      .reduce((acc, curr, index, array) => {
        if (
          !descSma20[index] ||
          !descSma50[index] ||
          !descSma100[index] ||
          !descRsi14[index] ||
          !descRsi28[index] ||
          !descStochastic14[index]
        ) {
          return acc;
        }
        return [
          ...acc,
          [
            curr[0],
            [
              Number(curr[1]["4. close"]),
              descSma20[index],
              descSma50[index],
              descSma100[index],
              descRsi14[index],
              descRsi28[index],
              descStochastic14[index],
            ],
          ],
        ];
      }, [])
      .reverse();
    const [bottom, top] = trainingRange;
    let chunk = [];
    if (bottom < 1 && top <= 1) {
      chunk = dataRaw.slice(
        bottom === 0 ? 0 : Math.ceil(bottom * data.length),
        top === 1 ? dataRaw.length : Math.floor(top * data.length)
      );
    } else {
      if (bottom && !top) {
        chunk = dataRaw.slice(bottom);
      } else {
        chunk = dataRaw.slice(bottom, top);
      }
    }
    return chunk;
  };

  const normalizeData = (dataRaw, params) => {
    const unstackData = (stachData, axis) => stachData.map((e) => e[axis]);
    const dataPerDimension = [];
    for (let i = 0; i < dataRaw[0].length; i++) {
      dataPerDimension.push(unstackData(dataRaw, i));
    }
    let dimensionParams = params;

    if (!params) {
      dimensionParams = dataPerDimension.map((dimension) => {
        const mean =
          dimension.reduce((acc, curr) => acc + curr, 0) / dimension.length;
        const min = dimension.reduce((acc, curr) => {
          if (curr > acc) {
            return acc;
          }
          return curr;
        }, null);
        const max = dimension.reduce((acc, curr) => {
          if (curr < acc) {
            return acc;
          }
          return curr;
        }, null);
        return {
          min,
          max,
          mean,
          std: Math.sqrt(
            dimension
              .map((e) => Math.abs(e - mean) ** 2)
              .reduce((acc, curr) => acc + curr, 0) / dimension.length
          ),
          // https://www.geeksforgeeks.org/numpy-std-in-python/
        };
      });
    }

    return {
      dataNormalized: dataRaw.map((set) =>
        set.map(
          (e, i) => (e - dimensionParams[i].mean) / dimensionParams[i].std
        )
      ),
      // https://www.tensorflow.org/tutorials/structured_data/time_series#normalize_the_data
      dimensionParams,
    };
  };

  const unNormalizeData = (dataRaw, dimensionParam) => {
    return dataRaw.map((e) => e * dimensionParam.std + dimensionParam.mean);
  };

  const makeDataset = async (range) => {
    const dataRange = sliceData(range).map((e) => e[1]);
    const { dataNormalized, dimensionParams } = normalizeData(dataRange);

    // const dataset = tf.tensor2d(dataNormalized);
    const xDataset = tf.data.array(
      dataNormalized.slice(0, dataNormalized.length - 1)
    );
    const yDataset = tf.data.array(dataNormalized.map((e) => e[0])).skip(1);
    const xyDataset = tf.data.zip({ xs: xDataset, ys: yDataset }).batch(32);
    return {
      dataset: xyDataset,
      dimensionParams,
    };
  };

  const createModel = async () => {
    try {
      rebootSeries();
      setIsModelTraining(true);
      setModelResultTraining(null);
      const { dataset: train, dimensionParams } = await makeDataset([0, 0.7]);
      const { dataset: validate } = await makeDataset([0.7, 0.9]);
      const model = tf.sequential();

      model.add(
        tf.layers.dense({
          units: 1,
          inputShape: [7],
        })
      );

      const epochs = 20;

      model.compile({ optimizer: "sgd", loss: "meanSquaredError" });
      setModelLogs([]);
      modelLogsRef.current = [];
      const history = await model.fitDataset(train, {
        epochs,
        validationData: validate,
        callbacks: {
          onEpochEnd: (epoch, log) => {
            modelLogsRef.current.push([epoch + 1, log.loss]);
            setModelLogs([...modelLogsRef.current]);
          },
        },
      });
      const result = {
        model: model,
        stats: history,
      };
      setModelResultTraining(result);
    } catch (error) {
      throw error;
    } finally {
      setIsModelTraining(false);
    }
  };

  const gessLabels = (inputs, dimensionParams) => {
    const xs = tf.tensor2d(inputs, [inputs.length, inputs[0].length]);
    let outputs = modelResultTraining.model.predict(xs);
    outputs = Array.from(outputs.dataSync());
    const results = unNormalizeData(outputs, dimensionParams[0]);
    return results;
  };

  const makePredictions = () => {
    const newSeries = rebootSeries();
    let xs = sliceData([0.9, 1]).reverse();
    const chunks = [];
    for (let i = 0; i < xs.length - 1; i++) {
      chunks.push(xs.slice(i, i + 32));
    }

    const predictions = [];
    const newChunks = chunks.map((e) => e.reverse()).reverse();
    newChunks.forEach((chunk, index, array) => {
      if (chunk.length < 32) {
        return;
      }
      const { dataNormalized, dimensionParams } = normalizeData(
        chunk.map((e) => e[1])
      );
      let ys = gessLabels(dataNormalized, dimensionParams);
      ys = ys[ys.length - 1];
      let datePredicted;
      if (array[index + 1]) {
        const nextChunk = array[index + 1];
        datePredicted = new Date(nextChunk[nextChunk.length - 1][0]).getTime();
      } else {
        const lastDate = chunk[chunk.length - 1][0];
        datePredicted = new Date(lastDate).setDate(
          new Date(lastDate).getDate() + 1
        );
      }
      predictions.push([datePredicted, ys]);
    });

    setSeries([
      ...newSeries,
      {
        type: "area",
        name: "Prediction",
        data: predictions,
      },
    ]);
  };

  const rebootSeries = () => {
    const serieIndex = series.findIndex((serie) => serie.name === "Prediction");
    let newSeries = series;
    if (serieIndex !== -1) {
      newSeries = newSeries.splice(0, serieIndex);
      setSeries([...newSeries]);
    }
    return newSeries;
  };

  const options = {
    chart: {
      zoomType: "x",
    },
    title: {
      text: `Amazon stock market`,
    },
    subtitle: {
      text:
        document.ontouchstart === undefined
          ? "Click and drag in the plot area to zoom in"
          : "Pinch the chart to zoom in",
    },
    xAxis: {
      type: "datetime",
    },
    yAxis: {
      title: {
        text: "Value",
      },
    },
    legend: {
      enabled: false,
    },
    plotOptions: {
      area: {
        fillColor: {
          linearGradient: {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 1,
          },
          stops: [
            [0, Highcharts.getOptions().colors[0]],
            [
              1,
              Highcharts.color(Highcharts.getOptions().colors[0])
                .setOpacity(0)
                .get("rgba"),
            ],
          ],
        },
        marker: {
          radius: 2,
        },
        lineWidth: 1,
        states: {
          hover: {
            lineWidth: 1,
          },
        },
        threshold: null,
      },
    },

    series,
  };

  const options2 = {
    title: {
      text: "Model training graph",
    },

    subtitle: {
      text: "Tensorflow.js model loss through training epoch",
    },

    yAxis: {
      title: {
        text: "Loss",
      },
    },

    xAxis: {
      accessibility: {
        rangeDescription: "Epoch",
      },
    },

    plotOptions: {
      series: {
        label: {
          connectorAllowed: false,
        },
      },
    },

    series: [
      {
        name: "loss",
        data: modelLogs,
      },
    ],

    responsive: {
      rules: [
        {
          condition: {
            maxWidth: 500,
          },
        },
      ],
    },
  };

  return (
    <div>
      <h1>Welcome to Stock Market Predictions App with Tensorflow.js</h1>
      <h2>
        Use the IA in the browser with your own computer's power, don't do this
        with your smartphone ;)
      </h2>
      <HighchartsReact highcharts={Highcharts} options={options} />

      <div style={{ margin: "10px 5px" }}>
        <button
          onClick={createModel}
          type="button"
          disabled={isModelTraining}
          style={{ fontSize: 16, marginRight: 5 }}
        >
          {isModelTraining ? "Model is training" : "Create and validate model"}
        </button>
        <button
          onClick={makePredictions}
          type="button"
          disabled={!modelResultTraining}
          style={{ fontSize: 16, marginRight: 5 }}
        >
          Make predictions
        </button>
        <a
          href="https://github.com/tomtom94/stockmarketpredictions"
          target="_blank"
          style={{ fontSize: 16, margin: 5, textDecoration: "none" }}
        >
          More details on Github
        </a>
        {modelLogs.length > 0 && (
          <>
            <HighchartsReact highcharts={Highcharts} options={options2} />
          </>
        )}
        {sampleData && (
          <>
            <p>Exemple data raw below</p>
            <table>
              <tbody>
                {sampleData.sampleDataRaw.map((e1, i1) => (
                  <tr key={`sampleDataRaw-row-${i1}`}>
                    {e1.map((e2, i2) => (
                      <td key={`sampleDataRaw-column-${i2}`}>{e2}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Exemple data normalized below</p>
            <table>
              <tbody>
                {sampleData.sampleDataNormalized.map((e1, i1) => (
                  <tr key={`sampleDataNormalized-row-${i1}`}>
                    {e1.map((e2, i2) => (
                      <td key={`sampleDataNormalized-column-${i2}`}>{e2}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <p>
          We use a (70%, 20%, 10%) periods split for the training, validation,
          and test sets, via batch of 32 periods.
        </p>
        <ul>
          <li>
            Create and validate model button : uses training and validation sets
            (70% and 20%).
          </li>
          <li>
            Make predictions button : use test set (10%). Each day we guess
            tomorrow's value thanks to the last 32 periods. (you may need to
            zoom on the graph)
          </li>
        </ul>
      </div>
      <p>
        Analysis : The model's loss value is very low (inferior 0.001) which
        means indicators used are pretty reliable. But financial indicators all
        depends of past periods, then predictions won't ever beat the market,
        but would follow it up gently, keeping in memory how stock market
        reacted.
      </p>
    </div>
  );
};

export default hot(Main);
