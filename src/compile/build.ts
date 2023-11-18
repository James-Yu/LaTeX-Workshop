import * as vscode from 'vscode'
import * as path from 'path'
import * as cs from 'cross-spawn'
import * as lw from '../lw'
import { AutoBuildInitiated, AutoCleaned, BuildDone } from '../core/event-bus'
import { rootFile as pickRootFile } from '../utils/quick-pick'
import { parser } from '../parse/parser'
import { BIB_MAGIC_PROGRAM_NAME, MAGIC_PROGRAM_ARGS_SUFFIX, MAX_PRINT_LINE, TEX_MAGIC_PROGRAM_NAME, build as buildRecipe } from './recipe'
import { build as buildExternal } from './external'
import { queue } from './queue'

import { extension } from '../extension'
import type { ProcessEnv, Step } from '.'

const logger = extension.log('Build')

export {
    autoBuild,
    build,
}

extension.watcher.src.onChange(filePath => autoBuild(filePath, 'onFileChange'))
extension.watcher.bib.onChange(filePath => autoBuild(filePath, 'onFileChange', true))

function autoBuild(file: string, type: 'onFileChange' | 'onSave',  bibChanged: boolean = false) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(file))
    if (configuration.get('latex.autoBuild.run') as string !== type) {
        return
    }
    logger.log('Auto build started' + (type === 'onFileChange' ? 'detecting the change of a file' : 'on saving file') + `: ${file} .`)
    lw.eventBus.fire(AutoBuildInitiated, {type, file})
    if (!canAutoBuild()) {
        logger.log('Autobuild temporarily disabled.')
        return
    }
    if (!bibChanged && lw.manager.localRootFile && configuration.get('latex.rootFile.useSubFile')) {
        return build(true, lw.manager.localRootFile, lw.manager.rootFileLanguageId)
    } else {
        return build(true, lw.manager.rootFile, lw.manager.rootFileLanguageId)
    }
}

/**
 * This function determines whether an auto-build on save or on change can be
 * triggered. There are two conditions that this function should take care of:
 * 1. Defined `latex.autoBuild.interval` config, 2. Unwanted auto-build
 * triggered by the `saveAll()` in another previous building process.
 */
function canAutoBuild(): boolean {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', lw.manager.rootFile ? vscode.Uri.file(lw.manager.rootFile) : undefined)
    if (Date.now() - extension.compile.lastBuildTime < (configuration.get('latex.autoBuild.interval', 1000) as number)) {
        return false
    }
    return true
}

async function build(skipSelection: boolean = false, rootFile: string | undefined = undefined, languageId: string | undefined = undefined, recipe: string | undefined = undefined) {
    if (!vscode.window.activeTextEditor) {
        logger.log('Cannot start to build because the active editor is undefined.')
        return
    }
    logger.log(`The document of the active editor: ${vscode.window.activeTextEditor.document.uri.toString(true)}`)
    logger.log(`The languageId of the document: ${vscode.window.activeTextEditor.document.languageId}`)
    const workspace = rootFile ? vscode.Uri.file(rootFile) : vscode.window.activeTextEditor.document.uri
    const configuration = vscode.workspace.getConfiguration('latex-workshop', workspace)
    const externalBuildCommand = configuration.get('latex.external.build.command') as string
    const externalBuildArgs = configuration.get('latex.external.build.args') as string[]
    if (rootFile === undefined && lw.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
        rootFile = await lw.manager.findRoot()
        languageId = lw.manager.rootFileLanguageId
    }
    if (externalBuildCommand) {
        const pwd = path.dirname(rootFile ? rootFile : vscode.window.activeTextEditor.document.fileName)
        await buildExternal(externalBuildCommand, externalBuildArgs, pwd, buildLoop, rootFile)
        return
    }
    if (rootFile === undefined || languageId === undefined) {
        logger.log('Cannot find LaTeX root file. See https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile#the-root-file')
        return
    }
    let pickedRootFile: string | undefined = rootFile
    if (!skipSelection && lw.manager.localRootFile) {
        // We are using the subfile package
        pickedRootFile = await pickRootFile(rootFile, lw.manager.localRootFile, 'build')
        if (! pickedRootFile) {
            return
        }
    }
    logger.log(`Building root file: ${pickedRootFile}`)
    await buildRecipe(pickedRootFile, languageId, buildLoop, recipe)
}

/**
 * This function returns if there is another {@link buildLoop} function/loop
 * running. If not, this function iterates through the
 * {@link BuildToolQueue} and execute each {@link Tool} one by one. During
 * this process, the {@link Tool}s in {@link BuildToolQueue} can be
 * dynamically added or removed, handled by {@link BuildToolQueue}.
 */
