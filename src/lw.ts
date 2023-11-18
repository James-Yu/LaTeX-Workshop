import vscode from 'vscode'
import path from 'path'
import { Cleaner } from './extras/cleaner'
import { LaTeXCommanderTreeView } from './extras/activity-bar'
import { Configuration } from './utils/logging/log-config'
import { Counter } from './extras/counter'
export { dupLabelDetector } from './lint/duplicate-label'
import { EnvPair } from './locate/environment'
import { EventBus } from './core/event-bus'
import { Linter } from './lint/latex-linter'
import { Locator } from './locate/synctex'
import { LwFileSystem } from './core/file-system'
import { Manager } from './core/root-file'
import { MathPreviewPanel } from './extras/math-preview-panel'
import { parser } from './parse/parser'
import { Section } from './extras/section'
import { Server } from './preview/server'
import { SnippetView } from './extras/snippet-view'
import { TeXMagician } from './extras/texroot'
import { Viewer } from './preview/viewer'
import { CodeActions } from './lint/latex-code-actions'
import { AtSuggestionCompleter, Completer } from './completion/latex'
import { GraphicsPreview } from './preview/graphics'
import { MathPreview } from './preview/math/mathpreview'
import { StructureView } from './outline/project'
import { getLogger } from './utils/logging/logger'
import { TeXDoc } from './extras/texdoc'
import { MathJaxPool } from './preview/math/mathjaxpool'
import { extension } from './extension'

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

export * as commander from './commands'

export function setViewer(v: Viewer) {
    viewer = v
}

export const extensionRoot = path.resolve(`${__dirname}/../../`)
export const eventBus = new EventBus()
export const configuration = new Configuration()
export const lwfs = new LwFileSystem()
export const manager = new Manager()
export let viewer: Viewer
export const server = new Server()
export const locator = new Locator()
export const completer = new Completer()
export const atSuggestionCompleter = new AtSuggestionCompleter()
export const linter = new Linter()
export const cleaner = new Cleaner()
export const counter = new Counter()
export const texdoc = new TeXDoc()
export const codeActions = new CodeActions()
export const texMagician = new TeXMagician()
export const envPair = new EnvPair()
export const section = new Section()
export const latexCommanderTreeView = new LaTeXCommanderTreeView()
export const structureViewer = new StructureView()
export const snippetView = new SnippetView()
export const graphicsPreview = new GraphicsPreview()
export const mathPreview = new MathPreview()
export const mathPreviewPanel = new MathPreviewPanel()

const logger = getLogger('Extension')

export function init(extensionContext: vscode.ExtensionContext) {
    context = extensionContext
    registerDisposable()
    addLogFundamentals()
    void parser.reset()
    logger.initializeStatusBarItem()
    logger.log('LaTeX Workshop initialized.')
    return {
        dispose: async () => {
            extension.cache.reset()
            server.dispose()
            await parser.dispose()
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
