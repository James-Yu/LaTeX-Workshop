import type { ChildProcess } from 'child_process'
import { build, autoBuild } from './build'
import { terminate } from './terminate'

export const compile = {
    build,
    autoBuild,
    terminate,
    lastAutoBuildTime: 0,
    compiledPDFPath: '',
    compiledPDFWriting: 0,
    process: undefined as ChildProcess | undefined
}
