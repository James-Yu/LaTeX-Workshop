import * as vscode from 'vscode'

import type { Extension } from '../main'
import * as utils from '../utils/utils'
import {PathRegExp} from '../components/managerlib/pathutils'
import type {MatchPath} from '../components/managerlib/pathutils'


export class SectionNodeProvider implements vscode.TreeDataProvider<Section> {

    private readonly _onDidChangeTreeData: vscode.EventEmitter<Section | undefined> = new vscode.EventEmitter<Section | undefined>()
    readonly onDidChangeTreeData: vscode.Event<Section | undefined>
    private readonly showLabels: boolean
    private readonly showFloats: boolean
    private readonly showNumbers: boolean
    public root: string = ''

    // our data source is a set multi-rooted set of trees
    public ds: Section[] = []

    constructor(private readonly extension: Extension) {
        this.onDidChangeTreeData = this._onDidChangeTreeData.event
        const configuration = vscode.workspace.getConfiguration('latex-workshop')

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

        let content = this.extension.manager.getDirtyContent(filePath)
        if (!content) {
            return children
        }
        content = utils.stripCommentsAndVerbatim(content)
        const endPos = content.search(/\\end{document}/gm)
        if (endPos > -1) {
            content = content.substr(0, endPos)
        }

        const structureModel = new StructureModel(this.extension, filePath, rootStack, children, newFileStack, sectionNumber)

        const envNames = this.showFloats ? ['figure', 'frame', 'table'] : ['frame']

        const lines = content.split('\n')
        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            const line = lines[lineNumber]
            // Environment part
            structureModel.buildEnvModel(envNames, lines, lineNumber)

            // Inputs part
            if (imports) {
               const inputFilePath = structureModel.buildImportModel(line)
               if (inputFilePath) {
                    this.buildModel(inputFilePath, newFileStack, rootStack, children, sectionNumber)
                }
            }

            // Headings part
            structureModel.buildHeadingModel(lines, lineNumber, this.showNumbers)


            // Labels part
            if (this.showLabels) {
                structureModel.buildLabelModel(line, lineNumber, filePath)
            }
        }
        this.fixToLines(children)
        return children
    }

    /**
     * Compute the exact ranges of every Section entry
     */
    private fixToLines(sections: Section[]) {
        sections.forEach((entry: Section, index: number) => {
            if (entry.kind !== SectionKind.Section) {
                return
            }
            for (let i = index + 1; i < sections.length; i++) {
                if (sections[i].kind === SectionKind.Section && sections[i].depth <= entry.depth) {
                    entry.toLine = sections[i].lineNumber - 1
                    return
                }
            }
        })
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
}

export enum SectionKind {
    Env = 0,
    Label = 1,
    Section = 2
}

export class Section extends vscode.TreeItem {

    public children: Section[] = []
    public parent: Section | undefined = undefined // The parent of a top level section must be undefined
    public subfiles: string[] = []

