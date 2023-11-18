import type { getLogger } from './utils/logging/logger'
import type { compile } from './compile'
import type { cache } from './core/cache'
import type { watcher } from './core/watcher'

export const extension = {
    log: {} as typeof getLogger,
    cache: {} as typeof cache,
    watcher: {} as typeof watcher,
    compile: {} as typeof compile
}
