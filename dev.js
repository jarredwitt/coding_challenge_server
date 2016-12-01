require('shelljs/global');
var fs = require('fs');

// Transpiles using babel and watches dev for changes.
// Starts nodemon and restarts express when .build folder changes
var babelCmd = 'babel --watch dev --out-dir .build';
var serverCmd = 'nodemon --watch .build -L .build/index.js';
var env = 'development';

if (process.platform === 'win32') {
  babelCmd = 'set NODE_ENV=' + env + '&& ' + babelCmd;
} else {
  babelCmd = 'NODE_ENV=' + env + ' ' + babelCmd;
}

// Remove the build folder
rm('-rf', '.build');

// create our data folder for the sqlite database
const dataDirectoryExists = fs.existsSync('./data');
!dataDirectoryExists && fs.mkdirSync('./data');

exec(babelCmd, { async: true });

// Make sure we give babel enough time and then start the server
function delayStart() {
  setTimeout(function() {
    exec(serverCmd, { async: true });
  }, 1000);
}
delayStart();
