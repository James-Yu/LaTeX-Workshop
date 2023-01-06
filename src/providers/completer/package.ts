import * as vscode from 'vscode'
import * as fs from 'fs'
import { latexParser } from 'latex-utensils'

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

    getPackagesIncluded(languageId: string): {[packageName: string]: string[]} {
        const packages: {[packageName: string]: string[]} = {}
        if (['latex', 'latex-expl3'].includes(languageId)) {
            packages['latex-document'] = []
        }
        if (languageId === 'latex-expl3') {
            packages['expl3'] = []
        }

        (vscode.workspace.getConfiguration('latex-workshop').get('intellisense.package.extra') as string[])
            .forEach(packageName => packages[packageName] = [])

        this.extension.cacher.getIncludedTeX().forEach(tex => {
            const included = this.extension.cacher.get(tex)?.elements.package
            if (included === undefined) {
                return
            }
            Object.keys(included).forEach(packageName => packages[packageName] = included[packageName])
        })

        while (true) {
            let newPackageInserted = false
            Object.keys(packages).forEach(packageName => this.getPackageDeps(packageName).forEach(dependName => {
                if (packages[dependName] === undefined) {
                    packages[dependName] = []
                    newPackageInserted = true
                }
            }))
            if (!newPackageInserted) {
                break
            }
        }

        return packages
    }

    /**
     * Updates the cache for packages used in `file` with `nodes`. If `nodes` is
     * `undefined`, `content` is parsed with regular expressions, and the result
     * is used to update the cache.
     *
     * @param file The path of a LaTeX file.
     * @param nodes AST of a LaTeX file.
     * @param content The content of a LaTeX file.
     */
    updateUsepackage(file: string, nodes?: latexParser.Node[], content?: string) {
        if (nodes !== undefined) {
            this.updateUsepackageNodes(file, nodes)
        } else if (content !== undefined) {
            const pkgReg = /\\usepackage(\[[^[\]{}]*\])?{(.*)}/gs

            while (true) {
                const result = pkgReg.exec(content)
                if (result === null) {
                    break
                }
                const packages = result[2].split(',').map(packageName => packageName.trim())
                const options = (result[1] || '[]').slice(1,-1).replaceAll(/\s*=\s*/g,'=').split(',').map(option => option.trim())
                const optionsNoTrue = options.filter(option => option.includes('=true')).map(option => option.replace('=true', ''))
                packages.forEach(packageName => this.pushUsepackage(file, packageName, [...options, ...optionsNoTrue]))
            }
        }
    }

    private updateUsepackageNodes(file: string, nodes: latexParser.Node[]) {
        nodes.forEach(node => {
            if ( latexParser.isCommand(node) && (node.name === 'usepackage' || node.name === 'documentclass') ) {
                let options: string[] = []
                node.args.forEach(arg => {
                    if (latexParser.isOptionalArg(arg)) {
                        options = arg.content.filter(latexParser.isTextString).filter(str => str.content !== ',').map(str => str.content)
                        const optionsNoTrue = options.filter(option => option.includes('=true')).map(option => option.replace('=true', ''))
                        options = [...options, ...optionsNoTrue]
                        return
                    }
                    for (const c of arg.content) {
                        if (!latexParser.isTextString(c)) {
                            continue
                        }
                        c.content.split(',').forEach(packageName => this.pushUsepackage(file, packageName, options, node))
                    }
                })
            } else {
                if (latexParser.hasContentArray(node)) {
                    this.updateUsepackageNodes(file, node.content)
                }
            }
        })
    }

    private pushUsepackage(fileName: string, packageName: string, options: string[], node?: latexParser.Command) {
        packageName = packageName.trim()
        if (packageName === '') {
            return
        }
        if (node?.name === 'documentclass') {
            packageName = 'class-' + packageName
        }
        const cache = this.extension.cacher.get(fileName)
        if (cache === undefined) {
            return
        }
        cache.elements.package = cache.elements.package || {}
        cache.elements.package[packageName] = options
    }
}
