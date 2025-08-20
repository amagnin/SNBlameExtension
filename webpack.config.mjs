import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import webpack from "webpack";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import IgnoreEmitPlugin from "ignore-emit-webpack-plugin";
import TerserJSPlugin from "terser-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manifest = JSON.parse(fs.readFileSync("./manifest.json", "utf8"));

const appConstants = new webpack.DefinePlugin({
  __VERSION__: JSON.stringify(manifest.version),
  __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
});

const config = {
  mode: "production",
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
      },
      {
        test: /\.ejs$/i,
        use: ['html-loader', 'template-ejs-loader'],
      }, {
        test: /\.(scss|css)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            
          },
          "css-loader",
          "sass-loader",
        ]
      },
    ],
  },
  performance: {
    maxEntrypointSize: 768000,
    maxAssetSize: 768000,
  },
  plugins: [appConstants],
};

const isolated = Object.assign({}, config, {
  name: "isolated",
  entry: "./scripts/src/isolated/isolatedMain.js",
  output: {
    path: path.join(__dirname, "/scripts/dist/isolated"),
    filename: "bundle.js",
  },
  optimization: {
    minimize: true,
    checkWasmTypes: false,
    minimizer: [ new TerserJSPlugin({
        terserOptions: {
          compress: false,
          mangle: false,
          format: {
            comments: /license/i,
            beautify: true, 
          },
        }
      })],
  },
  watch: true,
});

const main = Object.assign({}, config, {
  name: "main",
  entry: "./scripts/src/main/main.js",
  output: {
    path: path.join(__dirname, "/scripts/dist/main"),
    filename: "bundle.js",
  },
  optimization: {
    minimize: true,
    checkWasmTypes: false,
    minimizer: [ new TerserJSPlugin({
        terserOptions: {
          compress: false,
          mangle: false,
          format: {
            comments: false,
            beautify: true, 
          },
        }
      })],
  },
  watch: true,
});

const styles = {
  name: "styles",
  entry: "./styles/src/sn-blame.scss",
  output: {
    path: path.join(__dirname, "/styles/dist"),
  },
  module: {
    rules: [
      {
        test: /\.(scss|css)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            
          },
          "css-loader",
          "sass-loader",
        ]
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].css",
    }),
    new IgnoreEmitPlugin(['main.js'])
  ],
  watch: true,
};

const popup = Object.assign({}, config, {
  name: "popup",
  entry: ["./popup/src/sn-blame.js", "./popup/src/sn-blame.scss"],
  output: {
    path: path.join(__dirname, "/popup/dist"),
    filename: "sn-blame.js",
  },
  optimization: {
    minimize: true,
    checkWasmTypes: false,
    minimizer: [ new TerserJSPlugin({
        terserOptions: {
          compress: false,
          mangle: false,
          format: {
            comments: false,
            beautify: true, 
          },
        }
      })],
  },
  watch: true,
  module: {
    rules:[{
      test: /\.ejs$/,
      use: ['html-loader', 'template-ejs-loader'],
    },{
        test: /\.(scss|css)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          "css-loader",
          "sass-loader",
        ]
    },{
      test: /\.svg$/,
      type: 'asset/resource',
      generator: {
        filename: '[name].[ext]'
      },
    }]
  },
   plugins: [
    new HtmlWebpackPlugin({
      filename: 'sn-blame.html',
      template: './popup/src/sn-blame.ejs',
      minify: false,
    }),
    new MiniCssExtractPlugin({
      filename: "sn-blame.css",   
      insert: "document.head.appendChild(linkTag)",
      linkType: "text/css",
      runtime: false,
    }),
  ],
})

export default [isolated, main, styles, popup];
