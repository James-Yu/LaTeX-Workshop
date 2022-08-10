import * as vscode from 'vscode'
import * as path from 'path'
import { latexParser,bibtexParser } from 'latex-utensils'

import type { Extension } from '../main'
import { resolveFile, stripText } from '../utils/utils'
import { InputFileRegExp } from '../utils/inputfilepath'
import type { LoggerLocator, ManagerLocator, UtensilsParserLocator } from '../interfaces'

interface IExtension extends
    LoggerLocator,
    ManagerLocator,
    UtensilsParserLocator { }

export class SectionNodeProvider implements vscode.TreeDataProvider<Section> {

    private readonly _onDidChangeTreeData: vscode.EventEmitter<Section | undefined> = new vscode.EventEmitter<Section | undefined>()
    readonly onDidChangeTreeData: vscode.Event<Section | undefined>
    public root: string = ''

    // our data source is a set multi-rooted set of trees
    public ds: Section[] = []
    private CachedLaTeXData: Section[] = []
    private CachedBibTeXData: Section[] = []

    // The LaTeX commands to be extracted.
    private readonly LaTeXCommands: {cmds: string[], envs: string[], secs: string[]}
    // The correspondance of section types and depths. Start from zero is
    // the top-most section (e.g., chapter). -1 is reserved for non-section
    // commands.
    private readonly LaTeXSectionDepths: {[cmd: string]: number} = {}
    private readonly LaTeXSectionNumber: boolean

