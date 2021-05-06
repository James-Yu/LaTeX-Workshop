import * as vscode from 'vscode'
import type {Extension} from '../main'

export class LwFileSystem {
    readonly extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    isLocalUri(uri: vscode.Uri): boolean {
        return uri.scheme === 'file'
    }

}
