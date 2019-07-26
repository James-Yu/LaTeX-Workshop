import * as vscode from 'vscode'
import { Extension } from '../main'
import { TypeFinder } from './typeFinder'
import { exec } from 'child_process'
import * as path from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'

interface ISnippet {
    prefix: RegExp
    body: string
    description?: string
    priority?: number
    triggerWhenComplete?: boolean
    mode?: 'maths' | 'text' | 'any'
}

export class CompletionWatcher {
    extension: Extension
    typeFinder: TypeFinder
    private lastChanges: vscode.TextDocumentChangeEvent | undefined
    private lastKnownType:
        | {
              position: vscode.Position;
              mode: 'maths' | 'text';
          }
        | undefined
    currentlyExecutingChange = false
    private enabled: boolean
    private configAge: number
    private MAX_CONFIG_AGE = 5000
    snippetFile: {
        extension: string;
        user: string;
        current?: string;
    }
    snippets: ISnippet[] = []
    activeSnippets: vscode.CompletionItem[] = []

    constructor(extension: Extension) {
        this.extension = extension
        this.typeFinder = new TypeFinder()
        this.enabled = vscode.workspace.getConfiguration('latex-workshop').get('liveReformat.enabled') as boolean
        this.configAge = +new Date()
        vscode.workspace.onDidChangeTextDocument(this.watcher, this)
        this.snippetFile = {
            user: this.getUserSnippetsFile(),
            extension: path.join(this.extension.extensionRoot, 'snippets', 'liveSnippets.json')
        }
        this.loadSnippets()
    }

    private processSnippets() {
        for (let i = 0; i < this.snippets.length; i++) {
            const snippet = this.snippets[i]
            if (snippet.priority === undefined) {
                snippet.priority = 0
            }
            if (snippet.triggerWhenComplete === undefined) {
                snippet.triggerWhenComplete = false
            }
            if (snippet.mode === undefined) {
                snippet.mode = 'any'
            }
        }
        this.snippets.sort((a, b) => {
            // @ts-ignore
            return b.priority - a.priority
        })
    }

    public async watcher(e: vscode.TextDocumentChangeEvent) {
        if (
            e.document.languageId !== 'latex' ||
            e.contentChanges.length === 0 ||
            this.currentlyExecutingChange ||
            this.sameChanges(e) ||
            !this.enabled
        ) {
            return
        }
        this.lastChanges = e
        this.activeSnippets = []

        if (+new Date() - this.configAge > this.MAX_CONFIG_AGE) {
            this.enabled = vscode.workspace.getConfiguration('latex-workshop').get('liveReformat.enabled') as boolean
            this.configAge = +new Date()
        }

        const start = +new Date()
        let columnOffset = 0
        for (const change of e.contentChanges) {
            const type = this.typeFinder.getTypeAtPosition(e.document, change.range.start, this.lastKnownType)
            this.lastKnownType = { position: change.range.start, mode: type }
            if (change.range.isSingleLine) {
                let line = e.document.lineAt(change.range.start.line)
                for (let i = 0; i < this.snippets.length; i++) {
                    if (this.snippets[i].mode === 'any' || this.snippets[i].mode === type) {
                        const newColumnOffset = await this.execSnippet(this.snippets[i], line, change, columnOffset)
                        if (newColumnOffset === 'break') {
                            break
                        } else if (newColumnOffset !== 0) {
                            columnOffset += newColumnOffset
                            line = e.document.lineAt(change.range.start.line)
                        }
                    }
                }
            }
        }
        console.log(`🔵 Watcher took ${+new Date() - start}ms to check for snippets`)
    }

    private sameChanges(changes: vscode.TextDocumentChangeEvent) {
        if (!this.lastChanges) {
            return false
        } else if (this.lastChanges.contentChanges.length !== changes.contentChanges.length) {
            return false
        } else {
            const changeSame = this.lastChanges.contentChanges.every((value, index) => {
                const newChange = changes.contentChanges[index]
                if (value.text !== newChange.text || !value.range.isEqual(newChange.range)) {
                    return false
                }

                return true
            })
            if (!changeSame) {
                return false
            }
        }

        return true
    }

    private async execSnippet(
        snippet: ISnippet,
        line: vscode.TextLine,
        change: vscode.TextDocumentContentChangeEvent,
        columnOffset: number
    ) : Promise<number | 'break'> {
        return new Promise((resolve, reject) => {
            const match = snippet.prefix.exec(
                line.text.substr(0, change.range.start.character + change.text.length + columnOffset)
            )
            if (match && vscode.window.activeTextEditor) {
                let matchRange: vscode.Range
                let replacement: string
                if (snippet.body === 'SPECIAL_ACTION_BREAK') {
                    resolve('break')
                    return
                } else if (snippet.body === 'SPECIAL_ACTION_FRACTION') {
                    [matchRange, replacement] = this.getFraction(match, line)
                } else {
                    matchRange = new vscode.Range(
                        new vscode.Position(line.lineNumber, match.index),
                        new vscode.Position(line.lineNumber, match.index + match[0].length)
                    )
                    if (snippet.body === 'SPECIAL_ACTION_SYMPY') {
                        replacement = this.execSympy(match, line)
                    } else {
                        replacement = match[0].replace(snippet.prefix, snippet.body).replace(/\$\./g, '$')
                    }
                }
                if (snippet.triggerWhenComplete) {
                    this.currentlyExecutingChange = true
                    vscode.window.activeTextEditor
                        .edit(
                            editBuilder => {
                                editBuilder.delete(matchRange)
                            },
                            { undoStopBefore: true, undoStopAfter: false }
                        )
                        .then(
                            () => {
                                // @ts-ignore
                                vscode.window.activeTextEditor
                                    .insertSnippet(new vscode.SnippetString(replacement), undefined, {
                                        undoStopBefore: true,
                                        undoStopAfter: true
                                    })
                                    .then(
                                        () => {
                                            this.currentlyExecutingChange = false
                                            resolve(replacement.length - match[0].length)
                                        },
                                        (reason: any) => {
                                            this.currentlyExecutingChange = false
                                            reject(reason)
                                        }
                                    )
                            },
                            (reason: any) => {
                                this.currentlyExecutingChange = false
                                reject(reason)
                            }
                        )
                } else {
                    this.activeSnippets.push({
                        label: replacement,
                        range: matchRange,
                        kind: vscode.CompletionItemKind.Reference
                    })
                }
            } else {
                resolve(0)
            }
        })
    }

