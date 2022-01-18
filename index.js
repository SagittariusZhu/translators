const path = require('path');
const fs = require('fs');

const localSrc = path.join(__dirname, 'src');
const libPath = fs.existsSync(localSrc) ? localSrc : path.join(__dirname, 'lib');

exports = module.exports = {
    baiduTranslator: require(path.join(libPath, 'baidu')),
    googleTranslator: require(path.join(libPath, 'google')),
    youdaoTranslator: require(path.join(libPath, 'youdao')),
    bingTranslator: require(path.join(libPath, 'bing')),
};

/*
  Export the version
*/

exports.version = require('./package').version;