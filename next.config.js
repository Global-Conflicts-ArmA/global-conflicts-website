const rehypePrism = require("@mapbox/rehype-prism");

const withMDX = require("@next/mdx")({
	extension: /\.mdx?$/,
	options: {
		rehypePlugins: [rehypePrism],
	},
});
module.exports = withMDX({
	swcMinify: true,
	pageExtensions: ["js", "jsx", "ts", "tsx"],

	images: {
		formats: ["image/avif", "image/webp"],
		domains: [
			"source.unsplash.com",
			"tailwindui.com",
			"images.unsplash.com",
			"cdn.pixabay.com",
			"globalconflicts.net",
			"imgur.com",
			"imgur.com",
			"cdn.discordapp.com",
		],
	},
	webpack: (config, options) => {
		config.experiments = {
			layers: true,
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
