// https://texstudio-org.github.io/background.html#description-of-the-cwl-format
import * as fs from 'fs'
import type { DependencyRaw, EnvironmentRaw, MacroRaw, PackageRaw } from '../src/types'

let _defaultMacros: string[] = []
/**
 * Checks if a given macro is a default macro.
 * @param macro - The macro to check.
 * @param defaults - Optional. The list of default macros. If not provided, it
 * will be loaded from '../data/macros.json'.
 * @returns A boolean indicating whether the macro is a default macro.
 */
function isDefaultMacro(macro: string, defaults?: string[]): boolean {
    if (defaults === undefined && _defaultMacros.length === 0) {
        _defaultMacros = (JSON.parse(fs.readFileSync('../data/macros.json').toString()) as MacroRaw[]).map(
            (m) => m.name + (m.arg?.format ?? '')
        )
    }
    defaults = defaults ?? _defaultMacros
    return defaults.includes(macro)
}

let _unimathSymbols: { [key: string]: { command: string, detail: string, documentation: string } } = {}
/**
 * Retrieves the symbol information for a given macro from the unimathSymbols
 * data. If the unimathSymbols data is not provided, it will be loaded from
 * '../data/unimathsymbols.json'.
 * @param macro - The macro for which to retrieve the symbol information.
 * @param defaults - Optional. The default unimathSymbols data to use if not
 * provided.
 * @returns The symbol information for the given macro.
 */
function getUnimathSymbol(macro: string, defaults?: typeof _unimathSymbols) {
    if (defaults === undefined && Object.keys(_unimathSymbols).length === 0) {
        _unimathSymbols = JSON.parse(fs.readFileSync('../data/unimathsymbols.json').toString()) as {
            [key: string]: { command: string, detail: string, documentation: string }
        }
    }
    defaults = defaults ?? _unimathSymbols
    return defaults[macro]
}

/**
 * Checks if a line should be skipped.
 *
 * @param line - The line to check.
 * @returns `true` if the line should be skipped, `false` otherwise.
 */
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

/**
 * Parses an array of lines and performs specific actions based on the content of each line.
 *
 * @param pkg - The package object objbe modifiedo be modified.
 * @param lines - The array of lines to be be padrsed.
 * @param ifCond - An optional condition to be be evaludated.
 */
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
            const tag = line.slice(9).trim()
            parseKeys(pkg, lines.slice(index + 1, endIndex), tag)
            assignKeys(pkg, tag)
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

/**
 * Parses an include statement and adds the dependency to the package.
 *
 * @param pkg - The package to add the dependency to.
 * @param line - The include statement.
 * @param ifCond - Optional condition for the dependency.
 */
function parseInclude(pkg: PackageRaw, line: string, ifCond?: string): void {
    const dep: DependencyRaw = { name: line.slice(9).trim() }
    if (ifCond) {
        dep.if = ifCond
    }
    pkg.deps.push(dep)
}

/**
 * Parses the key-val keys from the given lines.
 *
 * @param pkg - The package object to add the keys to.
 * @param lines - The lines to parse the keys from.
 * @param tag - The tag to add the keys to in the package.
 */
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
            snippet = snippet.replace(/%<([^%]*?)%>/, `$$\{${index}:${match[1]}}`)
            index++
        }
        const match = /^([^#]*?)(=)?#([^%#]+)$/.exec(snippet)
        if (match) {
            // cache=#true,false => cache=${1|true,false|}
            snippet = match[1] + (match[2] === '=' ? `=$\{${index}|${match[3]}|}` : '')
        } else {
            // numbersep=##L => numbersep=
            snippet = snippet.split('#')[0]
        }
        keys.push(snippet)
    }
    pkg.keys[tag] = [...(pkg.keys[tag] ?? []), ...keys]
}

/**
 * Assigns keys to the specified package, macros, and environments with the
 * given tag.
 *
 * @param pkg - The package to assign keys to.
 * @param tag - The tag used to assign keys.
 */
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
        context = context.split('#')[0]
        const isEnv = context.startsWith('\\begin')
        const name = context.startsWith('\\begin') ? context.slice(7, -1) : context.slice(1)
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

