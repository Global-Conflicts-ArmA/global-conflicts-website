const plugin = require("tailwindcss/plugin");
module.exports = {
	content: ["./components/**/*.tsx", "./pages/**/*.tsx", "./public/**/*.html"],
	theme: {
		minWidth: {
			0: "0",
			"1/4": "25%",
			"1/2": "50%",
			"3/4": "75%",
			full: "100%",
			100: "100px",
			187: "157px",
			300: "300px",
			370: "376px",

			70: "70px",
		},

		extend: {
			maxWidth: {
				"14rem": "14rem",
			},
			width: {
				700: "700px",
				606: "606px",
			},
			screens: {
				xs: "321px",
				555: "555px",
				"max-2xl": { max: "1535px" },
				"max-xl": { max: "1279px" },
				"max-lg": { max: "1023px" },
				"max-md": { max: "767px" },
				"max-sm": { max: "639px" },
				"max-xs": { max: "321px" },
			},

			fontFamily: {
				heading: ["Montserrat"],
				body: ['"Open Sans"'],
			},
			boxShadow: {
				strong: "0 3px 15px 0px black;",
			},
			typography: {
				xl: {
					css: {
						h1: {
							"margin-bottom": 10,
						},
						// ...
					},
				},
			},
		},
	},
	plugins: [
		require("@tailwindcss/typography"),
		require("daisyui"),
		plugin(function ({ addComponents }) {
			addComponents({
				".btn-dark": {
					backgroundColor: "#32579d",
					color: "white",
				},
				".btn-dark:hover": {
					backgroundColor: "#32579d",
					color: "white",
				},
			});
		}),
	],
	daisyui: {
		styled: true,
		themes: false,
		rtl: false,
		logs:false,
	},
};
