import { join } from "path";
import { readFileSync, writeFileSync } from "fs";
import { sync as commandExistsSync } from "command-exists";
import { exec } from "child_process";
import Promise from "bluebird";
import regeneratorRuntime from "regenerator-runtime";
import request from "request-promise";
import xmlParser from "xml2json";
import puppeteer from "puppeteer";
import CharacterSet from "characterset";
import ttf2eot from "ttf2eot";
import ttf2woff from "ttf2woff";
import ttf2woff2 from "ttf2woff2";

process.setMaxListeners(Infinity);

export default class UnicodeRanger{
	constructor(urls, userOptions){
		this.defaultOptions = {
			excludeElements: ["SCRIPT", "BR", "TRACK", "WBR", "PARAM", "HR", "LINK", "OBJECT", "STYLE", "PICTURE", "IMG", "AUDIO", "VIDEO", "SOURCE", "EMBED", "APPLET", "TITLE", "META", "HEAD"],
			ignoreHiddenElements: false
		};
		this.regexes = {
			sitemapXml: /\/sitemap\.xml$/i,
			validUrl: /^https?:\/\/.*$/i
		};
		this.options = typeof userOptions === "undefined" ? this.defaultOptions : Object.assign(this.defaultOptions, userOptions);
		this.alwaysIgnore = ["serif", "sans-serif", "cursive", "fantasy", "monospace"];
		this.ignoreFonts = "ignoreFonts" in this.options === false ? this.alwaysIgnore : [...this.alwaysIgnore, ...this.options.ignoreFonts];
		this.urls = [];
		this.contents = {};
		this.ranges = {};

		if(urls.length === 0){
			return Promise.reject("No URLs specified!").catch((err)=>new Error(err));
		}

		typeof urls === "string" ? urls = [urls] : urls = this.dedupe(urls);

		let sitemapUrls = urls.filter(url=>this.regexes.sitemapXml.test(url) === true);

		if(sitemapUrls.length > 0){
			// TODO: Sitemap logic. Earlier logic was far too complex
		}

		return new Promise(async (resolve, reject)=>{
			const browser = await puppeteer.launch().then(browser=>browser);
			this.urls = this.dedupe(urls);

			for(let url in this.urls){
				await this.processUrl(this.urls[url], browser);
			}

			await browser.close();
			this.getRanges();

			if("subsetMap" in this.options){
				this.subset();
			}
			else{
				resolve(this.ranges);
			}
		});
	};

	processUrl(url, browser){
		return new Promise(async (resolve, reject)=>{
			const page = await browser.newPage();
			//page.on("console", msg => console.log("PAGE LOG: ", msg.text));
			await page.goto(url);

			const pageContents = await page.evaluate((options)=>{
				let contents = {};

				document.documentElement.querySelectorAll("*").forEach((element)=>{
					if(options.excludeElements.indexOf(element.tagName) === -1){
						let primaryFontFamily = getComputedStyle(element).getPropertyValue("font-family").split(",")[0].replace(/\"/ig, "");
						typeof contents[primaryFontFamily] === "undefined" ? contents[primaryFontFamily] = element.innerText : contents[primaryFontFamily] += element.innerText;
					}
				});

				return contents;
			}, this.options);

			for(let contents in pageContents){
				typeof this.contents[contents] === "undefined" ? this.contents[contents] = pageContents[contents] : this.contents[contents] += pageContents[contents];
			}

			resolve(pageContents);
		}).catch(err=>new Error(err));
	}

	getRanges(){
		for(let content in this.contents){
			this.ranges[content] = new CharacterSet(this.dedupe(this.contents[content])).toHexRangeString();
		}
	}

	dedupe(str){
		let unique = typeof str === "string" ? "" : [];

		for(let i = 0; i < str.length; i++){
			if(unique.indexOf(str[i]) === -1){
				typeof str === "string" ? unique += str[i] : unique.push(str[i]);
			}
		}

		return unique;
	};

	async subset(font){
		const run = Promise.promisify(exec);

		if(typeof this.options.subsetFolder === "undefined"){
			this.options.subsetFolder = __dirname;
		}

		if(commandExistsSync("pyftsubset")){
			for(let font in this.options.subsetMap){
				let fontFiles = this.options.subsetMap[font].files;

				if(typeof fontFiles === "string"){
					fontFiles = [fontFiles];
				}

				for(let file in fontFiles){
					let fontFile = join(this.options.subsetFolder, fontFiles[file]);
					let outputFile = fontFile.replace(".ttf", ".subset.ttf");
					let unicodeRange = this.ranges[font];
					await run(`pyftsubset ${fontFile} --unicodes=${unicodeRange} --name-IDs='*' --output-file=${outputFile}`);
					this.exportEOT(outputFile, outputFile.replace(".ttf", ".eot"));
					this.exportWOFF(outputFile, outputFile.replace(".ttf", ".woff"));
					this.exportWOFF2(outputFile, outputFile.replace(".ttf", ".woff2"));
				}
			}
		}
		else{
			return Promise.reject("pyftsubset is missing! Please install fonttools to subset fonts.").catch(err=>new Error(err));
		}
	}

	exportEOT(src, dest){
		let input = readFileSync(src);
		let ttf = new Uint8Array(input);
		let eot = new Buffer(ttf2eot(ttf).buffer);
		writeFileSync(dest, eot);
	}

	async exportWOFF(src, dest){
		let input = readFileSync(src);
		let ttf = new Uint8Array(input);
		let eot = new Buffer(ttf2woff(ttf).buffer);
		writeFileSync(dest, eot);
	}

	async exportWOFF2(src, dest){
		writeFileSync(dest, ttf2woff2(readFileSync(src)));
	}
};
