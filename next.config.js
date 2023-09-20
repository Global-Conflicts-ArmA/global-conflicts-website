module.exports = async (phase, { defaultConfig }) => {
	/**
	 * @type {import('next').NextConfig}
	 */
	const nextConfig = {
		swcMinify: true,
		 
		eslint: {
			ignoreDuringBuilds: true
		},
		webpack: (config, options) => {
			config.experiments = {
				layers: true,
				topLevelAwait: true,
			};
			return config;
		},
		pageExtensions: ["js", "jsx", "ts", "tsx"],
		images: {

			formats: ["image/avif", "image/webp"],
			domains: [
				"source.unsplash.com",
				"tailwindui.com",
				"images.unsplash.com",
				"cdn.pixabay.com",
				"globalconflicts.net",
				"launcher.globalconflicts.net",
				"imgur.com",
				"i.imgur.com",
				"cdn.discordapp.com",
				"community.cloudflare.steamstatic.com",
				"avatars.akamai.steamstatic.com"
			],
		},
		async redirects() {
			return [
				{
					source: "/guides",
					destination: "/guides/getting-started",
					permanent: true,
				},
				{
					source: "/",
					has: [
						{
							type: "query",
							key: "callbackUrl",
						},
					],
					permanent: true,
					destination: "/",
				},
			];
		},
	};
	return nextConfig;
};
