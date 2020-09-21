import * as vscode from 'vscode'
import * as path from 'path'
import type {MathPreview, TexMathEnv} from '../providers/preview/mathpreview'
import {openWebviewPanel} from '../utils/webview'
import type {Extension} from '../main'


type UpdateEvent = {
    type: 'edit',
    event: vscode.TextDocumentChangeEvent
} | {
    type: 'selection',
    event: vscode.TextEditorSelectionChangeEvent
}

export class MathPreviewPanelSerializer implements vscode.WebviewPanelSerializer {
    private readonly extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    deserializeWebviewPanel(panel: vscode.WebviewPanel) {
        this.extension.mathPreviewPanel.initializePanel(panel)
        panel.webview.html = this.extension.mathPreviewPanel.getHtml(panel.webview)
        this.extension.logger.addLogMessage('Math preview panel: restored')
        return Promise.resolve()
    }

}

export class MathPreviewPanel {
    private readonly extension: Extension
    private readonly mathPreview: MathPreview
    private panel?: vscode.WebviewPanel
    private prevEditTime = 0
    private prevDocumentUri?: string
    private prevCursorPosition?: vscode.Position
    private prevNewCommands?: string
    readonly mathPreviewPanelSerializer: MathPreviewPanelSerializer

    constructor(extension: Extension) {
        this.extension = extension
        this.mathPreview = extension.mathPreview
        this.mathPreviewPanelSerializer = new MathPreviewPanelSerializer(extension)
    }

    async open() {
        if (this.panel) {
            if (!this.panel.visible) {
                this.panel.reveal(undefined, true)
            }
            return
        }
        this.mathPreview.getColor()
        const panel = vscode.window.createWebviewPanel(
            'latex-workshop-mathpreview',
            'Math Preview',
            { viewColumn: vscode.ViewColumn.Active, preserveFocus: true },
            { enableScripts: true, retainContextWhenHidden: true }
        )
        this.initializePanel(panel)
        panel.webview.html = this.getHtml(panel.webview)
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const editorGroup = configuration.get('mathpreviewpanel.editorGroup') as string
        await openWebviewPanel(panel, editorGroup)
        this.extension.logger.addLogMessage('Math preview panel: opened')
    }

    initializePanel(panel: vscode.WebviewPanel) {
        const disposable = vscode.Disposable.from(
            vscode.workspace.onDidChangeTextDocument( (event) => {
                if (!this.extension.manager.hasTexId(event.document.languageId)) {
                    return
                }
                this.extension.mathPreviewPanel.update({type: 'edit', event})
            }),
            vscode.window.onDidChangeTextEditorSelection( (event) => {
                this.extension.mathPreviewPanel.update({type: 'selection', event})
            })
        )
        this.panel = panel
        panel.onDidDispose(() => {
            disposable.dispose()
            this.clearCache()
            this.panel = undefined
            this.extension.logger.addLogMessage('Math preview panel: disposed')
        })
        panel.onDidChangeViewState((ev) => {
            if (ev.webviewPanel.visible) {
                this.update()
            }
        })
        panel.webview.onDidReceiveMessage(() => {
            this.extension.logger.addLogMessage('Math preview panel: initialized')
            this.update()
        })
    }

    close() {
        this.panel?.dispose()
        this.panel = undefined
        this.clearCache()
        this.extension.logger.addLogMessage('Math preview panel: closed')
    }

    private clearCache() {
        this.prevEditTime = 0
        this.prevDocumentUri = undefined
        this.prevCursorPosition = undefined
        this.prevNewCommands = undefined
    }

    getHtml(webview: vscode.Webview) {
        const jsPath = vscode.Uri.file(path.join(this.extension.extensionRoot, './resources/mathpreviewpanel/mathpreview.js'))
        const jsPathSrc = webview.asWebviewUri(jsPath)
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource}; img-src data:; style-src 'unsafe-inline';">
            <meta charset="UTF-8">
            <style>
                body {
                    padding: 0;
                    margin: 0;
                }
                #math {
                    padding-top: 35px;
                    padding-left: 50px;
                }
            </style>
            <script src='${jsPathSrc}' defer></script>
        </head>
        <body>
            <div id="mathBlock"><img src="" id="math" /></div>
        </body>
        </html>`
    }

    async update(ev?: UpdateEvent) {
        if (!this.panel || !this.panel.visible) {
            return
        }
        if (ev?.type === 'edit') {
            this.prevEditTime = Date.now()
        } else if (ev?.type === 'selection') {
            if (Date.now() - this.prevEditTime < 100) {
                return
            }
        }
        const editor = vscode.window.activeTextEditor
        const document = editor?.document
        if (!editor || !document?.languageId || !this.extension.manager.hasTexId(document.languageId)) {
            this.clearCache()
            return
        }
        const documentUri = document.uri.toString()
        const position = editor.selection.active
        const texMath = this.getTexMath(document, position)
        if (!texMath) {
            this.clearCache()
            return
        }
        let cachedCommands: string | undefined
        if ( position.line === this.prevCursorPosition?.line && documentUri === this.prevDocumentUri ) {
            cachedCommands = this.prevNewCommands
        }
        const {svgDataUrl, newCommands} = await this.mathPreview.generateSVG(document, texMath, cachedCommands)
        this.prevDocumentUri = documentUri
        this.prevNewCommands = newCommands
        this.prevCursorPosition = position
        return this.panel.webview.postMessage({type: 'mathImage', src: svgDataUrl })
    }

    private getTexMath(document: vscode.TextDocument, position: vscode.Position) {
        const texMath = this.mathPreview.findMathEnvIncludingPosition(document, position)
        if (texMath) {
            // this.renderCursor(document, texMath)
            if (texMath.envname !== '$') {
                return texMath
            }
            if (texMath.range.start.character !== position.character && texMath.range.end.character !== position.character) {
                return texMath
            }
        }
        return
    }

    renderCursor(document: vscode.TextDocument, tex: TexMathEnv) {
        const s = this.mathPreview.renderCursor(document, tex.range)
        tex.texString = s
    }

}
