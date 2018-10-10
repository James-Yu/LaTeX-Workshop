import * as vscode from 'vscode'
import * as envpair from '../components/envpair'
import {Extension} from '../main'
import {tokenizer} from './tokenizer'

export class HoverProvider implements vscode.HoverProvider {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    public provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken) :
    Thenable<vscode.Hover> {
        return new Promise((resolve, _reject) => {
            const configuration = vscode.workspace.getConfiguration('latex-workshop')
            const hov = configuration.get('hoverPreview.enabled') as boolean
            if (hov && this.extension.panel) {
                const tk = this._tokenizer(document, position)
                if (tk) {
                    const scale = configuration.get('hoverPreview.scale') as number
                    const tok = tk[0]
                    const range = tk[1]
                    const panel = this.extension.panel
                    const d = panel.webview.onDidReceiveMessage( message => {
                        resolve( new vscode.Hover(new vscode.MarkdownString( "![equation](" + message.dataurl + ")" ), range ) )
                        d.dispose()
                    })
                    panel.webview.postMessage({
                        text: tok,
                        scale: scale,
                        need_dataurl: "1"
                    })
                    return
                }
            }
            const token = tokenizer(document, position)
            if (token === undefined) {
                resolve()
                return
            }
            if (token in this.extension.completer.reference.referenceData) {
                resolve(new vscode.Hover(
                    {language: 'latex', value: this.extension.completer.reference.referenceData[token].text }
                ))
                return
            }
            if (token in this.extension.completer.citation.citationData) {
                resolve(new vscode.Hover(
                    this.extension.completer.citation.citationData[token].text
                ))
                return
            }
            resolve()
        })
    }

    private renderCursor(document: vscode.TextDocument, range: vscode.Range) : string {
        const editor = vscode.window.activeTextEditor
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const conf = configuration.get('hoverPreview.cursor.enabled') as boolean
        if (editor && conf) {
            const cursor = editor.selection.active
            const symbol = configuration.get('hoverPreview.cursor.symbol') as string
            if (range.contains(cursor)) {
                return document.getText( new vscode.Range(range.start, cursor) ) + symbol + document.getText( new vscode.Range(cursor, range.end))
            }
        }
        return document.getText(range)
    }

    private mathjaxify(tex: string, envname: string) : string {
        let ret = tex.replace(/^\s*%.*?\r?\n/mg, '')
        ret = ret.replace(/\\label\{.*?\}/g, '')
        if (envname.match(/^(aligned|alignedat|array|Bmatrix|bmatrix|cases|CD|gathered|matrix|pmatrix|smallmatrix|split|subarray|Vmatrix|vmatrix)$/)) {
            ret = '\\begin{equation}' + ret + '\\end{equation}'
        }
        return ret
    }

    private _tokenizer(document: vscode.TextDocument, position: vscode.Position) : [string, vscode.Range] | undefined {
        const current_line = document.lineAt(position).text
        const a = current_line.match(/^(.*?)\\begin\{(align|align\*|alignat|alignat\*|aligned|alignedat|array|Bmatrix|bmatrix|cases|CD|eqnarray|eqnarray\*|equation|equation\*|gather|gather\*|gathered|matrix|multline|multline\*|pmatrix|smallmatrix|split|subarray|Vmatrix|vmatrix)\}/);
        if ( a && a[1].length <= position.character && position.character <= a[0].length ) {
            const envname = a[2]
            const startPos = new vscode.Position(position.line, a[1].length)
            return this.tokenizeEnv(document, envname, startPos)
        }
        return this.tokenizeInline(document, position, current_line)
    }

    private tokenizeEnv(document: vscode.TextDocument, envname: string, startPos: vscode.Position) : [string, vscode.Range] | undefined {
        const pattern = '\\\\(begin|end)\\{' + envpair.escapeRegExp(envname) + '\\}'
        const endPos0 = this.extension.envPair.locateMatchingPair(pattern, 1, startPos, document)
        if ( endPos0 ) {
            const endPos = new vscode.Position(endPos0.pos.line, endPos0.pos.character + 5 + envname.length)
            const range = new vscode.Range(startPos, endPos)
            const ret = this.mathjaxify( this.renderCursor(document, range), envname )
            return [ret, range]
        }
        return undefined
    }

    private tokenizeDisp(document: vscode.TextDocument, envname: string, startPos: vscode.Position) : [string, vscode.Range] | undefined {
        let lineNum = startPos.line + 1
        let m : RegExpMatchArray | null
        const reg = new RegExp(envpair.escapeRegExp(envname))

        while (lineNum <= document.lineCount) {
            m = document.lineAt(lineNum).text.match(reg)
            if (m && m.index) {
                const endPos = new vscode.Position(lineNum, m.index + envname.length)
                const range = new vscode.Range(startPos, endPos)
                const ret = this.mathjaxify( this.renderCursor(document, range), envname )
                return [ret, range]
            }
            lineNum += 1
        }
        return undefined
    }

    private tokenizeInline(document: vscode.TextDocument, position: vscode.Position, current_line :string) : [string, vscode.Range] | undefined {
        let b : RegExpMatchArray | null
        let s = current_line
        let base:number = 0
        while (b = s.match(/\$.+?\$|\\\(.+?\\\)/)) {
            if (b && b.index != null) {
                if ( base + b.index <= position.character && position.character <= (base + b.index + b[0].length) ) {
                    const start = new vscode.Position(position.line, base + b.index)
                    const end = new vscode.Position(position.line, base + b.index + b[0].length)
                    const range = new vscode.Range(start, end)
                    const ret = this.mathjaxify( this.renderCursor(document, range), '$' )
                    return [ret, range]
                }else{
                    base += b[0].length
                    s = current_line.substring(base)
                }
            }else{
                break
            }
        }
        return undefined
    }

}