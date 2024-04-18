const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

const syntaxDir = path.join(__dirname, '..', 'syntax')

/**
 * Convert an input yaml file to a json output file
 * @param {string} inputfile a yaml file name
 * @param {string} outputfile a json file name
 */
function convertYamlToJson(inputfile, outputfile) {
    try {
        const grammar = yaml.load(fs.readFileSync(inputfile, {encoding: 'utf-8'}))
        fs.writeFileSync(outputfile, JSON.stringify(grammar, undefined, 4))
    } catch (error) {
        console.log(error)
    }
}

async function main() {
    const grammarSrcFiles = [
        'src/BibTeX-style.tmLanguage.yaml',
        'src/DocTeX.tmLanguage.yaml',
        'src/JLweave.tmLanguage.yaml',
        'src/LaTeX-Expl3.tmLanguage.yaml',
        'src/Pweave.tmLanguage.yaml',
        'src/RSweave.tmLanguage.yaml'
    ]
    for (const file of grammarSrcFiles) {
        const baseFile = path.basename(file, '.yaml')
        console.log(`Generating ${baseFile} from src/`)
        convertYamlToJson(path.join(syntaxDir, file), path.join(syntaxDir, baseFile + '.json'))
    }
}

main()
