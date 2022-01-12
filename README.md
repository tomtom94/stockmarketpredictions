# Elegant and for real stock predictions App with Tensorflow.js

## Introduction

Predictions made on Amazon stock market (fresh data until 2021-12-28) with Tensorflow.js.

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

it's gonna start an hot dev middleware with an express server ;) ready to work `http://localhost:3030`

### Start in production mode With Node.js

```npm
npm install
```

```npm
npm run build
```

it's gonna build in `dist/`

```npm
npm run start
```

 It's gonna run the app in production mode with an express server `http://localhost:3030` or environment port used.

## Licence

I am using the MIT License, so you won't be able to turn against me in case you loose money :)

## Notes

If ever you wanna brainstorm, download my resume you are gonna find my phone number

- [thomasdeveloper-react.com](https://www.thomasdeveloper-react.com)
