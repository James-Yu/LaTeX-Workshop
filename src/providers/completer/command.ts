import * as vscode from 'vscode'
import * as fs from 'fs'

import {Extension} from '../../main'

export class Command {
    extension: Extension
    suggestions: vscode.CompletionItem[]
    commandInTeX: { [id: string]: {[id: string]: AutocompleteEntry} } = {}
    refreshTimer: number
    defaultCommands: {[key: string]: vscode.CompletionItem} = {}

    constructor(extension: Extension) {
        this.extension = extension
    }

    initialize(defaultCommands: {[key: string]: AutocompleteEntry},
               defaultSymbols: {[key: string]: AutocompleteEntry},
               defaultEnvs: {[key: string]: {text: string}}) {
        Object.keys(defaultCommands).forEach(key => {
            if (!(key in defaultSymbols)) {
                defaultSymbols[key] = defaultCommands[key]
            }
        })
        const envSnippet: { [id: string]: { command: string, snippet: string}} = {}
        Object.keys(defaultEnvs).forEach(env => {
            const text = defaultEnvs[env].text
            envSnippet[env] = {
                command: text,
                snippet: `begin{${text}}\n\t$0\n\\\\end{${text}}`
            }
            if (['enumerate', 'itemize'].indexOf(text) > -1) {
                envSnippet[env]['snippet'] = `begin{${text}}\n\t\\item $0\n\\\\end{${text}}`
            }
        })
        Object.keys(defaultSymbols).forEach(key => {
            const item = defaultSymbols[key]
            this.defaultCommands[key] = this.entryToCompletionItem(item)
        })
        Object.keys(envSnippet).forEach(key => {
            const item = envSnippet[key]
            const command = new vscode.CompletionItem(`\\begin{${item.command}} ... \\end{${item.command}}`, vscode.CompletionItemKind.Snippet)
            command.filterText = item.command
            command.insertText = new vscode.SnippetString(item.snippet)
            this.defaultCommands[key] = command
        })
    }

    provide() : vscode.CompletionItem[] {
        if (Date.now() - this.refreshTimer < 1000) {
            return this.suggestions
        }
        this.refreshTimer = Date.now()
        const suggestions = Object.assign({}, this.defaultCommands)
        Object.keys(this.extension.manager.texFileTree).forEach(filePath => {
            if (filePath in this.commandInTeX) {
                Object.keys(this.commandInTeX[filePath]).forEach(key => {
                    if (!(key in suggestions)) {
                        suggestions[key] = this.entryToCompletionItem(this.commandInTeX[filePath][key])
                    }
                })
            }
        })
        if (vscode.window.activeTextEditor) {
            const items = this.getCommandItems(vscode.window.activeTextEditor.document.getText())
            Object.keys(items).forEach(key => {
                if (!(key in suggestions)) {
                    suggestions[key] = this.entryToCompletionItem(items[key])
                }
            })
        }
        this.suggestions = Object.keys(suggestions).map(key => suggestions[key])
        return this.suggestions
    }

    entryToCompletionItem(item: AutocompleteEntry) : vscode.CompletionItem {
        const backslash = item.command[0] === ' ' ? '' : '\\'
        const command = new vscode.CompletionItem(`${backslash}${item.command}`, vscode.CompletionItemKind.Function)
        if (item.snippet) {
            command.insertText = new vscode.SnippetString(item.snippet)
        } else {
            command.insertText = item.command
        }
        command.documentation = item.documentation
        command.detail = item.detail
        command.sortText = item.sortText
        return command
    }

    getCommandsTeX(filePath: string) {
        this.commandInTeX[filePath] = this.getCommandItems(fs.readFileSync(filePath, 'utf-8'))
    }

    getCommandItems(content: string) : { [id: string]: AutocompleteEntry } {
        const itemReg = /\\([a-zA-Z]+)({[^{}]*})?({[^{}]*})?({[^{}]*})?/g
        const items = {}
        while (true) {
            const result = itemReg.exec(content)
            if (result === null) {
                break
            }
            if (!(result[1] in items)) {
                items[result[1]] = {
                    command: result[1]
                }
                if (result[2]) {
                    items[result[1]].snippet = `${result[1]}{$\{1:arg}}`
                }
                if (result[3]) {
                    items[result[1]].snippet += `{$\{2:arg}}`
                }
                if (result[4]) {
                    items[result[1]].snippet += `{$\{3:arg}}`
                }
            } else {
                if (items[result[1]].counts) {
                    items[result[1]].counts += 1
                } else {
                    items[result[1]].counts = 2
                }
            }
        }

        return items
    }
}

