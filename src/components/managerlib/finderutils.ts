import * as vscode from 'vscode'
import * as path from 'path'
import * as lw from '../../lw'
import * as utils from '../../utils/utils'

import { getLogger } from '../logger'

const logger = getLogger('Manager', 'Finder')

export class FinderUtils {
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
            content = lw.lwfs.readFileSyncGracefully(file)
            if (content === undefined) {
                logger.log(`Non-existent magic root ${file} .`)
                return undefined
            }
            fileStack.push(file)
            logger.log(`Found magic root ${file} from active.`)

            result = content.match(regex)
            while (result) {
                file = path.resolve(path.dirname(file), result[1])
                if (fileStack.includes(file)) {
                    logger.log(`Found looped magic root ${file} .`)
                    return file
                } else {
                    fileStack.push(file)
                    logger.log(`Found magic root ${file}`)
                }

                content = lw.lwfs.readFileSyncGracefully(file)
                if (content === undefined) {
                    logger.log(`Non-existent magic root ${file} .`)
                    return undefined
                }
                result = content.match(regex)
            }
            logger.log(`Finalized magic root ${file} .`)
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
                logger.log(`Found subfile root ${file} from active.`)
            }
            return file
        }
        return undefined
    }

}
