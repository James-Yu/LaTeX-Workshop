import * as vscode from 'vscode'
import * as path from 'path'

import {Logger, LogProvider} from './logger'
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
    const linter = configuration.get('chktex.enabled') as boolean
    if (linter) {
        extension.linter.lintRootFile()
    }
}

function lintActiveFileIfEnabled(extension: Extension) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const linter = configuration.get('chktex.enabled') as boolean
    if (linter) {
        extension.linter.lintActiveFile()
    }
}

function lintActiveFileIfEnabledAfterInterval(extension: Extension) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const linter = configuration.get('chktex.enabled') as boolean
    if (linter) {
        const interval = configuration.get('chktex.interval') as number
        if (extension.linter.linterTimeout) {
            clearTimeout(extension.linter.linterTimeout)
        }
        extension.linter.linterTimeout = setTimeout(() => extension.linter.lintActiveFile(), interval)
    }
}

function obsoleteConfigCheck() {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    function messageActions(selected) {
        if (selected === 'Open Settings Editor') {
            vscode.commands.executeCommand('workbench.action.openGlobalSettings')
        }
    }
    function showMessage(originalConfig: string, newConfig: string) {
        vscode.window.showWarningMessage(`Config "${originalConfig}" as been deprecated. \
                                          Please use the new "${newConfig}" config item.`,
                                         'Open Settings Editor').then(messageActions)
    }
    if (configuration.has('toolchain')) {
        showMessage('latex-workshop.toolchain', 'latex-workshop.latex.toolchain')
    }
    if (configuration.has('build_after_save')) {
        showMessage('latex-workshop.build_after_save', 'latex-workshop.latex.autoBuild.enabled')
    }
    if (configuration.has('clean_after_build')) {
        showMessage('latex-workshop.clean_after_build', 'latex-workshop.latex.clean.enabled')
    }
    if (configuration.has('files_to_clean')) {
        showMessage('latex-workshop.files_to_clean', 'latex-workshop.latex.clean.fileTypes')
    }
    if (configuration.has('synctex_command')) {
        showMessage('latex-workshop.synctex_command', 'latex-workshop.synctex.path')
    }
    if (configuration.has('linter')) {
        showMessage('latex-workshop.linter', 'latex-workshop.chktex.enabled')
    }
    if (configuration.has('linter_command')) {
        showMessage('latex-workshop.linter_command', 'latex-workshop.chktex.path')
    }
    if (configuration.has('linter_command_active_file')) {
        showMessage('latex-workshop.linter_command_active_file', 'latex-workshop.chktex.args.active')
    }
    if (configuration.has('linter_command_root_file')) {
        showMessage('latex-workshop.linter_command_root_file', 'latex-workshop.chktex.args.root')
    }
    if (configuration.has('linter_interval')) {
        showMessage('latex-workshop.linter_interval', 'latex-workshop.chktex.interval')
    }
    if (configuration.has('citation_intellisense_label')) {
        showMessage('latex-workshop.citation_intellisense_label', 'latex-workshop.intellisense.citation.label')
    }
    if (configuration.has('show_debug_log')) {
        showMessage('latex-workshop.show_debug_log', 'latex-workshop.debug.showLog')
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
    vscode.commands.registerCommand('latex-workshop.actions', () => extension.commander.actions())
    vscode.commands.registerCommand('latex-workshop.citation', () => extension.commander.citation())
    vscode.commands.registerCommand('latex-workshop.log', () => extension.commander.log())
    vscode.commands.registerCommand('latex-workshop.code-action', (d, r, c, m) => extension.codeActions.runCodeAction(d, r, c, m))

    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
        if (extension.manager.isTex(e.fileName)) {
            lintRootFileIfEnabled(extension)
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (!configuration.get('latex.autoBuild.enabled') || extension.builder.disableBuildAfterSave) {
            return
        }
        if (extension.manager.isTex(e.fileName)) {
            extension.commander.build()
        }
    }))

    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument((e: vscode.TextDocument) => {
        if (extension.manager.isTex(e.fileName)) {
            obsoleteConfigCheck()
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

    context.subscriptions.push(vscode.workspace.createFileSystemWatcher('**/*.tex', true, false, true).onDidChange((e: vscode.Uri) => {
        if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.fileName === e.fsPath) {
            return
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (!configuration.get('latex.autoBuild.enabled') || extension.builder.disableBuildAfterSave) {
            return
        }
        if (extension.manager.isTex(e.fsPath)) {
            extension.commander.build()
        }
    }))

    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('latex-workshop-pdf', new PDFProvider(extension)))
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('latex-workshop-log', extension.logProvider))
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('latex', extension.completer, '\\', '{', ','))
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider('latex', extension.codeActions))
    extension.manager.findRoot()

    // On startup, lint the whole project if enabled.
    lintRootFileIfEnabled(extension)
    obsoleteConfigCheck()
}

export class Extension {
    extensionRoot: string
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

    logProvider: LogProvider

    constructor() {
        this.extensionRoot = path.resolve(`${__dirname}/../../`)
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

        this.logProvider = new LogProvider(this)
        this.logger.addLogMessage(`LaTeX Workshop initialized.`)
    }
}
