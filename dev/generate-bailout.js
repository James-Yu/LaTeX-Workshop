/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const duplicateForEmbedding = require('textmate-bailout')

duplicateForEmbedding({
    // url for json-version of a tmLanguage
    url: 'https://raw.githubusercontent.com/jeff-hykin/cpp-textmate-grammar/master/syntaxes/cpp.tmLanguage.json',
    appendScope: 'latex',
    bailoutPattern: '\\\\end\\{(?:minted|cppcode)\\}',
    newFileLocation: '../syntax/cpp-grammar-bailout.tmLanguage.json'
})
