import UnicodeRanger from "./index.js";

let urls = [
	"https://jeremywagner.me/about/",
	"https://jeremywagner.me/writing/",
	//"https://jeremywagner.me/sitemap.xml",
	"https://jeremywagner.me/hire/"
];

const options = {
	subsetMap: {
		"Monoton": {
			files: "./monoton.ttf"
		},
		"Fira Sans": {
			files: ["./fira-sans-regular.ttf", "./fira-sans-regular-italic.ttf", "./fira-sans-bold.ttf"]
		},
		"Fredoka One": {
			files: "./fredoka-one.ttf"
		},
	}
};

const output = new UnicodeRanger(urls, options).then((unicodeRanges)=>{
	for(var fontFamily in unicodeRanges){
		console.log(`${fontFamily}:`);
		console.log(unicodeRanges[fontFamily]);
		console.log("");
	}
}).catch(err=>new Error(err));
