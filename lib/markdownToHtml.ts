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
import rehypeRaw from "rehype-raw";

export function generateMarkdown(text) {
	const markdownObj = unified()
		.use(remarkParse)
		.use(html)
		.use(remarkGfm)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeRaw, { passThrough: ["kbd"] })
		.use(rehypeFormat)
		.use(rehypeStringify)

		.use(rehypeSanitize, {
			attributes: {
				...defaultSchema.attributes,
				code: [
					// List of all allowed languages:
					[
						"className",
						"class",
						"kbd",
						"language-js",
						"language-jsx",
						"language-tsx",
						"language-ts",
						"language-c",
						"language-c++",
						"language-c#",
						"language-py",
						"language-python",
						"language-css",
						"language-md",
						"language-sqf",
						"language-enforce",
					],
				],
				span: [
					// List of all allowed languages:
					["className", "kbd"],
				],
				kbd: [
					// List of all allowed languages:
					["className", "kbd", "kbd-xs", "kbd-sm", "kbd-md", "kbd-lg"],
				],
			},
		})

		.processSync(text);
	return markdownObj.value.toString();
}
