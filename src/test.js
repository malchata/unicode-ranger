import UnicodeRanger from "./index.js";

let urls = "https://jeremywagner.me/";

const options = {
	verbose: true,
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
}).catch(err=>{
	console.log(err);
	return new Error(err);
});
