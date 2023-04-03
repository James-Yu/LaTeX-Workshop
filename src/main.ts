import * as vscode from 'vscode'
import * as lw from './lw'
import { pdfViewerHookProvider, pdfViewerPanelSerializer } from './components/viewer'
import { MathPreviewPanelSerializer } from './components/mathpreviewpanel'
import { BibtexCompleter } from './providers/bibtexcompletion'
import { HoverProvider } from './providers/hover'
import { DocSymbolProvider } from './providers/docsymbol'
import { ProjectSymbolProvider } from './providers/projectsymbol'
import { DefinitionProvider } from './providers/definition'
import { latexFormatterProvider } from './providers/latexformatter'
import { FoldingProvider, WeaveFoldingProvider } from './providers/folding'
import { SelectionRangeProvider } from './providers/selection'
import { bibtexFormat, bibtexFormatterProvider } from './providers/bibtexformatter'
import { getLogger } from './components/logger'
import { DocumentChanged } from './components/eventbus'

const logger = getLogger('Extension')

export function activate(extensionContext: vscode.ExtensionContext) {
    void vscode.commands.executeCommand('setContext', 'latex-workshop:enabled', true)

    const lwDisposable = lw.init(extensionContext)
    lw.registerDisposable(lwDisposable)

    registerLatexWorkshopCommands()

    lw.registerDisposable(vscode.workspace.onDidSaveTextDocument( (e: vscode.TextDocument) => {
        if (lw.lwfs.isVirtualUri(e.uri)){
            return
        }
        if (lw.manager.hasTexId(e.languageId)) {
            logger.log(`onDidSaveTextDocument triggered: ${e.uri.toString(true)}`)
            lw.linter.lintRootFileIfEnabled()
            void lw.builder.buildOnSaveIfEnabled(e.fileName)
            lw.counter.countOnSaveIfEnabled(e.fileName)
        }
    }))

    /** The previous active TeX document path. If this changed, root need to be re-searched */
    let prevTeXDocumentPath: string | undefined
    let isLaTeXActive = false
    lw.registerDisposable(vscode.window.onDidChangeActiveTextEditor(async (e: vscode.TextEditor | undefined) => {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')

        if (vscode.window.visibleTextEditors.filter(editor => lw.manager.hasTexId(editor.document.languageId)).length > 0) {
            logger.showStatus()
            if (configuration.get('view.autoFocus.enabled') && !isLaTeXActive) {
                void vscode.commands.executeCommand('workbench.view.lw.latex-workshop-activitybar').then(() => vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup'))
            }
            isLaTeXActive = true
        } else if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.languageId.toLowerCase() === 'log') {
            logger.showStatus()
        }
        if (e && lw.lwfs.isVirtualUri(e.document.uri)){
            return
        }
        if (e && lw.manager.hasTexId(e.document.languageId) && e.document.fileName !== prevTeXDocumentPath) {
            prevTeXDocumentPath = e.document.fileName
            await lw.manager.findRoot()
            lw.linter.lintRootFileIfEnabled()
        } else if (!e || !lw.manager.hasBibtexId(e.document.languageId)) {
            isLaTeXActive = false
        }
    }))

    let updateCompleter: NodeJS.Timeout
    lw.registerDisposable(vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        lw.eventBus.fire(DocumentChanged)
        if (lw.lwfs.isVirtualUri(e.document.uri)){
            return
        }
        if (!lw.manager.hasTexId(e.document.languageId)) {
            return
        }
        lw.linter.lintActiveFileIfEnabledAfterInterval(e.document)
        if (!lw.cacher.has(e.document.fileName)) {
            return
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (configuration.get('intellisense.update.aggressive.enabled')) {
            if (updateCompleter) {
                clearTimeout(updateCompleter)
            }
            updateCompleter = setTimeout(() => {
                const file = e.document.uri.fsPath
                void lw.cacher.refreshCache(file, lw.manager.rootFile).then(async () => {
                    await lw.cacher.loadFlsFile(lw.manager.rootFile || file)
                })
            }, configuration.get('intellisense.update.delay', 1000))
        }
    }))

    lw.registerDisposable(vscode.window.onDidChangeTextEditorSelection((e: vscode.TextEditorSelectionChangeEvent) => {
        if (lw.manager.hasTexId(e.textEditor.document.languageId) ||
            lw.manager.hasBibtexId(e.textEditor.document.languageId) ||
            lw.manager.hasDoctexId(e.textEditor.document.languageId)) {
            return lw.structureViewer.showCursorItem(e)
        }
        return
    }))

    registerProviders()

    void lw.manager.findRoot().then(() => {
        lw.linter.lintRootFileIfEnabled()
        if (lw.manager.hasTexId(vscode.window.activeTextEditor?.document.languageId ?? '')) {
            prevTeXDocumentPath = vscode.window.activeTextEditor?.document.fileName
        }
    })
    conflictCheck()
}

