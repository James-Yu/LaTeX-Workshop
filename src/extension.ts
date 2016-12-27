'use strict';

import * as vscode from 'vscode';
import compile from './compile';
import {preview, source, previewProvider} from './preview';

export var configuration,
           latex_output,
           workshop_output,
           preview_provider;

export function activate(context: vscode.ExtensionContext) {

    console.log('LaTeX Workshop activated.');
    configuration = vscode.workspace.getConfiguration('latex-workshop');
    latex_output = vscode.window.createOutputChannel('LaTeX Raw Output');
    workshop_output = vscode.window.createOutputChannel('LaTeX Workshop Output');

    context.subscriptions.push(
        vscode.commands.registerCommand('latex-workshop.compile', compile),
        vscode.commands.registerCommand('latex-workshop.preview', preview),
        vscode.commands.registerCommand('latex-workshop.source', source)
    );

    if (configuration.compile_on_save)
        context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => compile()));

    preview_provider = new previewProvider(context);
    context.subscriptions.push(preview_provider);
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('latex-workshop-preview', preview_provider));

}

// this method is called when your extension is deactivated
export function deactivate() {
}
