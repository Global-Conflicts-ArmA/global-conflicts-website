import Document, { Html, Head, Main, NextScript } from "next/document";

export default function NotPresentIcon() {
	return (
		<div  data-tip="File Not present" className="tooltip">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				className="w-6 h-6 "
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
				/>
			</svg>
		</div>
	);
}
