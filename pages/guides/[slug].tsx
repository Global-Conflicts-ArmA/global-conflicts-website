import GuidesLayout from "../../layouts/guides-layout";
import { getGuideBySlug, getGuidesPaths } from "../api/guides";
import { useRouter } from "next/router";
import { MDXLayoutRenderer } from "../../components/MDXComponents";
import { bundleMDX } from "mdx-bundler";
import MyMongo from "../../lib/mongodb";
import rehypeSlug from "rehype-slug";
import rehypeCodeTitles from "rehype-code-titles";
import rehypePrism from "rehype-prism-plus";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

function Guide({ guideContent }) {
	const router = useRouter();
	const slug = router.query.slug || [];

	return (
		<article className="max-w-3xl m-10 prose">
			<kbd className="hidden kbd"></kbd>
			<MDXLayoutRenderer mdxSource={guideContent} />
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

	const { code, frontmatter } = await bundleMDX(guide["content"], {
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

	return { props: { guideContent: code } };
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

Guide.PageLayout = GuidesLayout;

export default Guide;
