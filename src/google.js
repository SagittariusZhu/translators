const got = require('got')
const cheerio = require('cheerio')
const assert = require('assert')
const { URL } = require('url')
const qs = require('qs')
const _ = require('lodash')
const { request_server_region_info, check_query_text, check_language, get_headers } = require('./common')

const warn = (str) => {
    console.warn(str)
}

const globalOptions = {
    host_url: null,
    cn_host_url: 'https://translate.google.cn',
    en_host_url: 'https://translate.google.com',
    api_url: null,
    request_server_region_info,
    host_headers: null,
    api_headers: null,
    language_map: null,
    rpcid: 'MkEWBc',
    query_count: 0,
    output_zh: 'zh-CN',
}

const make_temp_language_map = (from_language, to_language) => {
    warn('Did not get a complete language map. And do not use `from_language="auto"`.')
    assert(from_language != 'auto' && to_language != 'auto' && from_language != to_language)
    lang_list = [from_language, to_language]
    let lang_pair = {}
    lang_list.forEach(item => {
        lang_pair[item] = lang_list
    })
    return lang_pair
}

const get_rpc = (query_text, from_language, to_language) => {
    let param = JSON.stringify([[query_text, from_language, to_language, true], [null]])
    let rpc = JSON.stringify([[[globalOptions.rpcid, param, null, "generic"]]])
    return { 'f.req': rpc }
}

const get_language_map = (host_html) => {
    const $ = cheerio.load(host_html)
    let lang_list = Array.from(new Set($('[data-language-code]').map((idx, item) => {
        return $(item).attr('data-language-code')
    }))).sort();
    if (lang_list)
        _.remove(lang_list, (item) => item === 'auto')
    let lang_pair = {}
    lang_list.forEach(item => {
        lang_pair[item] = lang_list
    })
    return lang_pair
}

const get_info = (host_html) => {
    data_str = host_html.match('window.WIZ_global_data = (.*?);</script>')[0]
    data = eval(data_str)
    return { 'bl': data['cfb2h'], 'f.sid': data['FdrFJe'] }
}

const get_consent_cookie = (consent_html) => {
    const $ = cheerio.load(consent_html)
    let input_element = $.css('.//input[@type="hidden"][@name="v"]')
    cookie_value = input_element ? input_element[0].attrib.get('value') : 'cb'
    return `CONSENT=YES+${cookie_value}` // cookie CONSENT=YES+cb works for now
}

// @Tse.time_stat
const google_api = async (query_text, from_language = 'auto', to_language = 'en', kwargs = {}) => {
    /*
    https://translate.google.com, https://translate.google.cn.
    :param query_text: str, must.
    :param from_language: str, default 'auto'.
    :param to_language: str, default 'en'.
    :param **kwargs:
            :param reset_host_url: str, default None. eg: 'https://translate.google.fr'
            :param if_use_cn_host: boolean, default None. affected by `reset_host_url`.
            :param if_ignore_limit_of_length: boolean, default False.
            :param is_detail_result: boolean, default False.
            :param timeout: float, default None.
            :param proxies: dict, default None.
            :param sleep_seconds: float, default `random.random()`.
    :return: str or list
    */
    const { reset_host_url, if_use_cn_host, is_detail_result, timeout, proxies, sleep_seconds = Math.random(), if_ignore_limit_of_length } = kwargs

    if (reset_host_url && reset_host_url != globalOptions.host_url) {
        assert(reset_host_url.startsWith('https://translate.google.'))
        globalOptions.host_url = reset_host_url
    } else {
        let use_cn_condition = if_use_cn_host || (await globalOptions.request_server_region_info())['countryCode'] == 'CN'
        globalOptions.host_url = use_cn_condition ? globalOptions.cn_host_url : globalOptions.en_host_url
    }

    globalOptions.host_headers = globalOptions.host_headers || get_headers(globalOptions.host_url, { if_api: false })  // reuse cookie header
    globalOptions.api_headers = get_headers(globalOptions.host_url, { if_api: true, if_referer_for_host: true, if_ajax_for_api: true })

    query_text = check_query_text(query_text, { if_ignore_limit_of_length })
    let delete_temp_language_map_label = 0

    let r = await got(globalOptions.host_url, { headers: globalOptions.host_headers, timeout: timeout, proxies: proxies })
    let host_html
    if ('consent.google.com' === new URL(r.url).hostname) {
        globalOptions.host_headers['cookie'] = globalOptions.get_consent_cookie(r.body)
        host_html = await got(globalOptions.host_url, { headers: globalOptions.host_headers, timeout: timeout, proxies: proxies }).body
    } else {
        host_html = r.body
    }

    if (!globalOptions.language_map) globalOptions.language_map = get_language_map(host_html)
    if (!globalOptions.language_map) {
        delete_temp_language_map_label += 1
        globalOptions.language_map = make_temp_language_map(from_language, to_language)
    }
    const lang = check_language(from_language, to_language, globalOptions.language_map, { output_zh: globalOptions.output_zh })
    from_language = lang.from_language
    to_language = lang.to_language

    globalOptions.api_url = `${globalOptions.host_url}/_/TranslateWebserverUi/data/batchexecute?rpcids=${globalOptions.rpcid}\
    &f.sid=-4174700383136665383&bl=boq_translate-webserver_20220112.11_p0&hl=${to_language}&soc-app=1&soc-platform=1&soc-device=1&_reqid=40155&rt=c`

    let rpc_data = get_rpc(query_text, from_language, to_language)
    r = await got.post(globalOptions.api_url, { headers: globalOptions.api_headers, body: rpc_data, form: true, timeout: timeout, proxies: proxies })
    let r_arr = r.body.split('\n')
    json_data = JSON.parse(r_arr[3])
    let data = JSON.parse(json_data[0][2])

    if (delete_temp_language_map_label != 0) {
        globalOptions.language_map = null
    }
    // time.sleep(sleep_seconds)
    globalOptions.query_count += 1
    return is_detail_result ? data : data[1][0][0][5].map(x => x[0]).join(' ')
}

module.exports = google_api;