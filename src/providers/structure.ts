import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

import type { Extension } from '../main'
import * as utils from '../utils/utils'


export class SectionNodeProvider implements vscode.TreeDataProvider<Section> {

    private readonly _onDidChangeTreeData: vscode.EventEmitter<Section | undefined> = new vscode.EventEmitter<Section | undefined>()
    readonly onDidChangeTreeData: vscode.Event<Section | undefined>
    private readonly hierarchy: string[]
    private readonly sectionDepths: { [key: string]: number } = {}
    private readonly showLabels: boolean
    private readonly showFloats: boolean
    private readonly showNumbers: boolean
    public root: string = ''

    // our data source is a set multi-rooted set of trees
    public ds: Section[] = []

    constructor(private readonly extension: Extension) {
        this.onDidChangeTreeData = this._onDidChangeTreeData.event
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        this.hierarchy = configuration.get('view.outline.sections') as string[]
        this.hierarchy.forEach((section, index) => {
            section.split('|').forEach(sec => {
                this.sectionDepths[sec] = index
            })
        })
        this.showLabels = configuration.get('view.outline.labels.enabled') as boolean
        this.showFloats = configuration.get('view.outline.floats.enabled') as boolean
        this.showNumbers = configuration.get('view.outline.numbers.enabled') as boolean
    }

    refresh(): Section[] {
        if (this.extension.manager.rootFile) {
            this.ds = this.buildModel(this.extension.manager.rootFile)
            return this.ds
        } else {
            return []
        }
    }

    update() {
        this._onDidChangeTreeData.fire(undefined)
    }

    buildModel(filePath: string, fileStack?: string[], parentStack?: Section[], parentChildren?: Section[], sectionNumber?: number[], imports: boolean = true): Section[] {

        let rootStack: Section[] = []
        if (parentStack) {
            rootStack = parentStack
        }

        let children: Section[] = []
        if (parentChildren) {
            children = parentChildren
        }

        let newFileStack: string[] = []
        if (fileStack) {
            newFileStack = fileStack
        }
        newFileStack.push(filePath)

        if (! sectionNumber) {
            sectionNumber = Array(this.hierarchy.length).fill(0)
        }

        let prevSection: Section | undefined = undefined

        const envStack: {name: string, start: number, end: number}[] = []

        const currentRoot = () => {
            return rootStack[rootStack.length - 1]
        }
        const noRoot = () => {
            return rootStack.length === 0
        }

        let content = fs.readFileSync(filePath, 'utf-8')
        content = utils.stripCommentsAndVerbatim(content)
        const endPos = content.search(/\\end{document}/gm)
        if (endPos > -1) {
            content = content.substr(0, endPos)
        }

        let pattern = '(?:((?:\\\\(?:input|InputIfFileExists|include|subfile|(?:(?:sub)?import\\*?{([^}]*)}))(?:\\[[^\\[\\]\\{\\}]*\\])?){([^}]*)})|((?:\\\\('
        this.hierarchy.forEach((section, index) => {
            pattern += section
            if (index < this.hierarchy.length - 1) {
                pattern += '|'
            }
        })
        pattern += ')(?:\\*)?(?:\\[[^\\[\\]\\{\\}]*\\])?){(.*)}))'

        // const inputReg = /^((?:\\(?:input|include|subfile)(?:\[[^\[\]\{\}]*\])?){([^}]*)})|^((?:\\((sub)?section)(?:\[[^\[\]\{\}]*\])?){([^}]*)})/gm
        const inputReg = RegExp(pattern, 'm')
        const envNames = this.showFloats ? ['figure', 'frame', 'table'] : ['frame']
        const envReg = RegExp(`(?:\\\\(begin|end)(?:\\[[^[\\]]*\\])?){(?:(${envNames.join('|')})\\*?)}`, 'm')
        const labelReg = /\\label{([^}]*)}/m

        const lines = content.split('\n')
        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            const line = lines[lineNumber]
            envReg.lastIndex = 0
            labelReg.lastIndex = 0
            inputReg.lastIndex = 0
            let result = envReg.exec(line)
            if (result && result[1] === 'begin') {
                envStack.push({name: result[2], start: lineNumber, end: lineNumber})
                continue
            } else if (result && result[2] === envStack[envStack.length - 1].name) {
                const env = envStack.pop()
                if (!env) {
                    continue
                }
                env.end = lineNumber
                const caption = this.getCaptionOrTitle(lines, env)
                if (!caption) {
                    continue
                }
                const depth = noRoot() ? 0 : currentRoot().depth + 1
                sectionNumber = this.increment(sectionNumber, depth)
                const newEnv = new Section(this.formatSectionNumber(sectionNumber) + `${env.name.charAt(0).toUpperCase() + env.name.slice(1)}: ${caption}`, vscode.TreeItemCollapsibleState.Expanded, depth, env.start, env.end, filePath)
                if (noRoot()) {
                    children.push(newEnv)
                } else {
                    currentRoot().children.push(newEnv)
                }
                continue
            }

