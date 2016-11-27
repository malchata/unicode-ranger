"use strict";

import unicodeRanger from "./index.js";
unicodeRanger("https://en.wikipedia.org").then((data) => console.log(data));