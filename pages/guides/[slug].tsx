import GuidesLayout from "../../layouts/guides-layout";
import markdownToHtml from "../../lib/markdownToHtml";
import { getGuideBySlug, getGuidesPaths } from "../api/guides";
import path from "path";
import { useRouter } from "next/router";

function Guide({ content }) {
	const router = useRouter();
	const slug = router.query.slug || [];

	return (
		<>
			<div className="max-w-2xl mx-auto">
				<div>{slug}</div>
			</div>
		</>
	);
}

type Params = {
	params: {
		slug: string;
	};
};

export async function getStaticProps({ params }: Params) {
	const post = getGuideBySlug(params.slug, ["title"]);
	const content = await markdownToHtml(post.content || "");

	return {
		props: {
			post: {
				...post,
				content,
			},
		},
	};
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
