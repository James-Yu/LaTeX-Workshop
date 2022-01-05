import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import glob from 'glob'
import * as cs from 'cross-spawn'

import type {Extension} from '../main'

export class Cleaner {
    private readonly extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    async clean(rootFile?: string): Promise<void> {
        if (!rootFile) {
            if (this.extension.manager.rootFile !== undefined) {
                await this.extension.manager.findRoot()
            }
            rootFile = this.extension.manager.rootFile
            if (!rootFile) {
                this.extension.logger.addLogMessage('Cannot determine the root file to be cleaned.')
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

    private async cleanGlob(rootFile: string): Promise<void> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        let globs = configuration.get('latex.clean.fileTypes') as string[]
        const outdir = path.resolve(path.dirname(rootFile), this.extension.manager.getOutDir(rootFile))
        if (configuration.get('latex.clean.subfolder.enabled') as boolean) {
            globs = globs.map(globType => './**/' + globType)
        }
        this.extension.logger.addLogMessage(`Clean glob matched files: ${JSON.stringify({globs, outdir})}`)
        const files = globs.map(g => glob.sync(g, {cwd: outdir}))
            // Reduce the array of arrays to a single array containing all the files that should be deleted
            .reduce((all, curr) => all.concat(curr), [])
            // Resolve the absolute filepath for every file
            .map(file => path.resolve(outdir, file))
        for (const file of files) {
            try {
                const stats: fs.Stats = fs.statSync(file)
                if (stats.isFile()) {
                    await fs.promises.unlink(file)
                    this.extension.logger.addLogMessage(`Cleaning file: ${file}`)
                } else {
                    this.extension.logger.addLogMessage(`Not removing non-file: ${file}`)
                }
            } catch (err) {
                this.extension.logger.addLogMessage(`Error cleaning file: ${file}`)
                if (err instanceof Error) {
                    this.extension.logger.logError(err)
                }
            }
        }
    }

    private cleanCommand(rootFile: string): Promise<void> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const command = configuration.get('latex.clean.command') as string
        let args = configuration.get('latex.clean.args') as string[]
        if (args) {
            args = args.map(arg => arg.replace('%TEX%', rootFile))
        }
        this.extension.logger.logCommand('Clean temporary files command', command, args)
        return new Promise((resolve, _reject) => {
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
                resolve()
            })
            proc.on('exit', exitCode => {
                if (exitCode !== 0) {
                    this.extension.logger.addLogMessage(`The clean command failed with exit code ${exitCode}`)
                    this.extension.logger.addLogMessage(`Clean command stderr: ${stderr}`)
                }
                resolve()
            })

        })

    }
}
