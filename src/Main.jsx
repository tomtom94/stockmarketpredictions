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
      const sampleDataRaw = splitData([0.98, 1]);
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
      series.findIndex((serie) => serie.name === "Base value") === -1
    ) {
      setSeries([
        ...series,
        {
          type: "area",
          name: "Base value",
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
  //         data: dataSma20.map((e) => [new Date(e[0]).getTime(), e[1].value]),
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
  //         data: dataSma50.map((e) => [new Date(e[0]).getTime(), e[1].value]),
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
          data: dataSma100.map((e) => [new Date(e[0]).getTime(), e[1].value]),
        },
      ]);
    }
  }, [dataSma100, series]);

  const splitData = (trainingRange) => {
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
            // new Date(curr[0]).getTime(),
            Number(curr[1]["4. close"]),
            descSma20[index][1].value,
            descSma50[index][1].value,
            descSma100[index][1].value,
            descRsi14[index][1].value,
            descRsi28[index][1].value,
            descStochastic14[index][1].value,
          ],
        ];
      }, [])
      .reverse();
    const chunk = dataRaw.slice(
      trainingRange[0] === 0 ? 0 : Math.ceil(trainingRange[0] * data.length),
      trainingRange[1] === 1
        ? dataRaw.length
        : Math.floor(trainingRange[1] * data.length)
    );
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
    if (!dimensionParam) {
      return [];
    }
    return dataRaw.map((e) => e * dimensionParam.std + dimensionParam.mean);
  };

  const makeDataset = (range) => {
    const dataRange = splitData(range);
    const { dataNormalized, dimensionParams } = normalizeData(dataRange);
    const dataset = tf.tensor2d(dataNormalized);
    const inputDimensions = dataRange[0].length;
    const sliceNumber = Math.floor((dataRange.length - 1) / 2);

    const inputs = tf.slice(dataset, [0], [sliceNumber]);

    let labels = tf.slice(dataset, [sliceNumber], [sliceNumber]);

    labels = tf.split(labels, inputDimensions, 1)[0];

    return {
      inputs,
      labels,
      inputDimensions,
      dimensionParams,
    };
  };

  const createModel = async () => {
    try {
      rebootSeries();
      setIsModelTraining(true);
      setModelResultTraining(null);
      const train = makeDataset([0, 0.7]);
      const validate = makeDataset([0.7, 0.9]);

      const model = tf.sequential();

      model.add(
        tf.layers.dense({
          units: 1,
          inputShape: [train.inputDimensions],
        })
      );

      const epochs = 100;

      model.compile({ optimizer: "sgd", loss: "meanSquaredError" });

      setModelLogs([]);
      modelLogsRef.current = [];
      const history = await model.fit(train.inputs, train.labels, {
        batchSize: 32,
        epochs,
        validationData: [validate.inputs, validate.labels],
        shuffle: true,
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
        dimensionParams: train.dimensionParams,
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
    const xs = splitData([0.9, 1]);
    const { dataNormalized } = normalizeData(
      xs,
      modelResultTraining.dimensionParams
    );
    const ys = gessLabels(dataNormalized, modelResultTraining.dimensionParams);
    const lastDate = data[data.length - 1][0];
    const dataSeriePredicted = ys.map((label, i) => {
      const datePredicted = new Date(lastDate).setDate(
        new Date(lastDate).getDate() + i
      );
      return [datePredicted, label];
    });
    setSeries([
      ...newSeries,
      {
        type: "area",
        name: "Validate with known X but unknown Y",
        data: dataSeriePredicted,
      },
    ]);
  };

  const rebootSeries = () => {
    const serieIndex = series.findIndex(
      (serie) => serie.name === "Validate with known X but unknown Y"
    );
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
              {sampleData.sampleDataRaw.map((e1, i1) => (
                <tr key={`row-${i1}`}>
                  {e1.map((e2, i2) => (
                    <td key={`column-${i1}`}>{e2}</td>
                  ))}
                </tr>
              ))}
            </table>
            <p>Exemple data normalized below</p>
            <table>
              {sampleData.sampleDataNormalized.map((e1, i1) => (
                <tr key={`row-${i1}`}>
                  {e1.map((e2, i2) => (
                    <td key={`column-${i1}`}>{e2}</td>
                  ))}
                </tr>
              ))}
            </table>
          </>
        )}
        <p>
          We use a (70%, 20%, 10%) periods split for the training, validation,
          and test sets.
        </p>
        <ul>
          <li>
            Create and validate model button : uses training and validation sets
            (70% and 20%)
          </li>
          <li>
            Make predictions button : uses test set (10%). Which means we are
            making predictions on the next 10% periods in the future straight.
          </li>
        </ul>
        <p>
          Analysis : Amazon only goes up each time, then the algorithm is pretty
          kind and make it goes up, like always.
        </p>
      </div>
    </div>
  );
};

export default hot(Main);
