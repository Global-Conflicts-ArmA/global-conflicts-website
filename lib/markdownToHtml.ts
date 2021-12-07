import rehypeFormat from 'rehype-format';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remark from 'remark'
import remarkGfm from 'remark-gfm';
import html from 'remark-html'
import remarkParse from 'remark-parse';
import prism from 'remark-prism';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

 
export function generateMarkdown(text) {
	const markdownObj = unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkRehype)
		.use(rehypeFormat)
		.use(rehypeStringify)
		.use(rehypeSanitize)
		.processSync(text);
	return markdownObj.value.toString();
}
