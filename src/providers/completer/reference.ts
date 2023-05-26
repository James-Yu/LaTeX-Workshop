import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import type * as Ast from '@unified-latex/unified-latex-types'
import * as lw from '../../lw'
import { stripEnvironments } from '../../utils/utils'
import { computeFilteringRange } from './completerutils'
import type { IProvider, ICompletionItem, IProviderArgs } from '../completion'
import { argContentToStr } from '../../utils/parser'

export interface ReferenceEntry extends ICompletionItem {
    /** The file that defines the ref. */
    file: string,
    /** The position that defines the ref. */
    position: vscode.Position,
    /**  Stores the ref number. */
    prevIndex?: {refNumber: string, pageNumber: string}
}

export type ReferenceDocType = {
    documentation: ReferenceEntry['documentation'],
    file: ReferenceEntry['file'],
    position: {line: number, character: number},
    key: string,
    label: ReferenceEntry['label'],
    prevIndex: ReferenceEntry['prevIndex']
}

export class Reference implements IProvider {
    // Here we use an object instead of an array for de-duplication
    private readonly suggestions = new Map<string, ReferenceEntry>()
    private prevIndexObj = new Map<string, {refNumber: string, pageNumber: string}>()

    provideFrom(_result: RegExpMatchArray, args: IProviderArgs) {
        return this.provide(args.line, args.position)
    }

    private provide(line: string, position: vscode.Position): vscode.CompletionItem[] {
        // Compile the suggestion object to array
        this.updateAll(line, position)
        let keys = [...this.suggestions.keys(), ...this.prevIndexObj.keys()]
        keys = Array.from(new Set(keys))
        const items: vscode.CompletionItem[] = []
        for (const key of keys) {
            const sug = this.suggestions.get(key)
            if (sug) {
                const data: ReferenceDocType = {
                    documentation: sug.documentation,
                    file: sug.file,
                    position: {
                        line: sug.position.line,
                        character: sug.position.character
                    },
                    key,
                    label: sug.label,
                    prevIndex: sug.prevIndex
                }
                sug.documentation = JSON.stringify(data)
                items.push(sug)
            } else {
                items.push({label: key})
            }
        }
        return items
    }

    getRef(token: string): ReferenceEntry | undefined {
        this.updateAll()
        return this.suggestions.get(token)
    }

    private updateAll(line?: string, position?: vscode.Position) {
        if (!lw.manager.rootFile) {
            this.suggestions.clear()
            return
        }

        const included: Set<string> = new Set([lw.manager.rootFile])
        // Included files may originate from \input or `xr`. If the latter, a
        // prefix may be used to ref to the file. The following obj holds them.
        const prefixes: {[filePath: string]: string} = {}
        while (true) {
            // The process adds newly included file recursively, only stops when
            // all have been found, i.e., no new ones
            const startSize = included.size
            included.forEach(cachedFile => {
                lw.cacher.getIncludedTeX(cachedFile).forEach(includedTeX => {
                    if (includedTeX === cachedFile) {
                        return
                    }
                    included.add(includedTeX)
                    // If the file is indeed included by \input, but was
                    // previously included by `xr`, the possible prefix is
                    // removed as it can be directly referenced without.
                    delete prefixes[includedTeX]
                })
                const cache = lw.cacher.get(cachedFile)
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
            const cachedRefs = lw.cacher.get(cachedFile)?.elements.reference
            if (cachedRefs === undefined) {
                return
            }
            cachedRefs.forEach(ref => {
                if (ref.range === undefined) {
                    return
                }
                const label = (cachedFile in prefixes ? prefixes[cachedFile] : '') + ref.label
                this.suggestions.set(label, {...ref,
                    label,
                    file: cachedFile,
                    position: 'inserting' in ref.range ? ref.range.inserting.start : ref.range.start,
                    range,
                    prevIndex: this.prevIndexObj.get(label)
                })
                refList.push(label)
            })
        })
        // Remove references that have been deleted
        this.suggestions.forEach((_, key) => {
            if (!refList.includes(key)) {
                this.suggestions.delete(key)
            }
        })
    }

    update(content: string, ast?: Ast.Root): ICompletionItem[] | undefined {
        const lines = content.split('\n')
        if (ast !== undefined) {
            return this.parseAst(ast, lines)
        } else {
            return this.parseContent(content)
        }
    }

    private parseAst(node: Ast.Node, lines: string[]): ICompletionItem[] {
        let refs: ICompletionItem[] = []
        if (node.type === 'macro' &&
            ['renewcommand', 'newcommand', 'providecommand', 'DeclareMathOperator', 'renewenvironment', 'newenvironment'].includes(node.content)) {
            // Do not scan labels inside \newcommand, \newenvironment & co
            return []
        }
        if (node.type === 'environment' && ['tikzpicture'].includes(node.env)) {
            return []
        }

        let label = ''
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const labelMacros = configuration.get('intellisense.label.command') as string[]
        if (node.type === 'macro' && labelMacros.includes(node.content)) {
            label = argContentToStr(node.args?.[1]?.content || [])
        } else if (node.type === 'environment' && ['frame'].includes(node.env)) {
            label = argContentToStr(node.args?.[1]?.content || []).split(',').map(arg => arg.trim()).find(arg => arg.startsWith('label='))?.slice(6) ?? ''
            if (label.charAt(0) === '{' && label.charAt(label.length - 1) === '}') {
                label = label.slice(1, label.length - 1)
            }
        }

        if (label !== '' && node.position !== undefined) {
            refs.push({
                label,
                kind: vscode.CompletionItemKind.Reference,
                // One row before, four rows after
                documentation: lines.slice(node.position.start.line - 2, node.position.end.line + 4).join('\n'),
                // Here we abuse the definition of range to store the location of the reference definition
                range: new vscode.Range(node.position.start.line - 1, node.position.start.column - 1,
                                        node.position.end.line - 1, node.position.end.column - 1)
            })
        }

        if ('content' in node && typeof node.content !== 'string') {
            for (const subNode of node.content) {
                refs = [...refs, ...this.parseAst(subNode, lines)]
            }
        }

        return refs
    }

    private parseContent(content: string): ICompletionItem[] {
        const refReg = /(?:\\label(?:\[[^[\]{}]*\])?|(?:^|[,\s])label=){([^#\\}]*)}/gm
        const refs: ICompletionItem[] = []
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
                                        positionContent.length - 1, positionContent[positionContent.length - 1].length)
            })
            refList.push(result[1])
        }
        return refs
    }

    setNumbersFromAuxFile(rootFile: string) {
        const outDir = lw.manager.getOutDir(rootFile)
        const rootDir = path.dirname(rootFile)
        const auxFile = path.resolve(rootDir, path.join(outDir, path.basename(rootFile, '.tex') + '.aux'))
        this.suggestions.forEach((entry) => {
            entry.prevIndex = undefined
        })
        this.prevIndexObj = new Map<string, {refNumber: string, pageNumber: string}>()
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
            if ( result[1].endsWith('@cref') && this.prevIndexObj.has(result[1].replace('@cref', '')) ) {
                // Drop extra \newlabel entries added by cleveref
                continue
            }
            this.prevIndexObj.set(result[1], {refNumber: result[2], pageNumber: result[3]})
            const ent = this.suggestions.get(result[1])
            if (ent) {
                ent.prevIndex = {refNumber: result[2], pageNumber: result[3]}
            }
        }
    }

}
