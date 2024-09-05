// https://texstudio-org.github.io/background.html#description-of-the-cwl-format
import * as fs from 'fs'
import type { DependencyRaw, EnvironmentRaw, MacroRaw, PackageRaw } from '../src/types'

let _defaultMacros: string[] = []
function isDefaultMacro(macro: string, defaults?: string[]): boolean {
    if (defaults === undefined && _defaultMacros.length === 0) {
        _defaultMacros = Object.keys(JSON.parse(fs.readFileSync('../data/commands.json').toString()))
    }
    defaults = defaults ?? _defaultMacros
    return defaults.includes(macro)
}

let _unimathSymbols: { [key: string]: { detail?: string; documentation?: string } } = {}
function getUnimathSymbol(macro: string, defaults?: typeof _unimathSymbols) {
    if (defaults === undefined && Object.keys(_unimathSymbols).length === 0) {
        defaults = JSON.parse(fs.readFileSync('../data/unimathsymbols.json').toString())
    }
    defaults = defaults ?? _unimathSymbols
    return defaults[macro]
}

function isSkipLine(line: string): boolean {
    if (line === '') {
        return true
    }
    if (
        line.startsWith('#') &&
        !line.startsWith('#include') &&
        // !line.startsWith('#repl') &&
        !line.startsWith('#keyvals') &&
        !line.startsWith('#ifOption')
    ) {
        return true
    }
    return false
}

function parseLines(pkg: PackageRaw, lines: string[], ifCond?: string): void {
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index].trim()
        if (isSkipLine(line)) {
            continue
        }
        if (line.startsWith('#include')) {
            parseInclude(pkg, line, ifCond)
        } else if (line.startsWith('#keyvals')) {
            let endIndex = lines.slice(index).findIndex((l) => l.startsWith('#endkeyvals')) + index
            if (endIndex < index) {
                endIndex = Number.MAX_SAFE_INTEGER
            }
            parseKeys(pkg, lines.slice(index + 1, endIndex), line.slice(9).trim())
            index = endIndex
        } else if (line.startsWith('#ifOption')) {
            let endIndex = lines.slice(index).findIndex((l) => l.startsWith('#endif')) + index
            if (endIndex < index) {
                endIndex = Number.MAX_SAFE_INTEGER
            }
            parseLines(pkg, lines.slice(index + 1, endIndex), line.slice(10).trim())
            index = endIndex
        } else if (line.startsWith('\\begin{')) {
            parseEnv(pkg, line, ifCond)
        } else if (line.startsWith('\\end{')) {
            continue
        } else if (line.startsWith('\\')) {
            parseMacro(pkg, line, ifCond)
        } else {
            console.warn('Unknown line: ' + line)
        }
    }
}

function parseInclude(pkg: PackageRaw, line: string, ifCond?: string): void {
    const dep: DependencyRaw = { name: line.slice(9).trim() }
    if (ifCond) {
        dep.if = ifCond
    }
    pkg.deps.push(dep)
}

