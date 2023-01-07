import * as vscode from 'vscode'
import * as path from 'path'

import type { Extension } from '../../main'
import * as utils from '../../utils/utils'
import * as logger from '../logger'

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
                logger.log(`[Manager][Magic] Non-existent magic root ${file} .`)
                return undefined
            }
            fileStack.push(file)
            logger.log(`[Manager][Magic] Found magic root ${file} from active.`)

            result = content.match(regex)
            while (result) {
                file = path.resolve(path.dirname(file), result[1])
                if (fileStack.includes(file)) {
                    logger.log(`[Manager][Magic] Found looped magic root ${file} .`)
                    return file
                } else {
                    fileStack.push(file)
                    logger.log(`[Manager][Magic] Found magic root ${file}`)
                }

                content = this.extension.lwfs.readFileSyncGracefully(file)
                if (content === undefined) {
                    logger.log(`[Manager][Magic] Non-existent magic root ${file} .`)
                    return undefined
                }
                result = content.match(regex)
            }
            logger.log(`[Manager][Magic] Finalized magic root ${file} .`)
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
                logger.log(`[Manager][Subfile] Found subfile root ${file} from active.`)
            }
            return file
        }
        return undefined
    }

}
