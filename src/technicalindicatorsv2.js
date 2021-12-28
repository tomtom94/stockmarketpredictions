export const SMA = ({ period, data }) => {
  return data.reduce((acc, curr, index, array) => {
    if (index + 1 - period < 0) {
      return acc;
    }
    const valuesTarget = array.slice(index + 1 - period, index + 1);
    const total = valuesTarget.reduce(
      (total, valueTarget) => total + valueTarget[3],
      0
    );
    const value = total / period;
    return [...acc, [curr[0], { value, set: valuesTarget }]];
  }, []);
};
