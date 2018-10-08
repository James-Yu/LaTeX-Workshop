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
            const tok = this._tokenizer(document, position)
            if (this.extension.panel && tok) {
                const panel = this.extension.panel
                const d = panel.webview.onDidReceiveMessage( message => {
                resolve(
                    new vscode.Hover(
                        new vscode.MarkdownString( "![a](" + message.dataurl + ")" ),
                        new vscode.Range(document.lineCount, 0, document.lineCount,1) ))
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

    private _tokenizer(document: vscode.TextDocument, position: vscode.Position) : string | undefined {
        const current_line = document.lineAt(position).text
        const a = current_line.match(/^(.*?)\\begin\{(.*?)\}/);
        if ( a ) {
            const envname = a[2]
            const pattern = '\\\\(begin|end)\\{' + envpair.escapeRegExp(envname) + '\\}'
            const startPos = new vscode.Position(position.line, a[1].length)
            const endPos0 = this.extension.envPair.locateMatchingPair(pattern, 1, startPos, document)
            if ( endPos0 ) {
                const endPos = new vscode.Position(endPos0.pos.line, endPos0.pos.character + 5 + envname.length)
                const ret = document.getText( new vscode.Range(startPos, endPos) )
                return ret
            }
            return undefined
        }
        let b : RegExpMatchArray | null
        let s = current_line
        let base:number = 0
        while ( b = s.match(/\$.+\$|\\\(.+\\\)/) ) {
            if ( b && b.index != null ) {
                if ( base + b.index <= position.character && position.character <= base + b.index + b[0].length ) {
                    return b[0]
                }else{
                    base += b[0].length
                    s = s.substr(b[0].length)
                }
            }else{
                break
            }
        }
        return undefined
    }
}