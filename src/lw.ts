import vscode from 'vscode'
import path from 'path'
import { Builder } from './components/builder'
import { Cacher } from './components/cacher'
import { Cleaner } from './components/cleaner'
import { LaTeXCommanderTreeView } from './components/commander'
import { Configuration } from './components/configuration'
import { Counter } from './components/counter'
import { DuplicateLabels } from './components/duplicatelabels'
import { EnvPair } from './components/envpair'
import { EventBus } from './components/eventbus'
import { Linter } from './components/linter'
import { Locator } from './components/locator'
import { LwFileSystem } from './components/lwfs'
import { Manager } from './components/manager'
import { MathPreviewPanel } from './components/mathpreviewpanel'
import { UtensilsParser } from './components/parser/syntax'
import { Section } from './components/section'
import { Server } from './components/server'
import { SnippetView } from './components/snippetview'
import { TeXMagician } from './components/texmagician'
import { Viewer } from './components/viewer'
import { CodeActions } from './providers/codeactions'
import { AtSuggestionCompleter, Completer } from './providers/completion'
import { GraphicsPreview } from './providers/preview/graphicspreview'
import { MathPreview } from './providers/preview/mathpreview'
import { StructureTreeView } from './providers/structure'
import { getLogger } from './components/logger'
import { TeXDoc } from './components/texdoc'
import { MathJaxPool } from './providers/preview/mathjaxpool'

let disposables: { dispose(): any }[] = []
let context: vscode.ExtensionContext

export function registerDisposable(...items: vscode.Disposable[]) {
    if (context) {
        context.subscriptions.push(...disposables, ...items)
        disposables = []
    } else {
        disposables = [...disposables, ...items]
    }
}

export * as commander from './commander'

export const extensionRoot = path.resolve(`${__dirname}/../../`)
export const eventBus = new EventBus()
export const configuration = new Configuration()
export const lwfs = new LwFileSystem()
export const cacher = new Cacher()
export const manager = new Manager()
export const builder = new Builder()
export const viewer = new Viewer()
export const server = new Server()
export const locator = new Locator()
export const completer = new Completer()
export const atSuggestionCompleter = new AtSuggestionCompleter()
export const duplicateLabels = new DuplicateLabels()
export const linter = new Linter()
export const cleaner = new Cleaner()
export const counter = new Counter()
export const texdoc = new TeXDoc()
export const codeActions = new CodeActions()
export const texMagician = new TeXMagician()
export const envPair = new EnvPair()
export const section = new Section()
export const latexCommanderTreeView = new LaTeXCommanderTreeView()
export const structureViewer = new StructureTreeView()
export const snippetView = new SnippetView()
export const graphicsPreview = new GraphicsPreview()
export const mathPreview = new MathPreview()
export const mathPreviewPanel = new MathPreviewPanel()

const logger = getLogger('Extension')

export function init(extensionContext: vscode.ExtensionContext) {
    context = extensionContext
    registerDisposable()
    addLogFundamentals()
    logger.initializeStatusBarItem()
    logger.log('LaTeX Workshop initialized.')
    return {
        dispose: () => {
            cacher.reset()
            server.dispose()
            UtensilsParser.dispose()
            MathJaxPool.dispose()
        }
    }
}

export function addLogFundamentals() {
    logger.log('Initializing LaTeX Workshop.')
    logger.log(`Extension root: ${extensionRoot}`)
    logger.log(`$PATH: ${process.env.PATH}`)
    logger.log(`$SHELL: ${process.env.SHELL}`)
    logger.log(`$LANG: ${process.env.LANG}`)
    logger.log(`$LC_ALL: ${process.env.LC_ALL}`)
    logger.log(`process.platform: ${process.platform}`)
    logger.log(`process.arch: ${process.arch}`)
    logger.log(`vscode.env.appName: ${vscode.env.appName}`)
    logger.log(`vscode.env.remoteName: ${vscode.env.remoteName}`)
    logger.log(`vscode.env.uiKind: ${vscode.env.uiKind}`)
}
