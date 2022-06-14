import * as vscode from 'vscode'
import * as path from 'path'
import {latexParser,bibtexParser} from 'latex-utensils'

import type { Extension } from '../main'
import * as utils from '../utils/utils'

export class SectionNodeProvider implements vscode.TreeDataProvider<Section> {

    private readonly _onDidChangeTreeData: vscode.EventEmitter<Section | undefined> = new vscode.EventEmitter<Section | undefined>()
    readonly onDidChangeTreeData: vscode.Event<Section | undefined>
    public root: string = ''

    // our data source is a set multi-rooted set of trees
    public ds: Section[] = []
    private CachedLaTeXData: Section[] = []
    private CachedBibTeXData: Section[] = []

    constructor(private readonly extension: Extension) {
        this.onDidChangeTreeData = this._onDidChangeTreeData.event
    }

    private getCachedDataRootFileName(sections: Section[]): string | undefined {
        if (sections.length >0) {
            return sections[0].fileName
        }
        return undefined
    }

    /**
     * Return the latex or bibtex structure
     *
     * @param force If `false` and some cached data exists for the corresponding file, use it. If `true`, always recompute the structure from disk
     */
    async build(force: boolean): Promise<Section[]> {
        const document = vscode.window.activeTextEditor?.document
        if (document?.languageId === 'bibtex') {
            if (force || this.getCachedDataRootFileName(this.CachedBibTeXData) !== document.fileName) {
                this.CachedBibTeXData = await this.buildBibTeXModel(document)
            }
            this.ds = this.CachedBibTeXData
        }
        else if (this.extension.manager.rootFile) {
            if (force) {
                this.CachedLaTeXData = await this.buildLaTeXModel()
            }
            this.ds = this.CachedLaTeXData
        } else {
            this.ds = []
        }
        return this.ds
    }

    async update(force: boolean) {
        this.ds = await this.build(force)
        this._onDidChangeTreeData.fire(undefined)
    }

    async buildLaTeXModel(file?: string, subFile = true): Promise<Section[]> {
        file = file ? file : this.extension.manager.rootFile
        if (!file) {
            return []
        }

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const cmds = configuration.get('view.outline.commands') as string[]
        const envs = configuration.get('view.outline.floats.enabled') as boolean ? ['figure', 'frame', 'table'] : ['frame']

        const hierarchy = (configuration.get('view.outline.sections') as string[])
        const depths: {[cmd: string]: number} = {}
        hierarchy.forEach((sec, index) => {
            sec.split('|').forEach(cmd => {
                depths[cmd] = index
            })
        })
        const showHierarchyNumber = subFile ? configuration.get('view.outline.numbers.enabled') as boolean : false

        const filesBuilt = new Set<string>()
        const flatStructure = await this.buildLaTeXSectionFromFile(file, subFile, filesBuilt, {
            cmds, envs, secs: hierarchy.map(sec => sec.split('|')).flat(), depths
        })

        return this.buildLaTeXHierarchy(flatStructure, showHierarchyNumber)
    }

    async buildLaTeXSectionFromFile(file: string, subFile: boolean, filesBuilt: Set<string>, config: {cmds: string[], envs: string[], secs: string[], depths: {[cmd: string]: number}}): Promise<Section[]> {
        if (filesBuilt.has(file)) {
            return []
        }
        filesBuilt.add(file)

        const content = this.extension.manager.getDirtyContent(file)
        if (!content) {
            this.extension.logger.addLogMessage(`Error loading LaTeX during structuring: ${file}.`)
            return []
        }

        const ast = await this.extension.pegParser.parseLatex(content).catch((e) => {
            if (bibtexParser.isSyntaxError(e)) {
                const line = e.location.start.line
                this.extension.logger.addLogMessage(`Error parsing LaTeX during structuring: line ${line} in ${file}.`)
            }
            return
        })
        if (!ast) {
            return []
        }

        let sections: Section[] = []
        for (const node of ast.content) {
            sections = [
                ...sections,
                ...await this.parseLaTeXNode(node, config, file, subFile, filesBuilt)
            ]
        }

        ///////////
        return sections
    }

