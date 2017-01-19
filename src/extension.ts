'use strict';

import * as vscode from 'vscode';
import {compile} from './compile';
import {create_server, preview, preview_browser, source, inPreview, previewProvider} from './preview';
import {process_auto_complete, LaTeXCompletionItemProvider} from './completion';

var hasbin = require('hasbin');
var fs = require('fs');
var loader = require("amd-loader");

export var configuration,
           latex_output,
           workshop_output,
           preview_provider,
           has_compiler,
           has_synctex,
           find_path;

export async function activate(context: vscode.ExtensionContext) {
    console.log('LaTeX Workshop activated.');
    configuration = vscode.workspace.getConfiguration('latex-workshop');
    latex_output = vscode.window.createOutputChannel('LaTeX Raw Output');
    workshop_output = vscode.window.createOutputChannel('LaTeX Workshop Output');

    has_compiler = hasbin.sync(configuration.compiler);
    context.subscriptions.push(
        vscode.commands.registerCommand('latex-workshop.compile', has_compiler ? () => {compile(true)} : deavtivated_feature)
    );
    if (!has_compiler) {
        vscode.window.showWarningMessage(`LaTeX compiler ${configuration.compiler} is not found.`);
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('latex-workshop.preview', preview),
        vscode.commands.registerCommand('latex-workshop.preview_browser', preview_browser),
        vscode.commands.registerCommand('latex-workshop.source', source)
    );

    has_synctex = hasbin.sync('synctex');
    context.subscriptions.push(
        vscode.commands.registerCommand('latex-workshop.synctex', has_synctex ? inPreview : deavtivated_feature)
    );
    if (!has_synctex) {
        vscode.window.showWarningMessage(`SyncTeX is not found.`);
    }

    if (has_compiler && configuration.compile_on_save)
        context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => compile()));

    preview_provider = new previewProvider(context);
    context.subscriptions.push(preview_provider);
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('latex-workshop-preview', preview_provider));

    var completion_provider = new LaTeXCompletionItemProvider();
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('latex', completion_provider, '\\', '{', ','));

    fs.readFile(context.asAbsolutePath('data/auto_latex.json'), (err, data) => {
        if (err) throw err;
        process_auto_complete('latex', JSON.parse(data));
    });

    create_server(context);

    find_path = context.asAbsolutePath;
}

// this method is called when your extension is deactivated
export function deactivate() {
}

function deavtivated_feature() {

}