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
