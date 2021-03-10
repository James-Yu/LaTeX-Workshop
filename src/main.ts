import * as vscode from 'vscode'
import * as path from 'path'
import * as process from 'process'

import * as utils from './utils/utils'
import {Commander} from './commander'
import {LaTeXCommander} from './components/commander'
import {Logger} from './components/logger'
import {BuildInfo} from './components/buildinfo'
import {Manager, BuildEvents} from './components/manager'
import {Builder} from './components/builder'
import {Viewer} from './components/viewer'
import {Server} from './components/server'
import {Locator} from './components/locator'
import {Linter} from './components/linter'
import {Cleaner} from './components/cleaner'
import {Counter} from './components/counter'
import {TeXMagician} from './components/texmagician'
import {EnvPair} from './components/envpair'
import {Section} from './components/section'
import {CompilerLogParser} from './components/parser/compilerlog'
import {LinterLogParser} from './components/parser/linterlog'
import {UtensilsParser as PEGParser} from './components/parser/syntax'

import {Completer} from './providers/completion'
import {BibtexCompleter} from './providers/bibtexcompletion'
import {CodeActions} from './providers/codeactions'
import {DuplicateLabels} from './components/duplicatelabels'
import {HoverProvider} from './providers/hover'
import {GraphicsPreview} from './providers/preview/graphicspreview'
import {MathPreview} from './providers/preview/mathpreview'
import {MathPreviewPanel} from './components/mathpreviewpanel'
import {DocSymbolProvider} from './providers/docsymbol'
import {ProjectSymbolProvider} from './providers/projectsymbol'
import {SectionNodeProvider, StructureTreeView} from './providers/structure'
import {DefinitionProvider} from './providers/definition'
import {LatexFormatterProvider} from './providers/latexformatter'
import {FoldingProvider, WeaveFoldingProvider} from './providers/folding'
import { SnippetPanel } from './components/snippetpanel'
import { BibtexFormatter, BibtexFormatterProvider } from './providers/bibtexformatter'
import {SnippetViewProvider} from './providers/snippetview'

import {checkDeprecatedFeatures, newVersionMessage, obsoleteConfigCheck} from './config'

function conflictExtensionCheck() {
    function check(extensionID: string, name: string, suggestion: string) {
        if (vscode.extensions.getExtension(extensionID) !== undefined) {
            vscode.window.showWarningMessage(`LaTeX Workshop is incompatible with extension "${name}". ${suggestion}`)
        }
    }
    check('tomoki1207.pdf', 'vscode-pdf', 'Please consider disabling either extension.')
}

function selectDocumentsWithId(ids: string[]): vscode.DocumentSelector {
   const selector = ids.map( (id) => {
       return { scheme: 'file', language: id }
   })
   return selector
}

