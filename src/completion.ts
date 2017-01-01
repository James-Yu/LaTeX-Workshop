'use strict';

import * as vscode from 'vscode';
import * as latex_workshop from './extension';
import * as latex_data from './data';
import {find_citation_keys, find_label_keys} from './utilities';

export class LaTeXCompletionItemProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
            Thenable<vscode.CompletionItem[]> {
        var line = vscode.window.activeTextEditor.document.getText().split(/\r?\n/)[position.line].substring(0, position.character);
        var command_idx = Math.max(
            line.lastIndexOf('\\'),
            line.lastIndexOf('}'),
            line.lastIndexOf(' ')
        );
        var command_reg = /\\(.*?){/.exec(line.substring(command_idx));
        var command;
        var is_cite = false;
        if (command_reg != null) {
            command = command[1];
            is_cite = command.indexOf('cite') > -1;
        }
        if (line.slice(-1) == ',' && !is_cite) {
            // "," will only work within citations
            return new Promise((resolve, reject) => {resolve([])});
        }
        if (line.slice(-1) == '\\') {
            // command completion
            return new Promise((resolve, reject) => {
                resolve(latex_data.get_auto_completions()['latex']['commands'].map((key) => new vscode.CompletionItem(key)));
            });
        } else if (is_cite) {
            find_citation_keys();
            return new Promise((resolve, reject) => {
                resolve(latex_data.get_citation_keys().map((key) => new vscode.CompletionItem(key)));
            })
        } else if (command == 'ref') {
            find_label_keys();
            return new Promise((resolve, reject) => {
                resolve(latex_data.get_label_keys().map((key) => new vscode.CompletionItem(key)));
            })
        }
    }
}