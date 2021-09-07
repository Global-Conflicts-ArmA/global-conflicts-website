module.exports = {
	mode: "jit",
	purge: ["./components/**/*.tsx", "./pages/**/*.tsx", "./public/**/*.html"], //add this line
	darkMode: false, // or 'media' or 'class'
	theme: {
		extend: {
			width: {
				700: "700px",
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
	plugins: [require("@tailwindcss/typography")],
};