    public provide() : vscode.CompletionItem[] {
        return this.activeSnippets
    }

    public editSnippetsFile() {
        if (!existsSync(this.snippetFile.user)) {
            writeFileSync(this.snippetFile.user, readFileSync(this.snippetFile.extension), 'utf8')
        }

        vscode.workspace
            .openTextDocument(vscode.Uri.file(this.snippetFile.user))
            .then(doc => vscode.window.showTextDocument(doc))
    }

    public loadSnippets(force = false) {
        let snippetsFile: string
        if (existsSync(this.snippetFile.user)) {
            snippetsFile = this.snippetFile.user
        } else {
            snippetsFile = this.snippetFile.extension
        }
        if (snippetsFile === this.snippetFile.current && !force) {
            return
        } else {
            this.snippetFile.current = snippetsFile
            const snippets = JSON.parse(readFileSync(this.snippetFile.current, { encoding: 'utf8' }))

            for (let i = 0; i < snippets.length; i++) {
                snippets[i].prefix = new RegExp(snippets[i].prefix)
            }

            this.snippets = snippets
            this.processSnippets()
        }
    }

    private getUserSnippetsFile() {
        const codeFolder = vscode.version.indexOf('insider') >= 0 ? 'Code - Insiders' : 'Code'
        const templateName = 'latexWorkshopLiveSnippets.json'

        if (process.platform === 'win32' && process.env.APPDATA) {
            return path.join(process.env.APPDATA, codeFolder, 'User', templateName)
        } else if (process.platform === 'darwin' && process.env.HOME) {
            return path.join(process.env.HOME, 'Library', 'Application Support', codeFolder, 'User', templateName)
        } else if (process.platform === 'linux' && process.env.HOME) {
            return path.join(process.env.HOME, '.config', codeFolder, 'User', templateName)
        } else {
            return ''
        }
    }

    private getFraction(match: RegExpExecArray, line: vscode.TextLine) : [vscode.Range, string] {
        // @ts-ignore
        const closingBracket: ')' | ']' | '}' = match[1]
        // @ts-ignore
        const openingBracket: '(' | '[' | '{' = { ')': '(', ']': '[', '}': '{' }[closingBracket]
        let depth = 0
        for (let i = match.index; i >= 0; i--) {
            if (line.text[i] === closingBracket) {
                depth--
            } else if (line.text[i] === openingBracket) {
                depth++
            }
            if (depth === 0) {
                // if command keep going till the \
                const commandMatch = /.*(\\\w+)$/.exec(line.text.substr(0, i))
                if (closingBracket === '}') {
                    if (commandMatch !== null) {
                        i -= commandMatch[1].length
                    }
                }
                const matchRange = new vscode.Range(
                    new vscode.Position(line.lineNumber, i),
                    new vscode.Position(line.lineNumber, match.index + match[0].length)
                )
                const replacement = `\\frac{${commandMatch ? '\\' : ''}${line.text.substring(
                    i + 1,
                    match.index
                )}}{$1} `
                return [matchRange, replacement]
            }
        }
        return [
            new vscode.Range(
                new vscode.Position(line.lineNumber, match.index + match[0].length),
                new vscode.Position(line.lineNumber, match.index + match[0].length)
            ),
            ''
        ]
    }

    private execSympy(match: RegExpExecArray, line: vscode.TextLine) {
        const replacement = 'SYMPY_CALCULATING'
        const command = match[1]
            .replace(/\\(\w+) ?/g, '$1')
            .replace(/\^/, '**')
            .replace('{', '(')
            .replace('}', ')')
        exec(
            `python3 -c "from sympy import *
import re
x, y, z, t = symbols('x y z t')
k, m, n = symbols('k m n', integer=True)
f, g, h = symbols('f g h', cls=Function)
init_printing()
print(eval('''latex(${command})'''), end='')"`,
            { encoding: 'utf8' },
            (_error, stdout, stderr) => {
                if (!vscode.window.activeTextEditor) {
                    return
                } else if (stderr) {
                    stdout = 'SYMPY_ERROR'
                    setTimeout(() => {
                        this.extension.logger.addLogMessage(`error executing sympy command: ${command}`)
                        if (!vscode.window.activeTextEditor) {
                            return
                        }

                        vscode.window.activeTextEditor.edit(editBuilder => {
                            editBuilder.delete(
                                new vscode.Range(
                                    new vscode.Position(line.lineNumber, match.index),
                                    new vscode.Position(line.lineNumber, match.index + stdout.length)
                                )
                            )
                        })
                    }, 400)
                }
                vscode.window.activeTextEditor.edit(editBuilder => {
                    editBuilder.replace(
                        new vscode.Range(
                            new vscode.Position(line.lineNumber, match.index),
                            new vscode.Position(line.lineNumber, match.index + replacement.length)
                        ),
                        stdout
                    )
                })
            }
        )
        return replacement
    }
}
