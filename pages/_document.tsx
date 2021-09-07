/* eslint-disable react/jsx-no-comment-textnodes */
// pages/_document.js

import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
	render() {
		return (
			<Html>
				<Head>
					<link rel="preconnect" href="https://fonts.googleapis.com" />

					<link rel="preconnect" href="https://fonts.gstatic.com" />

					<link
						href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;800&family=Open+Sans:ital@0;1&display=swap"
						rel="stylesheet"
					/>

					<link
						rel="preload"
						href="https://unpkg.com/prismjs@0.0.1/themes/prism-tomorrow.css"
						as="script"
					/>
					<link
						rel="preload"
						href="https://unpkg.com/prismjs@0.0.1/themes/prism-coy.css"
						as="script"
					/>
					<link
						rel="preload"
						href="https://unpkg.com/prismjs@0.0.1/themes/prism-okaidia.css"
						as="script"
					/>
					<link
						rel="preload"
						href="https://unpkg.com/prismjs@0.0.1/themes/prism-funky.css"
						as="script"
					/>
					<link
						href={`https://unpkg.com/prismjs@0.0.1/themes/prism-okaidia.css`}
						rel="stylesheet"
					/>
				</Head>
				<body>
					<Main />
					<NextScript />
				</body>
			</Html>
		);
	}
}

export default MyDocument;
