import * as vscode from 'vscode'
import * as path from 'path'
import { lw } from './lw'
lw.extensionRoot = path.resolve(`${__dirname}/../../`)
import { log } from './utils/logger'
lw.log = log.getLogger
import { event } from './core/event'
lw.event = event
import { file } from './core/file'
lw.file = file
import { watcher } from './core/watcher'
lw.watcher = watcher
import { cache } from './core/cache'
lw.cache = cache
import { root } from './core/root'
lw.root = root
import { compile } from './compile'
lw.compile = compile
import { server, viewer } from './preview'
lw.server = server
lw.viewer = viewer
import { locate } from './locate'
lw.locate = locate

import { MathPreviewPanelSerializer } from './extras/math-preview-panel'
import { BibtexCompleter } from './completion/bibtex'
import { HoverProvider } from './preview/hover'
import { DocSymbolProvider } from './language/symbol-document'
import { ProjectSymbolProvider } from './language/symbol-project'
import { DefinitionProvider } from './language/definition'
import { latexFormatterProvider } from './lint/latex-formatter'
import { FoldingProvider, WeaveFoldingProvider } from './language/folding'
import { SelectionRangeProvider } from './language/selection'
import { bibtexFormat, bibtexFormatterProvider } from './lint/bibtex-formatter'

import { Cleaner } from './extras/cleaner'
import { LaTeXCommanderTreeView } from './extras/activity-bar'
import { Counter } from './extras/counter'
import { dupLabelDetector } from './lint/duplicate-label'
import { Linter } from './lint/latex-linter'
import { MathPreviewPanel } from './extras/math-preview-panel'
import { Section } from './extras/section'
import { SnippetView } from './extras/snippet-view'
import { TeXMagician } from './extras/texroot'
import { CodeActions } from './lint/latex-code-actions'
import { AtSuggestionCompleter, Completer } from './completion/latex'
import { GraphicsPreview } from './preview/graphics'
import { MathPreview } from './preview/math/mathpreview'
import { StructureView } from './outline/project'
import { TeXDoc } from './extras/texdoc'
import { parser } from './parse/parser'
import { MathJaxPool } from './preview/math/mathjaxpool'
import * as commander from './core/commands'

const logger = lw.log('Extension')

function initialize(extensionContext: vscode.ExtensionContext) {
    lw.onDispose(undefined, extensionContext.subscriptions)
    lw.completer = new Completer()
    lw.atSuggestionCompleter = new AtSuggestionCompleter()
    lw.linter = new Linter()
    lw.cleaner = new Cleaner()
    lw.counter = new Counter()
    lw.texdoc = new TeXDoc()
    lw.codeActions = new CodeActions()
    lw.texMagician = new TeXMagician()
    lw.section = new Section()
    lw.dupLabelDetector = dupLabelDetector
    lw.latexCommanderTreeView = new LaTeXCommanderTreeView()
    lw.structureViewer = new StructureView()
    lw.snippetView = new SnippetView()
    lw.graphicsPreview = new GraphicsPreview()
    lw.mathPreview = new MathPreview()
    lw.mathPreviewPanel = new MathPreviewPanel()
    lw.commands = commander

    void parser.reset()
    log.initStatusBarItem()

    logger.log('Initializing LaTeX Workshop.')
    logger.log(`Extension root: ${lw.extensionRoot}`)
    logger.log(`$PATH: ${process.env.PATH}`)
    logger.log(`$SHELL: ${process.env.SHELL}`)
    logger.log(`$LANG: ${process.env.LANG}`)
    logger.log(`$LC_ALL: ${process.env.LC_ALL}`)
    logger.log(`process.platform: ${process.platform}`)
    logger.log(`process.arch: ${process.arch}`)
    logger.log(`vscode.env.appName: ${vscode.env.appName}`)
    logger.log(`vscode.env.remoteName: ${vscode.env.remoteName}`)
    logger.log(`vscode.env.uiKind: ${vscode.env.uiKind}`)
    log.logConfig()
    log.logDeprecatedConfig()
    logger.log('LaTeX Workshop initialized.')
    return {
        dispose: async () => {
            await parser.dispose()
            MathJaxPool.dispose()
        }
    }
}

