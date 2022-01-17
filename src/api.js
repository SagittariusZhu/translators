// Imports the Google Cloud client library
const { Translate } = require('@google-cloud/translate').v2;

// Creates a client
const translate = new Translate();

/**
 * TODO(developer): Uncomment the following lines before running the sample.
 */
// const text = 'The text to translate, e.g. Hello, world!';
// const target = 'The target language, e.g. ru';
const model = 'nmt';

async function translateText(text, from, target) {
    const options = {
        from,
        // The target language, e.g. "ru"
        to: target,
        // Make sure your project is on the allow list.
        // Possible values are "base" and "nmt"
        model: model,
    };

    // Translates the text into the target language. "text" can be a string for
    // translating a single piece of text, or an array of strings for translating
    // multiple texts.
    let [translations] = await translate.translate(text, options);
    translations = Array.isArray(translations) ? translations : [translations];
    console.log('Translations:');
    translations.forEach((translation, i) => {
        console.log(`${text[i]} => (${target}) ${translation}`);
    });
    return translations.join('\n');
}

module.exports = translateText;