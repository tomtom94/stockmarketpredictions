import React, { useEffect, useCallback, useState, useRef } from 'react';
import { hot } from 'react-hot-loader/root';
import Highcharts from 'highcharts/highstock';
import axios from 'axios';
import HighchartsReact from 'highcharts-react-official';
import * as tf from '@tensorflow/tfjs';
import { SMA, RSI, stochastic, seasonality, EMA } from './technicalindicators';
import stockMarketDataDaily from './stockMarketDataDaily.json';
import stockMarketDataHourly from './stockMarketDataHourly.json';

const Main = () => {
  const [data, setData] = useState([]);
  const [series, setSeries] = useState([]);
  const [isModelTraining, setIsModelTraining] = useState(false);
  const [modelLogs, setModelLogs] = useState([]);
  const [modelResultTraining, setModelResultTraining] = useState(null);
  const modelLogsRef = useRef([]);
  const [investing, setInvesting] = useState({ start: 1000, end: null });
  const [dataEma10, setDataEma10] = useState(null);
  const [dataEma20, setDataEma20] = useState(null);
  const [dataEma50, setDataEma50] = useState(null);
  const [dataSma10, setDataSma10] = useState(null);
  const [dataSma20, setDataSma20] = useState(null);
  const [dataSma50, setDataSma50] = useState(null);
  const [dataSma100, setDataSma100] = useState(null);
  const [dataRsi7, setDataRsi7] = useState(null);
  const [dataRsi14, setDataRsi14] = useState(null);
  const [dataRsi28, setDataRsi28] = useState(null);
  const [dataStochastic7, setDataStochastic7] = useState(null);
  const [dataStochastic14, setDataStochastic14] = useState(null);
  const [formError, setFormError] = useState(null);
  const [symbol, setSymbol] = useState('');
  const [sampleData, setSampleData] = useState(null);
  const [graphTitle, setGraphTitle] = useState(null);
  const [recurrence, setRecurrence] = useState(16);
  const [strategy, setStrategy] = useState(2);
  const [isPredictionLoading, setIsPredictionLoading] = useState(false);

  const epochs = 7;
  const timeserieSize = recurrence;
  const batchSize = 32;

  useEffect(() => {
    const areAllDataReady =
      data.length > 0 &&
      dataEma10 &&
      dataEma20 &&
      dataEma50 &&
      dataSma10 &&
      dataSma20 &&
      dataSma50 &&
      dataSma100 &&
      dataRsi7 &&
      dataRsi14 &&
      dataRsi28 &&
      dataStochastic7 &&
      dataStochastic14;
    if (areAllDataReady) {
      const sampleDataRaw = splitData([0, 1]).map((e) => e[1]);
      const {
        dataNormalized: sampleDataNormalized,
        dimensionParams: sampleDimensionParams,
      } = normalizeData(sampleDataRaw);
      setSampleData({
        sampleDataRaw: JSON.parse(JSON.stringify(sampleDataRaw))
          .reverse()
          .filter((e, i) => i < 5),
        sampleDimensionParams,
      });
    }
  }, [
    data,
    dataEma10,
    dataEma20,
    dataEma50,
    dataSma10,
    dataSma20,
    dataSma50,
    dataSma100,
    dataRsi7,
    dataRsi14,
    dataRsi28,
    dataStochastic7,
    dataStochastic14,
  ]);

  useEffect(() => {
    if (data.length) {
      setDataStochastic7(
        stochastic({
          period: 7,
          data,
        })
      );
      setDataStochastic14(
        stochastic({
          period: 14,
          data,
        })
      );
      setDataRsi7(
        RSI({
          period: 7,
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
      setDataSma10(
        SMA({
          period: 10,
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
      setDataEma10(
        EMA({
          period: 10,
          data,
        })
      );
      setDataEma20(
        EMA({
          period: 20,
          data,
        })
      );
      setDataEma50(
        EMA({
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
      Object.entries(stockMarketDataDaily['Time Series (Daily)']).sort(
        (a, b) => new Date(a[0]) - new Date(b[0])
      )
    );
    setGraphTitle(stockMarketDataDaily['Meta Data']['2. Symbol']);
  }, [stockMarketDataDaily]);

  // useEffect(() => {
  //   setData(
  //     stockMarketDataHourly.sort((a, b) => new Date(a[0]) - new Date(b[0]))
  //   );
  //   setGraphTitle("AMZN Hourly");
  // }, [stockMarketDataHourly]);

  useEffect(() => {
    if (
      data.length &&
      series.findIndex((serie) => serie.name === 'Stock value') === -1
    ) {
      setSeries([
        ...series,
        {
          type: 'area',
          id: 'dataseries',
          name: 'Stock value',
          data: data.map((serie) => [
            new Date(serie[0]).getTime(),
            Number(serie[1]['4. close']),
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
                  .get('rgba'),
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
    if (!symbol) {
      return;
    }
    setGraphTitle(null);
    setSampleData(null);
    setFormError(null);
    setInvesting({ start: 1000, end: null });
    setDataEma10(null);
    setDataEma20(null);
    setDataEma50(null);
    setDataSma10(null);
    setDataSma20(null);
    setDataSma50(null);
    setDataSma100(null);
    setDataRsi7(null);
    setDataRsi14(null);
    setDataRsi28(null);
    setDataStochastic7(null);
    setDataStochastic14(null);
    setModelResultTraining(null);
    setModelLogs([]);
    setIsModelTraining(false);
    setSeries([]);
    setData([]);
    modelLogsRef.current = [];
    const { data } = await axios.get(
      `https://www.alphavantage.co/query?${new URLSearchParams({
        function: 'TIME_SERIES_DAILY_ADJUSTED',
        symbol,
        outputsize: 'full',
        apikey: '73H4T3JL70SI8VON',
      })}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    if (data['Error Message']) {
      setFormError(data['Error Message']);
    } else {
      setData(
        Object.entries(data['Time Series (Daily)']).sort(
          (a, b) => new Date(a[0]) - new Date(b[0])
        )
      );
      setGraphTitle(data['Meta Data']['2. Symbol']);
    }
  };

  const splitData = (trainingRange) => {
    const descEma10 = JSON.parse(JSON.stringify(dataEma10)).reverse();
    const descEma20 = JSON.parse(JSON.stringify(dataEma20)).reverse();
    const descEma50 = JSON.parse(JSON.stringify(dataEma50)).reverse();
    const descSma10 = JSON.parse(JSON.stringify(dataSma10)).reverse();
    const descSma20 = JSON.parse(JSON.stringify(dataSma20)).reverse();
    const descSma50 = JSON.parse(JSON.stringify(dataSma50)).reverse();
    const descSma100 = JSON.parse(JSON.stringify(dataSma100)).reverse();
    const descRsi7 = JSON.parse(JSON.stringify(dataRsi7)).reverse();
    const descRsi14 = JSON.parse(JSON.stringify(dataRsi14)).reverse();
    const descRsi28 = JSON.parse(JSON.stringify(dataRsi28)).reverse();
    const descStochastic7 = JSON.parse(
      JSON.stringify(dataStochastic7)
    ).reverse();
    const descStochastic14 = JSON.parse(
      JSON.stringify(dataStochastic14)
    ).reverse();
    const dataRaw = JSON.parse(JSON.stringify(data))
      .reverse()
      .reduce((acc, curr, index, array) => {
        if (
          !descEma10[index] ||
          !descEma20[index] ||
          !descEma50[index] ||
          !descSma10[index] ||
          !descSma20[index] ||
          !descSma50[index] ||
          !descSma100[index] ||
          !descRsi7[index] ||
          !descRsi14[index] ||
          !descRsi28[index] ||
          !descStochastic7[index] ||
          !descStochastic14[index]
        ) {
          return acc;
        }
        return [
          ...acc,
          [
            curr[0],
            [
              Number(curr[1]['4. close']),
              Number(curr[1]['1. open']),
              Number(curr[1]['2. high']),
              Number(curr[1]['3. low']),
              // Number(curr[1]["5. volume"]),
              descEma10[index],
              descEma20[index],
              descEma50[index],
              descSma10[index],
              descSma20[index],
              descSma50[index],
              descSma100[index],
              descRsi7[index],
              descRsi14[index],
              descRsi28[index],
              descStochastic7[index],
              descStochastic14[index],
              // seasonality({ element: curr, fn: "cos", days: 7 * 24 * 60 * 60 }),
              // seasonality({ element: curr, fn: "sin", days: 7 * 24 * 60 * 60 }),
            ],
          ],
        ];
      }, [])
      .reverse();
    const [bottom, top] = trainingRange;
    const baseIndex = bottom === 0 ? 0 : Math.ceil(bottom * dataRaw.length) - 1;
    const chunk = dataRaw.slice(
      baseIndex,
      top === 1
        ? undefined
        : baseIndex + 1 + Math.floor((top - bottom) * dataRaw.length)
    );
    return chunk;
  };

  const createTimeseriesDimensionForRNN = (inputs) => {
    inputs.reverse();
    const chunks = [];
    for (let i = 0; i < inputs.length - 1; i++) {
      chunks.push(inputs.slice(i, i + timeserieSize));
    }

    const newChunks = chunks.map((e) => e.reverse()).reverse();
    const timeseriesChunks = [];
    newChunks.forEach((chunk) => {
      if (chunk.length === timeserieSize) {
        timeseriesChunks.push(chunk);
      }
    });
    return timeseriesChunks;
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
          if (acc === null || curr < acc) {
            return curr;
          }
          return acc;
        }, null);
        const max = dimension.reduce((acc, curr) => {
          if (acc === null || curr > acc) {
            return curr;
          }
          return acc;
        }, null);
        return {
          min,
          max,
          mean,
          std: Math.sqrt(
            dimension
              .map((e) => (e - mean) ** 2)
              .reduce((acc, curr) => acc + curr, 0) / dimension.length
          ),
          // https://www.geeksforgeeks.org/numpy-std-in-python/
        };
      });
    }
    const epsilon = 1e-3;
    return {
      dataNormalized: createTimeseriesDimensionForRNN(
        dataRaw.map((set) =>
          set.map(
            (e, i) =>
              (e - dimensionParams[i].mean) / (dimensionParams[i].std + epsilon)
            // https://www.tensorflow.org/tutorials/structured_data/time_series#normalize_the_data
          )
        )
      ),
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
      .map((e) => e[e.length - 1][0])
      .skip(1);
    const xyDataset = tf.data
      .zip({ xs: xDataset, ys: yDataset })
      .batch(batchSize)
      .shuffle(batchSize);
    // const datasetLogs = [];
    // await xyDataset.forEachAsync((e) => {
    //   datasetLogs.push(e);
    // });
    // console.log("datasetLogs", datasetLogs);
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
      const { dataset: train } = await makeDataset([0, 0.7]);
      const { dataset: validate } = await makeDataset([0.7, 0.9]);
      const model = tf.sequential();

      const cells = [
        tf.layers.lstmCell({ units: 16 }),
        tf.layers.lstmCell({ units: 16 }),
        tf.layers.lstmCell({ units: 16 }),
        tf.layers.lstmCell({ units: 16 }),
      ];

      model.add(
        tf.layers.rnn({
          cell: cells,
          inputShape: [timeserieSize, 16],
          returnSequences: false,
        })
      );

      model.add(
        tf.layers.dense({
          units: 1,
        })
      );

      // model.summary();

      model.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError',
        metrics: ['accuracy'],
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
    const xs = tf.tensor3d(inputs);
    let outputs = modelResultTraining.model.predict(xs);
    outputs = Array.from(outputs.dataSync());
    const results = unNormalizeData(outputs, dimensionParams[0]);
    return results;
  };

  const makePredictions = async () => {
    setIsPredictionLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    try {
      const newSeries = rebootSeries();
      const xs = splitData([0.9, 1]);
      const timeseriesChunks = createTimeseriesDimensionForRNN(xs);
      const predictions = [];
      const flagsSerie = [];
      let _money = investing.start;
      let _flag = {};
      let _value;
      let _lastValue;
      let _ys;
      timeseriesChunks.forEach((chunk, index, array) => {
        const { dataNormalized, dimensionParams } = normalizeData(
          chunk.map((e) => e[1])
        );
        const value = chunk[chunk.length - 1][1][0];
        _lastValue = value;
        const date = chunk[chunk.length - 1][0];
        const [ys] = gessLabels(dataNormalized, dimensionParams);
        if (_ys) {
          const predEvol = (ys - _ys) / _ys;
          let flag = {};

          /**
           * First we must define what type of order
           */
          if (
            (strategy == 1 ? predEvol > 0 && ys > value : true) &&
            (strategy == 2 ? predEvol > 0 : true) &&
            (strategy == 3 ? ys > value : true)
          ) {
            flag.type = 'buy';
          }
          if (
            (strategy == 1 ? predEvol < 0 && ys < value : true) &&
            (strategy == 2 ? predEvol < 0 : true) &&
            (strategy == 3 ? ys < value : true)
          ) {
            flag.type = 'sell';
          }

          /**
           * Second we make an action if the type of order changed from before
           */
          if (_flag.type !== flag.type && flag.type) {
            if (!_value) {
              _value = value;
            }
            let realEvolv2 = (value - _value) / _value;

            if (_flag.type === 'buy') {
              _money = _money * (1 + realEvolv2);
            }
            if (_flag.type === 'sell') {
              _money = _money * (1 + -1 * realEvolv2);
            }
            _value = value;
            flag.label = `Investing ${Math.round(_money)}$ at value ${value}`;
            flagsSerie.push({
              x: new Date(date).getTime(),
              title: flag.type,
              text: flag.label,
              color: flag.type === 'buy' ? 'green' : 'red',
            });
            _flag = flag;
          }
        }

        let datePredicted;
        const nextChunk = array[index + 1];
        if (nextChunk) {
          const nextDate = nextChunk[nextChunk.length - 1][0];
          datePredicted = new Date(nextDate).getTime();
        } else {
          const lastDate = chunk[chunk.length - 1][0];
          datePredicted = new Date(lastDate).setDate(
            new Date(lastDate).getDate() + 1
          );
        }

        predictions.push([datePredicted, ys]);
        _ys = ys;
      });
      (function finishOffTheLastTrade() {
        let realEvolv2 = (_lastValue - _value) / _value;

        if (_flag.type === 'buy') {
          _money = _money * (1 + realEvolv2);
        }
        if (_flag.type === 'sell') {
          _money = _money * (1 + -1 * realEvolv2);
        }
      })();
      setInvesting({ start: 1000, end: _money });
      setSeries([
        ...newSeries,
        {
          type: 'line',
          name: 'Predicted value',
          data: predictions,
        },
        {
          type: 'flags',
          data: flagsSerie,
          onSeries: 'dataseries',
          shape: 'circlepin',
          width: 18,
        },
      ]);
    } catch (error) {
      throw error;
    } finally {
      setIsPredictionLoading(false);
    }
  };

  const rebootSeries = () => {
    setInvesting({ start: 1000, end: null });
    const serieIndex = series.findIndex(
      (serie) => serie.name === 'Predicted value'
    );
    let newSeries = series;
    if (serieIndex !== -1) {
      newSeries.splice(serieIndex, 2);
      setSeries([...newSeries]);
    }
    return newSeries;
  };

  const options = {
    rangeSelector: {
      selected: 4,
    },

    title: {
      text: `${graphTitle} stock market`,
    },

    tooltip: {
      style: {
        width: '200px',
      },
      valueDecimals: 4,
      shared: true,
    },

    yAxis: {
      title: {
        text: 'stock value',
      },
    },
    xAxis: {
      type: 'datetime',
    },
    series,
  };

  const options2 = {
    title: {
      text: 'Model training graph',
    },

    subtitle: {
      text: 'Tensorflow.js models loss through training',
    },

    yAxis: {
      title: {
        text: 'Loss',
      },
    },

    xAxis: {
      title: {
        text: 'Epoch',
      },
      min: 1,
      max: epochs,
    },

    series: [
      {
        type: 'line',
        name: 'loss',
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
          <span>Symbol : </span>
          <input
            type="text"
            name="symbol"
            placeholder="BTCUSD"
            onChange={handleSymbolChange}
            value={symbol}
          ></input>
        </label>
        <button type="submit">Get New Stock data</button>
      </form>
      {formError && <p>{formError}</p>}
      {series.length > 0 && (
        <>
          <HighchartsReact
            highcharts={Highcharts}
            options={options}
            constructorType={'stockChart'}
          />

          <div style={{ margin: '10px 5px' }}>
            <label>
              <span>
                Define how many periods are needed for the neural network to
                detect recurrent patterns :
              </span>
              <input
                size={2}
                value={recurrence}
                disabled={isModelTraining || isPredictionLoading}
                onChange={(event) => {
                  setRecurrence(
                    isNaN(Number(event.target.value))
                      ? event.target.value
                      : Number(event.target.value)
                  );
                }}
              />
              {typeof recurrence !== 'number' && <span>Only use number</span>}
              {typeof recurrence === 'number' && recurrence < 2 && (
                <span>
                  Minimum 2 recurrences in order to normalize inputs with mean
                  and standard derivation
                </span>
              )}
              {typeof recurrence === 'number' && recurrence > 32 && (
                <span>It may take a lot of time</span>
              )}
            </label>
            <br />
            <button
              onClick={createModel}
              type="button"
              disabled={isModelTraining || isPredictionLoading}
              style={{ fontSize: 16, marginRight: 5 }}
            >
              {isModelTraining
                ? '1. Model is training'
                : '1. Create and validate model'}
            </button>{' '}
            <span style={{ marginLeft: 5, fontWeight: 'bold' }}>
              When you click this button you must <u>stay on this page</u> !
              Otherwise your computer will put all your browser's work in
              standby.
              <br />
              <u>It's around 4 minutes work just take a coffee</u>, depends your
              device's power, don't do this with your smartphone ;) it's gonna
              compile batches of {recurrence} periods.
              <br />
              Bigger are the batches, longer it's gonna take time, smoother
              would be the prediction line.
            </span>
            <br />
            <br />
            <span>
              Define the flag order strategy (you can change it anytime even
              when the tensorflow model is already compiled, just need to click
              Make predictions again) :
            </span>
            <br />
            <input
              disabled={
                isModelTraining || !modelResultTraining || isPredictionLoading
              }
              checked={strategy == 2}
              type="radio"
              id="Default"
              name="flag-strategy"
              value={2}
              onChange={(event) => {
                setStrategy(Number(event.target.value));
              }}
            />
            <label htmlFor="Default">
              Default - The prediction next day is higher than the prediction
              today (the reverse for sell order)
            </label>
            <br />
            <input
              disabled={
                isModelTraining ||
                !modelResultTraining ||
                isPredictionLoading ||
                true
              }
              checked={strategy == 3}
              type="radio"
              id="classic"
              name="flag-strategy"
              value={3}
              onChange={(event) => {
                setStrategy(Number(event.target.value));
              }}
            />
            <label htmlFor="classic">
              Classic - The prediction next day is higher than the real value
              today (the reverse for sell order)
            </label>
            <br />
            <input
              disabled={
                isModelTraining ||
                !modelResultTraining ||
                isPredictionLoading ||
                true
              }
              checked={strategy == 1}
              type="radio"
              id="secure"
              name="flag-strategy"
              value={1}
              onChange={(event) => {
                setStrategy(Number(event.target.value));
              }}
            />
            <label htmlFor="secure">
              Secure - The prediction next day is higher than the prediction
              today & the prediction next day is higher than the real value
              today (the reverse for sell order)
            </label>
            <br />
            <button
              onClick={makePredictions}
              type="button"
              disabled={!modelResultTraining || isPredictionLoading}
              style={{ fontSize: 16, marginRight: 5 }}
            >
              2. Make predictions
            </button>
            <br />
            <a
              href="https://github.com/tomtom94/stockmarketpredictions"
              target="_blank"
              style={{ fontSize: 16, margin: 5, textDecoration: 'none' }}
            >
              More details on Github
            </a>
            {isModelTraining && (
              <p>
                <u>
                  Please stay on the page, and leave your computer do the job ;)
                </u>
              </p>
            )}
            {isPredictionLoading && (
              <p>
                <u>Please stay on the page, predictions are loading ;)</u>
              </p>
            )}
            {modelLogs.length > 0 && (
              <>
                {investing.end ? (
                  <p>{`You invested ${
                    investing.start
                  }$, you get off the train with ${Math.round(
                    investing.end
                  )}$`}</p>
                ) : (
                  <p>{`You are investing ${investing.start}$, click on Make predictions button`}</p>
                )}

                <HighchartsReact
                  highcharts={Highcharts}
                  options={options2}
                  constructorType={'chart'}
                />
              </>
            )}
            <p>The financial indicators used are the followings :</p>
            <ul>
              <li>Close value</li>
              <li>Open value</li>
              <li>Daily high value</li>
              <li>Daily low value</li>
              {/* <li>Daily volume</li> */}
              <li>EMA10 (Exponential Moving Average 10 periods)</li>
              <li>EMA20 (Exponential Moving Average 20 periods)</li>
              <li>EMA50 (Exponential Moving Average 50 periods)</li>
              <li>SMA10 (Simple Moving Average 10 periods)</li>
              <li>SMA20 (Simple Moving Average 20 periods)</li>
              <li>SMA50 (Simple Moving Average 50 periods)</li>
              <li>SMA100 (Simple Moving Average 100 periods)</li>
              <li>RSI7 (Relative Strength Index 7 periods)</li>
              <li>RSI14 (Relative Strength Index 14 periods)</li>
              <li>RSI28 (Relative Strength Index 28 periods)</li>
              <li>Stochastic7 (last 7 periods)</li>
              <li>Stochastic14 (last 14 periods)</li>
              {/* <li>Weekly seasonality</li> */}
            </ul>
            <p>
              {`We use a (80%, 10%, 10%) periods split for : training, validation,
              and test set.`}
            </p>
            <p>
              {`For training and validation set compilation works with batch size of ${batchSize}, which means 1 batch includes ${batchSize} timeseries of ${recurrence} recurrences.`}
            </p>
            <ul>
              <li>
                Create and validate model button : use training and validation
                set (80% and 10%).
              </li>
              <li>
                {`Make predictions button : use test set (10%). Every day we
                predict the day after's value relative to the last sequence of ${timeserieSize} periods. (you may need to zoom on the graph)`}
              </li>
            </ul>
            {sampleData && (
              /**
               * When you are developing and changing things
               * you must put this html in commentary to avoid trouble
               */
              <>
                <br />
                <p>Describe the whole data below</p>
                <table border={1}>
                  <thead>
                    <tr>
                      <th>min</th>
                      <th>max</th>
                      <th>mean</th>
                      <th>std</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(sampleData.sampleDimensionParams).map(
                      (e1, i1) => (
                        <tr key={`sampleDimensionParams-row-${i1}`}>
                          {Object.values(e1[1]).map((e2, i2) => (
                            <td key={`sampleDimensionParams-column-${i2}`}>
                              {e2}
                            </td>
                          ))}
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
                <p>Example data raw below</p>
                <table border={1}>
                  <thead>
                    <tr>
                      <th>Close value</th>
                      <th>Open value</th>
                      <th>High</th>
                      <th>Low</th>
                      {/* <th>Volume</th> */}
                      <th>EMA10</th>
                      <th>EMA20</th>
                      <th>EMA50</th>
                      <th>SMA10</th>
                      <th>SMA20</th>
                      <th>SMA50</th>
                      <th>SMA100</th>
                      <th>RSI7</th>
                      <th>RSI14</th>
                      <th>RSI28</th>
                      <th>Stochastic7</th>
                      <th>Stochastic14</th>
                      {/* <th>Weekly seasonality cosinus</th> */}
                      {/* <th>Weekly seasonality sinus</th> */}
                    </tr>
                  </thead>
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
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default hot(Main);