function registerLatexWorkshopCommands() {
    lw.registerDisposable(
        vscode.commands.registerCommand('latex-workshop.saveWithoutBuilding', () => lw.commander.saveActive()),
        vscode.commands.registerCommand('latex-workshop.build', () => lw.commander.build()),
        vscode.commands.registerCommand('latex-workshop.recipes', (recipe: string | undefined) => lw.commander.recipes(recipe)),
        vscode.commands.registerCommand('latex-workshop.view', (mode: 'tab' | 'browser' | 'external' | vscode.Uri | undefined) => lw.commander.view(mode)),
        vscode.commands.registerCommand('latex-workshop.refresh-viewer', () => lw.commander.refresh()),
        vscode.commands.registerCommand('latex-workshop.tab', () => lw.commander.view('tab')),
        vscode.commands.registerCommand('latex-workshop.viewInBrowser', () => lw.commander.view('browser')),
        vscode.commands.registerCommand('latex-workshop.viewExternal', () => lw.commander.view('external')),
        vscode.commands.registerCommand('latex-workshop.kill', () => lw.commander.kill()),
        vscode.commands.registerCommand('latex-workshop.synctex', () => lw.commander.synctex()),
        vscode.commands.registerCommand('latex-workshop.texdoc', (packageName: string | undefined) => lw.commander.texdoc(packageName)),
        vscode.commands.registerCommand('latex-workshop.texdocUsepackages', () => lw.commander.texdocUsepackages()),
        vscode.commands.registerCommand('latex-workshop.synctexto', (line: number, filePath: string) => lw.commander.synctexonref(line, filePath)),
        vscode.commands.registerCommand('latex-workshop.clean', () => lw.commander.clean()),
        vscode.commands.registerCommand('latex-workshop.actions', () => lw.commander.actions()),
        vscode.commands.registerCommand('latex-workshop.activate', () => undefined),
        vscode.commands.registerCommand('latex-workshop.citation', () => lw.commander.citation()),
        vscode.commands.registerCommand('latex-workshop.addtexroot', () => lw.commander.addTexRoot()),
        vscode.commands.registerCommand('latex-workshop.wordcount', () => lw.commander.wordcount()),
        vscode.commands.registerCommand('latex-workshop.log', () => lw.commander.showLog()),
        vscode.commands.registerCommand('latex-workshop.compilerlog', () => lw.commander.showLog('compiler')),
        vscode.commands.registerCommand('latex-workshop.code-action', (d: vscode.TextDocument, r: vscode.Range, c: number, m: string) => lw.codeActions.runCodeAction(d, r, c, m)),
        vscode.commands.registerCommand('latex-workshop.goto-section', (filePath: string, lineNumber: number) => lw.commander.gotoSection(filePath, lineNumber)),
        vscode.commands.registerCommand('latex-workshop.navigate-envpair', () => lw.commander.navigateToEnvPair()),
        vscode.commands.registerCommand('latex-workshop.select-envcontent', () => lw.commander.selectEnvContent('content')),
        vscode.commands.registerCommand('latex-workshop.select-env', () => lw.commander.selectEnvContent('whole')),
        vscode.commands.registerCommand('latex-workshop.select-envname', () => lw.commander.selectEnvName()),
        vscode.commands.registerCommand('latex-workshop.multicursor-envname', () => lw.commander.multiCursorEnvName()),
        vscode.commands.registerCommand('latex-workshop.toggle-equation-envname', () => lw.commander.toggleEquationEnv()),
        vscode.commands.registerCommand('latex-workshop.close-env', () => lw.commander.closeEnv()),
        vscode.commands.registerCommand('latex-workshop.wrap-env', () => lw.commander.insertSnippet('wrapEnv')),
        vscode.commands.registerCommand('latex-workshop.onEnterKey', () => lw.commander.onEnterKey()),
        vscode.commands.registerCommand('latex-workshop.onAltEnterKey', () => lw.commander.onEnterKey('alt')),
        vscode.commands.registerCommand('latex-workshop.revealOutputDir', () => lw.commander.revealOutputDir()),
        vscode.commands.registerCommand('latex-workshop.changeHostName', () => lw.commander.changeHostName()),
        vscode.commands.registerCommand('latex-workshop.resetHostName', () => lw.commander.resetHostName()),
        vscode.commands.registerCommand('latex-workshop-dev.parselog', () => lw.commander.devParseLog()),
        vscode.commands.registerCommand('latex-workshop-dev.parsetex', () => lw.commander.devParseTeX()),
        vscode.commands.registerCommand('latex-workshop-dev.parsebib', () => lw.commander.devParseBib()),
        vscode.commands.registerCommand('latex-workshop-dev.striptext', () => lw.commander.devStripText()),

        vscode.commands.registerCommand('latex-workshop.shortcut.item', () => lw.commander.insertSnippet('item')),
        vscode.commands.registerCommand('latex-workshop.shortcut.emph', () => lw.commander.toggleSelectedKeyword('emph')),
        vscode.commands.registerCommand('latex-workshop.shortcut.textbf', () => lw.commander.toggleSelectedKeyword('textbf')),
        vscode.commands.registerCommand('latex-workshop.shortcut.textit', () => lw.commander.toggleSelectedKeyword('textit')),
        vscode.commands.registerCommand('latex-workshop.shortcut.underline', () => lw.commander.toggleSelectedKeyword('underline')),
        vscode.commands.registerCommand('latex-workshop.shortcut.textrm', () => lw.commander.toggleSelectedKeyword('textrm')),
        vscode.commands.registerCommand('latex-workshop.shortcut.texttt', () => lw.commander.toggleSelectedKeyword('texttt')),
        vscode.commands.registerCommand('latex-workshop.shortcut.textsl', () => lw.commander.toggleSelectedKeyword('textsl')),
        vscode.commands.registerCommand('latex-workshop.shortcut.textsc', () => lw.commander.toggleSelectedKeyword('textsc')),
        vscode.commands.registerCommand('latex-workshop.shortcut.textnormal', () => lw.commander.toggleSelectedKeyword('textnormal')),
        vscode.commands.registerCommand('latex-workshop.shortcut.textsuperscript', () => lw.commander.toggleSelectedKeyword('textsuperscript')),
        vscode.commands.registerCommand('latex-workshop.shortcut.textsubscript', () => lw.commander.toggleSelectedKeyword('textsubscript')),
        vscode.commands.registerCommand('latex-workshop.shortcut.mathbf', () => lw.commander.toggleSelectedKeyword('mathbf')),
        vscode.commands.registerCommand('latex-workshop.shortcut.mathit', () => lw.commander.toggleSelectedKeyword('mathit')),
        vscode.commands.registerCommand('latex-workshop.shortcut.mathrm', () => lw.commander.toggleSelectedKeyword('mathrm')),
        vscode.commands.registerCommand('latex-workshop.shortcut.mathtt', () => lw.commander.toggleSelectedKeyword('mathtt')),
        vscode.commands.registerCommand('latex-workshop.shortcut.mathsf', () => lw.commander.toggleSelectedKeyword('mathsf')),
        vscode.commands.registerCommand('latex-workshop.shortcut.mathbb', () => lw.commander.toggleSelectedKeyword('mathbb')),
        vscode.commands.registerCommand('latex-workshop.shortcut.mathcal', () => lw.commander.toggleSelectedKeyword('mathcal')),
        vscode.commands.registerCommand('latex-workshop.surround', () => lw.completer.command.surround()),

        vscode.commands.registerCommand('latex-workshop.promote-sectioning', () => lw.commander.shiftSectioningLevel('promote')),
        vscode.commands.registerCommand('latex-workshop.demote-sectioning', () => lw.commander.shiftSectioningLevel('demote')),
        vscode.commands.registerCommand('latex-workshop.select-section', () => lw.commander.selectSection()),

        vscode.commands.registerCommand('latex-workshop.bibsort', () => bibtexFormat(true, false)),
        vscode.commands.registerCommand('latex-workshop.bibalign', () => bibtexFormat(false, true)),
        vscode.commands.registerCommand('latex-workshop.bibalignsort', () => bibtexFormat(true, true)),

        vscode.commands.registerCommand('latex-workshop.openMathPreviewPanel', () => lw.commander.openMathPreviewPanel()),
        vscode.commands.registerCommand('latex-workshop.closeMathPreviewPanel', () => lw.commander.closeMathPreviewPanel()),
        vscode.commands.registerCommand('latex-workshop.toggleMathPreviewPanel', () => lw.commander.toggleMathPreviewPanel())
    )
}

