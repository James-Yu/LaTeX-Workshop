import * as vscode from 'vscode'
import type {ILwCompletionItem} from '../interface'

export interface CmdSignature {
    readonly name: string, // name without leading `\`
    readonly args: string // {} for mandatory args and [] for optional args
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

export class CmdEnvSuggestion extends vscode.CompletionItem implements ILwCompletionItem {
    label: string
    package: string
    signature: CmdSignature

    constructor(label: string, pkg: string, signature: CmdSignature, kind: vscode.CompletionItemKind) {
        super(label, kind)
        this.label = label
        this.package = pkg
        this.signature = signature
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

