const got = require('got')
const cheerio = require('cheerio')
const assert = require('assert')
const { URLSearchParams } = require('url')
// const tough = require('tough-cookie')
const qs = require('querystring')
const _ = require('lodash')
const md5 = require('blueimp-md5')
const { check_query_text, check_language, get_headers } = require('./common')

const { CookieJar } = require('tough-cookie')
const cookieJar = new CookieJar();

const globalOptions = {
    host_url: 'https://fanyi.baidu.com',
    api_url: 'https://fanyi.baidu.com/v2transapi',
    langdetect_url: 'https://fanyi.baidu.com/langdetect',
    get_sign_old_url: 'https://fanyi-cdn.cdn.bcebos.com/static/translation/pkg/index_bd36cef.js',
    get_sign_url: null,
    get_sign_pattern: 'https://fanyi-cdn.cdn.bcebos.com/static/translation/pkg/index_(.*?).js',
    host_headers: null,
    api_headers: null,
    bdtk_pool: [
        { "baidu_id": "F215FBBB82CAF048A24B86785E193475:FG=1", "token": "4e6d918b00ada40933d3e63fd2f2c009" },
        { "baidu_id": "97AD065BAC1491494A8D48510DABE382:FG=1", "token": "9d893922f8ea987de2f2adc81a81fbe7" },
        { "baidu_id": "A6D0C58DDED7B75B744EDE8A26054BF3:FG=1", "token": "4a1edb47b0528aad49d622db98c7c750" },
    ],
    bdtk: null,
    new_bdtk: null,
    host_info: null,
    language_map: null,
    query_count: 0,
    output_zh: 'zh',
}

globalOptions.host_headers = get_headers(globalOptions.host_url, { if_api: false })
globalOptions.api_headers = get_headers(globalOptions.host_url, { if_api: true })
globalOptions.bdtk = globalOptions.bdtk_pool[parseInt(Math.random() * globalOptions.bdtk_pool.length)]

const get_sign_html = async (host_html, timeout, proxies) => {
    let r
    try {
        if (!globalOptions.get_sign_url) {
            globalOptions.get_sign_url = host_html.match(globalOptions.get_sign_pattern)[0]
        }
        r = await got(globalOptions.get_sign_url, { headers: globalOptions.host_headers, timeout: timeout, proxies: proxies })
    } catch (error) {
        r = await got(globalOptions.get_sign_old_url, { headers: globalOptions.host_headers, timeout: timeout, proxies: proxies })
    }
    globalOptions.get_sign_url = globalOptions.get_sign_old_url
    return r.body
}

const get_sign = (sign_html, ts_text, gtk) => {
    const begin_label = 'define("translation:widget/translate/input/pGrab",function(r,o,t){'
    const end_label = 'var i=null;t.exports=e});'
    let sign_js = sign_html.substring(sign_html.indexOf(begin_label) + begin_label.length, sign_html.indexOf(end_label))
    sign_js = sign_js.replace('function e(r)', 'function e(r,i)')
    let sign = eval(`${sign_js}; e('${ts_text}', '${gtk}')`)
    return sign;
}

const get_host_info = (host_html, sign_html, ts_text) => {
    let gtk = host_html.match("window.gtk = '(.*?)';")[1]
    let sign = get_sign(sign_html, ts_text, gtk)

    const $ = cheerio.load(host_html)
    let js_txt = ''
    for (let node of $('html body script')) {
        let js_re_list = $(node).html();
        if (js_re_list && js_re_list.indexOf('langMap') >= 0) {
            js_txt = js_re_list.substring(20, js_re_list.length - 111)
            break;
        }
    }

    let js_data = eval(`a=${js_txt}`)
    return Object.assign(js_data, { 'gtk': gtk, 'sign': sign })
}

const baidu_api = async (query_text, from_language = 'auto', to_language = 'en', kwargs = {}) => {
    /*
    https://fanyi.baidu.com
    :param query_text: str, must.  # attention emoji
    :param from_language: str, default 'auto'.
    :param to_language: str, default 'en'.
    :param **kwargs:
            :param use_domain: str, default 'common'. Choose from ('common', 'medicine', 'electronics', 'mechanics')
            :param if_ignore_limit_of_length: boolean, default False.
            :param is_detail_result: boolean, default False.
            :param timeout: float, default None.
            :param proxies: dict, default None.
            :param sleep_seconds: float, default `random.random()`.
    :return: str or dict
    */

    const { use_domain = 'common', is_detail_result = false, timeout = null, proxies = null, sleep_seconds = Math.random(), if_ignore_limit_of_length = false } = kwargs
    assert(['common', 'medicine', 'electronics', 'mechanics'].indexOf(use_domain) >= 0)

    query_text = check_query_text(query_text, if_ignore_limit_of_length)

    let r = await got(globalOptions.host_url, { cookieJar, headers: globalOptions.host_headers, timeout: timeout, proxies: proxies })
    let host_html = r.body
    let sign_html = await get_sign_html(host_html, timeout, proxies)

    globalOptions.host_info = get_host_info(host_html, sign_html, query_text)
    globalOptions.new_bdtk = { "baidu_id": cookieJar.getCookiesSync(globalOptions.host_url).filter(item => item.key === "BAIDUID")[0].value, "token": globalOptions.host_info["token"] }
    globalOptions.language_map = globalOptions.host_info['langMap']
    let lang = check_language(from_language, to_language, globalOptions.language_map, { output_zh: globalOptions.output_zh })
    from_language = lang.from_language
    to_language = lang.to_language
    globalOptions.api_headers["cookie"] = `BAIDUID=${globalOptions.bdtk['baidu_id']};`

    if (from_language == 'auto') {
        let res = await got.post(globalOptions.langdetect_url, { headers: globalOptions.api_headers, body: { "query": query_text }, form: true, timeout: timeout, proxies: proxies })
        from_language = JSON.parse(res.body)['lan']
    }

    // param_data = {"from": from_language, "to": to_language}
    form_data = {
        "from": from_language,
        "to": to_language,
        "query": query_text,  //# from urllib.parse import quote_plus
        "transtype": "translang",  //# ["translang", "realtime"]
        "simple_means_flag": "3",
        "sign": globalOptions.host_info['sign'],
        "token": globalOptions.bdtk['token'],  //# globalOptions.host_info.get('token'),
        "domain": use_domain,
    }
    r = await got.post(globalOptions.api_url, { headers: globalOptions.api_headers, body: form_data, form: true, timeout: timeout, proxies: proxies })
    data = JSON.parse(r.body)
    // time.sleep(sleep_seconds)
    globalOptions.query_count += 1
    let resultStr = ''
    data['trans_result']['data'].forEach(item => {
        resultStr += item['dst'] ? item['dst'] : '\n';
    })
    return resultStr;
}

module.exports = baidu_api;