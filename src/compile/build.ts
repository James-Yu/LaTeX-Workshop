import * as vscode from 'vscode'
import * as path from 'path'
import * as cs from 'cross-spawn'
import { pickRootPath } from '../utils/quick-pick'
import { lw } from '../lw'
import type { ProcessEnv, RecipeStep, Step } from '../types'
import { build as buildRecipe } from './recipe'
import { build as buildExternal } from './external'
import { queue } from './queue'

const logger = lw.log('Build')

export {
    autoBuild,
    build,
}

lw.watcher.src.onChange(filePath => autoBuild(filePath, 'onFileChange'))
lw.watcher.bib.onChange(filePath => autoBuild(filePath, 'onFileChange', true))

/**
 * Triggers auto build based on file change or file save events. If the
 * configuration allows auto-build for the given event type, it initiates the
 * build process for the affected file.
 *
 * @param {string} file - The path of the file that triggered the auto build.
 * @param {'onFileChange' | 'onSave'} type - The type of event that triggered
 * the auto build.
 * @param {boolean} bibChanged - Indicates whether the bibliography file has
 * changed.
 */
function autoBuild(file: string, type: 'onFileChange' | 'onSave', bibChanged: boolean = false) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(file))
    if (configuration.get('latex.autoBuild.run') as string !== type) {
        return
    }
    logger.log('Auto build started ' + (type === 'onFileChange' ? 'detecting the change of a file' : 'on saving file') + `: ${file} .`)
    lw.event.fire(lw.event.AutoBuildInitiated, {type, file})
    if (!canAutoBuild()) {
        logger.log('Autobuild temporarily disabled.')
        return
    }
    lw.compile.lastAutoBuildTime = Date.now()
    if (!bibChanged && lw.root.subfiles.path && configuration.get('latex.rootFile.useSubFile')) {
        return build(true, lw.root.subfiles.path, lw.root.subfiles.langId)
    } else {
        return build(true, lw.root.file.path, lw.root.file.langId)
    }
}

/**
 * Determines whether an auto-build on save or on change can be triggered.
 * Two conditions are considered: the presence of `latex.autoBuild.interval`
 * configuration and avoiding unwanted auto-build triggered by `saveAll()`
 * during a previous building process.
 *
 * @returns {boolean} - True if auto-build can be triggered, false otherwise.
 */
function canAutoBuild(): boolean {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', lw.root.file.path ? vscode.Uri.file(lw.root.file.path) : undefined)
    return Date.now() - lw.compile.lastAutoBuildTime >= (configuration.get('latex.autoBuild.interval', 1000) as number)
}

let isBuilding = false
/**
 * Initiates the build process for the LaTeX project. It can build the entire
 * project or a specific root file depending on the parameters.
 *
 * This function checks if the active editor is defined, and if not, logs an
 * error message and returns. It then determines the workspace and configuration
 * based on the provided or inferred root file. If an external build command is
 * configured, it spawns the external build process. If the root file is not
 * defined or the language ID is not defined, it logs an error and returns. If
 * the subfile package is used and the user has not chosen to skip the file
 * selection, it prompts the user to select a subfile. Finally, it logs
 * information about the build and initiates the build process using the
 * appropriate recipe.
 *
 * @param {boolean} skipSelection - Whether to skip the file selection prompt.
 * @param {string | undefined} rootFile - The path of the LaTeX root file.
 * @param {string | undefined} languageId - The language ID of the root file.
 * @param {string | undefined} recipe - The name of the recipe to use for the
 * build.
 */
async function build(skipSelection: boolean = false, rootFile: string | undefined = undefined, languageId: string | undefined = undefined, recipe: string | undefined = undefined) {
    const activeEditor = vscode.window.activeTextEditor
    if (!activeEditor) {
        logger.log('Cannot start to build because the active editor is undefined.')
        return
    }

    logger.log(`The document of the active editor: ${activeEditor.document.uri.toString(true)}`)
    logger.log(`The languageId of the document: ${activeEditor.document.languageId}`)
    const workspace = rootFile ? vscode.Uri.file(rootFile) : activeEditor.document.uri
    const configuration = vscode.workspace.getConfiguration('latex-workshop', workspace)
    const externalBuildCommand = configuration.get('latex.external.build.command') as string
    const externalBuildArgs = configuration.get('latex.external.build.args') as string[]

    if (rootFile === undefined && lw.file.hasTeXLangId(activeEditor.document.languageId)) {
        await lw.root.find()
        rootFile = lw.root.file.path
        languageId = lw.root.file.langId
    }
    if (externalBuildCommand) {
        // Check if a build is already in progress
        if (isBuilding) {
            void logger.showErrorMessageWithCompilerLogButton('Please wait for the current build to finish.')
        } else {
            const pwd = path.dirname(rootFile ? rootFile : activeEditor.document.fileName)
            await buildExternal(externalBuildCommand, externalBuildArgs, pwd, buildLoop, rootFile)
        }
        return
    }
    if (rootFile === undefined || languageId === undefined) {
        logger.log('Cannot find LaTeX root file. See https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile#the-root-file')
        return
    }

    let pickedRootFile: string | undefined = rootFile
    if (!skipSelection && lw.root.subfiles.path) {
        // We are using the subfile package
        pickedRootFile = await pickRootPath(rootFile, lw.root.subfiles.path, 'compile')
        if (! pickedRootFile) {
            return
        }
    }

    logger.log(`Building root file: ${pickedRootFile}`)
    await buildRecipe(pickedRootFile, languageId, buildLoop, recipe)
}