async function buildLoop() {
    if (extension.compile.compiling) {
        return
    }

    extension.compile.compiling = true
    extension.compile.lastBuildTime = Date.now()
    // Stop watching the PDF file to avoid reloading the PDF viewer twice.
    // The builder will be responsible for refreshing the viewer.
    let skipped = true
    while (true) {
        const step = queue.getStep()
        if (step === undefined) {
            break
        }
        lw.manager.compiledRootFile = step.rootFile
        const env = spawnProcess(step)
        const success = await monitorProcess(step, env)
        skipped = skipped && !(step.isExternal || !step.isSkipped)
        if (success && queue.isLastStep(step)) {
            await afterSuccessfulBuilt(step, skipped)
        }
    }
    extension.compile.compiling = false
}
/**
 * Spawns a `child_process` for the {@link step}. This function first
 * creates the environment variables needed for the {@link step}. Then a
 * process is spawned according to the nature of the {@link step}: 1) is a
 * magic command (tex or bib), 2) is a recipe tool, or 3) is an external
 * command. After spawned, the process is stored as a class property, and
 * the io handling is performed in {@link monitorProcess}.
 *
 * @param step The {@link Step} to be executed.
 * @returns The process environment passed to the spawned process.
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

    const env = Object.create(null) as ProcessEnv
    Object.entries(process.env).forEach(([key, value]) => env[key] = value)
    Object.entries(step.env ?? {}).forEach(([key, value]) => env[key] = value)
    env['max_print_line'] = MAX_PRINT_LINE

    if (!step.isExternal &&
        (step.name.startsWith(TEX_MAGIC_PROGRAM_NAME) ||
            step.name.startsWith(BIB_MAGIC_PROGRAM_NAME))) {
        logger.log(`cwd: ${path.dirname(step.rootFile)}`)

        const args = step.args
        if (args && !step.name.endsWith(MAGIC_PROGRAM_ARGS_SUFFIX)) {
            // All optional arguments are given as a unique string (% !TeX options) if any, so we use {shell: true}
            extension.compile.process = cs.spawn(`${step.command} ${args[0]}`, [], {cwd: path.dirname(step.rootFile), env, shell: true})
        } else {
            extension.compile.process = cs.spawn(step.command, args, {cwd: path.dirname(step.rootFile), env})
        }
    } else if (!step.isExternal) {
        let cwd = path.dirname(step.rootFile)
        if (step.command === 'latexmk' && step.rootFile === lw.manager.localRootFile && lw.manager.rootDir) {
            cwd = lw.manager.rootDir
        }
        logger.log(`cwd: ${cwd}`)
        extension.compile.process = cs.spawn(step.command, step.args, {cwd, env})
    } else {
        logger.log(`cwd: ${step.cwd}`)
        extension.compile.process = cs.spawn(step.command, step.args, {cwd: step.cwd})
    }
    logger.log(`LaTeX build process spawned with PID ${extension.compile.process.pid}.`)
    return env
}

/**
 * Monitors the output and termination of the tool process. This function
 * monitors the `stdout` and `stderr` channels to log and parse the output
 * messages. This function also **waits** for `error` or `exit` signal of
 * the process. The former indicates an unexpected error, e.g., killed by
 * user or ENOENT, and the latter is the typical exit of the process,
 * successfully built or not. If the build is unsuccessful (code != 0), this
 * function considers the four different cases: 1) tool of a recipe, not
 * terminated by user, is not a retry and should retry, 2) tool of a recipe,
 * not terminated by user, is a retry or should not retry, 3) unsuccessful
 * external command, won't retry regardless of the retry config, and 4)
 * terminated by user. In the first case, a retry {@link Tool} is created
 * and added to the {@link BuildToolQueue} based on {@link step}. In the
 * latter three, all subsequent tools in queue are cleared, including ones
 * in the current recipe and (if available) those from the cached recipe to
 * be executed.
 *
 * @param step The {@link Step} of process whose io is monitored.
 * @param env The process environment passed to the spawned process.
 * @return Whether the step is successfully executed.
 */
