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

    isVirtualUri(uri: vscode.Uri): boolean {
        return !this.isLocalUri(uri)
    }

    async exists(uri: vscode.Uri): Promise<boolean> {
        try {
            if (this.isLocalUri(uri)) {
                return fs.existsSync(uri.fsPath)
            } else {
                await vscode.workspace.fs.stat(uri)
                return true
            }
        } catch {
            return false
        }
    }

    async readFile(fileUri: vscode.Uri): Promise<string> {
        const result = await this.readFileAsBuffer(fileUri)
        return result.toString()
    }

    async readFileAsBuffer(fileUri: vscode.Uri): Promise<Buffer> {
        if (this.isLocalUri(fileUri)) {
            return fs.promises.readFile(fileUri.fsPath)
        } else {
            const resultUint8 = await vscode.workspace.fs.readFile(fileUri)
            return Buffer.from(resultUint8)
        }
    }
    readFileSyncGracefully(filepath: string): string | undefined {
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

    async stat(fileUri: vscode.Uri): Promise<fs.Stats | vscode.FileStat> {
        if (this.isLocalUri(fileUri)) {
            return fs.statSync(fileUri.fsPath)
        } else {
            return vscode.workspace.fs.stat(fileUri)
        }
    }

}
