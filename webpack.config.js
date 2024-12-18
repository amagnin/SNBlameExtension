const path = require('path');
const fs = require('fs');

const config = {
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/
            },
        ],
    },
};

const isolated = Object.assign({}, config,{
    name: "isolated",
    entry: fs.readdirSync('./scripts/src/isolated').reduce((acc, v) => ({ ...acc, [v]: `./scripts/src/isolated/${v}` }), {}),
    output: {
       path: path.join(__dirname, '/scripts/dist/isolated'),
       filename: "[name].bundle.js"
    },
})

const main = Object.assign({}, config ,{
    name: "main",
    entry: fs.readdirSync('./scripts/src/main').reduce((acc, v) => ({ ...acc, [v]: `./scripts/src/main/${v}` }), {}),
    output: {
       path: path.join(__dirname, '/scripts/dist/main'),
       filename: "[name].bundle.js"
    },
})


module.exports = [isolated, main];