interface AutocompleteEntry {
    command: string
    snippet?: string
    detail?: string
    description?: string
    documentation?: string
    sortText?: string
}

export const _DEFAULT_COMMANDS_BAK: {[key: string]: AutocompleteEntry} = {
    'begin': {
        'command': 'begin',
        'snippet': 'begin{${1:env}}\n\t$2\n\\\\end{${1:env}}',
        'detail': 'begin a new environment'
    },

    // ------------------ DOCUMENT STRUCTURE ------------------ //
    'title': {
        'command': 'title',
        'snippet': 'title{${1:text}}'
    },
    'part': {
        'command': 'part',
        'snippet': 'part{${1:title}}'
    },
    'chapter': {
        'command': 'chapter',
        'snippet': 'chapter{${1:title}}'
    },
    'section': {
        'command': 'section',
        'snippet': 'section{${1:title}}'
    },
    'subsection': {
        'command': 'subsection',
        'snippet': 'subsection{${1:title}}'
    },
    'subsubsection': {
        'command': 'subsubsection',
        'snippet': 'subsubsection{${1:title}}'
    },
    'paragraph': {
        'command': 'paragraph',
        'snippet': 'paragraph{${1:title}}'
    },
    'subparagraph': {
        'command': 'subparagraph',
        'snippet': 'subparagraph{${1:title}}'
    },

    // Structure: Other
    'bibliography': {
        'command': 'bibliography',
        'snippet': 'bibliography{${1:file}}'
    },
    'bibliographystyle': {
        'command': 'bibliographystyle',
        'snippet': 'bibliographystyle{${1:style}}'
    },
    'caption': {
        'command': 'caption',
        'snippet': 'caption{${1:text}}'
    },
    'footnote': {
        'command': 'footnote',
        'snippet': 'footnote{${1:text}}'
    },

    // ------------------ CITATIONS ------------------ //
    'cite': {
        'command': 'cite',
        'snippet': 'cite{$1}',
        'detail': 'reference'
    },
    'citeyear': {
        'command': 'citeyear',
        'snippet': 'citeyear{${1:key}}'
    },
    'shortcite': {
        'command': 'shortcite',
        'snippet': 'shortcite{${1:key}}'
    },

    // ------------------ TEXT STYLES ------------------ //
    'emph': {
        'command': 'emph',
        'snippet': 'emph{${1:text}}'
    },
    'textbf': {
        'command': 'textbf',
        'snippet': 'textbf{${1:text}}'
    },
    'textit': {
        'command': 'textit',
        'snippet': 'textit{${1:text}}'
    },
    'textmd': {
        'command': 'textmd',
        'snippet': 'textmd{${1:text}}'
    },
    'textnormal': {
        'command': 'textnormal',
        'snippet': 'textnormal{${1:text}}'
    },
    'textrm': {
        'command': 'textrm',
        'snippet': 'textrm{${1:text}}'
    },
    'textsc': {
        'command': 'textsc',
        'snippet': 'textsc{${1:text}}'
    },
    'textsf': {
        'command': 'textsf',
        'snippet': 'textsf{${1:text}}'
    },
    'textsl': {
        'command': 'textsl',
        'snippet': 'textsl{${1:text}}',
        'detail': 'slanted text'
    },
    'texttt': {
        'command': 'texttt',
        'snippet': 'texttt{${1:text}}'
    },
    'textup': {
        'command': 'textup',
        'snippet': 'textup{${1:text}}'
    },

    // ------------------ REFERENCES ------------------ //
    'label': {
        'command': 'label{...}',
        'snippet': 'label{${1}}'
    },
    'ref': {
        'command': 'ref',
        'snippet': 'ref{${1:key}}'
    },
    'pageref': {
        'command': 'pageref',
        'snippet': 'pageref{${1:key}}'
    },

    'author': {
        'command': 'author',
        'snippet': 'author{${1:text}}'
    },
    'pagestyle': {
        'command': 'pagestyle',
        'snippet': 'pagestyle{${1:style}}'
    },
    'hspace': {
        'command': 'hspace',
        'snippet': 'hspace{${1:l}}'
    },
    'vspace': {
        'command': 'vspace',
        'snippet': 'vspace{${1:l}}'
    },
    'usepackage': {
        'command': 'usepackage',
        'snippet': 'usepackage{${1:name}}'
    },
    'item': {
        'command': 'item',
        'snippet': 'item ${1}'
    },
    'multicolumn': {
        'command': 'multicolumn',
        'snippet': 'multicolumn{${1:n}}{${2:cols}}{${3:text}}'
    },
    'documentclass': {
        'command': 'documentclass',
        'snippet': 'documentclass{${1:class}}'
    },
    'tableofcontents': {
        'command': 'tableofcontents'
    },
    'linespread': {
        'command': 'linespread',
        'snippet': 'linespread{${1:x}}'
    },
    'date': {
        'command': 'date',
        'snippet': 'date{${1:text}}'
    },
    'today': {
        'command': 'today'
    },
    'underline': {
        'command': 'underline',
        'snippet': 'underline{${1:text}}'
    },
    'rule': {
        'command': 'rule',
        'snippet': 'rule{${1:w}}{${2:h}}'
    },
    'pagebreak': {
        'command': 'pagebreak'
    },
    ' ': {
        'command': ' Press ENTER to insert a new line.',
        'snippet': '\n'
    },
    'noindent': {
        'command': 'noindent'
    },

    'kill': {
        'command': 'kill'
    },


    // ------------------ FONT SIZING ------------------ //
    'tiny': {
        'command': 'tiny'
    },
    'scriptsize': {
        'command': 'scriptsize'
    },
    'footnotesize': {
        'command': 'footnotesize'
    },
    'small': {
        'command': 'small'
    },
    'normalsize': {
        'command': 'normalsize'
    },
    'large': {
        'command': 'large'
    },
    'Large': {
        'command': 'Large'
    },
    'LARGE': {
        'command': 'LARGE'
    },
   'huge': {
        'command': 'huge'
    },
    'Huge': {
        'command': 'Huge'
    },

    // ------------------ ALIGNMENT COMMANDS ------------------ //
    'raggedleft': {
        'command': 'raggedleft'
    },
    'raggedright': {
        'command': 'raggedright'
    },

    'centering': {
        'command': 'centering'
    },

    // ------------------ TABLE COMMANDS ------------------ //
    'cline': {
        'command': 'cline',
        'snippet': 'cline{${1:x}-{2:y}}'
    },
    'hline': {
        'command': 'hline'
    },

    // ------------------ MATH COMMANDS ------------------ //
    'text': {
        'command': 'text',
        'snippet': 'text{${1:text}}'
    },
    'sqrt': {
        'command': 'sqrt',
        'snippet': 'sqrt{${1:x}}'
    },
    'frac': {
        'command': 'frac',
        'snippet': 'frac{${1:x}}{${2:y}}'
    },
    'bar': {
        'command': 'bar',
        'snippet': 'bar{${1:symbol}}'
    },

    // ------------------ MATH SYMBOLS ------------------ //
    // Math: Greek lowercase
    'alpha': {
        'command': 'alpha',
        'detail': 'α'
    },
    'beta': {
        'command': 'beta',
        'detail': 'β'
    },
    'chi': {
        'command': 'chi',
        'detail': 'χ'
    },
    'delta': {
        'command': 'delta',
        'detail': 'δ'
    },
    'epsilon': {
        'command': 'epsilon',
        'detail': 'ε'
    },
    'varepsilon': {
        'command': 'varepsilon'
    },
    'eta': {
        'command': 'eta',
        'description': 'η'
    },
   'gamma': {
        'command': 'gamma',
        'description': 'γ'
    },
    'iota': {
        'command': 'iota',
        'description': 'ι'
    },
    'kappa': {
        'command': 'kappa',
        'description': 'κ'
    },
    'lambda': {
        'command': 'lambda',
        'description': 'λ'
    },
    'mu': {
        'command': 'mu',
        'description': 'μ'
    },
    'nu': {
        'command': 'nu',
        'description': 'ν'
    },
    'omega': {
        'command': 'omega'
    },
    'phi': {
        'command': 'phi'
    },
    'pi': {
        'command': 'pi'
    },
    'psi': {
        'command': 'psi'
    },
    'rho': {
        'command': 'rho'
    },
    'sigma': {
        'command': 'sigma'
    },
    'tau': {
        'command': 'tau'
    },
    'theta': {
        'command': 'theta'
    },
    'vartheta': {
        'command': 'vartheta'
    },
    'upsilon': {
        'command': 'upsilon'
    },
    'xi': {
        'command': 'xi'
    },
    'zeta': {
        'command': 'zeta'
    },

    // Math: Greek uppercase
    'Delta': {
        'command': 'Delta'
    },
    'Gamma': {
        'command': 'Gamma'
    },
    'Lambda': {
        'command': 'Lambda'
    },
    'Omega': {
        'command': 'Omega'
    },
    'Phi': {
        'command': 'Phi'
    },
    'Pi': {
        'command': 'Pi'
    },
    'Psi': {
        'command': 'Psi'
    },
    'Sigma': {
        'command': 'Sigma'
    },
    'Theta': {
        'command': 'Theta'
    },
    'Upsilon': {
        'command': 'Upsilon'
    },
    'Xi': {
        'command': 'Xi'
    },

    // Math: sets
    'exists': {
        'command': 'exists',
        'detail': '∃'
    },
    'in': {
        'command': 'in',
        'detail': '∈'
    },
    'notin': {
        'command': 'notin',
        'detail': '∉'
    },
    'subset': {
        'command': 'subset'
    },
    'supset': {
        'command': 'supset'
    },

    // Math: arrows
    'leftarrow': {
        'command': 'leftarrow',
        'detail': '←'
    },
    'Leftarrow': {
        'command': 'Leftarrow',
        'detail': '⇐'
    },
    'Leftrightarrow': {
        'command': 'Leftrightarrow',
        'description': '⇔'
    },
    'rightarrow': {
        'command': 'rightarrow',
        'detail': '→'
    },
    'Rightarrow': {
        'command': 'Rightarrow',
        'detail': '⇒'
    },

    // Math: misc
    'infty': {
        'command': 'infty',
        'detail': '∞'
    },
    'div': {
        'command': 'div',
        'detail': '∇ (divergence)'
    },
    'approx': {
        'command': 'approx',
        'detail': '≈'
    },
    'mid': {
        'command': 'mid'
    },
    'neg': {
        'command': 'neg',
        'detail': '¬'
    },
    'sum': {
        'command': 'sum',
        'detail': '∑'
    },
    'prime': {
        'command': 'prime',
        'detail': '′'
    },
    'geq': {
        'command': 'geq',
        'detail': '≥'
    },
    'pm': {
        'command': 'pm',
        'detail': '±'
    },
    'times': {
        'command': 'times',
        'detail': '×'
    },
    'cdots': {
        'command': 'cdots',
        'detail': '···'
    },
    'cap': {
        'command': 'cap',
        'detail': '∩'
    },
    'cup': {
        'command': 'cup',
        'detail': '∪'
    },
    'vee': {
        'command': 'vee',
        'detail': '∨'
    },
    'prod': {
        'command': 'prod',
        'detail': '∏'
    },
    'circ': {
        'command': 'circ'
    },
    'wedge': {
        'command': 'wedge',
        'detail': '∧'
    },
    'neq': {
        'command': 'neq',
        'detail': '≠'
    },
    'forall': {
        'command': 'forall',
        'detail': '∀'
    },
    'leq': {
        'command': 'leq',
        'detail': '≤'
    },
   'dot': {
        'command': 'dot',
        'snippet': 'dot{${1:symbol}}'
    },
    'cdot': {
        'command': 'cdot',
        'detail': '·'
    },
    'hat': {
        'command': 'hat',
        'snippet': 'hat{${1:symbol}}'
    },
    'tilde': {
        'command': 'tilde',
        'snippet': 'tilde{${1:symbol}}'
    },

}
