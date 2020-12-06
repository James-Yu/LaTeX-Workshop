import * as vscode from 'vscode'

import type { Extension } from '../main'

export class LaTeXCommander implements vscode.TreeDataProvider<LaTeXCommand> {

    extension: Extension
    private readonly commands: LaTeXCommand[] = []

    constructor(extension: Extension) {
        this.extension = extension
        this.buildCommander()
    }

    private buildCommander() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const None = vscode.TreeItemCollapsibleState.None
        const Collapsed = vscode.TreeItemCollapsibleState.Collapsed
        const buildCommand = new LaTeXCommand('Build LaTeX project', Collapsed, {command: 'latex-workshop.build', title: ''}, 'debug-start')
        this.commands.push(buildCommand)
        const recipes = configuration.get('latex.recipes') as {name: string}[]
        buildCommand.children.push(new LaTeXCommand('Clean up auxiliary files', None, {command: 'latex-workshop.clean', title: ''}, 'clear-all'))
        buildCommand.children.push(new LaTeXCommand('Terminate current compilation', None, {command: 'latex-workshop.kill', title: ''}, 'debug-stop'))
        if (recipes) {
            recipes.forEach(recipe => {
                buildCommand.children.push(new LaTeXCommand(`Recipe: ${recipe.name}`, None, {command: 'latex-workshop.recipes', title: '', arguments: [recipe.name]}, 'debug-start'))
            })
        }

        const viewCommand = new LaTeXCommand('View LaTeX PDF', Collapsed, {command: 'latex-workshop.view', title: ''}, 'open-preview')
        this.commands.push(viewCommand)
        viewCommand.children.push(new LaTeXCommand('View in VSCode tab', None, {command: 'latex-workshop.view', title: '', arguments: ['tab']}, 'open-preview'))
        viewCommand.children.push(new LaTeXCommand('View in web browser', None, {command: 'latex-workshop.view', title: '', arguments: ['browser']}, 'browser'))
        viewCommand.children.push(new LaTeXCommand('View in external viewer', None, {command: 'latex-workshop.view', title: '', arguments: ['external']}, 'preview'))
        viewCommand.children.push(new LaTeXCommand('Set default viewer', None, {command: 'latex-workshop.view', title: '', arguments: ['set']}, 'settings-gear'))
        viewCommand.children.push(new LaTeXCommand('Refresh all viewers', None, {command: 'latex-workshop.refresh-viewer', title: ''}, 'refresh'))

        const logCommand = new LaTeXCommand('View Log messages', Collapsed, {command: 'latex-workshop.log', title: ''}, 'output')
        this.commands.push(logCommand)
        logCommand.children.push(new LaTeXCommand('View LaTeX Workshop extension log', None, {command: 'latex-workshop.log', title: ''}, 'output'))
        logCommand.children.push(new LaTeXCommand('View LaTeX compiler log', None, {command: 'latex-workshop.compilerlog', title: ''}, 'output'))

        const navCommand = new LaTeXCommand('Navigate, select, and edit', Collapsed, undefined, 'edit')
        this.commands.push(navCommand)
        navCommand.children.push(new LaTeXCommand('SyncTeX from cursor', None, {command: 'latex-workshop.synctex', title: ''}, 'go-to-file'))
        navCommand.children.push(new LaTeXCommand('Navigate to matching begin/end', None, {command: 'latex-workshop.navigate-envpair', title: ''}))
        navCommand.children.push(new LaTeXCommand('Select current environment content', None, {command: 'latex-workshop.select-envcontent', title: ''}))
        navCommand.children.push(new LaTeXCommand('Select current environment name', None, {command: 'latex-workshop.select-envname', title: ''}))
        navCommand.children.push(new LaTeXCommand('Close current environment', None, {command: 'latex-workshop.close-env', title: ''}))
        navCommand.children.push(new LaTeXCommand('Surround with begin{}...\\end{}', None, {command: 'latex-workshop.wrap-env', title: ''}))
        navCommand.children.push(new LaTeXCommand('Insert %!TeX root magic comment', None, {command: 'latex-workshop.addtexroot', title: ''}))

        const miscCommand = new LaTeXCommand('Miscellaneous', Collapsed, undefined, 'menu')
        this.commands.push(miscCommand)
        miscCommand.children.push(new LaTeXCommand('Open citation browser', None, {command: 'latex-workshop.citation', title: ''}))
        miscCommand.children.push(new LaTeXCommand('Count words in LaTeX project', None, {command: 'latex-workshop.wordcount', title: ''}))
        miscCommand.children.push(new LaTeXCommand('Reveal output folder in OS', None, {command: 'latex-workshop.revealOutputDir', title: ''}, 'folder-opened'))

        const snippetPanelCommand = new LaTeXCommand('Snippet Panel', None, {command: 'latex-workshop.showSnippetPanel', title: ''}, 'symbol-operator')
        this.commands.push(snippetPanelCommand)

        const bibtexCommand = new LaTeXCommand('BibTeX actions', Collapsed, undefined, 'references')
        bibtexCommand.children.push(new LaTeXCommand('Align bibliography', None, {command: 'latex-workshop.bibalign', title: ''}))
        bibtexCommand.children.push(new LaTeXCommand('Sort bibliography', None, {command: 'latex-workshop.bibsort', title: ''}, 'sort-precedence'))
        bibtexCommand.children.push(new LaTeXCommand('Align and sort bibliography', None, {command: 'latex-workshop.bibalignsort', title: ''}))
        this.commands.push(bibtexCommand)
    }

    getTreeItem(element: LaTeXCommand): vscode.TreeItem {

        const treeItem: vscode.TreeItem = new vscode.TreeItem(element.label, element.collapsibleState)
        treeItem.command = element.command
        treeItem.iconPath = element.codicon && new vscode.ThemeIcon(element.codicon)
        // treeItem.tooltip = `Line ${element.lineNumber + 1} at ${element.fileName}`

        return treeItem
    }

    getChildren(element?: LaTeXCommand): LaTeXCommand[] {
        if (!element) {
            return this.commands
        }

        return element.children
    }
}

export class LaTeXCommand {

    public children: LaTeXCommand[] = []

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly codicon?: string
    ) {

    }
}