/**
 * Finds the position of a key in a given snippet.
 *
 * @param snippet - The snippet to search for the key position.
 * @returns The position of the key in the snippet, or -1 if not found.
 */
function findKeyPos(snippet: string): number {
    const matches = snippet.matchAll(/\{\$\{([^{}]*)\}\}|\[\$([^[\]]*)\]|<\$([^<>]*)>|\|\$([^<>]*)\|/g)
    let index = 0
    for (const match of matches) {
        const context = (match[1] ?? match[2] ?? match[3] ?? match[4]).replace(/[{}0-9:]+/g, '')
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

/**
 * Parses an environment line and constructs an EnvironmentRaw object.
 *
 * @param pkg - The PackageRaw object to add the environment to.
 * @param line - The environment line to parse.
 * @param ifCond - Optional condition for the environment.
 * @returns void
 *
 * @remarks
 * This function takes a line of code representing an environment and parses it
 * to construct an EnvironmentRaw object. The line should be in the format
 * `\begin{environmentName}[options%keyvals]{language}#M`. If the line does not
 * match this format, an error will be logged and the function will return. If
 * the line includes the option `S`, the function will return without adding the
 * environment to the package. Otherwise, the function will construct an
 * EnvironmentRaw object using the `constructMacroEnv` function and add it to
 * the `envs` array of the provided `pkg` object.
 */
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

/**
 * Parses a macro in a LaTeX document.
 *
 * @param pkg - The package object to store the parsed macro.
 * @param line - The line of code containing the macro.
 * @param ifCond - Optional condition for the macro.
 * @returns void
 *
 * @remarks
 * This function is responsible for parsing a macro in a LaTeX document. It
 * takes the package object, the line of code containing the macro, and an
 * optional condition for the macro. The parsed macro is then stored in the
 * package object.
 *
 * The function handles special cases in the LaTeX document, such as macros
 * starting with "\\left" and containing "\\right", or macros starting with
 * "\\bigg". It also handles macros of the form
 * "\\mint[keys]{language}{verbatimSymbol}#S" and
 * "\\mintinline[keys]{language}{verbatimSymbol}#S".
 *
 * If the parsed macro is not a default macro, it checks if there is a
 * corresponding Unicode math symbol for the macro. If a Unicode math symbol is
 * found, the macro's detail and documentation are updated accordingly.
 */
function parseMacro(pkg: PackageRaw, line: string, ifCond?: string): void {
    // Special cases in latex-document
    if ((/\\left[^a-zA-Z]/.test(line) && line.includes('\\right')) || /\\right[^a-zA-Z]/.test(line)) {
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
            macro.arg = { format: match[2] + pairs[match[2]], snippet: `$\{1}${match[1]}${pairs[match[2]]}` }
        }
        pkg.macros.push(macro)
        return
    }
    // \mint[keys]{language}{verbatimSymbol}#S
    // \mint{%<language%>}|%<code%>|#M
    // \mint[%<options%>]{%<language%>}|%<code%>|#M
    // \mintinline[keys]{language}{verbatimSymbol}#S
    // \mintinline{%<language%>}|%<code%>|#M
    const match = /\\([^[{\n]*?)((?:\{|\[|\(|\|)[^#\n]*)?(?:#(.*))?$/.exec(line)
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

/**
 * Constructs a macro environment based on the provided context, match, and
 * ifCond parameters.
 *
 * @param context - The context object representing a MacroRaw or
 * EnvironmentRaw.
 * @param match - The RegExpExecArray containing the matched values.
 * @param ifCond - Optional. The if condition for the context.
 * @returns The constructed macro environment or undefined if the name or
 * argument format contains invalid characters.
 */
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
            .replace(/\{[^{}]*\}/g, '{}')
            .replace(/\[[^[\]]*\]/g, '[]')
            .replace(/(?<![{\s:[])(<)([a-zA-Z\s]*)(>)/g, '<>')
            .replace(/\|[^|]*\|/g, '||')
            .replace(/\([^()]*\)/g, '()')
        if (arg !== '') {
            context.arg = { format: arg, snippet: createSnippet(match[2]) }
        }
    }
    if (/[^A-Za-z0-9{}[\]<>|()*_^:,\s]/.test(context.name + context.arg?.format)) {
        return
    }
    return context
}

/**
 * Creates a snippet based on the given argument.
 *
 * @param arg - The argument to create the snippet from.
 * @returns The generated snippet.
 */
function createSnippet(arg: string): string {
    let index = 1
    // {} [] <> ||
    for (const regexp of [
        /(\{)(?![$0-9])([^{}]*)(\})/,
        /(\[)(?!\$)([^[\]]*)(\])/,
        /(?<![{\s:[])(<)(?!\$)([a-zA-Z\s]*)(>)/,
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
                    .map((val) => `$$\{${index++}:${val}}`)
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
        arg = arg.replace('%|', `$$\{${index++}}`)
    }
    return arg
}

/**
 * Finds and replaces a specific argument in a string using a regular
 * expression.
 *
 * @param arg - The string containing the argument to be replaced.
 * @param regexp - The regular expression used to match the argument.
 * @param index - The index used in the replacement string.
 * @returns The modified string with the argument replaced, or `false` if the
 * argument was not found.
 *
 * @remarks
 * This function searches for a specific argument in the given string using the
 * provided regular expression. If the argument is found, it replaces it with a
 * modified version based on the provided index. The modified string is then
 * returned. If the argument is not found, the function returns `false`.
 */
function findArg(arg: string, regexp: RegExp, index: number): string | false {
    const match = arg.match(regexp)
    if (match === null || match[2] === undefined) {
        return false
    }
    return arg.replace(
        regexp,
        `${match[1]}$$\{${index}:${match[2].replaceAll('%<', '').replaceAll('%>', '')}}${match[3]}`
    )
}

/**
 * Parses a package with the given package name.
 *
 * @param pkgName - The name of the package to parse.
 * @returns The parsed package object.
 */
function parsePkg(pkgName: string): PackageRaw {
    const content = fs.readFileSync(`cwl/${pkgName}.cwl`).toString()
    const pkg: PackageRaw = { deps: [], macros: [], envs: [], keys: {}, args: [] }
    parseLines(pkg, content.split('\n'))
    return pkg
}

/**
 * Parses an array of file paths and converts CWL files to JSON format.
 *
 * @param files - An array of file paths to be parsed.
 * @param folder - The folder where the JSON files will be saved.
 */
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

/**
 * Parses the expl3.cwl file and generates a JSON representation of the package.
 *
 * @remarks
 * This function reads the content of the 'expl3.cwl' file, parses it line by
 * line, and generates a JSON object representing the package. The generated
 * package object includes dependencies, macros, environments, keys, and
 * arguments. Additionally, it adds a macro named 'ExplSyntaxOn' to the
 * package's macros array.
 *
 * @returns void
 */
function parseExpl3() {
    const content = fs.readFileSync('expl3.cwl').toString()
    const pkg: PackageRaw = { deps: [], macros: [], envs: [], keys: {}, args: [] }
    parseLines(pkg, content.split('\n'))
    pkg.macros.push({
        name: 'ExplSyntaxOn',
        arg: { format: '', snippet: '\n\t$0\n\\ExplSyntaxOff' },
        doc: 'Insert an \\ExplSyntax block',
    })
    fs.writeFileSync('../data/packages/expl3.json', JSON.stringify(pkg, null, 2))
}

/**
 * Parses the essential package files.
 */
function parseEssential() {
    const files = fs.readFileSync('cwl.list').toString().split('\n')
    parseFiles(files, '../data/packages')
    parseExpl3()
}

/**
 * Parses all package files.
 */
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
