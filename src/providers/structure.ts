import * as vscode from 'vscode'
import {bibtexParser, latexParser} from 'latex-utensils'

import type { Extension } from '../main'


export class SectionNodeProvider implements vscode.TreeDataProvider<Section> {

    private readonly _onDidChangeTreeData: vscode.EventEmitter<Section | undefined> = new vscode.EventEmitter<Section | undefined>()
    readonly onDidChangeTreeData: vscode.Event<Section | undefined>
    public projectStructure: Section[] = []

    constructor(private readonly extension: Extension) {
        this.onDidChangeTreeData = this._onDidChangeTreeData.event
    }

    async refreshProjectStructure() {
        console.log('parsed')
        this.projectStructure = await this.buildLaTeXModel() || []
        this._onDidChangeTreeData.fire(undefined)
    }

    async buildBibTeXModel(file: string) {
        const structure: Section[] = []

        const cache = await this.extension.cacher.getBibCache(file)
        if (!cache?.astSaved) {
            return
        }
        cache.astSaved.content.filter(bibtexParser.isEntry)
            .forEach(entry => {
                const bibitem = new Section(
                    SectionKind.BibItem,
                    `${entry.entryType}: ${entry.internalKey}`,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    entry.location.start.line,
                    entry.location.end.line,
                    file)
                entry.content.forEach(field => {
                    const fielditem = new Section(
                        SectionKind.BibField,
                        `${field.name}: ${field.value.content}`,
                        vscode.TreeItemCollapsibleState.None,
                        field.location.start.line,
                        field.location.end.line,
                        file)
                    fielditem.parent = bibitem
                    bibitem.children.push(fielditem)
                })
                structure.push(bibitem)
            })
        return structure
    }

