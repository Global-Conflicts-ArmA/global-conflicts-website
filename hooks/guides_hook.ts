import { useEffect, useState } from "react";



export function useFetchGuides() {

	const [{ status, allGuides }, setState] = useState<{
		status: "loading" | "success" | "error";
		allGuides: [];
	}>({ status: "loading", allGuides: [] });



	useEffect(() => {
		let cancel = false;
		fetch("/api/guides")
			.then((response) => {
				const test = response.json();
				console.log(test);

				return response.json();
			})
			.then((allGuides) => {
				if (cancel) return;
				console.log(allGuides)
				setState({ status: "success", allGuides });
			})
			.catch((e) => {
				if (cancel) return;
				setState({ status: "error", allGuides: [] });
				console.error(`Something went wrong!`);
			});

		return () => {
			cancel = true;
		};
	}, []);
	return { status, allGuides };
}
