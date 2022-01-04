const express = require("express");
const cors = require("cors");

const { paths } = require("./utils");

const PORT = process.env.PORT || 3030;

const app = express();

const start = async () => {
  try {
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
