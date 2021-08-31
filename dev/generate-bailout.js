const duplicateForEmbedding = require('textmate-bailout')
const request = require('sync-request')
const fs = require('fs')

duplicateForEmbedding({
    // url for json-version of a tmLanguage
    url: 'https://raw.githubusercontent.com/jeff-hykin/cpp-textmate-grammar/master/syntaxes/cpp.tmLanguage.json',
    appendScope: 'latex',
    bailoutPattern: '\\\\end\\{(?:minted|cppcode)\\}',
    newFileLocation: '../syntax/cpp-grammar-bailout.tmLanguage.json'
})

const cppSyntaxUrl = 'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/cpp/language-configuration.json'
const cppEmbeddedSyntaxFile = '../syntax/latex-cpp-embedded-language-configuration.json'
const res = request('GET', cppSyntaxUrl)
if (res.statusCode === 200) {
    fs.writeFileSync(cppEmbeddedSyntaxFile, res.body.toString('utf-8'))
}
