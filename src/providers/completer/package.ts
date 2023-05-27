import * as vscode from 'vscode'
import * as fs from 'fs'
import type * as Ast from '@unified-latex/unified-latex-types'
import * as lw from '../../lw'
import type { IProvider } from '../completion'
import { argContentToStr } from '../../utils/parser'

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

    update(content: string, ast?: Ast.Node): {[pkgName: string]: string[]} {
        if (ast !== undefined) {
            return this.parseAst(ast)
        } else {
            return this.parseContent(content)
        }
    }

    private parseAst(node: Ast.Node): {[pkgName: string]: string[]} {
        const packages = {}
        if (node.type === 'macro' && ['usepackage', 'documentclass'].includes(node.content)) {
            const options: string[] = argContentToStr(node.args?.[0]?.content || [])
                .split(',')
                .map(arg => arg.trim())
            const optionsNoTrue = options
                .filter(option => option.includes('=true'))
                .map(option => option.replace('=true', ''))

            argContentToStr(node.args?.[1]?.content || [])
                .split(',')
                .map(packageName => this.toPackageObj(packageName.trim(), [...options, ...optionsNoTrue], node))
                .forEach(packageObj => Object.assign(packages, packageObj))
        } else if ('content' in node && typeof node.content !== 'string') {
            for (const subNode of node.content) {
                Object.assign(packages, this.parseAst(subNode))
            }
        }
        return packages
    }

    private parseContent(content: string): {[pkgName: string]: string[]} {
        const packages = {}
        const pkgReg = /\\usepackage(\[[^[\]{}]*\])?{(.*?)}/gs
        while (true) {
            const result = pkgReg.exec(content)
            if (result === null) {
                break
            }
            const packageNames = result[2].split(',').map(packageName => packageName.trim())
            const options = (result[1] || '[]').slice(1,-1).replace(/\s*=\s*/g,'=').split(',').map(option => option.trim())
            const optionsNoTrue = options.filter(option => option.includes('=true')).map(option => option.replace('=true', ''))
            packageNames
                .map(packageName => this.toPackageObj(packageName, [...options, ...optionsNoTrue]))
                .forEach(packageObj => Object.assign(packages, packageObj))
        }
        return packages
    }

    private toPackageObj(packageName: string, options: string[], node?: Ast.Node): {[pkgName: string]: string[]} {
        packageName = packageName.trim()
        if (packageName === '') {
            return {}
        }
        if (node?.type === 'macro' && node.content === 'documentclass') {
            packageName = 'class-' + packageName
        }
        return { packageName: options }
    }
}
