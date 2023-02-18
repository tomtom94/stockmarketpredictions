var fs = require("fs");
var path = require("path");

function yahooConverter(data) {
  const conversion = data.chart.result[0].timestamp.reduce(
    (acc, timestamp, index) => ({
      ...acc,
      "Time Series (Daily)": {
        ...acc["Time Series (Daily)"],
        [`${new Date(timestamp * 1000).getFullYear()}-${
          new Date(timestamp * 1000).getMonth() + 1
        }-${new Date(timestamp * 1000).getDate()}`]: {
          "1. open": data.chart.result[0].indicators.quote[0].open[index],
          "2. high": data.chart.result[0].indicators.quote[0].high[index],
          "3. low": data.chart.result[0].indicators.quote[0].low[index],
          "4. close":
            data.chart.result[0].indicators.adjclose[0].adjclose[index],
          "5. volume": data.chart.result[0].indicators.quote[0].volume[index],
        },
      },
    }),
    {
      "Meta Data": {
        "1. Information": "Daily Prices (open, high, low, close) and Volumes",
        "2. Symbol": data.chart.result[0].meta.symbol,
        "3. Last Refreshed": undefined,
        "4. Output Size": data.chart.result[0].timestamp.length + 1,
        "5. Time Zone": data.chart.result[0].meta.exchangeTimezoneName,
      },
      "Time Series (Daily)": {},
    }
  );

  fs.writeFile(
    path.resolve(__dirname, `yahooDataTreated.json`),
    JSON.stringify(conversion),
    function (err) {
      if (err) throw err;
      console.log("File is created successfully.");
    }
  );
}

// Use fs.readFile() method to read the file
fs.readFile(
  path.resolve(__dirname, `yahooData.json`),
  "utf8",
  function (err, data) {
    if (err) {
      console.error(err);
    }
    // Display the file content
    yahooConverter(JSON.parse(data));
  }
);

console.log("readFile called");
