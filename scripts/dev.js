const webpack = require("webpack");
const rimraf = require("rimraf");
const express = require("express");
const webpackDevMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");
const cors = require("cors");
const webpackConfig = require("../webpack/webpack.dev");

const { compilerListener, paths } = require("./utils");

const PORT = 3030;

const app = express();

const dev = async () => {
  try {
    rimraf.sync(paths.build);

    process.env.NODE_ENV = "development";

    webpackConfig.entry.bundle = [
      `webpack-hot-middleware/client?path=http://localhost:${PORT}/__webpack_hmr&timeout=2000`,
      ...webpackConfig.entry.bundle,
    ];
    webpackConfig.output.hotUpdateMainFilename =
      "updates/[fullhash].hot-update.json";
    webpackConfig.output.hotUpdateChunkFilename =
      "updates/[id].[fullhash].hot-update.js";

    const compiler = webpack(webpackConfig);

    app.use(cors());

    app.use(
      webpackDevMiddleware(compiler, {
        publicPath: webpackConfig.output.publicPath,
        stats: webpackConfig.stats,
        writeToDisk: true,
      })
    );

    app.use(
      webpackHotMiddleware(compiler, {
        log: console.log,
        path: "/__webpack_hmr",
        heartbeat: 2000,
      })
    );

    await compilerListener(compiler);

    app.listen(PORT, (err) => {
      if (err) {
        throw err;
      }
      console.log(`Hot dev server http://localhost:${PORT} 🌎`);
    });
  } catch (error) {
    console.error(error);
  }
};

dev();
