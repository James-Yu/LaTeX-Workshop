// https://texstudio-org.github.io/background.html#description-of-the-cwl-format

type PackageRaw = {
    deps: DependencyRaw[]
    macros: MacroRaw[]
    envs: EnvironmentRaw[]
    keys: { [key: string]: string[] }
    args: string[]
}

type DependencyRaw = {
    name: string
    if?: string
}

type EnvironmentRaw = {
    name: string
    arg?: { format: string; snippet: string; keys?: string[]; keyPos?: number }
    if?: string
    unusual?: boolean
}

type MacroRaw = {
    name: string
    arg?: { format: string; snippet: string; keys?: string[]; keyPos?: number }
    if?: string
    unusual?: boolean
}

function isSkipLine(line: string): boolean {
    if (line.trim() === '') {
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
        const line = lines[index]
        if (isSkipLine(line)) {
            continue
        }
        if (line.startsWith('#include')) {
            parseInclude(pkg, line, ifCond)
        } else if (line.startsWith('#keyvals')) {
            const endIndex = lines.slice(index).findIndex((l) => l.startsWith('#endkeyvals')) + index
            parseKeys(pkg, lines.slice(index + 1, endIndex), line.slice(9).trim())
            index = endIndex
        } else if (line.startsWith('#ifOption')) {
            const endIndex = lines.slice(index).findIndex((l) => l.startsWith('#endif')) + index
            parseLines(pkg, lines.slice(index + 1, endIndex), line.slice(10).trim())
            index = endIndex
        } else if (line.startsWith('\\begin{')) {
            parseEnv(pkg, line, ifCond)
        } else if (line.startsWith('\\end{')) {
            continue
        } else if (line.startsWith('\\')) {
            parseMacro(pkg, line, ifCond)
        } else {
            throw new Error('Unknown line: ' + line)
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
        let snippet = line
        // cachedir=%<directory%> => cachedir=${1:directory}
        let index = 1
        while (true) {
            const match = /%<([^%]*?)%>/.exec(snippet)
            console.log(snippet)
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
    pkg.keys[tag] = keys
    assignKeys(pkg, tag)
}

function assignKeys(pkg: PackageRaw, tag: string) {
    for (const context of tag.split(',')) {
        if (context.startsWith('\\documentclass') || context.startsWith('\\usepackage')) {
            pkg.args.push(tag)
        } else if (context.startsWith('\\')) {
            const isEnv = context.startsWith('\\begin')
            let name = context.startsWith('\\begin') ? context.slice(7, -1) : context.slice(1)
            for (const candidate of isEnv ? pkg.envs : pkg.macros) {
                if (candidate.name === name && candidate.arg) {
                    const keyPos = findKeyPos(candidate.arg.snippet)
                    if (keyPos > -1) {
                        candidate.arg.keys = candidate.arg.keys ?? []
                        candidate.arg.keys.push(tag)
                        candidate.arg.keyPos = keyPos
                    }
                }
            }
        } else {
            throw new Error('Unknown keyval context: ' + context)
        }
    }
}

function findKeyPos(snippet: string): number {
    const matches = snippet.matchAll(/\{\$\{([^\{\}]*)\}\}|\[\$([^\[\]]*)\]|\<\$([^\<\>]*)\>|\|\$([^\<\>]*)\|/g)
    let index = 0
    for (const match of matches) {
        const context = match[1] ?? match[2] ?? match[3] ?? match[4]
        if (context.startsWith('keys') ||
            context.startsWith('keyvals') ||
            context.startsWith('options') ||
            context.endsWith('%keyvals')) {
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
        throw new Error('Unknown env line: ' + line)
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
    // \mint[keys]{language}{verbatimSymbol}#S
    // \mint{%<language%>}|%<code%>|#M
    // \mint[%<options%>]{%<language%>}|%<code%>|#M
    // \mintinline[keys]{language}{verbatimSymbol}#S
    // \mintinline{%<language%>}|%<code%>|#M
    const match = /\\([^[\{\n]*?)((?:\{|\[)[^#\n]*)?(?:#(.*))?$/.exec(line)
    if (match === null) {
        throw new Error('Unknown macro line: ' + line)
    }
    if (match.length === 4 && match[3] && match[3].includes('S')) {
        return
    }
    const macro: MacroRaw | undefined = constructMacroEnv({ name: match[1] }, match, ifCond)
    // TODO: Check against default macros

    if (macro) {
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
    if (arg.includes('%|') || arg.includes('..')) {
        throw new Error('%< not handled yet: ' + arg)
    }
    let index = 1
    // {} [] <> ||
    for (const regexp of [
        /(\{)(?![\$0-9])([^\{\}]*)(\})/,
        /(\[)(?!\$)([^\[\]]*)(\])/,
        /(?<![\{\s:\[])(\<)(?!\$)([a-zA-Z\s]*)(\>)/,
        /(\|)(?!\$)([^|]*)(\|)/,
        /()(?<=\(|,)(?!\$)([^,()]+)(?=,|\))()/,
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

import * as fs from 'fs'

const content = fs.readFileSync('cwl/minted.cwl').toString()
const pkg = { deps: [], macros: [], envs: [], keys: {}, args: [] }
parseLines(pkg, content.split('\n'))
console.log(JSON.stringify(pkg, null, 2))
