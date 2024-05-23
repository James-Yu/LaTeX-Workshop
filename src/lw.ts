import * as vscode from 'vscode'
import * as cs from 'cross-spawn'
import type { log } from './utils/logger'
import type { event } from './core/event'
import type { file } from './core/file'
import type { watcher } from './core/watcher'
import type { cache } from './core/cache'
import type { root } from './core/root'
import type { compile } from './compile'
import type { preview, server, viewer } from './preview'
import type { locate } from './locate'
import type { completion } from './completion'
import type { language } from './language'
import type { lint } from './lint'
import type { outline } from './outline'
import type { parser } from './parse'
import type { extra } from './extras'

import type * as commands from './core/commands'

const wrapper = <T extends Array<any>, U>(fn: (...args: T) => U) => {
    return (...args: T): U => fn(...args)
}

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
    parser: {} as typeof parser,
    compile: {} as typeof compile,
    viewer: {} as typeof viewer,
    server: {} as typeof server,
    preview: {} as typeof preview,
    locate: {} as typeof locate,
    completion: {} as typeof completion,
    language: {} as typeof language,
    lint: {} as typeof lint,
    outline: {} as typeof outline,
    extra: {} as typeof extra,
    commands: Object.create(null) as typeof commands,
    external: {
        spawn: wrapper(cs.spawn),
        sync: wrapper(cs.sync),
        stat: wrapper(vscode.workspace.fs.stat)
    },
    onConfigChange,
    onDispose
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
    MAX_PRINT_LINE: '10000',
    /**
     * Prefix that server.ts uses to distiguish requests on pdf files from
     * others. We use '.' because it is not converted by encodeURIComponent and
     * other functions.
     * See https://stackoverflow.com/questions/695438/safe-characters-for-friendly-url
     * See https://tools.ietf.org/html/rfc3986#section-2.3
     */
    PDF_PREFIX: 'pdf..',
    MATHJAX_EXT: [
        'amscd', 'bbox', 'boldsymbol', 'braket', 'bussproofs', 'cancel',
        'cases', 'centernot', 'colortbl', 'empheq', 'enclose', 'extpfeil',
        'gensymb', 'html', 'mathtools', 'mhchem', 'physics', 'textcomp',
        'textmacros', 'unicode', 'upgreek', 'verb'
    ]
}
lw.constant = constant

let disposables: vscode.Disposable[] | undefined = undefined
const tempDisposables: vscode.Disposable[] = []
/**
 * Handle configuration changes and invoke the specified callback function when
 * relevant configurations are updated.
 *
 * @param {string | string[]} [configs] - Optional. A string or an array of
 * configuration keys to monitor for changes. The leading `latex-workshop.`
 * should be omitted. A '*' can also be passed here for wildcard.
 * @param {Function} [callback] - Optional. The callback function to be executed
 * when relevant configurations change.
 * @param {vscode.ConfigurationScope} [scope] - Optional. The configuration
 * scope to consider when checking for changes.
 */
function onConfigChange(configs?: string | string[], callback?: () => void, scope?: vscode.ConfigurationScope) {
    const disposable = vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
        if (configs && callback &&
            ([ configs ].flat().some(config => e.affectsConfiguration(`latex-workshop.${config}`, scope))
             || configs === '*')) {
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

/**
 * @param {vscode.Disposable[]} [extensionDisposables] - Optional. An array of
 *   disposables associated with the extension. If provided, the function sets
 *   the global disposables array to extensionDisposables and adds
 *   tempDisposables to it. If not provided, the function creates a disposable
 *   to listen for configuration changes and adds it to tempDisposables.
 */
function onDispose(disposable?: vscode.Disposable, extensionDisposables?: vscode.Disposable[]) {
    if (extensionDisposables && disposable === undefined) {
        disposables = extensionDisposables
        disposables.push(...tempDisposables)
        tempDisposables.length = 0
        return
    }
    if (disposable === undefined) {
        return
    }
    if (disposables === undefined) {
        tempDisposables.push(disposable)
    } else {
        disposables.push(...tempDisposables, disposable)
        tempDisposables.length = 0
    }
}