export function activate(extensionContext: vscode.ExtensionContext) {
    void vscode.commands.executeCommand('setContext', 'latex-workshop:enabled', true)

    extensionContext.subscriptions.push(initialize(extensionContext))

    registerLatexWorkshopCommands(extensionContext)

    extensionContext.subscriptions.push(vscode.workspace.onDidChangeConfiguration((ev) => {
        log.logConfigChange(ev)
    }))

    extensionContext.subscriptions.push(vscode.workspace.onDidSaveTextDocument( (e: vscode.TextDocument) => {
        if (e.uri.scheme !== 'file'){
            return
        }
        if (lw.file.hasTexLangId(e.languageId) ||
            lw.cache.getIncludedTeX(lw.root.file.path, [], false).includes(e.fileName) ||
            lw.cache.getIncludedBib().includes(e.fileName)) {
            logger.log(`onDidSaveTextDocument triggered: ${e.uri.toString(true)}`)
            lw.linter.lintRootFileIfEnabled()
            void lw.compile.autoBuild(e.fileName, 'onSave')
            lw.counter.countOnSaveIfEnabled(e.fileName)
        }
    }))

    /** The previous active TeX document path. If this changed, root need to be re-searched */
    let prevTeXDocumentPath: string | undefined
    let isLaTeXActive = false
    extensionContext.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(async (e: vscode.TextEditor | undefined) => {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')

        if (vscode.window.visibleTextEditors.filter(editor => lw.file.hasTexLangId(editor.document.languageId)).length > 0) {
            logger.showStatus()
            if (configuration.get('view.autoFocus.enabled') && !isLaTeXActive) {
                void vscode.commands.executeCommand('workbench.view.lw.latex-workshop-activitybar').then(() => vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup'))
            }
            isLaTeXActive = true
        } else if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.languageId.toLowerCase() === 'log') {
            logger.showStatus()
        }
        if (e && e.document.uri.scheme !== 'file'){
            return
        }
        if (e && lw.file.hasTexLangId(e.document.languageId) && e.document.fileName !== prevTeXDocumentPath) {
            prevTeXDocumentPath = e.document.fileName
            await lw.root.find()
            lw.linter.lintRootFileIfEnabled()
        } else if (!e || !lw.file.hasBibLangId(e.document.languageId)) {
            isLaTeXActive = false
        }
    }))

    extensionContext.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        if (e.document.uri.scheme !== 'file'){
            return
        }
        if (!lw.file.hasTexLangId(e.document.languageId) &&
            !lw.file.hasBibLangId(e.document.languageId) &&
            !lw.file.hasDtxLangId(e.document.languageId)) {
            return
        }
        lw.event.fire(lw.event.DocumentChanged)
        lw.linter.lintActiveFileIfEnabledAfterInterval(e.document)
        lw.cache.refreshCacheAggressive(e.document.fileName)
    }))

    extensionContext.subscriptions.push(vscode.window.onDidChangeTextEditorSelection((e: vscode.TextEditorSelectionChangeEvent) => {
        if (lw.file.hasTexLangId(e.textEditor.document.languageId) ||
            lw.file.hasBibLangId(e.textEditor.document.languageId) ||
            lw.file.hasDtxLangId(e.textEditor.document.languageId)) {
            return lw.structureViewer.showCursorItem(e)
        }
        return
    }))

    registerProviders(extensionContext)

    void lw.root.find().then(() => {
        lw.linter.lintRootFileIfEnabled()
        if (lw.file.hasTexLangId(vscode.window.activeTextEditor?.document.languageId ?? '')) {
            prevTeXDocumentPath = vscode.window.activeTextEditor?.document.fileName
        }
    })
    conflictCheck()
}

