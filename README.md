# Elegant and for real stock predictions App with Tensorflow.js

## Introduction

Predictions made on Amazon stock market (fresh data until 2022-02-03) with Tensorflow.js.

Check out this app in live [stockmarketpredictiocvxl0lfn-smpfront.functions.fnc.fr-par.scw.cloud](https://stockmarketpredictiocvxl0lfn-smpfront.functions.fnc.fr-par.scw.cloud)

## Table of contents

- [Motivations](#motivations)
- [Getting started](#Getting-started)
  - [Start in dev mode](#Start-in-dev-mode)
  - [Start in production mode](#Start-in-production-mode)
    - [With Node.js](#With-Nodejs)
    - [With Docker](#With-Docker)
- [Must know about the app](#Must-know-about-the-app)
  - [Continuous Integration and Continuous Delivery](#Continuous-Integration-and-Continuous-Delivery)
- [Notes](#Notes)

## Motivations

Just wanna spend my time using Tensorflow.js :)
Data come from the free API [alphavantage.co](https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=AMZN&outputsize=full&apikey=NOKEY)

![alt text](src/screenshot.png?raw=true "Result graph with the predictions line")

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

### Start in production mode

#### With Node.js

```npm
npm install
```

Run build mode with

```npm
npm run build
```

it's gonna build in `dist/`

Then run in production mode

```npm
npm run start
```

;) it's gonna start the only one SSR express server out of the box for internet `http://localhost:3000` or environment port used.

#### With Docker

```docker
docker build -t stockmarketpredictions .
```

```docker
docker run -p 80:80 stockmarketpredictions
```

Then open `http://localhost:80`

## Must know about the app

You better use a good search engine like [Qwant.com](https://qwant.com), don't use Google. please.

### Continuous Integration and Continuous Delivery

When pushing or merging on master branch, you can trigger Github Actions with a commit message that includes `#major`, `#minor` or `#patch`.

Example of commit message in order to start a deployment :

```git
git commit -m "#major this is a big commit"
```

```git
git commit -m "#patch this is a tiny commit"
```

## Notes

If ever you wanna brainstorm, download my resume you are gonna find my phone number

- [thomasdeveloper-react.com](https://www.thomasdeveloper-react.com)
