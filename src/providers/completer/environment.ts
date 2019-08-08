import * as vscode from 'vscode'
import * as fs from 'fs-extra'
import {latexParser} from 'latex-utensils'

import {Extension} from '../../main'

export class Environment {
    extension: Extension
    private defaultEnvs: vscode.CompletionItem[]
    private packageEnvs: {[pkg: string]: vscode.CompletionItem[]}

    constructor(extension: Extension) {
        this.extension = extension
    }

    initialize(envs: string[]) {
        this.defaultEnvs = envs.map(env => new vscode.CompletionItem(env, vscode.CompletionItemKind.Module))
    }

    provide(): vscode.CompletionItem[] {
        // Update the dirty content in active text editor
        if (vscode.window.activeTextEditor) {
            const content = vscode.window.activeTextEditor.document.getText()
            const envs = this.getEnvFromNodeArray(latexParser.parse(content).content, content.split('\n'))
            this.extension.manager.cachedContent[vscode.window.activeTextEditor.document.uri.fsPath].element.reference = envs
        }
        // Extract cached envs and add to default ones
        const suggestions: vscode.CompletionItem[] = Array.from(this.defaultEnvs)
        const envList: string[] = this.defaultEnvs.map(env => env.label)
        Object.keys(this.extension.manager.cachedContent).forEach(cachedFile => {
            const cachedEnvs = this.extension.manager.cachedContent[cachedFile].element.environment
            if (cachedEnvs === undefined) {
                return
            }
            cachedEnvs.forEach(env => {
                if (envList.indexOf(env.label) > -1) {
                    return
                }
                suggestions.push(env)
                envList.push(env.label)
            })
        })
        // If no insert package-defined environments
        if (!(vscode.workspace.getConfiguration('latex-workshop').get('intellisense.package.enabled'))) {
            return suggestions
        }
        // Insert package environments
        this.extension.completer.command.usedPackages.map(pkg => {
            this.getEnvFromPkg(pkg).forEach(env => {
                if (envList.indexOf(env.label) > -1) {
                    return
                }
                suggestions.push(env)
                envList.push(env.label)
            })
        })
        return suggestions
    }

    update(file: string, nodes: latexParser.Node[], lines: string[]) {
        this.extension.manager.cachedContent[file].element.environment = this.getEnvFromNodeArray(nodes, lines)
    }

    // This function will return all environments in a node array, including sub-nodes
    private getEnvFromNodeArray(nodes: latexParser.Node[], lines: string[]): vscode.CompletionItem[] {
        let envs: vscode.CompletionItem[] = []
        for (let index = 0; index < nodes.length; ++index) {
            envs = envs.concat(this.getEnvFromNode(nodes[index], lines))
        }
        return envs
    }

    private getEnvFromNode(node: latexParser.Node, lines: string[]): vscode.CompletionItem[] {
        const envs: vscode.CompletionItem[] = []
        let label = ''
        // Here we only check `isEnvironment`which excludes `align*` and `verbatim`.
        // Nonetheless, they have already been included in `defaultEnvs`.
        if (latexParser.isEnvironment(node)) {
            label = node.name
            envs.push({
                label,
                kind: vscode.CompletionItemKind.Module
            })
            return envs
        }
        if (latexParser.hasContentArray(node)) {
            return this.getEnvFromNodeArray(node.content, lines)
        }
        return envs
    }

    private getEnvFromPkg(pkg: string): vscode.CompletionItem[] {
        if (pkg in this.packageEnvs) {
            return this.packageEnvs[pkg]
        }
        const filePath = `${this.extension.extensionRoot}/data/packages/${pkg}_env.json`
        if (!fs.existsSync(filePath)) {
            return []
        }
        this.packageEnvs[pkg] = (JSON.parse(fs.readFileSync(filePath).toString()) as string[])
            .map(env => new vscode.CompletionItem(env, vscode.CompletionItemKind.Module))
        return this.packageEnvs[pkg]
    }
}
