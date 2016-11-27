"use strict";

import request from "request";
import cheerio from "cheerio";
import Promise from "promise";

const defaultOptions = {
	excludeElements: "meta,script,code,link,object,style,picture,img,video,source,embed,applet"
};

let options = {};

const makeRequest = (url, userOptions) => {
	if(userOptions === undefined){
		options = defaultOptions;
	}
	else{
		options = assign(defaultOptions, userOptions);
	}

	return new Promise((resolve, reject) => {
		request(url, (error, response, body) => {
			if(response !== undefined){
				if(response.statusCode === 200){
					resolve(getTextFromHTML(body));
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
};

const getTextFromHTML = (body) => {
	let $ = cheerio.load(body);
	$(options.excludeElements).remove();
	return $("body").text();
};

const dedupe = (str) => {
	let unique = "";

	for(let i = 0; i < str.length; i++){
		if(unique.indexOf(str[i]) === -1){
			unique += str[i];
		}
	}

	return unique;
};

const getUnicodes = (str) => {
	let unicodeArray = [];

	for(let i = 0; i < str.length; i++){
		unicodeArray.push(str.charCodeAt(i));
	}

	return sortArray(unicodeArray);
};

// A much, much smarter person than me solved this problem, and their code represents the bulk of the work here:
// http://stackoverflow.com/questions/2270910/how-to-convert-sequence-of-numbers-in-an-array-to-range-of-numbers
const getRanges = (arr) => {
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

		ranges.push(start == end ? "U+" + getHexValue(start) : "U+" + getHexValue(start) + "-" + getHexValue(end));
	}

	return ranges.toString();
};

const sortArray = (arr) => {
	return arr.sort((a, b) => {
		return a - b;
	});
};

const getHexValue = (num) => {
	return num.toString(16).toUpperCase();
};

const unicodeRanger = (urls) => {
	let urlArr = urls.split(";"),
		calls = [];

	for(let i = 0; i < urlArr.length; i++){
		calls.push(makeRequest(urlArr[i]));
	}

	return Promise.all(calls).then((res) => {
		let bodyContents = "";

		for(let j in res){
			bodyContents += res[j];
		}

		let characters = dedupe(bodyContents),
			unicodes = getUnicodes(characters),
			ranges = getRanges(unicodes);

		return ranges;
	}).catch((err) => {
		return err;
	});
};

export default unicodeRanger;