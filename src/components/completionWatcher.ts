import * as vscode from 'vscode'
import { Extension } from '../main'
import { TypeFinder } from './typeFinder'

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
    lastChanges: vscode.TextDocumentChangeEvent | undefined
    lastKnownType:
        | {
              position: vscode.Position;
              mode: 'maths' | 'text';
          }
        | undefined
    currentlyExecutingChange = false
    snippets: ISnippet[] = [
        {
            prefix: /([A-Za-z])(\d)$/,
            body: '$1_$2',
            mode: 'maths',
            triggerWhenComplete: true,
            description: 'auto subscript'
        },
        {
            prefix: /([A-Za-z])\s?_(\d\d)$/,
            body: '$1_{$2}',
            mode: 'maths',
            triggerWhenComplete: true,
            description: 'auto subscript 2'
        },
        {
            prefix: /([A-Za-z])\s?\^([\d\+-]\d)$/,
            body: '$1^{$2}',
            mode: 'maths',
            triggerWhenComplete: true,
            description: 'auto superscript',
            priority: 2
        },
        {
            prefix: /([^\s\+])\+\s?([^\s\+])$/,
            body: '$1 + $2',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /([^\s-])-\s?([^\s-])$/,
            body: '$1 - $2',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /([^\s&=])=\s?([^\s=])$/,
            body: '$1 = $2',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?\.\.\.$/,
            body: ' \\dots ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?=>$/,
            body: ' \\implies ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?=<$/,
            body: ' \\impliedby ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?\/\/$/,
            body: ' \\fraction{$1}{$2} ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /((\d+)|(\d*)(\\)?([A-Za-z]+)((\^|_)(\{\d+\}|\d))*)\//,
            body: '\\frac{$1}{$.1}$.0',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /([\)\]])\/$/,
            body: 'SPECIAL_ACTION_FRACTION',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\b\s?iff$/,
            body: ' \\iff ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\b\s?in$/,
            body: ' \\in ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\b\s?notin$/,
            body: ' \\not\\in ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?!=$/,
            body: ' \\neq ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?==$/,
            body: ' &= ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?~=$/,
            body: ' \\approx ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?~~$/,
            body: ' \\sim ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?>=$/,
            body: ' \\geq ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?<=$/,
            body: ' \\leq ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?>>$/,
            body: ' \\gg ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?<<$/,
            body: ' \\ll ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?xx$/,
            body: ' \\times ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?\*\*$/,
            body: ' \\cdot ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?(to|->)$/,
            body: ' \\to ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?\|->$/,
            body: ' \\mapsto ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /(^|[^\\])\s?(exp|sin|cos|tan|cot|csc|sec|arcsin|arccos|arctan|arccot|csc|sec|pi)$/,
            body: '$1\\$2',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?(\\?\w+)(,\.|\.,)$/,
            body: ' \\vec{$1} ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\sbar$/,
            body: ' \\overline{$1} ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s([A-Za-z]{1,3})bar$/,
            body: ' \\overline{$1} ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\shat$/,
            body: ' \\overline{$1} ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s([A-Za-z])hat$/,
            body: ' \\hat{$1} ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\\\)(\w)$/,
            body: '\\) $1',
            mode: 'text',
            triggerWhenComplete: true
        },
        {
            prefix: /\\\\\\$/,
            body: '\\setminus ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?pmat$/,
            body: ' \\begin{pmatrix} $1 \\end{pmatrix} $0 ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?bmat$/,
            body: ' \\begin{bmatrix} $1 \\end{bmatrix} ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?\(\)$/,
            body: ' \\left( $1 \\right) ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?lr\($/,
            body: ' \\left( $1 \\right) ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?lr\[$/,
            body: ' \\left[ $1 \\right] ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?lr\|$/,
            body: ' \\left\\lvert $1 \\right\\rvert ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?lr\{$/,
            body: ' \\left\\{ $1 \\right\\} ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?lr<$/,
            body: ' \\left< $1 \\right> ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?part$/,
            body: ' \\frac{\\partial ${1:V}}{\\partial ${2:x}} ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?sq$/,
            body: ' \\sqrt{$1} ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /sr$/,
            body: '^2 ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /sb$/,
            body: '^3 ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?EE$/,
            body: ' \\exists ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?AA$/,
            body: ' \\forall ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?(x|y|n|m)(i|j|k|n|m){2}$/,
            body: ' $1_$2 ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?(x|y|n|m)(i|j|k|n|m){1,2}p1$/,
            body: ' $1_{$2+1} ',
            mode: 'maths',
            priority: 2,
            triggerWhenComplete: true
        },
        {
            prefix: /\s?dint$/,
            body: ' \\int_{${1:-\\infty}}^{${2:\\infty}} ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?set$/,
            body: ' \\{$1\\} ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?\|\|$/,
            body: ' \\mid ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?<>$/,
            body: ' \\diamond ',
            mode: 'maths',
            triggerWhenComplete: true
        },
        {
            prefix: /\s?case$/,
            body: ' \\begin{cases} $1 \\end{cases} ',
            mode: 'maths',
            triggerWhenComplete: true
        }
    ]

    constructor(extension: Extension) {
        this.extension = extension
        this.typeFinder = new TypeFinder()
        vscode.workspace.onDidChangeTextDocument(this.watcher, this)
        this.processSnippets()
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
        if (e.contentChanges.length === 0 || this.currentlyExecutingChange || this.sameChanges(e)) {
            return
        }
        this.lastChanges = e

        const start = +new Date()
        for (const change of e.contentChanges) {
            const type = this.typeFinder.getTypeAtPosition(e.document, change.range.start, this.lastKnownType)
            this.lastKnownType = { position: change.range.start, mode: type }
            if (change.range.isSingleLine) {
                let line = e.document.lineAt(change.range.start.line)
                for (let i = 0; i < this.snippets.length; i++) {
                    if (this.snippets[i].mode === 'any' || this.snippets[i].mode === type) {
                        const replacementMade = await this.execSnippet(this.snippets[i], line, change)
                        if (replacementMade) {
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

    private async execSnippet(snippet: ISnippet, line: vscode.TextLine, change: vscode.TextDocumentContentChangeEvent) {
        return new Promise((resolve, reject) => {
            const match = snippet.prefix.exec(line.text.substr(0, change.range.start.character + change.text.length))
            if (match && vscode.window.activeTextEditor) {
                let matchRange: vscode.Range
                let replacement: string
                if (snippet.body === 'SPECIAL_ACTION_FRACTION') {
                    // @ts-ignore
                    const closingBracket: ')' | ']' = match[1]
                    // @ts-ignore
                    const openingBracket: '(' | '[' = { ')': '(', ']': '[' }[closingBracket]
                    let depth = 0
                    for (let i = match.index; i >= 0; i--) {
                        if (line.text[i] === closingBracket) {
                            depth--
                        } else if (line.text[i] === openingBracket) {
                            depth++
                        }
                        if (depth === 0) {
                            matchRange = new vscode.Range(
                                new vscode.Position(line.lineNumber, i),
                                new vscode.Position(line.lineNumber, match.index + match[0].length)
                            )
                            replacement = `\\frac{${line.text.substring(i + 1, match.index)}}{$1} `
                            break
                        }
                    }
                } else {
                    matchRange = new vscode.Range(
                        new vscode.Position(line.lineNumber, match.index),
                        new vscode.Position(line.lineNumber, match.index + match[0].length)
                    )
                    replacement = match[0].replace(snippet.prefix, snippet.body).replace(/\$\./g, '$')
                }
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
                                        resolve(true)
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
                // const endPos = new vscode.Position(line.lineNumber, match.index + replacement.length)
                // vscode.window.activeTextEditor.selection = new vscode.Selection(endPos, endPos)
            } else {
                resolve(false)
            }
        })
    }
}
