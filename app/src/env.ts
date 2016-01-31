// Simple module exposes environment variables to rest of the code.

import jetpack from 'fs-jetpack';
import * as electron from 'electron';

var app;
if (process.type === 'renderer') {
    app = electron.remote.app;
} else {
    app = electron.app;
}
var appDir = jetpack.cwd(app.getAppPath());

var manifest = appDir.read('package.json', 'json');

export default manifest.env;
