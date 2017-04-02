import * as vscode from 'vscode'
import * as fs from 'fs'

import {Extension} from './../main'

export class Command {
    extension: Extension
    suggestions: vscode.CompletionItem[]
    commandInTeX: { [id: string]: {} } = {}

    constructor(extension: Extension) {
        this.extension = extension
    }

    provide() : vscode.CompletionItem[] {
        let suggestions = JSON.parse(JSON.stringify(this.defaults))
        Object.keys(this.extension.manager.texFileTree).forEach(filePath => {
            if (filePath in this.commandInTeX) {
                Object.keys(this.commandInTeX[filePath]).forEach(key => {
                    if (key in suggestions)
                        suggestions[key].count += this.commandInTeX[filePath][key].count
                    else
                        suggestions[key] = this.commandInTeX[filePath][key]
                })
            }
        })
        if (vscode.window.activeTextEditor) {
            let items = this.getCommandItems(vscode.window.activeTextEditor.document.getText())
            Object.keys(items).forEach(key => {
                if (!(key in suggestions))
                    suggestions[key] = items[key]
            })
        }
        this.suggestions = []
        Object.keys(suggestions).forEach(key => {
            let item = suggestions[key]
            let command = new vscode.CompletionItem(item.command,vscode.CompletionItemKind.Keyword)
            if (item.snippet)
                command.insertText = new vscode.SnippetString(item.snippet)
            if (item.documentation)
                command.documentation = item.documentation
            this.suggestions.push(command)
        })
        return this.suggestions
    }

    getCommandsTeX(filePath: string) {
        this.commandInTeX[filePath] = this.getCommandItems(fs.readFileSync(filePath, 'utf-8'))
    }
    
    getCommandItems(content: string) {
        let itemReg = /\\([a-zA-Z]+)({[^{}]*})?({[^{}]*})?({[^{}]*})?/g
        let items = {}
        while (true) {
            let result = itemReg.exec(content);
            if (result == null) {
                break
            }
            if (!(result[1] in items)) {
                items[result[1]] = {
                    command: result[1]
                }
                if (result[2]) {
                    items[result[1]].chain = true
                    items[result[1]].snippet = `${result[1]}{$\{1:arg}}`
                }
                if (result[3])
                    items[result[1]].snippet += `{$\{2:arg}}`
                if (result[4])
                    items[result[1]].snippet += `{$\{3:arg}}`
            } else {
                if (items[result[1]].counts)
                    items[result[1]].counts += 1
                else
                    items[result[1]].counts = 2
            }
        }

        return items
    }

