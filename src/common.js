const got = require('got')
const assert = require('assert')
const _ = require('lodash')

class TranslatorError extends Error {
    constructor(msg) {
        super(msg)
    }
}

const request_server_region_info = async () => {
    try {
        const { body } = await got.get('https://httpbin.org/ip', { json: true })
        const ip_address = body['origin'];
        try {
            const { body } = await got.get(`http://ip-api.com/json/${ip_address}`, { json: true })  // http # limit 45 / min.
            let country = body["country"]
            assert(country)
            console.log(`Using ${country} server backend.`)
            return body
        } catch (error) {
            const data = await got.post('https://ip.taobao.com/outGetIpInfo', {
                data: { 'ip': ip_address, 'accessKey': 'alibaba_inc' }
            })
            return Object.assign(data, { 'countryCode': data.get('country_id') })
        }
    } catch (error) {
        throw new TranslatorError('Unable to find server backend.')
    }
}

const check_query_text = (query_text, { if_ignore_limit_of_length = false, limit_of_length = 5000 }) => {
    query_text = query_text.trim()
    if (query_text.length === 0) return ''
    let length = query_text.length
    if (length >= limit_of_length && !if_ignore_limit_of_length) {
        throw new TranslatorError('The length of the text to be translated exceeds the limit.')
    } else {
        if (length >= limit_of_length) {
            warn(`The translation ignored the excess[above ${limit_of_length}]. Length of query_text is ${length}.`)
            warn('The translation result will be incomplete.')
            return query_text.substr(0, limit_of_length - 1)
        }
    }
    return query_text
}

const check_language = (from_language, to_language, language_map, { output_zh = null, output_auto = 'auto' }) => {
    const auto_pool = ['auto', 'auto-detect']
    const zh_pool = ['zh', 'zh-CN', 'zh-CHS', 'zh-Hans']
    from_language = auto_pool.indexOf(from_language) >= 0 ? output_auto : from_language
    from_language = output_zh && zh_pool.indexOf(from_language) >= 0 ? output_zh : from_language
    to_language = output_zh && zh_pool.indexOf(to_language) >= 0 ? output_zh : to_language

    if (from_language != output_auto && !_.has(language_map, from_language)) {
        throw new TranslatorError(`Unsupported from_language[${from_language}] in ${Object.keys(language_map).sort()}.`)
    } else if (!_.has(language_map, to_language)) {
        throw new TranslatorError(`Unsupported to_language[${to_language}] in ${Object.keys(language_map).sort()}.`)
    } else if (from_language != output_auto && language_map[from_language].indexOf(to_language) < 0) {
        throw new TranslatorError(`Unsupported translation: from [${from_language}] to [${to_language}]!`)
    }
    return { from_language, to_language }
}

const get_headers = (host_url, { if_api = false, if_referer_for_host = true, if_ajax_for_api = true, if_json_for_api = false }) => {
    const url = new URL(host_url);
    const user_agent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36"
    let host_headers = {
        'Origin': url.origin,
        [if_referer_for_host ? 'Referer' : 'Host']: host_url,
        "User-Agent": user_agent,
    }
    let api_headers = {
        'Host': url.hostname,
        'Origin': url.origin,
        'Referer': host_url,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        "User-Agent": user_agent,
    }
    if (if_api && !if_ajax_for_api) {
        api_headers.remove('X-Requested-With')
        api_headers['Content-Type'] = 'text/plain'
    }
    if (if_api && if_json_for_api) {
        api_headers['Content-Type'] = 'application/json'
    }
    return !if_api ? host_headers : api_headers
}

module.exports = {
    request_server_region_info,
    check_query_text,
    check_language,
    get_headers
}