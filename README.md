# Elegant financial predictions app with Tensorflow.js

## Introduction

Predictions made on Amazon stock market (fresh data until 2021-12-28) with Tensorflow.js.
For the moment just using a model with the following indicators :

- daily volume
- SMA20 (Simple Moving Average 20 periods)
- SMA50 (Simple Moving Average 50 periods)
- SMA100 (Simple Moving Average 100 periods)
- RSI14 (Relative Strength Index 14 periods)
- RSI28 (Relative Strength Index 28 periods)
- stochastic14 (last 14 periods)

Check out this app in live [stockmarketpredictions.herokuapp.com](https://stockmarketpredictions.herokuapp.com)

## Motivations

Just wanna spend my time using Tensorflow.js :)
Data come from the free API [alphavantage.co](https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=AMZN&outputsize=full&apikey=NOKEY)

## Getting started

Clone the repo

```git
git clone https://github.com/tomtom94/stockmarketpredictions.git
```

```git
cd stockmarketpredictions
```

### Start in dev mode

```npm
npm install
```

Run dev mode with

```npm
npm run dev
```

it's gonna start an hot dev middleware with an express server ;) ready to work `http://localhost:3000`

### Start in production mode With Node.js

```npm
npm install
```

```npm
npm run start
```

it's gonna build in `dist/` and run the app in production mode with an express server `http://localhost:3000` or environment port used.

## Licence

I am using the MIT License, so you won't be able to turn against me in case you loose money :)

## Notes

If ever you wanna brainstorm, download my resume you are gonna find my phone number

- [thomasdeveloper-react.com](https://www.thomasdeveloper-react.com)
