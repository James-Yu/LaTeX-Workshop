import * as vscode from 'vscode'

import {Extension} from './../main'

export class Environment {
    extension: Extension
    suggestions: vscode.CompletionItem[]
    provideRefreshTime: number

    constructor(extension: Extension) {
        this.extension = extension
        this.suggestions = []
        Object.keys(this.defaults).map(key => {
            const item = this.defaults[key]
            const environment = new vscode.CompletionItem(item.text, vscode.CompletionItemKind.Module)
            this.suggestions.push(environment)
        })
    }

    provide() : vscode.CompletionItem[] {
        return this.suggestions
    }

    defaults = {
        figure: {
            text: 'figure'
        },
        table: {
            text: 'table'
        },
        description: {
            text: 'description'
        },
        enumerate: {
            text: 'enumerate'
        },
        itemize: {
            text: 'itemize'
        },
        math: {
            text: 'math'
        },
        displaymath: {
            text: 'displaymath'
        },
        split: {
            text: 'split'
        },
        array: {
            text: 'array'
        },
        eqnarray: {
            text: 'eqnarray'
        },
        equation: {
            text: 'equation'
        },
        equationAst: {
            text: 'equation*'
        },
        subequations: {
            text: 'subequations'
        },
        subequationsAst: {
            text: 'subequations*'
        },
        multiline: {
            text: 'multiline'
        },
        multilineAst: {
            text: 'multiline*'
        },
        gather: {
            text: 'gather'
        },
        gatherAst: {
            text: 'gather*'
        },
        align: {
            text: 'align'
        },
        alignAst: {
            text: 'align*'
        },
        alignat: {
            text: 'alignat'
        },
        alignatAst: {
            text: 'alignat*'
        },
        flalign: {
            text: 'flalign'
        },
        flalignAst: {
            text: 'flalign*'
        },
        theorem: {
            text: 'theorem'
        },
        cases: {
            text: 'cases'
        },
        center: {
            text: 'center'
        },
        flushleft: {
            text: 'flushleft'
        },
        flushright: {
            text: 'flushright'
        },
        minipage: {
            text: 'minipage'
        },
        quotation: {
            text: 'quotation'
        },
        quote: {
            text: 'quote'
        },
        verbatim: {
            text: 'verbatim'
        },
        verse: {
            text: 'verse'
        },
        picture: {
            text: 'picture'
        },
        tabbing: {
            text: 'tabbing'
        },
        tabular: {
            text: 'tabular'
        },
        thebibliography: {
            text: 'thebibliography'
        },
        titlepage: {
            text: 'titlepage'
        }
    }
}