    constructor(
        public readonly kind: SectionKind,
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

class StructureModel {
    envStack: {name: string, start: number, end: number}[] = []
    private readonly hierarchy: string[]
    private readonly headerPattern: string
    private readonly sectionDepths = Object.create(null) as { [key: string]: number }
    private sectionNumber: number[]
    private prevSection: Section | undefined = undefined

    constructor(
        private readonly extension: Extension,
        public filePath: string,
        public rootStack: Section[],
        public children: Section[],
        public fileStack: string[],
        sectionNumber: number[] | undefined
    ) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        this.hierarchy = configuration.get('view.outline.sections') as string[]
        this.hierarchy.forEach((section, index) => {
            section.split('|').forEach(sec => {
                this.sectionDepths[sec] = index
            })
        })
        let pattern = '\\\\('
        this.hierarchy.forEach((section, index) => {
            pattern += section
            if (index < this.hierarchy.length - 1) {
                pattern += '|'
            }
        })
        pattern += ')(\\*)?(?:\\[[^\\[\\]\\{\\}]*\\])?{(.*)}'
        this.headerPattern = pattern
        if (sectionNumber) {
            this.sectionNumber = sectionNumber
        } else {
            this.sectionNumber = Array<number>(this.hierarchy.length).fill(0)
        }
    }

    currentRoot(): Section {
        return this.rootStack[this.rootStack.length - 1]
    }

    noRoot(): boolean {
        return this.rootStack.length === 0
    }

    buildEnvModel(envNames: string[], lines: string[], lineNumber: number) {
        const envReg = RegExp(`(?:\\\\(begin|end)(?:\\[[^[\\]]*\\])?){(?:(${envNames.join('|')})\\*?)}`, 'm')
        const line = lines[lineNumber]
        const result = envReg.exec(line)
        if (result && result[1] === 'begin') {
            this.envStack.push({name: result[2], start: lineNumber, end: lineNumber})
        } else if (result && result[2] === this.envStack[this.envStack.length - 1].name) {
            const env = this.envStack.pop()
            if (!env) {
                return
            }
            env.end = lineNumber
            const caption = this.getCaptionOrTitle(lines, env)
            if (!caption) {
                return
            }
            const depth = this.noRoot() ? 0 : this.currentRoot().depth + 1
            const newEnv = new Section(SectionKind.Env, `${env.name.charAt(0).toUpperCase() + env.name.slice(1)}: ${caption}`, vscode.TreeItemCollapsibleState.Expanded, depth, env.start, env.end, this.filePath)
            if (this.noRoot()) {
                this.children.push(newEnv)
            } else {
                this.currentRoot().children.push(newEnv)
            }
        }
    }

    buildImportModel(line: string): string | undefined {
        const pathRegexp = new PathRegExp()
        const matchPath: MatchPath | undefined = pathRegexp.exec(line)
        if (!matchPath) {
            return undefined
        }
        // zoom into this file
        const inputFilePath: string | undefined = pathRegexp.parseInputFilePath(matchPath, this.filePath, this.extension.manager.rootFile ? this.extension.manager.rootFile : this.filePath)
        if (!inputFilePath) {
            this.extension.logger.addLogMessage(`Could not resolve included file ${inputFilePath}`)
            return undefined
        }
        // Avoid circular inclusion
        if (inputFilePath === this.filePath || this.fileStack.includes(inputFilePath)) {
            return undefined
        }
        if (this.prevSection) {
            this.prevSection.subfiles.push(inputFilePath)
        }
        return inputFilePath
    }

    buildLabelModel(line: string, lineNumber: number, filePath: string) {
        const labelReg = /\\label{([^}]*)}/m
        const result = labelReg.exec(line)
        if (!result) {
            return
        }
        const depth = this.noRoot() ? 0 : this.currentRoot().depth + 1
        const newLabel = new Section(SectionKind.Label, `#Label: ${result[1]}`, vscode.TreeItemCollapsibleState.None, depth, lineNumber, lineNumber, filePath)
        if (this.noRoot()) {
            this.children.push(newLabel)
        } else {
            this.currentRoot().children.push(newLabel)
        }
    }

    buildHeadingModel(lines: string[], lineNumber: number, showNumbers: boolean) {
        const line = lines[lineNumber]
        const headerReg = RegExp(this.headerPattern, 'm')
        const result = headerReg.exec(line)
        if (!result) {
            return
        }
        // is it a section, a subsection, etc?
        const heading = result[1]
        const depth = this.sectionDepths[heading]
        const title = this.getSectionTitle(result[3])
        let sectionNumberStr: string = ''
        if (result[2] === undefined) {
            this.sectionNumber = this.increment(this.sectionNumber, depth)
            sectionNumberStr = this.formatSectionNumber(this.sectionNumber, showNumbers)
        }
        const newSection = new Section(SectionKind.Section, sectionNumberStr + title, vscode.TreeItemCollapsibleState.Expanded, depth, lineNumber, lines.length - 1, this.filePath)
        this.prevSection = newSection

        if (this.noRoot()) {
            this.children.push(newSection)
            this.rootStack.push(newSection)
            return
        }

        // Find the proper root section
        while (!this.noRoot() && this.currentRoot().depth >= depth) {
            this.rootStack.pop()
        }
        if (this.noRoot()) {
            newSection.parent = undefined
            this.children.push(newSection)
        } else {
            newSection.parent = this.currentRoot()
            this.currentRoot().children.push(newSection)
        }
        this.rootStack.push(newSection)
    }