function registerLatexWorkshopCommands(extension: Extension) {

    vscode.commands.registerCommand('latex-workshop.saveWithoutBuilding', () => extension.commander.saveWithoutBuilding())
    vscode.commands.registerCommand('latex-workshop.build', () => extension.commander.build())
    vscode.commands.registerCommand('latex-workshop.recipes', (recipe) => extension.commander.recipes(recipe))
    vscode.commands.registerCommand('latex-workshop.view', (mode) => extension.commander.view(mode))
    vscode.commands.registerCommand('latex-workshop.refresh-viewer', () => extension.commander.refresh())
    vscode.commands.registerCommand('latex-workshop.tab', () => extension.commander.view('tab'))
    vscode.commands.registerCommand('latex-workshop.viewInBrowser', () => extension.commander.view('browser'))
    vscode.commands.registerCommand('latex-workshop.viewExternal', () => extension.commander.view('external'))
    vscode.commands.registerCommand('latex-workshop.setViewer', () => extension.commander.view('set'))
    vscode.commands.registerCommand('latex-workshop.kill', () => extension.commander.kill())
    vscode.commands.registerCommand('latex-workshop.synctex', () => extension.commander.synctex())
    vscode.commands.registerCommand('latex-workshop.texdoc', (pkg) => extension.commander.texdoc(pkg))
    vscode.commands.registerCommand('latex-workshop.texdocUsepackages', () => extension.commander.texdocUsepackages())
    vscode.commands.registerCommand('latex-workshop.synctexto', (line, filePath) => extension.commander.synctexonref(line, filePath))
    vscode.commands.registerCommand('latex-workshop.clean', () => extension.commander.clean())
    vscode.commands.registerCommand('latex-workshop.actions', () => extension.commander.actions())
    vscode.commands.registerCommand('latex-workshop.citation', () => extension.commander.citation())
    vscode.commands.registerCommand('latex-workshop.addtexroot', () => extension.commander.addTexRoot())
    vscode.commands.registerCommand('latex-workshop.wordcount', () => extension.commander.wordcount())
    vscode.commands.registerCommand('latex-workshop.log', () => extension.commander.log())
    vscode.commands.registerCommand('latex-workshop.compilerlog', () => extension.commander.log('compiler'))
    vscode.commands.registerCommand('latex-workshop.code-action', (d, r, c, m) => extension.codeActions.runCodeAction(d, r, c, m))
    vscode.commands.registerCommand('latex-workshop.goto-section', (filePath, lineNumber) => extension.commander.gotoSection(filePath, lineNumber))
    vscode.commands.registerCommand('latex-workshop.navigate-envpair', () => extension.commander.navigateToEnvPair())
    vscode.commands.registerCommand('latex-workshop.select-envcontent', () => extension.commander.selectEnvContent())
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

    vscode.commands.registerCommand('latex-workshop.promote-sectioning', () => extension.commander.shiftSectioningLevel('promote'))
    vscode.commands.registerCommand('latex-workshop.demote-sectioning', () => extension.commander.shiftSectioningLevel('demote'))
    vscode.commands.registerCommand('latex-workshop.select-section', () => extension.commander.selectSection())

    vscode.commands.registerCommand('latex-workshop.showCompilationPanel', () => extension.buildInfo.showPanel())
    vscode.commands.registerCommand('latex-workshop.showSnippetPanel', () => extension.snippetPanel.showPanel())

    vscode.commands.registerCommand('latex-workshop.bibsort', () => extension.bibtexFormatter.bibtexFormat(true, false))
    vscode.commands.registerCommand('latex-workshop.bibalign', () => extension.bibtexFormatter.bibtexFormat(false, true))
    vscode.commands.registerCommand('latex-workshop.bibalignsort', () => extension.bibtexFormatter.bibtexFormat(true, true))

    vscode.commands.registerCommand('latex-workshop.openMathPreviewPanel', () => extension.commander.openMathPreviewPanel())
    vscode.commands.registerCommand('latex-workshop.closeMathPreviewPanel', () => extension.commander.closeMathPreviewPanel())
    vscode.commands.registerCommand('latex-workshop.toggleMathPreviewPanel', () => extension.commander.toggleMathPreviewPanel())

}