    async parseLaTeXNode(node: latexParser.Node, config: {cmds: string[], envs: string[], secs: string[], depths: {[cmd: string]: number}}, file: string, subFile: boolean, filesBuilt: Set<string>): Promise<Section[]> {
        let sections: Section[] = []
        if (latexParser.isCommand(node)) {
            if (config.secs.includes(node.name.replace(/\*$/, ''))) {
                // \section{Title}
                const caption = latexParser.stringify(node.args[node.args.length - 1])
                sections.push(new Section(
                    SectionKind.Section,
                    caption.slice(1, caption.length - 1), // {Title} -> Title
                    vscode.TreeItemCollapsibleState.Expanded,
                    config.depths[node.name.replace(/\*$/, '')],
                    node.location.start.line - 1,
                    node.location.end.line - 1,
                    file
                ))
            } else if (config.cmds.includes(node.name.replace(/\*$/, ''))) {
                // \notlabel{Show}{ShowAlso}
                const caption = node.args.map(arg => {
                    const argContent = latexParser.stringify(arg)
                    return argContent.slice(1, argContent.length - 1)
                }).join(', ')
                sections.push(new Section(
                    SectionKind.Label,
                    `#${node.name}: ${caption}`,
                    vscode.TreeItemCollapsibleState.Expanded,
                    -1,
                    node.location.start.line - 1,
                    node.location.end.line - 1,
                    file
                ))
            } else {
                // Check if this command is a subfile one
                sections = [
                    ...sections,
                    ...await this.parseLaTeXSubFileCommand(node, config, file, subFile, filesBuilt)
                ]
            }
        } else if (latexParser.isLabelCommand(node) && node.name === 'label') {
            // \label{this:is_a-label}
            sections.push(new Section(
                SectionKind.Label,
                `#${node.label}`,
                vscode.TreeItemCollapsibleState.Expanded,
                -1,
                node.location.start.line - 1,
                node.location.end.line - 1,
                file
            ))
        } else if (latexParser.isEnvironment(node) && config.envs.includes(node.name.replace(/\*$/, ''))) {
            // \begin{figure}...\end{figure}
            sections.push(new Section(
                SectionKind.Env,
                `${node.name.charAt(0).toUpperCase() + node.name.slice(1)}: ${this.findEnvCaption(node)}`,
                vscode.TreeItemCollapsibleState.Expanded,
                -1,
                node.location.start.line - 1,
                node.location.end.line - 1,
                file
            ))
        }
        if (latexParser.hasContentArray(node)) {
            for (const subNode of node.content) {
                sections = [
                    ...sections,
                    ...await this.parseLaTeXNode(subNode, config, file, subFile, filesBuilt)
                ]
            }
        }
        return sections
    }

    async parseLaTeXSubFileCommand(node: latexParser.Command, config: {cmds: string[], envs: string[], secs: string[], depths: {[cmd: string]: number}}, file: string, subFile: boolean, filesBuilt: Set<string>): Promise<Section[]> {
        const cmdArgs: string[] = []
        node.args.forEach((arg) => {
            if (latexParser.isOptionalArg(arg)) {
                return
            }
            const argContent = arg.content[0]
            if (latexParser.isTextString(argContent)) {
                cmdArgs.push(argContent.content)
            }
        })

        const texDirs = vscode.workspace.getConfiguration('latex-workshop').get('latex.texDirs') as string[]

        let candidate: string | undefined
        // \input{sub.tex}
        if (['input', 'InputIfFileExists', 'include', 'SweaveInput',
             'subfile', 'loadglsentries'].includes(node.name.replace(/\*$/, ''))) {
            candidate = utils.resolveFile(
                [path.dirname(file),
                 path.dirname(this.extension.manager.rootFile || ''),
                 ...texDirs],
                cmdArgs[0])
        }
        // \import{sections/}{section1.tex}
        if (['import', 'inputfrom', 'includefrom'].includes(node.name.replace(/\*$/, ''))) {
            candidate = utils.resolveFile(
                [cmdArgs[0],
                 path.join(
                    path.dirname(this.extension.manager.rootFile || ''),
                    cmdArgs[0])],
                cmdArgs[1])
        }
        // \subimport{01-IntroDir/}{01-Intro.tex}
        if (['subimport', 'subinputfrom', 'subincludefrom'].includes(node.name.replace(/\*$/, ''))) {
            candidate = utils.resolveFile(
                [path.dirname(file)],
                path.join(cmdArgs[0], cmdArgs[1]))
        }

        return candidate ? this.buildLaTeXSectionFromFile(candidate, subFile, filesBuilt, config) : []
    }

