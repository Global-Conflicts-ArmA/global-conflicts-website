import Document, { Html, Head, Main, NextScript } from "next/document";

export default function PresentIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			className="w-6 h-6"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
	);
}
