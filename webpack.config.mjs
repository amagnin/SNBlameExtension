import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    performance: {
        maxEntrypointSize: 768000,
        maxAssetSize: 768000,
    },
};

const isolated = Object.assign({}, config,{
    name: "isolated",
    entry: './scripts/src/isolated/isolatedMain.js',
    output: {
       path: path.join(__dirname, '/scripts/dist/isolated'),
       filename: "bundle.js"
    },
    optimization: {
        minimize: false,
        checkWasmTypes: false,
    },
    watch:true,
})

const main = Object.assign({}, config ,{
    name: "main",
    entry: './scripts/src/main/main.js',
    output: {
       path: path.join(__dirname, '/scripts/dist/main'),
       filename: "bundle.js"
    },
    optimization: {
        minimize: false,
        checkWasmTypes: false,
    },
    watch:true,
})


export default [isolated, main]