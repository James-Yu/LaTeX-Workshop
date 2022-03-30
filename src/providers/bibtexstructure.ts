import * as vscode from 'vscode'
import {bibtexParser} from 'latex-utensils'

import type { Extension } from '../main'


export class SectionNodeProvider implements vscode.TreeDataProvider<Section> {

    private readonly _onDidChangeTreeData: vscode.EventEmitter<Section | undefined> = new vscode.EventEmitter<Section | undefined>()
    readonly onDidChangeTreeData: vscode.Event<Section | undefined>

    public ds: Section[] = []

    constructor(private readonly extension: Extension) {
        this.onDidChangeTreeData = this._onDidChangeTreeData.event
        // const configuration = vscode.workspace.getConfiguration('latex-workshop')
    }

    async refresh() {
        const document = vscode.window.activeTextEditor?.document
        if (!document || document.languageId != 'bibtex') {
            this.ds = []
            this._onDidChangeTreeData.fire(undefined)
            return
        }
        const ast = await this.extension.pegParser.parseBibtex(document?.getText() || '').catch((error) => {
            if (error instanceof(Error)) {
                this.extension.logger.addLogMessage('Bibtex parser failed.')
                this.extension.logger.addLogMessage(error.message)
                void this.extension.logger.showErrorMessage('Bibtex parser failed with error: ' + error.message)
            }
            return undefined
        })

        this.ds = []
        ast?.content.forEach(entry => {
            if (!bibtexParser.isEntry(entry)){
                return
            }
            const bibitem = new Section(
                `${entry.entryType}: ${entry.internalKey}`,
                vscode.TreeItemCollapsibleState.Collapsed,
                0,
                entry.location.start.line,
                entry.location.end.line)
            entry.content.forEach(field => {
                const fielditem = new Section(
                    `${field.name}: ${field.value.content}`,
                    vscode.TreeItemCollapsibleState.None,
                    1,
                    field.location.start.line,
                    field.location.end.line)
                fielditem.parent = bibitem
                bibitem.children.push(fielditem)
            })
            this.ds.push(bibitem)
        })
        this._onDidChangeTreeData.fire(undefined)
        this.extension.logger.addLogMessage(`BibTeX Structure is updated with ${this.ds.length} bibitems.`)
    }

    getTreeItem(element: Section): vscode.TreeItem {

        const hasChildren = element.children.length > 0
        const treeItem: vscode.TreeItem = new vscode.TreeItem(element.label, hasChildren ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None)

        treeItem.command = {
            command: 'latex-workshop.goto-bibtex',
            title: '',
            arguments: [element.lineNumber]
        }

        treeItem.tooltip = `Line ${element.lineNumber + 1}`

        return treeItem
    }

    getChildren(element?: Section): vscode.ProviderResult<Section[]> {
        if (!element) {
            return this.ds
        }

        return element.children
    }

    getParent(element?: Section): Section | undefined {
        return element?.parent
    }
}


export class Section extends vscode.TreeItem {

    public children: Section[] = []
    public parent: Section | undefined = undefined // The parent of a top level section must be undefined

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly depth: number,
        public readonly lineNumber: number,
        public toLine: number
    ) {
        super(label, collapsibleState)
    }
}

export class BibTeXStructureTreeView {
    private readonly _viewer: vscode.TreeView<Section | undefined>
    private readonly _treeDataProvider: SectionNodeProvider

    constructor(extension: Extension) {
        this._treeDataProvider = new SectionNodeProvider(extension)
        this._viewer = vscode.window.createTreeView('latex-workshop-bibtex-structure', { treeDataProvider: this._treeDataProvider, showCollapseAll: true })
    }

    update() {
        this._treeDataProvider.refresh()
    }

    showCursorItem(e: vscode.TextEditorSelectionChangeEvent) {
        if (!this._viewer.visible) {
            return
        }
        const line = e.selections[0].active.line
        const currentNode = this.traverseSectionTree(this._treeDataProvider.ds, line)
        if (currentNode) {
            return this._viewer.reveal(currentNode, {select: true})
        }
        return
    }

    private traverseSectionTree(sections: Section[], lineNumber: number): Section | undefined {
        let match: Section | undefined = undefined
        for (const node of sections) {
            // lineNumber is zero-based but node line numbers are one-based.
            if ((node.lineNumber-1 <= lineNumber && node.toLine-1 >= lineNumber)) {
                match = node
                // Look for a more precise surrounding section
                const res = this.traverseSectionTree(node.children, lineNumber)
                if (res) {
                    match = res
                }
            }
        }
        return match
    }
}
