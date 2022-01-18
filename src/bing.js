const got = require('got');
const cheerio = require('cheerio');
const { sleep, request_server_region_info, check_query_text, check_language, get_headers } = require('./common');

const { CookieJar } = require('tough-cookie');
const cookieJar = new CookieJar();

const globalOptions = {
	host_url: null,
	cn_host_url: 'https://cn.bing.com/Translator',
	en_host_url: 'https://www.bing.com/Translator',
	request_server_region_info,
	api_url: null,
	host_headers: null,
	api_headers: null,
	host_info: null,
	tk: null,
	first_time: (new Date).getTime(),
	language_map: null,
	query_count: 0,
	output_auto: 'auto-detect',
	output_zh: 'zh-Hans',
};

const get_host_info = (host_html) => {
	const $ = cheerio.load(host_html);
	let lang_list = $('[id="tta_srcsl"] option[value]') || $('[id="t_srcAllLang"] option[value]');
	lang_list = Array.from(new Set(lang_list.map((idx, item) => {
		return $(item).attr('value');
	}))).sort();

	let language_map = {};
	lang_list.forEach(item => {
		language_map[item] = lang_list;
	});

	let iid = $($('[id="rich_tta"]')).attr('data-iid') + '.' + (globalOptions.query_count + 1);
	let ig = host_html.match('IG:"(.*?)"')[1];
	return { 'iid': iid, 'ig': ig, 'language_map': language_map };
};

const get_tk = (host_html) => {
	let result_str = host_html.match('var params_RichTranslateHelper = (.*?);')[1];
	let result = eval(result_str);
	return { 'key': result[0], 'token': result[1] };
};

const bing_api = async (query_text, from_language = 'auto', to_language = 'en', kwargs = {}) => {
	/*
    https://bing.com/Translator, https://cn.bing.com/Translator.
    :param query_text: str, must.
    :param from_language: str, default 'auto'.
    :param to_language: str, default 'en'.
    :param **kwargs:
            :param if_use_cn_host: boolean, default None.
            :param if_ignore_limit_of_length: boolean, default False.
            :param is_detail_result: boolean, default False.
            :param timeout: float, default None.
            :param proxies: dict, default None.
            :param sleep_seconds: float, default `random.random()`.
    :return: str or list
    */
	const { if_use_cn_host = null, is_detail_result = false, timeout = null, proxies = null, sleep_seconds = parseInt(Math.random() * 10), if_ignore_limit_of_length = false } = kwargs;
	const use_cn_condition = if_use_cn_host || (await globalOptions.request_server_region_info())['countryCode'] === 'CN';
	globalOptions.host_url = use_cn_condition ? globalOptions.cn_host_url : globalOptions.en_host_url;
	globalOptions.api_url = globalOptions.host_url.replace('Translator', 'ttranslatev3');
	globalOptions.host_headers = get_headers(globalOptions.host_url, { if_api: false });
	globalOptions.api_headers = get_headers(globalOptions.host_url, { if_api: true });
	query_text = check_query_text(query_text, if_ignore_limit_of_length);

	let r = await got(globalOptions.host_url, { cookieJar, headers: globalOptions.host_headers, timeout: timeout, proxies: proxies });
	let host_html = r.body;
	globalOptions.host_info = get_host_info(host_html);

	if (!globalOptions.language_map) {
		globalOptions.language_map = globalOptions.host_info['language_map'];
	}
	let lang = check_language(from_language, to_language, globalOptions.language_map, { output_zh: globalOptions.output_zh, output_auto: globalOptions.output_auto });
	from_language = lang.from_language;
	to_language = lang.to_language;

	// params = {'isVertical': '1', '': '', 'IG': globalOptions.host_info['ig'], 'IID': globalOptions.host_info['iid']}
	globalOptions.api_url = globalOptions.api_url + `?isVertical=1&&IG=${globalOptions.host_info['ig']}&IID=${globalOptions.host_info['iid']}`;

	if (!globalOptions.tk || (new Date).getTime() - globalOptions.first_time > 3500) { // 3600
		globalOptions.tk = get_tk(host_html);
	}
	let form_data = {
		'text': query_text,
		'fromLang': from_language,
		'to': to_language,
		...globalOptions.tk,
	};
	r = await got.post(globalOptions.api_url, { cookieJar, headers: globalOptions.api_headers, body: form_data, form: true, timeout: timeout, proxies: proxies });
	let data = JSON.parse(r.body);
	await sleep(sleep_seconds);
	globalOptions.query_count += 1;

	if (is_detail_result) return data;

	return data[0]['translations'][0]['text'];
};

module.exports = bing_api;