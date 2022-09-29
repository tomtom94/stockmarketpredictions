const webpack = require("webpack");
const rimraf = require("rimraf");
const webpackConfig = require("../webpack/webpack.prod");

const { compilerListener, paths, compilation } = require("./utils");

const build = async () => {
  try {
    rimraf.sync(paths.build);

    process.env.NODE_ENV = "production";

    const compiler = webpack(webpackConfig);

    compiler.run((err, stats) => compilation(err, stats, compiler.stats));

    await compilerListener(compiler);

    console.log("Webpack compilation client and server done !");
  } catch (error) {
    console.error(error);
  }
};

build();
