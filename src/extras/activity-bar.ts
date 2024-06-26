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

async function buildCommandTree(): Promise<LaTeXCommand[]> {
    const commands: LaTeXCommand[] = []
    const configuration = vscode.workspace.getConfiguration('latex-workshop', lw.root.getWorkspace())

    const buildCommand = new LaTeXCommand(await lw.language.getLocaleString('command.build'), {command: 'latex-workshop.build'}, 'debug-start')
    const recipes = configuration.get('latex.recipes', []) as {name: string}[]
    const recipeCommands = await Promise.all(
        recipes.map(async recipe =>
            new LaTeXCommand(await lw.language.getLocaleString('activity.recipe') + `: ${recipe.name}`, {command: 'latex-workshop.recipes', arguments: [recipe.name]}, 'debug-start')))
    let node: LaTeXCommand
    node = buildNode(buildCommand, [
        new LaTeXCommand(await lw.language.getLocaleString('command.clean'), {command: 'latex-workshop.clean'}, 'clear-all'),
        new LaTeXCommand(await lw.language.getLocaleString('command.kill'), {command: 'latex-workshop.kill'}, 'debug-stop'),
        ...recipeCommands
    ])
    commands.push(node)

    const viewCommand = new LaTeXCommand(await lw.language.getLocaleString('activity.view'), {command: 'latex-workshop.view'}, 'open-preview')
    node = buildNode(viewCommand, [
        new LaTeXCommand(await lw.language.getLocaleString('activity.viewintab'), {command: 'latex-workshop.view', arguments: ['tab']}, 'open-preview'),
        new LaTeXCommand(await lw.language.getLocaleString('activity.viewinweb'), {command: 'latex-workshop.view', arguments: ['browser']}, 'browser'),
        new LaTeXCommand(await lw.language.getLocaleString('activity.viewinexternal'), {command: 'latex-workshop.view', arguments: ['external']}, 'preview'),
        new LaTeXCommand(await lw.language.getLocaleString('command.refresh-viewer'), {command: 'latex-workshop.refresh-viewer'}, 'refresh')
    ])
    commands.push(node)

    const logCommand = new LaTeXCommand(await lw.language.getLocaleString('activity.log'), {command: 'latex-workshop.log'}, 'output')
    const compilerLog = new LaTeXCommand(await lw.language.getLocaleString('command.compilerlog'), {command: 'latex-workshop.compilerlog'}, 'output')
    const latexWorkshopLog = new LaTeXCommand(await lw.language.getLocaleString('command.log'), {command: 'latex-workshop.log'}, 'output')
    node = buildNode(logCommand, [
        latexWorkshopLog,
        compilerLog
    ])
    commands.push(node)

    const navCommand = new LaTeXCommand(await lw.language.getLocaleString('activity.navigate'), undefined, 'edit')
    node= buildNode(navCommand, [
        new LaTeXCommand(await lw.language.getLocaleString('command.synctex'), {command: 'latex-workshop.synctex'}, 'go-to-file'),
        new LaTeXCommand(await lw.language.getLocaleString('command.navigate-envpair'), {command: 'latex-workshop.navigate-envpair'}),
        new LaTeXCommand(await lw.language.getLocaleString('command.select-envcontent'), {command: 'latex-workshop.select-envcontent'}),
        new LaTeXCommand(await lw.language.getLocaleString('command.select-envname'), {command: 'latex-workshop.select-envname'}),
        new LaTeXCommand(await lw.language.getLocaleString('command.close-env'), {command: 'latex-workshop.close-env'}),
        new LaTeXCommand(await lw.language.getLocaleString('command.wrap-env'), {command: 'latex-workshop.wrap-env'}),
        new LaTeXCommand(await lw.language.getLocaleString('command.addtexroot'), {command: 'latex-workshop.addtexroot'})
    ])
    commands.push(node)

    const miscCommand = new LaTeXCommand(await lw.language.getLocaleString('activity.misc'), undefined, 'menu')
    node = buildNode(miscCommand, [
        new LaTeXCommand(await lw.language.getLocaleString('command.citation'), {command: 'latex-workshop.citation'}),
        new LaTeXCommand(await lw.language.getLocaleString('command.wordcount'), {command: 'latex-workshop.wordcount'}),
        new LaTeXCommand(await lw.language.getLocaleString('command.revealoutput'), {command: 'latex-workshop.revealOutputDir'}, 'folder-opened')
    ])
    commands.push(node)

    const bibtexCommand = new LaTeXCommand(await lw.language.getLocaleString('activity.bibtex'), undefined, 'references')
    node = buildNode(bibtexCommand, [
        new LaTeXCommand(await lw.language.getLocaleString('command.bibalign'), {command: 'latex-workshop.bibalign'}),
        new LaTeXCommand(await lw.language.getLocaleString('command.bibsort'), {command: 'latex-workshop.bibsort'}, 'sort-precedence'),
        new LaTeXCommand(await lw.language.getLocaleString('command.bibalignsort'), {command: 'latex-workshop.bibalignsort'})
    ])
    commands.push(node)
    return commands
}


async function update() {
    state.commands = await buildCommandTree()
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

    async getChildren(element?: LaTeXCommand): Promise<LaTeXCommand[]> {
        if (element) {
            return element.children
        }
        if (state.commands.length > 0) {
            return state.commands
        }
        state.commands = await buildCommandTree()
        return state.commands
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
    commands: [] as LaTeXCommand[],
    view: vscode.window.createTreeView('latex-workshop-commands', { treeDataProvider, showCollapseAll: true }),
    treeDataProvider
}
