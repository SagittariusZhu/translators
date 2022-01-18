const got = require('got');
const cheerio = require('cheerio');
const { URLSearchParams } = require('url');
// const tough = require('tough-cookie')
const _ = require('lodash');
const md5 = require('blueimp-md5');
const { sleep, check_query_text, check_language, get_headers, TranslatorError } = require('./common');

const { CookieJar } = require('tough-cookie');
const cookieJar = new CookieJar();

// const Cookie = tough.Cookie;

const globalOptions = {
	host_url: 'https://fanyi.youdao.com',
	api_url: 'https://fanyi.youdao.com/translate_o?smartresult=dict&smartresult=rule',
	get_old_sign_url: 'https://shared.ydstatic.com/fanyi/newweb/v1.0.29/scripts/newweb/fanyi.min.js',
	get_new_sign_url: null,
	get_sign_pattern: 'https://shared.ydstatic.com/fanyi/newweb/(.*?)/scripts/newweb/fanyi.min.js',
	host_headers: null,
	api_headers: null,
	language_map: null,
	query_count: 0,
	output_zh: 'zh-CHS',
};

globalOptions.host_headers = get_headers(globalOptions.host_url, { if_api: false });
globalOptions.api_headers = get_headers(globalOptions.host_url, { if_api: true });
// globalOptions.api_headers = Object.assign(get_headers(globalOptions.host_url, { if_api: true }), {
//     Cookie: 'OUTFOX_SEARCH_USER_ID=-20823024@10.169.0.83; JSESSIONID=aaaPA7LqeOdq4gRMW6I5x; OUTFOX_SEARCH_USER_ID_NCOO=1103773464.0723996; ___rl__test__cookies=1642337627127'
// });

const get_language_map = (host_html) => {
	const $ = cheerio.load(host_html);
	let lang_pair = {};
	for (let item of $('[id="languageSelect"] li[data-value]')) {
		let value = $(item).attr('data-value');
		if (value.indexOf('2') >= 0) {
			let arr = value.split('2');
			if (_.has(lang_pair, arr[0])) {
				lang_pair[arr[0]].push(arr[1]);
			} else {
				lang_pair[arr[0]] = [arr[1]];
			}
		}
	}
	return lang_pair;
};

const get_sign_key = async (host_html, timeout, proxies) => {
	let r;
	try {
		if (!globalOptions.get_new_sign_url) {
			globalOptions.get_new_sign_url = host_html.match(globalOptions.get_sign_pattern)[0];
		}
		r = await got(globalOptions.get_new_sign_url, { headers: globalOptions.host_headers, timeout: timeout, proxies: proxies });
	} catch (error) {
		r = await got(globalOptions.get_old_sign_url, { headers: globalOptions.host_headers, timeout: timeout, proxies: proxies });
	}
	//n.md5("fanyideskweb"+e+i+"Y2FYu%TNSbMCxc3t2u^XT")
	let sign = r.body.match('n.md5\\("fanyideskweb"\\+e\\+i\\+"(.*?)"\\)')[1];
	return sign && sign != '' ? sign : 'Tbh5E8=q6U3EXe+&L[4c@'; // v1.0.31
};
//Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36
const get_form = (query_text, from_language, to_language, sign_key) => {
	let ts = '' + (new Date).getTime();
	// ts = '1642337627134'
	let salt = ts + parseInt(10 * Math.random(), 10);
	// salt = '16423376271349'
	let sign_text = ['fanyideskweb', query_text, salt, sign_key].join('');
	let sign = md5(sign_text);
	let bv = md5(globalOptions.api_headers['User-Agent'].substr(8));
	let form = {
		'i': query_text,
		'from': from_language,
		'to': to_language,
		'lts': ts,                  // r = "" + (new Date).getTime()
		'salt': salt,               // i = r + parseInt(10 * Math.random(), 10)
		'sign': sign,               // n.md5("fanyideskweb" + e + i + "n%A-rKaT5fb[Gy?;N5@Tj"),e=text
		'bv': bv,                   // n.md5(navigator.appVersion)
		'smartresult': 'dict',
		'client': 'fanyideskweb',
		'doctype': 'json',
		'version': '2.1',
		'keyfrom': 'fanyi.web',
		'action': 'FY_BY_REALTlME',  // not time.["FY_BY_REALTlME","FY_BY_DEFAULT"]
		// 'typoResult': 'false'
	};
	return form;
};

const youdao_api = async (query_text, from_language = 'auto', to_language = 'en', kwargs = {}) => {
	/*
	https://fanyi.youdao.com
	:param query_text: str, must.
	:param from_language: str, default 'auto'.
	:param to_language: str, default 'en'.
	:param **kwargs:
			:param if_ignore_limit_of_length: boolean, default False.
			:param is_detail_result: boolean, default False.
			:param timeout: float, default None.
			:param proxies: dict, default None.
			:param sleep_seconds: float, default `random.random()`.
	:return: str or dict
	*/
	const { is_detail_result = false, timeout = null, proxies = null, sleep_seconds = parseInt(Math.random() * 10), if_ignore_limit_of_length = false } = kwargs;
	query_text = check_query_text(query_text, if_ignore_limit_of_length);

	let r = await got(globalOptions.host_url, { cookieJar, headers: globalOptions.host_headers, timeout: timeout, proxies: proxies });
	// let cookies
	// if (r.headers['set-cookie'] instanceof Array)
	//     cookies = r.headers['set-cookie'].map(Cookie.parse);
	// else
	//     cookies = [Cookie.parse(r.headers['set-cookie'])];
	let host_html = r.body;
	if (!globalOptions.language_map) {
		globalOptions.language_map = get_language_map(host_html);
	}
	let sign_key = await get_sign_key(host_html, timeout, proxies);
	let lang = check_language(from_language, to_language, globalOptions.language_map, { output_zh: globalOptions.output_zh });
	from_language = lang.from_language;
	to_language = lang.to_language;
	if (from_language === 'auto') {
		to_language = 'auto';
	}

	let form = get_form(query_text, from_language, to_language, sign_key);
	let formStr = new URLSearchParams(form).toString();
	r = await got.post(globalOptions.api_url, { cookieJar, body: formStr, headers: globalOptions.api_headers, timeout: timeout, proxies: proxies });
	let data = JSON.parse(r.body);
	if (data['errorCode'] == 40) {
		throw new TranslatorError('Invalid translation of `from_language[auto]`, please specify parameters of `from_language` or `to_language`.');
	}
	globalOptions.query_count += 1;
	await sleep(sleep_seconds);

	if (is_detail_result) return data;

	let resultStr = '';
	data['translateResult'].forEach(result => {
		result.forEach(item => {
			resultStr += item['tgt'] ? item['tgt'] : '\n';
		});
	});
	return resultStr;
};

module.exports = youdao_api;