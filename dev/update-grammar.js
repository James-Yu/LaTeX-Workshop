const request = require('sync-request')
const fs = require('fs')
const path = require('path')

function downloadFile(repo, file, version='master') {
    const url = 'https://raw.githubusercontent.com/' + repo + '/' + version + '/' + file
    var res = request('GET', url)
    if (res.statusCode !== 200) {
        console.log('Cannot retrieve ', url)
        console.log('Request status: ', res.statusCode)
        return
    }
    const content = res.body.toString('utf-8')
    const syntaxFilePath = '../syntax/' + path.basename(file)
    fs.writeFileSync(syntaxFilePath, content)
    console.log('Updating ', syntaxFilePath)
}

const latexBasicsRepo = 'jlelong/vscode-latex-basics'
const grammarFiles = [
    'BibTeX-style.tmLanguage.json',
    'Bibtex.tmLanguage.json',
    'DocTeX.tmLanguage.json',
    'JLweave.tmLanguage.json',
    'LaTeX-Expl3.tmLanguage.json',
    'LaTeX.tmLanguage.json',
    'RSweave.tmLanguage.json',
    'TeX.tmLanguage.json',
    'cpp-grammar-bailout.tmLanguage.json',
    'markdown-latex-combined.tmLanguage.json'
]
for (const file of grammarFiles) {
    downloadFile(latexBasicsRepo, 'syntaxes/' + file)
}
