import * as vscode from 'vscode'
import {IProvider} from './interface'

export class Glossary implements IProvider {

    provideFrom() {
        return this.provide()
    }

    private provide(): vscode.CompletionItem[] {
        return []
    }
}
