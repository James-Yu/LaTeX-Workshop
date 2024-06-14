import * as vscode from 'vscode'
import * as path from 'path'
import { lw } from './lw'
lw.extensionRoot = path.resolve(`${__dirname}/../../`)
import { log } from './utils/logger'
lw.log = log.getLogger
const logger = lw.log('Extension')
logger.log('Initializing LaTeX Workshop.')
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
import { parser } from './parse'
lw.parser = parser
void lw.parser.parse.reset()
import { compile } from './compile'
lw.compile = compile
import { preview, server, viewer } from './preview'
lw.server = server
lw.viewer = viewer
lw.preview = preview
import { locate } from './locate'
lw.locate = locate
import { completion } from './completion'
lw.completion = completion
import { language } from './language'
lw.language = language
import { lint } from './lint'
lw.lint = lint
import { outline } from './outline'
lw.outline = outline
import { extra } from './extras'
lw.extra = extra
import * as commander from './core/commands'
lw.commands = commander

log.initStatusBarItem()

export function activate(extensionContext: vscode.ExtensionContext) {
    void vscode.commands.executeCommand('setContext', 'latex-workshop:enabled', true)

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

    lw.onDispose(undefined, extensionContext.subscriptions)

    registerLatexWorkshopCommands(extensionContext)

    extensionContext.subscriptions.push(vscode.workspace.onDidChangeConfiguration((ev) => {
        log.logConfigChange(ev)
    }))

    extensionContext.subscriptions.push(vscode.workspace.onDidSaveTextDocument( (e: vscode.TextDocument) => {
        if (e.uri.scheme !== 'file'){
            return
        }
        if (lw.file.hasTeXLangId(e.languageId) ||
            lw.cache.getIncludedTeX(lw.root.file.path, false).includes(e.fileName) ||
            lw.cache.getIncludedBib().includes(e.fileName)) {
            logger.log(`onDidSaveTextDocument triggered: ${e.uri.toString(true)}`)
            lw.lint.latex.root()
            void lw.compile.autoBuild(e.fileName, 'onSave')
            lw.extra.count(e.fileName)
        }
        // We don't check LaTeX ID as the reconstruct is handled by the Cacher.
        // We don't check BibTeX ID as the reconstruct is handled by the citation completer.
        if (lw.file.hasDtxLangId(e.languageId)) {
            void lw.outline.reconstruct()
        }
    }))

    /** The previous active TeX document path. If this changed, root need to be re-searched */
    let prevTeXDocumentPath: string | undefined
    let isLaTeXActive = false
    extensionContext.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(async (e: vscode.TextEditor | undefined) => {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')

        if (vscode.window.visibleTextEditors.filter(editor => lw.file.hasTeXLangId(editor.document.languageId)).length > 0) {
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
        if (e && lw.file.hasTeXLangId(e.document.languageId) && e.document.fileName !== prevTeXDocumentPath) {
            prevTeXDocumentPath = e.document.fileName
            await lw.root.find()
            lw.lint.latex.root()
        } else if (!e || !lw.file.hasBibLangId(e.document.languageId)) {
            isLaTeXActive = false
        }
        if (e && (
            lw.file.hasTeXLangId(e.document.languageId)
            || lw.file.hasBibLangId(e.document.languageId)
            || lw.file.hasDtxLangId(e.document.languageId))) {
            void lw.outline.refresh()
        }
    }))

    extensionContext.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        if (e.document.uri.scheme !== 'file'){
            return
        }
        if (!lw.file.hasTeXLangId(e.document.languageId) &&
            !lw.file.hasBibLangId(e.document.languageId) &&
            !lw.file.hasDtxLangId(e.document.languageId)) {
            return
        }
        lw.event.fire(lw.event.DocumentChanged)
        lw.lint.latex.on(e.document)
        lw.cache.refreshCacheAggressive(e.document.fileName)
    }))

    extensionContext.subscriptions.push(vscode.window.onDidChangeTextEditorSelection((e: vscode.TextEditorSelectionChangeEvent) => {
        if (lw.file.hasTeXLangId(e.textEditor.document.languageId) ||
            lw.file.hasBibLangId(e.textEditor.document.languageId) ||
            lw.file.hasDtxLangId(e.textEditor.document.languageId)) {
            return lw.outline.reveal(e)
        }
        return
    }))

    registerProviders(extensionContext)

    void lw.root.find().then(() => {
        lw.lint.latex.root()
        if (lw.file.hasTeXLangId(vscode.window.activeTextEditor?.document.languageId ?? '')) {
            prevTeXDocumentPath = vscode.window.activeTextEditor?.document.fileName
        }
    })
    conflictCheck()

    logger.log('LaTeX Workshop initialized.')
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
        vscode.commands.registerCommand('latex-workshop.code-action', (d: vscode.TextDocument, r: vscode.Range, c: number, m: string) => lw.lint.latex.action(d, r, c, m)),
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
        vscode.commands.registerCommand('latex-workshop.surround', () => lw.completion.macro.surround()),

        vscode.commands.registerCommand('latex-workshop.promote-sectioning', () => lw.commands.shiftSectioningLevel('promote')),
        vscode.commands.registerCommand('latex-workshop.demote-sectioning', () => lw.commands.shiftSectioningLevel('demote')),
        vscode.commands.registerCommand('latex-workshop.select-section', () => lw.commands.selectSection()),

        vscode.commands.registerCommand('latex-workshop.bibsort', () => lw.lint.bibtex.format(true, false)),
        vscode.commands.registerCommand('latex-workshop.bibalign', () => lw.lint.bibtex.format(false, true)),
        vscode.commands.registerCommand('latex-workshop.bibalignsort', () => lw.lint.bibtex.format(true, true)),

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
        vscode.languages.registerDocumentFormattingEditProvider(latexindentSelector, lw.lint.latex.formatter),
        vscode.languages.registerDocumentFormattingEditProvider(bibtexSelector, lw.lint.bibtex.formatter),
        vscode.languages.registerDocumentRangeFormattingEditProvider(latexindentSelector, lw.lint.latex.formatter),
        vscode.languages.registerDocumentRangeFormattingEditProvider(bibtexSelector, lw.lint.bibtex.formatter)
    )

    extensionContext.subscriptions.push(
        vscode.window.registerWebviewPanelSerializer('latex-workshop-pdf', lw.viewer.serializer),
        vscode.window.registerCustomEditorProvider('latex-workshop-pdf-hook', lw.viewer.hook, {supportsMultipleEditorsPerDocument: true, webviewOptions: {retainContextWhenHidden: true}}),
        vscode.window.registerWebviewPanelSerializer('latex-workshop-mathpreview', lw.preview.mathpreview.serializer)
    )

    extensionContext.subscriptions.push(
        vscode.languages.registerHoverProvider(latexSelector, lw.preview.provider),
        vscode.languages.registerDefinitionProvider(latexSelector, lw.language.definition),
        vscode.languages.registerDocumentSymbolProvider(latexSelector, lw.language.docSymbol),
        vscode.languages.registerDocumentSymbolProvider(bibtexSelector, lw.language.docSymbol),
        vscode.languages.registerDocumentSymbolProvider(selectDocumentsWithId(['doctex']), lw.language.docSymbol),
        vscode.languages.registerWorkspaceSymbolProvider(lw.language.projectSymbol)
    )

    extensionContext.subscriptions.push(
        vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'tex'}, lw.completion.provider, '\\', '{'),
        vscode.languages.registerCompletionItemProvider(bibtexSelector, lw.completion.bibProvider, '@')
    )

    let triggerDisposable: vscode.Disposable | undefined
    const registerTrigger = () => {
        const userTriggersLatex = configuration.get('intellisense.triggers.latex') as string[]
        const latexTriggers = ['\\', ',', '{', '}'].concat(userTriggersLatex)
        logger.log(`Trigger characters for intellisense of LaTeX documents: ${JSON.stringify(latexTriggers)}`)

        triggerDisposable = vscode.languages.registerCompletionItemProvider(latexDoctexSelector, lw.completion.provider, ...latexTriggers)
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
            lw.completion.atProvider.updateTrigger()
            atSuggestionDisposable = vscode.languages.registerCompletionItemProvider(latexDoctexSelector, lw.completion.atProvider, atSuggestionLatexTrigger)
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
        vscode.languages.registerCodeActionsProvider(latexSelector, lw.lint.latex.actionprovider),
        vscode.languages.registerFoldingRangeProvider(latexSelector, lw.language.folding),
        vscode.languages.registerFoldingRangeProvider(weaveSelector, lw.language.weaveFolding)
    )

    const selectionLatex = configuration.get('selection.smart.latex.enabled', true)
    if (selectionLatex) {
        extensionContext.subscriptions.push(vscode.languages.registerSelectionRangeProvider({language: 'latex'}, lw.language.selectionRage))
    }

    extensionContext.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'latex-workshop-snippet-view',
            lw.extra.snippet.provider,
            { webviewOptions: { retainContextWhenHidden: true } }
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
