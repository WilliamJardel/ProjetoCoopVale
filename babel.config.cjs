module.exports = {
  sourceType: "unambiguous",
  presets: [
    ["@babel/preset-env", {
      targets: { esmodules: true },
      modules: "commonjs"
    }],
    ["@babel/preset-react", { runtime: "automatic" }]
  ]
};