    constructor(private readonly extension: IExtension) {
        this.onDidChangeTreeData = this._onDidChangeTreeData.event

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const cmds = configuration.get('view.outline.commands') as string[]
        const envs = configuration.get('view.outline.floats.enabled') as boolean ? ['figure', 'frame', 'table'] : ['frame']

        const hierarchy = (configuration.get('view.outline.sections') as string[])
        hierarchy.forEach((sec, index) => {
            sec.split('|').forEach(cmd => {
                this.LaTeXSectionDepths[cmd] = index
            })
        })
        this.LaTeXSectionNumber = configuration.get('view.outline.numbers.enabled') as boolean

        this.LaTeXCommands = {cmds, envs, secs: hierarchy.map(sec => sec.split('|')).flat()}

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

    /**
     * This function parses the AST tree of a LaTeX document to build its
     * structure. This is a two-step process. In the first step, all AST nodes
     * are traversed and filtered to build an array of sections that will appear
     * in the vscode view, but without any hierarchy. Then in the second step,
     * the hierarchy is constructed based on the config `view.outline.sections`.
     *
     * @param file The base file to start building the structure. If left
     * `undefined`, the current `rootFile` is used, i.e., build the structure
     * for the whole document/project.
     * @param subFile Whether subfiles should be included in the structure.
     * Default is `true`. If true, all input/subfile/subimport-like commands
     * will be parsed.
     * @returns An array of {@link Section} to be shown in vscode view.
     */
    async buildLaTeXModel(file?: string, subFile = true): Promise<Section[]> {
        file = file ? file : this.extension.manager.rootFile
        if (!file) {
            return []
        }
        // To avoid looping import, this variable is used to store file paths
        // that have been parsed.
        const filesBuilt = new Set<string>()

        // Step 1: Create a flat array of sections.
        const flatStructure = await this.buildLaTeXSectionFromFile(file, subFile, filesBuilt)

        // Step 2: Create the hierarchy of these sections.
        const structure = this.buildLaTeXHierarchy(flatStructure, subFile ? this.LaTeXSectionNumber : false)

        // Step 3: Determine the toLine of all sections.
        this.buildLaTeXSectionToLine(structure, Number.MAX_SAFE_INTEGER)

        return structure
    }

    /**
     * This function, different from {@link buildLaTeXModel}, focus on building
     * the structure of one particular file. Thus, recursive call is made upon
     * subfiles.
     *
     * @param file The LaTeX file whose AST is to be parsed.
     * @param subFile Whether the subfile-like commands should be considered.
     * @param filesBuilt The files that have already been parsed.
     * @returns A flat array of {@link Section} of this file.
     */
    private async buildLaTeXSectionFromFile(file: string, subFile: boolean, filesBuilt: Set<string>): Promise<Section[]> {
        // Skip if the file has already been parsed. This is to avoid indefinite
        // loop under the case that A imports B and B imports back A.
        if (filesBuilt.has(file)) {
            return []
        }
        filesBuilt.add(file)

        // `getDirtyContent` is used here. I did not check if this is
        // appropriate.
        const content = this.extension.manager.getDirtyContent(file)
        if (!content) {
            this.extension.logger.addLogMessage(`Error loading LaTeX during structuring: ${file}.`)
            return []
        }

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const fastparse = configuration.get('view.outline.fastparse.enabled') as boolean

        // Use `latex-utensils` to generate the AST.
        const ast = await this.extension.pegParser.parseLatex(fastparse ? stripText(content) : content).catch((e) => {
            if (latexParser.isSyntaxError(e)) {
                const line = e.location.start.line
                this.extension.logger.addLogMessage(`Error parsing LaTeX during structuring: line ${line} in ${file}.`)
            }
            return
        })
        if (!ast) {
            return []
        }

        // Get a list of rnw child chunks
        const rnwChildren = subFile ? this.parseRnwChildCommand(content, file, this.extension.manager.rootFile || '') : []
        let rnwChild = rnwChildren.shift()

        // Parse each base-level node. If the node has contents, that function
        // will be called recursively.
        let sections: Section[] = []
        for (const node of ast.content) {
            while (rnwChild && node.location && rnwChild.line <= node.location.start.line) {
                sections = [
                    ...sections,
                    ...await this.buildLaTeXSectionFromFile(rnwChild.subFile, subFile, filesBuilt)
                ]
                rnwChild = rnwChildren.shift()
            }
            sections = [
                ...sections,
                ...await this.parseLaTeXNode(node, file, subFile, filesBuilt)
            ]
        }

        return sections
    }

    /**
     * This function parses a particular LaTeX AST node and its sub-nodes
     * (contents by `latex-utensils`).
     *
     * @param node The AST node to be parsed.
     *
     * All other parameters are identical to {@link buildLaTeXSectionFromFile}.
     *
     * @returns A flat array of {@link Section} of this node.
     */
    private async parseLaTeXNode(node: latexParser.Node, file: string, subFile: boolean, filesBuilt: Set<string>): Promise<Section[]> {
        let sections: Section[] = []
        if (latexParser.isCommand(node)) {
            if (this.LaTeXCommands.secs.includes(node.name.replace(/\*$/, ''))) {
                // \section{Title}
                if (node.args.length > 0) {
                    // Avoid \section alone
                    const captionArg = node.args.find(latexParser.isGroup)
                    if (captionArg) {
                        sections.push(new Section(
                            node.name.endsWith('*') ? SectionKind.NoNumberSection : SectionKind.Section,
                            this.captionify(captionArg),
                            vscode.TreeItemCollapsibleState.Expanded,
                            this.LaTeXSectionDepths[node.name.replace(/\*$/, '')],
                            node.location.start.line - 1,
                            node.location.end.line - 1,
                            file
                        ))
                    }
                }
            } else if (this.LaTeXCommands.cmds.includes(node.name.replace(/\*$/, ''))) {
                // \notlabel{Show}{ShowAlso}
                // const caption = node.args.map(arg => {
                    // const argContent = latexParser.stringify(arg)
                //     return argContent.slice(1, argContent.length - 1)
                // }).join(', ') // -> Show, ShowAlso
                let caption = ''
                const captionArg = node.args.find(latexParser.isGroup)
                if (captionArg) {
                    caption = latexParser.stringify(captionArg)
                    caption = caption.slice(1, caption.length - 1)
                }
                sections.push(new Section(
                    SectionKind.Label,
                    `#${node.name}: ${caption}`,
                    vscode.TreeItemCollapsibleState.Expanded,
                    -1,
                    node.location.start.line - 1,
                    node.location.end.line - 1,
                    file
                ))
            } else if (subFile) {
                // Check if this command is a subfile one
                sections = [
                    ...sections,
                    ...await this.parseLaTeXSubFileCommand(node, file, subFile, filesBuilt)
                ]
            }
        } else if (latexParser.isLabelCommand(node) && this.LaTeXCommands.cmds.includes(node.name)) {
            // \label{this:is_a-label}
            sections.push(new Section(
                SectionKind.Label,
                `#${node.name}: ${node.label}`, // -> #this:is_a-label
                vscode.TreeItemCollapsibleState.Expanded,
                -1,
                node.location.start.line - 1,
                node.location.end.line - 1,
                file
            ))
        } else if (latexParser.isEnvironment(node) && this.LaTeXCommands.envs.includes(node.name.replace(/\*$/, ''))) {
            // \begin{figure}...\end{figure}
            sections.push(new Section(
                SectionKind.Env,
                // -> Figure: Caption of figure
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
                    ...await this.parseLaTeXNode(subNode, file, subFile, filesBuilt)
                ]
            }
        }
        return sections
    }

    /**
     * This function parses a particular LaTeX AST command to see if it is a
     * sub-file-like one. If so, the flat section array of the sub-file is
     * parsed using {@link buildLaTeXSectionFromFile} and returned.
     *
     * @param node The AST command to be parsed.
     *
     * All other parameters are identical to {@link buildLaTeXSectionFromFile}.
     *
     * @returns A flat array of {@link Section} of this sub-file, or an empty
     * array if the command is not a sub-file-like.
     */
    private async parseLaTeXSubFileCommand(node: latexParser.Command, file: string, subFile: boolean, filesBuilt: Set<string>): Promise<Section[]> {
        const cmdArgs: string[] = []
        node.args.forEach((arg) => {
            if (latexParser.isOptionalArg(arg)) {
                return
            }
            const argString = latexParser.stringify(arg)
            cmdArgs.push(argString.slice(1, argString.length - 1))
        })

        const texDirs = vscode.workspace.getConfiguration('latex-workshop').get('latex.texDirs') as string[]

        let candidate: string | undefined
        // \input{sub.tex}
        if (['input', 'InputIfFileExists', 'include', 'SweaveInput',
             'subfile', 'loadglsentries'].includes(node.name.replace(/\*$/, ''))
            && cmdArgs.length > 0) {
            candidate = resolveFile(
                [path.dirname(file),
                 path.dirname(this.extension.manager.rootFile || ''),
                 ...texDirs],
                cmdArgs[0])
        }
        // \import{sections/}{section1.tex}
        if (['import', 'inputfrom', 'includefrom'].includes(node.name.replace(/\*$/, ''))
            && cmdArgs.length > 1) {
            candidate = resolveFile(
                [cmdArgs[0],
                 path.join(
                    path.dirname(this.extension.manager.rootFile || ''),
                    cmdArgs[0])],
                cmdArgs[1])
        }
        // \subimport{01-IntroDir/}{01-Intro.tex}
        if (['subimport', 'subinputfrom', 'subincludefrom'].includes(node.name.replace(/\*$/, ''))
            && cmdArgs.length > 1) {
            candidate = resolveFile(
                [path.dirname(file)],
                path.join(cmdArgs[0], cmdArgs[1]))
        }

        return candidate ? this.buildLaTeXSectionFromFile(candidate, subFile, filesBuilt) : []
    }

    /**
     * This function tries to figure the caption of a `frame`, `figure`, or
     * `table` using their respective syntax.
     *
     * @param node The environment node to be parsed
     * @returns The caption found, or 'Untitled'.
     */
    private findEnvCaption(node: latexParser.Environment): string {
        let captionNode: latexParser.Command | undefined
        let caption: string = 'Untitled'
        if (node.name.replace(/\*$/, '') === 'frame') {
            // Frame titles can be specified as either \begin{frame}{Frame Title}
            // or \begin{frame} \frametitle{Frame Title}
            // \begin{frame}(whitespace){Title} will set the title as long as the whitespace contains no more than 1 newline

            captionNode = node.content.filter(latexParser.isCommand).find(subNode => subNode.name.replace(/\*$/, '') === 'frametitle')

            // \begin{frame}(whitespace){Title}
            const nodeArg = node.args.find(latexParser.isGroup)
            caption = nodeArg ? this.captionify(nodeArg) : caption
        } else if (node.name.replace(/\*$/, '') === 'figure' || node.name.replace(/\*$/, '') === 'table') {
            // \begin{figure} \caption{Figure Title}
            captionNode = node.content.filter(latexParser.isCommand).find(subNode => subNode.name.replace(/\*$/, '') === 'caption')
        }
        // \frametitle can override title set in \begin{frame}{<title>}
        // \frametitle{Frame Title} or \caption{Figure Title}
        if (captionNode) {
            const arg = captionNode.args.find(latexParser.isGroup)
            caption = arg ? this.captionify(arg) : caption
        }
        return caption
    }

    private captionify(argNode: latexParser.Group | latexParser.OptionalArg): string {
        for (let index = 0; index < argNode.content.length; ++index){
            const node = argNode.content[index]
            if (latexParser.isCommand(node)
                && node.name === 'texorpdfstring'
                && node.args.length === 2) {
                const pdfString = latexParser.stringify(node.args[1])
                const firstArg = node.args[1].content[0]
                if (latexParser.isTextString(firstArg)) {
                    firstArg.content = pdfString.slice(1, pdfString.length - 1)
                    argNode.content[index] = firstArg
                }
            }
        }
        const caption = latexParser.stringify(argNode).replace(/\n/g, ' ')
        return caption.slice(1, caption.length - 1) // {Title} -> Title
    }

    /**
     * This function builds the hierarchy of a flat {@link Section} array
     * according to the input hierarchy data. This is a two-step process. The
     * first step puts all non-section {@link Section}s into their leading
     * section {@link Section}. The section numbers are also optionally added in
     * this step. Then in the second step, the section {@link Section}s are
     * iterated to build the hierarchy.
     *
     * @param flatStructure The flat sections whose hierarchy is to be built.
     * @param showHierarchyNumber Whether the section numbers should be computed
     * and prepended to section captions.
     * @returns The final sections to be shown with hierarchy.
     */
    private buildLaTeXHierarchy(flatStructure: Section[], showHierarchyNumber: boolean): Section[] {
        if (flatStructure.length === 0) {
            return []
        }

        // All non-section nodes before the first section
        const preambleNodes: Section[] = []
        // Only holds section-like Sections
        const flatSections: Section[] = []

        // Calculate the lowest depth. It's possible that there is no `chapter`
        // in a document. In such a case, `section` is the lowest level with a
        // depth 1. However, later logic is 0-based. So.
        let lowest = 65535
        flatStructure.filter(node => node.depth > -1).forEach(section => {
            lowest = lowest < section.depth ? lowest : section.depth
        })

        // Step 1: Put all non-sections into their leading section. This is to
        // make the subsequent logic clearer.

        // This counter is used to calculate the section numbers. The array
        // holds the current numbering. When developing the numbers, just +1 to
        // the appropriate item and retrieve the sub-array.
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
                if (showHierarchyNumber && node.kind === SectionKind.Section) {
                    const depth = node.depth - lowest
                    if (depth + 1 > counter.length) {
                        counter = [...counter, ...new Array(depth + 1 - counter.length).fill(0) as number[]]
                    } else {
                        counter = counter.slice(0, depth + 1)
                    }
                    counter[counter.length - 1] += 1
                    node.label = `${counter.join('.')} ${node.label}`
                } else if (showHierarchyNumber && node.kind === SectionKind.NoNumberSection) {
                    node.label = `* ${node.label}`
                }
                flatSections.push(node)
            }
        })

        const sections: Section[] = []

        flatSections.forEach(section => {
            if (section.depth - lowest === 0) {
                // base level section
                sections.push(section)
            } else if (sections.length === 0) {
                // non-base level section, no previous sections available, create one
                sections.push(section)
            } else {
                // Starting from the last base-level section, find out the
                // proper level.
                let currentSection = sections[sections.length - 1]
                while (currentSection.depth < section.depth - 1) {
                    const children = currentSection.children.filter(candidate => candidate.depth > -1)
                    if (children.length > 0) {
                        // If there is a section child
                        currentSection = children[children.length - 1]
                    } else {
                        // If there is a jump e.g., section -> subsubsection,
                        // give up finding.
                        break
                    }
                }
                currentSection.children.push(section)
            }
        })

        return [...preambleNodes, ...sections]
    }

    private buildLaTeXSectionToLine(structure: Section[], lastLine: number) {
        const sections = structure.filter(section => section.depth >= 0)
        sections.forEach(section => {
            const sameFileSections = sections.filter(candidate =>
                (candidate.fileName === section.fileName) &&
                (candidate.lineNumber >= section.lineNumber) &&
                (candidate !== section))
            if (sameFileSections.length > 0 && sameFileSections[0].lineNumber === section.lineNumber) {
                // On the same line, e.g., \section{one}\section{two}
                return
            } else if (sameFileSections.length > 0) {
                section.toLine = sameFileSections[0].lineNumber - 1
            } else {
                section.toLine = lastLine
            }
            if (section.children.length > 0) {
                this.buildLaTeXSectionToLine(section.children, section.toLine)
            }
        })
    }

    private parseRnwChildCommand(content: string, file: string, rootFile: string): {subFile: string, line: number}[] {
        const children: {subFile: string, line: number}[] = []
        const childRegExp = new InputFileRegExp()
        while(true) {
            const result = childRegExp.execChild(content, file, rootFile)
            if (!result) {
                break
            }
            const line = (content.slice(0, result.match.index).match(/\n/g) || []).length
            children.push({subFile: result.path, line})
        }
        return children
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
    NoNumberSection = 3,
    BibItem = 4,
    BibField = 5
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
           this.extension.logger.addLogMessage(`Follow cursor is set to ${this._followCursor}.`)
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
