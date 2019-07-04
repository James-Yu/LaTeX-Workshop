import * as fs from 'fs-extra'
import * as glob from 'glob'
import * as path from 'path'
import * as vscode from 'vscode'

import { Extension } from '../main'

export class Cleaner {
    extension: Extension

    constructor (extension: Extension) {
        this.extension = extension
    }

    async clean () : Promise<void> {
        if (this.extension.manager.rootFile !== undefined) {
            await this.extension.manager.findRoot()
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        let globs = configuration.get('latex.clean.fileTypes') as string[]
        const outdir = this.extension.manager.getOutputDir(this.extension.manager.rootFile)
        // if (!outdir.endsWith('/') && !outdir.endsWith('\\')) {
        //     outdir += path.sep
        // }
        // if (outdir !== './' && outdir !== '.') {
        //     globs = globs.concat(globs.map(globType => outdir + globType), globs.map(globType => outdir + '**/' + globType))
        // }
        if (configuration.get('latex.clean.subfolder.enabled') as boolean) {
            globs = globs.map(globType => './**/' + globType)
        }

        return Promise.all(
            // Get an array of arrays containing all the files found by the globs
            globs.map(g => this.globP(g, { cwd: outdir })),
        )
            .then(files =>
                files
                    // Reduce the array of arrays to a single array containing all the files that should be deleted
                    .reduce((all, curr) => all.concat(curr), [])
                    // Resolve the absolute filepath for every file
                    .map(file => path.resolve(outdir, file)),
            )
            .then(files =>
                Promise.all(
                    // Try to unlink the files, returning a Promise for every file
                    files.map(file =>
                        fs.unlink(file).then(
                            () => {
                                this.extension.logger.addLogMessage(`File cleaned: ${file}`)
                                // If unlinking fails, replace it with an rmdir Promise
                            },
                            () =>
                                fs.rmdir(file).then(
                                    () => {
                                        this.extension.logger.addLogMessage(`Folder removed: ${file}`)
                                    },
                                    () => {
                                        this.extension.logger.addLogMessage(`Error removing file: ${file}`)
                                    },
                                ),
                        ),
                    ),
                ),
            )
            .then(
                () => {}, // Do not pass results to Promise returned by clean()
            )
            .catch(err => {
                this.extension.logger.addLogMessage(`Error during deletion of files: ${err}`)
            })
    }

    // This function wraps the glob package into a promise.
    // It behaves like the original apart from returning a Promise instead of requiring a Callback.
    globP (pattern: string, options: glob.IOptions) : Promise<string[]> {
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
}
