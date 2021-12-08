const got = require('got')
const fs = require('fs')
const path = require('path')

async function getRequest(url, options) {
    try {
        const response = await got(url, options)
        return response.body
    } catch (e) {
        console.log('Error code:', e.response.statusCode)
        console.log('Error message:', e.response.statusMessage);
    }
    return undefined
}

async function downloadFile(repo, file, version='main') {
    const url = 'https://raw.githubusercontent.com/' + repo + '/' + version + '/' + file
    var res = await getRequest(url)
    if (res === undefined) {
        console.log('Cannot retrieve ', url)
        return
    }
    const content = res.toString('utf-8')
    const syntaxFilePath = '../syntax/' + path.basename(file)
    fs.writeFileSync(syntaxFilePath, content)
    console.log('Updating ', syntaxFilePath)
}

async function getCommitSha(repo, version='main') {
    const lastCommitInfo = 'https://api.github.com/repos/' + repo + '/git/ref/heads/' + version
    var res = await getRequest(lastCommitInfo, {headers: {'User-Agent': 'vscode-latex-basics'}})
    if (res === undefined) {
        console.log('Cannot retrieve last commit sha', lastCommitInfo)
        return
    }
    try {
        const lastCommit = JSON.parse(res.toString('utf-8'))
        const sha = lastCommit.object.sha
        console.log(`Update grammar files to ${repo}@${sha}`)
    } catch(e) {
        console.log('Cannot read last commit information')
    }
}

async function main() {
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

    await getCommitSha(latexBasicsRepo)
    for (const file of grammarFiles) {
        downloadFile(latexBasicsRepo, 'syntaxes/' + file)
    }
}

main()
