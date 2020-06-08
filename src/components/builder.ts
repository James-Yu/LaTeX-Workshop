import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as cp from 'child_process'
import * as cs from 'cross-spawn'
import * as tmp from 'tmp'
import * as pdfjsLib from 'pdfjs-dist'
import {Mutex} from '../lib/await-semaphore'
import {replaceArgumentPlaceholders} from '../utils/utils'

import {Extension} from '../main'

const maxPrintLine = '10000'
const texMagicProgramName = 'TeXMagicProgram'
const bibMagicProgramName = 'BibMagicProgram'

export class Builder {
    extension: Extension
    tmpDir: string
    currentProcess: cp.ChildProcessWithoutNullStreams | undefined
    disableBuildAfterSave: boolean = false
    disableCleanAndRetry: boolean = false
    buildMutex: Mutex
    waitingForBuildToFinishMutex: Mutex
    isMiktex: boolean = false
    previouslyUsedRecipe: {name: string, tools: (string | StepCommand)[]} | undefined
    previousLanguageId: string | undefined

    constructor(extension: Extension) {
        this.extension = extension
        try {
            this.tmpDir = tmp.dirSync({unsafeCleanup: true}).name.split(path.sep).join('/')
        } catch (e) {
            vscode.window.showErrorMessage('Error during making tmpdir to build TeX files. Please check the environment variables, TEMP, TMP, and TMPDIR on your system.')
            throw e
        }
        this.buildMutex = new Mutex()
        this.waitingForBuildToFinishMutex = new Mutex()
        try {
            const pdflatexVersion = cp.execSync('pdflatex --version')
            if (pdflatexVersion.toString().match(/MiKTeX/)) {
                this.isMiktex = true
                this.extension.logger.addLogMessage('pdflatex is provided by MiKTeX')
            }
        } catch (e) {
            this.extension.logger.addLogMessage('Cannot run pdflatex to determine if we are using MiKTeX')
        }
    }

    kill() {
        const proc = this.currentProcess
        if (proc) {
            const pid = proc.pid
            if (process.platform === 'linux' || process.platform === 'darwin') {
                cp.exec(`pkill -P ${pid}`)
            } else if (process.platform === 'win32') {
                cp.exec(`taskkill /F /T /PID ${pid}`)
            }
            proc.kill()
            this.extension.logger.addLogMessage(`Kill the current process. PID: ${pid}.`)
        } else {
            this.extension.logger.addLogMessage('LaTeX build process to kill is not found.')
        }
    }

    /**
     * Should not use. Only for integration tests.
     */
    isBuildFinished(): boolean {
        return this.buildMutex.count === 1
    }

    isWaitingForBuildToFinish(): boolean {
        return this.waitingForBuildToFinishMutex.count < 1
    }