    private findEnvCaption(node: latexParser.Environment): string {
        if (node.name.replace(/\*$/, '') === 'frame') {
            // Frame titles can be specified as either \begin{frame}{Frame Title}
            // or \begin{frame} \frametitle{Frame Title}
            // \begin{frame}(whitespace){Title} will set the title as long as the whitespace contains no more than 1 newline
            // \frametitle can override title set in \begin{frame}{<title>} so we check that first

            // \begin{frame} \frametitle{Frame Title}
            let caption: string = 'Untitled Frame'
            const captionNodes = node.content.filter(subNode => latexParser.isCommand(subNode) && subNode.name.replace(/\*$/, '') === 'frametitle')
            if (captionNodes.length > 0 && latexParser.hasArgsArray(captionNodes[0])) {
                caption = latexParser.stringify(captionNodes[0].args[0])
                caption = caption.slice(1, caption.length - 1)
            }
            // \begin{frame}(whitespace){Title}
            else if (node.args.length > 0) {
                const captionNode = node.args[0].content[0]
                if (latexParser.isTextString(captionNode)) {
                    caption = captionNode.content
                }
            }
            return caption
        } else if (node.name.replace(/\*$/, '') === 'figure' || node.name.replace(/\*$/, '') === 'table') {
            // \begin{figure} \caption{Figure Title}
            let caption: string = 'Untitled'
            const captionNodes = node.content.filter(subNode => latexParser.isCommand(subNode) && subNode.name.replace(/\*$/, '') === 'caption')
            if (captionNodes.length > 0 && latexParser.hasArgsArray(captionNodes[0])) {
                caption = latexParser.stringify(captionNodes[0].args[0])
                return caption.slice(1, caption.length - 1)
            }
            return caption
        }
        return 'Untitled'
    }

    private buildLaTeXHierarchy(flatStructure: Section[], showHierarchyNumber: boolean): Section[] {
        if (flatStructure.length === 0) {
            return []
        }

        const preambleNodes: Section[] = []
        const flatSections: Section[] = []

        const lowest = flatStructure.filter(node => node.depth > -1).map(section => section.depth).reduce((min, cur) => Math.min(min, cur))

        let counter: number[] = []
        flatStructure.forEach(node => {
            if (node.depth === -1) {
                // non-section node
                if (flatSections.length === 0) {
                    // no section appeared yet
                    preambleNodes.push(node)
                } else {
                    flatSections[flatSections.length - 1].children.push(node)
                }
            } else {
                if (showHierarchyNumber) {
                    const depth = node.depth - lowest
                    if (depth + 1 > counter.length) {
                        counter = [...counter, ...new Array(depth + 1 - counter.length).fill(0) as number[]]
                    } else {
                        counter = counter.slice(0, depth + 1)
                    }
                    counter[counter.length - 1] += 1
                    node.label = `${counter.join('.')} ${node.label}`
                }
                flatSections.push(node)
            }
        })

        const sections: Section[] = preambleNodes

        flatSections.forEach(section => {
            if (section.depth - lowest === 0) {
                // base level section
                sections.push(section)
            } else if (sections.length === 0) {
                // non-base level section, no previous sections available, create one
                sections.push(section)
            } else {
                let currentSection = sections[sections.length - 1]
                while (currentSection.depth < section.depth - 1) {
                    const children = currentSection.children.filter(candidate => candidate.depth > -1)
                    if (children.length > 0) {
                        // If there is a section child
                        currentSection = children[children.length - 1]
                    } else {
                        break
                    }
                }
                currentSection.children.push(section)
            }
        })

        return sections
    }

