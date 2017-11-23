import UnicodeRanger from "./index.js";

let urls = [
	"https://jeremywagner.me/about/",
	"https://jeremywagner.me/writing/",
	"https://jeremywagner.me/sitemap.xml",
	"https://jeremywagner.me/hire/"
];

const output = new UnicodeRanger(urls).catch(err=>new Error(err));
