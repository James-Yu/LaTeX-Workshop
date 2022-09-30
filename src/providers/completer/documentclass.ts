import * as vscode from 'vscode'
import * as fs from 'fs'

import type {IProvider} from './interface'
import type {ExtensionRootLocator} from '../../interfaces'

type DataClassnamesJsonType = typeof import('../../../data/classnames.json')

type ClassItemEntry = {
    command: string,
    detail: string,
    documentation: string
}

interface IExtension extends
    ExtensionRootLocator { }

export class DocumentClass implements IProvider {
    private readonly extension: IExtension
    private readonly suggestions: vscode.CompletionItem[] = []

    constructor(extension: IExtension) {
        this.extension = extension
    }

    initialize(classes: {[key: string]: ClassItemEntry}) {
        Object.keys(classes).forEach(key => {
            const item = classes[key]
            const cl = new vscode.CompletionItem(item.command, vscode.CompletionItemKind.Module)
            cl.detail = item.detail
            cl.documentation = new vscode.MarkdownString(`[${item.documentation}](${item.documentation})`)
            this.suggestions.push(cl)
        })
    }

    provideFrom() {
        return this.provide()
    }

    private provide(): vscode.CompletionItem[] {
        if (this.suggestions.length === 0) {
            const allClasses: {[key: string]: ClassItemEntry} = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/classnames.json`).toString()) as DataClassnamesJsonType
            this.initialize(allClasses)
        }
        return this.suggestions
    }
}
