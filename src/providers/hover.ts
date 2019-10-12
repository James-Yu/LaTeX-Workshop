import * as vscode from 'vscode'
import {Extension} from '../main'
import {tokenizer, onAPackage} from './tokenizer'

export class HoverProvider implements vscode.HoverProvider {
    extension: Extension
    jaxInitialized = false
    color: any
    mj: any

    constructor(extension: Extension) {
        this.extension = extension
    }

    public provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): Thenable<vscode.Hover> {
        this.extension.mathPreview.getColor()
        return new Promise( (resolve, _reject) => {
            const configuration = vscode.workspace.getConfiguration('latex-workshop')
            const hov = configuration.get('hover.preview.enabled') as boolean
            const hovReference = configuration.get('hover.ref.enabled') as boolean
            const hovCitation = configuration.get('hover.citation.enabled') as boolean
            const hovCommand = configuration.get('hover.command.enabled') as boolean
            if (hov) {
                const tex = this.extension.mathPreview.findHoverOnTex(document, position)
                if (tex) {
                    this.extension.mathPreview.findProjectNewCommand().then( newCommands => {
                        this.extension.mathPreview.provideHoverOnTex(document, tex, newCommands).then( hover => resolve(hover) )
                    })
                    return
                }
            }
            const token = tokenizer(document, position)
            if (!token) {
                resolve()
                return
            }
            // Test if we are on a command
            if (token.startsWith('\\')) {
                if (!hovCommand) {
                    resolve()
                    return
                }
                this.provideHoverOnCommand(token).then(hover => resolve(hover))
                return
            }
            if (onAPackage(document, position, token)) {
                const pkg = encodeURIComponent(JSON.stringify(token))
                const md = `Package **${token}** \n\n`
                const mdLink = new vscode.MarkdownString(`[View documentation](command:latex-workshop.texdoc?${pkg})`)
                mdLink.isTrusted = true
                resolve(new vscode.Hover([md, mdLink]))
                return
            }
            const refs = this.extension.completer.reference.getRefDict()
            if (hovReference && token in refs) {
                const refData = refs[token]
                this.extension.mathPreview.provideHoverOnRef(document, position, refData, token)
                .then( hover => resolve(hover))
                return
            }
            const cites = this.extension.completer.citation.getEntryDict()
            if (hovCitation && token in cites) {
                const range = document.getWordRangeAtPosition(position, /\{.*?\}/)
                resolve(new vscode.Hover(
                    '```\n' + cites[token].detail + '\n```\n',
                    range
                ))
                return
            }
            resolve()
        })
    }

    private provideHoverOnCommand(token: string): Promise<vscode.Hover | undefined> {
        const signatures: string[] = []
        const pkgs: string[] = []
        const tokenWithoutSlash = token.substring(1)

        this.extension.manager.getIncludedTeX().forEach(cachedFile => {
            const cachedCmds = this.extension.manager.cachedContent[cachedFile].element.command
            if (cachedCmds === undefined) {
                return
            }
            cachedCmds.forEach(cmd => {
                const key = this.extension.completer.command.getCmdName(cmd)
                if (key.startsWith(tokenWithoutSlash) &&
                    ((key.length === tokenWithoutSlash.length) ||
                     (key.charAt(tokenWithoutSlash.length) === '[') ||
                     (key.charAt(tokenWithoutSlash.length) === '{'))) {
                    if (typeof cmd.documentation !== 'string') {
                        return
                    }
                    const doc = cmd.documentation
                    const packageName = cmd.package
                    if (packageName && (!pkgs.includes(packageName))) {
                        pkgs.push(packageName)
                    }
                    signatures.push(doc)
                }
            })
        })

        let pkgLink = ''
        if (pkgs.length > 0) {
            pkgLink = '\n\nView documentation for package(s) '
            pkgs.forEach(p => {
                const pkg = encodeURIComponent(JSON.stringify(p))
                pkgLink += `[${p}](command:latex-workshop.texdoc?${pkg}),`
            })
            pkgLink = pkgLink.substr(0, pkgLink.lastIndexOf(',')) + '.'
        }
        if (signatures.length > 0) {
            const mdLink = new vscode.MarkdownString(signatures.join('  \n')) // We need two spaces to ensure md newline
            mdLink.appendMarkdown(pkgLink)
            mdLink.isTrusted = true
            return Promise.resolve(new vscode.Hover(mdLink))
        }
        return Promise.resolve(undefined)
    }

}
