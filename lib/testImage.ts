import axios from "axios";

export function testImage(url, timeoutT?) {
	return new Promise(function (resolve, reject) {
		var timeout = timeoutT || 5000;
		var timer;
		var img = new Image();

		img.onerror = img.onabort = function () {
			clearTimeout(timer);
			resolve(false);
		};
		img.onload = function () {
			clearTimeout(timer);
			resolve(true);
		};
		timer = setTimeout(function () {
			// reset .src to invalid URL so it stops previous
			// loading, but doens't trigger new load
			img.src = "//!!!!/noexist.jpg";
			resolve(false);
		}, timeout);
		img.src = url;
	});
}

export async function testImageNode(url) {
	try {
		const response = await axios.get(url);
		if (response.headers["content-type"].match(/(image)+\//g).length != 0) {
			return true;
		} else {
			return false;
		}
	} catch (error) {
		return false;
	}
}

export function testVideo(url, timeoutT?) {
	return new Promise(function (resolve, reject) {
		var timeout = timeoutT || 5000;
		var timer;
		var video = document.createElement("video");
		video.setAttribute("src", url);
		video.addEventListener("canplay", function () {
			console.log("video true");
			console.log(video.videoHeight);
			resolve(true);
		});
		video.addEventListener("error", function () {
			console.log("video false");
			resolve(false);
		});
		timer = setTimeout(function () {
			// reset .src to invalid URL so it stops previous
			// loading, but doens't trigger new load
			video.setAttribute("src", "//!!!!/noexist.jpg");
			resolve(false);
		}, timeout);
	});
}
