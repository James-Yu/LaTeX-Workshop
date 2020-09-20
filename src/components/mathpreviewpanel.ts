import * as vscode from 'vscode'
import * as path from 'path'
import type {MathPreview, TexMathEnv} from '../providers/preview/mathpreview'
import {openWebviewPanel} from '../utils/webview'
import type {Extension} from '../main'


export class MathPreviewPanelSerializer implements vscode.WebviewPanelSerializer {
    private readonly extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    deserializeWebviewPanel(panel: vscode.WebviewPanel) {
        this.extension.mathPreviewPanel.initializePanel(panel)
        panel.webview.html = this.extension.mathPreviewPanel.getHtml(panel.webview)
        return Promise.resolve()
    }

}

export class MathPreviewPanel {
    private readonly extension: Extension
    private readonly mathPreview: MathPreview
    private panel?: vscode.WebviewPanel
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
        this.mathPreview.getColor()
        setTimeout(() => this.update(), 700)
    }

    initializePanel(panel: vscode.WebviewPanel) {
        this.panel = panel
        panel.onDidDispose(() => {
            this.clearCache()
            this.panel = undefined
        })
        panel.webview.onDidReceiveMessage(() => this.update())
    }

    close() {
        this.panel?.dispose()
        this.panel = undefined
        this.clearCache()
    }

    private clearCache() {
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
                    visibility: hidden;
                }
            </style>
            <script src='${jsPathSrc}' defer></script>
        </head>
        <body>
            <div id="mathBlock"><img src="" id="math" /></div>
        </body>
        </html>`
    }

    async update() {
        if (!this.panel || !this.panel.visible) {
            return
        }
        const editor = vscode.window.activeTextEditor
        const document = editor?.document
        if (!editor || document?.languageId !== 'latex') {
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
