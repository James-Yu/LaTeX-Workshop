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

    //buildInitiater(rootFile: string) {
    //    const toolchain = this.createToolchain(rootFile)
    //    if (toolchain === undefined) {
    //        this.extension.logger.addLogMessage('Invalid toolchain.')
    //        return
    //    }
    //    this.buildStep(rootFile, toolchain, 0)
    //}

    build(rootFile: string, recipeKey: string | undefined = undefined) {
        this.disableCleanAndRetry = false
        this.extension.logger.displayStatus('sync~spin', 'statusBar.foreground')
        this.preprocess(rootFile)
        if (this.nextBuildRootFile === undefined) {
            //this.buildInitiater(rootFile)
            const toolchain = this.createToolchain(rootFile, recipeKey)
            if (toolchain === undefined) {
                this.extension.logger.addLogMessage('Invalid toolchain.')
                return
            }
            this.buildStep(rootFile, toolchain, 0)
        }
    }

    buildStep(rootFile: string, toolchain: ToolchainCommand[], index: number) {
        if (toolchain.length === index) {
            this.extension.logger.addLogMessage(`Toolchain of length ${toolchain.length} finished.`)
            this.buildFinished(rootFile)
            return
        }

        this.extension.logger.clearCompilerMessage()
        this.extension.logger.addLogMessage(`Toolchain step ${index + 1}: ${toolchain[index].command}, ${toolchain[index].args}`)
        this.currentProcess = cp.spawn(toolchain[index].command, toolchain[index].args, {cwd: path.dirname(rootFile)})

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
            this.extension.logger.displayStatus('sync~spin', 'errorForeground', `LaTeX toolchain terminated with fatal error: ${err.message}.`)
            this.currentProcess = undefined
        })

        this.currentProcess.on('exit', (exitCode, signal) => {
            this.extension.parser.parse(stdout)
            if (exitCode !== 0) {
                this.extension.logger.addLogMessage(`Toolchain returns with error: ${exitCode}/${signal}.`)

                const configuration = vscode.workspace.getConfiguration('latex-workshop')
                if (!this.disableCleanAndRetry && configuration.get('latex.autoBuild.cleanAndRetry.enabled') && !configuration.get('latex.clean.enabled')) {
                    this.extension.logger.displayStatus('x', 'errorForeground', `LaTeX toolchain terminated with error. Retry building the project.`, 'warning')
                    this.extension.logger.addLogMessage(`Cleaning auxillary files and retrying build after toolchain error.`)
                    this.disableCleanAndRetry = true
                    this.extension.commander.clean().then(() => {
                        this.buildStep(rootFile, toolchain, 0)
                    })
                } else {
                    this.extension.logger.displayStatus('x', 'errorForeground', `LaTeX toolchain terminated with error.`, 'error')
                }
            } else {
                this.buildStep(rootFile, toolchain, index + 1)
            }
            this.currentProcess = undefined
            if (this.nextBuildRootFile) {
                this.build(this.nextBuildRootFile)
            }
        })
    }

    buildFinished(rootFile: string) {
        this.extension.logger.addLogMessage(`Successfully built ${rootFile}`)
        this.extension.logger.displayStatus('check', 'statusBar.foreground', `LaTeX toolchain succeeded.`)
        this.extension.viewer.refreshExistingViewer(rootFile)
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const clean = configuration.get('latex.clean.enabled') as boolean
        if (clean) {
            this.extension.cleaner.clean()
        }
    }

    static readonly RECIPE_KEY_IMPORT: string = 'Invoke latex.toolchain'  // special key; it would import toolchain from 'latex-workship.latex.toolchain'

    getRecipeKeys() : string[] {
        const result = [ Builder.RECIPE_KEY_IMPORT ]
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const recipes = configuration.get('latex.recipes')
        if (typeof recipes !== 'undefined') {
            result.push(...Object.keys(recipes))
        }
        return result
    }

    // tslint:disable-next-line:variable-name
    private resolveRecipe(recipeKey: string, /* internal variable */ __recursionMap: string[] = []) : ToolchainCommand[] | undefined {
        // detect recursion
        if (__recursionMap.indexOf(recipeKey) !== -1) {
            this.extension.logger.addLogMessage(`Recursion detected for recipie: ${__recursionMap.join('->')}`)
            return undefined
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const recipes = (configuration.get('latex.recipes') || {}) as RecipeCollection
        // recipe key exists
        if (recipeKey in recipes) {
            const result = [] as ToolchainCommand[]
            for (const item of recipes[recipeKey]) {
                if (item.do) {
                    __recursionMap.push(recipeKey)
                    const refs = this.resolveRecipe(item.do, __recursionMap)
                    if (typeof refs === 'undefined') {
                        return undefined
                    }
                    result.push(...refs)
                    __recursionMap.pop()
                } else {
                    result.push(item)
                }
            }
            return result
        }
        // import from latex-workshop.latex.toolchain (for backward compatibility)
        if (recipeKey === Builder.RECIPE_KEY_IMPORT) {
            return configuration.get('latex.toolchain') || [] as ToolchainCommand[]
        }
        // invalid key
        this.extension.logger.addLogMessage(`Undefined recipe key: ${recipeKey}`)
        return undefined
    }

    createToolchain(rootFile: string, recipeKey: string | undefined) : ToolchainCommand[] | undefined {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        // get array of commands
        const currentToolchain = this.resolveRecipe(typeof recipeKey === 'undefined' ?
            (configuration.get('latex.defaultRecipeKey') || Builder.RECIPE_KEY_IMPORT) : recipeKey)
        if (typeof currentToolchain === 'undefined') {
            vscode.window.showErrorMessage(`Failed to resolve build recipe: ${recipeKey}`)
            return undefined
        }
        // Modify a copy, instead of itself.
        const commands = JSON.parse(JSON.stringify(currentToolchain)) as ToolchainCommand[]
        const magic = this.findProgramMagic(rootFile)
        for (const command of commands) {
            if (!('command' in command)) {
                vscode.window.showErrorMessage('LaTeX toolchain is invalid. Each tool in the toolchain must have a "command" string.')
                return undefined
            }
            if (!Array.isArray(command.args)) {
                vscode.window.showErrorMessage('LaTeX toolchain is invalid. "args" must be an array of strings.')
                return undefined
            }
            if (command.args) {
                command.args = command.args.map(arg => arg.replace('%DOC%', rootFile.replace(/\.tex$/, '').split(path.sep).join('/'))
                                                          .replace('%DOCFILE%', path.basename(rootFile, '.tex').split(path.sep).join('/'))
                                                          .replace('%DIR%', path.dirname(rootFile).split(path.sep).join('/')))
            }
            if (magic === 'pdflatex') {
                continue
            }
            if (command.command === '') {
                command.command = magic
            } else if (command.command === 'latexmk') {
                command.args.push(`-pdflatex=${magic}`)
            }
        }
        return commands
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

interface ToolchainCommand {
    command: string,
    args?: string[],
    // recpie reference
    do?: string
}

interface RecipeCollection {
    [key: string]: ToolchainCommand[]
}
