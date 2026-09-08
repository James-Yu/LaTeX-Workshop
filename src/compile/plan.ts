import path from 'path'
import * as vscode from 'vscode'
import { lw } from '../lw'
import { replaceArgumentPlaceholders } from '../utils/utils'
import { MAX_PRINT_LINE, TEX_MAGIC_PROGRAM_NAME } from './constants'
import { Step } from './step'
import type { PlanResult, StepResult, Tool } from './types'

const logger = lw.log('Build', 'Plan')

export class Plan {
    readonly name: string
    readonly rootFile?: string
    readonly cwd: string
    readonly isExternal: boolean
    readonly steps: Step[]

    activeStep?: Step

    private static mikTeX: boolean | undefined

    private constructor(
        recipe: {
            readonly name: string,
            readonly rootFile?: string,
            readonly cwd: string,
            readonly isExternal: boolean
        },
        tools: Tool[]
    ) {
        this.name = recipe.name
        this.rootFile = recipe.rootFile
        this.cwd = recipe.cwd
        this.isExternal = recipe.isExternal
        this.steps = tools.map((tool, index) => Step.create(tool, {
            rootFile: recipe.rootFile,
            cwd: recipe.isExternal ? recipe.cwd : tool.cwd ?? recipe.cwd,
            recipeName: recipe.name,
            index,
            total: tools.length,
            isExternal: recipe.isExternal
        }))
    }

    static initialize() {
        Plan.mikTeX = undefined
    }

    static create(recipe: {
        readonly name: string,
        readonly tools: (string | Tool)[],
        readonly rootFile?: string,
        readonly cwd: string,
        readonly isExternal: boolean
    }): Plan | undefined {
        const scope = recipe.rootFile ? lw.file.toUri(recipe.rootFile) : undefined
        const configuration = vscode.workspace.getConfiguration('latex-workshop', scope)
        const configuredTools = configuration.get('latex.tools', []) as Tool[]
        const tools: Tool[] = []

        for (const tool of recipe.tools) {
            if (typeof tool !== 'string') {
                tools.push(tool)
                continue
            }
            const configuredTool = configuredTools.find(candidate => candidate.name === tool)
            if (configuredTool) {
                tools.push(configuredTool)
            } else {
                logger.log(`Skipping undefined tool ${tool} in recipe ${recipe.name}.`)
                void logger.showErrorMessage(`Skipping undefined tool "${tool}" in recipe "${recipe.name}."`)
            }
        }
        if (tools.length === 0) {
            return
        }

        const copiedTools = structuredClone(tools)
        Plan.populateTools(copiedTools, recipe, configuration)
        return new Plan(recipe, copiedTools)
    }

    async run(): Promise<PlanResult> {
        let skipped = true

        for (const step of this.steps) {
            let result = await this.runStep(step)
            skipped = this.aggregateSkipped(skipped, step)

            if (this.canRetry(step, result)) {
                result = await this.retryStep(step)
                skipped = this.aggregateSkipped(skipped, step)
            }

            if (result.status !== 'succeeded') {
                return {status: result.status, step, result, skipped, backend: result.backend}
            }
            if (step === this.steps.at(-1)) {
                return {status: 'succeeded', step, result, skipped, backend: result.backend}
            }
        }

        throw new Error('A Plan must contain at least one Step.')
    }

    terminate(): Error | undefined {
        return this.activeStep?.terminate()
    }

    private static populateTools(
        tools: Tool[],
        recipe: {
            readonly rootFile?: string,
            readonly cwd: string,
            readonly isExternal: boolean
        },
        configuration: vscode.WorkspaceConfiguration
    ) {
        if (recipe.rootFile === undefined) {
            return
        }

        const replace = replaceArgumentPlaceholders(recipe.rootFile, lw.file.tmpDirPath)
        for (const tool of tools) {
            Plan.configureDocker(tool, recipe.isExternal, configuration)
            tool.args = tool.args?.map(replace)
            if (recipe.isExternal) {
                continue
            }

            tool.cwd = tool.cwd && replace(tool.cwd)
            if (tool.cwd && !path.isAbsolute(tool.cwd)) {
                tool.cwd = path.resolve(recipe.cwd, tool.cwd)
            }
            Plan.recordTeXDirs(recipe.rootFile, tool)
            for (const [key, value] of Object.entries(tool.env ?? {})) {
                tool.env![key] = value && replace(value)
            }
            Plan.configureMaxPrintLine(tool, configuration)
        }
    }

    private static configureDocker(
        tool: Tool,
        isExternal: boolean,
        configuration: vscode.WorkspaceConfiguration
    ) {
        if (isExternal || !configuration.get('docker.enabled')) {
            return
        }
        if (tool.command !== 'latexmk') {
            logger.log(`Do not use Docker to invoke the command: ${tool.command}.`)
            return
        }

        logger.log('Use Docker to invoke the command.')
        tool.command = path.resolve(
            lw.extensionRoot,
            process.platform === 'win32' ? './scripts/latexmk.bat' : './scripts/latexmk'
        )
        if (process.platform !== 'win32') {
            lw.external.chmodSync(tool.command, 0o755)
        }
    }

