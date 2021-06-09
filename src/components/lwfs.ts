import * as vscode from 'vscode'
import * as fs from 'fs'
import type {Extension} from '../main'

export class LwFileSystem {
    readonly extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    isLocalUri(uri: vscode.Uri): boolean {
        return uri.scheme === 'file'
    }

    readFileSyncGracefully(filepath: string) {
        try {
            const ret = fs.readFileSync(filepath).toString()
            return ret
        } catch (err) {
            if (err instanceof Error) {
                this.extension.logger.logError(err)
            }
            return undefined
        }
    }

}
