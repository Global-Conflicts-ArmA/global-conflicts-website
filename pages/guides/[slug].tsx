import GuidesLayout from "../../layouts/guides-layout";
import _guidesOrder from "../../guides-order.json";
import { useRouter } from "next/router";
import { generateMarkdown } from "../../lib/markdownToHtml";
import style from '../../components/guides.module.scss'
import fs from 'fs'
import path from 'path'

function Guide({ guideContent }) {
	const router = useRouter();
	const slug = router.query.slug || [];
		// 
	return (
		<article  className={"max-w-3xl m-5 mt-20 prose dark:prose-invert "+style.guidecss}>
			<kbd className="hidden kbd"></kbd>
			<div
				dangerouslySetInnerHTML={{
					__html: guideContent,
				}}
			></div>
		</article>
	);
}

type Params = {
	params: {
		slug: string;
	};
};

export async function getStaticProps({ params }: Params) {
	const filePath = path.join('_guides', `${params.slug}.md`)
	const content = fs.readFileSync(filePath, 'utf-8')
	const markdownContent = generateMarkdown(content, false)
	return { props: { guideContent: markdownContent } };
}

export async function getStaticPaths() {
	const files = fs.readdirSync('_guides')
	const paths = files.map( (filename) => ({
		params: {
			slug: filename.replace('.md', '')
		}
	}))
	return { paths, fallback: false }
}

Guide.PageLayout = GuidesLayout;

export default Guide;
