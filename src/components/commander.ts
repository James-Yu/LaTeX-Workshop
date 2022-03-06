import {Extension} from 'src/main'
import * as vscode from 'vscode'


export class LaTeXCommandTreeView {
    private readonly extension: Extension
    private readonly latexCommander: LaTeXCommanderProvider

    constructor(extension: Extension) {
        this.extension = extension
        this.latexCommander = this.extension.latexCommanderProvider
        vscode.window.createTreeView(
            'latex-workshop-commands',
            {
              treeDataProvider: this.latexCommander,
              showCollapseAll: true
            })
    }
}

export class LaTeXCommanderProvider implements vscode.TreeDataProvider<LaTeXCommand> {
    private readonly extension: Extension
    private readonly _onDidChangeTreeData: vscode.EventEmitter<LaTeXCommand | undefined> = new vscode.EventEmitter<LaTeXCommand | undefined>()
    readonly onDidChangeTreeData: vscode.Event<LaTeXCommand | undefined>
    private commands: LaTeXCommand[] = []

    constructor(extension: Extension) {
        this.extension = extension
        this.onDidChangeTreeData = this._onDidChangeTreeData.event
        vscode.workspace.onDidChangeConfiguration((ev: vscode.ConfigurationChangeEvent) => {
            if (ev.affectsConfiguration('latex-workshop.latex.recipes', this.extension.manager.getWorkspaceFolderRootDir())) {
                this.update()
            }
        })
        this.commands = this.buildCommanderTree()
    }

    update() {
        this.commands = this.buildCommanderTree()
        this._onDidChangeTreeData.fire(undefined)
    }

    private buildNode(parent: LaTeXCommand, children: LaTeXCommand[]) {
        if (children.length > 0) {
            parent.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed
            parent.children = children
            children.forEach((c) => c.parent = parent)
        }
        return parent
    }

    private buildCommanderTree(): LaTeXCommand[] {
        const commands: LaTeXCommand[] = []
        const configuration = vscode.workspace.getConfiguration('latex-workshop', this.extension.manager.getWorkspaceFolderRootDir())

        const buildCommand = new LaTeXCommand('Build LaTeX project', {command: 'latex-workshop.build'}, 'debug-start')
        const recipes = configuration.get('latex.recipes', []) as {name: string}[]
        const recipeCommands = recipes.map(recipe => new LaTeXCommand(`Recipe: ${recipe.name}`, {command: 'latex-workshop.recipes', arguments: [recipe.name]}, 'debug-start'))
        let node: LaTeXCommand
        node = this.buildNode(buildCommand, [
            new LaTeXCommand('Clean up auxiliary files', {command: 'latex-workshop.clean'}, 'clear-all'),
            new LaTeXCommand('Terminate current compilation', {command: 'latex-workshop.kill'}, 'debug-stop'),
            ...recipeCommands
        ])
        commands.push(node)

        const viewCommand = new LaTeXCommand('View LaTeX PDF', {command: 'latex-workshop.view'}, 'open-preview')
        node = this.buildNode(viewCommand, [
            new LaTeXCommand('View in VSCode tab', {command: 'latex-workshop.view', arguments: ['tab']}, 'open-preview'),
            new LaTeXCommand('View in web browser', {command: 'latex-workshop.view', arguments: ['browser']}, 'browser'),
            new LaTeXCommand('View in external viewer', {command: 'latex-workshop.view', arguments: ['external']}, 'preview'),
            new LaTeXCommand('Set default viewer', {command: 'latex-workshop.view', arguments: ['set']}, 'settings-gear'),
            new LaTeXCommand('Refresh all viewers', {command: 'latex-workshop.refresh-viewer'}, 'refresh')
        ])
        commands.push(node)

        const logCommand = new LaTeXCommand('View Log messages', {command: 'latex-workshop.log'}, 'output')
        const compilerLog = new LaTeXCommand('View LaTeX compiler log', {command: 'latex-workshop.compilerlog'}, 'output')
        const latexWorkshopLog = new LaTeXCommand('View LaTeX Workshop extension log', {command: 'latex-workshop.log'}, 'output')
        node = this.buildNode(logCommand, [
            latexWorkshopLog,
            compilerLog
        ])
        commands.push(node)

        const navCommand = new LaTeXCommand('Navigate, select, and edit', undefined, 'edit')
        node= this.buildNode(navCommand, [
            new LaTeXCommand('SyncTeX from cursor', {command: 'latex-workshop.synctex'}, 'go-to-file'),
            new LaTeXCommand('Navigate to matching begin/end', {command: 'latex-workshop.navigate-envpair'}),
            new LaTeXCommand('Select current environment content', {command: 'latex-workshop.select-envcontent'}),
            new LaTeXCommand('Select current environment name', {command: 'latex-workshop.select-envname'}),
            new LaTeXCommand('Close current environment', {command: 'latex-workshop.close-env'}),
            new LaTeXCommand('Surround with begin{}...\\end{}', {command: 'latex-workshop.wrap-env'}),
            new LaTeXCommand('Insert %!TeX root magic comment', {command: 'latex-workshop.addtexroot'})
        ])
        commands.push(node)

        const miscCommand = new LaTeXCommand('Miscellaneous', undefined, 'menu')
        node = this.buildNode(miscCommand, [
            new LaTeXCommand('Open citation browser', {command: 'latex-workshop.citation'}),
            new LaTeXCommand('Count words in LaTeX project', {command: 'latex-workshop.wordcount'}),
            new LaTeXCommand('Reveal output folder in OS', {command: 'latex-workshop.revealOutputDir'}, 'folder-opened')
        ])
        commands.push(node)

        const bibtexCommand = new LaTeXCommand('BibTeX actions', undefined, 'references')
        node = this.buildNode(bibtexCommand, [
            new LaTeXCommand('Align bibliography', {command: 'latex-workshop.bibalign'}),
            new LaTeXCommand('Sort bibliography', {command: 'latex-workshop.bibsort'}, 'sort-precedence'),
            new LaTeXCommand('Align and sort bibliography', {command: 'latex-workshop.bibalignsort'})
        ])
        commands.push(node)
        return commands
    }

    getTreeItem(element: LaTeXCommand): vscode.TreeItem {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(element.label, element.collapsibleState)
        treeItem.command = element.command
        treeItem.iconPath = element.codicon && new vscode.ThemeIcon(element.codicon)
        return treeItem
    }

    getChildren(element?: LaTeXCommand): LaTeXCommand[] {
        if (!element) {
            return this.commands
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
