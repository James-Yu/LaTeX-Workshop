import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as glob from 'glob'

import {Extension} from './main'

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
        const globs = configuration.get('files_to_clean') as string[]
        for (const globType of globs) {
            glob(globType, {cwd: this.extension.manager.rootDir}, (err, files) => {
                if (err) {
                    this.extension.logger.addLogMessage(`Error identifying files with glob ${globType}: ${files}.`)
                    return
                }
                for (const file of files) {
                    const fullPath = path.resolve(this.extension.manager.rootDir, file)
                    fs.unlinkSync(fullPath)
                }
            })
        }
    }
}
