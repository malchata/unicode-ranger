const gulp = require("gulp"),
	  util = require("gulp-util"),
	  babel = require("gulp-babel"),
	  del = require("del");

gulp.task("default", () => {
	let src = "src/*.js",
		dest = "dist";

	return gulp.src(src)
		.pipe(babel({
			presets: ["es2015"]
		}))
		.on("error", console.error.bind(console))
		.pipe(gulp.dest(dest));
});

gulp.task("clean", () => {
	return del("dist");
});

gulp.task("watch", () => {
	let src ="src/*.js";
	gulp.watch(src, ["default"]);
});