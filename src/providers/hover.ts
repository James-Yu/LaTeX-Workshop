import * as vscode from 'vscode'
import * as envpair from '../components/envpair'
import {Extension} from '../main'
import {tokenizer} from './tokenizer'

export class HoverProvider implements vscode.HoverProvider  {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    public provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken) :
    Thenable<vscode.Hover> {
        return new Promise((resolve, _reject) => {
            const tk = this._tokenizer(document, position)
            if (this.extension.panel && tk) {
                const tok = tk[0]
                const range = tk[1]
                const panel = this.extension.panel
                const d = panel.webview.onDidReceiveMessage( message => {
                    resolve( new vscode.Hover(new vscode.MarkdownString( "![equation](" + message.dataurl + ")" ), range ) )
                    d.dispose()
                })
                panel.webview.postMessage({
                    text: tok,
                    need_dataurl: "1"
                })
                return
            } else {
                const token = tokenizer(document, position)
                if (token === undefined) {
                    resolve()
                    return
                }
                if (token in this.extension.completer.reference.referenceData) {
                    resolve(new vscode.Hover({language: 'latex',
                    value: this.extension.completer.reference.referenceData[token].text
                }))
                return
                }
                if (token in this.extension.completer.citation.citationData) {
                    resolve(new vscode.Hover(
                        this.extension.completer.citation.citationData[token].text
                        ))
                        return
                    }
                    resolve()
            }
        })
    }

    private _tokenizer(document: vscode.TextDocument, position: vscode.Position) : [string, vscode.Range] | undefined {
        const current_line = document.lineAt(position).text
        const a = current_line.match(/^(.*?)\\begin\{(.*?)\}/);
        if ( a ) {
            const envname = a[2]
            const pattern = '\\\\(begin|end)\\{' + envpair.escapeRegExp(envname) + '\\}'
            const startPos = new vscode.Position(position.line, a[1].length)
            const endPos0 = this.extension.envPair.locateMatchingPair(pattern, 1, startPos, document)
            if ( endPos0 ) {
                const endPos = new vscode.Position(endPos0.pos.line, endPos0.pos.character + 5 + envname.length)
                const range = new vscode.Range(startPos, endPos)
                const ret = document.getText( range )
                return [ret, range]
            }
            return undefined
        }
        let b : RegExpMatchArray | null
        let s = current_line
        let base:number = 0
        while ( b = s.match(/\$.+?\$|\\\(.+?\\\)/) ) {
            if ( b && b.index != null ) {
                if ( base + b.index <= position.character && position.character <= (base + b.index + b[0].length) ) {
                    const start = new vscode.Position(position.line, base + b.index)
                    const end = new vscode.Position(position.line, base + b.index + b[0].length)
                    const range = new vscode.Range(start, end)
                    return [b[0], range]
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