    async preprocess(): Promise<() => void> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        this.disableBuildAfterSave = true
        await vscode.workspace.saveAll()
        setTimeout(() => this.disableBuildAfterSave = false, configuration.get('latex.autoBuild.interval', 1000) as number)
        const releaseWaiting = await this.waitingForBuildToFinishMutex.acquire()
        const releaseBuildMutex = await this.buildMutex.acquire()
        releaseWaiting()
        return releaseBuildMutex
    }

    async buildWithExternalCommand(command: string, args: string[], pwd: string, rootFile: string | undefined = undefined) {
        if (this.isWaitingForBuildToFinish()) {
            return
        }
        const releaseBuildMutex = await this.preprocess()
        this.extension.logger.displayStatus('sync~spin', 'statusBar.foreground')
        let wd = pwd
        const ws = vscode.workspace.workspaceFolders
        if (ws && ws.length > 0) {
            wd = ws[0].uri.fsPath
        }

        if (rootFile !== undefined) {
            args = args.map(replaceArgumentPlaceholders(rootFile, this.tmpDir))
        }
        this.extension.logger.addLogMessage(`Build using the external command: ${command} ${args.length > 0 ? args.join(' '): ''}`)
        this.extension.logger.addLogMessage(`cwd: ${wd}`)
        this.currentProcess = cs.spawn(command, args, {cwd: wd})
        const pid = this.currentProcess.pid
        this.extension.logger.addLogMessage(`External build process spawned. PID: ${pid}.`)

        let stdout = ''
        this.currentProcess.stdout.on('data', newStdout => {
            stdout += newStdout
            this.extension.logger.addCompilerMessage(newStdout.toString())
        })

        let stderr = ''
        this.currentProcess.stderr.on('data', newStderr => {
            stderr += newStderr
            this.extension.logger.addCompilerMessage(newStderr.toString())
        })

        this.currentProcess.on('error', err => {
            this.extension.logger.addLogMessage(`Build fatal error: ${err.message}, ${stderr}. PID: ${pid}. Does the executable exist?`)
            this.extension.logger.displayStatus('x', 'errorForeground', `Build terminated with fatal error: ${err.message}.`, 'error')
            this.currentProcess = undefined
            releaseBuildMutex()
        })

        this.currentProcess.on('exit', (exitCode, signal) => {
            this.extension.logParser.parse(stdout)
            if (exitCode !== 0) {
                this.extension.logger.addLogMessage(`Build returns with error: ${exitCode}/${signal}. PID: ${pid}.`)
                this.extension.logger.displayStatus('x', 'errorForeground', 'Build terminated with error', 'warning')
                const res = this.extension.logger.showErrorMessage('Build terminated with error.', 'Open compiler log')
                if (res) {
                    res.then(option => {
                        switch (option) {
                            case 'Open compiler log':
                                this.extension.logger.showCompilerLog()
                                break
                            default:
                                break
                        }
                    })
                }
            } else {
                this.extension.logger.addLogMessage(`Successfully built. PID: ${pid}`)
                this.extension.logger.displayStatus('check', 'statusBar.foreground', 'Build succeeded.')
                try {
                    if (rootFile === undefined) {
                        this.extension.viewer.refreshExistingViewer()
                    } else {
                        this.buildFinished(rootFile)
                    }
                } finally {
                    this.currentProcess = undefined
                    releaseBuildMutex()
                }
            }
            this.currentProcess = undefined
            releaseBuildMutex()
        })
    }

    buildInitiator(rootFile: string, languageId: string, recipe: string | undefined = undefined, releaseBuildMutex: () => void) {
        const steps = this.createSteps(rootFile, languageId, recipe)
        if (steps === undefined) {
            this.extension.logger.addLogMessage('Invalid toolchain.')
            return
        }
        this.buildStep(rootFile, steps, 0, recipe || 'Build', releaseBuildMutex) // use 'Build' as default name
    }

    async build(rootFile: string, languageId: string, recipe: string | undefined = undefined) {
        if (this.isWaitingForBuildToFinish()) {
            this.extension.logger.addLogMessage('Another LaTeX build processing is already waiting for the current LaTeX build to finish. Exit.')
            return
        }
        const releaseBuildMutex = await this.preprocess()
        this.disableCleanAndRetry = false
        this.extension.logger.displayStatus('sync~spin', 'statusBar.foreground')
        this.extension.logger.addLogMessage(`Build root file ${rootFile}`)
        try {
            const configuration = vscode.workspace.getConfiguration('latex-workshop')
            if ((configuration.get('progress.location') as string) === 'Status Bar') {
                this.extension.buildInfo.buildStarted()
            } else {
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Running build process',
                    cancellable: true
                }, (progress, token) => {
                    token.onCancellationRequested(this.kill.bind(this))
                    this.extension.buildInfo.buildStarted(progress)
                    const p = new Promise(resolve => {
                        this.extension.buildInfo.setResolveToken(resolve)
                    })
                    return p
                })
            }
            try {
                const doc = await pdfjsLib.getDocument(this.extension.manager.tex2pdf(rootFile, true)).promise
                this.extension.buildInfo.setPageTotal(doc.numPages)
            } catch(e) {

            }
            // Create sub directories of output directory
            // This was supposed to create the outputDir as latexmk does not
            // take care of it (neither does any of latex command). If the
            //output directory does not exist, the latex commands simply fail.
            const rootDir = path.dirname(rootFile)
            let outDir = this.extension.manager.getOutDir(rootFile)
            if (!path.isAbsolute(outDir)) {
                outDir = path.resolve(rootDir, outDir)
            }
            this.extension.manager.getIncludedTeX(rootFile).forEach(file => {
                const relativePath = path.dirname(file.replace(rootDir, '.'))
                fs.ensureDirSync(path.resolve(outDir, relativePath))
            })
            this.buildInitiator(rootFile, languageId, recipe, releaseBuildMutex)
        } catch (e) {
            this.extension.logger.addLogMessage('Unexpected Error: please see the console log of the Developer Tools of VS Code.')
            this.extension.logger.displayStatus('x', 'errorForeground')
            this.extension.buildInfo.buildEnded()
            releaseBuildMutex()
            throw(e)
        }
    }

    progressString(recipeName: string, steps: StepCommand[], index: number) {
        if (steps.length < 2) {
            return recipeName
        } else {
            return recipeName + `: ${index + 1}/${steps.length} (${steps[index].name})`
        }
    }

    buildStep(rootFile: string, steps: StepCommand[], index: number, recipeName: string, releaseBuildMutex: () => void) {
        if (index === 0) {
            this.extension.logger.clearCompilerMessage()
        }
        if (index > 0) {
            const configuration = vscode.workspace.getConfiguration('latex-workshop')
            if (configuration.get('latex.build.clearLog.everyRecipeStep.enabled')) {
                this.extension.logger.clearCompilerMessage()
            }
        }
        this.extension.logger.displayStatus('sync~spin', 'statusBar.foreground', undefined, undefined, ` ${this.progressString(recipeName, steps, index)}`)
        this.extension.logger.addLogMessage(`Recipe step ${index + 1}: ${steps[index].command}, ${steps[index].args}`)
        this.extension.manager.setEnvVar()
        const envVars: ProcessEnv = {}
        Object.keys(process.env).forEach(key => envVars[key] = process.env[key])
        const currentEnv = steps[index].env
        if (currentEnv) {
            Object.keys(currentEnv).forEach(key => envVars[key] = currentEnv[key])
        }
        envVars['max_print_line'] = maxPrintLine
        if (steps[index].name === texMagicProgramName || steps[index].name === bibMagicProgramName) {
            // All optional arguments are given as a unique string (% !TeX options) if any, so we use {shell: true}
            let command = steps[index].command
            const args = steps[index].args
            if (args) {
                command += ' ' + args[0]
            }
            this.extension.logger.addLogMessage(`cwd: ${path.dirname(rootFile)}`)
            this.currentProcess = cs.spawn(command, [], {cwd: path.dirname(rootFile), env: envVars, shell: true})
        } else {
            let workingDirectory: string
            if (steps[index].command === 'latexmk' && rootFile === this.extension.manager.localRootFile && this.extension.manager.rootDir) {
                workingDirectory = this.extension.manager.rootDir
            } else {
                workingDirectory = path.dirname(rootFile)
            }
            this.extension.logger.addLogMessage(`cwd: ${workingDirectory}`)
            this.currentProcess = cs.spawn(steps[index].command, steps[index].args, {cwd: workingDirectory, env: envVars})
        }
        const pid = this.currentProcess.pid
        this.extension.logger.addLogMessage(`LaTeX build process spawned. PID: ${pid}.`)

        let stdout = ''
        this.currentProcess.stdout.on('data', newStdout => {
            stdout += newStdout
            this.extension.logger.addCompilerMessage(newStdout.toString())
            try {
                this.extension.buildInfo.newStdoutLine(newStdout.toString())
            } catch(e) {

            }
        })

        let stderr = ''
        this.currentProcess.stderr.on('data', newStderr => {
            stderr += newStderr
            this.extension.logger.addCompilerMessage(newStderr.toString())
        })

        this.currentProcess.on('error', err => {
            this.extension.logger.addLogMessage(`LaTeX fatal error: ${err.message}, ${stderr}. PID: ${pid}.`)
            this.extension.logger.addLogMessage(`Does the executable exist? PATH: ${process.env.PATH}`)
            this.extension.logger.displayStatus('x', 'errorForeground', `Recipe terminated with fatal error: ${err.message}.`, 'error')
            this.currentProcess = undefined
            this.extension.buildInfo.buildEnded()
            releaseBuildMutex()
        })

        this.currentProcess.on('exit', (exitCode, signal) => {
            this.extension.logParser.parse(stdout, rootFile)
            if (exitCode !== 0) {
                this.extension.logger.addLogMessage(`Recipe returns with error: ${exitCode}/${signal}. PID: ${pid}. message: ${stderr}.`)
                this.extension.buildInfo.buildEnded()

                const configuration = vscode.workspace.getConfiguration('latex-workshop')
                if (!this.disableCleanAndRetry && configuration.get('latex.autoBuild.cleanAndRetry.enabled')) {
                    this.disableCleanAndRetry = true
                    if (signal !== 'SIGTERM') {
                        this.extension.logger.displayStatus('x', 'errorForeground', 'Recipe terminated with error. Retry building the project.', 'warning')
                        this.extension.logger.addLogMessage('Cleaning auxiliary files and retrying build after toolchain error.')

                        this.extension.cleaner.clean(rootFile).then(() => {
                            this.buildStep(rootFile, steps, 0, recipeName, releaseBuildMutex)
                        })
                    } else {
                        this.extension.logger.displayStatus('x', 'errorForeground')
                        this.currentProcess = undefined
                        releaseBuildMutex()
                    }
                } else {
                    this.extension.logger.displayStatus('x', 'errorForeground')
                    if (['onFailed', 'onBuilt'].includes(configuration.get('latex.autoClean.run') as string)) {
                        this.extension.cleaner.clean(rootFile)
                    }
                    const res = this.extension.logger.showErrorMessage('Recipe terminated with error.', 'Open compiler log')
                    if (res) {
                        res.then(option => {
                            switch (option) {
                                case 'Open compiler log':
                                    this.extension.logger.showCompilerLog()
                                    break
                                default:
                                    break
                            }
                        })
                    }
                    this.currentProcess = undefined
                    releaseBuildMutex()
                }
            } else {
                if (index === steps.length - 1) {
                    this.extension.logger.addLogMessage(`Recipe of length ${steps.length} finished. PID: ${pid}.`)
                    try {
                        this.buildFinished(rootFile)
                    } finally {
                        this.currentProcess = undefined
                        releaseBuildMutex()
                    }
                } else {
                    this.extension.logger.addLogMessage(`A step in recipe finished. PID: ${pid}.`)
                    this.buildStep(rootFile, steps, index + 1, recipeName, releaseBuildMutex)
                }
            }
        })
    }

    buildFinished(rootFile: string) {
        this.extension.buildInfo.buildEnded()
        this.extension.logger.addLogMessage(`Successfully built ${rootFile}.`)
        this.extension.logger.displayStatus('check', 'statusBar.foreground', 'Recipe succeeded.')
        if (this.extension.logParser.isLaTeXmkSkipped) {
            return
        }
        this.extension.viewer.refreshExistingViewer(rootFile)
        this.extension.completer.reference.setNumbersFromAuxFile(rootFile)
        this.extension.manager.parseFlsFile(rootFile)
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (configuration.get('view.pdf.viewer') === 'external' && configuration.get('synctex.afterBuild.enabled')) {
            const pdfFile = this.extension.manager.tex2pdf(rootFile)
            this.extension.logger.addLogMessage('SyncTex after build invoked.')
            this.extension.locator.syncTeX(undefined, undefined, pdfFile)
        }
        if (configuration.get('latex.autoClean.run') as string === 'onBuilt') {
            this.extension.logger.addLogMessage('Auto Clean invoked.')
            this.extension.cleaner.clean(rootFile)
        }
    }

    createSteps(rootFile: string, languageId: string, recipeName: string | undefined): StepCommand[] | undefined {
        let steps: StepCommand[] = []
        const configuration = vscode.workspace.getConfiguration('latex-workshop')

        const [magicTex, magicBib] = this.findProgramMagic(rootFile)
        if (recipeName === undefined && magicTex && !configuration.get('latex.build.forceRecipeUsage')) {
            if (! magicTex.args) {
                magicTex.args = configuration.get('latex.magic.args') as string[]
                magicTex.name = texMagicProgramName + 'WithArgs'
            }
            if (magicBib) {
                if (! magicBib.args) {
                    magicBib.args = configuration.get('latex.magic.bib.args') as string[]
                    magicBib.name = bibMagicProgramName + 'WithArgs'
                }
                steps = [magicTex, magicBib, magicTex, magicTex]
            } else {
                steps = [magicTex]
            }
        } else {
            const recipes = configuration.get('latex.recipes') as {name: string, tools: (string | StepCommand)[]}[]
            const tools = configuration.get('latex.tools') as StepCommand[]
            if (recipes.length < 1) {
                this.extension.logger.addLogMessage('No recipes defined.')
                this.extension.logger.showErrorMessage('No recipes defined.')
                return undefined
            }
            let recipe = recipes[0]
            if (this.previousLanguageId !== languageId) {
                this.previouslyUsedRecipe = undefined
            }
            const defaultRecipe = configuration.get('latex.recipe.default') as string
            if ((defaultRecipe === 'lastUsed') && (this.previouslyUsedRecipe !== undefined)) {
                recipe = this.previouslyUsedRecipe
            } else if ((defaultRecipe !== 'first') && (defaultRecipe !== 'lastUsed') && recipeName === undefined) {
               recipeName = defaultRecipe
            }
            if (recipeName) {
                const candidates = recipes.filter(candidate => candidate.name === recipeName)
                if (candidates.length < 1) {
                    this.extension.logger.addLogMessage(`Failed to resolve build recipe: ${recipeName}`)
                    this.extension.logger.showErrorMessage(`Failed to resolve build recipe: ${recipeName}`)
                }
                recipe = candidates[0]
            } else {
               let candidates: {name: string, tools: (string | StepCommand)[]}[] = recipes
               if (languageId === 'rsweave') {
                    candidates = recipes.filter(candidate => candidate.name.toLowerCase().match('rnw|rsweave'))
               } else if (languageId === 'jlweave') {
                    candidates = recipes.filter(candidate => candidate.name.toLowerCase().match('jnw|jlweave|weave.jl'))
               }
                if (candidates.length < 1) {
                    this.extension.logger.addLogMessage(`Failed to resolve build recipe: ${recipeName}`)
                    this.extension.logger.showErrorMessage(`Failed to resolve build recipe: ${recipeName}`)
                }
                recipe = candidates[0]
            }
            this.previouslyUsedRecipe = recipe
            this.previousLanguageId = languageId

            recipe.tools.forEach(tool => {
                if (typeof tool === 'string') {
                    const candidates = tools.filter(candidate => candidate.name === tool)
                    if (candidates.length < 1) {
                        this.extension.logger.showErrorMessage(`Skipping undefined tool "${tool}" in recipe "${recipe.name}."`)
                    } else {
                        steps.push(candidates[0])
                    }
                } else {
                    steps.push(tool)
                }
            })
        }
        /**
         * Use JSON.parse and JSON.stringify for a deep copy.
         */
        steps = JSON.parse(JSON.stringify(steps))

        const docker = configuration.get('docker.enabled')
        steps.forEach(step => {
            if (docker) {
                switch (step.command) {
                    case 'latexmk':
                        if (process.platform === 'win32') {
                            step.command = path.resolve(this.extension.extensionRoot, './scripts/latexmk.bat')
                        } else {
                            step.command = path.resolve(this.extension.extensionRoot, './scripts/latexmk')
                            fs.chmodSync(step.command, 0o755)
                        }
                        break
                    default:
                        break
                }
            }
            if (step.args) {
                step.args = step.args.map(replaceArgumentPlaceholders(rootFile, this.tmpDir))
            }
            if (step.env) {
                Object.keys(step.env).forEach( v => {
                    const e = step.env && step.env[v]
                    if (step.env && e) {
                        step.env[v] = replaceArgumentPlaceholders(rootFile, this.tmpDir)(e)
                    }
                })
            }
            if (configuration.get('latex.option.maxPrintLine.enabled')) {
                if (!step.args) {
                    step.args = []
                }
                if (this.isMiktex && ((step.command === 'latexmk' && !step.args.includes('-lualatex') && !step.args.includes('-pdflua')) || step.command === 'pdflatex')) {
                    step.args.unshift('--max-print-line=' + maxPrintLine)
                }
            }
        })
        return steps
    }

    findProgramMagic(rootFile: string): [StepCommand | undefined, StepCommand | undefined] {
        const regexTex = /^(?:%\s*!\s*T[Ee]X\s(?:TS-)?program\s*=\s*([^\s]*)$)/m
        const regexBib = /^(?:%\s*!\s*BIB\s(?:TS-)?program\s*=\s*([^\s]*)$)/m
        const regexTexOptions = /^(?:%\s*!\s*T[Ee]X\s(?:TS-)?options\s*=\s*(.*)$)/m
        const regexBibOptions = /^(?:%\s*!\s*BIB\s(?:TS-)?options\s*=\s*(.*)$)/m
        const content = fs.readFileSync(rootFile).toString()

        const tex = content.match(regexTex)
        const bib = content.match(regexBib)
        let texCommand: StepCommand | undefined = undefined
        let bibCommand: StepCommand | undefined = undefined

        if (tex) {
            texCommand = {
                name: texMagicProgramName,
                command: tex[1]
            }
            this.extension.logger.addLogMessage(`Found TeX program by magic comment: ${texCommand.command}`)
            const res = content.match(regexTexOptions)
            if (res) {
                texCommand.args = [res[1]]
                this.extension.logger.addLogMessage(`Found TeX options by magic comment: ${texCommand.args}`)
            }
        }

        if (bib) {
            bibCommand = {
                name: bibMagicProgramName,
                command: bib[1]
            }
            this.extension.logger.addLogMessage(`Found BIB program by magic comment: ${bibCommand.command}`)
            const res = content.match(regexBibOptions)
            if (res) {
                bibCommand.args = [res[1]]
                this.extension.logger.addLogMessage(`Found BIB options by magic comment: ${bibCommand.args}`)
            }
        }

        return [texCommand, bibCommand]
    }
}

interface ProcessEnv {
    [key: string]: string | undefined
}

interface StepCommand {
    name: string,
    command: string,
    args?: string[],
    env?: ProcessEnv
}
