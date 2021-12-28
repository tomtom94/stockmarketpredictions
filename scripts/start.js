const webpack = require("webpack");
const rimraf = require("rimraf");
const webpackConfig = require("../webpack/webpack.prod");
const express = require("express");
const cors = require("cors");

const { compilerListener, paths, compilation } = require("./utils");

const PORT = process.env.PORT || 3000;

const app = express();

const start = async () => {
  try {
    rimraf.sync(paths.build);

    const compiler = webpack(webpackConfig);

    compiler.run((err, stats) => compilation(err, stats, compiler.stats));

    await compilerListener(compiler);

    console.log("Webpack compilation client and server done !");

    app.use(cors());

    app.use(express.static(paths.build));

    app.listen(PORT, (err) => {
      if (err) {
        throw err;
      }
      console.log(`Server listening on port ${PORT} 🌎`);
    });
  } catch (error) {
    console.error(error);
  }
};

start();
