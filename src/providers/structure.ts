import * as vscode from 'vscode'
import {bibtexParser} from 'latex-utensils'

import type { Extension } from '../main'
import * as utils from '../utils/utils'
import {PathRegExp} from '../components/managerlib/pathutils'
import type {MatchPath} from '../components/managerlib/pathutils'


export class SectionNodeProvider implements vscode.TreeDataProvider<Section> {

    private readonly _onDidChangeTreeData: vscode.EventEmitter<Section | undefined> = new vscode.EventEmitter<Section | undefined>()
    readonly onDidChangeTreeData: vscode.Event<Section | undefined>
    private readonly commandNames: string[]
    private readonly hierarchy: string[]
    private readonly showFloats: boolean
    private readonly showNumbers: boolean
    public root: string = ''

    // our data source is a set multi-rooted set of trees
    public ds: Section[] = []

    constructor(private readonly extension: Extension) {
        this.onDidChangeTreeData = this._onDidChangeTreeData.event
        const configuration = vscode.workspace.getConfiguration('latex-workshop')

        this.commandNames = configuration.get('view.outline.commands') as string[]
        this.hierarchy = configuration.get('view.outline.sections') as string[]
        this.showFloats = configuration.get('view.outline.floats.enabled') as boolean
        this.showNumbers = configuration.get('view.outline.numbers.enabled') as boolean

    }

    private async refresh(): Promise<Section[]> {
        const document = vscode.window.activeTextEditor?.document
        if (document?.languageId === 'bibtex') {
            await this.buildBibTeXModel()
            return this.ds
        }
        else if (this.extension.manager.rootFile) {
            this.ds = this.buildLaTeXModel(new Set<string>(), this.extension.manager.rootFile)
            return this.ds
        } else {
            return []
        }
    }

    update() {
        this.refresh().finally(() => {this._onDidChangeTreeData.fire(undefined)})
    }

    async buildBibTeXModel() {
        const document = vscode.window.activeTextEditor?.document
        if (!document) {
            return
        }
        const ast = await this.extension.pegParser.parseBibtex(document.getText())

        this.ds = []
        ast.content.forEach(entry => {
            if (!bibtexParser.isEntry(entry)){
                return
            }
            const bibitem = new Section(
                SectionKind.BibItem,
                `${entry.entryType}: ${entry.internalKey}`,
                vscode.TreeItemCollapsibleState.Collapsed,
                0,
                entry.location.start.line,
                entry.location.end.line,
                document.fileName)
            entry.content.forEach(field => {
                const fielditem = new Section(
                    SectionKind.BibField,
                    `${field.name}: ${field.value.content}`,
                    vscode.TreeItemCollapsibleState.None,
                    1,
                    field.location.start.line,
                    field.location.end.line,
                    document.fileName)
                fielditem.parent = bibitem
                bibitem.children.push(fielditem)
            })
            this.ds.push(bibitem)
        })
    }

