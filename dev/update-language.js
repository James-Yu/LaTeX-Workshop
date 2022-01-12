const path = require('path')
const vel = require('vscode-extend-language')

async function main() {
    // The order of the files matters!
    languageFiles = [
        'latex-cpp-embedded-language-configuration.json',
        'markdown-latex-combined-language-configuration.json',
        'latex-language-configuration.json',
        'latex3-language-configuration.json'
    ]
    for (const file of languageFiles) {
        console.log('Expanding', path.join('../syntax', file))
        await vel.expandConfigurationFile(path.join('../syntax/data', file), path.join('../syntax', file))
    }
}

main()
