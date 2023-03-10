import * as vscode from 'vscode'
import * as fs from 'fs'
import { latexParser } from 'latex-utensils'
import * as lw from '../../lw'
import type { IProvider } from '../completion'

type DataPackagesJsonType = typeof import('../../../data/packagenames.json')

type PackageItemEntry = {
    command: string,
    detail: string,
    documentation: string
}

export class Package implements IProvider {
    private readonly suggestions: vscode.CompletionItem[] = []
    private readonly packageDeps: {[packageName: string]: {[key: string]: string[]}} = {}
    private readonly packageOptions: {[packageName: string]: string[]} = {}

    initialize(defaultPackages: {[key: string]: PackageItemEntry}) {
        Object.values(defaultPackages).forEach(item => {
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
            const pkgs: {[key: string]: PackageItemEntry} = JSON.parse(fs.readFileSync(`${lw.extensionRoot}/data/packagenames.json`).toString()) as DataPackagesJsonType
            this.initialize(pkgs)
        }
        return this.suggestions
    }

    setPackageDeps(packageName: string, deps: {[key: string]: string[]}) {
        this.packageDeps[packageName] = deps
    }

    setPackageOptions(packageName: string, options: string[]) {
        this.packageOptions[packageName] = options
    }

    getPackageOptions(packageName: string) {
        return this.packageOptions[packageName] || []
    }

    private getPackageDeps(packageName: string): {[key: string]: string[]} {
        return this.packageDeps[packageName] || {}
    }

    getPackagesIncluded(languageId: string): {[packageName: string]: string[]} {
        const packages: {[packageName: string]: string[]} = {}
        const config = vscode.workspace.getConfiguration('latex-workshop')
        const excluded = config.get('intellisense.package.exclude') as string[]
        if (!excluded.includes('lw-default')) {
            if (['latex', 'latex-expl3'].includes(languageId)) {
                packages['latex-document'] = []
            }
            if (languageId === 'latex-expl3') {
                packages['expl3'] = []
            }
        }

        (config.get('intellisense.package.extra') as string[])
            .filter(packageName => !excluded.includes(packageName))
            .forEach(packageName => packages[packageName] = [])

        lw.cacher.getIncludedTeX().forEach(tex => {
            const included = lw.cacher.get(tex)?.elements.package
            if (included === undefined) {
                return
            }
            Object.entries(included)
                .filter(([packageName, ]) => !excluded.includes(packageName))
                .forEach(([packageName, options]) => packages[packageName] = options)
        })

        while (true) {
            let newPackageInserted = false
            Object.entries(packages).forEach(([packageName, options]) => Object.keys(this.getPackageDeps(packageName))
                .filter(includeName => !excluded.includes(includeName))
                .forEach(includeName => {
                    const dependOptions = this.getPackageDeps(packageName)[includeName]
                    const hasOption = dependOptions.length === 0
                        || options.filter(option => dependOptions.includes(option)).length > 0
                    if (packages[includeName] === undefined && hasOption) {
                        packages[includeName] = []
                        newPackageInserted = true
                    }
                }
            ))
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
                const options = (result[1] || '[]').slice(1,-1).replace(/\s*=\s*/g,'=').split(',').map(option => option.trim())
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
        const cache = lw.cacher.get(fileName)
        if (cache === undefined) {
            return
        }
        cache.elements.package = cache.elements.package || {}
        cache.elements.package[packageName] = options
    }
}
