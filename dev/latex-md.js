const request = require('sync-request')
const fs = require('fs')

function downloadUrl(url) {
    var res = request("GET", url)
    if (res.statusCode === 200) {
        return res.body.toString("utf-8")
    }
    console.log("Cannot retrieve: ", url)
    console.log("Request status: ", res.statusCode)
    return undefined
}

function insertLaTeXGrammar(url, latexScope, newScopeName, newGrammarFile) {
    const grammar = JSON.parse(downloadUrl(url))
    if(!grammar) {
       return
    }
    grammar["scopeName"] = newScopeName

    const includeLatex = {'include': latexScope}

    // Add latex scope before all patterns
    const patterns = grammar["patterns"]
    if (!patterns) {
        console.log("Cannot find inline rule. Aborting.")
        return
    }
    patterns.splice(0, 0, includeLatex)

    // Add latex scope before all patterns in inline rule
    const inlineRule = grammar["repository"]["inline"]
    if (!inlineRule) {
        console.log("Cannot find inline rule. Aborting.")
        return
    }
    inlineRule.patterns.splice(0, 0, includeLatex)

    fs.writeFileSync(newGrammarFile, JSON.stringify(grammar))
}

insertLaTeXGrammar('https://raw.githubusercontent.com/microsoft/vscode/main/extensions/markdown-basics/syntaxes/markdown.tmLanguage.json',
    'text.tex.latex',
    'text.tex.markdown_latex_combined',
    '../syntax/markdown-latex-combined.tmLanguage.json'
)
