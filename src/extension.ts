'use strict';

import * as vscode from 'vscode';
import compile from './compile'

export var configuration,
           latex_output,
           workshop_output;

export function activate(context: vscode.ExtensionContext) {

    console.log('LaTeX Workshop activated.');
    configuration = vscode.workspace.getConfiguration('latex-workshop');
    latex_output = vscode.window.createOutputChannel('LaTeX Raw Output');
    workshop_output = vscode.window.createOutputChannel('LaTeX Workshop Output');

    // Code heavily borrowed from LaTeXCompile extension
    let compile_func = vscode.commands.registerCommand('latex-workshop.compile', compile);
    context.subscriptions.push(compile_func);

    if (configuration.compile_on_save) {
        let compile_on_save = vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => compile());
        context.subscriptions.push(compile_on_save);
    }

}

// this method is called when your extension is deactivated
export function deactivate() {
}