            result = inputReg.exec(line)

            // if it's a section elements 5 = section
            // element 6 = title.

            // if it's a subsection:
            // element X = title

            // if it's an input, include, or subfile:
            // element 3 is the file (need to resolve the path)
            // element 1 starts with \input, include, or subfile

            // if it's a subimport or an import
            // element 1 starts with \subimport or \import
            // element 2 is the directory part
            // element 3 is the file
            if (result && result[5] in this.sectionDepths) {
                // is it a section, a subsection, etc?
                const heading = result[5]
                const depth = this.sectionDepths[heading]
                const title = utils.getLongestBalancedString(result[6])

                sectionNumber = this.increment(sectionNumber, depth)
                const newSection = new Section(this.formatSectionNumber(sectionNumber) + title, vscode.TreeItemCollapsibleState.Expanded, depth, lineNumber, lines.length - 1, filePath)
                if (prevSection) {
                    prevSection.toLine = lineNumber - 1
                }
                prevSection = newSection

                if (noRoot()) {
                    children.push(newSection)
                    rootStack.push(newSection)
                    continue
                }

                // Find the proper root section
                while (!noRoot() && currentRoot().depth >= depth) {
                    rootStack.pop()
                }
                if (noRoot()) {
                    newSection.parent = undefined
                    children.push(newSection)
                } else {
                    newSection.parent = currentRoot()
                    currentRoot().children.push(newSection)
                }
                rootStack.push(newSection)

            } else if (imports && result && (result[1].startsWith('\\input') || result[1].startsWith('\\InputIfFileExists') || result[1].startsWith('\\include') || result[1].startsWith('\\subfile') || result[1].startsWith('\\subimport') || result[1].startsWith('\\import') )) {
                // zoom into this file
                // resolve the path
                let inputFilePath: string | undefined
                if (result[1].startsWith('\\subimport')) {
                    inputFilePath = utils.resolveFile([path.dirname(filePath)], path.join(result[2], result[3]))
                } else if (result[1].startsWith('\\import')) {
                    inputFilePath = utils.resolveFile([result[2]], result[3])
                } else {
                    const configuration = vscode.workspace.getConfiguration('latex-workshop')
                    const texDirs = configuration.get('latex.texDirs') as string[]
                    inputFilePath = utils.resolveFile([...texDirs, path.dirname(filePath),
                        this.extension.manager.rootDir ? this.extension.manager.rootDir : '.'], result[3])
                }

                if (!inputFilePath) {
                    this.extension.logger.addLogMessage(`Could not resolve included file ${inputFilePath}`)
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
                    continue
                }
                // Avoid circular inclusion
                if (inputFilePath === filePath || newFileStack.includes(inputFilePath)) {
                    continue
                }
                if (prevSection) {
                    prevSection.subfiles.push(inputFilePath)
                }
                this.buildModel(inputFilePath, newFileStack, rootStack, children, sectionNumber)
            }

