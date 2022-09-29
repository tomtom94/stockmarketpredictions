module.exports = (api) => {
  api.cache(true);

  const presets = [
    [
      "@babel/preset-env",
      {
        targets: "defaults",
        useBuiltIns: "usage",
        corejs: { version: "3.25", proposals: false },
        shippedProposals: true,
      },
    ],
    "@babel/preset-react",
  ];

  const plugins = ["react-hot-loader/babel"];

  return {
    presets,
    plugins,
  };
};
