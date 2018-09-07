import * as vscode from 'vscode'
import * as fs from 'fs-extra'
import * as path from 'path'

import {Extension} from '../main'

export class DocSymbolProvider implements vscode.DocumentSymbolProvider {
    extension: Extension

    private hierarchy: string[]
    private sectionDepths: { string?: number } = {}

    constructor(extension: Extension) {
        this.extension = extension
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        this.hierarchy = configuration.get('view.outline.sections') as string[]
        this.hierarchy.forEach((section, index) => {
            section.split('|').forEach(sec => {
                this.sectionDepths[sec] = index
            })
        })
    }

    public provideDocumentSymbols(_document: vscode.TextDocument) : Promise<vscode.SymbolInformation[]> {
        return new Promise((resolve, _reject) => {
            if (this.extension.manager.rootFile) {
                const tree = this.buildTree(this.extension.manager.rootFile)
                if (tree) {
                    const symbols = []
                    this.flattenTree(symbols, tree)
                    resolve(symbols)
                }
            }
            resolve([])
        })
    }

    buildTree(filePath: string, parent: Section | undefined = undefined) {
        if (parent === undefined) {
            const tempLoc = new vscode.Location(vscode.Uri.parse(filePath), new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)))
            parent = new Section('Root', vscode.SymbolKind.File, tempLoc, -1, undefined)
        }

        this.extension.logger.addLogMessage(`Parsing ${filePath} for outline`)
        let content = fs.readFileSync(filePath, 'utf-8')
        content = content.replace(/([^\\]|^)%.*$/gm, '$1') // Strip comments
        const endPos = content.search(/\\end{document}/gm)
        if (endPos > -1) {
            content = content.substr(0, endPos)
        }

        let pattern = '(?:((?:\\\\(?:input|include|subfile|(?:(?:sub)?import\\*?{([^}]*)}))(?:\\[[^\\[\\]\\{\\}]*\\])?){([^}]*)})|((?:\\\\('
        this.hierarchy.forEach((section, index) => {
            pattern += section
            if (index < this.hierarchy.length - 1) {
                pattern += '|'
            }
        })
        pattern += ')(?:\\*)?(?:\\[[^\\[\\]\\{\\}]*\\])?){(.*)}))'

        const inputReg = RegExp(pattern, 'gm')
        let currentParent = parent

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

            if (result[5] in this.sectionDepths) {
                // is it a section, a subsection, etc?
                const heading = result[5]
                const depth = this.sectionDepths[heading]
                const title = getLongestBalancedString(result[6])

                const prevContent = content.substring(0, content.substring(0, result.index).lastIndexOf('\n'))

                // get a  line number
                const lineNumber = (prevContent.match(/\n/g) || []).length + 1

                currentParent.location.range = new vscode.Range(currentParent.location.range.start, new vscode.Position(lineNumber - 1, 65535))
                const range = new vscode.Range(new vscode.Position(lineNumber, 0), new vscode.Position(65535, 0))

                while (currentParent.parent && currentParent.depth >= depth) {
                    currentParent = currentParent.parent
                }
                const newSection = new Section(title, vscode.SymbolKind.Class, new vscode.Location(vscode.Uri.parse(filePath), range), depth, currentParent)
                currentParent.children.push(newSection)
                newSection.name = `${this.addSectionNumber(newSection)} ${title}`
                currentParent = newSection

            } else if (result[1].startsWith('\\input') || result[1].startsWith('\\include') || result[1].startsWith('\\subfile') || result[1].startsWith('\\subimport') || result[1].startsWith('\\import') ) {
                // zoom into this file
                // resolve the path
                let inputFilePath
                if (result[1].startsWith('\\subimport')) {
                    inputFilePath = this.extension.manager.resolveFile([path.dirname(filePath)], path.join(result[2], result[3]))
                } else if (result[1].startsWith('\\import')) {
                    inputFilePath = this.extension.manager.resolveFile([result[2]], result[3])
                } else {
                    inputFilePath = this.extension.manager.resolveFile([path.dirname(filePath), this.extension.manager.rootDir], result[3])
                }

                if (!inputFilePath) {
                    this.extension.logger.addLogMessage(`Could not resolve included file ${filePath}`)
                    continue
                }
                if (path.extname(inputFilePath) === '') {
                    inputFilePath += '.tex'
                }
                if (!fs.existsSync(inputFilePath) && fs.existsSync(inputFilePath + '.tex')) {
                    inputFilePath += '.tex'
                }
                if (fs.existsSync(inputFilePath) === false) {
                    this.extension.logger.addLogMessage(`Could not resolve included file ${inputFilePath}`)
                    //console.log(`Could not resolve included file ${inputFilePath}`)
                    continue
                }

                this.buildTree(inputFilePath, currentParent)
            }
        }
        this.setRange(parent)

        return parent
    }

    setRange(parent: Section | undefined) {
        if (parent === undefined || parent.children.length === 0) {
            return
        }
        parent.location.range = new vscode.Range(parent.location.range.start, parent.children[parent.children.length - 1].location.range.end)
        parent.children.forEach(child => this.setRange(child))
    }

    flattenTree(symbols: vscode.SymbolInformation[], parent: Section) {
        parent.children.forEach(child => {
            symbols.push(child)
            this.flattenTree(symbols, child)
        })
    }

    addSectionNumber(section: Section) {
        let sectionNum = ''
        let currentParent = section
        while (currentParent.parent) {
            const index = currentParent.parent.children.indexOf(currentParent)
            sectionNum = `.${index + 1}` + sectionNum
            currentParent = currentParent.parent
        }
        if (sectionNum.length === 2) {
            sectionNum += '.'
        }
        return sectionNum.substr(1)
    }
}

class Section extends vscode.SymbolInformation {
    constructor(
        name: string, kind: vscode.SymbolKind, location: vscode.Location,
        public readonly depth: number, public parent: Section | undefined, public children: Section[] = []
    ) {
        super(name, kind, (parent ? parent.name : 'root'), location)
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
