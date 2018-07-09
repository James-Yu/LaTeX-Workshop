import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

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
import {TeXMagician} from './components/texmagician'
import {EnvPair} from './components/envpair'

import {Completer} from './providers/completion'
import {CodeActions} from './providers/codeactions'
import {SectionNodeProvider} from './providers/outline'
import {HoverProvider} from './providers/hover'
import {DocSymbolProvider} from './providers/docsymbol'
import {ProjectSymbolProvider} from './providers/projectsymbol'
import {DefinitionProvider} from './providers/definition'
import {LatexFormatterProvider} from './providers/latexformatter'

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
    renameConfig('debug.showUpdateMessage', 'message.update.show')
    if (configuration.has('version')) {
        configuration.update('version', undefined, true)
    }
    if (configuration.has('latex.toolchain') && !configuration.has('latex.recipes')) {
        vscode.window.showWarningMessage(`LaTeX Workshop has updated its original toolchain system to a new recipe system. Please change your "latex-workshop.latex.toolchain" setting.`,
            'Auto-change', 'More info', 'Close')
        .then(option => {
            switch (option) {
                case 'Auto-change':
                    const toolchain = (configuration.get('latex.toolchain') as {name: string, command: string}[]).map((tool, idx) => {
                        tool.name = `Step ${idx + 1}: ${tool.command}`
                        return tool
                    })
                    configuration.update('latex.tools', toolchain, true)
                    configuration.update('latex.recipes', [{name: 'toolchain', tools: toolchain.map(tool => tool.name)}], true)
                    configuration.update('latex.toolchain', undefined, true)
                    vscode.window.showInformationMessage(`A new recipe named "toolchain" is created. Please double check if it is correctly migrated in the configuration.`)
                    break
                case 'More info':
                    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(
                        'https://github.com/James-Yu/LaTeX-Workshop#recipe'))
                    break
                case 'Close':
                default:
            }
        })
    }
}

function conflictExtensionCheck() {
    function check(extensionID: string, name: string, suggestion: string) {
        if (vscode.extensions.getExtension(extensionID) !== undefined) {
            vscode.window.showWarningMessage(`LaTeX Workshop is incompatible with extension "${name}". ${suggestion}`)
        }
    }
    check('tomoki1207.pdf', 'vscode-pdf',
          'All features of "vscode-pdf" are supported by LaTeX Workshop.')
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
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (!(configuration.get('message.update.show') as boolean)) {
            return
        }
        vscode.window.showInformationMessage(`LaTeX Workshop updated to version ${extension.packageInfo.version}.`,
            'Change log', 'Star the project', 'Disable this message')
        .then(option => {
            switch (option) {
                case 'Change log':
                    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(
                        'https://github.com/James-Yu/LaTeX-Workshop/blob/master/CHANGELOG.md'))
                    break
                case 'Star the project':
                    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(
                        'https://github.com/James-Yu/LaTeX-Workshop'))
                    break
                case 'Disable this message':
                    configuration.update('message.update.show', false, true)
                    break
                default:
                    break
            }
        })
    })
}

