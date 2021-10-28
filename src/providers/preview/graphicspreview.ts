import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import type { Extension } from '../../main'
import { GraphicsScaler } from './graphicsscaler'


export class GraphicsPreview {
    private readonly extension: Extension
    private readonly graphicsScaler: GraphicsScaler

    constructor(e: Extension) {
        this.extension = e
        this.graphicsScaler = new GraphicsScaler()
    }

    async provideHover(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover | undefined> {
        const pat = /\\includegraphics\s*(?:\[(.*?)\])?\s*\{(.*?)\}/
        const range = document.getWordRangeAtPosition(position, pat)
        if (!range) {
            return undefined
        }
        const cmdString = document.getText(range)
        const execArray = pat.exec(cmdString)
        const relPath = execArray && execArray[2]
        const includeGraphicsArgs = execArray && execArray[1]
        if (!execArray || !relPath) {
            return undefined
        }
        const filePath = this.findFilePath(relPath, document)
        if (filePath === undefined) {
            return undefined
        }
        let pageNumber = 1
        if (includeGraphicsArgs) {
            const m = /page\s*=\s*(\d+)/.exec(includeGraphicsArgs)
            if (m && m[1]) {
                pageNumber = Number(m[1])
            }
        }
        const md = await this.renderGraphicsAsMarkdownString(filePath, { height: 230, width: 500, pageNumber })
        if (md !== undefined) {
            return new vscode.Hover(md, range)
        }
        return undefined
    }

    async renderGraphicsAsMarkdownString(filePath: string, opts: { height: number, width: number, pageNumber?: number }): Promise<vscode.MarkdownString | undefined> {
        const dataUrl = await this.renderGraphicsAsDataUrl(filePath, opts)
        if (dataUrl !== undefined) {
            let md: vscode.MarkdownString
            if (dataUrl.length < 99980) {
                md = new vscode.MarkdownString(`![graphics](${dataUrl})`)
            } else {
                md = new vscode.MarkdownString('$(error) The file is too large to render.', true)
            }
            return md
        } else {
            if (/\.pdf$/i.exec(filePath)) {
                let msg = '$(error) Failed to render.'
                if (!vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath))) {
                    msg = '$(warning) Cannot render a PDF file not in workspaces.'
                } else if (!this.extension.snippetView.snippetViewProvider.webviewView) {
                    msg = '$(info) Please activate Snippet View to render the thumbnail of a PDF file.'
                }
                return new vscode.MarkdownString(msg, true)
            }
            return undefined
        }
    }

    private async renderGraphicsAsDataUrl(filePath: string, opts: { height: number, width: number, pageNumber?: number }): Promise<string | undefined> {
        const pageNumber = opts.pageNumber || 1
        if (!fs.existsSync(filePath)) {
            return undefined
        }
        if (/\.pdf$/i.exec(filePath)) {
            const dataUrl = await this.extension.snippetView.renderPdf(vscode.Uri.file(filePath), pageNumber)
            if (!dataUrl) {
                this.extension.logger.addLogMessage(`Failed to render: ${filePath}`)
                return
            }
            const scaledDataUrl = await this.graphicsScaler.scaleDataUrl(dataUrl, opts)
            if (!scaledDataUrl) {
                this.extension.logger.addLogMessage(`Failed to resize: ${filePath}`)
            }
            return scaledDataUrl
        }
        if (/\.(bmp|jpg|jpeg|gif|png)$/i.exec(filePath)) {
            const dataUrl = await this.graphicsScaler.scale(filePath, opts)
            return dataUrl
        }
        return undefined
    }

    private findFilePath(relPath: string, document: vscode.TextDocument): string | undefined {
        if (path.isAbsolute(relPath)) {
            if (fs.existsSync(relPath)) {
                return relPath
            } else {
                return undefined
            }
        }

        const activeDir = path.dirname(document.uri.fsPath)
        for (const dirPath of this.extension.completer.input.graphicsPath) {
            const filePath = path.resolve(activeDir, dirPath, relPath)
            if (fs.existsSync(filePath)) {
                return filePath
            }
        }

        const fPath = path.resolve(activeDir, relPath)
        if (fs.existsSync(fPath)) {
            return fPath
        }

        const rootDir = this.extension.manager.rootDir
        if (rootDir === undefined) {
            return undefined
        }
        const frPath = path.resolve(rootDir, relPath)
        if (fs.existsSync(frPath)) {
            return frPath
        }
        return undefined
    }

}
