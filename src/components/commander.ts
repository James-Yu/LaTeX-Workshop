import * as vscode from 'vscode'

import { Extension } from '../main'

export class LaTeXCommander implements vscode.TreeDataProvider<LaTeXCommand> {

    extension: Extension
    commands: LaTeXCommand[] = []

    constructor(extension: Extension) {
        this.extension = extension
        this.buildCommander()
    }

    buildCommander() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')

        const buildCommand = new LaTeXCommand('Build LaTeX project', vscode.TreeItemCollapsibleState.Collapsed, {command: 'latex-workshop.build', title: ''})
        this.commands.push(buildCommand)
        const recipes = configuration.get('latex.recipes') as {name: string}[]
        buildCommand.children.push(new LaTeXCommand(`Clean up auxiliary files`, vscode.TreeItemCollapsibleState.None, {command: 'latex-workshop.clean', title: ''}))
        buildCommand.children.push(new LaTeXCommand(`Terminate current compilation`, vscode.TreeItemCollapsibleState.None, {command: 'latex-workshop.kill', title: ''}))
        if (recipes) {
            recipes.forEach(recipe => {
                buildCommand.children.push(new LaTeXCommand(`Recipe: ${recipe.name}`, vscode.TreeItemCollapsibleState.None, {command: 'latex-workshop.recipes', title: '', arguments: [recipe.name]}))
            })
        }

        const viewCommand = new LaTeXCommand('View LaTeX PDF', vscode.TreeItemCollapsibleState.Collapsed, {command: 'latex-workshop.view', title: ''})
        this.commands.push(viewCommand)
        viewCommand.children.push(new LaTeXCommand(`View in VSCode tab`, vscode.TreeItemCollapsibleState.None, {command: 'latex-workshop.view', title: '', arguments: ['tab']}))
        viewCommand.children.push(new LaTeXCommand(`View in web browser`, vscode.TreeItemCollapsibleState.None, {command: 'latex-workshop.view', title: '', arguments: ['browser']}))
        viewCommand.children.push(new LaTeXCommand(`View in external viewer`, vscode.TreeItemCollapsibleState.None, {command: 'latex-workshop.view', title: '', arguments: ['external']}))
        viewCommand.children.push(new LaTeXCommand(`Set default viewer`, vscode.TreeItemCollapsibleState.None, {command: 'latex-workshop.view', title: '', arguments: ['set']}))
        viewCommand.children.push(new LaTeXCommand(`Refresh all viewers`, vscode.TreeItemCollapsibleState.None, {command: 'latex-workshop.refresh-viewer', title: ''}))

        const logCommand = new LaTeXCommand('View Log messages', vscode.TreeItemCollapsibleState.Collapsed, {command: 'latex-workshop.log', title: ''})
        this.commands.push(logCommand)
        logCommand.children.push(new LaTeXCommand(`View LaTeX Workshop extension log`, vscode.TreeItemCollapsibleState.None, {command: 'latex-workshop.log', title: ''}))
        logCommand.children.push(new LaTeXCommand(`View LaTeX compiler log`, vscode.TreeItemCollapsibleState.None, {command: 'latex-workshop.log', title: '', arguments: ['compiler']}))

        const navCommand = new LaTeXCommand('Navigate, select, and edit', vscode.TreeItemCollapsibleState.Collapsed)
        this.commands.push(navCommand)
        navCommand.children.push(new LaTeXCommand('SyncTeX from cursor', vscode.TreeItemCollapsibleState.None, {command: 'latex-workshop.synctex', title: ''}))
        navCommand.children.push(new LaTeXCommand('Navigate to matching begin/end', vscode.TreeItemCollapsibleState.None, {command: 'latex-workshop.navigate-envpair', title: ''}))
        navCommand.children.push(new LaTeXCommand('Select current environment name', vscode.TreeItemCollapsibleState.None, {command: 'latex-workshop.select-envname', title: ''}))
        navCommand.children.push(new LaTeXCommand('Close current environment', vscode.TreeItemCollapsibleState.None, {command: 'latex-workshop.close-env', title: ''}))
        navCommand.children.push(new LaTeXCommand('Surround with begin{}...\\end{}', vscode.TreeItemCollapsibleState.None, {command: 'latex-workshop.wrap-env', title: ''}))
        navCommand.children.push(new LaTeXCommand('Insert %!TeX root magic comment', vscode.TreeItemCollapsibleState.None, {command: 'latex-workshop.addtexroot', title: ''}))

        const miscCommand = new LaTeXCommand('Miscellaneous', vscode.TreeItemCollapsibleState.Collapsed)
        this.commands.push(miscCommand)
        miscCommand.children.push(new LaTeXCommand('Open citation browser', vscode.TreeItemCollapsibleState.None, {command: 'latex-workshop.citation', title: ''}))
        miscCommand.children.push(new LaTeXCommand('Count words in LaTeX project', vscode.TreeItemCollapsibleState.None, {command: 'latex-workshop.wordcount', title: ''}))
        miscCommand.children.push(new LaTeXCommand('Reveal output folder in OS', vscode.TreeItemCollapsibleState.None, {command: 'latex-workshop.revealOutputDir', title: ''}))
    }

    getTreeItem(element: LaTeXCommand) : vscode.TreeItem {

        const treeItem: vscode.TreeItem = new vscode.TreeItem(element.label, element.collapsibleState)
        treeItem.command = element.command
        // treeItem.tooltip = `Line ${element.lineNumber + 1} at ${element.fileName}`

        return treeItem
    }

    getChildren(element?: LaTeXCommand) : Thenable<LaTeXCommand[]> {
        if (!element) {
            return Promise.resolve(this.commands)
        }

        return Promise.resolve(element.children)
    }
}

export class LaTeXCommand extends vscode.TreeItem {

    public children: LaTeXCommand[] = []

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState)
    }
}