    private static recordTeXDirs(rootFile: string, tool: Tool) {
        const outDir = tool.args?.find(arg => /^--?out(?:-directory|dir)=/.test(arg))
            ?.replace(/^--?out(?:-directory|dir)=/, '')
        const auxDir = tool.args?.find(arg => /^--?aux(?:-directory|dir)=/.test(arg))
            ?.replace(/^--?aux(?:-directory|dir)=/, '')
        lw.file.setTeXDirs(rootFile, outDir, auxDir)
    }

    /**
     * Adds MiKTeX's max-print-line option to compatible pdfLaTeX tools.
     * Disabled, non-MiKTeX, and non-pdfLaTeX paths are unchanged; magic
     * options retain their shell quoting while regular args prepend it.
     */
    private static configureMaxPrintLine(tool: Tool, configuration: vscode.WorkspaceConfiguration) {
        if (!configuration.get('latex.option.maxPrintLine.enabled')) {
            return
        }

        tool.args = tool.args ?? []
        // Explicit magic options are a shell command fragment, not an argv array.
        // Keep quoted words together so option-like text inside a value is ignored.
        const args = tool.name === TEX_MAGIC_PROGRAM_NAME
            ? (tool.args[0]?.match(/(?:[^\s"'\\]|\\.|"(?:[^"\\]|\\.)*"|'[^']*')+/g) ?? [])
                .map(arg => arg.replace(/["']/g, ''))
            : tool.args
        const isPdfLaTeXmk = tool.command === 'latexmk' && ![
            '-lualatex', '-pdflua', '-pdflualatex', '--lualatex', '--pdflua', '--pdflualatex'
        ].some(arg => args.includes(arg))
        if (!(isPdfLaTeXmk || tool.command === 'pdflatex') || !Plan.isMikTeX()) {
            return
        }

        if (tool.name === TEX_MAGIC_PROGRAM_NAME) {
            // The shell parses the original options, including quoted paths.
            // Quoting the whole fragment would collapse it into a single argument.
            tool.args = [`--max-print-line=${MAX_PRINT_LINE} ${tool.args[0] ?? ''}`]
        } else {
            tool.args.unshift(`--max-print-line=${MAX_PRINT_LINE}`)
        }
    }

    private static isMikTeX(): boolean {
        if (Plan.mikTeX !== undefined) {
            return Plan.mikTeX
        }
        try {
            const output = lw.external.sync('pdflatex', ['--version']).stdout.toString()
            Plan.mikTeX = output.includes('MiKTeX')
            if (Plan.mikTeX) {
                logger.log('`pdflatex` is provided by MiKTeX.')
            }
        } catch (error) {
            logger.logError('Cannot run `pdflatex` to determine if we are using MiKTeX.', error)
            Plan.mikTeX = false
        }
        return Plan.mikTeX
    }

    private async runStep(step: Step): Promise<StepResult> {
        logger.refreshStatus(
            'sync~spin',
            'statusBar.foreground',
            undefined,
            undefined,
            ` ${this.formatStepProgress(step)}`
        )
        this.activeStep = step
        try {
            return await step.run()
        } finally {
            this.activeStep = undefined
        }
    }

    private aggregateSkipped(skipped: boolean, step: Step): boolean {
        if (!skipped || step.isExternal) {
            return false
        }
        return step.isSkipped
    }

    /**
     * Decides whether a failed Step may be cleaned and retried once.
     * Process errors, non-failures, external Steps, termination, and prior
     * retries are rejected before consulting the root-scoped setting.
     */
    private canRetry(step: Step, result: StepResult): boolean {
        // Fatal spawn/child-process errors won't be retried.
        if (result.error !== undefined) {
            return false
        }
        // Only retry if the step failed, is not external, was not terminated by
        // the user, and has not already been retried.
        if (result.status !== 'failed' || step.isExternal || result.signal === 'SIGTERM' || step.isRetry) {
            return false
        }
        const scope = step.rootFile ? lw.file.toUri(step.rootFile) : undefined
        return vscode.workspace.getConfiguration('latex-workshop', scope)
            .get('latex.autoBuild.cleanAndRetry.enabled', false)
    }

    private async retryStep(step: Step): Promise<StepResult> {
        step.isRetry = true
        logger.refreshStatus(
            'x',
            'errorForeground',
            'Recipe terminated with error. Retry building the project.',
            'warning'
        )
        logger.log('Cleaning auxiliary files and retrying build after toolchain error.')
        try {
            await lw.extra.clean(step.rootFile)
        } catch (error) {
            logger.logError('Failed to clean auxiliary files before retrying.', error)
        }
        return this.runStep(step)
    }

    private formatStepProgress(step: Step): string {
        let progress = this.steps.length === 1
            ? this.name
            : `${this.name}: ${step.index + 1}/${step.total} (${step.name})`
        if (this.rootFile) {
            const configuration = vscode.workspace.getConfiguration('latex-workshop', lw.file.toUri(this.rootFile))
            if (configuration.get<boolean>('latex.build.rootfileInStatus', false)) {
                progress = `${vscode.workspace.asRelativePath(this.rootFile)}: ${progress}`
            }
        }
        return progress
    }
}
