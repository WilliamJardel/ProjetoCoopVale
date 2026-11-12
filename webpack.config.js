const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./Frontend/src/index.js",

  output: {
    path: path.resolve(__dirname, "Frontend/dist"),
    filename: "bundle.js",
    clean: true,
  },

  devServer: {
    host: "127.0.0.1",
    port: 3000,
    historyApiFallback: true,
  },

  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: "babel-loader",
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|jpe?g|gif|svg|ico)$/i,
        type: "asset/resource",
        generator: {
          filename: "assets/[name][contenthash][ext]",
        },
      },
    ],
  },

  resolve: {
    extensions: [".js", ".jsx"],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: "./Frontend/src/public/html/inicio.html",
      filename: "index.html",
    }),
  ],
};
