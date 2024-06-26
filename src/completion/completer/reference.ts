import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import type * as Ast from '@unified-latex/unified-latex-types'
import { lw } from '../../lw'
import type { CompletionArgs, CompletionProvider, FileCache, ReferenceItem, TeXMathEnv } from '../../types'
import { getLongestBalancedString, stripEnvironments } from '../../utils/utils'
import { computeFilteringRange } from './completerutils'
import { argContentToStr } from '../../utils/parser'

export const provider: CompletionProvider = { from }
export const reference = {
    parse,
    getItem,
    setNumbersFromAuxFile
}

const data = {
    suggestions: new Map<string, ReferenceItem>(),
    prevIndexObj: new Map<string, {refNumber: string, pageNumber: string}>()
}

function from(_result: RegExpMatchArray, args: CompletionArgs) {
    return provide(args.line, args.position)
}

function provide(line: string, position: vscode.Position): vscode.CompletionItem[] {
    // Compile the suggestion object to array
    updateAll(line, position)
    let keys = [...data.suggestions.keys(), ...data.prevIndexObj.keys()]
    keys = Array.from(new Set(keys))
    const items: vscode.CompletionItem[] = []
    for (const key of keys) {
        items.push(data.suggestions.get(key) ?? {label: key})
    }
    return items
}

function getItem(token: string): ReferenceItem | undefined {
    updateAll()
    return data.suggestions.get(token)
}

function updateAll(line?: string, position?: vscode.Position) {
    if (!lw.root.file.path) {
        data.suggestions.clear()
        return
    }

    const included: Set<string> = new Set([lw.root.file.path])
    // Included files may originate from \input or `xr`. If the latter, a
    // prefix may be used to ref to the file. The following obj holds them.
    const prefixes: {[filePath: string]: string} = {}
    while (true) {
        // The process adds newly included file recursively, only stops when
        // all have been found, i.e., no new ones
        const startSize = included.size
        included.forEach(cachedFile => {
            lw.cache.getIncludedTeX(cachedFile).forEach(includedTeX => {
                if (includedTeX === cachedFile) {
                    return
                }
                included.add(includedTeX)
                // If the file is indeed included by \input, but was
                // previously included by `xr`, the possible prefix is
                // removed as it can be directly referenced without.
                delete prefixes[includedTeX]
            })
            const cache = lw.cache.get(cachedFile)
            if (!cache) {
                return
            }
            Object.keys(cache.external).forEach(external => {
                // Don't repeatedly add, no matter previously by \input or
                // `xr`
                if (included.has(external)) {
                    return
                }
                // If the file is included by `xr`, both file path and
                // prefix is recorded.
                included.add(external)
                prefixes[external] = cache.external[external]
            })
        })
        if (included.size === startSize) {
            break
        }
    }

    // Extract cached references
    const refList: string[] = []
    let range: vscode.Range | undefined = undefined
    if (line && position) {
        range = computeFilteringRange(line, position)
    }

    included.forEach(cachedFile => {
        const cachedRefs = lw.cache.get(cachedFile)?.elements.reference
        if (cachedRefs === undefined) {
            return
        }
        cachedRefs.forEach(ref => {
            if (ref.range === undefined) {
                return
            }
            const label = (cachedFile in prefixes ? prefixes[cachedFile] : '') + ref.label
            data.suggestions.set(label, {...ref,
                label,
                range,
                prevIndex: data.prevIndexObj.get(label)
            })
            refList.push(label)
        })
    })
    // Remove references that have been deleted
    data.suggestions.forEach((_, key) => {
        if (!refList.includes(key)) {
            data.suggestions.delete(key)
        }
    })
}

function parse(cache: FileCache) {
    if (cache.ast !== undefined) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const labelMacros = configuration.get('intellisense.label.command') as string[]
        cache.elements.reference = parseAst(cache.ast, [], cache.filePath, cache.content.split('\n'), labelMacros)
    } else {
        cache.elements.reference = parseContent(cache.content, cache.filePath)
    }
}

