import * as vscode from 'vscode'
import { lw } from '../lw'
import { findMacros } from './math/mathpreviewlib/newcommandfinder'
import { tokenizer, onAPackage } from '../utils/tokenizer'
import { CmdEnvSuggestion } from '../completion/completer/completerutils'

export {
    provider
}

class HoverProvider implements vscode.HoverProvider {
    public async provideHover(document: vscode.TextDocument, position: vscode.Position, ctoken: vscode.CancellationToken): Promise<vscode.Hover | undefined> {
        lw.preview.math.refreshMathColor()
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const hov = configuration.get('hover.preview.enabled') as boolean
        const hovReference = configuration.get('hover.ref.enabled') as boolean
        const hovCitation = configuration.get('hover.citation.enabled') as boolean
        const hovCommand = configuration.get('hover.command.enabled') as boolean
        if (hov) {
            const tex = lw.preview.math.findTeX(document, position)
            // Hovered over equations
            if (tex) {
                const hover = await lw.preview.math.onTeX(document, tex, await findMacros(ctoken))
                return hover
            }
            // Hovered over graphics
            const graphicsHover = await lw.preview.hover(document, position)
            if (graphicsHover) {
                return graphicsHover
            }
        }
        const token = tokenizer(document, position)
        if (!token) {
            return
        }
        // Test if we are on a macro
        if (token.startsWith('\\')) {
            if (!hovCommand) {
                return
            }
            return this.provideHoverOnMacro(token)
        }
        if (onAPackage(document, position, token)) {
            const packageName = encodeURIComponent(JSON.stringify(token))
            const md = `Package **${token}** \n\n`
            const mdLink = new vscode.MarkdownString(`[View documentation](command:latex-workshop.texdoc?${packageName})`)
            mdLink.isTrusted = true
            const ctanUrl = `https://ctan.org/pkg/${token}`
            const ctanLink = new vscode.MarkdownString(`[${ctanUrl}](${ctanUrl})`)
            return new vscode.Hover([md, mdLink, ctanLink])
        }
        const refData = lw.completion.reference.getItem(token)
        if (hovReference && refData) {
            const hover = await lw.preview.math.onRef(document, position, refData, ctoken)
            return hover
        }
        const cite = lw.completion.citation.getItem(token, document.uri)
        if (hovCitation && cite) {
            const range = document.getWordRangeAtPosition(position, /\{.*?\}/)
            const md = cite.documentation || cite.detail
            if (md) {
                return new vscode.Hover(md, range)
            }
        }
        return
    }

    private provideHoverOnMacro(token: string): vscode.Hover | undefined {
        const signatures: string[] = []
        const packageNames: string[] = []
        const tokenWithoutSlash = token.substring(1)

        const packageCmds: CmdEnvSuggestion[] = []
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if ((configuration.get('intellisense.package.enabled'))) {
            const packages = lw.completion.usepackage.getAll('latex-expl3')
            Object.entries(packages).forEach(([packageName, options]) => {
                lw.completion.macro.provideCmdInPkg(packageName, options, packageCmds)
                lw.completion.environment.provideEnvsAsMacroInPkg(packageName, options, packageCmds)
            })
        }

        const checkCmd = (cmd: CmdEnvSuggestion) => {
            const cmdName = cmd.name()
            if (cmdName.startsWith(tokenWithoutSlash) && (cmdName.length === tokenWithoutSlash.length)) {
                if (typeof cmd.documentation !== 'string') {
                    return
                }
                const doc = cmd.documentation
                const packageName = cmd.package
                if (packageName && packageName !== 'user-defined' && (!packageNames.includes(packageName))) {
                    packageNames.push(packageName)
                }
                signatures.push(doc)
            }
        }

        packageCmds.forEach(checkCmd)

        lw.cache.getIncludedTeX().forEach(cachedFile => {
            lw.cache.get(cachedFile)?.elements.macro?.forEach(checkCmd)
        })

        let pkgLink = ''
        if (packageNames.length > 0) {
            pkgLink = '\n\nView documentation for package(s) '
            packageNames.forEach(p => {
                const packageName = encodeURIComponent(JSON.stringify(p))
                pkgLink += `[${p}](command:latex-workshop.texdoc?${packageName}),`
            })
            pkgLink = pkgLink.substring(0, pkgLink.lastIndexOf(',')) + '.'
        }
        if (signatures.length > 0) {
            const mdLink = new vscode.MarkdownString(signatures.join('  \n')) // We need two spaces to ensure md newline
            mdLink.appendMarkdown(pkgLink)
            mdLink.isTrusted = true
            return new vscode.Hover(mdLink)
        }
        return
    }
}

const provider = new HoverProvider()
