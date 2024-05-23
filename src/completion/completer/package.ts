import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import type * as Ast from '@unified-latex/unified-latex-types'
import { lw } from '../../lw'
import type { CompletionProvider, FileCache, Package } from '../../types'
import { argContentToStr } from '../../utils/parser'
import { replaceArgumentPlaceholders } from '../../utils/utils'

const logger = lw.log('Intelli', 'Package')

export const provider: CompletionProvider = { from }
export const usepackage = {
    parse,
    load,
    getAll,
    getDeps,
    getOpts,
    setDeps,
    setOpts
}

const data = {
    loaded: [] as string[],
    suggestions: [] as vscode.CompletionItem[],
    packageDeps: Object.create(null) as { [packageName: string]: { [key: string]: string[] } },
    packageOptions: Object.create(null) as { [packageName: string]: string[] }
}

type PackageItemEntry = {
    command: string,
    detail: string,
    documentation: string
}

function load(packageName: string) {
    if (data.loaded.includes(packageName)) {
        return
    }

    const filePath: string | undefined = resolvePackageFile(packageName)
    if (filePath === undefined) {
        data.loaded.push(packageName)
        return
    }

    try {
        const packageData = JSON.parse(fs.readFileSync(filePath).toString()) as Package
        populatePackageData(packageData)

        setDeps(packageName, packageData.includes)
        setOpts(packageName, packageData.options)
        lw.completion.environment.setPackageEnvs(packageName, packageData.envs)
        lw.completion.macro.setPackageCmds(packageName, packageData.macros)

        data.loaded.push(packageName)
    } catch (e) {
        logger.log(`Cannot parse intellisense file: ${filePath}`)
    }
}

function resolvePackageFile(packageName: string): string | undefined {
    const defaultDir = `${lw.extensionRoot}/data/packages/`
    const rawDirs = vscode.workspace.getConfiguration('latex-workshop').get('intellisense.package.dirs') as string[]
    const dirs = rawDirs.map((dir) => {return replaceArgumentPlaceholders('', '')(dir)})

    dirs.push(defaultDir)
    for (const dir of dirs) {
        const filePath = path.resolve(dir, `${packageName}.json`)
        if (fs.existsSync(filePath)) {
            return filePath
        }
    }
    // Many package with names like toppackage-config.sty are just wrappers around
    // the general package toppacke.sty and do not define macros on their own.
    const indexDash = packageName.lastIndexOf('-')
    if (indexDash > - 1) {
        const generalPkg = packageName.substring(0, indexDash)
        const filePath = path.resolve(defaultDir, `${generalPkg}.json`)
        if (fs.existsSync(filePath)) {
            return filePath
        }
    }
    return
}

function populatePackageData(packageData: Package) {
    Object.entries(packageData.macros).forEach(([key, cmd]) => {
        cmd.macro = key
        cmd.snippet = cmd.snippet || key
        cmd.keyvals = packageData.keyvals[cmd.keyvalindex ?? -1]
    })
    Object.entries(packageData.envs).forEach(([key, env]) => {
        env.detail = key
        env.name = env.name || key
        env.snippet = env.snippet || ''
        env.keyvals = packageData.keyvals[env.keyvalindex ?? -1]
    })
}

function initialize(defaultPackages: {[key: string]: PackageItemEntry}) {
    Object.values(defaultPackages).forEach(item => {
        const pack = new vscode.CompletionItem(item.command, vscode.CompletionItemKind.Module)
        pack.detail = item.detail
        pack.documentation = new vscode.MarkdownString(`[${item.documentation}](${item.documentation})`)
        data.suggestions.push(pack)
    })
}

function from(): vscode.CompletionItem[] {
    if (data.suggestions.length === 0) {
        const pkgs: {[key: string]: PackageItemEntry} = JSON.parse(fs.readFileSync(`${lw.extensionRoot}/data/packagenames.json`).toString()) as typeof import('../../../data/packagenames.json')
        initialize(pkgs)
    }
    return data.suggestions
}

function setDeps(packageName: string, deps: {[key: string]: string[]}) {
    data.packageDeps[packageName] = deps
}

function setOpts(packageName: string, options: string[]) {
    data.packageOptions[packageName] = options
}

function getOpts(packageName: string) {
    return data.packageOptions[packageName] || []
}

function getDeps(packageName: string): {[key: string]: string[]} {
    return data.packageDeps[packageName] || {}
}

function getAll(languageId: string): {[packageName: string]: string[]} {
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

    lw.cache.getIncludedTeX().forEach(tex => {
        const included = lw.cache.get(tex)?.elements.package
        if (included === undefined) {
            return
        }
        Object.entries(included)
            .filter(([packageName, ]) => !excluded.includes(packageName))
            .forEach(([packageName, options]) => packages[packageName] = options)
    })

    while (true) {
        let newPackageInserted = false
        Object.entries(packages).forEach(([packageName, options]) => Object.keys(getDeps(packageName))
            .filter(includeName => !excluded.includes(includeName))
            .forEach(includeName => {
                const dependOptions = getDeps(packageName)[includeName]
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

function parse(cache: FileCache) {
    if (cache.ast !== undefined) {
        cache.elements.package = parseAst(cache.ast)
    } else {
        cache.elements.package = parseContent(cache.content)
    }
}

function parseAst(node: Ast.Node): {[pkgName: string]: string[]} {
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
            .map(packageName => toPackageObj(packageName.trim(), [...options, ...optionsNoTrue], node))
            .forEach(packageObj => Object.assign(packages, packageObj))
    } else if ('content' in node && typeof node.content !== 'string') {
        for (const subNode of node.content) {
            Object.assign(packages, parseAst(subNode))
        }
    }
    return packages
}

function parseContent(content: string): {[pkgName: string]: string[]} {
    const packages = {}
    const pkgReg = /\\(?:usepackage|RequirePackage)(\[[^[\]{}]*\])?{(.*?)}/gs
    while (true) {
        const result = pkgReg.exec(content)
        if (result === null) {
            break
        }
        const packageNames = result[2].split(',').map(packageName => packageName.trim())
        const options = (result[1] || '[]').slice(1,-1).replace(/\s*=\s*/g,'=').split(',').map(option => option.trim())
        const optionsNoTrue = options.filter(option => option.includes('=true')).map(option => option.replace('=true', ''))
        packageNames
            .map(packageName => toPackageObj(packageName, [...options, ...optionsNoTrue]))
            .forEach(packageObj => Object.assign(packages, packageObj))
    }
    return packages
}

function toPackageObj(packageName: string, options: string[], node?: Ast.Node): {[pkgName: string]: string[]} {
    packageName = packageName.trim()
    if (packageName === '') {
        return {}
    }
    let pkgObj: {[pkgName: string]: string[]} = {}
    if (node?.type === 'macro' && node.content === 'documentclass') {
        if (vscode.workspace.getConfiguration('latex-workshop').get('kpsewhich.class.enabled') as boolean) {
            const clsPath = lw.file.kpsewhich(`${packageName}.cls`)
            if (clsPath && fs.existsSync(clsPath)) {
                pkgObj = parseContent(fs.readFileSync(clsPath).toString())
            }
        }
        packageName = 'class-' + packageName
    }
    pkgObj[packageName] = options
    return pkgObj
}
