const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
	mode: "jit",
	purge: ["./components/**/*.tsx", "./pages/**/*.tsx", "./public/**/*.html"], //add this line
	darkMode: false, // or 'media' or 'class'
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
			colors: {
				blufor: "#2ea8ff",
				opfor: "#ff2135",
				civ: "purple",
				ind: "green",
			},
			width: {
				700: "700px",
			},
			screens: {
				xs: "321px",
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
	variants: {
		extend: {},
	},
	plugins: [
		require("@tailwindcss/typography"),
		require("daisyui"),
		require("@tailwindcss/line-clamp"),
	],
	daisyui: {
		styled: true,
		themes: false,
		rtl: false,
	},
};