/**
 * Checks if another build loop is already running. If not, it iterates through
 * the queue and executes each Tool one by one.
 *
 * This function first checks if a build is already in progress. If it is, it
 * returns early. Otherwise, it sets the `compiling` flag to true and the
 * `lastBuildTime` to the current timestamp. It then enters a loop where it
 * dequeues steps from the queue. For each step, it spawns the process and
 * monitors the process until completion. After each step, it checks if it's the
 * last step and performs cleanup if necessary. Finally, it sets the `compiling`
 * flag to false.
 */
async function buildLoop() {
    if (isBuilding) {
        return
    }

    isBuilding = true
    lw.compile.compiledPDFWriting++
    // Stop watching the PDF file to avoid reloading the PDF viewer twice.
    // The builder will be responsible for refreshing the viewer.
    let skipped = true
    while (true) {
        const step = queue.getStep()
        if (step === undefined) {
            break
        }
        lw.compile.lastSteps.push(step)
        const env = spawnProcess(step)
        const success = await monitorProcess(step, env)
        skipped = skipped && !(step.isExternal || !step.isSkipped)
        if (success && queue.isLastStep(step)) {
            await afterSuccessfulBuilt(step, skipped)
        }
    }
    isBuilding = false
    setTimeout(() => lw.compile.compiledPDFWriting--, 1000)
}

/**
 * Spawns a child process for the specified step. The function creates the
 * environment variables needed for the step and spawns a process according to
 * the nature of the step: a magic command (tex or bib), a recipe tool, or an
 * external command.
 *
 * Based on the type of step, this function sets the current working directory
 * (`cwd`) for the spawn command. If the step represents a magic command (tex or
 * bib), it uses a shell to execute the command with optional arguments. If the
 * step is not external, it sets the `cwd` based on the compiled root file,
 * possibly a sub-file. If in such a case, the compile command is `latexmk`, the
 * `cwd` is re-set to the root dir instead of sub-file. If the step is external,
 * it sets the `cwd` based on the provided `cwd` property.
 *
 * @param {Step} step - The Step to be executed.
 * @returns {ProcessEnv} - The process environment passed to the spawned
 * process.
 */
function spawnProcess(step: Step): ProcessEnv {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', step.rootFile ? vscode.Uri.file(step.rootFile) : undefined)
    if (step.index === 0 || configuration.get('latex.build.clearLog.everyRecipeStep.enabled') as boolean) {
        logger.clearCompilerMessage()
    }

    logger.refreshStatus('sync~spin', 'statusBar.foreground', undefined, undefined, ' ' + queue.getStepString(step))
    logger.logCommand(`Recipe step ${step.index + 1}`, step.command, step.args)
    logger.log(`env: ${JSON.stringify(step.env)}`)
    logger.log(`root: ${step.rootFile}`)

    const env: ProcessEnv = { ...process.env, ...step.env }
    env['max_print_line'] = lw.constant.MAX_PRINT_LINE

    if (!step.isExternal &&
        (step.name.startsWith(lw.constant.TEX_MAGIC_PROGRAM_NAME) ||
            step.name.startsWith(lw.constant.BIB_MAGIC_PROGRAM_NAME))) {
        logger.log(`cwd: ${path.dirname(step.rootFile)}`)

        const args = step.args
        if (args && !step.name.endsWith(lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)) {
            // All optional arguments are given as a unique string (% !TeX options) if any, so we use {shell: true}
            lw.compile.process = cs.spawn(`${step.command} ${args[0]}`, [], {cwd: path.dirname(step.rootFile), env, shell: true})
        } else {
            lw.compile.process = cs.spawn(step.command, args, {cwd: path.dirname(step.rootFile), env})
        }
    } else if (!step.isExternal) {
        let cwd = path.dirname(step.rootFile)
        if (step.command === 'latexmk' && step.rootFile === lw.root.subfiles.path && lw.root.dir.path) {
            cwd = lw.root.dir.path
        }
        logger.log(`cwd: ${cwd}`)
        lw.compile.process = cs.spawn(step.command, step.args, {cwd, env})
    } else {
        logger.log(`cwd: ${step.cwd}`)
        lw.compile.process = cs.spawn(step.command, step.args, {cwd: step.cwd})
    }
    logger.log(`LaTeX build process spawned with PID ${lw.compile.process.pid}.`)
    return env
}