export function activate(context: vscode.ExtensionContext) {
    const extension = new Extension()
    vscode.commands.executeCommand('setContext', 'latex-workshop:enabled', true)

    // let configuration = vscode.workspace.getConfiguration('latex-workshop')
    // if (configuration.get('bind.altKeymap.enabled')) {
    //     vscode.commands.executeCommand('setContext', 'latex-workshop:altkeymap', true)
    // } else {
    //     vscode.commands.executeCommand('setContext', 'latex-workshop:altkeymap', false)
    // }

    registerLatexWorkshopCommands(extension)

    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument( (e: vscode.TextDocument) => {
        if (extension.manager.hasTexId(e.languageId)) {
            extension.linter.lintRootFileIfEnabled()

            extension.structureProvider.refresh()
            extension.structureProvider.update()
            const configuration = vscode.workspace.getConfiguration('latex-workshop')
            if (configuration.get('latex.autoBuild.run') as string === BuildEvents.onSave) {
                if (extension.builder.disableBuildAfterSave) {
                    extension.logger.addLogMessage('Auto Build Run is temporarily disabled during a second.')
                    return
                }
                extension.logger.addLogMessage(`Auto build started on saving file: ${e.fileName}`)
                extension.commander.build(true)
            }
        }
    }))

    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(async (e: vscode.TextDocument) => {
        // This function will be called when a new text is opened, or an inactive editor is reactivated after vscode reload
        if (extension.manager.hasTexId(e.languageId)) {
            obsoleteConfigCheck(extension)
            await extension.manager.findRoot()
        }

        if (e.languageId === 'pdf') {
            extension.manager.watchPdfFile(e.uri.fsPath)
            vscode.commands.executeCommand('workbench.action.closeActiveEditor').then(() => {
                extension.commander.pdf(e.uri)
            })
        }
    }))

    let updateCompleter: NodeJS.Timeout
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        if (!extension.manager.hasTexId(e.document.languageId)) {
            return
        }
        extension.linter.lintActiveFileIfEnabledAfterInterval()
        if (extension.manager.cachedContent[e.document.fileName] === undefined) {
            return
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const content = utils.stripComments(e.document.getText())
        extension.manager.cachedContent[e.document.fileName].content = content
        if (configuration.get('intellisense.update.aggressive.enabled')) {
            if (updateCompleter) {
                clearTimeout(updateCompleter)
            }
            updateCompleter = setTimeout(() => {
                const file = e.document.uri.fsPath
                extension.manager.parseFileAndSubs(file, extension.manager.rootFile)
                extension.manager.updateCompleter(file, content)
            }, configuration.get('intellisense.update.delay', 1000))
        }
    }))

    let isLaTeXActive = false
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(async (e: vscode.TextEditor | undefined) => {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (vscode.window.visibleTextEditors.filter(editor => extension.manager.hasTexId(editor.document.languageId)).length > 0) {
            extension.logger.status.show()
            vscode.commands.executeCommand('setContext', 'latex-workshop:enabled', true).then(() => {
                if (configuration.get('view.autoFocus.enabled') && !isLaTeXActive) {
                    vscode.commands.executeCommand('workbench.view.extension.latex').then(() => vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup'))
                }
                isLaTeXActive = true
            })
        } else if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.languageId.toLowerCase() === 'log') {
            extension.logger.status.show()
            vscode.commands.executeCommand('setContext', 'latex-workshop:enabled', true)
        }

        if (e && extension.manager.hasTexId(e.document.languageId)) {
            await extension.manager.findRoot()
            extension.linter.lintRootFileIfEnabled()
        } else {
            isLaTeXActive = false
        }
    }))

    const latexSelector = selectDocumentsWithId(['latex', 'latex-expl3', 'jlweave', 'rsweave'])
    const weaveSelector = selectDocumentsWithId(['jlweave', 'rsweave'])
    const latexDoctexSelector = selectDocumentsWithId(['latex', 'latex-expl3', 'jlweave', 'rsweave', 'doctex'])
    const latexFormatter = new LatexFormatterProvider(extension)
    const bibtexFormatter = new BibtexFormatterProvider(extension)
    vscode.languages.registerDocumentFormattingEditProvider(latexSelector, latexFormatter)
    vscode.languages.registerDocumentFormattingEditProvider({ scheme: 'file', language: 'bibtex'}, bibtexFormatter)
    vscode.languages.registerDocumentRangeFormattingEditProvider(latexSelector, latexFormatter)
    vscode.languages.registerDocumentRangeFormattingEditProvider({ scheme: 'file', language: 'bibtex'}, bibtexFormatter)

    context.subscriptions.push(vscode.window.registerTreeDataProvider('latex-commands', new LaTeXCommander(extension)))
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection((e: vscode.TextEditorSelectionChangeEvent) => {
        if (! extension.manager.hasTexId(e.textEditor.document.languageId)) {
            return
        }
        extension.structureViewer.showCursorIteme(e)
    }))

    context.subscriptions.push(vscode.window.registerWebviewPanelSerializer('latex-workshop-pdf', extension.viewer.pdfViewerPanelSerializer))
    context.subscriptions.push(vscode.window.registerWebviewPanelSerializer('latex-workshop-mathpreview', extension.mathPreviewPanel.mathPreviewPanelSerializer))

    context.subscriptions.push(vscode.languages.registerHoverProvider(latexSelector, new HoverProvider(extension)))
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(latexSelector, new DefinitionProvider(extension)))
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(latexSelector, new DocSymbolProvider(extension)))
    context.subscriptions.push(vscode.languages.registerWorkspaceSymbolProvider(new ProjectSymbolProvider(extension)))

    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const userTriggersLatex = configuration.get('intellisense.triggers.latex') as string[]
    const latexTriggers = ['\\', '{', ',', '(', '['].concat(userTriggersLatex)
    extension.logger.addLogMessage(`Trigger characters for intellisense of LaTeX documents: ${JSON.stringify(latexTriggers)}`)

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'tex'}, extension.completer, '\\', '{'))
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(latexDoctexSelector, extension.completer, ...latexTriggers))
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'bibtex'}, new BibtexCompleter(extension), '@'))

    context.subscriptions.push(vscode.languages.registerCodeActionsProvider(latexSelector, extension.codeActions))
    context.subscriptions.push(vscode.languages.registerFoldingRangeProvider(latexSelector, new FoldingProvider(extension)))
    context.subscriptions.push(vscode.languages.registerFoldingRangeProvider(weaveSelector, new WeaveFoldingProvider(extension)))

    context.subscriptions.push(vscode.window.registerWebviewViewProvider('latex-snippet-view', new SnippetViewProvider(extension), {webviewOptions: {retainContextWhenHidden: true}}))

    extension.manager.findRoot().then(() => extension.linter.lintRootFileIfEnabled())
    obsoleteConfigCheck(extension)
    conflictExtensionCheck()
    checkDeprecatedFeatures(extension)
    newVersionMessage(context.extensionPath, extension)

    // If VS Code started with PDF files, we must explicitly execute `commander.pdf` for the PDF files.
    vscode.window.visibleTextEditors.forEach(editor => {
        const e = editor.document
        if (e.languageId === 'pdf') {
            vscode.commands.executeCommand('workbench.action.closeActiveEditor').then(() => {
                extension.commander.pdf(e.uri)
            })
        }
    })

    return {
        getGraphicsPath: () => extension.completer.input.graphicsPath,
        builder: {
            isBuildFinished: process.env['LATEXWORKSHOP_CI'] ? ( () => extension.builder.isBuildFinished() ) : undefined
        },
        viewer: {
            clients: extension.viewer.clients,
            getViewerStatus: process.env['LATEXWORKSHOP_CI'] ? ( (pdfFilePath: string) => extension.viewer.getViewerState(pdfFilePath) ) : undefined,
            refreshExistingViewer: (sourceFile?: string, viewer?: string) => extension.viewer.refreshExistingViewer(sourceFile, viewer),
            openTab: (sourceFile: string, respectOutDir: boolean = true, column: string = 'right') => extension.viewer.openTab(sourceFile, respectOutDir, column)
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
            },
            provideCompletionItems: process.env['LATEXWORKSHOP_CI'] ? ((
                document: vscode.TextDocument,
                position: vscode.Position,
                token: vscode.CancellationToken,
                cxt: vscode.CompletionContext
            ) => extension.completer.provideCompletionItems(document, position, token, cxt)) : undefined
        }
    }
}

