export const SMA = ({ period, data }) => {
  return data.reduce((acc, curr, index, array) => {
    if (index + 1 - period < 0) {
      return acc;
    }
    const targetValues = array.slice(index + 1 - period, index + 1);
    const total = targetValues.reduce(
      (total, targetValue) => total + Number(targetValue[1]["4. close"]),
      0
    );
    const value = total / period;
    return [...acc, [curr[0], { value, set: targetValues }]];
  }, []);
};

export const stochastic = ({ period, data }) => {
  // https://investexcel.net/how-to-calculate-the-stochastic-oscillator/
  return data.reduce((acc, curr, index, array) => {
    if (index + 1 - period < 0) {
      return acc;
    }
    const targetValues = array.slice(index + 1 - period, index + 1);
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
    return [...acc, [curr[0], { value, set: targetValues }]];
  }, []);
};

export const RSI = ({ period, data }) => {
  // https://www.macroption.com/rsi-calculation/
  return data.reduce((acc, curr, index, array) => {
    if (index + 1 - period < 0) {
      return acc;
    }
    const targetValues = array.slice(index + 1 - period, index + 1);
    const upMoves = targetValues.reduce(
      (acc, targetValue) => {
        const diff =
          Number(targetValue[1]["1. open"]) -
          Number(targetValue[1]["4. close"]);
        if (diff < 0) {
          return acc;
        }
        return { total: acc.total + diff, count: acc.count + 1 };
      },
      { total: 0, count: 0 }
    );
    const downMoves = targetValues.reduce(
      (acc, targetValue) => {
        const diff =
          Number(targetValue[1]["1. open"]) -
          Number(targetValue[1]["4. close"]);
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
    const RSI =
      relativeStrength === null ? 100 : 100 - 100 / (1 + relativeStrength);
    return [...acc, [curr[0], { value: RSI, set: targetValues }]];
  }, []);
};
