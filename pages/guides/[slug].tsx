import GuidesLayout from "../../layouts/guides-layout";
import _guidesOrder from "../../guides-order.json";
import { getGuideBySlug } from "../api/guides";
import { useRouter } from "next/router";
import { MDXLayoutRenderer } from "../../components/MDXComponents";
import { bundleMDX } from "mdx-bundler";
import MyMongo from "../../lib/mongodb";
import rehypeSlug from "rehype-slug";
import rehypeCodeTitles from "rehype-code-titles";
import rehypePrism from "rehype-prism-plus";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { generateMarkdown } from "../../lib/markdownToHtml";

function Guide({ guideContent }) {
	const router = useRouter();
	const slug = router.query.slug || [];

	return (
		<article className="max-w-3xl m-10 prose">
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
	const guide = await MyMongo.collection("guides").findOne(
		{ slug: params.slug },
		{ projection: { _id: 0 } }
	);
	const markdownContent = generateMarkdown(guide["content"]);

	return { props: { guideContent: markdownContent } };
}

export async function getStaticPaths() {
	const guidesOrder = getGuidesPaths();
	return {
		paths: guidesOrder.map((slug) => {
			return {
				params: {
					slug: slug,
				},
			};
		}),
		fallback: false,
	};
}

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

Guide.PageLayout = GuidesLayout;

export default Guide;
