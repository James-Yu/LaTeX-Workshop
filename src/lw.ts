import * as vscode from 'vscode'
import type { getLogger } from './utils/logging/logger'
import type { file } from './core/file'
import type { watcher } from './core/watcher'

import type { Builder } from './compile/build'
import type { Cacher } from './core/cache'
import type { Cleaner } from './extras/cleaner'
import type { LaTeXCommanderTreeView } from './extras/activity-bar'
import type { Configuration } from './utils/logging/log-config'
import type { Counter } from './extras/counter'
import type { EnvPair } from './locate/environment'
import type { EventBus } from './core/event-bus'
import type { Linter } from './lint/latex-linter'
import type { Locator } from './locate/synctex'
import type { LwFileSystem } from './core/file-system'
import type { Manager } from './core/root-file'
import type { MathPreviewPanel } from './extras/math-preview-panel'
import type { Section } from './extras/section'
import type { dupLabelDetector } from './lint/duplicate-label'
import type { Server } from './preview/server'
import type { SnippetView } from './extras/snippet-view'
import type { TeXMagician } from './extras/texroot'
import type { Viewer } from './preview/viewer'
import type { CodeActions } from './lint/latex-code-actions'
import type { AtSuggestionCompleter, Completer } from './completion/latex'
import type { GraphicsPreview } from './preview/graphics'
import type { MathPreview } from './preview/math/mathpreview'
import type { StructureView } from './outline/project'
import type { TeXDoc } from './extras/texdoc'
import type * as commands from './core/commands'

export const lw = {
    extensionContext: Object.create(null) as vscode.ExtensionContext,
    extensionRoot: '',
    constant: {} as typeof constant,
    log: {} as typeof getLogger,
    file: {} as typeof file,
    watcher: {} as typeof watcher,
    eventBus: Object.create(null) as EventBus,
    configuration: Object.create(null) as Configuration,
    lwfs: Object.create(null) as LwFileSystem,
    cacher: Object.create(null) as Cacher,
    manager: Object.create(null) as Manager,
    builder: Object.create(null) as Builder,
    viewer: Object.create(null) as Viewer,
    server: Object.create(null) as Server,
    locator: Object.create(null) as Locator,
    completer: Object.create(null) as Completer,
    atSuggestionCompleter: Object.create(null) as AtSuggestionCompleter,
    linter: Object.create(null) as Linter,
    cleaner: Object.create(null) as Cleaner,
    counter: Object.create(null) as Counter,
    texdoc: Object.create(null) as TeXDoc,
    codeActions: Object.create(null) as CodeActions,
    texMagician: Object.create(null) as TeXMagician,
    envPair: Object.create(null) as EnvPair,
    section: Object.create(null) as Section,
    dupLabelDetector: Object.create(null) as typeof dupLabelDetector,
    latexCommanderTreeView: Object.create(null) as LaTeXCommanderTreeView,
    structureViewer: Object.create(null) as StructureView,
    snippetView: Object.create(null) as SnippetView,
    graphicsPreview: Object.create(null) as GraphicsPreview,
    mathPreview: Object.create(null) as MathPreview,
    mathPreviewPanel: Object.create(null) as MathPreviewPanel,
    commands: Object.create(null) as typeof commands
}

const constant = {
    TEX_EXT: ['.tex', '.bib'],
    TEX_NOCACHE_EXT: ['.cls', '.sty', '.bst', '.bbx', '.cbx', '.def', '.cfg'],
    RSWEAVE_EXT: ['.rnw', '.Rnw', '.rtex', '.Rtex', '.snw', '.Snw'],
    JLWEAVE_EXT: ['.jnw', '.jtexw'],
    PWEAVE_EXT: ['.pnw', '.ptexw'],
}
lw.constant = constant

let disposables: { dispose(): any }[] = []

export function registerDisposable(...items: vscode.Disposable[]) {
    if (lw.extensionContext.subscriptions) {
        lw.extensionContext.subscriptions.push(...disposables, ...items)
        disposables = []
    } else {
        disposables = [...disposables, ...items]
    }
}