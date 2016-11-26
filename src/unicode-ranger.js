"use strict";

import request from "request";
import cheerio from "cheerio";
import Promise from "promise";

const opts = {
	excludeElements: "meta,script,code,link,object,style,picture,img"
};

const unicodeRanger = {
	getRange: (urls) => {
		let urlArr = urls.split(";"),
			calls = [];

		for(let i = 0; i < urlArr.length; i++){
			calls.push(unicodeRanger.makeRequest(urlArr[i]));
		}

		return Promise.all(calls).then((res) => {
			let bodyContents = "";

			for(let j in res){
				bodyContents += res[j];
			}

			let characters = unicodeRanger.dedupe(bodyContents),
				unicodes = unicodeRanger.getUnicodes(characters),
				ranges = unicodeRanger.getRanges(unicodes);

			return ranges;
		}).catch((err) => {
			return err;
		});
	},
	makeRequest: (url) => {
		return new Promise((resolve, reject) => {
			request(url, (error, response, body) => {
				if(response !== undefined){
					if(response.statusCode === 200){
						resolve(unicodeRanger.getTextFromHTML(body));
					}
					else{
						reject("Server responded with a " + response.statusCode + " error code.");
					}
				}
				else{
					reject("Couldn't reach server.");
				}
			});
		});
	},
	getTextFromHTML: (body) => {
		let $ = cheerio.load(body);
		$(opts.excludeElements).remove();
		return $("body").text();
	},
	dedupe: (str) => {
		let unique = "";

		for(let i = 0; i < str.length; i++){
			if(unique.indexOf(str[i]) === -1){
				unique += str[i];
			}
		}

		return unique;
	},
	getUnicodes: (str) => {
		let unicodeArray = [];

		for(let i = 0; i < str.length; i++){
			unicodeArray.push(str.charCodeAt(i));
		}

		return unicodeRanger.sort(unicodeArray);
	},
	// A much, much smarter person than me solved this problem, and their code represents the bulk of the work here:
	// http://stackoverflow.com/questions/2270910/how-to-convert-sequence-of-numbers-in-an-array-to-range-of-numbers
	getRanges: (arr) => {
		let ranges = [],
			start,
			end;

		for(let i = 0; i < arr.length; i++){
			start = arr[i];
			end = start;

			while(arr[i + 1] - arr[i] == 1){
				end = arr[i + 1];
				i++;
			}

			ranges.push(start == end ? "U+" + unicodeRanger.getHexValue(start) : "U+" + unicodeRanger.getHexValue(start) + "-" + unicodeRanger.getHexValue(end));
		}

		return ranges.toString();
	},
	sort: (arr) => {
		return arr.sort((a, b) => {
			return a - b;
		});
	},
	getHexValue: (num) => {
		return num.toString(16).toUpperCase();
	}
};

export default unicodeRanger;