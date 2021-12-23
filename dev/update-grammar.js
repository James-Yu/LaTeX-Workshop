const fs = require('fs')
const path = require('path')
const vel = require('vscode-extend-language')

async function downloadFile(repo, file, version='main') {
    const url = 'https://raw.githubusercontent.com/' + repo + '/' + version + '/' + file
    var content = await vel.download(url)
    if (!content) {
        console.log('Cannot retrieve ', url)
        return
    }
    const syntaxFilePath = '../syntax/' + path.basename(file)
    fs.writeFileSync(syntaxFilePath, content)
    console.log('Updating', syntaxFilePath)
}

async function main() {
    const latexBasicsRepo = 'jlelong/vscode-latex-basics'
    const grammarFiles = [
        'Bibtex.tmLanguage.json',
        'LaTeX.tmLanguage.json',
        'TeX.tmLanguage.json',
        'cpp-grammar-bailout.tmLanguage.json',
        'markdown-latex-combined.tmLanguage.json'
    ]

    const sha = await vel.getCommitSha(latexBasicsRepo)
    if (sha) {
        console.log(`Update grammar files to ${latexBasicsRepo}@${sha}`)
    } else {
        console.log('Cannot read last commit information')
    }
    for (const file of grammarFiles) {
        downloadFile(latexBasicsRepo, 'syntaxes/' + file)
    }
}

main()
