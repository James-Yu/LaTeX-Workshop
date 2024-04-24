import type { ChildProcessWithoutNullStreams } from 'child_process'
import type { Step } from '../types'
import { build, autoBuild } from './build'
import { terminate } from './terminate'

export const compile = {
    build,
    autoBuild,
    terminate,
    lastSteps: [] as Step[],
    lastAutoBuildTime: 0,
    compiledPDFPath: '',
    compiledPDFWriting: 0,
    process: undefined as ChildProcessWithoutNullStreams | undefined
}
