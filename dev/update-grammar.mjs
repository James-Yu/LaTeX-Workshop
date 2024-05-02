import fs from 'fs'
import path from 'path'
import {download, getCommitSha, expandConfigurationFile} from'vscode-extend-language'

const syntaxDir = './syntax'

/**
 * Download a file from a specific branch on a repo
 * @param {string} repo
 * @param {string} file
 * @param {string} version git branch to pull
 */
async function downloadFile(repo, file, version='main') {
    const url = 'https://raw.githubusercontent.com/' + repo + '/' + version + '/' + file
    var content = await download(url)
    if (!content) {
        console.log('Cannot retrieve ', url)
        return
    }
    const syntaxFilePath = path.join(syntaxDir, path.basename(file))
    fs.writeFileSync(syntaxFilePath, content)
    console.log('Updating', syntaxFilePath)
}

async function updateGrammars() {
    const latexBasicsRepo = 'jlelong/vscode-latex-basics'
    const grammarFiles = [
        'BibTeX-style.tmLanguage.json',
        'Bibtex.tmLanguage.json',
        'DocTeX.tmLanguage.json',
        'JLweave.tmLanguage.json',
        'LaTeX.tmLanguage.json',
        'Pweave.tmLanguage.json',
        'RSweave.tmLanguage.json',
        'TeX.tmLanguage.json',
        'cpp-grammar-bailout.tmLanguage.json',
        'markdown-latex-combined.tmLanguage.json'
    ]

    const sha = await getCommitSha(latexBasicsRepo)
    if (sha) {
        console.log(`Update grammar files to ${latexBasicsRepo}@${sha}`)
    } else {
        console.log('Cannot read last commit information')
    }
    for (const file of grammarFiles) {
        await downloadFile(latexBasicsRepo, 'syntaxes/' + file)
    }

}

async function main() {

    await updateGrammars()
    // The order of the files matters!
    const languageFiles = [
        'latex-language-configuration.json',
        'latex-cpp-embedded-language-configuration.json',
        'markdown-latex-combined-language-configuration.json',
        'latex3-language-configuration.json',
        'bibtex-language-configuration.json',
        'bibtex-style-language-configuration.json',
        'doctex-language-configuration.json'
    ]
    for (const file of languageFiles) {
        console.log('Expanding', path.join(syntaxDir, file))
        await expandConfigurationFile(path.join(syntaxDir, 'src', file), path.join(syntaxDir, file))
    }
}

await main()
