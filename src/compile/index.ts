import type { ChildProcess } from 'child_process'
import { build, autoBuild, isFileExcludedFromBuildOnSave } from './build'
import { terminate } from './terminate'

export const compile = {
    build,
    autoBuild,
    isFileExcludedFromBuildOnSave,
    terminate,
    lastAutoBuildTime: 0,
    compiledPDFPath: '',
    compiledPDFWriting: 0,
    process: undefined as ChildProcess | undefined
}
