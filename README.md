# `unicode-ranger`
## Get a unicode range from the contents of a URL.

This is a node module that will gather the content of one or more URLs. It uses [`request`](https://www.npmjs.com/package/request) to get URL contents, and [`cheerio`](https://www.npmjs.com/package/cheerio) to read that content. It then reduces all of this content down to unique characters, finds their decimal unicode values with `charCodeAt`, sorts the list and finds ranges. Finally, it converts that list to a `unicode-range`-friendly list of unicode ranges like so:

```
U+20,U+26-29,U+2C-32,U+35-36,U+38,U+3A,U+3F,U+41-4A,U+4C-57,U+59,U+61-79,U+A9,U+BB,U+2019
```

## Usage
If you want maximum convenience, use the CLI version aptly named [`unicode-ranger-cli`](https://www.npmjs.com/package/unicode-ranger-cli). It's much more convenient than noodling with the module directly. That said, it's not too difficult to use the module either. Just grab it from npm and use it like so:

```
const unicodeRanger = require("unicode-ranger");
unicodeRanger("https://example.com").then((data) => console.log(data));
```

Or do multiple URLs separated by semicolons:

```
const unicodeRanger = require("unicode-ranger");
unicodeRanger("https://example.com;https://en.wikipedia.org").then((data) => console.log(data));
```

The CLI version has an option for specifying multiple URLs via a text file.

## Options

The second argument for the module is for user options:

`excludeElements`: CSS selectors for contents that you want excluded from the analysis. This value is fed into `cheerio`'s `remove` method.

## Contributing/whatever

Do whatever you want with this module and its code. If you do incorporate it somewhere, I'd appreciate a mention. If you have questions about it, [bug me on Twitter](https://twitter.com/malchata), or better yet, log an issue. This module is not perfect, so if you have some ideas for how to make it better or want to contribute, just fork the code and submit a PR for me to review.

## Special thanks
Thanks to both [Ben Briggs](https://twitter.com/ben_eb) and [Ray Nicholus](https://twitter.com/RayNicholus) for their help with some snags I hit. Check them out on twitter!