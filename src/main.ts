import * as vscode from 'vscode'

import {Logger} from './logger'
import {Commander} from './commander'
import {Manager} from './manager'
import {Builder} from './builder'
import {CodeActions} from './codeactions'
import {Viewer, PDFProvider} from './viewer'
import {Server} from './server'
import {Locator} from './locator'
import {Parser} from './parser'
import {Completer} from './completer'
import {Linter} from './linter'
import {Cleaner} from './cleaner'

function lintRootFileIfEnabled(extension: Extension) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const linter = configuration.get('linter') as boolean
    if (linter) {
        extension.linter.lintRootFile()
    }
}

function lintActiveFileIfEnabled(extension: Extension) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const linter = configuration.get('linter') as boolean
    if (linter) {
        extension.linter.lintActiveFile()
    }
}

function lintActiveFileIfEnabledAfterInterval(extension: Extension) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const linter = configuration.get('linter') as boolean
    if (linter) {
        const interval = configuration.get('linter_interval') as number
        if (extension.linter.linterTimeout) {
            clearTimeout(extension.linter.linterTimeout)
        }
        extension.linter.linterTimeout = setTimeout(() => extension.linter.lintActiveFile(), interval)
    }
}

export async function activate(context: vscode.ExtensionContext) {
    const extension = new Extension()
    global['latex'] = extension

    vscode.commands.registerCommand('latex-workshop.build', () => extension.commander.build())
    vscode.commands.registerCommand('latex-workshop.view', () => extension.commander.view())
    vscode.commands.registerCommand('latex-workshop.tab', () => extension.commander.tab())
    vscode.commands.registerCommand('latex-workshop.synctex', () => extension.commander.synctex())
    vscode.commands.registerCommand('latex-workshop.clean', () => extension.commander.clean())
    vscode.commands.registerCommand('latex-workshop.code-action', (d, r, c, m) => extension.codeActions.runCodeAction(d, r, c, m))

    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
        if (extension.manager.isTex(e.fileName)) {
            lintRootFileIfEnabled(extension)
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (!configuration.get('build_after_save') || extension.builder.disableBuildAfterSave) {
            return
        }
        if (extension.manager.isTex(e.fileName)) {
            extension.commander.build()
        }
    }))

    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument((e: vscode.TextDocument) => {
        if (extension.manager.isTex(e.fileName)) {
            extension.manager.findRoot()
        }
    }))

    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        if (extension.manager.isTex(e.document.fileName)) {
            lintActiveFileIfEnabledAfterInterval(extension)
        }
    }))

    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor) => {
        if (!vscode.window.activeTextEditor) {
            extension.logger.status.hide()
        } else if (!vscode.window.activeTextEditor.document.fileName) {
            extension.logger.status.hide()
        } else if (!extension.manager.isTex(vscode.window.activeTextEditor.document.fileName)) {
            extension.logger.status.hide()
        } else {
            extension.logger.status.show()
        }

        if (vscode.window.activeTextEditor) {
            extension.manager.findRoot()
        }

        if (extension.manager.isTex(e.document.fileName)) {
            lintActiveFileIfEnabled(extension)
        }
    }))

    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('latex-workshop-pdf', new PDFProvider(extension)))
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('latex', extension.completer, '\\', '{', ','))
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider('latex', extension.codeActions))
    extension.manager.findRoot()

    // On startup, lint the whole project if enabled.
    lintRootFileIfEnabled(extension)
}

export class Extension {
    logger: Logger
    commander: Commander
    manager: Manager
    builder: Builder
    viewer: Viewer
    server: Server
    locator: Locator
    parser: Parser
    completer: Completer
    linter: Linter
    cleaner: Cleaner
    codeActions: CodeActions

    constructor() {
        this.logger = new Logger(this)
        this.commander = new Commander(this)
        this.manager = new Manager(this)
        this.builder = new Builder(this)
        this.viewer = new Viewer(this)
        this.server = new Server(this)
        this.locator = new Locator(this)
        this.parser = new Parser(this)
        this.completer = new Completer(this)
        this.linter = new Linter(this)
        this.cleaner = new Cleaner(this)
        this.codeActions = new CodeActions(this)
        this.logger.addLogMessage(`LaTeX Workshop initialized.`)
    }
}
