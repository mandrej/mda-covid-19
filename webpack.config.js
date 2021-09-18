const path = require('path');
const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = {
    mode: 'development',
    entry: {
        app: './src/index.js'
    },
    plugins: [
        new webpack.IgnorePlugin({
            resourceRegExp: /^\.\/locale$/,
            contextRegExp: /moment$/
        }),
        new CopyPlugin({
            patterns: [
                { from: './src/styles.css', to: './styles.css' }
            ]
        }),
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            inject: 'body',
            template: './index.html',
            filename: 'index.html'
        }),
        new webpack.HotModuleReplacementPlugin({}),
        new Dotenv()
    ],
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'main.[hash].js',
        library: 'mda'
    },
    performance: {
        hints: process.env.NODE_ENV === 'production' ? "warning" : false
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: [/node_modules/],
                use: [{
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }]
            }
        ]
    },
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        compress: true,
        port: 3000,
        hot: true
    }
};