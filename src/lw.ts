import * as vscode from 'vscode'
import type { log } from './utils/logger'
import type { event } from './core/event'
import type { file } from './core/file'
import type { watcher } from './core/watcher'
import type { cache } from './core/cache'
import type { root } from './core/root'
import type { compile } from './compile'
import type { viewer } from './preview'

import type { Cleaner } from './extras/cleaner'
import type { LaTeXCommanderTreeView } from './extras/activity-bar'
import type { Counter } from './extras/counter'
import type { EnvPair } from './locate/environment'
import type { Linter } from './lint/latex-linter'
import type { Locator } from './locate/synctex'
import type { LwFileSystem } from './core/file-system'
import type { MathPreviewPanel } from './extras/math-preview-panel'
import type { Section } from './extras/section'
import type { dupLabelDetector } from './lint/duplicate-label'
import type { Server } from './preview/server'
import type { SnippetView } from './extras/snippet-view'
import type { TeXMagician } from './extras/texroot'
import type { CodeActions } from './lint/latex-code-actions'
import type { AtSuggestionCompleter, Completer } from './completion/latex'
import type { GraphicsPreview } from './preview/graphics'
import type { MathPreview } from './preview/math/mathpreview'
import type { StructureView } from './outline/project'
import type { TeXDoc } from './extras/texdoc'
import type * as commands from './core/commands'

/* eslint-disable */
export const lw = {
    extensionRoot: '',
    constant: {} as typeof constant,
    log: {} as typeof log.getLogger,
    event: {} as typeof event,
    file: {} as typeof file,
    watcher: {} as typeof watcher,
    cache: {} as typeof cache,
    root: {} as typeof root,
    compile: {} as typeof compile,
    lwfs: Object.create(null) as LwFileSystem,
    viewer: {} as typeof viewer,
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
    commands: Object.create(null) as typeof commands,
    onConfigChange
}
/* eslint-enable */

const constant = {
    TEX_EXT: ['.tex', '.bib'],
    TEX_NOCACHE_EXT: ['.cls', '.sty', '.bst', '.bbx', '.cbx', '.def', '.cfg'],
    RSWEAVE_EXT: ['.rnw', '.Rnw', '.rtex', '.Rtex', '.snw', '.Snw'],
    JLWEAVE_EXT: ['.jnw', '.jtexw'],
    PWEAVE_EXT: ['.pnw', '.ptexw'],
    TEX_MAGIC_PROGRAM_NAME: 'TEX_MAGIC_PROGRAM_NAME',
    BIB_MAGIC_PROGRAM_NAME: 'BIB_MAGIC_PROGRAM_NAME',
    MAGIC_PROGRAM_ARGS_SUFFIX: '_WITH_ARGS',
    MAX_PRINT_LINE: '10000'
}
lw.constant = constant

let disposables: vscode.Disposable[] | undefined = undefined
const tempDisposables: vscode.Disposable[] = []
/**
 * Handle configuration changes and invoke the specified callback function when
 * relevant configurations are updated.
 *
 * @param {string[]} [configs] - Optional. An array of configuration keys to
 * monitor for changes.
 * @param {Function} [callback] - Optional. The callback function to be executed
 * when relevant configurations change.
 * @param {vscode.ConfigurationScope} [scope] - Optional. The configuration
 * scope to consider when checking for changes.
 * @param {vscode.Disposable[]} [extensionDisposables] - Optional. An array of
 *   disposables associated with the extension. If provided, the function sets
 *   the global disposables array to extensionDisposables and adds
 *   tempDisposables to it. If not provided, the function creates a disposable
 *   to listen for configuration changes and adds it to tempDisposables.
 */
function onConfigChange(configs?: string | string[], callback?: () => void, scope?: vscode.ConfigurationScope, extensionDisposables?: vscode.Disposable[]) {
    if (extensionDisposables) {
        disposables = extensionDisposables
        disposables.push(...tempDisposables)
        tempDisposables.length = 0
        return
    }
    const disposable = vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
        if (configs && callback &&
            [ configs ].flat().some(config => e.affectsConfiguration(`latex-workshop.${config}`, scope))) {
            callback()
        }
    })
    if (disposables === undefined) {
        tempDisposables.push(disposable)
    } else {
        disposables.push(...tempDisposables, disposable)
        tempDisposables.length = 0
    }
}
