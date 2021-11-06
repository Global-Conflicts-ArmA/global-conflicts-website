const fetcher = (url) =>
	fetch(url).then(async (res) => {
 
		return res.json();
	});
export default fetcher;
