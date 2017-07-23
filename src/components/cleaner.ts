import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as glob from 'glob'

import {Extension} from '../main'

export class Cleaner {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    clean() {
        if (this.extension.manager.rootFile !== undefined) {
            this.extension.manager.findRoot()
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const globs = configuration.get('latex.clean.fileTypes') as string[]
        let outdir = configuration.get('latex.outputDir') as string
        if (!outdir.endsWith('/') && !outdir.endsWith('\\')) {
            outdir += path.sep
        }
        const globOutDir: string[] = []
        if (outdir !== './') {
            globs.forEach(globType => globOutDir.push(outdir + globType))
        }
        for (const globType of globs.concat(globOutDir)) {
            glob(globType, {cwd: this.extension.manager.rootDir}, (err, files) => {
                if (err) {
                    this.extension.logger.addLogMessage(`Error identifying files with glob ${globType}: ${files}.`)
                    return
                }
                for (const file of files) {
                    const fullPath = path.resolve(this.extension.manager.rootDir, file)
                    fs.unlink(fullPath, unlinkErr => {
                        if (unlinkErr) {
                            this.extension.logger.addLogMessage(`Error removing file: ${fullPath}`)
                            return
                        }
                        this.extension.logger.addLogMessage(`File cleaned: ${fullPath}`)
                    })
                }
            })
        }
    }
}
