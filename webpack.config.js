const path = require('path');

const webpack = require('webpack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const ReplaceInFilePlugin = require('replace-in-file-webpack-plugin');

module.exports = () => {
    return {
        entry: { 'execute-webhint': './src/task/execute-webhint' },
        /**
         *  We need development because otherwise we cannot transform the dynamic require
         *  the Azure librarie does for languages (see "ReplaceInFilePlugin" below)
         */
        mode: 'development',
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

                },
                // These files are needed by azure-pipelines-task-lib library. See: https://github.com/shudv/azure-pipelines-task-template/blob/master/webpack.config.js
                {
                    from: path.join(__dirname, './node_modules/azure-pipelines-task-lib/lib.json'),
                    to: path.join(__dirname, './dist/task')
                },
                {
                    from: path.join(__dirname, './node_modules/azure-pipelines-task-lib/Strings'),
                    to: path.join(__dirname, './dist/task/Strings')
                }
            ]),
            new ReplaceInFilePlugin([

                // This replacement is required to allow azure-pipelines-task-lib to load the
                // json resource file correctly
                {
                    dir: 'dist/task',
                    files: ['execute-webhint.js'],
                    rules: [
                        {
                            search: /__webpack_require__\(\\\"\.\/node_modules\/azure-pipelines-task-lib sync recursive\\\"\)\(resourceFile\);/,
                            replace: 'require(resourceFile)'
                        }
                    ]
                }
            ]),
            new webpack.ProgressPlugin()
        ],
        resolve: {
            modules: ['node_modules'],
            extensions: ['.ts', '.js']
        },
        target: 'node'
    };
};
