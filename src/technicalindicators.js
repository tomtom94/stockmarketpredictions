export const SMA = ({ period, data }) => {
  return data.reduce((acc, curr, index, array) => {
    const baseIndex = index - period + 1;
    if (baseIndex < 0) {
      return acc;
    }
    const targetValues = array.slice(baseIndex, index + 1);
    const total = targetValues.reduce(
      (total, targetValue) => total + Number(targetValue[1]["4. close"]),
      0
    );
    const value = total / period;
    return [...acc, value];
  }, []);
};

export const EMA = ({ period, data }) => {
  const k = 2 / (period + 1);
  let EMAYesterday;
  return data.reduce((acc, curr, index, array) => {
    if (!EMAYesterday) {
      const value = Number(curr[1]["4. close"]);
      EMAYesterday = value;
      return acc;
    }
    const value = Number(curr[1]["4. close"]) * k + EMAYesterday * (1 - k);
    EMAYesterday = value;
    return [...acc, value];
  }, []);
};

export const stochastic = ({ period, data }) => {
  // https://investexcel.net/how-to-calculate-the-stochastic-oscillator/
  return data.reduce((acc, curr, index, array) => {
    const baseIndex = index - period + 1;
    if (baseIndex < 0) {
      return acc;
    }
    const targetValues = array.slice(baseIndex, index + 1);
    const currentValue = targetValues[targetValues.length - 1][1]["4. close"];
    const highestHigh = targetValues.reduce((acc, targetValue) => {
      const indicator = Number(targetValue[1]["2. high"]);
      if (!acc || indicator > acc) {
        return indicator;
      }
      return acc;
    }, null);
    const lowestLow = targetValues.reduce((acc, targetValue) => {
      const indicator = Number(targetValue[1]["3. low"]);
      if (!acc || indicator < acc) {
        return indicator;
      }
      return acc;
    }, null);
    const value =
      ((currentValue - lowestLow) / (highestHigh - lowestLow)) * 100;
    return [...acc, value];
  }, []);
};

export const RSI = ({ period, data }) => {
  // https://www.macroption.com/rsi-calculation/
  return data.reduce((acc, curr, index, array) => {
    const baseIndex = index - period;
    if (baseIndex < 0) {
      return acc;
    }
    const targetValues = array.slice(baseIndex, index + 1);
    let _lastCloseUpMove;
    const upMoves = targetValues.reduce(
      (acc, targetValue) => {
        if (!_lastCloseUpMove) {
          _lastCloseUpMove = Number(targetValue[1]["4. close"]);
          return acc;
        }
        const diff = Number(targetValue[1]["4. close"]) - _lastCloseUpMove;

        _lastCloseUpMove = Number(targetValue[1]["4. close"]);
        if (diff < 0) {
          return acc;
        }
        return { total: acc.total + diff, count: acc.count + 1 };
      },
      { total: 0, count: 0 }
    );

    let _lastCloseDownMove;
    const downMoves = targetValues.reduce(
      (acc, targetValue) => {
        if (!_lastCloseDownMove) {
          _lastCloseDownMove = Number(targetValue[1]["4. close"]);
          return acc;
        }
        const diff = Number(targetValue[1]["4. close"]) - _lastCloseDownMove;
        _lastCloseDownMove = Number(targetValue[1]["4. close"]);
        if (diff > 0) {
          return acc;
        }
        return { total: acc.total + Math.abs(diff), count: acc.count + 1 };
      },
      { total: 0, count: 0 }
    );
    const averageUpMoves =
      upMoves.count > 0 ? upMoves.total / upMoves.count : null;
    const averageDownMoves =
      downMoves.count > 0 ? downMoves.total / downMoves.count : null;
    const relativeStrength =
      averageDownMoves > 0 ? averageUpMoves / averageDownMoves : null;
    const value =
      relativeStrength === null ? 100 : 100 - 100 / (1 + relativeStrength);

    return [...acc, value];
  }, []);
};

export const seasonality = ({ element, fn, days }) => {
  const timestamp = new Date(element[0]).getTime();
  const value = Math[fn](timestamp * ((2 * Math.PI) / days));
  return value;
};
