import * as vscode from 'vscode'
import * as fs from 'fs'

export class TextDocumentLike {
    readonly #lines: string[]
    readonly #eol: string

    static load(filePath: string): TextDocumentLike | vscode.TextDocument {
        const uri = vscode.Uri.file(filePath)
        const editor = vscode.window.activeTextEditor
        if (editor !== undefined && editor.document.uri.fsPath === uri.fsPath) {
            return editor.document
        }
        for ( const doc of vscode.workspace.textDocuments ) {
            if (doc.uri.fsPath === uri.fsPath) {
                return doc
            }
        }
        return new TextDocumentLike(fs.readFileSync(filePath).toString())
    }

    constructor(s: string) {
        if (s.match(/\r\n/)) {
            this.#eol = '\r\n'
        } else if (s.match(/\n/)) {
            this.#eol = '\n'
        } else {
            const editor = vscode.window.activeTextEditor
            if (editor === undefined || editor.document.eol === vscode.EndOfLine.LF) {
                this.#eol = '\n'
            } else {
                this.#eol = '\r\n'
            }
        }
        this.#lines = s.split(this.#eol)
    }

    get lineCount(): number {
        return this.#lines.length
    }

    getText(range?: vscode.Range): string {
        if (range === undefined) {
            return this.#lines.join(this.#eol)
        }
        let ret = ''
        let line: string | undefined
        const startLineNum = range.start.line
        const endLineNum = range.end.line
        if (this.lineCount <= startLineNum) {
            return ''
        }
        if (startLineNum === endLineNum) {
            line = this.#lines[startLineNum]
            return line.slice(range.start.character, range.end.character)
        }
        line = this.#lines[startLineNum]
        ret += line.slice(range.start.character)
        for (let i = startLineNum + 1; i < endLineNum; i++) {
            ret += this.#eol + this.#lines[i]
        }
        ret += this.#eol + this.#lines[endLineNum].slice(0, range.end.character)
        return ret
    }

    getWordRangeAtPosition(position: vscode.Position, regex = /(-?\d.\d\w)|([^`~!@#%^&*()-=+[{\]}|;:'",.<>/?\s]+)/g): vscode.Range | undefined {
        if (position.line > this.lineCount) {
            return undefined
        }
        const line = this.#lines[position.line]
        for (let i = position.character; i >= 0; i--) {
            const tmp = line.slice(i)
            const m = tmp.match(regex)
            if (m !== null) {
                return new vscode.Range(position.line, i, position.line, i + m[0].length)
            }
        }
        return undefined
    }

    lineAt(lineNum: number): TextLineLike
    lineAt(position: vscode.Position): TextLineLike
    lineAt(lineNum: number | vscode.Position) {
        if (typeof lineNum === 'number') {
            return new TextLineLike(this.#lines[lineNum])
        } else {
            return new TextLineLike(this.#lines[lineNum.line])
        }
    }

}

class TextLineLike {
    readonly text: string

    constructor(s: string) {
        this.text = s
    }

}