function parseAst(node: Ast.Node, nodeStack: Ast.Node[], filePath: string, lines: string[], labelMacros: string[]): ReferenceItem[] {
    let refs: ReferenceItem[] = []
    if (node.type === 'macro' &&
        ['renewcommand', 'newcommand', 'providecommand', 'DeclareMathOperator', 'renewenvironment', 'newenvironment',
         'NewDocumentCommand', 'RenewDocumentCommand', 'ProvideDocumentCommand', 'DeclareDocumentCommand',
         'NewDocumentEnvironment', 'RenewDocumentEnvironment', 'ProvideDocumentEnvironment', 'DeclareDocumentEnvironment',
         'NewExpandableDocumentCommand', 'RenewExpandableDocumentCommand', 'ProvideExpandableDocumentCommand', 'DeclareExpandableDocumentCommand',
         'newrobustcmd', 'renewrobustcmd', 'providerobustcmd'
        ].includes(node.content)) {
        // Do not scan labels inside \newcommand, \newenvironment & co
        return []
    }
    if (node.type === 'environment' && ['tikzpicture'].includes(node.env)) {
        return []
    }

    let label = ''
    if (node.type === 'macro' && labelMacros.includes(node.content)) {
        label = argContentToStr(node.args?.[2]?.content || [])
    } else if (node.type === 'environment') {
        label = argContentToStr(node.args?.[1]?.content || [])
        const index = label.indexOf('label=')
        if (index >= 0) {
            label = label.slice(index + 6)
            if (label.charAt(0) === '{') {
                label = getLongestBalancedString(label) ?? ''
            } else {
                label = label.split(',')[0] ?? ''
            }
        } else {
            label = ''
        }
    }

    if (label !== '' && node.position !== undefined) {
        const ref: ReferenceItem = {
            label,
            kind: vscode.CompletionItemKind.Reference,
            // One row before, four rows after
            documentation: lines.slice(node.position.start.line - 2, node.position.end.line + 4).join('\n'),
            // Here we abuse the definition of range to store the location of the reference definition
            range: new vscode.Range(node.position.start.line - 1, node.position.start.column - 1,
                                    node.position.end.line - 1, node.position.end.column - 1),
            file: filePath,
            position: new vscode.Position(node.position.start.line - 1, node.position.start.column - 1),
            math: findMath(nodeStack)
        }
        refs.push(ref)
    }

    const parseContentNodes = (content: Ast.Node[]) => {
        for (const subNode of content) {
            refs = [...refs, ...parseAst(subNode, [...nodeStack, node], filePath, lines, labelMacros)]
        }
    }
    if (node.type === 'macro' && node.args) {
        for (const arg of node.args) {
            parseContentNodes(arg.content)
        }
    } else if ('content' in node && typeof node.content !== 'string') {
        parseContentNodes(node.content)
    }

    return refs
}

function findMath(nodeStack: Ast.Node[]): TeXMathEnv | undefined {
    const node = nodeStack[nodeStack.length - 1]
    if (node.type !== 'environment' && node.type !== 'mathenv') {
        return
    }
    const env = (typeof node.env === 'string') ? node.env : (node.env as unknown as {content: string}).content
    if (![
        'align', 'align\\*', 'alignat', 'alignat\\*', 'aligned', 'alignedat', 'array', 'Bmatrix', 'bmatrix', 'cases', 'CD', 'eqnarray', 'eqnarray\\*', 'equation', 'equation\\*', 'flalign', 'flalign\\*', 'gather', 'gather\\*', 'gathered', 'matrix', 'multline', 'multline\\*', 'pmatrix', 'smallmatrix', 'split', 'subarray', 'Vmatrix', 'vmatrix'
    ].includes(env)) {
        return
    }
    const math = lw.parser.parse.stringify(node)
    return {
        envname: env,
        range: new vscode.Range((node.position?.start.line ?? 1) - 1, (node.position?.start.column ?? 1) - 1,
                                (node.position?.end.line ?? 1) - 1, (node.position?.end.column ?? 1) - 1),
        texString: math
    }
}

function parseContent(content: string, filePath: string): ReferenceItem[] {
    const refReg = /(?:\\label(?:\[[^[\]{}]*\])?|(?:^|[,\s])label=){([^#\\}]*)}/gm
    const refs: ReferenceItem[] = []
    const refList: string[] = []
    content = stripEnvironments(content, [''])
    while (true) {
        const result = refReg.exec(content)
        if (result === null) {
            break
        }
        if (refList.includes(result[1])) {
            continue
        }
        const prevContent = content.substring(0, content.substring(0, result.index).lastIndexOf('\n') - 1)
        const followLength = content.substring(result.index, content.length).split('\n', 4).join('\n').length
        const positionContent = content.substring(0, result.index).split('\n')

        refs.push({
            label: result[1],
            kind: vscode.CompletionItemKind.Reference,
            // One row before, four rows after
            documentation: content.substring(prevContent.lastIndexOf('\n') + 1, result.index + followLength),
            // Here we abuse the definition of range to store the location of the reference definition
            range: new vscode.Range(positionContent.length - 1, positionContent[positionContent.length - 1].length,
                                    positionContent.length - 1, positionContent[positionContent.length - 1].length),
            file: filePath,
            position: new vscode.Position(positionContent.length - 1, positionContent[positionContent.length - 1].length)
        })
        refList.push(result[1])
    }
    return refs
}

function setNumbersFromAuxFile(rootFile: string) {
    const outDir = lw.file.getOutDir(rootFile)
    const rootDir = path.dirname(rootFile)
    const auxFile = path.resolve(rootDir, path.join(outDir, path.basename(rootFile, '.tex') + '.aux'))
    data.suggestions.forEach((entry) => {
        entry.prevIndex = undefined
    })
    data.prevIndexObj = new Map<string, {refNumber: string, pageNumber: string}>()
    if (!fs.existsSync(auxFile)) {
        return
    }
    const newLabelReg = /^\\newlabel\{(.*?)\}\{\{(.*?)\}\{(.*?)\}/gm
    const auxContent = fs.readFileSync(auxFile, {encoding: 'utf8'})
    while (true) {
        const result = newLabelReg.exec(auxContent)
        if (result === null) {
            break
        }
        if ( result[1].endsWith('@cref') && data.prevIndexObj.has(result[1].replace('@cref', '')) ) {
            // Drop extra \newlabel entries added by cleveref
            continue
        }
        data.prevIndexObj.set(result[1], {refNumber: result[2], pageNumber: result[3]})
        const ent = data.suggestions.get(result[1])
        if (ent) {
            ent.prevIndex = {refNumber: result[2], pageNumber: result[3]}
        }
    }
}
