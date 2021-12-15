export const postFetcher = async (url: string, payload?: string) => {
	const options = {
		method: payload ? "POST" : "GET",
		...(payload && { body: payload }),
		headers: {
			accept: "application/json",
			"Content-Type": "application/json",
		},
	};

	return fetch(url, options).then((r) => r.json());
};
