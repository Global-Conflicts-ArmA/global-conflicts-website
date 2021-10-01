const rehypePrism = require("@mapbox/rehype-prism");

const withMDX = require("@next/mdx")({
	extension: /\.mdx?$/,
	options: {
		rehypePlugins: [rehypePrism],
	},
});
module.exports = withMDX({
	pageExtensions: ["js", "jsx", "ts", "tsx", ],
	images: {
		domains: [
			"source.unsplash.com",
			"tailwindui.com",
			"images.unsplash.com",
			"cdn.pixabay.com",
			"globalconflicts.net",
			"imgur.com",
			"imgur.com",
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
});
