const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const path = require('path');

module.exports = {
    mode: 'production',
    entry: {
        main: './src/main'
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/
            },
            {
                test: /\.(png|svg|jpg|gif)$/,
                use: [
                    'file-loader',
                ],
            },
        ],
    },
    devServer: {
        contentBase: './dist',
        overlay: true,
        hot: true
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: 'manifest.json', to: 'manifest.json' },
            ],
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'images', to: 'images' },
            ],
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'popup.html', to: 'popup.html' },
            ],
        }),
        new webpack.HotModuleReplacementPlugin()
    ],
};