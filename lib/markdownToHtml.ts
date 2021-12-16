import rehypeFormat from "rehype-format";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remark from "remark";
import remarkGfm from "remark-gfm";
import html from "remark-html";
import remarkParse from "remark-parse";
import prism from "remark-prism";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export function generateMarkdown(text) {
	const markdownObj = unified()
		.use(remarkParse)
		.use(html)
		.use(remarkGfm)
		.use(remarkRehype)
		.use(rehypeFormat)
		.use(rehypeStringify)

		.use(rehypeSanitize, {
			attributes: {
				...defaultSchema.attributes,
				code: [
					// List of all allowed languages:
					[
						"className",
						"language-js",
						"language-css",
						"language-md",
						"language-sqf",
					],
				],
			},
		})

		.processSync(text);
	return markdownObj.value.toString();
}
