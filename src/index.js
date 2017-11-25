import { join } from "path";
import { readFileSync, writeFileSync, statSync } from "fs";
import { sync as commandExistsSync } from "command-exists";
import { execSync } from "child_process";
import chalk from "chalk";
import Promise from "bluebird";
import regeneratorRuntime from "regenerator-runtime";
import request from "request-promise";
import xmlParser from "xml2json";
import { launch } from "puppeteer";
import CharacterSet from "characterset";
import ttf2eot from "ttf2eot";
import ttf2woff from "ttf2woff";
import ttf2woff2 from "ttf2woff2";

process.setMaxListeners(Infinity);

export default class UnicodeRanger{
	constructor(urls, userOptions){
		this.defaultOptions = {
			excludeElements: ["SCRIPT", "BR", "TRACK", "WBR", "PARAM", "HR", "LINK", "OBJECT", "STYLE", "PICTURE", "IMG", "AUDIO", "VIDEO", "SOURCE", "EMBED", "APPLET", "TITLE", "META", "HEAD"],
			ignoreHiddenElements: false,
			ignoreFonts: ["serif", "sans-serif", "cursive", "fantasy", "monospace"],
			verbose: false
		};
		this.regexes = {
			sitemapXml: /\/sitemap\.xml$/i,
			validUrl: /^https?:\/\/.*$/i
		};
		this.options = typeof userOptions === "undefined" ? this.defaultOptions : Object.assign(this.defaultOptions, userOptions);
		this.urls = [];
		this.contents = {};
		this.ranges = {};

		if("subsetMap" in this.options && commandExistsSync("pyftsubset") === false){
			delete this.options.subsetMap;

			if(this.options.verbose === true){
				console.warn(chalk.yellow("- [UNICODE-RANGER] pyftsubset is not installed. Subsetting will be skipped!"));
			}
		}

		if(urls.length === 0){
			this.options.verbose === true ? console.error(chalk.red("- [UNICODE-RANGER] No URLs specified!")) : console.error(chalk.red("No URLs specified!"));
			return Promise.reject("No URLs specified!");
		}

		if(typeof urls === "string"){
			urls = [urls];
		}

		return new Promise(async (resolve, reject)=>{
			let sitemapUrls = urls.filter(url=>this.regexes.sitemapXml.test(url) === true);

			if(sitemapUrls.length > 0){
				for(let sitemapUrl in sitemapUrls){
					urls.splice(urls.indexOf(sitemapUrls[sitemapUrl]), 1);
					urls = [...urls, ...await this.processSitemap(sitemapUrls[sitemapUrl])];
				}
			}

			this.urls = this.dedupe(urls);

			if(this.options.verbose === true){
				console.log(`- [PUPPETEER] Starting...`);
			}

			const browser = await launch().then(browser=>browser);

			if(this.options.verbose === true){
				console.log(`+ [PUPPETEER] Analyzing URLs...`);
			}

			for(let url in this.urls){
				await this.processUrl(this.urls[url], browser);
			}

			await browser.close();

			if(this.options.verbose === true){
				console.log(chalk.green(`- [PUPPETEER] Done.`));
			}

			this.getRanges();

			if("subsetMap" in this.options){
				if(this.options.verbose === true){
					console.log(`+ [UNICODE-RANGER] Subset map specified. Subsetting font files...`);
				}

				resolve(this.subset());
			}
			else{
				resolve(this.ranges);
			}
		});
	};

