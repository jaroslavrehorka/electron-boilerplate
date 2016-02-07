'use strict';

var pathUtil = require('path');
var Q = require('q');
var gulp = require('gulp');
var rollup = require('rollup');
var sass = require('gulp-sass');
var jetpack = require('fs-jetpack');
var exec = require('child_process').exec;

var utils = require('./utils');

var projectDir = jetpack;

const APP_DIR = './app';
const BUILD_DIR = './build';

var srcDir = projectDir.cwd(APP_DIR);
var destDir = projectDir.cwd(BUILD_DIR);

var paths = {
    copyFromAppDir: [
        './node_modules/**',
        './jspm_packages/**',
        './src/**',
        './vendor/**',
        './**/*.html',
        './**/*.+(jpg|png|svg)',
        'tsconfig.json',
        'config.js'
    ],
    copyFromAppDirRelease: [
        './node_modules/**',
        './vendor/**',
        'app.release.html',
        './**/*.+(jpg|png|svg)'

    ]
};

// -------------------------------------
// Tasks
// -------------------------------------

gulp.task('clean', () => {
    return destDir.dirAsync('.', {empty: true});
});


var copyTask = () => {
    return projectDir.copyAsync('app', destDir.path(), {
        overwrite: true,
        matching: paths.copyFromAppDir
    });
};
var copyReleaseTask = () => {
    return projectDir.copyAsync('app', destDir.path(), {
        overwrite: true,
        matching: paths.copyFromAppDirRelease
    });
};
gulp.task('copy', ['clean'], copyTask);
gulp.task('copy-release', ['clean'], copyReleaseTask);
gulp.task('copy-watch', copyTask);


var bundle = (src, dest) => {
    var deferred = Q.defer();

    rollup.rollup({
        entry: src
    }).then((bundle) => {
        var jsFile = pathUtil.basename(dest);
        var result = bundle.generate({
            format: 'cjs',
            sourceMap: true,
            sourceMapFile: jsFile
        });
        // Wrap code in self invoking function so the variables don't
        // pollute the global namespace.
        var isolatedCode = '(function () {' + result.code + '\n}());';
        return Q.all([
            destDir.writeAsync(dest, isolatedCode + '\n//# sourceMappingURL=' + jsFile + '.map'),
            destDir.writeAsync(dest + '.map', result.map.toString())
        ]);
    }).then(() => {
        deferred.resolve();
    }).catch((err) => {
        console.error('Build: Error during rollup', err.stack);
    });

    return deferred.promise;
};

var bundleTask = () => {
    return Q.all([
        bundle(srcDir.path('background.js'), destDir.path('background.js'))
    ]);
};
gulp.task('bundle', ['clean'], bundleTask);
gulp.task('bundle-watch', bundleTask);


var sassTask = function () {
    return gulp.src(APP_DIR + '/app.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest(BUILD_DIR));
};
var sassReleaseTask = function () {
    return gulp.src(APP_DIR + '/app.scss')
        .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
        .pipe(gulp.dest(BUILD_DIR));
};
gulp.task('sass', ['clean'], sassTask);
gulp.task('sass-release', ['clean'], sassReleaseTask);
gulp.task('sass-watch', sassTask);


gulp.task('finalize', ['clean'], () => {
    var manifest = srcDir.read('package.json', 'json');

    // Add "dev" or "test" suffix to name, so Electron will write all data
    // like cookies and localStorage in separate places for each environment.
    switch (utils.getEnvName()) {
        case 'development':
            manifest.name += '-dev';
            manifest.productName += ' Dev';
            break;
    }

    // Copy environment variables to package.json file for easy use
    // in the running application. This is not official way of doing
    // things, but also isn't prohibited ;)
    manifest.env = projectDir.read('config/env_' + utils.getEnvName() + '.json', 'json');

    destDir.write('package.json', manifest);
});

gulp.task('bundle-jspm', (cb) => {

    return exec('cd ' + srcDir.path() + ' && jspm bundle-sfx src ' + destDir.path() + '/app.js',
        (err, stdout, stderr) => {
            console.log(stdout);
            console.log(stderr);
            cb(err);
        });
});

gulp.task('watch', () => {
    gulp.watch('app/**/*.js', ['bundle-watch']);
    gulp.watch(paths.copyFromAppDir, {cwd: 'app'}, ['copy-watch']);
    gulp.watch('app/renderer/**/*.scss', ['sass-wath']);
});


gulp.task('build', ['bundle', 'sass', 'copy', 'finalize']);
gulp.task('build-release', ['bundle', 'bundle-jspm', 'sass-release', 'copy-release', 'finalize']);
