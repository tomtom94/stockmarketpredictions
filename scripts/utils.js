const path = require("path");
const fs = require("fs");

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);
const paths = {
  publicPath: "/",
  build: resolveApp("dist"),
  client: resolveApp("src/index.jsx"),
  src: resolveApp("src"),
};

const compilerListener = (compiler) => {
  return new Promise((resolve, reject) => {
    compiler.hooks.compile.tap(compiler.name, () => {
      console.log(`Compiling ${compiler.name} please wait...`);
    });

    compiler.hooks.failed.tap(compiler.name, (error) => {
      reject(error);
    });
    compiler.hooks.done.tap(compiler.name, (stats) => {
      if (!stats.hasErrors()) {
        resolve();
      }
      if (stats.hasErrors()) {
        stats.compilation.errors.forEach((error) => {
          reject(error);
        });
      }
      if (stats.hasWarnings()) {
        stats.compilation.warnings.forEach((warning) => {
          console.warn(warning);
        });
      }
    });
  });
};

const compilation = (err, stats, format) => {
  if (err) {
    console.error(err.stack || err);
    if (err.details) {
      console.error(err.details);
    }
    return;
  }

  console.log(stats.toString(format));
};

const templateContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Stock Market Predictions</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

module.exports = {
  compilerListener,
  paths,
  compilation,
  templateContent,
};
