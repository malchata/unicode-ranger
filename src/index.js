import Promise from "bluebird";
import regeneratorRuntime from "regenerator-runtime";
import request from "request-promise";
import xmlParser from "xml2json";
import puppeteer from "puppeteer";
import CharacterSet from "characterset";

export default class UnicodeRanger{
	constructor(urls, userOptions, subsetMap){
		this.defaultOptions = {
			excludeElements: ["SCRIPT", "BR", "TRACK", "WBR", "PARAM", "HR", "LINK", "OBJECT", "STYLE", "PICTURE", "IMG", "AUDIO", "VIDEO", "SOURCE", "EMBED", "APPLET", "TITLE", "META", "HEAD"],
			ignoreFonts: ["serif", "sans-serif", "cursive", "fantasy", "monospace"],
			safe: true
		};
		this.regexes = {
			sitemapXml: /sitemap\.xml$/i,
			validUrl: /^https?:\/\/.*$/i
		};
		this.options = typeof userOptions === "undefined" ? this.defaultOptions : Object.assign(this.defaultOptions, userOptions);
		this.urls = [];
		this.calls = [];
		this.contents = {};
		this.ranges;

		if(urls.length === 0){
			return Promise.reject("No URLs specified!").catch((err)=>new Error(err));
		}

		typeof urls === "string" ? urls = [urls] : urls = this.dedupe(urls);

		let sitemapUrls = urls.filter(url=>this.regexes.sitemapXml.test(url) === true);

		if(sitemapUrls.length > 0){
			sitemapUrls.forEach(async (sitemapUrl)=>{
				urls.splice(urls.indexOf(sitemapUrl), 1);
				const xml = await request(sitemapUrl).then(xml=>xml);
				const urlList = JSON.parse(xmlParser.toJson(xml)).urlset.url;

				for(let urlListItem in urlList){
					urls.push(urlList[urlListItem].loc);
				}

				if(sitemapUrls.indexOf(sitemapUrl) === sitemapUrls.length -1){
					this.urls = [...this.dedupe(urls)];
					this.processUrls();
				}
			});
		}
		else{
			this.urls = [...this.dedupe(urls)];
			this.processUrls();
		}

		return Promise.all(this.calls).then((res)=>{
			for(let content in this.contents){
				if(this.options.ignoreFonts.indexOf(content) !== -1 || this.contents[content].length === 0){
					delete this.contents[content];
				}
				else{
					this.contents[content] = this.getRanges(this.dedupe(this.contents[content]));
				}
			}

			//console.log(this.contents);
		}).catch(err=>new Error(err));
	};

	processUrls(){
		this.urls.forEach(async (url)=>{
			this.calls.push(await puppeteer.launch().then(async (browser)=>{
				console.log(`Browser up for ${url}`);

				const page = await browser.newPage();
				page.on("console", msg => console.log("PAGE LOG: ", msg.text));
				await page.goto(url);
				const pageContents = await page.evaluate(()=>{
					let contents = {};

					document.documentElement.querySelectorAll("*").forEach((element)=>{
						let primary = getComputedStyle(element).getPropertyValue("font-family").split(",")[0];
						typeof contents[primary] === "undefined" ? contents[primary] = element.innerText : contents[primary] += element.innerText;
					});

					console.dir(contents);
					return contents;
				});

				for(let contents in pageContents){
					typeof this.contents[contents] === "undefined" ? this.contents[contents] = pageContents[contents] : this.contents[contents] += pageContents[contents];
				}

				await browser.close();

				console.log(`Browser down for ${url}`);
			}));
		});
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

	getRanges(str){
		return new CharacterSet(str).toHexRangeString();
	}
};