/**
 * Monitors the output and termination of the tool process. This function
 * monitors the stdout and stderr channels to log and parse the output messages.
 * It also waits for the error or exit signal of the process. If the build is
 * unsuccessful, the function handles different cases and takes appropriate
 * actions.
 *
 * @param {Step} step - The Step of the process whose I/O is monitored.
 * @param {ProcessEnv} env - The process environment passed to the spawned
 * process.
 * @returns {Promise<boolean>} - A promise representing whether the step is
 * successfully executed.
 */
async function monitorProcess(step: Step, env: ProcessEnv): Promise<boolean> {
    if (lw.compile.process === undefined) {
        return false
    }
    let stdout = ''
    lw.compile.process.stdout.on('data', (msg: Buffer | string) => {
        stdout += msg
        logger.logCompiler(msg.toString())
    })

    let stderr = ''
    lw.compile.process.stderr.on('data', (msg: Buffer | string) => {
        stderr += msg
        logger.logCompiler(msg.toString())
    })

    const result: boolean = await new Promise(resolve => {
        if (lw.compile.process === undefined) {
            resolve(false)
            return
        }
        lw.compile.process.on('error', err => {
            handleProcessError(env, stderr, err)
            resolve(false)
        })

        lw.compile.process.on('exit', (code, signal) => {
            const isSkipped = lw.parser.parse.log(stdout, step.rootFile)
            if (!step.isExternal) {
                step.isSkipped = isSkipped
            }

            if (!step.isExternal && code === 0) {
                logger.log(`Finished a step in recipe with PID ${lw.compile.process?.pid}.`)
                lw.compile.process = undefined
                resolve(true)
                return
            } else if (code === 0) {
                logger.log(`Successfully built document with PID ${lw.compile.process?.pid}.`)
                logger.refreshStatus('check', 'statusBar.foreground', 'Build succeeded.')
                lw.compile.process = undefined
                resolve(true)
                return
            }

            handleExitCodeError(step, env, stderr, code, signal)
            resolve(false)
        })
    })

    return result
}

/**
 * Handles errors that occur during the execution of a tool process. This
 * function logs the error, refreshes the status, and shows an error message
 * to the user.
 *
 * @param {ProcessEnv} env - The process environment passed to the spawned
 * process.
 * @param {string} stderr - The stderr output of the process.
 * @param {Error} err - The error object representing the error.
 */
function handleProcessError(env: ProcessEnv, stderr: string, err: Error) {
    logger.logError(`LaTeX fatal error on PID ${lw.compile.process?.pid}.`, err)
    logger.log(`Does the executable exist? $PATH: ${env['PATH']}, $Path: ${env['Path']}, $SHELL: ${process.env.SHELL}`)
    logger.log(`${stderr}`)
    logger.refreshStatus('x', 'errorForeground', undefined, 'error')
    void logger.showErrorMessageWithExtensionLogButton(`Recipe terminated with fatal error: ${err.message}.`)
    lw.compile.process = undefined
    queue.clear()
}

/**
 * Handles errors that occur when a tool process exits with a non-zero code or
 * signal. The function takes different actions based on the type of error,
 * such as handling retries, cleaning, and showing error messages to the user.
 *
 * @param {Step} step - The Step of the process that exited with an error.
 * @param {ProcessEnv} env - The process environment passed to the spawned
 * process.
 * @param {string} stderr - The stderr output of the process.
 * @param {number | null} code - The exit code of the process.
 * @param {NodeJS.Signals | null} signal - The exit signal of the process.
 */
