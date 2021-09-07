import GuidesLayout from "../../layouts/guides-layout";
import markdownToHtml from "../../lib/markdownToHtml";
import { getGuideBySlug, getGuidesPaths } from "../api/guides";

import { useRouter } from "next/router";

function Guide({ markdownGuide }) {
	const router = useRouter();
	const slug = router.query.slug || [];

	return (
		<article
			className="max-w-3xl m-10 prose"
			dangerouslySetInnerHTML={{ __html: markdownGuide }}
		/>
	);
}

type Params = {
	params: {
		slug: string;
	};
};

export async function getStaticProps({ params }: Params) {
	const post = getGuideBySlug(params.slug, ["title", "content"]);

	const content = await markdownToHtml(post.content || "");

	return { props: { markdownGuide: content } };
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
