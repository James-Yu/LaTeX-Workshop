import * as vscode from 'vscode'
import type { CompletionItem } from '../../types'

interface CmdSignature {
    /** name without leading `\` */
    readonly name: string,
    /** {} for mandatory args and [] for optional args */
    readonly args: string
}

/**
 * Return {name, args} from a signature string `name` + `args`
 */
 export function splitSignatureString(signature: string): CmdSignature {
    const i = signature.search(/[[{]/)
    if (i > -1) {
        return {
            name: signature.substring(0, i),
            args: signature.substring(i, undefined)
        }
    } else {
        return {
            name: signature,
            args: ''
        }
    }
}

export class CmdEnvSuggestion extends vscode.CompletionItem implements CompletionItem {
    label: string
    package: string
    keyvals: string[]
    keyvalpos: number
    signature: CmdSignature
    option?: string

    constructor(label: string, packageName: string, keyvals: string[], keyvalpos: number, signature: CmdSignature, kind: vscode.CompletionItemKind, option?: string) {
        super(label, kind)
        this.label = label
        this.package = packageName
        this.keyvals = keyvals
        this.keyvalpos = keyvalpos
        this.signature = signature
        this.option = option
    }

    /**
     * Return the signature, ie the name + {} for mandatory arguments + [] for optional arguments.
     * The leading backward slash is not part of the signature
     */
    signatureAsString(): string {
        return this.signature.name + this.signature.args
    }

    /**
     * Return the name without the arguments
     * The leading backward slash is not part of the signature
     */
    name(): string {
        return this.signature.name
    }

    hasOptionalArgs(): boolean {
        return this.signature.args.includes('[')
    }
}

export function filterNonLetterSuggestions(suggestions: CompletionItem[], typedText: string, pos: vscode.Position): CompletionItem[] {
    if (typedText.match(/[^a-zA-Z]/)) {
        const exactSuggestion = suggestions.filter(entry => entry.label.startsWith(typedText))
        if (exactSuggestion.length > 0) {
            return exactSuggestion.map(item => {
                item.range = new vscode.Range(pos.translate(undefined, -typedText.length), pos)
                return item
            })
        }
    }
    return suggestions
}

export function computeFilteringRange(line: string, position: vscode.Position): vscode.Range | undefined {
    const curlyStart = line.lastIndexOf('{', position.character)
    const commaStart = line.lastIndexOf(',', position.character)
    const startPos = Math.max(curlyStart, commaStart)
    if (startPos >= 0) {
        return new vscode.Range(position.line, startPos + 1, position.line, position.character)
    }
    return
}

export function filterArgumentHint(suggestions: vscode.CompletionItem[]) {
    if (!vscode.workspace.getConfiguration('latex-workshop').get('intellisense.argumentHint.enabled')) {
        suggestions.forEach(item => {
            if (!item.insertText) {
                return
            }
            if (typeof item.insertText === 'string') {
                item.insertText = item.insertText.replace(/\$\{(\d+):[^$}]*\}/g, '$${$1}')
            } else {
                item.insertText = new vscode.SnippetString(item.insertText.value.replace(/\$\{(\d+):[^$}]*\}/g, '$${$1}'))
            }
        })
    }
}
