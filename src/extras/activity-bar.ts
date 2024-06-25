import * as vscode from 'vscode'
import { lw } from '../lw'

lw.onConfigChange('latex.recipes', update)

function buildNode(parent: LaTeXCommand, children: LaTeXCommand[]) {
    if (children.length > 0) {
        parent.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed
        parent.children = children
        children.forEach((c) => c.parent = parent)
    }
    return parent
}

function buildCommandTree(): LaTeXCommand[] {
    var localeStr: { [x: string]: string } | null = null;
    try {
        localeStr = require("../../../package.nls." + vscode.env.language + ".json");
    } catch {
    }
    if (localeStr == null) localeStr = require("../../../package.nls.json");
    if (localeStr == null) return [];
    const commands: LaTeXCommand[] = []
    const configuration = vscode.workspace.getConfiguration('latex-workshop', lw.root.getWorkspace())

    const buildCommand = new LaTeXCommand(localeStr['Build LaTeX project'], {command: 'latex-workshop.build'}, 'debug-start')
    const recipes = configuration.get('latex.recipes', []) as {name: string}[]
    const recipeCommands = recipes.map(recipe => new LaTeXCommand(localeStr['Recipe'] + `: ${recipe.name}`, {command: 'latex-workshop.recipes', arguments: [recipe.name]}, 'debug-start'))
    let node: LaTeXCommand
    node = buildNode(buildCommand, [
        new LaTeXCommand(localeStr['Clean up auxiliary files'], {command: 'latex-workshop.clean'}, 'clear-all'),
        new LaTeXCommand(localeStr['Terminate current compilation'], {command: 'latex-workshop.kill'}, 'debug-stop'),
        ...recipeCommands
    ])
    commands.push(node)

    const viewCommand = new LaTeXCommand(localeStr['View LaTeX PDF'], {command: 'latex-workshop.view'}, 'open-preview')
    node = buildNode(viewCommand, [
        new LaTeXCommand(localeStr['View in VSCode tab'], {command: 'latex-workshop.view', arguments: ['tab']}, 'open-preview'),
        new LaTeXCommand(localeStr['View in web browser'], {command: 'latex-workshop.view', arguments: ['browser']}, 'browser'),
        new LaTeXCommand(localeStr['View in external viewer'], {command: 'latex-workshop.view', arguments: ['external']}, 'preview'),
        new LaTeXCommand(localeStr['Refresh all viewers'], {command: 'latex-workshop.refresh-viewer'}, 'refresh')
    ])
    commands.push(node)

    const logCommand = new LaTeXCommand(localeStr['View Log messages'], {command: 'latex-workshop.log'}, 'output')
    const compilerLog = new LaTeXCommand(localeStr['View LaTeX compiler log'], {command: 'latex-workshop.compilerlog'}, 'output')
    const latexWorkshopLog = new LaTeXCommand(localeStr['View LaTeX Workshop extension log'], {command: 'latex-workshop.log'}, 'output')
    node = buildNode(logCommand, [
        latexWorkshopLog,
        compilerLog
    ])
    commands.push(node)

    const navCommand = new LaTeXCommand(localeStr['Navigate, select, and edit'], undefined, 'edit')
    node= buildNode(navCommand, [
        new LaTeXCommand(localeStr['SyncTeX from cursor'], {command: 'latex-workshop.synctex'}, 'go-to-file'),
        new LaTeXCommand(localeStr['Navigate to matching begin/end'], {command: 'latex-workshop.navigate-envpair'}),
        new LaTeXCommand(localeStr['Select current environment content'], {command: 'latex-workshop.select-envcontent'}),
        new LaTeXCommand(localeStr['Select current environment name'], {command: 'latex-workshop.select-envname'}),
        new LaTeXCommand(localeStr['Close current environment'], {command: 'latex-workshop.close-env'}),
        new LaTeXCommand(localeStr['Surround with begin{}...\\end{}'], {command: 'latex-workshop.wrap-env'}),
        new LaTeXCommand(localeStr['Insert %!TeX root magic comment'], {command: 'latex-workshop.addtexroot'})
    ])
    commands.push(node)

    const miscCommand = new LaTeXCommand(localeStr['Miscellaneous'], undefined, 'menu')
    node = buildNode(miscCommand, [
        new LaTeXCommand(localeStr['Open citation browser'], {command: 'latex-workshop.citation'}),
        new LaTeXCommand(localeStr['Count words in LaTeX project'], {command: 'latex-workshop.wordcount'}),
        new LaTeXCommand(localeStr['Reveal output folder in OS'], {command: 'latex-workshop.revealOutputDir'}, 'folder-opened')
    ])
    commands.push(node)

    const bibtexCommand = new LaTeXCommand(localeStr['BibTeX actions'], undefined, 'references')
    node = buildNode(bibtexCommand, [
        new LaTeXCommand(localeStr['Align bibliography'], {command: 'latex-workshop.bibalign'}),
        new LaTeXCommand(localeStr['Sort bibliography'], {command: 'latex-workshop.bibsort'}, 'sort-precedence'),
        new LaTeXCommand(localeStr['Align and sort bibliography'], {command: 'latex-workshop.bibalignsort'})
    ])
    commands.push(node)
    return commands
}


function update() {
    state.commands = buildCommandTree()
    state.treeDataProvider._onDidChangeTreeData.fire(undefined)
}

class CommandProvider implements vscode.TreeDataProvider<LaTeXCommand> {
    readonly _onDidChangeTreeData: vscode.EventEmitter<LaTeXCommand | undefined> = new vscode.EventEmitter<LaTeXCommand | undefined>()
    readonly onDidChangeTreeData: vscode.Event<LaTeXCommand | undefined> = this._onDidChangeTreeData.event

    getTreeItem(element: LaTeXCommand): vscode.TreeItem {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(element.label, element.collapsibleState)
        treeItem.command = element.command
        treeItem.iconPath = element.codicon && new vscode.ThemeIcon(element.codicon)
        return treeItem
    }

    getChildren(element?: LaTeXCommand): LaTeXCommand[] {
        if (!element) {
            return state.commands
        }

        return element.children
    }

    getParent(element: LaTeXCommand) {
        return element.parent
    }
}

class LaTeXCommand {
    public children: LaTeXCommand[] = []
    public readonly command: vscode.Command | undefined
    public collapsibleState = vscode.TreeItemCollapsibleState.None
    public parent: LaTeXCommand | undefined

    constructor(
        public readonly label: string,
        command?: {command: string, arguments?: string[]},
        public readonly codicon?: string
    ) {
        if (command) {
            this.command = {...command, title: ''}
        }
    }
}

const treeDataProvider = new CommandProvider()
const state = {
    commands: buildCommandTree(),
    view: vscode.window.createTreeView('latex-workshop-commands', { treeDataProvider, showCollapseAll: true }),
    treeDataProvider
}
