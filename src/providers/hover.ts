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
            console.time('hover render: ')
            if (this.extension.panel && tok) {
                const panel = this.extension.panel
                const d = panel.webview.onDidReceiveMessage( message => {
                resolve(
                    new vscode.Hover(
                        new vscode.MarkdownString( "![a](" + message.dataurl + ")" ),
                        new vscode.Range(document.lineCount, 0, document.lineCount,1) ))
                        console.timeEnd('hover render: ')
                        d.dispose()
                    })
                panel.webview.postMessage({
                    text: "$$ " + tok + " $$",
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

    public _tokenizer(document: vscode.TextDocument, position: vscode.Position) : string | undefined {
        const current_line = document.lineAt(position).text
        const a = current_line.match(/^(.*?)\\begin\{(.*?)\}/);
        if ( a ) {
            const envname = a[2]
            const pattern = '\\\\(begin|end)\\{' + envpair.escapeRegExp(envname) + '\\}'
            console.log(a[2])
            const startPos = new vscode.Position(position.line, a[1].length)
            const endPos0 = this.extension.envPair.locateMatchingPair(pattern, 1, startPos, document)
            if ( endPos0 ) {
                const endPos = new vscode.Position(endPos0.pos.line, endPos0.pos.character + 5 + envname.length)
                const ret = document.getText( new vscode.Range(startPos, endPos) )
                console.log(ret)
                return ret
            }
        }
        return undefined
    }
}