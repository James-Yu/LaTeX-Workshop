import * as vscode from 'vscode'

import {Extension} from '../main'

export class DocSymbolProvider implements vscode.DocumentSymbolProvider {
    extension: Extension

    private sections: string[] = []

    constructor(extension: Extension) {
        this.extension = extension
        const rawSections = vscode.workspace.getConfiguration('latex-workshop').get('view.outline.sections') as string[]
        rawSections.forEach(section => {
            this.sections = this.sections.concat(section.split('|'))
        })
    }

    public provideDocumentSymbols(document: vscode.TextDocument) : Promise<vscode.DocumentSymbol[]> {
        return new Promise((resolve, _reject) => {
            resolve(this.findSymbols(document.getText()))
        })
    }

    findSymbols(content: string) : vscode.DocumentSymbol[] {
        const symbols: vscode.DocumentSymbol[] = []
        content = content.replace(/([^\\]|^)%.*$/gm, '$1') // Strip comments
        const endPos = content.search(/\\end{document}/gm)
        if (endPos > -1) {
            content = content.substr(0, endPos)
        }
        const lastLine = (content.match(/\n/g) || []).length

        let pattern = '(?:((?:\\\\(?:input|include|subfile|(?:(?:sub)?import\\*?{([^}]*)}))(?:\\[[^\\[\\]\\{\\}]*\\])?){([^}]*)})|((?:\\\\('
        pattern += this.sections.join('|')
        pattern += ')(?:\\*)?(?:\\[[^\\[\\]\\{\\}]*\\])?){(.*)}))'

        const inputReg = RegExp(pattern, 'gm')

        // if it's a section elements 5 = section
        // element 6 = title.

        // if it's a subsection:
        // element X = title

        // if it's an input, include, or subfile:
        // element 3 is the file (need to resolve the path)
        // element 0 starts with \input, include, or subfile

        // if it's a subimport
        // element 0 starts with \subimport
        // element 2 is the directory part
        // element 3 is the file

        while (true) {
            const result = inputReg.exec(content)
            if (!result) {
                break
            }

            if (this.sections.indexOf(result[5]) > -1) {
                // is it a section, a subsection, etc?
                const title = getLongestBalancedString(result[6])

                const prevContent = content.substring(0, content.substring(0, result.index).lastIndexOf('\n'))

                // get a  line number
                const lineNumber = (prevContent.match(/\n/g) || []).length + 1

                if (symbols.length > 0) {
                    symbols[symbols.length - 1].range = new vscode.Range(symbols[symbols.length - 1].range.start, new vscode.Position(lineNumber - 1, 65535))
                }
                const range = new vscode.Range(new vscode.Position(lineNumber, 0), new vscode.Position(lastLine, 0))

                symbols.push(new Section(title, range))
            }
            // Skip sub-files
        }
        return symbols
    }
}

class Section extends vscode.DocumentSymbol {
    constructor(
        name: string, range: vscode.Range
    ) {
        super(name, '', vscode.SymbolKind.String, range, range)
    }
}

/**
 * Finding the longest substring containing balanced {...}
 * @param s a string
 */
function getLongestBalancedString(s: string) : string {
    let nested = 1
    let i = 0
    for (i = 0; i < s.length; i++) {
        switch (s[i]) {
            case '{':
                nested++
                break
            case '}':
                nested --
                break
            default:
        }
        if (nested === 0) {
            break
        }
    }
    return s.substring(0, i)
}
