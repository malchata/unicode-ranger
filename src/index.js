import Promise from "bluebird";
import regeneratorRuntime from "regenerator-runtime";
import puppeteer from "puppeteer";
import request from "request-promise";
import xml2js from "xml2js-es6-promise";
import CharacterSet from "characterset";

export default class UnicodeRanger{
	constructor(urls, userOptions){
		this.defaultOptions = {
			excludeElements: ["SCRIPT", "BR", "TRACK", "WBR", "PARAM", "HR", "LINK", "OBJECT", "STYLE", "PICTURE", "IMG", "AUDIO", "VIDEO", "SOURCE", "EMBED", "APPLET", "TITLE", "META", "HEAD"],
			ignoreFonts: ["serif", "sans-serif", "cursive", "fantasy", "monospace"],
			safe: true
		};
		this.options = typeof userOptions === "undefined" ? this.defaultOptions : Object.assign(this.defaultOptions, userOptions);
		this.calls = [];
		this.contents = {};
		this.ranges;

		if(urls.length === 0){
			return Promise.reject("No URLs specified!").catch((err)=>{
				console.log(err);
			});
		}

		urls.forEach((url)=>{
			this.calls.push(this.makeRequest(url));
		});

		return Promise.all(this.calls).then((res)=>{
			for(let content in this.contents){
				if(this.options.ignoreFonts.indexOf(content) !== -1 || this.contents[content].length === 0){
					delete this.contents[content];
				}
				else{
					this.contents[content] = this.getRanges(this.dedupe(this.contents[content]));
				}
			}

			console.log(this.contents);
		}).catch((err)=>{
			console.log(err);
		});
	};

	makeRequest(url){
		return puppeteer.launch().then(async (browser)=>{
			const page = await browser.newPage();
			page.on("console", msg => console.log("PAGE LOG: ", msg.text));
			await page.goto(url);
			const pageContents = await page.evaluate(()=>{
				let contents = {};

				document.documentElement.querySelectorAll("*").forEach((element)=>{
					let primary = getComputedStyle(element).getPropertyValue("font-family").split(",")[0];
					typeof contents[primary] === "undefined" ? contents[primary] = element.innerText : contents[primary] += element.innerText;
				});

				return contents;
			});

			for(let contents in pageContents){
				typeof this.contents[contents] === "undefined" ? this.contents[contents] = pageContents[contents] : this.contents[contents] += pageContents[contents];
			}

			await browser.close();
		});
	};

	dedupe(str){
		let unique = "";

		for(let i = 0; i < str.length; i++){
			if(unique.indexOf(str[i]) === -1){
				unique += str[i];
			}
		}

		return unique;
	};

	getRanges(str){
		return new CharacterSet(str).toHexRangeString();
	}
};
