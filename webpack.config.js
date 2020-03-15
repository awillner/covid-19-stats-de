const path = require('path');

const {
    NODE_ENV = 'production',
} = process.env;

module.exports = {
    entry: './src/index.js',
    mode: NODE_ENV,
    target: 'web',
    node: {
        fs: 'empty',
        net: 'empty',
        tls: 'empty'
    },
    devServer: {
        contentBase: path.join(__dirname, 'docs'),
        compress: true,
        port: 9000
    },
    resolve: {
        extensions: ['.ts', '.js'],
    }
};
