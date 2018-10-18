import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

import {Commander} from './commander'
import {LaTeXCommander} from './components/commander'
import {Logger} from './components/logger'
import {Manager} from './components/manager'
import {Builder} from './components/builder'
import {Viewer} from './components/viewer'
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
import {HoverProvider} from './providers/hover'
import {DocSymbolProvider} from './providers/docsymbol'
import {ProjectSymbolProvider} from './providers/projectsymbol'
import {SectionNodeProvider} from './providers/structure'
import {DefinitionProvider} from './providers/definition'
import {LatexFormatterProvider} from './providers/latexformatter'

function renameConfig(originalConfig: string, newConfig: string) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
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

function obsoleteConfigCheck() {
    renameConfig('placeholder', '')
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
    vscode.commands.executeCommand('setContext', 'latex-workshop:enabled', true)

    vscode.commands.registerCommand('latex-workshop.build', () => extension.commander.build())
    vscode.commands.registerCommand('latex-workshop.recipes', (recipe) => extension.commander.recipes(recipe))
    vscode.commands.registerCommand('latex-workshop.view', (mode) => extension.commander.view(mode))
    vscode.commands.registerCommand('latex-workshop.tab', () => extension.commander.tab())
    vscode.commands.registerCommand('latex-workshop.kill', () => extension.commander.kill())
    vscode.commands.registerCommand('latex-workshop.synctex', () => extension.commander.synctex())
    vscode.commands.registerCommand('latex-workshop.clean', () => extension.commander.clean())
    vscode.commands.registerCommand('latex-workshop.actions', () => extension.commander.actions())
    vscode.commands.registerCommand('latex-workshop.citation', () => extension.commander.citation())
    vscode.commands.registerCommand('latex-workshop.addtexroot', () => extension.commander.addTexRoot())
    vscode.commands.registerCommand('latex-workshop.wordcount', () => extension.commander.wordcount())
    vscode.commands.registerCommand('latex-workshop.log', (compiler) => extension.commander.log(compiler))
    vscode.commands.registerCommand('latex-workshop.code-action', (d, r, c, m) => extension.codeActions.runCodeAction(d, r, c, m))
    vscode.commands.registerCommand('latex-workshop.goto-section', (filePath, lineNumber) => extension.commander.gotoSection(filePath, lineNumber))
    vscode.commands.registerCommand('latex-workshop.navigate-envpair', () => extension.commander.navigateToEnvPair())
    vscode.commands.registerCommand('latex-workshop.select-envname', () => extension.commander.selectEnvName())
    vscode.commands.registerCommand('latex-workshop.multicursor-envname', () => extension.commander.multiCursorEnvName())
    vscode.commands.registerCommand('latex-workshop.close-env', () => extension.commander.closeEnv())
    vscode.commands.registerCommand('latex-workshop.onEnterKey', () => extension.commander.onEnterKey())
    vscode.commands.registerCommand('latex-workshop.onAltEnterKey', () => extension.commander.onEnterKey('alt'))
    vscode.commands.registerCommand('latex-workshop-dev.parselog', () => extension.commander.devParseLog())

    vscode.commands.registerCommand('latex-workshop.shortcut.item', () => extension.commander.insertSnippet('item'))
    vscode.commands.registerCommand('latex-workshop.shortcut.emph', () => extension.commander.toggleSelectedKeyword('emph'))
    vscode.commands.registerCommand('latex-workshop.shortcut.textbf', () => extension.commander.toggleSelectedKeyword('textbf'))
    vscode.commands.registerCommand('latex-workshop.shortcut.textit', () => extension.commander.toggleSelectedKeyword('textit'))
    vscode.commands.registerCommand('latex-workshop.shortcut.underline', () => extension.commander.toggleSelectedKeyword('underline'))
    vscode.commands.registerCommand('latex-workshop.shortcut.textrm', () => extension.commander.toggleSelectedKeyword('textrm'))
    vscode.commands.registerCommand('latex-workshop.shortcut.texttt', () => extension.commander.toggleSelectedKeyword('texttt'))
    vscode.commands.registerCommand('latex-workshop.shortcut.textsl', () => extension.commander.toggleSelectedKeyword('textsl'))
    vscode.commands.registerCommand('latex-workshop.shortcut.textsc', () => extension.commander.toggleSelectedKeyword('textsc'))
    vscode.commands.registerCommand('latex-workshop.shortcut.textnormal', () => extension.commander.toggleSelectedKeyword('textnormal'))
    vscode.commands.registerCommand('latex-workshop.shortcut.textsuperscript', () => extension.commander.toggleSelectedKeyword('textsuperscript'))
    vscode.commands.registerCommand('latex-workshop.shortcut.textsubscript', () => extension.commander.toggleSelectedKeyword('textsubscript'))
    vscode.commands.registerCommand('latex-workshop.shortcut.mathbf', () => extension.commander.toggleSelectedKeyword('mathbf'))
    vscode.commands.registerCommand('latex-workshop.shortcut.mathit', () => extension.commander.toggleSelectedKeyword('mathit'))
    vscode.commands.registerCommand('latex-workshop.shortcut.mathrm', () => extension.commander.toggleSelectedKeyword('mathrm'))
    vscode.commands.registerCommand('latex-workshop.shortcut.mathtt', () => extension.commander.toggleSelectedKeyword('mathtt'))
    vscode.commands.registerCommand('latex-workshop.shortcut.mathsf', () => extension.commander.toggleSelectedKeyword('mathsf'))
    vscode.commands.registerCommand('latex-workshop.shortcut.mathbb', () => extension.commander.toggleSelectedKeyword('mathbb'))
    vscode.commands.registerCommand('latex-workshop.shortcut.mathcal', () => extension.commander.toggleSelectedKeyword('mathcal'))
    vscode.commands.registerCommand('latex-workshop.surround', () => extension.completer.command.surround())

    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
        if (extension.manager.hasTexId(e.languageId)) {
            extension.linter.lintRootFileIfEnabled()

            extension.structureProvider.refresh()
            extension.structureProvider.update()

            const configuration = vscode.workspace.getConfiguration('latex-workshop')
            if (configuration.get('latex.autoBuild.onSave.enabled') && !extension.builder.disableBuildAfterSave) {
                extension.logger.addLogMessage(`Auto-build ${e.fileName} upon save.`)
                extension.commander.build(true)
            }
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
        if (extension.manager.hasTexId(e.languageId)) {
            obsoleteConfigCheck()
            extension.manager.findRoot()

            extension.structureProvider.refresh()
            extension.structureProvider.update()
        }

        if (e.languageId === 'pdf' && e.uri.scheme !== 'latex-workshop-pdf') {
            vscode.commands.executeCommand('workbench.action.closeActiveEditor').then(() => {
                extension.commander.pdf(e.uri)
            })
        }
    }))

    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        if (extension.manager.hasTexId(e.document.languageId)) {
            extension.linter.lintActiveFileIfEnabledAfterInterval()

            // const previousRoot = extension.manager.rootFile
            // extension.manager.findRoot().then(rootFile => {
            //     if (rootFile === undefined || rootFile === previousRoot) {
            //         return
            //     }
            //     extension.structureProvider.refresh()
            //     extension.structureProvider.update()
            // })
        }
    }))

    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor) => {
        if (!vscode.window.activeTextEditor) {
            extension.logger.status.hide()
            vscode.commands.executeCommand('setContext', 'latex-workshop:enabled', false)
        } else if (!vscode.window.activeTextEditor.document.fileName) {
            extension.logger.status.hide()
            vscode.commands.executeCommand('setContext', 'latex-workshop:enabled', false)
        } else if (!extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId) &&
            vscode.window.activeTextEditor.document.languageId.toLowerCase() !== 'log') {
            extension.logger.status.hide()
            vscode.commands.executeCommand('setContext', 'latex-workshop:enabled', false)
        } else {
            extension.logger.status.show()
            vscode.commands.executeCommand('setContext', 'latex-workshop:enabled', true)
        }

        if (e && extension.manager.hasTexId(e.document.languageId)) {
            extension.linter.lintActiveFileIfEnabled()
        }
    }))

    context.subscriptions.push(vscode.workspace.createFileSystemWatcher('**/*.tex', true, false, true).onDidChange((e: vscode.Uri) => {
        if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.fileName === e.fsPath) {
            return
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (!configuration.get('latex.autoBuild.onTexChange.enabled') || extension.builder.disableBuildAfterSave) {
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

    context.subscriptions.push(vscode.window.registerTreeDataProvider('latex-commands', new LaTeXCommander(extension)))
    context.subscriptions.push(vscode.window.registerTreeDataProvider('latex-structure', extension.structureProvider))
    context.subscriptions.push(vscode.languages.registerHoverProvider({ scheme: 'file', language: 'latex'}, new HoverProvider(extension)))
    context.subscriptions.push(vscode.languages.registerDefinitionProvider({ scheme: 'file', language: 'latex'}, new DefinitionProvider(extension)))
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider({ scheme: 'file', language: 'latex'}, new DocSymbolProvider(extension)))
    context.subscriptions.push(vscode.languages.registerWorkspaceSymbolProvider(new ProjectSymbolProvider(extension)))
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'tex'}, extension.completer, '\\', '{'))
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'latex'}, extension.completer, '\\', '{', ',', '(', '['))
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'doctex'}, extension.completer, '\\', '{', ',', '(', '['))
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider({ scheme: 'file', language: 'latex'}, extension.codeActions))

    extension.linter.lintRootFileIfEnabled()
    obsoleteConfigCheck()
    conflictExtensionCheck()
    newVersionMessage(context.extensionPath, extension)

    vscode.window.visibleTextEditors.forEach(editor => {
        const e = editor.document
        if (e.languageId === 'pdf' && e.uri.scheme !== 'latex-workshop-pdf') {
            vscode.commands.executeCommand('workbench.action.closeActiveEditor').then(() => {
                extension.commander.pdf(e.uri)
            })
        }
    })
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
    texMagician: TeXMagician
    envPair: EnvPair
    structureProvider: SectionNodeProvider

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
        this.texMagician = new TeXMagician(this)
        this.envPair = new EnvPair(this)
        this.structureProvider = new SectionNodeProvider(this)

        this.logger.addLogMessage(`LaTeX Workshop initialized.`)
    }
}
