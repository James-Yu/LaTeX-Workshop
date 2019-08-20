import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

import {Commander} from './commander'
import {LaTeXCommander} from './components/commander'
import {Logger} from './components/logger'
import {BuildInfo} from './components/buildinfo'
import {Manager} from './components/manager'
import {Builder} from './components/builder'
import {Viewer} from './components/viewer'
import {Server} from './components/server'
import {Locator} from './components/locator'
import {Parser} from './components/parser'
import {Linter} from './components/linter'
import {Cleaner} from './components/cleaner'
import {TeXMagician} from './components/texmagician'
import {EnvPair} from './components/envpair'

import {Completer} from './providers/completion'
import {CodeActions} from './providers/codeactions'
import {HoverProvider} from './providers/hover'
import {DocSymbolProvider} from './providers/docsymbol'
import {ProjectSymbolProvider} from './providers/projectsymbol'
import {SectionNodeProvider, StructureTreeView} from './providers/structure'
import {DefinitionProvider} from './providers/definition'
import {LatexFormatterProvider} from './providers/latexformatter'
import {FoldingProvider} from './providers/folding'
import { SnippetPanel } from './components/snippetpanel'

function renameValue(config: string, oldValue: string, newValue: string) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    if (!configuration.has(config)) {
        return
    }
    const originalSetting = configuration.inspect(config)
    if (originalSetting && originalSetting.globalValue === oldValue) {
        configuration.update(config, newValue, true)
    }
    if (originalSetting && originalSetting.workspaceValue === oldValue) {
        configuration.update(config, newValue, false)
    }
}

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

function combineConfig(extension: Extension, originalConfig1: string, originalConfig2: string, newConfig: string, truthTable: {[key: string]: any}) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    if (!configuration.has(originalConfig1) && !configuration.has(originalConfig2)) {
        return
    }
    const config1 = configuration.get(originalConfig1, false)
    const config2 = configuration.get(originalConfig2, false)
    if (config1 === undefined || config2 === undefined) {
        return
    }
    const key = config1.toString() + config2.toString()
    configuration.update(newConfig, truthTable[key], true)

    const msg = `"latex-workshop.${originalConfig1}" and "latex-workshop.${originalConfig2}" have been replaced by "latex-workshop.${newConfig}", which is set to "${truthTable[key]}". Please manually remove the deprecated configs from your settings.`
    const markdownMsg = `\`latex-workshop.${originalConfig1}\` and \`latex-workshop.${originalConfig2}\` have been replaced by \`latex-workshop.${newConfig}\`, which is set to \`${truthTable[key]}\`.  Please manually remove the deprecated configs from your \`settings.json\``

    extension.logger.addLogMessage(msg)
    extension.logger.displayStatus('check', 'statusBar.foreground', markdownMsg, 'warning')

    configuration.update(originalConfig1, undefined, true)
    configuration.update(originalConfig1, undefined, false)
    configuration.update(originalConfig2, undefined, true)
    configuration.update(originalConfig2, undefined, false)
}

function splitCommand(extension: Extension, config: string, newCommandConfig: string, newArgsConfig: string) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    if (!configuration.has(config)) {
        return
    }
    const originalConfig = configuration.get(config, {})
    if (originalConfig === undefined || Object.keys(originalConfig).indexOf('command') < 0) {
        return
    }
    configuration.update(newCommandConfig, originalConfig['command'])
    configuration.update(newArgsConfig, originalConfig['args'])

    const msg = `"latex-workshop.${config}" has been replaced by "latex-workshop.${newCommandConfig}" and "latex-workshop.${newArgsConfig}". Please manually remove the deprecated configs from your settings.`
    const markdownMsg = `\`latex-workshop.${config}\` has been replaced by \`latex-workshop.${newCommandConfig}\` and \`latex-workshop.${newArgsConfig}\`.  Please manually remove the deprecated configs from your \`settings.json\``

    extension.logger.addLogMessage(msg)
    extension.logger.displayStatus('check', 'statusBar.foreground', markdownMsg, 'warning')
}