function handleExitCodeError(step: Step, env: ProcessEnv, stderr: string, code: number | null, signal: NodeJS.Signals | null) {
    if (!step.isExternal) {
        logger.log(`Recipe returns with error code ${code}/${signal} on PID ${lw.compile.process?.pid}.`)
        logger.log(`Does the executable exist? $PATH: ${env['PATH']}, $Path: ${env['Path']}, $SHELL: ${process.env.SHELL}`)
        logger.log(`${stderr}`)
    }

    const configuration = vscode.workspace.getConfiguration('latex-workshop', step.rootFile ? vscode.Uri.file(step.rootFile) : undefined)
    if (!step.isExternal && signal !== 'SIGTERM' && !step.isRetry && configuration.get('latex.autoBuild.cleanAndRetry.enabled')) {
        handleRetryError(step)
    } else if (!step.isExternal && signal !== 'SIGTERM') {
        handleNoRetryError(configuration, step)
    } else if (step.isExternal) {
        handleExternalCommandError()
    } else {
        handleUserTermination()
    }

    lw.compile.process = undefined
}

/**
 * Handles the case where a tool process encounters an error and retries the
 * build process by creating a new Tool and adding it to the BuildToolQueue.
 *
 * @param {RecipeStep} step - The Step representing the tool process.
 */
function handleRetryError(step: RecipeStep) {
    step.isRetry = true
    logger.refreshStatus('x', 'errorForeground', 'Recipe terminated with error. Retry building the project.', 'warning')
    logger.log('Cleaning auxiliary files and retrying build after toolchain error.')

    queue.prepend(step)
    void lw.extra.clean(step.rootFile).then(() => lw.event.fire(lw.event.AutoCleaned))
}

/**
 * Handles the case where a tool process exits with an error and no retries are
 * allowed. It performs cleanup operations, shows error messages to the user,
 * and clears the BuildToolQueue.
 *
 * @param {vscode.WorkspaceConfiguration} configuration - The configuration for
 * the LaTeX project.
 * @param {RecipeStep} step - The Step representing the tool process.
 */
function handleNoRetryError(configuration: vscode.WorkspaceConfiguration, step: RecipeStep) {
    logger.refreshStatus('x', 'errorForeground')
    if (['onFailed', 'onBuilt'].includes(configuration.get('latex.autoClean.run') as string)) {
        void lw.extra.clean(step.rootFile).then(() => lw.event.fire(lw.event.AutoCleaned))
    }
    void logger.showErrorMessageWithCompilerLogButton('Recipe terminated with error.')
    queue.clear()
}

/**
 * Handles the case where an external command process exits with an error. It
 * shows an error message to the user and clears the BuildToolQueue.
 */
function handleExternalCommandError() {
    logger.log(`Build returns with error on PID ${lw.compile.process?.pid}.`)
    logger.refreshStatus('x', 'errorForeground', undefined, 'warning')
    void logger.showErrorMessageWithCompilerLogButton('Build terminated with error.')
    queue.clear()
}

/**
 * Handles the case where a tool process is terminated by the user. It refreshes
 * the status and clears the BuildToolQueue.
 */
function handleUserTermination() {
    logger.refreshStatus('x', 'errorForeground')
    queue.clear()
}

/**
 * Performs follow-up operations after successfully finishing a recipe. This
 * includes refreshing the PDF viewer, cleaning files, and handling SyncTeX if
 * configured.
 *
 * @param {Step} lastStep - The last Step in the recipe.
 * @param {boolean} skipped - Whether the whole building process is skipped by
 * latexmk.
 */
async function afterSuccessfulBuilt(lastStep: Step, skipped: boolean) {
    if (lastStep.rootFile === undefined) {
        // This only happens when the step is an external command.
        lw.viewer.refresh()
        return
    }
    logger.log(`Successfully built ${lastStep.rootFile} .`)
    logger.refreshStatus('check', 'statusBar.foreground', 'Recipe succeeded.')
    lw.event.fire(lw.event.BuildDone)
    if (!lastStep.isExternal && skipped) {
        return
    }
    lw.viewer.refresh(lw.file.getPdfPath(lastStep.rootFile))
    lw.completion.reference.setNumbersFromAuxFile(lastStep.rootFile)
    await lw.cache.loadFlsFile(lastStep.rootFile ?? '')
    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(lastStep.rootFile))
    // If the PDF viewer is internal, we call SyncTeX in src/components/viewer.ts.
    if (configuration.get('view.pdf.viewer') === 'external' && configuration.get('synctex.afterBuild.enabled')) {
        const pdfFile = lw.file.getPdfPath(lastStep.rootFile)
        logger.log('SyncTex after build invoked.')
        lw.locate.synctex.toPDF(undefined, undefined, pdfFile)
    }
    if (['onSucceeded', 'onBuilt'].includes(configuration.get('latex.autoClean.run') as string)) {
        logger.log('Auto Clean invoked.')
        await lw.extra.clean(lastStep.rootFile)
        lw.event.fire(lw.event.AutoCleaned)
    }
}