export async function activate(context: vscode.ExtensionContext) {
    const extension = new Extension()
    global['latex'] = extension

    vscode.commands.registerCommand('latex-workshop.build', () => extension.commander.build())
    vscode.commands.registerCommand('latex-workshop.recipes', () => extension.commander.recipes())
    vscode.commands.registerCommand('latex-workshop.view', () => extension.commander.view())
    vscode.commands.registerCommand('latex-workshop.tab', () => extension.commander.tab())
    vscode.commands.registerCommand('latex-workshop.kill', () => extension.commander.kill())
    vscode.commands.registerCommand('latex-workshop.pdf', (uri: vscode.Uri | undefined) => extension.commander.pdf(uri))
    vscode.commands.registerCommand('latex-workshop.synctex', () => extension.commander.synctex())
    vscode.commands.registerCommand('latex-workshop.clean', () => extension.commander.clean())
    vscode.commands.registerCommand('latex-workshop.actions', () => extension.commander.actions())
    vscode.commands.registerCommand('latex-workshop.citation', () => extension.commander.citation())
    vscode.commands.registerCommand('latex-workshop.addtexroot', () => extension.commander.addTexRoot())
    vscode.commands.registerCommand('latex-workshop.wordcount', () => extension.commander.wordcount())
    vscode.commands.registerCommand('latex-workshop.compilerlog', () => extension.commander.compilerlog())
    vscode.commands.registerCommand('latex-workshop.log', () => extension.commander.log())
    vscode.commands.registerCommand('latex-workshop.code-action', (d, r, c, m) => extension.codeActions.runCodeAction(d, r, c, m))
    vscode.commands.registerCommand('latex-workshop.goto-section', (filePath, lineNumber) => extension.commander.gotoSection(filePath, lineNumber))
    vscode.commands.registerCommand('latex-workshop.navigate-envpair', () => extension.commander.navigateToEnvPair())
    vscode.commands.registerCommand('latex-workshop.select-envname', () => extension.commander.selectEnvName())
    vscode.commands.registerCommand('latex-workshop.multicursor-envname', () => extension.commander.multiCursorEnvName())
    vscode.commands.registerCommand('latex-workshop.close-env', () => extension.commander.closeEnv())

    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
        if (extension.manager.isTex(e.fileName)) {
            extension.linter.lintRootFileIfEnabled()
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (configuration.get('latex.autoBuild.onSave.enabled') && !extension.builder.disableBuildAfterSave) {
            if (extension.manager.isTex(e.fileName)) {
                extension.commander.build(true)
            }
        }
        if (extension.manager.isTex(e.fileName)) {
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
            extension.linter.lintActiveFileIfEnabledAfterInterval()
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
            extension.manager.findRoot().then(val => {
                if (val && val !== extension.nodeProvider.root) {
                    extension.nodeProvider.root = val
                    extension.nodeProvider.refresh()
                    extension.nodeProvider.update()
                }
            })
        }

        if (e && extension.manager.isTex(e.document.fileName)) {
            extension.linter.lintActiveFileIfEnabled()
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

    const formatter = new LatexFormatterProvider(extension)
    vscode.languages.registerDocumentFormattingEditProvider({ scheme: 'file', language: 'latex'}, formatter)
    vscode.languages.registerDocumentFormattingEditProvider({ scheme: 'file', language: 'bibtex'}, formatter)
    vscode.languages.registerDocumentRangeFormattingEditProvider({ scheme: 'file', language: 'latex'}, formatter)
    vscode.languages.registerDocumentRangeFormattingEditProvider({ scheme: 'file', language: 'bibtex'}, formatter)

    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('latex-workshop-pdf', new PDFProvider(extension)))
    context.subscriptions.push(vscode.languages.registerHoverProvider({ scheme: 'file', language: 'latex'}, new HoverProvider(extension)))
    context.subscriptions.push(vscode.languages.registerDefinitionProvider({ scheme: 'file', language: 'latex'}, new DefinitionProvider(extension)))
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider({ scheme: 'file', language: 'latex'}, new DocSymbolProvider(extension)))
    context.subscriptions.push(vscode.languages.registerWorkspaceSymbolProvider(new ProjectSymbolProvider(extension)))
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'tex'}, extension.completer, '\\', '{'))
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'latex'}, extension.completer, '\\', '{', ',', '(', '['))
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'doctex'}, extension.completer, '\\', '{', ',', '(', '['))
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider({ scheme: 'file', language: 'latex'}, extension.codeActions))
    context.subscriptions.push(vscode.window.registerTreeDataProvider('latex-outline', extension.nodeProvider))

    extension.linter.lintRootFileIfEnabled()
    obsoleteConfigCheck()
    conflictExtensionCheck()
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
    texMagician: TeXMagician
    envPair: EnvPair

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
        this.texMagician = new TeXMagician(this)
        this.envPair = new EnvPair(this)

        this.logger.addLogMessage(`LaTeX Workshop initialized.`)
    }
}