function parseKeys(pkg: PackageRaw, lines: string[], tag: string): void {
    const keys: string[] = []
    for (const line of lines) {
        if (isSkipLine(line)) {
            continue
        }
        let snippet = line.trim()
        // cachedir=%<directory%> => cachedir=${1:directory}
        let index = 1
        while (true) {
            const match = /%<([^%]*?)%>/.exec(snippet)
            if (match === null) {
                break
            }
            snippet = snippet.replace(/%<([^%]*?)%>/, `$$\{${index}:${match[1]}\}`)
            index++
        }
        const match = /^([^#]*?)(=)?#([^%#]+)$/.exec(snippet)
        if (match) {
            // cache=#true,false => cache=${1|true,false|}
            snippet = match[1] + (match[2] === '=' ? `=$\{${index}|${match[3]}|\}` : '')
        } else {
            // numbersep=##L => numbersep=
            snippet = snippet.split('#')[0]
        }
        keys.push(snippet)
    }
    pkg.keys[tag] = [...(pkg.keys[tag] ?? []), ...keys]
    assignKeys(pkg, tag)
}

function assignKeys(pkg: PackageRaw, tag: string) {
    for (let context of tag.split(',')) {
        if (context.startsWith('\\documentclass') || context.startsWith('\\usepackage')) {
            pkg.args.push(tag)
            continue
        }
        // \includepdf,includepdfmerge,\includepdfset => \includepdf,\includepdfmerge,\includepdfset
        if (!context.startsWith('\\')) {
            context = '\\' + context
        }
        const isEnv = context.startsWith('\\begin')
        let name = context.startsWith('\\begin') ? context.slice(7, -1) : context.slice(1)
        for (const candidate of isEnv ? pkg.envs : pkg.macros) {
            if (candidate.name === name && candidate.arg) {
                const keyPos = findKeyPos(candidate.arg.snippet)
                if (keyPos > -1) {
                    candidate.arg.keys = candidate.arg.keys ?? []
                    if (!candidate.arg.keys.includes(tag)) {
                        candidate.arg.keys.push(tag)
                    }
                    candidate.arg.keyPos = keyPos
                }
            }
        }
    }
}

function findKeyPos(snippet: string): number {
    const matches = snippet.matchAll(/\{\$\{([^\{\}]*)\}\}|\[\$([^\[\]]*)\]|\<\$([^\<\>]*)\>|\|\$([^\<\>]*)\|/g)
    let index = 0
    for (const match of matches) {
        const context = (match[1] ?? match[2] ?? match[3] ?? match[4]).replace(/[\{\}0-9:]+/g, '')
        if (
            context.startsWith('keys') ||
            context.startsWith('keyvals') ||
            context.startsWith('options') ||
            context.endsWith('%keyvals')
        ) {
            return index
        }
        index++
    }
    return -1
}

function parseEnv(pkg: PackageRaw, line: string, ifCond?: string): void {
    // \begin{minted}[options%keyvals]#S
    // \begin{minted}{language}#MV
    // \begin{minted}[options%keyvals]{language}#M
    const match = /\\begin{(.*?)}([^#]*)(?:#(.*))?$/.exec(line)
    if (match === null) {
        console.error('Unknown env line: ' + line)
        return
    }
    if (match.length === 4 && match[3] && match[3].includes('S')) {
        return
    }
    const env: EnvironmentRaw | undefined = constructMacroEnv({ name: match[1] }, match, ifCond)
    if (env) {
        pkg.envs.push(env)
    }
}

function parseMacro(pkg: PackageRaw, line: string, ifCond?: string): void {
    // Special cases in latex-document
    if ((/\\left[^a-zA-Z]/.test(line) && /\\right/.test(line)) || /\\right[^a-zA-Z]/.test(line)) {
        return
    }
    // Special cases in latex-document
    if (line.toLowerCase().startsWith('\\bigg')) {
        const match = /^\\([Bb]igg)([([|])?.*?(?:#(.*))?$/.exec(line)
        if (match === null) {
            return
        }
        const pairs = { '(': ')', '[': ']', '|': '|' }
        const macro: MacroRaw = { name: match[1] + (match[2] ?? '') }
        if (match[2] === '(' || match[2] === '[' || match[2] === '|') {
            macro.arg = { format: match[2] + pairs[match[2]], snippet: `$\{1\}${match[1]}${pairs[match[2]]}` }
        }
        pkg.macros.push(macro)
        return
    }
    // \mint[keys]{language}{verbatimSymbol}#S
    // \mint{%<language%>}|%<code%>|#M
    // \mint[%<options%>]{%<language%>}|%<code%>|#M
    // \mintinline[keys]{language}{verbatimSymbol}#S
    // \mintinline{%<language%>}|%<code%>|#M
    const match = /\\([^[\{\n]*?)((?:\{|\[|\(|\|)[^#\n]*)?(?:#(.*))?$/.exec(line)
    if (match === null) {
        console.error('Unknown macro line: ' + line)
        return
    }
    if (match.length === 4 && match[3] && match[3].includes('S')) {
        return
    }
    const macro: MacroRaw | undefined = constructMacroEnv({ name: match[1] }, match, ifCond)

    if (macro && !isDefaultMacro(macro.name + (macro.arg?.format ?? ''))) {
        const unimath = getUnimathSymbol(macro.name)
        if (unimath?.detail) {
            macro.detail = unimath.detail
        }
        if (unimath?.documentation) {
            macro.doc = unimath.documentation
        }
        pkg.macros.push(macro)
    }
}

function constructMacroEnv(
    context: MacroRaw | EnvironmentRaw,
    match: RegExpExecArray,
    ifCond?: string
): typeof context | undefined {
    if (ifCond) {
        context.if = ifCond
    }
    if (match.length === 4 && match[3] && match[3].includes('*')) {
        context.unusual = true
    }
    if (match[2]) {
        const arg = match[2]
            .replace(/\{[^\{\}]*\}/g, '{}')
            .replace(/\[[^\[\]]*\]/g, '[]')
            .replace(/(?<![\{\s:\[])(\<)([a-zA-Z\s]*)(\>)/g, '<>')
            .replace(/\|[^\|]*\|/g, '||')
            .replace(/\([^\(\)]*\)/g, '()')
        if (arg !== '') {
            context.arg = { format: arg, snippet: createSnippet(match[2]) }
        }
    }
    if (/[^A-Za-z0-9\{\}\[\]\<\>\|\(\)\*_^:,\s]/.test(context.name + context.arg?.format)) {
        return
    }
    return context
}

function createSnippet(arg: string): string {
    let index = 1
    // {} [] <> ||
    for (const regexp of [
        /(\{)(?![\$0-9])([^\{\}]*)(\})/,
        /(\[)(?!\$)([^\[\]]*)(\])/,
        /(?<![\{\s:\[])(\<)(?!\$)([a-zA-Z\s]*)(\>)/,
        /(\|)(?!\$)([^|]*)(\|)/,
    ]) {
        while (true) {
            const newArg = findArg(arg, regexp, index)
            if (newArg === false) {
                break
            }
            arg = newArg
            index++
        }
    }
    // (x1,x2,x3) => (${1:x1},${2:x2},${3:x3})
    while (true) {
        const match = arg.match(/\(([^()$]+)\)/)
        if (match === null || match[1] === '') {
            break
        }
        arg = arg.replace(
            /\(([^()$]+)\)/,
            '(' +
                match[1]
                    .split(',')
                    .map((val) => `$$\{${index++}:${val}\}`)
                    .join(',') +
                ')'
        )
    }
    // [${1:plain}]%| => [${1:plain}]${2}
    while (true) {
        const tabPos = arg.indexOf('%|')
        if (tabPos === -1) {
            break
        }
        arg = arg.replace('%|', `$$\{${index++}\}`)
    }
    return arg
}

function findArg(arg: string, regexp: RegExp, index: number): string | false {
    const match = arg.match(regexp)
    if (match === null || match[2] === undefined) {
        return false
    }
    return arg.replace(
        regexp,
        `${match[1]}$$\{${index}:${match[2].replaceAll('%<', '').replaceAll('%>', '')}\}${match[3]}`
    )
}

function parsePkg(pkgName: string): PackageRaw {
    const content = fs.readFileSync(`cwl/${pkgName}.cwl`).toString()
    const pkg: PackageRaw = { deps: [], macros: [], envs: [], keys: {}, args: [] }
    parseLines(pkg, content.split('\n'))
    return pkg
}

function parseFiles(files: string[], folder: string) {
    for (const file of files) {
        console.log(file)
        if (!file.endsWith('.cwl')) {
            continue
        }
        const pkgName = file.replace('.cwl', '')
        const pkg = parsePkg(pkgName)
        fs.writeFileSync(`${folder}/${pkgName}.json`, JSON.stringify(pkg, null, 2))
    }
}

function parseExpl3() {
    const content = fs.readFileSync(`expl3.cwl`).toString()
    const pkg: PackageRaw = { deps: [], macros: [], envs: [], keys: {}, args: [] }
    parseLines(pkg, content.split('\n'))
    pkg.macros.push({
        name: 'ExplSyntaxOn',
        arg: { format: '', snippet: '\n\t$0\n\\ExplSyntaxOff' },
        doc: 'Insert an \\ExplSyntax block'
    })
    fs.writeFileSync(`../data/packages/expl3.json`, JSON.stringify(pkg, null, 2))
}

function parseEssential() {
    // const files = fs.readFileSync('cwl.list').toString().split('\n')
    // parseFiles(files, '../data/packages')
    parseExpl3()
}

function parseAll() {
    const files = fs.readdirSync('cwl')
    parseFiles(files, 'packages')
}

switch (process.argv[2]) {
    case 'both':
        parseEssential()
        parseAll()
        break
    case 'all':
        parseAll()
        break
    case 'ess':
    case 'essential':
        parseEssential()
        break
    default:
        if (process.argv[2].endsWith('.cwl')) {
            parseFiles([process.argv[2]], 'packages')
        } else {
            console.warn('ts-node parse-cwl.ts both|all|ess|essential|*.cwl')
        }
        break
}