export class Extension {
    packageInfo: { version?: string } = {}
    readonly extensionRoot: string
    readonly logger: Logger
    readonly buildInfo: BuildInfo
    readonly commander: Commander
    readonly manager: Manager
    readonly builder: Builder
    readonly viewer: Viewer
    readonly server: Server
    readonly locator: Locator
    readonly compilerLogParser: CompilerLogParser
    readonly linterLogParser: LinterLogParser
    readonly pegParser: PEGParser
    readonly completer: Completer
    readonly linter: Linter
    readonly cleaner: Cleaner
    readonly counter: Counter
    readonly codeActions: CodeActions
    readonly texMagician: TeXMagician
    readonly envPair: EnvPair
    readonly section: Section
    readonly structureProvider: SectionNodeProvider
    readonly structureViewer: StructureTreeView
    readonly snippetPanel: SnippetPanel
    readonly graphicsPreview: GraphicsPreview
    readonly mathPreview: MathPreview
    readonly bibtexFormatter: BibtexFormatter
    readonly mathPreviewPanel: MathPreviewPanel
    readonly duplicateLabels: DuplicateLabels

    constructor() {
        this.extensionRoot = path.resolve(`${__dirname}/../../`)
        // We must create an instance of Logger first to enable
        // adding log messages during initialization.
        this.logger = new Logger()
        this.logger.addLogMessage(`Extension root: ${this.extensionRoot}`)
        this.logger.addLogMessage(`$PATH: ${process.env.PATH}`)
        this.logger.addLogMessage(`$SHELL: ${process.env.SHELL}`)
        this.buildInfo = new BuildInfo(this)
        this.commander = new Commander(this)
        this.manager = new Manager(this)
        this.builder = new Builder(this)
        this.viewer = new Viewer(this)
        this.server = new Server(this)
        this.locator = new Locator(this)
        this.compilerLogParser = new CompilerLogParser(this)
        this.linterLogParser = new LinterLogParser(this)
        this.completer = new Completer(this)
        this.duplicateLabels = new DuplicateLabels(this)
        this.linter = new Linter(this)
        this.cleaner = new Cleaner(this)
        this.counter = new Counter(this)
        this.codeActions = new CodeActions(this)
        this.texMagician = new TeXMagician(this)
        this.envPair = new EnvPair(this)
        this.section = new Section(this)
        this.structureProvider = new SectionNodeProvider(this)
        this.structureViewer = new StructureTreeView(this)
        this.snippetPanel = new SnippetPanel(this)
        this.pegParser = new PEGParser()
        this.graphicsPreview = new GraphicsPreview(this)
        this.mathPreview = new MathPreview(this)
        this.bibtexFormatter = new BibtexFormatter(this)
        this.mathPreviewPanel = new MathPreviewPanel(this)
        this.logger.addLogMessage('LaTeX Workshop initialized.')
    }
}
