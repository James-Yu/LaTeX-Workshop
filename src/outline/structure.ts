import * as vscode from 'vscode'
import { lw } from '../lw'
import type { TeXElement } from '../types'
import { construct as constructLaTeX } from './structure/latex'
import { buildBibTeX } from './structure/bibtex'
import { construct as constructDocTeX } from './structure/doctex'

const logger = lw.log('Structure')

export const outline = {
    reconstruct,
    refresh,
    reveal
}

lw.onConfigChange(['view.outline.sections', 'view.outline.commands'], async () => {
    await lw.parser.parse.reset()
    lw.cache.paths().forEach(async filePath => {
        const ast = lw.cache.get(filePath)?.ast
        if (ast) {
            await lw.parser.parse.args(ast)
        }
    })
    void reconstruct()
})

async function reconstruct() {
    state.structure = await build(true)
    state.treeDataProvider.structureChanged.fire(undefined)
    lw.event.fire(lw.event.StructureUpdated)
    return state.structure
}

async function refresh(fireChangedEvent: boolean = true) {
    state.structure = await build(false)
    if (fireChangedEvent) {
        state.treeDataProvider.structureChanged.fire(undefined)
        lw.event.fire(lw.event.StructureUpdated)
    }
    return state.structure
}

function reveal(e: vscode.TextEditorSelectionChangeEvent) {
    if (!(vscode.workspace.getConfiguration('latex-workshop').get('view.outline.follow.editor') as boolean) || !state.view.visible) {
        return
    }
    const line = e.selections[0].active.line
    const f = e.textEditor.document.fileName
    const currentNode = traverseSectionTree(state.structure, f, line)
    return currentNode ? state.view.reveal(currentNode, {select: true}) : undefined
}

/**
 * Return the latex or bibtex structure
 *
 * @param force If `false` and some cached data exists for the corresponding file, use it. If `true`, always recompute the structure from disk
 */
async function build(force: boolean): Promise<TeXElement[]> {
    const document = vscode.window.activeTextEditor?.document
    if (document?.languageId === 'doctex') {
        if (force || !state.cachedDTX || getCachedDataRootFileName(state.cachedDTX) !== document.fileName) {
            state.cachedDTX = undefined
            state.cachedDTX = await constructDocTeX(document)
            logger.log(`Structure ${force ? 'force ' : ''}updated with ${state.structure.length} entries for ${document.uri.fsPath} .`)
        }
        state.structure = state.cachedDTX
    } else if (document?.languageId === 'bibtex') {
        if (force || !state.cachedBib || getCachedDataRootFileName(state.cachedBib) !== document.fileName) {
            state.cachedBib = undefined
            state.cachedBib = await buildBibTeX(document)
            logger.log(`Structure ${force ? 'force ' : ''}updated with ${state.structure.length} entries for ${document.uri.fsPath} .`)
        }
        state.structure = state.cachedBib
    } else if (lw.root.file.path) {
        if (force || !state.cachedTeX) {
            state.cachedTeX = undefined
            state.cachedTeX = await constructLaTeX()
            logger.log(`Structure ${force ? 'force ' : ''}updated with ${state.structure.length} root sections for ${lw.root.file.path} .`)
        }
        state.structure = state.cachedTeX
    } else {
        state.structure = []
        logger.log('Structure cleared on undefined root.')
    }
    return state.structure
}

function getCachedDataRootFileName(sections: TeXElement[]): string | undefined {
    return sections[0]?.filePath
}

function getChildPaths(section: TeXElement, paths: Set<string> = new Set()) {
    section.children.forEach(child => {
        paths.add(child.filePath)
        getChildPaths(child, paths)
    })
    return paths
}

function traverseSectionTree(sections: TeXElement[], filePath: string, lineNo: number): TeXElement | undefined {
    for (const node of sections) {
        if ((node.filePath === filePath &&
                node.lineFr <= lineNo && node.lineTo >= lineNo) ||
            (node.filePath !== filePath && getChildPaths(node).has(filePath))) {
            // Look for a more precise surrounding section
            return traverseSectionTree(node.children, filePath, lineNo) ?? node
        }
    }
    return undefined
}

class StructureProvider implements vscode.TreeDataProvider<TeXElement> {
    readonly structureChanged: vscode.EventEmitter<TeXElement | undefined | null> = new vscode.EventEmitter<TeXElement | undefined | null>()
    readonly onDidChangeTreeData: vscode.Event<TeXElement | undefined | null> = this.structureChanged.event

    getTreeItem(element: TeXElement): vscode.TreeItem {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(
            element.label,
            element.children.length > 0 ? vscode.TreeItemCollapsibleState.Expanded :
                                          vscode.TreeItemCollapsibleState.None)

        treeItem.command = {
            command: 'latex-workshop.goto-section',
            title: '',
            arguments: [element.filePath, element.lineFr]
        }
        treeItem.tooltip = `Line ${element.lineFr + 1} at ${element.filePath}`

        return treeItem
    }

    getChildren(element?: TeXElement): vscode.ProviderResult<TeXElement[]> {
        if (lw.root.file.path === undefined) {
            return []
        }
        return element?.children ?? refresh(false)
    }

    getParent(element?: TeXElement): TeXElement | undefined {
        if (lw.root.file.path === undefined || !element) {
            return
        }
        return element.parent
    }
}

const treeDataProvider = new StructureProvider()
const state = {
    structure: [] as TeXElement[],
    cachedTeX: undefined as TeXElement[] | undefined,
    cachedBib: undefined as TeXElement[] | undefined,
    cachedDTX: undefined as TeXElement[] | undefined,
    view: vscode.window.createTreeView('latex-workshop-structure', { treeDataProvider, showCollapseAll: true }),
    treeDataProvider
}
