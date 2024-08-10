import * as vscode from 'vscode'
import { lw } from '../lw'
import type { CompletionArgs, CompletionProvider, ReferenceItem } from '../types'
import { citation, provider as citationProvider } from './completer/citation'
import { provider as environmentProvider } from './completer/environment'
import { provider as macroProvider } from './completer/macro'
import { provider as subsuperProvider } from './completer/subsuperscript'
import { provider as argumentProvider } from './completer/argument'
import { provider as classProvider } from './completer/class'
import { provider as referenceProvider } from './completer/reference'
import { provider as packageProvider } from './completer/package'
import { inputProvider, importProvider, subimportProvider } from './completer/input'
import { provider as glossaryProvider } from './completer/glossary'
import { provider as closeenvProvider } from './completer/closeenv'
import { atSuggestion, provider as atProvider } from './completer/atsuggestion'

import { escapeRegExp } from '../utils/utils'

const logger = lw.log('Intelli')

export class Provider implements vscode.CompletionItemProvider {
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] | undefined {
        const currentLine = document.lineAt(position.line).text
        if (position.character > 1 && currentLine[position.character - 1] === '\\' && currentLine[position.character - 2] === '\\') {
            return
        }
        return this.provide({
            uri: document.uri,
            langId: document.languageId,
            line: document.lineAt(position).text,
            position
        })
    }

    provide(args: CompletionArgs): vscode.CompletionItem[] {
        // Note that the order of the following array affects the result.
        // 'macro' must be at the last because it matches any macros.
        for (const type of ['citation', 'reference', 'environment', 'package', 'documentclass', 'input', 'subimport', 'import', 'includeonly', 'glossary', 'argument', 'macro', 'subsuper', 'closeenv']) {
            const suggestions = this.completion(type, args)
            if (suggestions.length > 0) {
                if (type === 'citation') {
                    const configuration = vscode.workspace.getConfiguration('latex-workshop')
                    if (configuration.get('intellisense.citation.type') as string === 'browser') {
                        setTimeout(() => citation.browser(args), 10)
                        return []
                    }
                }
                return suggestions
            }
        }
        return []
    }

    async resolveCompletionItem(item: vscode.CompletionItem, ctoken: vscode.CancellationToken): Promise<vscode.CompletionItem> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (item.kind === vscode.CompletionItemKind.Reference) {
            if (!('file' in item) || !configuration.get('hover.ref.enabled')) {
                return item
            }
            const refItem = item as ReferenceItem
            if (!refItem.math) {
                return item
            }
            const svgDataUrl = await lw.preview.mathjax.ref2svg(refItem, ctoken)
            item.documentation = new vscode.MarkdownString(`![equation](${svgDataUrl})`)
            return item
        } else if (item.kind === vscode.CompletionItemKind.File) {
            const preview = configuration.get('intellisense.includegraphics.preview.enabled') as boolean
            if (!preview) {
                return item
            }
            const filePath = item.documentation
            if (typeof filePath !== 'string') {
                return item
            }
            const md = await lw.preview.graph2md(filePath, { height: 190, width: 300 })
            if (md === undefined) {
                return item
            }
            const ret = new vscode.CompletionItem(item.label, vscode.CompletionItemKind.File)
            ret.documentation = md
            return ret
        } else {
            return item
        }
    }

    completion(type: string, args: CompletionArgs): vscode.CompletionItem[] {
        let reg: RegExp | undefined
        let provider: CompletionProvider | undefined
        switch (type) {
            case 'citation':
                reg = /(?:\\[a-zA-Z]*[Cc]ite[a-zA-Z]*\*?(?:\([^[)]*\)){0,2}(?:<[^<>]*>|\[[^[\]]*\]|{[^{}]*})*{([^}]*)$)|(?:\\bibentry{([^}]*)$)/
                provider = citationProvider
                break
            case 'reference':
                reg = /(?:\\hyperref\[([^\]]*)(?!\])$)|(?:(?:\\(?!hyper)[a-zA-Z]*ref[a-zA-Z]*\*?(?:\[[^[\]]*\])?){([^}]*)$)|(?:\\[Cc][a-z]*refrange\*?{[^{}]*}{([^}]*)$)/
                provider = referenceProvider
                break
            case 'environment':
                reg = /(?:\\begin|\\end){([^}]*)$/
                provider = environmentProvider
                break
            case 'macro':
                reg = args.langId === 'latex-expl3' ? /\\([a-zA-Z_@]*(?::[a-zA-Z]*)?)$/ : /\\(\+?[a-zA-Z]*|(?:left|[Bb]ig{1,2}l)?[({[]?)$/
                provider = macroProvider
                break
            case 'argument':
                reg = args.langId === 'latex-expl3' ? /\\([a-zA-Z_@]*(?::[a-zA-Z]*)?)((?:\[.*?\]|{.*?})*)[[{][^[\]{}]*$/ : /\\(\+?[a-zA-Z]*)((?:\[.*?\]|{.*?})*)[[{][^[\]{}]*$/
                provider = argumentProvider
                break
            case 'package':
                reg = /(?:\\usepackage(?:\[[^[\]]*\])*){([^}]*)$/
                provider = packageProvider
                break
            case 'documentclass':
                reg = /(?:\\documentclass(?:\[[^[\]]*\])*){([^}]*)$/
                provider = classProvider
                break
            case 'input':
                reg = /\\(input|include|subfile|subfileinclude|includegraphics|includesvg|lstinputlisting|verbatiminput|loadglsentries|markdownInput)\*?(?:\[[^[\]]*\])*{([^}]*)$/
                provider = inputProvider
                break
            case 'includeonly':
                reg = /\\(includeonly|excludeonly){(?:{[^}]*},)*(?:[^,]*,)*{?([^},]*)$/
                provider = inputProvider
                break
            case 'import':
                reg = /\\(import|includefrom|inputfrom)\*?(?:{([^}]*)})?{([^}]*)$/
                provider = importProvider
                break
            case 'subimport':
                reg = /\\(sub(?:import|includefrom|inputfrom))\*?(?:{([^}]*)})?{([^}]*)$/
                provider = subimportProvider
                break
            case 'glossary':
                reg = /\\(gls(?:pl|text|first|fmt(?:text|short|long)|plural|firstplural|name|symbol|desc|disp|user(?:i|ii|iii|iv|v|vi))?|Acr(?:long|full|short)?(?:pl)?|ac[slf]?p?)(?:\[[^[\]]*\])?{([^}]*)$/i
                provider = glossaryProvider
                break
            case 'subsuper':
                reg = /(?:\^|_){([^}]*)$/
                provider = subsuperProvider
                break
            case 'closeenv':
                reg = /(?:\\begin){([^}]*)}$/
                provider = closeenvProvider
                break
            default:
                // This shouldn't be possible, so mark as error case in log.
                logger.log(`Error - trying to complete unknown type ${type}`)
                return []
        }
        let lineToPos = args.line.substring(0, args.position.character)
        if (type === 'argument') {
            lineToPos = lineToPos.replace(/(?<!\\begin){[^[\]{}]*}/g, '').replace(/\[[^[\]{}]*\]/g, '')
        }
        const result = lineToPos.match(reg)
        let suggestions: vscode.CompletionItem[] = []
        if (result) {
            suggestions = provider.from(result, args)
        }
        return suggestions
    }
}

export class AtProvider implements vscode.CompletionItemProvider {
    private reg: RegExp = new RegExp('@[^\\\\s]*$')

    constructor() {
        this.updateTrigger()
    }

    updateTrigger() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const triggerCharacter = configuration.get('intellisense.atSuggestion.trigger.latex') as string
        atSuggestion.initialize(triggerCharacter)
        this.reg = new RegExp(escapeRegExp(triggerCharacter) + '[^\\\\s]*$')
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] | undefined {
        return this.provide({
            uri: document.uri,
            langId: document.languageId,
            line: document.lineAt(position).text,
            position
        })
    }

    provide(args: CompletionArgs): vscode.CompletionItem[] {
        const result = args.line.substring(0, args.position.character).match(this.reg)
        let suggestions: vscode.CompletionItem[] = []
        if (result) {
            suggestions = atProvider.from(result, args)
        }
        return suggestions
    }
}
