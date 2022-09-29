const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const { paths, templateContent } = require("../scripts/utils");

module.exports = {
  name: "client",
  mode: "production",
  target: "web",
  entry: {
    bundle: [paths.client],
  },
  output: {
    path: path.join(paths.build, paths.publicPath),
    filename: "bundle-[fullhash].js",
    publicPath: paths.publicPath,
  },
  resolve: {
    modules: [paths.src, "node_modules"],
    extensions: [".js", ".jsx"],
  },
  module: require("./loaders.js"),
  plugins: [
    new HtmlWebpackPlugin({
      templateContent,
    }),
  ],
  stats: "normal",
};
