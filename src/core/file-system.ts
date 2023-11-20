import * as vscode from 'vscode'
import * as fs from 'fs'

export class LwFileSystem {
    isLocalUri(uri: vscode.Uri): boolean {
        return uri.scheme === 'file'
    }

    isVirtualUri(uri: vscode.Uri): boolean {
        return !this.isLocalUri(uri)
    }

    async readFileAsBuffer(fileUri: vscode.Uri): Promise<Buffer> {
        if (this.isLocalUri(fileUri)) {
            return fs.promises.readFile(fileUri.fsPath)
        } else {
            const resultUint8 = await vscode.workspace.fs.readFile(fileUri)
            return Buffer.from(resultUint8)
        }
    }
}
