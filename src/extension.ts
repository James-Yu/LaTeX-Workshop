import type { compile } from './compile'
import type { cache } from './core/cache'
import type { watcher } from './core/watcher'

export const extension = {
    cache: {} as typeof cache,
    watcher: {} as typeof watcher,
    compile: {} as typeof compile
}