    async buildBibTeXModel(document: vscode.TextDocument): Promise<Section[]> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(document.fileName))
        if (document.getText().length >= (configuration.get('bibtex.maxFileSize') as number) * 1024 * 1024) {
            this.extension.logger.addLogMessage(`Bib file is too large, ignoring it: ${document.fileName}`)
            return []
        }
        const ast = await this.extension.pegParser.parseBibtex(document.getText()).catch((e) => {
            if (bibtexParser.isSyntaxError(e)) {
                const line = e.location.start.line
                this.extension.logger.addLogMessage(`Error parsing BibTeX: line ${line} in ${document.fileName}.`)
            }
            return
        })

        const ds: Section[] = []
        ast?.content.filter(bibtexParser.isEntry)
            .forEach(entry => {
                const bibitem = new Section(
                    SectionKind.BibItem,
                    `${entry.entryType}: ${entry.internalKey}`,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    0,
                    entry.location.start.line - 1, // ast line numbers start at 1
                    entry.location.end.line - 1,
                    document.fileName)
                entry.content.forEach(field => {
                    const fielditem = new Section(
                        SectionKind.BibField,
                        `${field.name}: ${field.value.content}`,
                        vscode.TreeItemCollapsibleState.None,
                        1,
                        field.location.start.line -1,
                        field.location.end.line- 1,
                        document.fileName)
                    fielditem.parent = bibitem
                    bibitem.children.push(fielditem)
                })
                ds.push(bibitem)
            })
        return ds
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
            return this.build(false)
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
        public label: string,
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
    private readonly extension: Extension
    private readonly _viewer: vscode.TreeView<Section | undefined>
    private readonly _treeDataProvider: SectionNodeProvider
    private _followCursor: boolean = true


    constructor(extension: Extension) {
        this.extension = extension
        this._treeDataProvider = new SectionNodeProvider(extension)
        this._viewer = vscode.window.createTreeView('latex-workshop-structure', { treeDataProvider: this._treeDataProvider, showCollapseAll: true })
        vscode.commands.registerCommand('latex-workshop.structure-toggle-follow-cursor', () => {
           this._followCursor = ! this._followCursor
        })

        vscode.workspace.onDidSaveTextDocument( (e: vscode.TextDocument) => {
            if (extension.manager.hasBibtexId(e.languageId)) {
                void extension.structureViewer.computeTreeStructure()
            }
        })

        vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor | undefined) => {
            if (e && extension.manager.hasBibtexId(e.document.languageId)) {
                void extension.structureViewer.refreshView()
            }
        })

        this.extension.eventBus.onDidUpdateCachedContent(() => {
            void this.computeTreeStructure()
        })

        this.extension.eventBus.onDidChangeRootFile(() => {
            void this.computeTreeStructure()
        })

        this.extension.eventBus.onDidEndFindRootFile(() => {
            void this.refreshView()
        })
    }

    /**
     * Recompute the whole structure from file and update the view
     */
    async computeTreeStructure() {
        await this._treeDataProvider.update(true)
    }

    /**
     * Refresh the view using cache
     */
    async refreshView() {
        await this._treeDataProvider.update(false)
    }

    getTreeData(): Section[] {
        return this._treeDataProvider.ds
    }

    private traverseSectionTree(sections: Section[], fileName: string, lineNumber: number): Section | undefined {
        let match: Section | undefined = undefined
        for (const node of sections) {
            if ((node.fileName === fileName &&
                 node.lineNumber <= lineNumber && node.toLine >= lineNumber) ||
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
