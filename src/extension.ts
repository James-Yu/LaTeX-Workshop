'use strict';

import * as vscode from 'vscode';
import {compile} from './compile';
import {preview, source, inPreview, previewProvider} from './preview';

var hasbin = require('hasbin');

export var configuration,
           latex_output,
           workshop_output,
           preview_provider,
           has_compiler,
           has_synctex;

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
        vscode.window.showWarningMessage(`LaTeX compiler ${configuration.compiler} cannot be found.`);
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('latex-workshop.preview', preview),
        vscode.commands.registerCommand('latex-workshop.source', source)
    );

    has_synctex = hasbin.sync('synctex');
    context.subscriptions.push(
        vscode.commands.registerCommand('latex-workshop.synctex', has_synctex ? inPreview : deavtivated_feature)
    );
    if (!has_synctex) {
        vscode.window.showWarningMessage(`SyncTeX cannot be found.`);
    }

    if (has_compiler && configuration.compile_on_save)
        context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => compile()));

    preview_provider = new previewProvider(context);
    context.subscriptions.push(preview_provider);
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('latex-workshop-preview', preview_provider));

}

// this method is called when your extension is deactivated
export function deactivate() {
}

function deavtivated_feature() {

}