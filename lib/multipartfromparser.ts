import formidable from "formidable";

const form = formidable({ multiples: false, maxFileSize: 3000 * 1024 * 1024 }); // 3000mb

export default async function parseMultipartForm(req, res, next) {
	const contentType = req.headers["content-type"];
	if (contentType && contentType.indexOf("multipart/form-data") !== -1) {
		form.parse(req, (err, fields, file) => {
			console.error(err);
			if (!err) {
				req.body = fields; // sets the body field in the request object
				req.file = file.file; // sets the files field in the request object
			}
			next(); // continues to the next middleware or to the route
		});
	} else {
		next();
	}
}