function registerLatexWorkshopCommands(extensionContext: vscode.ExtensionContext) {
    extensionContext.subscriptions.push(
        vscode.commands.registerCommand('latex-workshop.saveWithoutBuilding', () => lw.commands.saveActive()),
        vscode.commands.registerCommand('latex-workshop.build', () => lw.commands.build()),
        vscode.commands.registerCommand('latex-workshop.recipes', (recipe: string | undefined) => lw.commands.recipes(recipe)),
        vscode.commands.registerCommand('latex-workshop.view', (uri: vscode.Uri) => lw.commands.view(uri)),
        vscode.commands.registerCommand('latex-workshop.refresh-viewer', () => lw.commands.refresh()),
        vscode.commands.registerCommand('latex-workshop.tab', () => lw.commands.view('tab')),
        vscode.commands.registerCommand('latex-workshop.viewInBrowser', () => lw.commands.view('browser')),
        vscode.commands.registerCommand('latex-workshop.viewExternal', () => lw.commands.view('external')),
        vscode.commands.registerCommand('latex-workshop.kill', () => lw.commands.kill()),
        vscode.commands.registerCommand('latex-workshop.synctex', () => lw.commands.synctex()),
        vscode.commands.registerCommand('latex-workshop.texdoc', (packageName: string | undefined) => lw.commands.texdoc(packageName)),
        vscode.commands.registerCommand('latex-workshop.texdocUsepackages', () => lw.commands.texdocUsepackages()),
        vscode.commands.registerCommand('latex-workshop.synctexto', (line: number, filePath: string) => lw.commands.synctexonref(line, filePath)),
        vscode.commands.registerCommand('latex-workshop.clean', () => lw.commands.clean()),
        vscode.commands.registerCommand('latex-workshop.actions', () => lw.commands.actions()),
        vscode.commands.registerCommand('latex-workshop.activate', () => undefined),
        vscode.commands.registerCommand('latex-workshop.citation', () => lw.commands.citation()),
        vscode.commands.registerCommand('latex-workshop.addtexroot', () => lw.commands.addTexRoot()),
        vscode.commands.registerCommand('latex-workshop.wordcount', () => lw.commands.wordcount()),
        vscode.commands.registerCommand('latex-workshop.log', () => lw.commands.showLog()),
        vscode.commands.registerCommand('latex-workshop.compilerlog', () => lw.commands.showLog('compiler')),
        vscode.commands.registerCommand('latex-workshop.code-action', (d: vscode.TextDocument, r: vscode.Range, c: number, m: string) => lw.codeActions.runCodeAction(d, r, c, m)),
        vscode.commands.registerCommand('latex-workshop.goto-section', (filePath: string, lineNumber: number) => lw.commands.gotoSection(filePath, lineNumber)),
        vscode.commands.registerCommand('latex-workshop.navigate-envpair', () => lw.commands.navigateToEnvPair()),
        vscode.commands.registerCommand('latex-workshop.select-envcontent', () => lw.commands.selectEnvContent('content')),
        vscode.commands.registerCommand('latex-workshop.select-env', () => lw.commands.selectEnvContent('whole')),
        vscode.commands.registerCommand('latex-workshop.select-envname', () => lw.commands.selectEnvName()),
        vscode.commands.registerCommand('latex-workshop.multicursor-envname', () => lw.commands.multiCursorEnvName()),
        vscode.commands.registerCommand('latex-workshop.toggle-equation-envname', () => lw.commands.toggleEquationEnv()),
        vscode.commands.registerCommand('latex-workshop.close-env', () => lw.commands.closeEnv()),
        vscode.commands.registerCommand('latex-workshop.wrap-env', () => lw.commands.insertSnippet('wrapEnv')),
        vscode.commands.registerCommand('latex-workshop.onEnterKey', () => lw.commands.onEnterKey()),
        vscode.commands.registerCommand('latex-workshop.onAltEnterKey', () => lw.commands.onEnterKey('alt')),
        vscode.commands.registerCommand('latex-workshop.revealOutputDir', () => lw.commands.revealOutputDir()),
        vscode.commands.registerCommand('latex-workshop.changeHostName', () => lw.commands.changeHostName()),
        vscode.commands.registerCommand('latex-workshop.resetHostName', () => lw.commands.resetHostName()),
        vscode.commands.registerCommand('latex-workshop-dev.parselog', () => lw.commands.devParseLog()),
        vscode.commands.registerCommand('latex-workshop-dev.parsetex', () => lw.commands.devParseTeX()),
        vscode.commands.registerCommand('latex-workshop-dev.parsebib', () => lw.commands.devParseBib()),
        vscode.commands.registerCommand('latex-workshop-dev.striptext', () => lw.commands.devStripText()),

        vscode.commands.registerCommand('latex-workshop.shortcut.item', () => lw.commands.insertSnippet('item')),
        vscode.commands.registerCommand('latex-workshop.shortcut.emph', () => lw.commands.toggleSelectedKeyword('emph')),
        vscode.commands.registerCommand('latex-workshop.shortcut.textbf', () => lw.commands.toggleSelectedKeyword('textbf')),
        vscode.commands.registerCommand('latex-workshop.shortcut.textit', () => lw.commands.toggleSelectedKeyword('textit')),
        vscode.commands.registerCommand('latex-workshop.shortcut.underline', () => lw.commands.toggleSelectedKeyword('underline')),
        vscode.commands.registerCommand('latex-workshop.shortcut.textrm', () => lw.commands.toggleSelectedKeyword('textrm')),
        vscode.commands.registerCommand('latex-workshop.shortcut.texttt', () => lw.commands.toggleSelectedKeyword('texttt')),
        vscode.commands.registerCommand('latex-workshop.shortcut.textsl', () => lw.commands.toggleSelectedKeyword('textsl')),
        vscode.commands.registerCommand('latex-workshop.shortcut.textsc', () => lw.commands.toggleSelectedKeyword('textsc')),
        vscode.commands.registerCommand('latex-workshop.shortcut.textnormal', () => lw.commands.toggleSelectedKeyword('textnormal')),
        vscode.commands.registerCommand('latex-workshop.shortcut.textsuperscript', () => lw.commands.toggleSelectedKeyword('textsuperscript')),
        vscode.commands.registerCommand('latex-workshop.shortcut.textsubscript', () => lw.commands.toggleSelectedKeyword('textsubscript')),
        vscode.commands.registerCommand('latex-workshop.shortcut.mathbf', () => lw.commands.toggleSelectedKeyword('mathbf')),
        vscode.commands.registerCommand('latex-workshop.shortcut.mathit', () => lw.commands.toggleSelectedKeyword('mathit')),
        vscode.commands.registerCommand('latex-workshop.shortcut.mathrm', () => lw.commands.toggleSelectedKeyword('mathrm')),
        vscode.commands.registerCommand('latex-workshop.shortcut.mathtt', () => lw.commands.toggleSelectedKeyword('mathtt')),
        vscode.commands.registerCommand('latex-workshop.shortcut.mathsf', () => lw.commands.toggleSelectedKeyword('mathsf')),
        vscode.commands.registerCommand('latex-workshop.shortcut.mathbb', () => lw.commands.toggleSelectedKeyword('mathbb')),
        vscode.commands.registerCommand('latex-workshop.shortcut.mathcal', () => lw.commands.toggleSelectedKeyword('mathcal')),
        vscode.commands.registerCommand('latex-workshop.surround', () => lw.completer.command.surround()),

        vscode.commands.registerCommand('latex-workshop.promote-sectioning', () => lw.commands.shiftSectioningLevel('promote')),
        vscode.commands.registerCommand('latex-workshop.demote-sectioning', () => lw.commands.shiftSectioningLevel('demote')),
        vscode.commands.registerCommand('latex-workshop.select-section', () => lw.commands.selectSection()),

        vscode.commands.registerCommand('latex-workshop.bibsort', () => bibtexFormat(true, false)),
        vscode.commands.registerCommand('latex-workshop.bibalign', () => bibtexFormat(false, true)),
        vscode.commands.registerCommand('latex-workshop.bibalignsort', () => bibtexFormat(true, true)),

        vscode.commands.registerCommand('latex-workshop.openMathPreviewPanel', () => lw.commands.openMathPreviewPanel()),
        vscode.commands.registerCommand('latex-workshop.closeMathPreviewPanel', () => lw.commands.closeMathPreviewPanel()),
        vscode.commands.registerCommand('latex-workshop.toggleMathPreviewPanel', () => lw.commands.toggleMathPreviewPanel())
    )
}

