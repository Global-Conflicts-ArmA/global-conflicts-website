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

 
					<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
					<link rel="alternate icon" href="/favicon.ico" />
					<link rel="manifest" href="/manifest.json" />
				</Head>
				<body>
					<Main />
					<NextScript />
					<div id="modal-root"></div>
				</body>
			</Html>
		);
	}
}

export default MyDocument;
