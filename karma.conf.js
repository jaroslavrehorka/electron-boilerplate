/* global module */
module.exports = function (config) {
    'use strict';
    config.set({

        basePath: './app',

        singleRun: true,

        reporters: ['progress'],

        frameworks: ['jspm', 'jasmine'],

        jspm: {
            loadFiles: [
                'src/**/*.spec.ts'
            ],
            serveFiles: [
                'src/**/*!(*.spec).ts',
                'tsconfig.json'
            ],
            config: "config.js",
            packages: "jspm_packages"
        },

        proxies: {
            '/src/': '/base/src/',
            '/jspm_packages/': '/base/jspm_packages/',
            '/tsconfig.json': '/base/tsconfig.json'
        },

        browsers: ['Electron']
    });
};