async function monitorProcess(step: Step, env: ProcessEnv): Promise<boolean> {
    if (extension.compile.process === undefined) {
        return false
    }
    let stdout = ''
    extension.compile.process.stdout.on('data', (msg: Buffer | string) => {
        stdout += msg
        logger.logCompiler(msg.toString())
    })

    let stderr = ''
    extension.compile.process.stderr.on('data', (msg: Buffer | string) => {
        stderr += msg
        logger.logCompiler(msg.toString())
    })

    const result: boolean = await new Promise(resolve => {
        if (extension.compile.process === undefined) {
            resolve(false)
            return
        }
        extension.compile.process.on('error', err => {
            logger.logError(`LaTeX fatal error on PID ${extension.compile.process?.pid}.`, err)
            logger.log(`Does the executable exist? $PATH: ${env['PATH']}, $Path: ${env['Path']}, $SHELL: ${process.env.SHELL}`)
            logger.log(`${stderr}`)
            logger.refreshStatus('x', 'errorForeground', undefined, 'error')
            void logger.showErrorMessageWithExtensionLogButton(`Recipe terminated with fatal error: ${err.message}.`)
            extension.compile.process = undefined
            queue.clear()
            resolve(false)
        })

        extension.compile.process.on('exit', async (code, signal) => {
            const isSkipped = parser.parseLog(stdout, step.rootFile)
            if (!step.isExternal) {
                step.isSkipped = isSkipped
            }

            if (!step.isExternal && code === 0) {
                logger.log(`Finished a step in recipe with PID ${extension.compile.process?.pid}.`)
                extension.compile.process = undefined
                resolve(true)
                return
            } else if (code === 0) {
                logger.log(`Successfully built document with PID ${extension.compile.process?.pid}.`)
                logger.refreshStatus('check', 'statusBar.foreground', 'Build succeeded.')
                extension.compile.process = undefined
                resolve(true)
                return
            }

            if (!step.isExternal) {
                logger.log(`Recipe returns with error code ${code}/${signal} on PID ${extension.compile.process?.pid}.`)
                logger.log(`Does the executable exist? $PATH: ${env['PATH']}, $Path: ${env['Path']}, $SHELL: ${process.env.SHELL}`)
                logger.log(`${stderr}`)
            }

            const configuration = vscode.workspace.getConfiguration('latex-workshop', step.rootFile ? vscode.Uri.file(step.rootFile) : undefined)
            if (!step.isExternal && signal !== 'SIGTERM' && !step.isRetry && configuration.get('latex.autoBuild.cleanAndRetry.enabled')) {
                // Recipe, not terminated by user, is not retry and should retry
                step.isRetry = true
                logger.refreshStatus('x', 'errorForeground', 'Recipe terminated with error. Retry building the project.', 'warning')
                logger.log('Cleaning auxiliary files and retrying build after toolchain error.')

                queue.prepend(step)
                await lw.cleaner.clean(step.rootFile)
                lw.eventBus.fire(AutoCleaned)
            } else if (!step.isExternal && signal !== 'SIGTERM') {
                // Recipe, not terminated by user, is retry or should not retry
                logger.refreshStatus('x', 'errorForeground')
                if (['onFailed', 'onBuilt'].includes(configuration.get('latex.autoClean.run') as string)) {
                    await lw.cleaner.clean(step.rootFile)
                    lw.eventBus.fire(AutoCleaned)
                }
                void logger.showErrorMessageWithCompilerLogButton('Recipe terminated with error.')
                queue.clear()
            } else if (step.isExternal) {
                // External command
                logger.log(`Build returns with error: ${code}/${signal} on PID ${extension.compile.process?.pid}.`)
                logger.refreshStatus('x', 'errorForeground', undefined, 'warning')
                void logger.showErrorMessageWithCompilerLogButton('Build terminated with error.')
                queue.clear()
            } else {
                // Terminated by user
                logger.refreshStatus('x', 'errorForeground')
                queue.clear()
            }
            extension.compile.process = undefined
            resolve(false)
        })
    })

    return result
}

/**
 * Some follow-up operations after successfully finishing a recipe.
 * Primarily concerning PDF refreshing and file cleaning. The execution is
 * covered in {@link buildLoop}.
 *
 * @param lastStep The last {@link Step} in the recipe.
 * @param skipped Whether the **whole** building process is skipped by
 * latexmk.
 */
async function afterSuccessfulBuilt(lastStep: Step, skipped: boolean) {
    if (lastStep.rootFile === undefined) {
        // This only happens when the step is an external command.
        lw.viewer.refreshExistingViewer()
        return
    }
    logger.log(`Successfully built ${lastStep.rootFile} .`)
    logger.refreshStatus('check', 'statusBar.foreground', 'Recipe succeeded.')
    lw.eventBus.fire(BuildDone)
    if (!lastStep.isExternal && skipped) {
        return
    }
    lw.viewer.refreshExistingViewer(lw.manager.tex2pdf(lastStep.rootFile))
    lw.completer.reference.setNumbersFromAuxFile(lastStep.rootFile)
    extension.cache.loadFlsFile(lastStep.rootFile ?? '')
    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(lastStep.rootFile))
    // If the PDF viewer is internal, we call SyncTeX in src/components/viewer.ts.
    if (configuration.get('view.pdf.viewer') === 'external' && configuration.get('synctex.afterBuild.enabled')) {
        const pdfFile = lw.manager.tex2pdf(lastStep.rootFile)
        logger.log('SyncTex after build invoked.')
        lw.locator.syncTeX(undefined, undefined, pdfFile)
    }
    if (['onSucceeded', 'onBuilt'].includes(configuration.get('latex.autoClean.run') as string)) {
        logger.log('Auto Clean invoked.')
        await lw.cleaner.clean(lastStep.rootFile)
        lw.eventBus.fire(AutoCleaned)
    }
}
