'use strict'

import * as vscode from 'vscode'

import {Logger} from './logger'
import {Commander} from './commander'
import {Manager} from './manager'
import {Builder} from './builder'
import {Viewer, PDFProvider} from './viewer'
import {Server} from './server'
import {Locator} from './locator'
import {Parser} from './parser'
import {Completer} from './completer'
import {Linter} from './linter'

export async function activate(context: vscode.ExtensionContext) {
    let extension = new Extension()
    global['latex'] = extension

    vscode.commands.registerCommand('latex-workshop.build', () => extension.commander.build())
    vscode.commands.registerCommand('latex-workshop.view', () => extension.commander.view())
    vscode.commands.registerCommand('latex-workshop.tab', () => extension.commander.tab())
    vscode.commands.registerCommand('latex-workshop.synctex', () => extension.commander.synctex())

    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
        let configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (!configuration.get('build_after_save'))
            return
        if (extension.manager.isTex(e.fileName))
            extension.commander.build()
    }))

    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor) => {
        if (!vscode.window.activeTextEditor)
            extension.logger.status.hide()
        else if (!vscode.window.activeTextEditor.document.fileName)
            extension.logger.status.hide()
        else if (!extension.manager.isTex(vscode.window.activeTextEditor.document.fileName))
            extension.logger.status.hide()
        else
            extension.logger.status.show()
    }))


    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('latex-workshop-pdf', new PDFProvider(extension)))
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('latex', extension.completer, '\\', '{', ','));
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
        this.logger.addLogMessage(`LaTeX Workshop initialized.`)
    }
}