    /**
     * Compute the TOC of a LaTeX project. To only consider the current file, use `imports=false`
     * @param visitedFiles Set of files already visited. To avoid infinite loops
     * @param filePath The path of the file being parsed
     * @param fileStack The list of files inclusion leading to the current file
     * @param parentStack The list of parent sections
     * @param parentChildren The list of children of the parent Section
     * @param sectionNumber The number of the current section stored in an array with the same length this.hierarchy
     * @param imports Do we parse included files
     */
    buildLaTeXModel(visitedFiles: Set<string>, filePath: string, imports: boolean = true, fileStack?: string[], parentStack?: Section[], parentChildren?: Section[], sectionNumber?: number[]): Section[] {
        if (visitedFiles.has(filePath)) {
            return []
        } else {
            visitedFiles.add(filePath)
        }

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

        if (!sectionNumber) {
            sectionNumber = Array<number>(this.hierarchy.length).fill(0)
        }

        let content = this.extension.manager.getDirtyContent(filePath)
        if (!content) {
            return children
        }
        content = utils.stripCommentsAndVerbatim(content)
        const startPos = content.search(/\\begin{document}/gm)
        const endPos = content.search(/\\end{document}/gm)
        const offset = '\\begin{document}'.length
        content = content.substring(startPos > -1 ? startPos + offset : 0, endPos > -1 ? endPos : undefined)

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
                    this.buildLaTeXModel(visitedFiles, inputFilePath, true, newFileStack, rootStack, children, sectionNumber)
                }
            }

            // Headings part
            structureModel.buildHeadingModel(lines, lineNumber, this.showNumbers)


            // Commands part
            structureModel.buildCommandModel(this.commandNames, line, lineNumber, filePath)
        }
        this.fixToLines(children)
        return children
    }

    /**
     * Compute the exact ranges of every Section entry
     */
    private fixToLines(sections: Section[], parentSection?: Section) {
        sections.forEach((entry: Section, index: number) => {
            if (entry.kind !== SectionKind.Section) {
                return
            }
            // Look for the next section with a smaller or equal depth
            let toLineSet: boolean = false
            for (let i = index + 1; i < sections.length; i++) {
                if (entry.fileName === sections[i].fileName && sections[i].kind === SectionKind.Section && sections[i].depth <= entry.depth) {
                    entry.toLine = sections[i].lineNumber - 1
                    toLineSet = true
                    break
                }
            }
            // If no closing section was found, use the parent section if any
            if (parentSection && !toLineSet && parentSection.fileName === entry.fileName) {
                entry.toLine = parentSection.toLine
            }
            if (entry.children.length > 0) {
                this.fixToLines(entry.children, entry)
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

    getChildren(element?: Section): vscode.ProviderResult<Section[]> {
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
    Section = 2,
    BibItem = 3,
    BibField = 4
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
    private prevSection: Section | undefined = undefined

    constructor(
        private readonly extension: Extension,
        private readonly filePath: string,
        private readonly rootStack: Section[],
        private readonly children: Section[],
        private readonly fileStack: string[],
        private readonly sectionNumber: number[]
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
        // To deal with multiline header, capture the whole line starting from the opening '{'
        // The actual title will be determined later using getLongestBalancedString
        pattern += ')(\\*)?(?:\\[[^\\[\\]\\{\\}]*\\])?{(.*)$'
        this.headerPattern = pattern
    }

    currentRoot(): Section {
        return this.rootStack[this.rootStack.length - 1]
    }

    noRoot(): boolean {
        return this.rootStack.length === 0
    }

    buildEnvModel(envNames: string[], lines: string[], lineNumber: number) {
        const envReg = RegExp(`(?:\\\\(begin|end)(?:\\[[^[\\]]*\\])?){(?:(${envNames.join('|')})\\*?)}`)
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

    buildCommandModel(commandNames: string[], line: string, lineNumber: number, filePath: string) {
        if (commandNames.length === 0) {
            return
        }
        const commandReg = new RegExp('\\\\(' + commandNames.join('|') + '){([^}]*)}')
        const result = commandReg.exec(line)
        if (!result) {
            return
        }
        const depth = this.noRoot() ? 0 : this.currentRoot().depth + 1
        const newCommand = new Section(SectionKind.Label, `#${result[1]}: ${result[2]}`, vscode.TreeItemCollapsibleState.None, depth, lineNumber, lineNumber, filePath)
        if (this.noRoot()) {
            this.children.push(newCommand)
        } else {
            this.currentRoot().children.push(newCommand)
        }
    }

    buildHeadingModel(lines: string[], lineNumber: number, showNumbers: boolean) {
        const line = lines[lineNumber]
        const headerReg = RegExp(this.headerPattern)
        const result = headerReg.exec(line)
        if (!result) {
            return
        }
        // is it a section, a subsection, etc?
        const heading = result[1]
        const depth = this.sectionDepths[heading]
        const title = this.getSectionTitle(result[3] + lines.slice(lineNumber + 1).join('\n'))
        let sectionNumberStr: string = ''
        if (result[2] === undefined) {
            this.incrementSectionNumber(depth)
            sectionNumberStr = this.formatSectionNumber(showNumbers)
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

    private incrementSectionNumber(depth: number) {
        this.sectionNumber[depth] += 1
        this.sectionNumber.forEach((_, index) => {
            if (index > depth) {
                this.sectionNumber[index] = 0
            }
        })
    }

    private formatSectionNumber(showNumbers: boolean) {
        if (! showNumbers) {
            return ''
        }
        let str: string = ''
        this.sectionNumber.forEach((value) => {
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


    constructor(extension: Extension) {
        this._treeDataProvider = new SectionNodeProvider(extension)
        this._viewer = vscode.window.createTreeView('latex-workshop-structure', { treeDataProvider: this._treeDataProvider, showCollapseAll: true })
        vscode.commands.registerCommand('latex-workshop.structure-toggle-follow-cursor', () => {
           this._followCursor = ! this._followCursor
        })
    }

    update() {
        this._treeDataProvider.update()
    }

    getTreeData(): Section[] {
        return this._treeDataProvider.ds
    }

    private traverseSectionTree(sections: Section[], fileName: string, lineNumber: number): Section | undefined {
        let match: Section | undefined = undefined
        for (const node of sections) {
            // lineNumber is zero-based but node line numbers are one-based.
            if ((node.fileName === fileName &&
                 node.lineNumber-1 <= lineNumber && node.toLine-1 >= lineNumber) ||
                (node.fileName !== fileName && node.subfiles.includes(fileName))) {
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