    /**
     *
     * @param buildSubFile Default to `true`, and parses from rootFile. If set
     * to `false`, the current active document file will be parsed without
     * checking the sub files.
     * @returns
     */
    async buildLaTeXModel(file?: string, buildSubFile = true) {
        if (!file) {
            file = this.extension.manager.rootFile
        }
        if (!file) {
            return
        }
        const cache = await this.extension.cacher.tex.get(file, true)
        const ast = cache?.getAST()
        if (!cache || !ast) {
            return
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const cmds = configuration.get('view.outline.commands') as string[]
        const defaultCmds = ['label', 'frametitle', 'caption']
        const envs = configuration.get('view.outline.floats.enabled') as boolean ? ['figure', 'frame', 'table'] : ['frame']
        const hierarchy = (configuration.get('view.outline.sections') as string[]).map(level => {return {level}})
        const showHierarchyNumber = buildSubFile ? configuration.get('view.outline.numbers.enabled') as boolean : false
        const astFiltered = this.extension.pegParser.filter(ast, envs, [...cmds, ...defaultCmds, ...hierarchy.map(sec => sec.level.split('|')).flat()])
        const structure = await this.nodeContentsToSections(file, astFiltered, hierarchy, envs, cmds, showHierarchyNumber, buildSubFile)
        if (structure.length === 7) {
            console.log('here')
        }
        return structure
    }

    /**
     *
     * @param file The file this node physically belongs to
     * @param content The content array this node possesses
     * @param hierarchy The current document hierarchy. This is a critical
     * parameter to maintain the numbering of sections. It is used as follows:
     * For each level in the hierarchy, one and only one current section is
     * maintained, so that all other node contents will be added to
     * corresponding highest-level (subsubsection etc.) section. When a new
     * subsubsection is encountered, the new one replaces the old one and record
     * the new tag in the `tag` field. When a new lower-level subsection
     * appears, it replaces the previous subsection, and clears the
     * subsubsection, making it `undefined`. When adding non-section contents,
     * we just need to find the highest non-undefined section, add to its
     * children.
     * @param envs Environments to be parsed.
     * @param cmds Commands to be parsed, including sections and custom
     * commands.
     * @param showHierarchyNumber Whether sections should be numbered.
     * @param includeSubs Whether subfile contents should be parsed.
     * @returns The section tree from input content.
     */
    private async nodeContentsToSections(file: string,
            contents: latexParser.Node[],
            hierarchy: {level: string, section?: Section, tag?: string}[],
            envs: string[],
            cmds: string[],
            showHierarchyNumber: boolean,
            includeSubs = true) {
        let sections: Section[] = []
        const headings = hierarchy.map(sec => sec.level.split('|')).flat()
        const subFiles: string[] = []
        for (const node of contents) {
            let section: Section | undefined
            let added = false
            // Only hold multiple envs/cmds
            if (latexParser.isGroup(node)) {
                const subSections = await this.nodeContentsToSections(file, node.content, hierarchy, envs, cmds, showHierarchyNumber)
                sections = [...sections, ...subSections]
            }
            // document
            else if (latexParser.isEnvironment(node) && node.name.replace('*', '') === 'document') {
                const subSections = await this.nodeContentsToSections(file, node.content, hierarchy, envs, cmds, showHierarchyNumber)
                sections = [...sections, ...subSections]
            }
            // frame, figure, table
            else if (latexParser.isEnvironment(node) && node.name.replace('*', '') !== 'document') {
                section = this.envToSection(file, node)
                added = this.addToHierarchy(section, hierarchy, hierarchy.length - 1)
                const subSections = await this.nodeContentsToSections(file, node.content, hierarchy, envs, cmds, showHierarchyNumber)
                section.children = subSections
            }
            // custom commands
            else if (latexParser.isCommand(node) && cmds.includes(node.name.replace('*', '')) && !headings.includes(node.name.replace('*', ''))) {
                section = this.cmdToSection(file, node)
                added = this.addToHierarchy(section, hierarchy, hierarchy.length - 1)
            }
            // section, subsection, part, chapter as defined in 'view.outline.sections'
            else if (latexParser.isCommand(node) && headings.includes(node.name.replace('*', ''))) {
                section = this.secToSection(file, node)
                added = this.secToHierarchy(section, node.name.replace('*', ''), hierarchy, showHierarchyNumber)
            }
            // Should be root section of this node
            if (section && !added) {
                sections.push(section)
            }
            // imports
            const cache = await this.extension.cacher.tex.get(file, true)
            const location = node.location
            if (includeSubs && location && cache) {
                const subs = cache.subFiles.filter(sub => !subFiles.includes(sub.file)).filter(sub => sub.line > location.start.line)
                for (const sub of subs) {
                    const subAst = (await this.extension.cacher.tex.get(sub.file, true))?.getAST()
                    if (!subAst) {
                        continue
                    }
                    const subSections = await this.nodeContentsToSections(sub.file, subAst.content, hierarchy, envs, cmds, showHierarchyNumber)
                    sections = [...sections, ...subSections]
                }
            }
        }
        return sections
    }

    private envToSection(file: string, node: latexParser.Environment) {
        return new Section(
            SectionKind.Env,
            `${node.name.charAt(0).toUpperCase() + node.name.slice(1)}: ${this.findEnvCaption(node)}`,
            vscode.TreeItemCollapsibleState.Expanded,
            node.location.start.line - 1,
            node.location.end.line - 1,
            file)
    }

    private cmdToSection(file: string, node: latexParser.Command) {
        const argString = node.args.map(arg => latexParser.isTextString(arg.content[0]) ? arg.content[0].content : '').join()
        return new Section(
            SectionKind.Label,
            argString === '' ? node.name : `${node.name}: ${argString}`,
            vscode.TreeItemCollapsibleState.Expanded,
            node.location.start.line - 1,
            node.location.end.line - 1,
            file)
    }

    private secToSection(file: string, node: latexParser.Command) {
        const heading = latexParser.stringify(node.args[0])
        // const heading = (node.args.length > 0 && latexParser.isTextString(node.args[0].content[0])) ? node.args[0].content[0].content : 'Untitled'
        return new Section(
            SectionKind.Section,
            heading.slice(1, heading.length - 1), // {Introduction} -> Introduction
            vscode.TreeItemCollapsibleState.Expanded,
            node.location.start.line - 1,
            node.location.end.line - 1,
            file)
    }

    private secToHierarchy(section: Section, level: string, hierarchy: {level: string, section?: Section, tag?: string}[], showHierarchyNumber: boolean) {
        // change the current hierarchy tree
        let newSectionFound = false
        let added = false
        hierarchy.forEach(sec => {
            if (!sec.level.includes(level.replace('*', ''))) {
                return
            }
            if (newSectionFound) { // A new lower-level section is found. This higher level one shall be reset
                sec.section = undefined
                sec.tag = undefined
                return
            }
            if (!section) {
                return
            }
            const depth = hierarchy.indexOf(sec)
            sec.section = section
            if (showHierarchyNumber) {
                sec.tag = this.getHierarchyNumber(hierarchy, depth)
                section.label = `${sec.tag} ${section.label}`
            } else {
                sec.tag = ''
            }
            added = this.addToHierarchy(section, hierarchy, depth - 1)
            newSectionFound = true
        })
        return added
    }

    private addToHierarchy(section: Section | undefined, hierarchy: {level: string, section?: Section, tag?: string}[], startIndex: number) {
        if (!section) {
            return false
        }
        for (let i = startIndex; i >= 0; --i) {
            const headingSection = hierarchy[i].section
            if (!headingSection) {
                continue
            }
            headingSection.children.push(section)
            return true
        }
        return false
    }

    private getHierarchyNumber(hierarchy: {level: string, section?: Section, tag?: string}[], index: number) {
        // Exist a same level section. Increment by one.
        if (hierarchy[index].section) {
            const tagList = hierarchy[index].tag?.split('.') || ['0']
            tagList[tagList.length - 1] = (parseInt(tagList[tagList.length - 1]) + 1).toString()
            return tagList.join('.')
        }
        let tag = ''
        for (let i = 0; i < index; ++i) {
            // Not top-level section needs dots to seperate
            if (i > 0) {
                tag += '.'
            }
            if (hierarchy[i].section) {
                // Already exists a higher-level section, just use the index
                tag += hierarchy[i].tag
            } else {
                // Does not exist, use 0. Why not 1? For example: section >
                // subsubsection > subsection renders 1, 1.0.1, 1.1.
                tag += '0'
            }
        }
        // The first top-level section
        if (tag === '') {
            tag = '1'
        }
        return tag
    }

    private findEnvCaption(node: latexParser.Environment) {
        let candidate: latexParser.Node | undefined
        if (node.name.replace('*', '') === 'frame') {
            // Frame titles can be specified as either \begin{frame}{Frame Title}
            // or \begin{frame} \frametitle{Frame Title}
            // \begin{frame}(whitespace){Title} will set the title as long as the whitespace contains no more than 1 newline
            // \frametitle can override title set in \begin{frame}{<title>} so we check that first

            // \begin{frame} \frametitle{Frame Title}
            const caption = this.extension.pegParser.filter(node, [], ['frametitle'], false)
            if (caption.length > 0 && latexParser.isCommand(caption[0]) && caption[0].args.length > 0) {
                candidate = caption[0].args[0].content[0]
            }
            // \begin{frame}(whitespace){Title}
            if (node.args.length > 0) {
                candidate = node.args[0].content[0]
            }
            if (latexParser.isTextString(candidate)) {
                return candidate.content
            }
            return 'Untitled Frame'
        }
        if (node.name.replace('*', '') === 'figure' || node.name.replace('*', '') === 'table') {
            // \begin{figure} \caption{Figure Title}
            const captionNodes = this.extension.pegParser.filter(node, [], ['caption'], false)
            if (captionNodes.length > 0 && latexParser.hasArgsArray(captionNodes[0])) {
                const caption = latexParser.stringify(captionNodes[0].args[0])
                return caption.slice(1, caption.length - 1)
            }
            return 'Untitled Environment'
        }
        return 'Untitled Environment'
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
        console.log('called ' + element)
        if (this.extension.manager.rootFile === undefined) {
            return []
        }
        if (!element) {
            return this.projectStructure
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
        this._treeDataProvider = new SectionNodeProvider(extension)
        this._viewer = vscode.window.createTreeView('latex-workshop-structure', { treeDataProvider: this._treeDataProvider, showCollapseAll: true })
        vscode.commands.registerCommand('latex-workshop.structure-toggle-follow-cursor', () => {
           this._followCursor = ! this._followCursor
        })
    }

    refresh() {
        this._treeDataProvider.refreshProjectStructure().finally(() => {})
    }

    async getTreeData(): Promise<Section[]> {
        const document = vscode.window.activeTextEditor?.document
        if (document?.languageId === 'bibtex') {
            return (await this.extension.cacher.getBibCache(document.fileName))?.secSaved || []
        }
        if (this.extension.manager.rootFile) {
            return (await this.extension.cacher.tex.get(this.extension.manager.rootFile))?.secSaved || []
        }
        return []
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

    async showCursorItem(e: vscode.TextEditorSelectionChangeEvent) {
        if (!this._followCursor || !this._viewer.visible) {
            return
        }
        const line = e.selections[0].active.line
        const f = e.textEditor.document.fileName
        let sections: Section[] = []
        const document = vscode.window.activeTextEditor?.document
        if (document?.languageId === 'bibtex') {
            sections = (await this.extension.cacher.getBibCache(document.fileName))?.secSaved || []
        } else if (this.extension.manager.rootFile) {
            sections = (await this.extension.cacher.tex.get(this.extension.manager.rootFile))?.secSaved || []
        }
        const currentNode = this.traverseSectionTree(sections, f, line)
        if (currentNode) {
            return this._viewer.reveal(currentNode, {select: true})
        }
        return
    }
}