function obsoleteConfigCheck(extension: Extension) {
    renameConfig('maxPrintLine.option.enabled', 'latex.option.maxPrintLine.enabled')
    renameConfig('chktex.interval', 'chktex.delay')
    renameConfig('latex.outputDir', 'latex.outDir')
    renameConfig('view.autoActivateLatex.enabled', 'view.autoFocus.enabled')
    renameConfig('hoverPreview.enabled', 'hover.preview.enabled')
    renameConfig('hoverReference.enabled', 'hover.ref.enabled')
    renameConfig('hoverCitation.enabled', 'hover.citation.enabled')
    renameConfig('hoverCommandDoc.enabled', 'hover.command.enabled')
    renameConfig('hoverPreview.scale', 'hover.preview.scale')
    renameConfig('hoverPreview.cursor.enabled', 'hover.preview.cursor.enabled')
    renameConfig('hoverPreview.cursor.symbol', 'hover.preview.cursor.symbol')
    renameConfig('hoverPreview.cursor.color', 'hover.preview.cursor.color')
    renameConfig('hoverPreview.ref.enabled', 'hover.ref.enabled')
    combineConfig(extension, 'latex.clean.enabled', 'latex.clean.onFailBuild.enabled', 'latex.autoClean.run', {
        'falsefalse': 'never',
        'falsetrue': 'onFailed',
        'truefalse': 'onBuilt',
        'truetrue': 'onBuilt'
    })
    combineConfig(extension, 'latex.autoBuild.onSave.enabled', 'latex.autoBuild.onTexChange.enabled', 'latex.autoBuild.run', {
        'falsefalse': 'never',
        'falsetrue': 'onFileChange',
        'truefalse': 'onFileChange',
        'truetrue': 'onFileChange'
    })
    renameValue('latex.autoBuild.run', 'onSave', 'onFileChange')
    renameConfig('hover.ref.numberAtLastCompilation.enabled', 'hover.ref.number.enabled')
    splitCommand(extension, 'latex.external.build.command', 'latex.external.build.command', 'latex.external.build.args')
    splitCommand(extension, 'view.pdf.external.command', 'view.pdf.external.viewer.command', 'view.pdf.external.viewer.args')
}

function checkDeprecatedFeatures(extension: Extension) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    if (configuration.get('latex.additionalBib') && (configuration.get('latex.additionalBib') as string[]).length > 0) {
        const msg = '"latex-workshop.latex.additionalBib" has been deprecated in favor of "latex-workshop.latex.bibDirs". See https://github.com/James-Yu/LaTeX-Workshop/wiki/Intellisense#Citations.'
        const markdownMsg = '`latex-workshop.latex.additionalBibs` has been deprecated in favor of  `latex-workshop.latex.bibDirs`. See the [wiki](https://github.com/James-Yu/LaTeX-Workshop/wiki/Intellisense#Citations.)'

        extension.logger.addLogMessage(msg)
        extension.logger.displayStatus('check', 'statusBar.foreground', markdownMsg, 'warning')
    }

    if (configuration.get('intellisense.surroundCommand.enabled')) {
        const msg = 'Using "\\" to surround selected text with a LaTeX command is deprecated, use ctrl+l,ctrl+w instead. See https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets#with-a-command.'
        const markdownMsg = 'Using `\\` to surround selected text with a LaTeX command is deprecated, use `ctrl+l`,`ctrl+w` instead. See the [wiki](https://github.com/James-Yu/LaTeX-Workshop/wiki/Snippets#with-a-command).'

        extension.logger.addLogMessage(msg)
        extension.logger.displayStatus('check', 'statusBar.foreground', markdownMsg, 'warning')
    }
}

function conflictExtensionCheck() {
    function check(extensionID: string, name: string, suggestion: string) {
        if (vscode.extensions.getExtension(extensionID) !== undefined) {
            vscode.window.showWarningMessage(`LaTeX Workshop is incompatible with extension "${name}". ${suggestion}`)
        }
    }
    check('tomoki1207.pdf', 'vscode-pdf', 'Please consider disabling either extension.')
}

