'use strict'

const baiduTranslate = require('../src/baidu');
const googleTranslate = require('../src/google');
const youdaoTranslate = require('../src/youdao');
const bingTranslate = require('../src/bing');

const translators = [
    baiduTranslate,
    googleTranslate,
    youdaoTranslate,
    bingTranslate,
]

Promise.all(translators.map(t => {
    return t('Space Force eyes lower-cost sensors to monitor geostationary orbit', 'en', 'zh')
})).then(res => {
    console.log(res);
})

Promise.all(translators.map(t => {
    return t('太空部队着眼于低成本的传感器来监测地球静止轨道', 'zh', 'en')
})).then(res => {
    console.log(res);
})