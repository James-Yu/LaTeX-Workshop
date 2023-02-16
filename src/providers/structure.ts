import * as vscode from 'vscode'
import * as lw from '../lw'
import { Section } from './structurelib/section'
import { StructureUpdated } from '../components/eventbus'
import { LaTeXStructure } from './structurelib/latex'
import { BibTeXStructure } from './structurelib/bibtex'
import { DocTeXStructure } from './structurelib/doctex'

import { getLogger } from '../components/logger'

const logger = getLogger('Structure')

export class SectionNodeProvider implements vscode.TreeDataProvider<Section> {
    private readonly _onDidChangeTreeData: vscode.EventEmitter<Section | undefined> = new vscode.EventEmitter<Section | undefined>()
    readonly onDidChangeTreeData: vscode.Event<Section | undefined>
    public root: string = ''

    // our data source is a set multi-rooted set of trees
    public ds: Section[] = []
    private cachedTeXSec: Section[] | undefined = undefined
    private cachedBibSec: Section[] | undefined = undefined
    private cachedDocTeXSec: Section[] | undefined = undefined

    constructor() {
        this.onDidChangeTreeData = this._onDidChangeTreeData.event
    }

    private getCachedDataRootFileName(sections: Section[]): string | undefined {
        if (sections.length >0) {
            return sections[0].fileName
        }
        return
    }

    /**
     * Return the latex or bibtex structure
     *
     * @param force If `false` and some cached data exists for the corresponding file, use it. If `true`, always recompute the structure from disk
     */
    async build(force: boolean): Promise<Section[]> {
        const document = vscode.window.activeTextEditor?.document
        if (document?.languageId === 'doctex') {
            if (force || !this.cachedDocTeXSec || this.getCachedDataRootFileName(this.cachedDocTeXSec) !== document.fileName) {
                this.cachedDocTeXSec = undefined
                this.cachedDocTeXSec = await DocTeXStructure.buildDocTeXModel(document)
            }
            this.ds = this.cachedDocTeXSec
            logger.log(`Structure updated with ${this.ds.length} entries for ${document.uri.fsPath} .`)
        } else if (document?.languageId === 'bibtex') {
            if (force || !this.cachedBibSec || this.getCachedDataRootFileName(this.cachedBibSec) !== document.fileName) {
                this.cachedBibSec = undefined
                this.cachedBibSec = await BibTeXStructure.buildBibTeXModel(document)
            }
            this.ds = this.cachedBibSec
            logger.log(`Structure updated with ${this.ds.length} entries for ${document.uri.fsPath} .`)
        } else if (lw.manager.rootFile) {
            if (force || !this.cachedTeXSec) {
                this.cachedTeXSec = undefined
                this.cachedTeXSec = await LaTeXStructure.buildLaTeXModel()
            }
            this.ds = this.cachedTeXSec
            logger.log(`Structure ${force ? 'force ' : ''}updated with ${this.ds.length} root sections for ${lw.manager.rootFile} .`)
        } else {
            this.ds = []
            logger.log('Structure cleared on undefined root.')
        }
        return this.ds
    }

    async update(force: boolean) {
        this.ds = await this.build(force)
        this._onDidChangeTreeData.fire(undefined)
        lw.eventBus.fire(StructureUpdated)
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
        if (lw.manager.rootFile === undefined) {
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
        if (lw.manager.rootFile === undefined || !element) {
            return
        }
        return element.parent
    }
}

export class StructureTreeView {
    private readonly _viewer: vscode.TreeView<Section | undefined>
    private readonly _treeDataProvider: SectionNodeProvider
    private _followCursor: boolean = true


    constructor() {
        this._treeDataProvider = new SectionNodeProvider()
        this._viewer = vscode.window.createTreeView('latex-workshop-structure', { treeDataProvider: this._treeDataProvider, showCollapseAll: true })
        vscode.commands.registerCommand('latex-workshop.structure-toggle-follow-cursor', () => {
           this._followCursor = ! this._followCursor
           logger.log(`Follow cursor is set to ${this._followCursor}.`)
        })

        vscode.workspace.onDidSaveTextDocument( (e: vscode.TextDocument) => {
            if (lw.manager.hasBibtexId(e.languageId) || lw.manager.hasDoctexId(e.languageId)) {
                void lw.structureViewer.computeTreeStructure()
            }
        })

        vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor | undefined) => {
            if (!e) {
                return
            }
            if (lw.manager.hasBibtexId(e.document.languageId) || lw.manager.hasDoctexId(e.document.languageId)) {
                void lw.structureViewer.refreshView()
            }
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
