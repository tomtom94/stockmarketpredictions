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

export const RSI = ({ period, data }) => {
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
