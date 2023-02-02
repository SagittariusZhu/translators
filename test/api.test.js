/* eslint-disable indent */
'use strict';

const baiduTranslator = require('../src/baidu');
const googleTranslator = require('../src/google');
const youdaoTranslator = require('../src/youdao');
const bingTranslator = require('../src/bing');
const assert = require('assert');
const expect = require('chai').expect;

// const translators = [
// 	baiduTranslator,
// 	googleTranslator,
// 	youdaoTranslator,
// 	bingTranslator,
// ];

// Promise.all(translators.map(t => {
//     return t('Space Force eyes lower-cost sensors to monitor geostationary orbit', 'en', 'zh');
// })).then(res => {
//     console.log(res);
// });

// Promise.all(translators.map(t => {
//     return t('太空部队着眼于低成本的传感器来监测地球静止轨道', 'zh', 'en');
// })).then(res => {
//     console.log(res);
// });

const enStr = 'Space Force eyes lower-cost sensors to monitor geostationary orbit';
const zhStr = '太空部队着眼于低成本的传感器来监测地球静止轨道';

const zhTrans = [
	'空间力量眼低成本传感器监测地球静止轨道',
	'空间力眼睛降低成本传感器，以监测地球静止轨道',
	'太空部队将低成本的传感器用于监测地球静止轨道',
	'太空部队关注低成本传感器监测地球静止轨道' //bing
];

const enTrans = [
	'The space force focuses on low-cost sensors to monitor the geostationary orbit',
	'Space Force looks at low-cost sensors to monitor earth still tracks',
	'The space Force is looking at low-cost sensors to monitor the geostationary orbit',
	'The Space Force looks at low-cost sensors to monitor geostationary orbit' //bing
];

describe('Translators', function () {
	// describe('baidu', function () {
	// 	it('en to zh', function (done) {
	// 		baiduTranslator(enStr, 'en', 'zh', { sleep_seconds: 0 }).then(value => {
	// 			assert(value === zhTrans[0]);
	// 			done();
	// 		});
	// 	}).timeout(5000);
	// 	it('zh to en', function (done) {
	// 		baiduTranslator(zhStr, 'zh', 'en', { sleep_seconds: 0 }).then(value => {
	// 			assert(value === enTrans[0]);
	// 			done();
	// 		});
	// 	}).timeout(5000);
	// });
	// describe('google', function () {
	// 	it('en to zh', function (done) {
	// 		googleTranslator(enStr, 'en', 'zh', { if_use_cn_host: true, sleep_seconds: 0 }).then(value => {
	// 			assert(value === zhTrans[1]);
	// 			done();
	// 		});
	// 	}).timeout(5000);
	// 	it('zh to en', function (done) {
	// 		googleTranslator(zhStr, 'zh', 'en', { if_use_cn_host: true, sleep_seconds: 0 }).then(value => {
	// 			assert(value === enTrans[1]);
	// 			done();
	// 		});
	// 	}).timeout(5000);
	// });
	// describe('youdao', function () {
	// 	it('en to zh', function (done) {
	// 		youdaoTranslator(enStr, 'en', 'zh', { sleep_seconds: 0 }).then(value => {
	// 			assert(value === zhTrans[2]);
	// 			done();
	// 		});
	// 	}).timeout(5000);
	// 	it('zh to en', function (done) {
	// 		youdaoTranslator(zhStr, 'zh', 'en', { sleep_seconds: 0 }).then(value => {
	// 			assert(value === enTrans[2]);
	// 			done();
	// 		});
	// 	}).timeout(5000);
	// });
	describe('bing', function () {
		it('en to zh', function (done) {
			bingTranslator(enStr, 'en', 'zh', { if_use_cn_host: true, sleep_seconds: 0 }).then(value => {
                try {
                    assert(value === zhTrans[3]);
                    done();
                } catch (err) {
                    console.log(value);
                    done(err);
                }
			});
		}).timeout(50000);
		it('zh to en', function (done) {
			bingTranslator(zhStr, 'zh', 'en', { if_use_cn_host: true, sleep_seconds: 0 }).then(value => {
                try {
                    assert(value === enTrans[3]);
                    done();
                } catch (err) {
                    console.log(value);
                    done(err);
                }
			});
		}).timeout(5000);
	});

});