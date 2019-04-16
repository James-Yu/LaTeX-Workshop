import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as cp from 'child_process'
import * as tmp from 'tmp'
import * as pdfjsLib from 'pdfjs-dist'
import {Mutex} from '../lib/await-semaphore'

import {Extension} from '../main'
import {ExternalCommand} from '../utils'

const maxPrintLine = '10000'
const texMagicProgramName = 'TeXMagicProgram'
const bibMagicProgramName = 'BibMagicProgram'

export class Builder {
    extension: Extension
    tmpDir: string
    currentProcess: cp.ChildProcess | undefined
    disableBuildAfterSave: boolean = false
    disableCleanAndRetry: boolean = false
    buildMutex: Mutex
    waitingForBuildToFinishMutex: Mutex
    isMiktex: boolean = false
    previouslyUsedRecipe: {name: string, tools: (string | StepCommand)[]} | undefined

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
            proc.kill()
            this.extension.logger.addLogMessage(`Kill the current process. PID: ${pid}.`)
        } else {
            this.extension.logger.addLogMessage('LaTeX build process to kill is not found.')
        }
    }

    isWaitingForBuildToFinish() : boolean {
        return this.waitingForBuildToFinishMutex.count < 1
    }

    async preprocess() : Promise<() => void> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        this.disableBuildAfterSave = true
        await vscode.workspace.saveAll()
        setTimeout(() => this.disableBuildAfterSave = false, configuration.get('latex.autoBuild.interval', 1000) as number)
        const releaseWaiting = await this.waitingForBuildToFinishMutex.acquire()
        const releaseBuildMutex = await this.buildMutex.acquire()
        releaseWaiting()
        return releaseBuildMutex
    }

    async buildWithExternalCommand(command: ExternalCommand, pwd: string) {
        if (this.isWaitingForBuildToFinish()) {
            return
        }
        const releaseBuildMutex = await this.preprocess()
        this.extension.logger.displayStatus('sync~spin', 'statusBar.foreground')
        this.extension.logger.addLogMessage(`Build using the external command: ${command.command} ${command.args ? command.args.join(' ') : ''}`)
        let wd = pwd
        const ws = vscode.workspace.workspaceFolders
        if (ws && ws.length > 0) {
            wd = ws[0].uri.fsPath
        }
        this.currentProcess = cp.spawn(command.command, command.args, {cwd: wd})
        const pid = this.currentProcess.pid
        this.extension.logger.addLogMessage(`LaTeX buid process as an external command spawned. PID: ${pid}.`)

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
            this.extension.logger.displayStatus('x', 'errorForeground', `Build terminated with fatal error: ${err.message}.`)
            this.currentProcess = undefined
            releaseBuildMutex()
        })

        this.currentProcess.on('exit', (exitCode, signal) => {
            this.extension.parser.parse(stdout)
            if (exitCode !== 0) {
                this.extension.logger.addLogMessage(`Build returns with error: ${exitCode}/${signal}. PID: ${pid}.`)
                this.extension.logger.displayStatus('x', 'errorForeground', 'Build terminated with error')
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
                this.extension.logger.displayStatus('check', 'statusBar.foreground', `Build succeeded.`)
            }
            this.currentProcess = undefined
            releaseBuildMutex()
        })
    }

    buildInitiator(rootFile: string, recipe: string | undefined = undefined, releaseBuildMutex: () => void) {
        const steps = this.createSteps(rootFile, recipe)
        if (steps === undefined) {
            this.extension.logger.addLogMessage('Invalid toolchain.')
            return
        }
        this.buildStep(rootFile, steps, 0, recipe || 'Build', releaseBuildMutex) // use 'Build' as default name
    }

    async build(rootFile: string, recipe: string | undefined = undefined) {
        if (this.isWaitingForBuildToFinish()) {
            this.extension.logger.addLogMessage(`Another LaTeX build processing is already waiting for the current LaTeX build to finish. Exit.`)
            return
        }
        const releaseBuildMutex = await this.preprocess()
        this.disableCleanAndRetry = false
        this.extension.logger.displayStatus('sync~spin', 'statusBar.foreground')
        this.extension.logger.addLogMessage(`Build root file ${rootFile}`)
        try {
            this.extension.buildInfo.buildStarted()
            // @ts-ignore
            pdfjsLib.getDocument(this.extension.manager.tex2pdf(rootFile, true)).promise.then(doc => {
                this.extension.buildInfo.setPageTotal(doc.numPages)
            })
            // Create sub directories of output directory
            let outDir = this.extension.manager.getOutputDir(rootFile)
            const directories = new Set<string>(this.extension.manager.filesWatched
                .map(file => path.dirname(file.replace(this.extension.manager.rootDir, '.'))))
            if (!path.isAbsolute(outDir)) {
                outDir = path.resolve(this.extension.manager.rootDir, outDir)
            }
            directories.forEach(directory => {
                fs.ensureDirSync(path.resolve(outDir, directory))
            })
            this.buildInitiator(rootFile, recipe, releaseBuildMutex)
        } catch (e) {
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
        if (steps[index].env) {
            const currentEnv = steps[index].env as ProcessEnv
            Object.keys(currentEnv).forEach(key => envVars[key] = currentEnv[key])
        }
        envVars['max_print_line'] = maxPrintLine
        if (steps[index].name === texMagicProgramName || steps[index].name === bibMagicProgramName) {
            // All optional arguments are given as a unique string (% !TeX options) if any, so we use {shell: true}
            let command = steps[index].command
            if (steps[index].args) {
                command += ' ' + (steps[index].args as string[])[0]
            }
            this.currentProcess = cp.spawn(command, [], {cwd: path.dirname(rootFile), env: envVars, shell: true})
        } else {
            this.currentProcess = cp.spawn(steps[index].command, steps[index].args, {cwd: path.dirname(rootFile), env: envVars})
        }
        const pid = this.currentProcess.pid
        this.extension.logger.addLogMessage(`LaTeX build process spawned. PID: ${pid}.`)

        let stdout = ''
        this.currentProcess.stdout.on('data', newStdout => {
            stdout += newStdout
            this.extension.logger.addCompilerMessage(newStdout.toString())
            this.extension.buildInfo.newStdoutLine(newStdout.toString())
        })

        let stderr = ''
        this.currentProcess.stderr.on('data', newStderr => {
            stderr += newStderr
            this.extension.logger.addCompilerMessage(newStderr.toString())
        })

        this.currentProcess.on('error', err => {
            this.extension.logger.addLogMessage(`LaTeX fatal error: ${err.message}, ${stderr}. PID: ${pid}.`)
            this.extension.logger.addLogMessage(`Does the executable exist? PATH: ${process.env.PATH}`)
            this.extension.logger.displayStatus('x', 'errorForeground', `Recipe terminated with fatal error: ${err.message}.`)
            this.currentProcess = undefined
            releaseBuildMutex()
        })

        this.currentProcess.on('exit', (exitCode, signal) => {
            this.extension.parser.parse(stdout)
            if (exitCode !== 0) {
                this.extension.logger.addLogMessage(`Recipe returns with error: ${exitCode}/${signal}. PID: ${pid}.`)

                const configuration = vscode.workspace.getConfiguration('latex-workshop')
                if (!this.disableCleanAndRetry && configuration.get('latex.autoBuild.cleanAndRetry.enabled')) {
                    this.disableCleanAndRetry = true
                    if (signal !== 'SIGTERM') {
                        this.extension.logger.displayStatus('x', 'errorForeground', `Recipe terminated with error. Retry building the project.`, 'warning')
                        this.extension.logger.addLogMessage(`Cleaning auxillary files and retrying build after toolchain error.`)

                        this.extension.commander.clean().then(() => {
                            this.buildStep(rootFile, steps, 0, recipeName, releaseBuildMutex)
                        })
                    } else {
                        this.extension.logger.displayStatus('x', 'errorForeground')
                        this.currentProcess = undefined
                        releaseBuildMutex()
                    }
                } else {
                    this.extension.logger.displayStatus('x', 'errorForeground')
                    if (['onFailed', 'onBuilt'].indexOf(configuration.get('latex.autoClean.run') as string) > -1) {
                        this.extension.commander.clean()
                    }
                    const res = this.extension.logger.showErrorMessage(`Recipe terminated with error.`, 'Open compiler log')
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
        if (this.extension.parser.isLaTeXmkSkipped) {
            return
        }
        this.extension.viewer.refreshExistingViewer(rootFile)
        this.extension.manager.findAdditionalDependentFilesFromFls(rootFile)
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (configuration.get('synctex.afterBuild.enabled') as boolean) {
            this.extension.locator.syncTeX()
        }
        if (configuration.get('latex.autoClean.run') as string === 'onBuilt') {
            this.extension.cleaner.clean()
        }
    }

    createSteps(rootFile: string, recipeName: string | undefined) : StepCommand[] | undefined {
        let steps: StepCommand[] = []
        const configuration = vscode.workspace.getConfiguration('latex-workshop')

        const [magicTex, magicBib] = this.findProgramMagic(rootFile)
        if (recipeName === undefined && magicTex) {
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
                this.extension.logger.showErrorMessage(`No recipes defined.`)
                return undefined
            }
            let recipe = recipes[0]
            if ((configuration.get('latex.recipe.default') as string === 'lastUsed') && (this.previouslyUsedRecipe !== undefined)) {
                recipe = this.previouslyUsedRecipe
            }
            if (recipeName) {
                const candidates = recipes.filter(candidate => candidate.name === recipeName)
                if (candidates.length < 1) {
                    this.extension.logger.showErrorMessage(`Failed to resolve build recipe: ${recipeName}`)
                }
                recipe = candidates[0]
            }
            this.previouslyUsedRecipe = recipe

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
            const doc = rootFile.replace(/\.tex$/, '').split(path.sep).join('/')
            const docfile = path.basename(rootFile, '.tex').split(path.sep).join('/')
            if (step.args) {
                step.args = step.args.map(arg => arg.replace(/%DOC%/g, docker ? docfile : doc)
                                                    .replace(/%DOCFILE%/g, docfile)
                                                    .replace(/%DIR%/g, path.dirname(rootFile).split(path.sep).join('/'))
                                                    .replace(/%TMPDIR%/g, this.tmpDir)
                                                    .replace(/%OUTDIR%/g, this.extension.manager.getOutputDir(rootFile)))
            }
            if (step.env) {
                Object.keys(step.env).forEach( v => {
                    if (step.env && step.env[v]) {
                        const e = step.env[v] as string
                        step.env[v] = e.replace(/%DOC%/g, docker ? docfile : doc)
                                                 .replace(/%DOCFILE%/g, docfile)
                                                 .replace(/%DIR%/g, path.dirname(rootFile).split(path.sep).join('/'))
                                                 .replace(/%TMPDIR%/g, this.tmpDir)
                                                 .replace(/%OUTDIR%/g, this.extension.manager.getOutputDir(rootFile))
                    }
                })
            }
            if (configuration.get('latex.option.maxPrintLine.enabled')) {
                if (!step.args) {
                    step.args = []
                }
                if ((step.command === 'latexmk' && step.args.indexOf('-lualatex') === -1 && step.args.indexOf('-pdflua') === -1) || step.command === 'pdflatex') {
                    if (this.isMiktex) {
                        step.args.unshift('--max-print-line=' + maxPrintLine)
                    }
                }
            }
        })
        return steps
    }

    findProgramMagic(rootFile: string) : [StepCommand | undefined,  StepCommand | undefined] {
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
