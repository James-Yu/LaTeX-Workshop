import type { getLogger } from './utils/logging/logger'
import type { compile } from './compile'
import type { cache } from './core/cache'
import type { watcher } from './core/watcher'
import type { file } from './core/file'
import type { root } from './core/root'
import type { view as snippet } from './extras/snippet-view'

export const extension = {
    log: {} as typeof getLogger,
    cache: {} as typeof cache,
    file: {} as typeof file,
    watcher: {} as typeof watcher,
    compile: {} as typeof compile,
    root: {} as typeof root,
    views: {
        snippet: {} as typeof snippet
    }
}

export const constants = {
    // https://tex.stackexchange.com/questions/7770/file-extensions-related-to-latex-etc
    TEX_EXT: ['.tex', '.bib'],
    TEX_NOCACHE_EXT: ['.cls', '.sty', '.bst', '.bbx', '.cbx', '.def', '.cfg'],
    RSWEAVE_EXT: ['.rnw', '.Rnw', '.rtex', '.Rtex', '.snw', '.Snw'],
    JLWEAVE_EXT: ['.jnw', '.jtexw'],
    PWEAVE_EXT: ['.pnw', '.ptexw'],
    TEX_MAGIC_PROGRAM_NAME: 'TEX_MAGIC_PROGRAM_NAME',
    BIB_MAGIC_PROGRAM_NAME: 'BIB_MAGIC_PROGRAM_NAME',
    MAGIC_PROGRAM_ARGS_SUFFIX: '_WITH_ARGS',
    MAX_PRINT_LINE: '10000',
}
