import * as vscode from 'vscode'
// import * as fs from 'fs'
// import * as path from 'path'
// import * as opn from 'opn'
// import * as WebSocket from 'ws'

import {Extension} from '../main'

export class Typer {
    extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    process(args: any) : boolean {
        const inputChar: string = args.text
        if (inputChar !== '\\') {
            return false
        }
        if (vscode.window.activeTextEditor) {
            const editor = vscode.window.activeTextEditor
            if (editor.selection.start.character === editor.selection.end.character) {
                return false
            }
            const content = editor.document.getText(new vscode.Range(editor.selection.start, editor.selection.end))
            const candidate: string[] = ['\\']
            this.extension.completer.command.provide().forEach(item => {
                if (item.insertText === undefined) {
                    return
                }
                if (item.label === '\\begin') { // Causing a lot of trouble
                    return
                }
                const command = (typeof item.insertText !== 'string') ? item.insertText.value : item.insertText
                if (command.match(/(.*)(\${\d.*?})/)) {
                    candidate.push('\\' + command.replace(/\n/g, '').replace(/\t/g, '').replace('\\\\', '\\'))
                }
            })
            vscode.window.showQuickPick(candidate, {
                placeHolder: 'Press ENTER to insert a \\, or select a command',
                matchOnDetail: true,
                matchOnDescription: true
            }).then(selected => {
                if (selected === undefined) {
                    return
                }
                if (selected === '\\') {
                    vscode.commands.executeCommand('default:type', args)
                    return
                }
                editor.edit(edit => edit.replace(new vscode.Range(editor.selection.start, editor.selection.end),
                                                 selected.replace(/(.*)(\${\d.*?})/, `$1${content}`) // Replace text
                                                         .replace(/\${\d:?(.*?)}/g, '$1') // Remove snippet placeholders
                                                         .replace('\\\\', '\\') // Unescape backslashes, e.g., begin{${1:env}}\n\t$2\n\\\\end{${1:env}}
                                                         .replace(/\$\d/, ''))) // Remove $2 etc
            })
            return true
        }
        return false
    }
}
