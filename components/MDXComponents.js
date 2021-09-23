/* eslint-disable react/display-name */
import { useMemo } from "react";
import { getMDXComponent } from "mdx-bundler/client";
import Image from "./mdx_components/Image";
import CustomLink from "./mdx_components/Link";
import code from "./mdx_components/code";
import { LinkIcon } from "@heroicons/react/outline";

function getAnchor(text) {
	return text[1]
		.toLowerCase()
		.replace(/[^a-z0-9 ]/g, "")
		.replace(/[ ]/g, "-");
}

export const MDXComponents = {
	code,
	Image,
	a: CustomLink,
	h1: ({ children }) => {
		const anchor = getAnchor(children);
		const link = `#${anchor}`;
		return (
			<h1 id={anchor}>
					{children}
				<a href={link} className="anchor-link">
				<LinkIcon></LinkIcon>
				</a>
			
			</h1>
		);
	},
	h2: ({ children }) => {
		const anchor = getAnchor(children);
		const link = `#${anchor}`;
		return (
			<h2 id={anchor}>
					{children}
				<a href={link} className="anchor-link">
				<LinkIcon></LinkIcon>
				</a>
			
			</h2>
		);
	},
	h3: ({ children }) => {
		const anchor = getAnchor(children);
		const link = `#${anchor}`;
		return (
			<h3 id={anchor}>
					{children}
				<a href={link} className="anchor-link">
					<LinkIcon></LinkIcon>
				</a>
			 
			</h3>
		);
	},
	h4: ({ children }) => {
		const anchor = getAnchor(children);
		const link = `#${anchor}`;
		return (
			<h4 id={anchor}>
				{children}
				<a href={link} className="anchor-link">
				<LinkIcon></LinkIcon>
				</a>
				
			</h4>
		);
	},
};

export const MDXLayoutRenderer = ({ mdxSource, ...rest }) => {
	const MDXLayout = useMemo(() => getMDXComponent(mdxSource), [mdxSource]);
	return <MDXLayout components={MDXComponents} {...rest} />;
};
