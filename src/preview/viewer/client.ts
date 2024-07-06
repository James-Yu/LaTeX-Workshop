import * as vscode from 'vscode'
import type ws from 'ws'
import type { ServerResponse } from '../../../types/latex-workshop-protocol-types/index'

export class Client {
    readonly viewer: 'browser' | 'tab'
    readonly websocket: ws
    readonly pdfFileUri: string
    private readonly disposables = new Set<vscode.Disposable>()

    constructor(viewer: 'browser' | 'tab', websocket: ws, pdfFileUri: string) {
        this.viewer = viewer
        this.websocket = websocket
        this.websocket.on('close', () => {
            this.disposeDisposables()
        })
        this.pdfFileUri = pdfFileUri
    }

    private disposeDisposables() {
        vscode.Disposable.from(...this.disposables).dispose()
        this.disposables.clear()
    }

    onDidDispose(cb: () => unknown) {
        this.disposables.add( { dispose: cb } )
    }

    send(message: ServerResponse) {
        console.log(' sends message ', JSON.stringify(message))
        this.websocket.send(JSON.stringify(message))
    }
}
