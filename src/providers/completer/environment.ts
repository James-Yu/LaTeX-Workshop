import * as vscode from 'vscode'
import * as fs from 'fs-extra'

import {Extension} from '../../main'

export class Environment {
    extension: Extension
    suggestions: vscode.CompletionItem[]
    defaults: {[id: string]: vscode.CompletionItem} = {}
    packageEnvs: {[pkg: string]: vscode.CompletionItem[]} = {}
    refreshTimer: number

    constructor(extension: Extension) {
        this.extension = extension
    }

    initialize(defaultEnvs: string[]) {
        defaultEnvs.forEach(env => {
            const environment = new vscode.CompletionItem(env, vscode.CompletionItemKind.Module)
            this.defaults[env] = environment
        })
    }

    provide() : vscode.CompletionItem[] {
        if (Date.now() - this.refreshTimer < 1000) {
            return this.suggestions
        }
        this.refreshTimer = Date.now()
        const suggestions = Object.assign({}, this.defaults)
        this.extension.completer.command.usedPackages.forEach(pkg => this.insertPkgEnvs(pkg, suggestions))
        this.suggestions = Object.keys(suggestions).map(key => suggestions[key])
        return this.suggestions
    }

    insertPkgEnvs(pkg: string, suggestions) {
        if (!(pkg in this.packageEnvs)) {
            const filePath = `${this.extension.extensionRoot}/data/packages/${pkg}_env.json`
            if (fs.existsSync(filePath)) {
                this.packageEnvs[pkg] = []
                const envs = JSON.parse(fs.readFileSync(filePath).toString())
                envs.forEach(env => {
                    if (env in suggestions) {
                        return
                    }
                    this.packageEnvs[pkg][env] = new vscode.CompletionItem(env, vscode.CompletionItemKind.Module)
                })
            }
        }
        if (pkg in this.packageEnvs) {
            Object.keys(this.packageEnvs[pkg]).forEach(env => {
                suggestions[env] = this.packageEnvs[pkg][env]
            })
        }
    }
}
