'use strict';

import * as path from "path"
import * as vscode from 'vscode';

export function preview(file_uri, column) {
    if (!file_uri)
        file_uri = vscode.window.activeTextEditor.document.uri;

    if (!column)
        switch (vscode.window.activeTextEditor.viewColumn) {
            case vscode.ViewColumn.One: return preview(file_uri, vscode.ViewColumn.Two);
            case vscode.ViewColumn.Two: return preview(file_uri, vscode.ViewColumn.Three);
            default: return preview(file_uri, vscode.ViewColumn.One);
        }

    var uri = file_uri.with({scheme:'latex-workshop-preview'});
    var title = "Preview";

    vscode.commands.executeCommand("vscode.previewHtml", uri, column, title);
}

export class previewProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private resource_path;

    constructor(private context) {
        this.resource_path = file => this.context.asAbsolutePath(file);
    }

    dispose() {}

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    private tex_uri2pdf_file(uri: vscode.Uri): string {
        return path.join(path.dirname(uri.fsPath), path.basename(uri.fsPath, '.tex') + '.pdf');
    }

    public update(uri: vscode.Uri) {
        if (!uri)
            uri = vscode.window.activeTextEditor.document.uri;
        uri = uri.with({scheme:'latex-workshop-preview'})
        this._onDidChange.fire(uri);
    }

    public async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        var file = this.tex_uri2pdf_file(uri);
        return `
        <!DOCTYPE html>
        <html>
        <head>
        </head>
        <body>
        <iframe class="preview-panel" src="${this.resource_path('pdfjs/web/viewer.html')}?file=${encodeURIComponent(file)}" style="position:absolute; border: none; left: 0; top: 0; width: 100%; height: 100%;"></iframe>
        </body>
        </html>`;
    }
}