function newVersionMessage(extensionPath: string, extension: Extension) {
    fs.readFile(`${extensionPath}${path.sep}package.json`, (err, data) => {
        if (err) {
            extension.logger.addLogMessage('Cannot read package information.')
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

    // let configuration = vscode.workspace.getConfiguration('latex-workshop')
    // if (configuration.get('bind.altKeymap.enabled')) {
    //     vscode.commands.executeCommand('setContext', 'latex-workshop:altkeymap', true)
    // } else {
    //     vscode.commands.executeCommand('setContext', 'latex-workshop:altkeymap', false)
    // }

    vscode.commands.registerCommand('latex-workshop.saveWithoutBuilding', () => extension.commander.saveWithoutBuilding())
    vscode.commands.registerCommand('latex-workshop.build', () => extension.commander.build())
    vscode.commands.registerCommand('latex-workshop.recipes', (recipe) => extension.commander.recipes(recipe))
    vscode.commands.registerCommand('latex-workshop.view', (mode) => extension.commander.view(mode))
    vscode.commands.registerCommand('latex-workshop.refresh-viewer', () => extension.commander.refresh())
    vscode.commands.registerCommand('latex-workshop.tab', () => extension.commander.view('tab'))
    vscode.commands.registerCommand('latex-workshop.kill', () => extension.commander.kill())
    vscode.commands.registerCommand('latex-workshop.synctex', () => extension.commander.synctex())
    vscode.commands.registerCommand('latex-workshop.texdoc', (pkg) => extension.commander.texdoc(pkg))
    vscode.commands.registerCommand('latex-workshop.synctexto', (line, filePath) => extension.commander.synctexonref(line, filePath))
    vscode.commands.registerCommand('latex-workshop.clean', () => extension.commander.clean())
    vscode.commands.registerCommand('latex-workshop.actions', () => extension.commander.actions())
    vscode.commands.registerCommand('latex-workshop.citation', () => extension.commander.citation())
    vscode.commands.registerCommand('latex-workshop.addtexroot', () => extension.commander.addTexRoot())
    vscode.commands.registerCommand('latex-workshop.log', (compiler) => extension.commander.log(compiler))
    vscode.commands.registerCommand('latex-workshop.code-action', (d, r, c, m) => extension.codeActions.runCodeAction(d, r, c, m))
    vscode.commands.registerCommand('latex-workshop.goto-section', (filePath, lineNumber) => extension.commander.gotoSection(filePath, lineNumber))
    vscode.commands.registerCommand('latex-workshop.navigate-envpair', () => extension.commander.navigateToEnvPair())
    vscode.commands.registerCommand('latex-workshop.select-envname', () => extension.commander.selectEnvName())
    vscode.commands.registerCommand('latex-workshop.multicursor-envname', () => extension.commander.multiCursorEnvName())
    vscode.commands.registerCommand('latex-workshop.toggle-equation-envname', () => extension.commander.toggleEquationEnv())
    vscode.commands.registerCommand('latex-workshop.close-env', () => extension.commander.closeEnv())
    vscode.commands.registerCommand('latex-workshop.wrap-env', () => extension.commander.insertSnippet('wrapEnv'))
    vscode.commands.registerCommand('latex-workshop.onEnterKey', () => extension.commander.onEnterKey())
    vscode.commands.registerCommand('latex-workshop.onAltEnterKey', () => extension.commander.onEnterKey('alt'))
    vscode.commands.registerCommand('latex-workshop.revealOutputDir', () => extension.commander.revealOutputDir())
    vscode.commands.registerCommand('latex-workshop-dev.parselog', () => extension.commander.devParseLog())
    vscode.commands.registerCommand('latex-workshop-dev.parsetex', () => extension.commander.devParseTeX())
    vscode.commands.registerCommand('latex-workshop-dev.parsebib', () => extension.commander.devParseBib())

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

    vscode.commands.registerCommand('latex-workshop.increment-sectioning', () => extension.commander.shiftSectioningLevel('increment'))
    vscode.commands.registerCommand('latex-workshop.decrement-sectioning', () => extension.commander.shiftSectioningLevel('decrement'))

    vscode.commands.registerCommand('latex-workshop.showCompilationPanel', () => extension.buildInfo.showPanel())
    vscode.commands.registerCommand('latex-workshop.showSnippetPanel', () => extension.snippetPanel.showPanel())

    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(async (e: vscode.TextDocument) => {
        if (extension.manager.hasTexId(e.languageId)) {
            extension.linter.lintRootFileIfEnabled()

            extension.structureProvider.refresh()
            extension.structureProvider.update()
        }
    }))

    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument((e: vscode.TextDocument) => {
        // This function will be called when a new text is opened, or an inactive editor is reactivated after vscode reload
        if (extension.manager.hasTexId(e.languageId)) {
            obsoleteConfigCheck(extension)
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
            extension.manager.cachedContent[e.document.fileName].content = e.document.getText()
            // extension.manager.parseFileAndSubs(e.document.fileName)
            // We don't need so frequent re-parse
            extension.linter.lintActiveFileIfEnabledAfterInterval()
        }
    }))

    let isLaTeXActive = false
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor) => {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (vscode.window.visibleTextEditors.filter(editor => extension.manager.hasTexId(editor.document.languageId)).length > 0) {
            extension.logger.status.show()
            vscode.commands.executeCommand('setContext', 'latex-workshop:enabled', true).then(() => {
                const gits = vscode.window.visibleTextEditors.filter(editor => editor.document.uri.scheme === 'git')
                if (configuration.get('view.autoFocus.enabled') && !isLaTeXActive && gits.length === 0) {
                    vscode.commands.executeCommand('workbench.view.extension.latex').then(() => vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup'))
                } else if (gits.length > 0) {
                    vscode.commands.executeCommand('workbench.view.scm').then(() => vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup'))
                }
                isLaTeXActive = true
            })
            extension.manager.findRoot()
        } else if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.languageId.toLowerCase() === 'log') {
            extension.logger.status.show()
            vscode.commands.executeCommand('setContext', 'latex-workshop:enabled', true)
        } else if (!configuration.get('view.autoFocus.enabled')) {
            extension.logger.status.hide()
            vscode.commands.executeCommand('setContext', 'latex-workshop:enabled', false)
        }

        if (e && extension.manager.hasTexId(e.document.languageId)) {
            extension.linter.lintActiveFileIfEnabled()
        } else {
            isLaTeXActive = false
        }
    }))

    extension.manager.findRoot(true)

    const formatter = new LatexFormatterProvider(extension)
    vscode.languages.registerDocumentFormattingEditProvider({ scheme: 'file', language: 'latex'}, formatter)
    vscode.languages.registerDocumentFormattingEditProvider({ scheme: 'file', language: 'bibtex'}, formatter)
    vscode.languages.registerDocumentRangeFormattingEditProvider({ scheme: 'file', language: 'latex'}, formatter)
    vscode.languages.registerDocumentRangeFormattingEditProvider({ scheme: 'file', language: 'bibtex'}, formatter)

    context.subscriptions.push(vscode.window.registerTreeDataProvider('latex-commands', new LaTeXCommander(extension)))
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection((e: vscode.TextEditorSelectionChangeEvent) => {
        if (! extension.manager.hasTexId(e.textEditor.document.languageId)) {
            return
        }
        extension.structureViewer.showCursorIteme(e)
    }))

    context.subscriptions.push(vscode.languages.registerHoverProvider({ scheme: 'file', language: 'latex'}, new HoverProvider(extension)))
    context.subscriptions.push(vscode.languages.registerDefinitionProvider({ scheme: 'file', language: 'latex'}, new DefinitionProvider(extension)))
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider({ scheme: 'file', language: 'latex'}, new DocSymbolProvider(extension)))
    context.subscriptions.push(vscode.languages.registerWorkspaceSymbolProvider(new ProjectSymbolProvider(extension)))
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'tex'}, extension.completer, '\\', '{'))
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'latex'}, extension.completer, '\\', '{', ',', '(', '['))
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'doctex'}, extension.completer, '\\', '{', ',', '(', '['))
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider({ scheme: 'file', language: 'latex'}, extension.codeActions))
    context.subscriptions.push(vscode.languages.registerFoldingRangeProvider({ scheme: 'file', language: 'latex'}, new FoldingProvider(extension)))

    extension.linter.lintRootFileIfEnabled()
    obsoleteConfigCheck(extension)
    conflictExtensionCheck()
    checkDeprecatedFeatures(extension)
    newVersionMessage(context.extensionPath, extension)

    vscode.window.visibleTextEditors.forEach(editor => {
        const e = editor.document
        if (e.languageId === 'pdf' && e.uri.scheme !== 'latex-workshop-pdf') {
            vscode.commands.executeCommand('workbench.action.closeActiveEditor').then(() => {
                extension.commander.pdf(e.uri)
            })
        }
    })

    return {
        getGraphicsPath: () => extension.completer.input.graphicsPath,
        viewer: {
            clients: extension.viewer.clients,
            refreshExistingViewer: (sourceFile?: string, viewer?: string) => extension.viewer.refreshExistingViewer(sourceFile, viewer),
            openTab: (sourceFile: string, respectOutDir: boolean = true, sideColumn: boolean = true) => extension.viewer.openTab(sourceFile, respectOutDir, sideColumn)
        },
        manager: {
            findRoot: () => extension.manager.findRoot(),
            rootDir: () => extension.manager.rootDir,
            rootFile: () => extension.manager.rootFile,
            setEnvVar: () => extension.manager.setEnvVar(),
            cachedContent: () => extension.manager.cachedContent
        },
        completer: {
            command: {
                usedPackages: () => {
                    console.warn('`completer.command.usedPackages` is deprecated. Consider use `manager.cachedContent`.')
                    let allPkgs: string[] = []
                    extension.manager.getIncludedTeX().forEach(tex => {
                        const pkgs = extension.manager.cachedContent[tex].element.package
                        if (pkgs === undefined) {
                            return
                        }
                        allPkgs = allPkgs.concat(pkgs)
                    })
                    return allPkgs
                }
            }
        }
    }
}

export class Extension {
    packageInfo
    extensionRoot: string
    logger: Logger
    buildInfo: BuildInfo
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
    texMagician: TeXMagician
    envPair: EnvPair
    structureProvider: SectionNodeProvider
    structureViewer: StructureTreeView
    snippetPanel: SnippetPanel

    constructor() {
        this.extensionRoot = path.resolve(`${__dirname}/../../`)
        this.logger = new Logger(this)
        this.buildInfo = new BuildInfo(this)
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
        this.texMagician = new TeXMagician(this)
        this.envPair = new EnvPair(this)
        this.structureProvider = new SectionNodeProvider(this)
        this.structureViewer = new StructureTreeView(this)
        this.snippetPanel = new SnippetPanel(this)

        this.logger.addLogMessage('LaTeX Workshop initialized.')
    }
}
