import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs-extra'
import glob from 'glob'
import * as cs from 'cross-spawn'

import type {Extension} from '../main'

export class Cleaner {
    private readonly extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    async clean(rootFile?: string): Promise<void> {
        if (! rootFile) {
            if (this.extension.manager.rootFile !== undefined) {
                await this.extension.manager.findRoot()
            }
            rootFile = this.extension.manager.rootFile
            if (! rootFile) {
                return
            }
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const cleanMethod = configuration.get('latex.clean.method') as string
        switch (cleanMethod) {
            case 'glob':
                return this.cleanGlob(rootFile)
            case 'cleanCommand':
                return this.cleanCommand(rootFile)
            default:
                this.extension.logger.addLogMessage(`Unknown cleaning method: ${cleanMethod}`)
                return
        }
    }

    private cleanGlob(rootFile: string): Promise<void> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        let globs = configuration.get('latex.clean.fileTypes') as string[]
        const outdir = path.resolve(path.dirname(rootFile), this.extension.manager.getOutDir(rootFile))
        if (configuration.get('latex.clean.subfolder.enabled') as boolean) {
            globs = globs.map(globType => './**/' + globType)
        }

        return Promise.all(
            // Get an array of arrays containing all the files found by the globs
            globs.map(g => this.globP(g, {cwd: outdir}))
        ).then(files => files
            // Reduce the array of arrays to a single array containing all the files that should be deleted
            .reduce((all, curr) => all.concat(curr), [])
            // Resolve the absolute filepath for every file
            .map(file => path.resolve(outdir, file))
        ).then(files => Promise.all(
            // Try to unlink the files, returning a Promise for every file
            files.map(file => fs.unlink(file).then(() => {
                this.extension.logger.addLogMessage(`File cleaned: ${file}`)
                // If unlinking fails, replace it with an rmdir Promise
            }, () => fs.rmdir(file).then(() => {
                this.extension.logger.addLogMessage(`Folder removed: ${file}`)
            }, () => {
                this.extension.logger.addLogMessage(`Error removing file: ${file}`)
            })))
        )).then(
            () => {} // Do not pass results to Promise returned by clean()
        ).catch(err => {
            this.extension.logger.addLogMessage(`Error during deletion of files: ${err}`)
            if (err instanceof Error) {
                this.extension.logger.logError(err)
            }
        })
    }

    // This function wraps the glob package into a promise.
    // It behaves like the original apart from returning a Promise instead of requiring a Callback.
    private globP(pattern: string, options: glob.IOptions): Promise<string[]> {
        return new Promise((resolve, reject) => {
            glob(pattern, options, (err, files) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(files)
                }
            })
        })
    }

    private cleanCommand(rootFile: string): Promise<void> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const command = configuration.get('latex.clean.command') as string
        let args = configuration.get('latex.clean.args') as string[]
        if (args) {
            args = args.map(arg => arg.replace('%TEX%', rootFile))
        }
        this.extension.logger.addLogMessage(`Clean temporary files using: ${command}, ${args}`)
        return new Promise((resolve, reject) => {
            const proc = cs.spawn(command, args, {cwd: path.dirname(rootFile), detached: true})
            let stderr = ''
            proc.stderr.on('data', newStderr => {
                stderr += newStderr
            })
            proc.on('error', err => {
                this.extension.logger.addLogMessage(`Cannot run ${command}: ${err.message}, ${stderr}`)
                if (err instanceof Error) {
                    this.extension.logger.logError(err)
                }
                reject(err)
            })
            proc.on('exit', exitCode => {
                if (exitCode === 0) {
                    resolve()
                } else {
                    this.extension.logger.addLogMessage(`The clean command failed with exit code ${exitCode}`)
                    this.extension.logger.addLogMessage(`Clean command stderr: ${stderr}`)
                    reject(stderr)
                }
            })

        })

    }
}