    defaults = {
        begin: {
            command: 'begin',
            snippet: 'begin{${1:env}}\n\t$2\n\\\\end{${1:env}}'
        },
        cite: {
            command: 'cite',
            snippet: 'cite{${1:key}}'
        },
        ref: {
            command: 'ref',
            snippet: 'ref{${1:key}}'
        },
        " ":{"command":" Press ENTER to insert a new line.","snippet":"\n", "documentation":""},
        "citeyear":{"command":"citeyear","snippet":"citeyear{${1:key}}"},
        "Large":{"command":"Large"},
        "textsl":{"command":"textsl","snippet":"textsl{${1:text}}"},
        "beta":{"command":"beta"},
        "phi":{"command":"phi"},
        "mu":{"command":"mu"},
        "circ":{"command":"circ"},
        "wedge":{"command":"wedge"},
        "author":{"command":"author","snippet":"author{${1:text}}"},
        "Sigma":{"command":"Sigma"},
        "nu":{"command":"nu"},
        "rightarrow":{"command":"rightarrow"},
        "emph":{"command":"emph","snippet":"emph{${1:text}}"},
        "hat":{"command":"hat","snippet":"hat{${1:symbol}}"},
        "neq":{"command":"neq"},
        "forall":{"command":"forall"},
        "leq":{"command":"leq"},
        "textrm":{"command":"textrm","snippet":"textrm{${1:text}}"},
        "cdot":{"command":"cdot"},
        "theta":{"command":"theta"},
        "textnormal":{"command":"textnormal","snippet":"textnormal{${1:text}}"},
        "noindent":{"command":"noindent"},
        "footnote":{"command":"footnote","snippet":"footnote{${1:text}}"},
        "textmd":{"command":"textmd","snippet":"textmd{${1:text}}"},
        "Theta":{"command":"Theta"},
        "textsc":{"command":"textsc","snippet":"textsc{${1:text}}"},
        "kill":{"command":"kill"},
        "cline":{"command":"cline","snippet":"cline{${1:x}-{2:y}}"},
        "part":{"command":"part","snippet":"part{${1:title}}"},
        "Psi":{"command":"Psi"},
        "pi":{"command":"pi"},
        "tiny":{"command":"tiny"},
        "pagebreak":{"command":"pagebreak"},
        "bibliographystyle":{"command":"bibliographystyle","snippet":"bibliographystyle{${1:style}}"},
        "upsilon":{"command":"upsilon"},
        "infty":{"command":"infty"},
        "Huge":{"command":"Huge"},
        "pageref":{"command":"pageref","snippet":"pageref{${1:key}}"},
        "supset":{"command":"supset"},
        "LARGE":{"command":"LARGE"},
        "psi":{"command":"psi"},
        "Upsilon":{"command":"Upsilon"},
        "raggedleft":{"command":"raggedleft"},
        "text":{"command":"text","snippet":"text{${1:text}}"},
        "approx":{"command":"approx"},
        "normalsize":{"command":"normalsize"},
        "label":{"command":"label","snippet":"label{${1:marker}}"},
        "sqrt":{"command":"sqrt","snippet":"sqrt{${1:x}}"},
        "omega":{"command":"omega"},
        "subset":{"command":"subset"},
        "Rightarrow":{"command":"Rightarrow"},
        "today":{"command":"today"},
        "sum":{"command":"sum"},
        "eta":{"command":"eta"},
        "cap":{"command":"cap"},
        "zeta":{"command":"zeta"},
        "chapter":{"command":"chapter","snippet":"chapter{${1:title}}"},
        "bibliography":{"command":"bibliography","snippet":"bibliography{${1:file}}"},
        "lambda":{"command":"lambda"},
        "xi":{"command":"xi"},
        "mid":{"command":"mid"},
        "neg":{"command":"neg"},
        "textit":{"command":"textit","snippet":"textit{${1:text}}"},
        "delta":{"command":"delta"},
        "linespread":{"command":"linespread","snippet":"linespread{${1:x}}"},
        "Pi":{"command":"Pi"},
        "frac":{"command":"frac","snippet":"frac{${1:x}}{${2:y}}"},
        "bar":{"command":"bar","snippet":"bar{${1:symbol}}"},
        "date":{"command":"date","snippet":"date{${1:text}}"},
        "div":{"command":"div"},
        "underline":{"command":"underline","snippet":"underline{${1:text}}"},
        "leftarrow":{"command":"leftarrow"},
        "tau":{"command":"tau"},
        "shortcite":{"command":"shortcite","snippet":"shortcite{${1:key}}"},
        "sigma":{"command":"sigma"},
        "caption":{"command":"caption","snippet":"caption{${1:text}}"},
        "chi":{"command":"chi"},
        "rule":{"command":"rule","snippet":"rule{${1:w}}{${2:h}}"},
        "kappa":{"command":"kappa"},
        "footnotesize":{"command":"footnotesize"},
        "paragraph":{"command":"paragraph","snippet":"paragraph{${1:title}}"},
        "prime":{"command":"prime"},
        "small":{"command":"small"},
        "geq":{"command":"geq"},
        "subsubsection":{"command":"subsubsection","snippet":"subsubsection{${1:title}}"},
        "section":{"command":"section","snippet":"section{${1:title}}"},
        "centering":{"command":"centering"},
        "Gamma":{"command":"Gamma"},
        "pm":{"command":"pm"},
        "Leftrightarrow":{"command":"Leftrightarrow"},
        "varepsilon":{"command":"varepsilon"},
        "notin":{"command":"notin"},
        "times":{"command":"times"},
        "dot":{"command":"dot","snippet":"dot{${1:symbol}}"},
        "textbf":{"command":"textbf","snippet":"textbf{${1:text}}"},
        "vartheta":{"command":"vartheta"},
        "textup":{"command":"textup","snippet":"textup{${1:text}}"},
        "texttt":{"command":"texttt","snippet":"texttt{${1:text}}"},
        "exists":{"command":"exists"},
        "cdots":{"command":"cdots"},
        "subsection":{"command":"subsection","snippet":"subsection{${1:title}}"},
        "subparagraph":{"command":"subparagraph","snippet":"subparagraph{${1:title}}"},
        "scriptsize":{"command":"scriptsize"},
        "pagestyle":{"command":"pagestyle","snippet":"pagestyle{${1:style}}"},
        "hspace":{"command":"hspace","snippet":"hspace{${1:l}}"},
        "usepackage":{"command":"usepackage","snippet":"usepackage{${1:name}}"},
        "cup":{"command":"cup"},
        "Omega":{"command":"Omega"},
        "vspace":{"command":"vspace","snippet":"vspace{${1:l}}"},
        "item":{"command":"item","snippet":"item ${1:text}"},
        "epsilon":{"command":"epsilon"},
        "Xi":{"command":"Xi"},
        "vee":{"command":"vee"},
        "multicolumn":{"command":"multicolumn","snippet":"multicolumn{${1:n}}{${2:cols}}{${3:text}}"},
        "documentclass":{"command":"documentclass","snippet":"documentclass{${1:class}}"},
        "tableofcontents":{"command":"tableofcontents"},
        "Phi":{"command":"Phi"},
        "raggedright":{"command":"raggedright"},
        "Leftarrow":{"command":"Leftarrow"},
        "textsf":{"command":"textsf","snippet":"textsf{${1:text}}"},
        "tilde":{"command":"tilde","snippet":"tilde{${1:symbol}}"},
        "in":{"command":"in"},
        "hline":{"command":"hline"},
        "rho":{"command":"rho"},
        "Delta":{"command":"Delta"},
        "prod":{"command":"prod"},
        "huge":{"command":"huge"},
        "large":{"command":"large"},
        "Lambda":{"command":"Lambda"},
        "title":{"command":"title","snippet":"title{${1:text}}"},
        "alpha":{"command":"alpha"},
        "iota":{"command":"iota"},
        "gamma":{"command":"gamma"}
    }
}
