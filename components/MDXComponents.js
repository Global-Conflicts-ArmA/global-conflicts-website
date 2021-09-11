/* eslint-disable react/display-name */
import { useMemo } from "react";
import { getMDXComponent } from "mdx-bundler/client";
import Image from "./mdx_components/Image";
import CustomLink from "./mdx_components/Link";
import code from "./mdx_components/code";

export const MDXComponents = {
	code,
	Image,
	a: CustomLink,
};

export const MDXLayoutRenderer = ({ mdxSource, ...rest }) => {
	const MDXLayout = useMemo(() => getMDXComponent(mdxSource), [mdxSource]);
	return <MDXLayout components={MDXComponents} {...rest} />;
};
