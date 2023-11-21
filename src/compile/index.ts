import type { ChildProcessWithoutNullStreams } from 'child_process'
import { build, autoBuild } from './build'
import { terminate } from './terminate'

export const compile = {
    build,
    autoBuild,
    terminate,
    compiling: false,
    lastBuildTime: 0,
    compiledPDFPath: '',
    compiledRootFile: '' as string | undefined,
    process: undefined as ChildProcessWithoutNullStreams | undefined
}
