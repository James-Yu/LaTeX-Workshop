import * as vscode from 'vscode'
import * as fs from 'fs'

import type { Extension } from '../../main'
import type { IProvider } from '../completion'

type DataPackagesJsonType = typeof import('../../../data/packagenames.json')

type PackageItemEntry = {
    command: string,
    detail: string,
    documentation: string
}

export class Package implements IProvider {
    private readonly extension: Extension
    private readonly suggestions: vscode.CompletionItem[] = []
    private readonly packageDeps: {[packageName: string]: string[]} = {}
    private readonly packageOptions: {[packageName: string]: string[]} = {}

    constructor(extension: Extension) {
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

    setPackageDeps(packageName: string, deps: string[]) {
        this.packageDeps[packageName] = deps
    }

    setPackageOptions(packageName: string, options: string[]) {
        this.packageOptions[packageName] = options
    }

    getPackageOptions(packageName: string) {
        return this.packageOptions[packageName] || []
    }

    private getPackageDeps(packageName: string): string[] {
        return this.packageDeps[packageName] || []
    }

    getPackagesIncluded(languageId: string): Set<string> {
        const packages: Set<string> = new Set()

        this.extension.completer.command.getExtraPkgs(languageId).forEach(packageName => packages.add(packageName))

        this.extension.manager.getIncludedTeX().forEach(tex => {
            const included = this.extension.manager.getCachedContent(tex)?.element.package
            if (included === undefined) {
                return
            }
            Object.keys(included).forEach(packageName => packages.add(packageName))
        })

        while (true) {
            const initLength = packages.size
            packages.forEach(packageName => this.getPackageDeps(packageName).forEach(dependName => packages.add(dependName)))
            if (packages.size === initLength) {
                break
            }
        }

        return packages
    }
}
