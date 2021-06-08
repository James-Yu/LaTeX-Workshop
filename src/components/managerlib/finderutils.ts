import * as vscode from 'vscode'
import * as path from 'path'
import * as utils from '../../utils/utils'

import type {Extension} from '../../main'

export class FinderUtils {
    private readonly extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    findRootFromMagic(): string | undefined {
        if (!vscode.window.activeTextEditor) {
            return undefined
        }
        const regex = /^(?:%\s*!\s*T[Ee]X\sroot\s*=\s*(.*\.(?:tex|[jrsRS]nw|[rR]tex|jtexw))$)/m
        let content: string | undefined = vscode.window.activeTextEditor.document.getText()

        let result = content.match(regex)
        const fileStack: string[] = []
        if (result) {
            let file = path.resolve(path.dirname(vscode.window.activeTextEditor.document.fileName), result[1])
            content = this.extension.lwfs.readFileSyncGracefully(file)
            if (content === undefined) {
                const msg = `Not found root file specified in the magic comment: ${file}`
                this.extension.logger.addLogMessage(msg)
                throw new Error(msg)
            }
            fileStack.push(file)
            this.extension.logger.addLogMessage(`Found root file by magic comment: ${file}`)

            result = content.match(regex)
            while (result) {
                file = path.resolve(path.dirname(file), result[1])
                if (fileStack.includes(file)) {
                    this.extension.logger.addLogMessage(`Looped root file by magic comment found: ${file}, stop here.`)
                    return file
                } else {
                    fileStack.push(file)
                    this.extension.logger.addLogMessage(`Recursively found root file by magic comment: ${file}`)
                }

                content = this.extension.lwfs.readFileSyncGracefully(file)
                if (content === undefined) {
                    const msg = `Not found root file specified in the magic comment: ${file}`
                    this.extension.logger.addLogMessage(msg)
                    throw new Error(msg)

                }
                result = content.match(regex)
            }
            return file
        }
        return undefined
    }

    findSubFiles(content: string): string | undefined {
        if (!vscode.window.activeTextEditor) {
            return undefined
        }
        const regex = /(?:\\documentclass\[(.*)\]{subfiles})/
        const result = content.match(regex)
        if (result) {
            const file = utils.resolveFile([path.dirname(vscode.window.activeTextEditor.document.fileName)], result[1])
            if (file) {
                this.extension.logger.addLogMessage(`Found root file of this subfile from active editor: ${file}`)
            } else {
                this.extension.logger.addLogMessage(`Cannot find root file of this subfile from active editor: ${result[1]}`)
            }
            return file
        }
        return undefined
    }

}
