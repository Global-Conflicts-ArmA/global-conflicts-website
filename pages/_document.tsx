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
					<link
						rel="apple-touch-icon"
						sizes="57x57"
						href="/apple-icon-57x57.png"
					/>
					<link
						rel="apple-touch-icon"
						sizes="60x60"
						href="/apple-icon-60x60.png"
					/>
					<link
						rel="apple-touch-icon"
						sizes="72x72"
						href="/apple-icon-72x72.png"
					/>
					<link
						rel="apple-touch-icon"
						sizes="76x76"
						href="/apple-icon-76x76.png"
					/>
					<link
						rel="apple-touch-icon"
						sizes="114x114"
						href="/apple-icon-114x114.png"
					/>
					<link
						rel="apple-touch-icon"
						sizes="120x120"
						href="/apple-icon-120x120.png"
					/>
					<link
						rel="apple-touch-icon"
						sizes="144x144"
						href="/apple-icon-144x144.png"
					/>
					<link
						rel="apple-touch-icon"
						sizes="152x152"
						href="/apple-icon-152x152.png"
					/>
					<link
						rel="apple-touch-icon"
						sizes="180x180"
						href="/apple-icon-180x180.png"
					/>
					<link
						rel="icon"
						type="image/png"
						sizes="192x192"
						href="/android-icon-192x192.png"
					/>
					<link
						rel="icon"
						type="image/png"
						sizes="32x32"
						href="/favicon-32x32.png"
					/>
					<link
						rel="icon"
						type="image/png"
						sizes="96x96"
						href="/favicon-96x96.png"
					/>
					<link
						rel="icon"
						type="image/png"
						sizes="16x16"
						href="/favicon-16x16.png"
					/>
				
					<meta
						name="description"
						content="Open Arma 3 community formed by people with more than 11 years in experience in the Arma series. Teamwork, tactical play and good fun are our core values."
					/>

					<meta property="og:url" content="https://gc-next-website.vercel.app/" />
					<meta property="og:type" content="website" />
					<meta
						property="og:title"
						content="Tactical Arma 3 Gameplay - No Strings Attached"
					/>
					<meta
						property="og:description"
						content="Open Arma 3 community formed by people with more than 11 years in experience in the Arma series. Teamwork, tactical play and good fun are our core values."
					/>
					<meta
						property="og:image"
						content="https://gc-next-website.vercel.app/new_website_small_logo.webp"
					/>

					<meta name="twitter:card" content="summary_large_image" />
					<meta property="twitter:domain" content="gc-next-website.vercel.app" />
					<meta
						property="twitter:url"
						content="https://gc-next-website.vercel.app/"
					/>
					<meta
						name="twitter:title"
						content="Tactical Arma 3 Gameplay - No Strings Attached"
					/>
					<meta
						name="twitter:description"
						content="Open Arma 3 community formed by people with more than 11 years in experience in the Arma series. Teamwork, tactical play and good fun are our core values."
					/>
					<meta
						name="twitter:image"
						content="https://gc-next-website.vercel.app/new_website_small_logo.webp"
					/>
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
