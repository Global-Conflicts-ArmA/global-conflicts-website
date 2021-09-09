module.exports = {
	images: {
		domains: [
			"source.unsplash.com",
			"tailwindui.com",
			"images.unsplash.com",
			"cdn.pixabay.com",
			"globalconflicts.net",
		],
	},
	webpack: (config, options) => {
		config.experiments = {
		  topLevelAwait: true,
		};
		return config;
	 },
	async redirects() {
		return [
			{
				source: "/guides",
				destination: "/guides/getting-started",
				permanent: true,
			},
		];
	},
};
