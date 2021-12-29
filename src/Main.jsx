import React, { useEffect, useCallback, useState, useRef } from "react";
import { hot } from "react-hot-loader/root";
import Highcharts, { css } from "highcharts";
import HighchartsReact from "highcharts-react-official";
import * as tf from "@tensorflow/tfjs";
import { SMA, RSI } from "./technicalindicators";

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

  useEffect(() => {
    if (data.length) {
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
    const descSma20 = dataSma20.reverse();
    const descSma50 = dataSma50.reverse();
    const descSma100 = dataSma100.reverse();
    const descRsi14 = dataRsi14.reverse();
    const descRsi28 = dataRsi28.reverse();
    const dataRaw = JSON.parse(JSON.stringify(data))
      .reverse()
      .reduce((acc, curr, index, array) => {
        if (
          !descSma20[index] ||
          !descSma50[index] ||
          !descSma100[index] ||
          !descRsi14[index] ||
          !descRsi28[index]
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

  const makeDataset = (range) => {
    const dataRange = splitData(range);
    const dataset = tf.tensor2d(dataRange);

    const sliceNumber = Math.floor((dataRange.length - 1) / 2);

    const inputs = tf.slice(dataset, [0], [sliceNumber]);

    let labels = tf.slice(dataset, [sliceNumber], [sliceNumber]);

    labels = tf.split(labels, 6, 1)[0];
    const {
      normalizedTensor: xs,
      maxval: inputMax,
      minval: inputMin,
    } = normalizeTensorFit(inputs);
    const {
      normalizedTensor: ys,
      maxval: labelMax,
      minval: labelMin,
    } = normalizeTensorFit(labels);

    return { inputs: xs, labels: ys, inputMax, inputMin, labelMax, labelMin };
  };

  const createModel = async () => {
    try {
      rebootSeries();
      setIsModelTraining(true);
      setModelResultTraining(null);
      const model = tf.sequential();

      model.add(
        tf.layers.dense({
          units: 1,
          inputShape: [6],
        })
      );

      model.compile({ optimizer: "sgd", loss: "meanSquaredError" });
      const train = makeDataset([0, 0.7]);
      const validate = makeDataset([0.7, 0.9]);
      setModelLogs([]);
      modelLogsRef.current = [];
      const history = await model.fit(train.inputs, train.labels, {
        epochs: 40,
        validationData: [validate.inputs, validate.labels],
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, log) => {
            modelLogsRef.current.push(
              `Epoch: ${epoch + 1} ; loss: ${log.loss}`
            );
            setModelLogs([...modelLogsRef.current]);
          },
        },
      });
      const result = {
        model: model,
        stats: history,
        normalize: {
          inputMax: train.inputMax,
          inputMin: train.inputMin,
          labelMax: train.labelMax,
          labelMin: train.labelMin,
        },
      };
      setModelResultTraining(result);
    } catch (error) {
      throw error;
    } finally {
      setIsModelTraining(false);
    }
  };

  const gessLabels = (xs) => {
    const inputs = tf.tensor2d(xs, [xs.length, xs[0].length]);
    const normalizedInput = normalizeTensor(
      inputs,
      modelResultTraining.normalize["inputMax"],
      modelResultTraining.normalize["inputMin"]
    );
    const model_out = modelResultTraining.model.predict(normalizedInput);
    const predictedResults = unNormalizeTensor(
      model_out,
      modelResultTraining.normalize["labelMax"],
      modelResultTraining.normalize["labelMin"]
    );

    return Array.from(predictedResults.dataSync());
  };

  const makePredictions = () => {
    const newSeries = rebootSeries();
    const xs = splitData([0.9, 1]);
    const ys = gessLabels(xs);
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

  const normalizeTensorFit = (tensor) => {
    const maxval = tensor.max();
    const minval = tensor.min();

    const normalizedTensor = normalizeTensor(tensor, maxval, minval);
    return { normalizedTensor, maxval, minval };
  };

  const normalizeTensor = (tensor, maxval, minval) =>
    tensor.sub(minval).div(maxval.sub(minval));

  const unNormalizeTensor = (tensor, maxval, minval) =>
    tensor.mul(maxval.sub(minval)).add(minval);

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
          <ul>
            {modelLogs.map((modelLog, indexModelLog) => (
              <li key={`modelLog-${indexModelLog}`}>{modelLog}</li>
            ))}
          </ul>
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
          Nota Bene : Each time you create a model, predictions aren't the same.
          And also you may need to click 2 times on Make predictions button.
          Don't know why yet ;) Amazon is fucking crazy.
        </p>
      </div>
    </div>
  );
};

export default hot(Main);
