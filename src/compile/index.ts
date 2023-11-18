import type { ChildProcessWithoutNullStreams } from 'child_process'
import { initialize, build, autoBuild } from './build'
import { terminate } from './terminate'

export const compile = {
    initialize,
    build,
    autoBuild,
    terminate,
    compiling: false,
    lastBuildTime: 0,
    compiledPDFPath: '',
    process: undefined as ChildProcessWithoutNullStreams | undefined
}

export type StepQueue = {
    /**
     * The {@link Step}s in the current recipe.
     */
    steps: Step[]
    /**
     * The {@link Step}s in the next recipe to be executed after the current
     * ones.
     */
    nextSteps: Step[]
}

export type ProcessEnv = {
    [key: string]: string | undefined
}

export type Tool = {
    name: string
    command: string
    args?: string[]
    env?: ProcessEnv
}

export type Recipe = {
    name: string
    tools: (string | Tool)[]
}

export type RecipeStep = Tool & {
    rootFile: string
    recipeName: string
    timestamp: number
    index: number
    isExternal: false
    isRetry: boolean
    isSkipped: boolean
}

export type ExternalStep = Tool & {
    rootFile?: string
    recipeName: 'External'
    timestamp: number
    index: number
    isExternal: true
    cwd: string
}

export type Step = RecipeStep | ExternalStep
