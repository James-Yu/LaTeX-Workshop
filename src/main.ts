import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as opn from 'opn'

import {Commander} from './commander'
import {Logger} from './components/logger'
import {Manager} from './components/manager'
import {Builder} from './components/builder'
import {Viewer, PDFProvider} from './components/viewer'
import {Server} from './components/server'
import {Locator} from './components/locator'
import {Parser} from './components/parser'
import {Linter} from './components/linter'
import {Cleaner} from './components/cleaner'
import {Counter} from './components/counter'

import {Completer} from './providers/completion'
import {CodeActions} from './providers/codeactions'
import {SectionNodeProvider} from './providers/outline'
import {HoverProvider} from './providers/hover'
import {DocSymbolProvider} from './providers/docsymbol'
import {ProjectSymbolProvider} from './providers/projectsymbol'
import {DefinitionProvider} from './providers/definition'

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
    function renameConfig(originalConfig: string, newConfig: string) {
        if (!configuration.has(originalConfig)) {
            return
        }
        const originalSetting = configuration.inspect(originalConfig)
        if (originalSetting && originalSetting.globalValue !== undefined) {
            configuration.update(newConfig, originalSetting.globalValue, true)
            configuration.update(originalConfig, undefined, true)
        }
        if (originalSetting && originalSetting.workspaceValue !== undefined) {
            configuration.update(newConfig, originalSetting.workspaceValue, false)
            configuration.update(originalConfig, undefined, false)
        }
    }
    renameConfig('latex.autoBuild.enabled', 'latex.autoBuild.onSave.enabled')
    renameConfig('viewer.zoom', 'view.pdf.zoom')
    renameConfig('viewer.hand', 'view.pdf.hand')
    if (configuration.has('version')) {
        configuration.update('version', undefined, true)
    }
}

function newVersionMessage(extensionPath: string, extension: Extension) {
    fs.readFile(`${extensionPath}${path.sep}package.json`, (err, data) => {
        if (err) {
            extension.logger.addLogMessage(`Cannot read package information.`)
            return
        }
        extension.packageInfo = JSON.parse(data.toString())
        extension.logger.addLogMessage(`LaTeX Workshop version: ${extension.packageInfo.version}`)
        if (fs.existsSync(`${extensionPath}${path.sep}VERSION`) &&
            fs.readFileSync(`${extensionPath}${path.sep}VERSION`).toString() === extension.packageInfo.version) {
            return
        }
        fs.writeFileSync(`${extensionPath}${path.sep}VERSION`, extension.packageInfo.version)
        vscode.window.showInformationMessage(`LaTeX Workshop updated to version ${extension.packageInfo.version}.`,
            'Change log', 'Star the project', 'Write review')
        .then(option => {
            switch (option) {
                case 'Change log':
                    opn('https://github.com/James-Yu/LaTeX-Workshop/blob/master/CHANGELOG.md')
                    break
                case 'Write review':
                    opn('https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop#review-details')
                    break
                case 'Star the project':
                    opn('https://github.com/James-Yu/LaTeX-Workshop')
                    break
                default:
                    break
            }
        })
    })
}

export async function activate(context: vscode.ExtensionContext) {
    const extension = new Extension()

    vscode.commands.registerCommand('latex-workshop.build', () => extension.commander.build())
    vscode.commands.registerCommand('latex-workshop.view', () => extension.commander.view())
    vscode.commands.registerCommand('latex-workshop.tab', () => extension.commander.tab())
    vscode.commands.registerCommand('latex-workshop.synctex', () => extension.commander.synctex())
    vscode.commands.registerCommand('latex-workshop.clean', () => extension.commander.clean())
    vscode.commands.registerCommand('latex-workshop.actions', () => extension.commander.actions())
    vscode.commands.registerCommand('latex-workshop.citation', () => extension.commander.citation())
    vscode.commands.registerCommand('latex-workshop.wordcount', () => extension.commander.wordcount())
    vscode.commands.registerCommand('latex-workshop.compilerlog', () => extension.commander.compilerlog())
    vscode.commands.registerCommand('latex-workshop.log', () => extension.commander.log())
    vscode.commands.registerCommand('latex-workshop.code-action', (d, r, c, m) => extension.codeActions.runCodeAction(d, r, c, m))
    vscode.commands.registerCommand('latex-workshop.goto-section', (filePath, lineNumber) => extension.commander.gotoSection(filePath, lineNumber))

    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
        if (extension.manager.isTex(e.fileName)) {
            lintRootFileIfEnabled(extension)
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (!configuration.get('latex.autoBuild.onSave.enabled') || extension.builder.disableBuildAfterSave) {
            return
        }
        if (extension.manager.isTex(e.fileName)) {
            extension.commander.build()
            extension.nodeProvider.refresh()
            extension.nodeProvider.update()
        }
    }))

    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection((e: vscode.TextEditorSelectionChangeEvent) => {
        const editor = vscode.window.activeTextEditor
        if (editor && e.kind) {
            const content = editor.document.getText(new vscode.Range(e.selections[0].start, e.selections[0].end))
            if (content.length > 0 || extension.completer.command.shouldClearSelection) {
                extension.completer.command.selection = content
            }
            extension.completer.command.shouldClearSelection = content.length === 0
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

        if (e && extension.manager.isTex(e.document.fileName)) {
            lintActiveFileIfEnabled(extension)
        }
    }))

    context.subscriptions.push(vscode.workspace.createFileSystemWatcher('**/*.tex', true, false, true).onDidChange((e: vscode.Uri) => {
        if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.fileName === e.fsPath) {
            return
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (!configuration.get('latex.autoBuild.onTexChange.enabled')) {
            return
        }
        extension.logger.addLogMessage(`${e.fsPath} changed. Auto build project.`)
        const rootFile = extension.manager.findRoot()
        if (rootFile !== undefined) {
            extension.logger.addLogMessage(`Building root file: ${rootFile}`)
            extension.builder.build(extension.manager.rootFile)
        } else {
            extension.logger.addLogMessage(`Cannot find LaTeX root file.`)
        }
    }))

    extension.manager.findRoot()

    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('latex-workshop-pdf', new PDFProvider(extension)))
    context.subscriptions.push(vscode.languages.registerHoverProvider('latex', new HoverProvider(extension)))
    context.subscriptions.push(vscode.languages.registerDefinitionProvider('latex', new DefinitionProvider(extension)))
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider('latex', new DocSymbolProvider(extension)))
    context.subscriptions.push(vscode.languages.registerWorkspaceSymbolProvider(new ProjectSymbolProvider(extension)))
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('tex', extension.completer, '\\', '{'))
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('latex', extension.completer, '\\', '{', ','))
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider('latex', extension.codeActions))
    context.subscriptions.push(vscode.window.registerTreeDataProvider('latex-outline', extension.nodeProvider))

    lintRootFileIfEnabled(extension)
    obsoleteConfigCheck()
    newVersionMessage(context.extensionPath, extension)
}

export class Extension {
    packageInfo
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
    counter: Counter
    codeActions: CodeActions
    nodeProvider: SectionNodeProvider

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
        this.counter = new Counter(this)
        this.codeActions = new CodeActions(this)
        this.nodeProvider = new SectionNodeProvider(this)

        this.logger.addLogMessage(`LaTeX Workshop initialized.`)
    }
}
