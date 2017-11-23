import UnicodeRanger from "./index.js";

let urls = [
	"https://jeremywagner.me/about",
	"https://jeremywagner.me/writing",
	"https://jeremywagner.me/hire"
];

new UnicodeRanger(urls).then((data) => console.log(data));
// new UnicodeRanger(urls);