    getCaptionOrTitle(lines: string[], env: {name: string, start: number, end: number}) {
        const content = lines.slice(env.start, env.end).join('\n')
        let result: RegExpExecArray | null = null
        if (env.name === 'frame') {
            // Frame titles can be specified as either \begin{frame}{Frame Title}
            // or \begin{frame} \frametitle{Frame Title}
            const frametitleRegex = /\\frametitle(?:<[^<>]*>)?(?:\[[^[\]]*\])?{((?:[^{}]|(?:\{[^{}]*\})|\{[^{}]*\{[^{}]*\}[^{}]*\})+)}/gsm
            // \begin{frame}(whitespace){Title} will set the title as long as the whitespace contains no more than 1 newline
            const beginframeRegex = /\\begin{frame}(?:<[^<>]*>?)?(?:\[[^[\]]*\]){0,2}[\t ]*(?:(?:\r\n|\r|\n)[\t ]*)?{((?:[^{}]|(?:\{[^{}]*\})|\{[^{}]*\{[^{}]*\}[^{}]*\})+)}/gsm

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

    /**
     * Return the title of a command while only keeping the second argument of \texorpdfstring
     * @param text a section command
     */
    getSectionTitle(text: string): string {
        let title = utils.getLongestBalancedString(text)
        let pdfTitle: string = ''
        const regex = /\\texorpdfstring/
        let res: RegExpExecArray | null
        while (true) {
            res = regex.exec(title)
            if (!res) {
                break
            }
            pdfTitle += title.slice(0, res.index)
            title = title.slice(res.index)
            const arg = utils.getNthArgument(title, 2)
            if (!arg) {
                break
            }
            pdfTitle += arg.arg
            // Continue with the remaining text after the second arg
            title = title.slice(arg.index + arg.arg.length + 2) // 2 counts '{' and '}' around arg
        }
        return pdfTitle + title
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

    private formatSectionNumber(sectionNumber: number[], showNumbers: boolean) {
        if (! showNumbers) {
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
}

export class StructureTreeView {
    private readonly _viewer: vscode.TreeView<Section | undefined>
    private readonly _treeDataProvider: SectionNodeProvider
    private _followCursor: boolean = true


    constructor(private readonly extension: Extension) {
        this._treeDataProvider = this.extension.structureProvider
        this._viewer = vscode.window.createTreeView('latex-workshop-structure', { treeDataProvider: this._treeDataProvider, showCollapseAll: true })
        vscode.commands.registerCommand('latex-workshop.structure-toggle-follow-cursor', () => {
           this._followCursor = ! this._followCursor
        })
    }

    private traverseSectionTree(sections: Section[], fileName: string, lineNumber: number): Section | undefined {
        let match: Section | undefined = undefined
        for (const node of sections) {
            if ((node.fileName === fileName && node.lineNumber <= lineNumber && node.toLine >= lineNumber)
                || (node.fileName !== fileName && node.subfiles.includes(fileName))) {
                match = node
                // Look for a more precise surrounding section
                const res = this.traverseSectionTree(node.children, fileName, lineNumber)
                if (res) {
                    match = res
                }
            }
        }
        return match

    }

    showCursorItem(e: vscode.TextEditorSelectionChangeEvent) {
        if (!this._followCursor || !this._viewer.visible) {
            return
        }
        const line = e.selections[0].active.line
        const f = e.textEditor.document.fileName
        const currentNode = this.traverseSectionTree(this._treeDataProvider.ds, f, line)
        if (currentNode) {
            return this._viewer.reveal(currentNode, {select: true})
        }
        return
    }
}
