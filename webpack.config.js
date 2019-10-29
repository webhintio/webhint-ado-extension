const webpack = require('webpack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = () => {
    return {
        entry: { 'execute-webhint': './src/task/execute-webhint' },
        mode: 'production',
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: [{
                        loader: 'ts-loader',
                        options: { configFile: 'tsconfig.json' }
                    }]
                }
            ]
        },
        node: {
            __dirname: false,
            __filename: false,
            fs: true,
            path: true,
            process: false
        },
        output: { filename: 'task/[name].js' },
        plugins: [
            new ForkTsCheckerWebpackPlugin(),
            new CopyPlugin([
                {
                    from: './src/**/*.{json,png,html}',
                    transformPath: (path) => {
                        return path.replace('src/', '');
                    }

                }
            ]),
            new webpack.ProgressPlugin()
        ],
        resolve: {
            extensions: ['.ts', '.js', '.json']
        },
        target: 'node'
    };
};