	processUrl(url, browser){
		return new Promise(async (resolve, reject)=>{
			const page = await browser.newPage();

			if(this.options.verbose === true){
				page.on("console", msg => console.log(msg.text));
			}

			if(this.regexes.validUrl.test(url) === true){
				console.log(`|- [${url}] Accessing URL...`);

				await page.goto(url);

				const pageContents = await page.evaluate((options)=>{
					let contents = {};

					document.documentElement.querySelectorAll("*").forEach((element)=>{
						if(options.excludeElements.indexOf(element.tagName) === -1){
							let primaryFontFamily = getComputedStyle(element).getPropertyValue("font-family").split(",")[0].replace(/\"/ig, "");

							if(options.ignoreFonts.indexOf(primaryFontFamily) === -1){
								typeof contents[primaryFontFamily] === "undefined" ? contents[primaryFontFamily] = element.innerText : contents[primaryFontFamily] += element.innerText;
							}
						}
					});

					if(options.verbose === true){
						console.log(`|- [${document.location.href}] Content analyzed.`);
					}

					return contents;
				}, this.options);

				for(let contents in pageContents){
					typeof this.contents[contents] === "undefined" ? this.contents[contents] = pageContents[contents] : this.contents[contents] += pageContents[contents];
				}

				resolve(pageContents);
			}
			else{
				if(this.options.verbose === true){
					console.warn(chalk.yellow(`|- [${url}] URL invalid. Skipping.`));
				}

				reject();
			}
		}).catch(err=>new Error(err));
	}

	async processSitemap(url){
		const xmlDoc = await request(url);
		const sitemapJson = JSON.parse(xmlParser.toJson(xmlDoc)).urlset.url;
		let sitemapUrls = [];

		for(let sitemapUrl in sitemapJson){
			sitemapUrls.push(sitemapJson[sitemapUrl].loc);
		}

		return sitemapUrls;
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
		if(typeof this.options.subsetFolder === "undefined"){
			this.options.subsetFolder = __dirname;
		}

		for(let font in this.options.subsetMap){
			let unicodeRange = this.ranges[font];

			if(typeof unicodeRange === "undefined"){
				if(this.options.verbose === true){
					console.warn(chalk.yellow(`|- [UNICODE-RANGER] No subset defined for font family "${font}"`));
				}

				continue;
			}

			let fontFiles = this.options.subsetMap[font].files;

			if(typeof fontFiles === "string"){
				fontFiles = [fontFiles];
			}

			for(let file in fontFiles){
				let fontFile = join(this.options.subsetFolder, fontFiles[file]);
				let fontStats;

				try{
					fontStats = statSync(fontFile);
				}
				catch(err){
					this.options.verbose === true ? console.warn(chalk.yellow(`|- [UNICODE-RANGER] Couldn't stat file ${fontFile}`)) : console.warn(chalk.yellow(`Couldn't stat file ${fontFile}`));
					continue;
				}

				let outputFile = fontFile.replace(".ttf", ".subset.ttf");

				if(this.options.verbose === true){
					console.log(`|- [PYFTSUBSET] Subsetting ${fontFile}...`);
				}

				execSync(`pyftsubset ${fontFile} --unicodes=${unicodeRange} --name-IDs='*' --output-file=${outputFile}`);
				let oldSize = Number(fontStats.size / 1024).toFixed(2);
				let newSize = Number(statSync(outputFile).size / 1024).toFixed(2);
				let ofOriginal = `${Number((newSize / oldSize) * 100).toFixed(2)}%`;

				this.options.verbose === true ? console.log(chalk.green(`|- [PYFTSUBSET] ${chalk.bold(`${newSize} KB`)} subset written to ${outputFile}`)) : console.log(`${chalk.bold(`${newSize} KB`)} subset written to ${outputFile}`);
				this.options.verbose === true ? console.log(chalk.green(`|- [PYFTSUBSET] ${chalk.bold(`${oldSize} KB`)} -> ${chalk.bold(`${newSize} KB`)} (${ofOriginal} of original)`)) : console.log(chalk.green(`${chalk.bold(`${oldSize} KB`)} -> ${chalk.bold(`${newSize} KB`)} (${ofOriginal} of original)`));

				this.exportEOT(outputFile, outputFile.replace(".ttf", ".eot"));
				this.exportWOFF(outputFile, outputFile.replace(".ttf", ".woff"));
				this.exportWOFF2(outputFile, outputFile.replace(".ttf", ".woff2"));
			}
		}
	}

	exportEOT(src, dest){
		if(this.options.verbose === true){
			console.log(`|- [TTF2EOT] Converting ${src} to EOT...`);
		}

		let input = readFileSync(src);
		let ttf = new Uint8Array(input);
		let eot = new Buffer(ttf2eot(ttf).buffer);
		writeFileSync(dest, eot);
		const eotSize = Number(statSync(dest).size / 1024).toFixed(2);
		this.options.verbose === true ? console.log(chalk.green(`|- [TTF2EOT] Wrote ${chalk.bold(`${eotSize} KB`)} EOT file to ${dest}`)) : console.log(chalk.green(`Wrote ${chalk.bold(`${eotSize} KB`)} EOT file to ${dest}`));
	}

	async exportWOFF(src, dest){
		if(this.options.verbose === true){
			console.log(`|- [TTF2WOFF] Converting ${src} to WOFF...`);
		}

		let input = readFileSync(src);
		let ttf = new Uint8Array(input);
		let woff = new Buffer(ttf2woff(ttf).buffer);
		writeFileSync(dest, woff);
		const woffSize = Number(statSync(dest).size / 1024).toFixed(2);

		this.options.verbose === true ? console.log(chalk.green(`|- [TTF2WOFF] Wrote ${chalk.bold(`${woffSize} KB`)} WOFF file to ${dest}`)) : console.log(chalk.green(`Wrote ${chalk.bold(`${woffSize} KB`)} WOFF file to ${dest}`));
	}

	async exportWOFF2(src, dest){
		if(this.options.verbose === true){
			console.log(`|- [TTF2WOFF2] Converting ${src} to WOFF2.`);
		}

		writeFileSync(dest, ttf2woff2(readFileSync(src)));
		const woff2Size = Number(statSync(dest).size / 1024).toFixed(2);

		this.options.verbose === true ? console.log(chalk.green(`|- [TTF2EOT] Wrote ${chalk.bold(`${woff2Size} KB`)} WOFF2 file to ${dest}`)) : console.log(chalk.green(`Wrote ${chalk.bold(`${woff2Size} KB`)} WOFF2 file to ${dest}`));
	}
};
