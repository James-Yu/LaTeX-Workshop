import * as vscode from 'vscode'
import * as fs from 'fs'

class TextDocumentLike {
    private _lines: string[]
    readonly lineCount: number
    readonly eol: vscode.EndOfLine

    static load(filePath: string) : TextDocumentLike | vscode.TextDocument {
        const uri = vscode.Uri.parse(filePath)
        if (vscode.workspace.name === undefined) {
            return new TextDocumentLike(fs.readFileSync(filePath).toString())
        }
        for( const doc of vscode.workspace.textDocuments ) {
            if (doc.uri.fsPath === uri.fsPath) {
                return doc
            }
        }
        return new TextDocumentLike(fs.readFileSync(filePath).toString())
    }

    constructor(s: string) {
        let eol: string
        if (s.match(/\r\n/)) {
            this.eol = vscode.EndOfLine.CRLF
            eol = '\r\n'
        } else if (s.match(/\n/)) {
            this.eol = vscode.EndOfLine.LF
            eol = '\n'
        } else {
            const editor = vscode.window.activeTextEditor
            if (editor === undefined || editor.document.eol === vscode.EndOfLine.LF) {
                this.eol = vscode.EndOfLine.LF
                eol = '\n'
            } else {
                this.eol = vscode.EndOfLine.CRLF
                eol = '\r\n'
            }
        }
        this._lines = s.split(eol)
        this.lineCount = this._lines.length
    }

    getText(range: vscode.Range) : string {
        let ret = ''
        let line
        const startLineNum = range.start.line
        const endLineNum = range.end.line
        if (this.lineCount <= startLineNum) {
            return ''
        }
        if (startLineNum === endLineNum) {
            line = this._lines[startLineNum]
            return line.slice(range.start.character, range.end.character)
        }
        line = this._lines[startLineNum]
        ret += line.slice(range.start.character)
        for (let i = startLineNum + 1; i < endLineNum; i++) {
            ret += this._lines[i]
        }
        ret += this._lines[endLineNum].slice(0, range.end.character)
        return ret
    }

    getWordRangeAtPosition(position: vscode.Position, regex = /(-?\d.\d\w)|([^`~!\@@#\%\^\&*()-\=+[{]}\|\;\:\'\"\,.\<>\/\?\s]+)/g) : vscode.Range | undefined {
        if (position.line > this.lineCount) {
            return undefined
        }
        const line = this._lines[position.line]
        for (let i = position.character; i >= 0; i--) {
            const tmp = line.slice(i)
            const m = tmp.match(regex)
            if (m !== null) {
                return new vscode.Range(position.line, i, position.line, i + m[0].length)
            }
        }
        return undefined
    }

    lineAt(lineNum: number) : string {
        return this._lines[lineNum]
    }
}
