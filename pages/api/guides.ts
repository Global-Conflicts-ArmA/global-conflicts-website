import fs from "fs";

import matter from "gray-matter";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
const postsDirectory = path.join(process.cwd(), "_guides");

import _guidesOrder from "../../guides-order.json";

import rehypeSlug from "rehype-slug";
import rehypeCodeTitles from "rehype-code-titles";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrism from "rehype-prism-plus";

import { bundleMDX } from "mdx-bundler";
import readingTime from "reading-time";

export function getGuidesPaths() {
	const paths = [];
	_guidesOrder.forEach((guide) => {
		if (guide["children"]) {
			guide["children"].forEach((child) => {
				paths.push(child["slug"]);
			});
		} else {
			paths.push(guide["slug"]);
		}
	});
	return paths;
}

export async function getGuideBySlug(slug: string, fields: string[] = []) {
	const realSlug = slug.replace(/\.mdx$/, "");
	const fullPath = path.join(postsDirectory, `${realSlug}.mdx`);
	const fileContents = fs.readFileSync(fullPath, "utf8");
	const { data, content } = matter(fileContents);

 

	const { code, frontmatter } = await bundleMDX(fileContents, {
		xdmOptions(options) {
			options.rehypePlugins = [
				...(options?.rehypePlugins ?? []),
				rehypeSlug,
				rehypeCodeTitles,
				rehypePrism,
				[
					rehypeAutolinkHeadings,
					{
						properties: {
							className: ["anchor"],
						},
					},
				],
			];
			return options;
		},
	});

	return {
		mdxSource: code,
		frontMatter: {
			wordCount: fileContents.split(/\s+/gu).length,
			readingTime: readingTime(fileContents),
			slug: slug || null,
			...frontmatter,
		},
	};
}

export function getAllPosts(fields: string[] = []) {
	const guidesOrder = _guidesOrder as GuideOrder[];
	const guides = [];
	guidesOrder.forEach((element) => {
		if (element.type == "single") {
			element["guide"] = getGuideBySlug(element.file, fields);
		} else {
			element.children.forEach((child) => {
				child["guide"] = getGuideBySlug(child.file, fields);
			});
		}
	});
	return guidesOrder;
}

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const allPosts = getAllPosts(["title", "slug", "content"]);

	res.status(200).json(allPosts);
}

export interface GuideOrder {
	title: string;
	file?: string;
	type: string;
	children?: Child[];
}

export interface Child {
	title: string;
	file: string;
}
