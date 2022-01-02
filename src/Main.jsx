import React, { useEffect, useCallback, useState, useRef } from "react";
import { hot } from "react-hot-loader/root";
import Highcharts from "highcharts/highstock";
import axios from "axios";
import HighchartsReact from "highcharts-react-official";
import * as tf from "@tensorflow/tfjs";
import { SMA, RSI, stochastic, seasonality } from "./technicalindicators";

import stockMarketData from "./stockMarketData.json";

const Main = () => {
  const [data, setData] = useState([]);
  const [series, setSeries] = useState([]);
  const [isModelTraining, setIsModelTraining] = useState(false);
  const [modelLogs, setModelLogs] = useState([]);
  const [modelResultTraining, setModelResultTraining] = useState(null);
  const modelLogsRef = useRef([]);
  const [investing, setInvesting] = useState({ start: 1000, end: null });
  const [dataSma20, setDataSma20] = useState(null);
  const [dataSma50, setDataSma50] = useState(null);
  const [dataSma100, setDataSma100] = useState(null);
  const [dataRsi14, setDataRsi14] = useState(null);
  const [dataRsi28, setDataRsi28] = useState(null);
  const [dataStochastic14, setDataStochastic14] = useState(null);
  const [formError, setFormError] = useState(null);
  const [symbol, setSymbol] = useState("AMZN");

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
  }, [stockMarketData]);

  useEffect(() => {
    if (
      data.length &&
      series.findIndex((serie) => serie.name === "Stock value") === -1
    ) {
      setSeries([
        ...series,
        {
          type: "area",
          id: "dataseries",
          name: "Stock value",
          data: data.map((serie) => [
            new Date(serie[0]).getTime(),
            Number(serie[1]["4. close"]),
          ]),
          gapSize: 5,
          tooltip: {
            valueDecimals: 2,
          },
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
          threshold: null,
        },
      ]);
    }
  }, [data, series]);

  const handleSymbolChange = (event) => {
    setSymbol(event.target.value);
  };

  const getNewStock = async (event) => {
    event.preventDefault();

    setFormError(null);
    setInvesting({ start: 1000, end: null });
    setDataSma20(null);
    setDataSma50(null);
    setDataSma100(null);
    setDataRsi14(null);
    setDataRsi28(null);
    setDataStochastic14(null);
    setModelResultTraining(null);
    setModelLogs([]);
    setIsModelTraining(false);
    setSeries([]);
    setData([]);
    modelLogsRef.current = [];
    try {
      const { data } = await axios.get(
        `https://www.alphavantage.co/query?${new URLSearchParams({
          function: "TIME_SERIES_DAILY",
          symbol,
          outputsize: "full",
          apikey: "73H4T3JL70SI8VON",
        })}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      setData(
        Object.entries(data["Time Series (Daily)"]).sort(
          (a, b) => new Date(a[0]) - new Date(b[0])
        )
      );
    } catch (error) {
      setFormError(error);
    }
  };

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
            curr[0],
            [
              Number(curr[1]["4. close"]),
              Number(curr[1]["5. volume"]),
              descSma20[index],
              descSma50[index],
              descSma100[index],
              descRsi14[index],
              descRsi28[index],
              descStochastic14[index],
              seasonality({ element: curr, fn: "cos", days: 7 * 24 * 60 * 60 }),
              seasonality({ element: curr, fn: "sin", days: 7 * 24 * 60 * 60 }),
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
      dataNormalized: dataRaw.map((set) => {
        const baseValue =
          (set[0] - dimensionParams[0].mean) / dimensionParams[0].std;
        return set.reduce((acc, e, i) => {
          if (i === 0) {
            return acc;
          }
          return [
            ...acc,
            [baseValue, (e - dimensionParams[i].mean) / dimensionParams[i].std],
          ];
        }, []);
      }),
      // https://www.tensorflow.org/tutorials/structured_data/time_series#normalize_the_data
      dimensionParams,
    };
  };

  const unNormalizeData = (dataRaw, dimensionParam) =>
    dataRaw.map((e) => e * dimensionParam.std + dimensionParam.mean);

  const makeDataset = async (range) => {
    const dataRange = splitData(range).map((e) => e[1]);
    const { dataNormalized, dimensionParams } = normalizeData(dataRange);
    const xDataset = tf.data
      .array(dataNormalized)
      .take(dataNormalized.length - 1);
    const yDataset = tf.data
      .array(dataNormalized)
      .map((e) => e[0][0])
      .skip(1);
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

      /**
       * Solution 1 : use of RNN combine with lstmCell
       */
      const cells = [
        tf.layers.lstmCell({ units: 9 }),
        tf.layers.lstmCell({ units: 9 }),
      ];

      model.add(
        tf.layers.rnn({
          cell: cells,
          returnSequences: true,
          inputShape: [9, 2],
        })
      );

      /**
       * Solution 2 : just use of simpleRNN
       */
      // model.add(
      //   tf.layers.simpleRNN({
      //     units: 20,
      //     inputShape: [9, 2],
      //     returnSequences: true,
      //   })
      // );

      // model.add(
      //   tf.layers.simpleRNN({
      //     units: 20,
      //     returnSequences: true,
      //   })
      // );

      /**
       * Solution 3 : just use a linear layer
       */
      // model.add(
      //   tf.layers.dense({
      //     units: 1,
      //     inputShape: [9, 2],
      //   })
      // );

      model.add(
        tf.layers.dense({
          units: 1,
        })
      );

      // model.summary();
      const epochs = 10;

      model.compile({
        optimizer: "adam",
        loss: "meanSquaredError",
        metrics: ["accuracy"],
      });
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
    const xs = tf.tensor3d(inputs, [
      inputs.length,
      inputs[0].length,
      inputs[0][0].length,
    ]);
    let outputs = modelResultTraining.model.predict(xs);
    outputs = Array.from(outputs.dataSync());
    const results = unNormalizeData(outputs, dimensionParams[0]);
    return results;
  };

  const makePredictions = () => {
    const newSeries = rebootSeries();
    let xs = splitData([0.9, 1]).reverse();
    const chunks = [];
    for (let i = 0; i < xs.length - 1; i++) {
      chunks.push(xs.slice(i, i + 32));
    }

    const predictions = [];
    const newChunks = chunks.map((e) => e.reverse()).reverse();
    let money = investing.start;

    const flagsSerie = [];
    let _flag;
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
        let realEvol =
          (nextChunk[nextChunk.length - 1][1][0] -
            chunk[chunk.length - 1][1][0]) /
          chunk[chunk.length - 1][1][0];
        const predictionEvol =
          (ys - chunk[chunk.length - 1][1][0]) / chunk[chunk.length - 1][1][0];
        let flag;
        if (predictionEvol > 0) {
          money = money * (1 + realEvol);
          flag = "buy";
        }
        if (predictionEvol < 0) {
          money = money * (1 + -1 * realEvol);
          flag = "sell";
        }

        if (_flag !== flag) {
          flagsSerie.push({
            x: new Date(chunk[chunk.length - 1][0]).getTime(),
            title: flag,
          });
        }

        _flag = flag;
        datePredicted = new Date(nextChunk[nextChunk.length - 1][0]).getTime();
      } else {
        const lastDate = chunk[chunk.length - 1][0];
        datePredicted = new Date(lastDate).setDate(
          new Date(lastDate).getDate() + 1
        );
      }
      predictions.push([datePredicted, ys]);
    });
    setInvesting({ start: 1000, end: money });
    setSeries([
      ...newSeries,
      {
        type: "line",
        name: "Predicted value",
        data: predictions,
      },
      {
        type: "flags",
        data: flagsSerie,
        onSeries: "dataseries",
        shape: "circlepin",
        width: 16,
      },
    ]);
  };

  const rebootSeries = () => {
    setInvesting({ start: 1000, end: null });
    const serieIndex = series.findIndex(
      (serie) => serie.name === "Predicted value"
    );
    let newSeries = series;
    if (serieIndex !== -1) {
      newSeries = newSeries.splice(serieIndex, 2);
      setSeries([...newSeries]);
    }
    return newSeries;
  };

  const options = {
    rangeSelector: {
      selected: 1,
    },

    title: {
      text: `${symbol} stock market`,
    },

    tooltip: {
      style: {
        width: "200px",
      },
      valueDecimals: 4,
      shared: true,
    },

    yAxis: {
      title: {
        text: "stock value",
      },
    },
    xAxis: {
      type: "datetime",
    },
    series,
  };

  const options2 = {
    title: {
      text: "Model training graph",
    },

    subtitle: {
      text: "Tensorflow.js models loss through training",
    },

    yAxis: {
      title: {
        text: "Loss",
      },
    },

    xAxis: {
      title: {
        text: "Epoch",
      },
    },

    series: [
      {
        type: "line",
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
        Compile AI models with RNN Recurrent Neural Network of LSTM Long-Short
        Term Memory layers in the browser
      </h2>

      <form onSubmit={getNewStock}>
        <label>
          <span>Symbol </span>
          <input
            type="text"
            name="symbol"
            placeholder="IBM"
            onChange={handleSymbolChange}
            value={symbol}
          ></input>
        </label>
        <button type="submit">Get New Stock data</button>
      </form>
      {formError && <p>{formError.message}</p>}
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
        constructorType={"stockChart"}
      />

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
        <p>
          {investing.end
            ? `You invested ${investing.start}$, you get out with ${Math.round(
                investing.end
              )}$`
            : `You are investing ${investing.start}$, click on Make predictions button`}
        </p>
        <p>The financial indicators used are the followings :</p>
        <ul>
          <li>daily volume </li>
          <li>SMA20 (Simple Moving Average 20 periods) </li>
          <li>SMA50 (Simple Moving Average 50 periods) </li>
          <li>SMA100 (Simple Moving Average 100 periods) </li>
          <li>RSI14 (Relative Strength Index 14 periods) </li>
          <li>RSI28 (Relative Strength Index 28 periods) </li>
          <li>stochastic14 (last 14 periods) </li>
          <li>weekly seasonality</li>
        </ul>
        {modelLogs.length > 0 && (
          <>
            <HighchartsReact
              highcharts={Highcharts}
              options={options2}
              constructorType={"chart"}
            />
          </>
        )}
        <p>
          We use a (70%, 20%, 10%) periods split for the training, validation,
          and test sets, via batch of 32 periods.
        </p>
        <ul>
          <li>
            Create and validate model button : use training and validation sets
            (70% and 20%).
          </li>
          <li>
            Make predictions button : use test set (10%). Every day we predict
            the day after's value thanks in accordance to the chunks' previous
            32 periods. (you may need to zoom on the graph)
          </li>
        </ul>
      </div>
    </div>
  );
};

export default hot(Main);