function registerProviders() {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')

    // According to cmhughes/latexindent.pl, it aims to beautify .tex, .sty and .cls files.
    const latexindentSelector = selectDocumentsWithId(['tex', 'latex', 'latex-expl3'])
    const latexSelector = selectDocumentsWithId(['latex', 'latex-expl3', 'pweave', 'jlweave', 'rsweave'])
    const weaveSelector = selectDocumentsWithId(['pweave', 'jlweave', 'rsweave'])
    const latexDoctexSelector = selectDocumentsWithId(['latex', 'latex-expl3', 'pweave', 'jlweave', 'rsweave', 'doctex'])
    const bibtexSelector = selectDocumentsWithId(['bibtex'])

    lw.registerDisposable(
        vscode.languages.registerDocumentFormattingEditProvider(latexindentSelector, latexFormatterProvider),
        vscode.languages.registerDocumentFormattingEditProvider(bibtexSelector, bibtexFormatterProvider),
        vscode.languages.registerDocumentRangeFormattingEditProvider(latexindentSelector, latexFormatterProvider),
        vscode.languages.registerDocumentRangeFormattingEditProvider(bibtexSelector, bibtexFormatterProvider)
    )

    lw.registerDisposable(
        vscode.window.registerWebviewPanelSerializer('latex-workshop-pdf', pdfViewerPanelSerializer),
        vscode.window.registerCustomEditorProvider('latex-workshop-pdf-hook', pdfViewerHookProvider, {supportsMultipleEditorsPerDocument: true, webviewOptions: {retainContextWhenHidden: true}}),
        vscode.window.registerWebviewPanelSerializer('latex-workshop-mathpreview', new MathPreviewPanelSerializer())
    )

    lw.registerDisposable(
        vscode.languages.registerHoverProvider(latexSelector, new HoverProvider()),
        vscode.languages.registerDefinitionProvider(latexSelector, new DefinitionProvider()),
        vscode.languages.registerDocumentSymbolProvider(latexSelector, new DocSymbolProvider()),
        vscode.languages.registerDocumentSymbolProvider(bibtexSelector, new DocSymbolProvider()),
        vscode.languages.registerDocumentSymbolProvider(selectDocumentsWithId(['doctex']), new DocSymbolProvider()),
        vscode.languages.registerWorkspaceSymbolProvider(new ProjectSymbolProvider())
    )

    lw.registerDisposable(
        vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'tex'}, lw.completer, '\\', '{'),
        vscode.languages.registerCompletionItemProvider(bibtexSelector, new BibtexCompleter(), '@')
    )

    let triggerDisposable: vscode.Disposable | undefined
    const registerTrigger = () => {
        const userTriggersLatex = configuration.get('intellisense.triggers.latex') as string[]
        const latexTriggers = ['\\', ','].concat(userTriggersLatex)
        logger.log(`Trigger characters for intellisense of LaTeX documents: ${JSON.stringify(latexTriggers)}`)

        triggerDisposable = vscode.languages.registerCompletionItemProvider(latexDoctexSelector, lw.completer, ...latexTriggers)
        lw.registerDisposable(triggerDisposable)
    }
    registerTrigger()
    lw.registerDisposable(vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
        if (e.affectsConfiguration('latex-workshop.intellisense.triggers.latex')) {
            if (triggerDisposable) {
                triggerDisposable.dispose()
                triggerDisposable = undefined
            }
            registerTrigger()
        }
        return
    }))

    let atSuggestionDisposable: vscode.Disposable | undefined
    const registerAtSuggestion = () => {
        const atSuggestionLatexTrigger = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.atSuggestion.trigger.latex') as string
        if (atSuggestionLatexTrigger !== '') {
            lw.atSuggestionCompleter.updateTrigger()
            atSuggestionDisposable = vscode.languages.registerCompletionItemProvider(latexDoctexSelector, lw.atSuggestionCompleter, atSuggestionLatexTrigger)
            lw.registerDisposable(atSuggestionDisposable)
        }
    }
    registerAtSuggestion()
    lw.registerDisposable(vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
        if (e.affectsConfiguration('latex-workshop.intellisense.atSuggestion.trigger.latex')) {
            if (atSuggestionDisposable) {
                atSuggestionDisposable.dispose()
                atSuggestionDisposable = undefined
            }
            registerAtSuggestion()
        }
        return
    }))

    lw.registerDisposable(
        vscode.languages.registerCodeActionsProvider(latexSelector, lw.codeActions),
        vscode.languages.registerFoldingRangeProvider(latexSelector, new FoldingProvider()),
        vscode.languages.registerFoldingRangeProvider(weaveSelector, new WeaveFoldingProvider())
    )

    const selectionLatex = configuration.get('selection.smart.latex.enabled', true)
    if (selectionLatex) {
        lw.registerDisposable(vscode.languages.registerSelectionRangeProvider({language: 'latex'}, new SelectionRangeProvider()))
    }

    lw.registerDisposable(
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