            // Labels part
            if (this.showLabels) {
                result = labelReg.exec(line)
                if (result) {
                    const depth = noRoot() ? 0 : currentRoot().depth + 1
                    const newLabel = new Section(`#Label: ${result[1]}`, vscode.TreeItemCollapsibleState.None, depth, lineNumber, lineNumber, filePath)
                    if (noRoot()) {
                        children.push(newLabel)
                    } else {
                        currentRoot().children.push(newLabel)
                    }
                }
            }
        }
        return children
    }

    private increment(sectionNumber: number[], depth: number): number[] {
        sectionNumber[depth] += 1
        sectionNumber.forEach((_, index) => {
            if (index > depth) {
                sectionNumber[index] = 0
            }
        })
        return sectionNumber
    }

    private formatSectionNumber(sectionNumber: number[]) {
        if (! this.showNumbers) {
            return ''
        }
        let str: string = ''
        sectionNumber.forEach((value) => {
            if (str === '' && value === 0) {
                return
            }
            if (str !== '') {
                str += '.'
            }
            str += value.toString()
        })
        return str.replace(/(\.0)*$/, '') + ' '
    }

    getTreeItem(element: Section): vscode.TreeItem {

        const hasChildren = element.children.length > 0
        const treeItem: vscode.TreeItem = new vscode.TreeItem(element.label, hasChildren ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None)

        treeItem.command = {
            command: 'latex-workshop.goto-section',
            title: '',
            arguments: [element.fileName, element.lineNumber]
        }

        treeItem.tooltip = `Line ${element.lineNumber + 1} at ${element.fileName}`

        return treeItem
    }

    getChildren(element?: Section): Section[] {
        if (this.extension.manager.rootFile === undefined) {
            return []
        }
        // if the root doesn't exist, we need
        // to explicitly build the model from disk
        if (!element) {
            return this.refresh()
        }

        return element.children
    }

    getParent(element?: Section): Section | undefined {
        if (this.extension.manager.rootFile === undefined || !element) {
            return undefined
        }
        return element.parent
    }

    getCaptionOrTitle(lines: string[], env: {name: string, start: number, end: number}) {
        const content = lines.slice(env.start, env.end).join('\n')
        let result: RegExpExecArray | null = null
        if (env.name === 'frame') {
            // Frame titles can be specified as either \begin{frame}{Frame Title}
            // or \begin{frame} \frametitle{Frame Title}
            const frametitleRegex = /\\frametitle(?:<[^<>]*>)?(?:\[[^[\]]*\])?{((?:(?:[^{}])|(?:\{[^{}]*\}))+)}/gsm
            // \begin{frame}(whitespace){Title} will set the title as long as the whitespace contains no more than 1 newline
            const beginframeRegex = /\\begin{frame}(?:<[^<>]*>?)?(?:\[[^[\]]*\]){0,2}[\t ]*(?:(?:\r\n|\r|\n)[\t ]*)?{([^{}]*)}/gsm

            // \frametitle can override title set in \begin{frame}{<title>} so we check that first
            result = frametitleRegex.exec(content)
            if (!result) {
                result = beginframeRegex.exec(content)
            }
        } else {
            const captionRegex = /(?:\\caption(?:\[[^[\]]*\])?){((?:(?:[^{}])|(?:\{[^{}]*\}))+)}/gsm
            let captionResult: RegExpExecArray | null
            // Take the last caption entry to deal with subfigures.
            // This works most of the time but not always. A definitive solution should use AST
            while ((captionResult = captionRegex.exec(content))) {
                result = captionResult
            }
        }

        if (result) {
            // Remove indentation, newlines and the final '.'
            return result[1].replace(/^ */gm, ' ').replace(/\r|\n/g, '').replace(/\.$/, '')
        }
        return undefined
    }
}

export class Section extends vscode.TreeItem {

    public children: Section[] = []
    public parent: Section | undefined = undefined // The parent of a top level section must be undefined
    public subfiles: string[] = []

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly depth: number,
        public readonly lineNumber: number,
        public toLine: number,
        public readonly fileName: string,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState)
    }
}

export class StructureTreeView {
    private readonly _viewer: vscode.TreeView<Section | undefined>
    private readonly _treeDataProvider: SectionNodeProvider
    private _followCursor: boolean = true


    constructor(private readonly extension: Extension) {
        this._treeDataProvider = this.extension.structureProvider
        this._viewer = vscode.window.createTreeView('latex-structure', { treeDataProvider: this._treeDataProvider })
        vscode.commands.registerCommand('latex-structure.toggle-follow-cursor', () => {
           this._followCursor = ! this._followCursor
        })
    }

    private traverseSectionTree(sections: Section[], fileName: string, lineNumber: number): Section | undefined {
        for (const node of sections) {
            if (node.fileName !== fileName) {
                continue
            }
            if (node.lineNumber <= lineNumber && node.toLine >= lineNumber) {
                return node
            }
            if (node.subfiles.length > 0 && node.subfiles.includes(fileName)) {
                return node
            }
            const res = this.traverseSectionTree(node.children, fileName, lineNumber)
            if (res) {
                return res
            }
        }
        return undefined

    }

    showCursorIteme(e: vscode.TextEditorSelectionChangeEvent) {
        if (!this._followCursor || !this._viewer.visible) {
            return
        }
        const line = e.selections[0].active.line
        const f = e.textEditor.document.fileName
        const currentNode = this.traverseSectionTree(this._treeDataProvider.ds, f, line)
        if (currentNode) {
            this._viewer.reveal(currentNode, {select: true})
        }
    }
}
