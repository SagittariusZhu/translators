# translators

Translators is a library which aims to bring free, multiple, enjoyable translation to individuals and students in Nodejs. 

Translators是一个旨在为个人和学生带来免费、多样、愉快翻译的Nodejs库。

## 使用

**安装**

```sh
npm install translators

//or

yarn add translators
```

**调用**

```javascript
const { baiduTranslator } = require('translators');

baiduTranslator('Space Force eyes lower-cost sensors to monitor geostationary orbit', 'en', 'zh', {}).then(value => {
     console.log(value);
 });
```

本项目目前支持的翻译接口包括

```
baiduTranslator: 百度通用翻译
googleTranslator: 谷歌单词模型翻译
youdaoTranslator: 有道翻译
bingTranslator: 微软必应翻译
```

**参数**
```
:param query_text: str, must.
:param from_language: str, default 'auto'.
:param to_language: str, default 'en'.
:param **kwargs:
        :param if_use_cn_host: boolean, default false.（如果是国内用户，检验设置为true，可以加快响应速度）
        :param if_ignore_limit_of_length: boolean, default false.
        :param is_detail_result: boolean, default false.
        :param timeout: int, default null.
        :param proxies: dict, default null.
        :param sleep_seconds: int, default `parseInt(Math.random()*10)`.
:return: str or list
```
## 说明

从小规模数据测试情况来看，百度通用翻译在`中译英`上表现较好，但在`英译中`上表现一般；谷歌单词模型翻译仅仅是功能演示，并不具备实际使用价值；有道翻译和微软必应翻译在`中译英`上表现相同，比百度通用翻译稍差一些，但在`英译中`表现上佳，有趣的是微软必应翻译在`英译中`上的效果居然和谷歌NMT模型效果一样，不知道是不是用的相同的模型。

个人推荐：有道翻译，毕竟是国内网站，在保证效果的同时也能够保证响应速度。

## 感谢

该项目来源于Python版本的[Translators](https://github.com/UlionTse/translators)，在此对此项目表示感谢。

**本项目仅限学习交流使用，请尊重各翻译提供商的商业利益。**