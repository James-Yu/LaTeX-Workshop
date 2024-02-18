import type { ChildProcessWithoutNullStreams } from 'child_process'
import { build, autoBuild } from './build'
import { terminate } from './terminate'

export const compile = {
    build,
    autoBuild,
    terminate,
    lastBuildTime: 0,
    compiledPDFPath: '',
    compiledPDFWriting: 0,
    process: undefined as ChildProcessWithoutNullStreams | undefined
}
