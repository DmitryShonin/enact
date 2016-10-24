var
	GracefulFsPlugin = require('graceful-fs-webpack-plugin'),
	LessPluginRi = require('resolution-independence'),
	path = require('path'),
	WebOSMetaPlugin = require('webos-meta-webpack-plugin'),
	webpack = require('webpack');

module.exports = {
	devtool: 'sourcemap',
	resolve: {
		alias: {
			'ilib':'@enact/i18n/ilib/lib',
			'webpack/hot/dev-server': require.resolve('webpack/hot/dev-server')
		},
		root: [path.resolve('./node_modules')],
		extensions: ['', '.js', '.jsx', '.es6'],
		modulesDirectories: ['web_modules', 'node_modules']
	},
	resolveLoader: {
		root: [path.resolve('./node_modules')],
		modulesDirectories: ['web_loaders', 'web_modules', 'node_loaders', 'node_modules']
	},
	module: {
		loaders: [
			{
				test: /appinfo\.json$/,
				loader: 'webos-meta'
			},
			{
				test: /ilibmanifest\.json$/,
				loader: 'ilib'
			},
			{
				test: /\.json$/,
				exclude: [/appinfo\.json$/, /ilibmanifest\.json$/],
				loader: 'json'
			},
			{
				test: /\.jpe?g$|\.gif$|\.png$|\.svg$|\.woff$|\.ttf$|\.wav$|\.mp3$/,
				loader: 'file?name=[path][name].[ext]'
			},
			{
				test:/\.(c|le)ss$/,
				loader: 'style!css?modules&importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]!less'
			},
			{
				test: /\.js$|\.es6$|\.jsx$/, loader: 'babel', exclude: /node_modules.(?!@*enact)/, query: {
					extends: path.join(__dirname, '.babelrc')
				}
			}
		]
	},
	devServer: {
		host: '0.0.0.0',
		port: 8080
	},
	lessLoader: {
		lessPlugins: [
			new LessPluginRi({
				baseSize: 24
			})
		]
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env': {
				'NODE_ENV': '"development"'
			}
		}),
		new GracefulFsPlugin(),
		// Keep WebOSMetaPlugin last so we can easily swap out for sampler variations
		new WebOSMetaPlugin({path:path.join(__dirname, 'webos-meta')})
	]
};
