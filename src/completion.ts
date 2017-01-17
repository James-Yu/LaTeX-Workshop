'use strict';

import * as vscode from 'vscode';
import * as latex_workshop from './extension';
import * as latex_data from './data';
import {find_citation_keys, find_label_keys} from './utilities';

export function process_auto_complete(tag, data) {
    var completion = {
        cmds: [],
        envs: []
    }

    for (var cmd of data.commands) {
        var item = new vscode.CompletionItem(cmd.label, vscode.CompletionItemKind.Keyword);
        item.insertText = new vscode.SnippetString(cmd.insert);
        item.documentation = cmd.documentation;
        completion.cmds.push(item)
    }

    var all_completions = latex_data.auto_completes;
    all_completions[tag] = completion;

    latex_data.set_auto_completes(all_completions);
}

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
        var is_cite = false,
            is_ref = false;
        if (command_reg != undefined) {
            command = command_reg[1];
            is_cite = command.indexOf('cite') > -1;
            is_ref = command.indexOf('ref') > -1;
        }
        if (line.slice(-1) == ',' && !is_cite) {
            // "," will only work within citations
            return new Promise((resolve, reject) => {resolve([])});
        }
        if (is_cite) {
            find_citation_keys();
            return new Promise((resolve, reject) => {resolve(latex_data.citations)});
        } else if (is_ref) {
            find_label_keys();
            return new Promise((resolve, reject) => {
                resolve(latex_data.label_keys.map((key) => new vscode.CompletionItem(key)));
            })
        }
        if (line.slice(-1) == '\\') {
            var items = latex_data.auto_completes['latex'].cmds;
            return new Promise((resolve, reject) => {resolve(items)});
        }
    }
}