import * as vscode from 'vscode'
import * as fs from 'fs'

import type {IProvider} from './interface'
import type {ExtensionRootLocator} from '../../interfaces'

type DataPackagesJsonType = typeof import('../../../data/packagenames.json')

type PackageItemEntry = {
    command: string,
    detail: string,
    documentation: string
}

interface IExtension extends
    ExtensionRootLocator { }

export class Package implements IProvider {
    private readonly extension: IExtension
    private readonly suggestions: vscode.CompletionItem[] = []

    constructor(extension: IExtension) {
        this.extension = extension
    }

    initialize(defaultPackages: {[key: string]: PackageItemEntry}) {
        Object.keys(defaultPackages).forEach(key => {
            const item = defaultPackages[key]
            const pack = new vscode.CompletionItem(item.command, vscode.CompletionItemKind.Module)
            pack.detail = item.detail
            pack.documentation = new vscode.MarkdownString(`[${item.documentation}](${item.documentation})`)
            this.suggestions.push(pack)
        })
    }

    provideFrom() {
        return this.provide()
    }

    private provide(): vscode.CompletionItem[] {
        if (this.suggestions.length === 0) {
            const pkgs: {[key: string]: PackageItemEntry} = JSON.parse(fs.readFileSync(`${this.extension.extensionRoot}/data/packagenames.json`).toString()) as DataPackagesJsonType
            this.initialize(pkgs)
        }
        return this.suggestions
    }
}