function registerProviders(extensionContext: vscode.ExtensionContext) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')

    // According to cmhughes/latexindent.pl, it aims to beautify .tex, .sty and .cls files.
    const latexindentSelector = selectDocumentsWithId(['tex', 'latex', 'latex-expl3'])
    const latexSelector = selectDocumentsWithId(['latex', 'latex-expl3', 'pweave', 'jlweave', 'rsweave'])
    const weaveSelector = selectDocumentsWithId(['pweave', 'jlweave', 'rsweave'])
    const latexDoctexSelector = selectDocumentsWithId(['latex', 'latex-expl3', 'pweave', 'jlweave', 'rsweave', 'doctex'])
    const bibtexSelector = selectDocumentsWithId(['bibtex'])

    extensionContext.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(latexindentSelector, latexFormatterProvider),
        vscode.languages.registerDocumentFormattingEditProvider(bibtexSelector, bibtexFormatterProvider),
        vscode.languages.registerDocumentRangeFormattingEditProvider(latexindentSelector, latexFormatterProvider),
        vscode.languages.registerDocumentRangeFormattingEditProvider(bibtexSelector, bibtexFormatterProvider)
    )

    extensionContext.subscriptions.push(
        vscode.window.registerWebviewPanelSerializer('latex-workshop-pdf', lw.viewer.serializer),
        vscode.window.registerCustomEditorProvider('latex-workshop-pdf-hook', lw.viewer.hook, {supportsMultipleEditorsPerDocument: true, webviewOptions: {retainContextWhenHidden: true}}),
        vscode.window.registerWebviewPanelSerializer('latex-workshop-mathpreview', new MathPreviewPanelSerializer())
    )

    extensionContext.subscriptions.push(
        vscode.languages.registerHoverProvider(latexSelector, new HoverProvider()),
        vscode.languages.registerDefinitionProvider(latexSelector, new DefinitionProvider()),
        vscode.languages.registerDocumentSymbolProvider(latexSelector, new DocSymbolProvider()),
        vscode.languages.registerDocumentSymbolProvider(bibtexSelector, new DocSymbolProvider()),
        vscode.languages.registerDocumentSymbolProvider(selectDocumentsWithId(['doctex']), new DocSymbolProvider()),
        vscode.languages.registerWorkspaceSymbolProvider(new ProjectSymbolProvider())
    )

    extensionContext.subscriptions.push(
        vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'tex'}, lw.completer, '\\', '{'),
        vscode.languages.registerCompletionItemProvider(bibtexSelector, new BibtexCompleter(), '@')
    )

    let triggerDisposable: vscode.Disposable | undefined
    const registerTrigger = () => {
        const userTriggersLatex = configuration.get('intellisense.triggers.latex') as string[]
        const latexTriggers = ['\\', ','].concat(userTriggersLatex)
        logger.log(`Trigger characters for intellisense of LaTeX documents: ${JSON.stringify(latexTriggers)}`)

        triggerDisposable = vscode.languages.registerCompletionItemProvider(latexDoctexSelector, lw.completer, ...latexTriggers)
        extensionContext.subscriptions.push(triggerDisposable)
    }
    registerTrigger()
    lw.onConfigChange('intellisense.triggers.latex', () => {
        if (triggerDisposable) {
            triggerDisposable.dispose()
            triggerDisposable = undefined
        }
        registerTrigger()
    })

    let atSuggestionDisposable: vscode.Disposable | undefined
    const registerAtSuggestion = () => {
        const atSuggestionLatexTrigger = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.atSuggestion.trigger.latex') as string
        if (atSuggestionLatexTrigger !== '') {
            lw.atSuggestionCompleter.updateTrigger()
            atSuggestionDisposable = vscode.languages.registerCompletionItemProvider(latexDoctexSelector, lw.atSuggestionCompleter, atSuggestionLatexTrigger)
            extensionContext.subscriptions.push(atSuggestionDisposable)
        }
    }
    registerAtSuggestion()
    lw.onConfigChange('intellisense.atSuggestion.trigger.latex', () => {
        if (atSuggestionDisposable) {
            atSuggestionDisposable.dispose()
            atSuggestionDisposable = undefined
        }
        registerAtSuggestion()
    })

    extensionContext.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(latexSelector, lw.codeActions),
        vscode.languages.registerFoldingRangeProvider(latexSelector, new FoldingProvider()),
        vscode.languages.registerFoldingRangeProvider(weaveSelector, new WeaveFoldingProvider())
    )

    const selectionLatex = configuration.get('selection.smart.latex.enabled', true)
    if (selectionLatex) {
        extensionContext.subscriptions.push(vscode.languages.registerSelectionRangeProvider({language: 'latex'}, new SelectionRangeProvider()))
    }

    extensionContext.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'latex-workshop-snippet-view',
            lw.snippetView.snippetViewProvider,
            {webviewOptions: {retainContextWhenHidden: true}}
        )
    )
}

function conflictCheck() {
    function check(ID: string, name: string, suggestion: string) {
        if (vscode.extensions.getExtension(ID) !== undefined) {
            void vscode.window.showWarningMessage(`LaTeX Workshop is incompatible with  "${name}". ${suggestion}`)
        }
    }
    check('tomoki1207.pdf', 'vscode-pdf', 'We compete when opening a PDF file from the sidebar. Please consider disabling either extension.')
}

function selectDocumentsWithId(ids: string[]): vscode.DocumentSelector {
   const selector = ids.map( (id) => {
       return { scheme: 'file', language: id }
   })
   return selector
}
