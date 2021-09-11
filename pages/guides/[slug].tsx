import GuidesLayout from "../../layouts/guides-layout";
import { getGuideBySlug, getGuidesPaths } from "../api/guides";
import { useRouter } from "next/router";
import { MDXLayoutRenderer } from '../../components/MDXComponents'

function Guide({ post }) {
	const router = useRouter();
	const slug = router.query.slug || [];

	const { mdxSource, toc, frontMatter } = post;

	return (
		<article className="max-w-3xl m-10 prose">
			<kbd className="hidden kbd"></kbd>
			<MDXLayoutRenderer
				 
				mdxSource={mdxSource}
				frontMatter={frontMatter}
			/>
		</article>
	);
}

type Params = {
	params: {
		slug: string;
	};
};

export async function getStaticProps({ params }: Params) {
	const post = await getGuideBySlug(params.slug, ["title", "content"]);

	// const content = await markdownToHtml(post.content || "");
	// const mdxSource = await serialize(post.content);

	return { props: { post: post } };
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
