import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as cp from 'child_process'

import {Extension} from '../main'

export class Builder {
    extension: Extension
    currentProcess: cp.ChildProcess | undefined
    disableBuildAfterSave: boolean = false
    nextBuildRootFile: string | undefined
    disableCleanAndRetry: boolean = false

    constructor(extension: Extension) {
        this.extension = extension
    }

    preprocess(rootFile: string) {
        this.extension.logger.addLogMessage(`Build root file ${rootFile}`)
        this.disableBuildAfterSave = true
        vscode.workspace.saveAll()
        this.disableBuildAfterSave = false
        if (this.currentProcess) {
            this.currentProcess.kill()
            this.extension.logger.addLogMessage('Kill previous process')
            this.nextBuildRootFile = rootFile
        } else {
            this.nextBuildRootFile = undefined
        }
    }

    buildInitiator(rootFile: string, recipe: string | undefined = undefined) {
       const steps = this.createSteps(rootFile, recipe)
       if (steps === undefined) {
           this.extension.logger.addLogMessage('Invalid toolchain.')
           return
       }
       this.buildStep(rootFile, steps, 0)
    }

    build(rootFile: string, recipe: string | undefined = undefined) {
        this.disableCleanAndRetry = false
        this.extension.logger.displayStatus('sync~spin', 'statusBar.foreground')
        this.preprocess(rootFile)
        if (this.nextBuildRootFile === undefined) {
            this.buildInitiator(rootFile, recipe)
        }
    }

    buildStep(rootFile: string, steps: StepCommand[], index: number) {
        if (steps.length === index) {
            this.extension.logger.addLogMessage(`Recipe of length ${steps.length} finished.`)
            this.buildFinished(rootFile)
            return
        }

        this.extension.logger.clearCompilerMessage()
        this.extension.logger.addLogMessage(`Recipe step ${index + 1}: ${steps[index].command}, ${steps[index].args}`)
        this.currentProcess = cp.spawn(steps[index].command, steps[index].args, {cwd: path.dirname(rootFile)})

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
            this.extension.logger.addLogMessage(`LaTeX fatal error: ${err.message}, ${stderr}. Does the executable exist?`)
            this.extension.logger.displayStatus('sync~spin', 'errorForeground', `Recipe terminated with fatal error: ${err.message}.`)
            this.currentProcess = undefined
        })

        this.currentProcess.on('exit', (exitCode, signal) => {
            this.extension.parser.parse(stdout)
            if (exitCode !== 0) {
                this.extension.logger.addLogMessage(`Recipe returns with error: ${exitCode}/${signal}.`)

                const configuration = vscode.workspace.getConfiguration('latex-workshop')
                if (!this.disableCleanAndRetry && configuration.get('latex.autoBuild.cleanAndRetry.enabled') && !configuration.get('latex.clean.enabled')) {
                    this.extension.logger.displayStatus('x', 'errorForeground', `Recipe terminated with error. Retry building the project.`, 'warning')
                    this.extension.logger.addLogMessage(`Cleaning auxillary files and retrying build after toolchain error.`)
                    this.disableCleanAndRetry = true
                    this.extension.commander.clean().then(() => {
                        this.buildStep(rootFile, steps, 0)
                    })
                } else {
                    this.extension.logger.displayStatus('x', 'errorForeground', `Recipe terminated with error.`, 'error')
                }
            } else {
                this.buildStep(rootFile, steps, index + 1)
            }
            this.currentProcess = undefined
            if (this.nextBuildRootFile) {
                this.build(this.nextBuildRootFile)
            }
        })
    }

    buildFinished(rootFile: string) {
        this.extension.logger.addLogMessage(`Successfully built ${rootFile}`)
        this.extension.logger.displayStatus('check', 'statusBar.foreground', `Recipe succeeded.`)
        this.extension.viewer.refreshExistingViewer(rootFile)
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const clean = configuration.get('latex.clean.enabled') as boolean
        if (clean) {
            this.extension.cleaner.clean()
        }
    }

    createSteps(rootFile: string, recipeName: string | undefined) : StepCommand[] | undefined {
        const magic = this.findProgramMagic(rootFile)
        // TODO: Find magic

        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const recipes: {name: string, tools: string[]}[] = configuration.get('latex.recipes') as {name: string, tools: string[]}[]
        const tools: StepCommand[] = configuration.get('latex.tools') as StepCommand[]
        if (recipes.length < 1) {
            vscode.window.showErrorMessage(`No recipes defined.`)
            return undefined
        }
        let recipe = recipes[0]
        if (recipeName) {
            const candidates = recipes.filter(candidate => candidate.name === recipeName)
            if (candidates.length < 1) {
                vscode.window.showErrorMessage(`Failed to resolve build recipe: ${recipeName}`)
            }
            recipe = candidates[0]
        }

        let steps: StepCommand[] = []
        recipe.tools.forEach(tool => {
            steps.push(tools.filter(candidate => candidate.name === tool)[0])
        })
        steps = JSON.parse(JSON.stringify(steps))
        steps.forEach(step => {
            if (step.args) {
                step.args = step.args.map(arg => arg.replace('%DOC%', rootFile.replace(/\.tex$/, '').split(path.sep).join('/'))
                                                    .replace('%DOCFILE%', path.basename(rootFile, '.tex').split(path.sep).join('/'))
                                                    .replace('%DIR%', path.dirname(rootFile).split(path.sep).join('/')))
            }
        })
        return steps
    }

    findProgramMagic(rootFile: string) : string {
        const regex = /(?:%\s*!\s*T[Ee]X\s(?:TS-)?program\s*=\s*([^\s]*)$)/m
        const content = fs.readFileSync(rootFile).toString()

        const result = content.match(regex)
        let program = ''
        if (result) {
            program = result[1]
            this.extension.logger.addLogMessage(`Found program by magic comment: ${program}`)
        } else {
            program = 'pdflatex'
        }
        return program
    }
}

interface StepCommand {
    name: string,
    command: string,
    args?: string[]
}
