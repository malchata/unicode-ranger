import UnicodeRanger from "./index.js";

let urls = [
	"http://sujata.local/page-sitemap.xml",
	"http://sujata.local/product-sitemap.xml",
	"http://sujata.local/product-category-sitemap.xml"
];

const options = {
	verbose: true,
	// subsetMap: {
	// 	"Raleway": {
	// 		files: "./raleway-regular.ttf"
	// 	},
	// 	"Droid Serif": {
	// 		files: ["./droid-serif-regular.ttf", "./droid-serif-bold.ttf"]
	// 	},
	// }
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
