import fs from "fs";

import matter from "gray-matter";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
const postsDirectory = path.join(process.cwd(), "_guides");

import _guidesOrder from "../../guides-order.json";

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

export function getGuideBySlug(slug: string, fields: string[] = []) {
	const realSlug = slug.replace(/\.md$/, "");
	const fullPath = path.join(postsDirectory, `${realSlug}.md`);
	const fileContents = fs.readFileSync(fullPath, "utf8");
	const { data, content } = matter(fileContents);

	type Items = {
		[key: string]: string;
	};

	const items: Items = {};

	// Ensure only the minimal needed data is exposed
	fields.forEach((field) => {
		if (field === "slug") {
			items[field] = realSlug;
		}
		if (field === "content") {
			items[field] = content;
		}

		if (data[field]) {
			items[field] = data[field];
		}
	});

	return items;
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
