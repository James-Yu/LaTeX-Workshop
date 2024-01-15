import * as vscode from 'vscode'
import type * as Ast from '@unified-latex/unified-latex-types'
import { lw } from '../../lw'
import type { CompletionArgs, CompletionItem, CompletionProvider, FileCache } from '../../types'

import { argContentToStr } from '../../utils/parser'

export const provider: CompletionProvider = { from }
export const subsuperscript = {
    parse,
}

function from(result: RegExpMatchArray, _: CompletionArgs): CompletionItem[] {
    if (false === vscode.workspace.getConfiguration('latex-workshop').get('intellisense.subsuperscript.enabled') as boolean) {
        return []
    }
    const isSub = result[0].startsWith('_')
    let suggestions: CompletionItem[] = []
    lw.cache.getIncludedTeX().forEach(cachedFile => {
        suggestions = [...suggestions, ...((isSub ? lw.cache.get(cachedFile)?.elements.subscripts : lw.cache.get(cachedFile)?.elements.superscripts) ?? [])]
    })
    return suggestions
}


function parse(cache: FileCache) {
    if (cache.ast !== undefined) {
        const scripts = parseAst(cache.ast, cache.content.split('\n'), {sub: [], super: []})
        cache.elements.subscripts = scripts.sub
        cache.elements.superscripts = scripts.super
    }
}

function parseAst(node: Ast.Node, lines: string[], scripts: {sub: CompletionItem[], super: CompletionItem[]}): {sub: CompletionItem[], super: CompletionItem[]} {
    const entries = {sub: scripts.sub.map(entry => entry.label), super: scripts.super.map(entry => entry.label)}
    if (node.type === 'macro' && ['^', '_'].includes(node.content)) {
        const content = argContentToStr(node.args?.[0]?.content || [])

        if (content !== '' && node.position !== undefined &&
            !(node.content === '^' ? entries.super : entries.sub).includes(content)) {

            (node.content === '^' ? entries.super : entries.sub).push(content)

            ;(node.content === '^' ? scripts.super : scripts.sub).push({
                label: content,
                kind: vscode.CompletionItemKind.Constant,
                // One row before, four rows after
                documentation: lines.slice(node.position.start.line - 2, node.position.end.line + 4).join('\n')
            })
        }
    }

    if ('content' in node && typeof node.content !== 'string') {
        for (const subNode of node.content) {
            parseAst(subNode, lines, scripts)
        }
    }

    return scripts
}
