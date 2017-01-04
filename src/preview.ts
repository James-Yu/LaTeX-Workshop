'use strict';

import * as path from "path";
import * as vscode from 'vscode';
import * as http from "http";
import * as ws from "ws";
import * as latex_workshop from './extension';
import * as latex_data from './data';
import {compile} from './compile';
import {find_main_document} from './utilities';

var fs = require('fs');
var cursor_uri;
var cursor_position;

export function preview(file_uri, column) {
    find_main_document();
    file_uri = vscode.Uri.file(latex_data.main_document);

    if (!column)
        switch (vscode.window.activeTextEditor.viewColumn) {
            case vscode.ViewColumn.One: return preview(file_uri, vscode.ViewColumn.Two);
            case vscode.ViewColumn.Two: return preview(file_uri, vscode.ViewColumn.Three);
            default: return preview(file_uri, vscode.ViewColumn.One);
        }

    if (!fs.existsSync(texUri2PdfFile(file_uri))) {
        compile();
    }

    var uri = file_uri.with({scheme:'latex-workshop-preview'});
    var title = "Preview";
    try {
        cursor_uri = vscode.window.activeTextEditor.document.uri;
        cursor_position = vscode.window.activeTextEditor.selection.active;
    } catch (e) {

    }
    //console.log(uri)

    vscode.commands.executeCommand("vscode.previewHtml", uri, column, title);
}

export function source(preview_uri) {
    var uri = preview_uri.with({scheme: "file"});
    for (var editor of vscode.window.visibleTextEditors) {
        if (editor.document.uri.toString() === uri.toString()) {
            return vscode.window.showTextDocument(editor.document, editor.viewColumn);
        }
    }
    return vscode.workspace.openTextDocument(uri).then(vscode.window.showTextDocument);
}

export async function inPreview(uri, position) {
    find_main_document();
    if (!latex_workshop.has_synctex) return;
    uri = uri || vscode.window.activeTextEditor.document.uri;
    position = position || vscode.window.activeTextEditor.selection.active;
    if (!uri || !position) return;

    let cmd = `synctex view -i "${position.line + 1}:${position.character + 1}:${uri.fsPath}" -o "${tex2PdfFile(latex_data.main_document)}"`;
    
    let promise = require('child-process-promise').exec(cmd);
    let record = {};
    await promise
    .then((child) => {
        record = parseSyncTex(child.stdout);
        for (let [candidate, path] of latex_workshop.preview_provider.clients.entries()) {
            if (decodeURI(path) != tex2PdfFile(latex_data.main_document)) continue;
            candidate.send(JSON.stringify({type:"synctex", data:record}))
        }
    })
    .catch((err) => {
        console.log(err.stack)
        latex_workshop.workshop_output.clear();
        latex_workshop.workshop_output.append(String(err));
        latex_workshop.workshop_output.show();
        vscode.window.showErrorMessage(`Synctex returned error code ${err.code}. See LaTeX Workshop log for details.`);
    })
}

function tex2PdfFile(file: string): string {
    return path.join(path.dirname(file), path.basename(file, '.tex') + '.pdf');
}

function texUri2PdfFile(uri: vscode.Uri): string {
    return path.join(path.dirname(uri.fsPath), path.basename(uri.fsPath, '.tex') + '.pdf');
}

function parseSyncTex(out: string) {
    let record = {};
    let log_start = false;
    for (let line of out.split("\n")) {
        if (line.indexOf("SyncTeX result begin") >= 0) {
            log_start = true;
            continue;
        } else if (line.indexOf("SyncTeX result end") >= 0) {
            break;
        } else if (!log_start) {
            continue;
        }
        let idx = line.indexOf(':');
        if (idx < 0) {
            continue;
        }
        if (record.hasOwnProperty(line.substr(0, idx).toLowerCase())) break;
        record[line.substr(0, idx).toLowerCase()] = line.substr(idx + 1);
    }
    return record;
}

export class previewProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private resource_path;
    private http_server;
    private ws_server;
    private listening;
    public clients = new Map<ws, string>();
    private exec = require('child_process').exec;

    constructor(private context) {
        this.resource_path = file => this.context.asAbsolutePath(file);
        this.http_server = http.createServer();
        this.ws_server = ws.createServer({server: this.http_server});
        this.listening = new Promise((c, e) => this.http_server.listen(0, "localhost", undefined, err => err ? e(err) : c()));
        this.ws_server.on("connection", client => {
            client.on("message", this.onClientMessage.bind(this, client));
            client.on("close", this.onClientClose.bind(this, client));
        });
    }

    dispose() {}

    private async onClientMessage(client, msg) {
        let data = JSON.parse(msg);

        switch (data.type) {
            case "open":
                this.clients.set(client, data.path);
                break;
            case "click":
                if (!latex_workshop.has_synctex) break;
                let cmd = `synctex edit -o "${data.page}:${data.pos[0]}:${data.pos[1]}:${decodeURIComponent(data.path)}"`;
                
                let promise = require('child-process-promise').exec(cmd);
                let record = {};
                await promise
                .then((child) => {
                    record = parseSyncTex(child.stdout);
                })
                .catch((err) => {
                    latex_workshop.workshop_output.clear();
                    latex_workshop.workshop_output.append(String(err));
                    latex_workshop.workshop_output.show();
                    vscode.window.showErrorMessage(`Synctex returned error code ${err.code}. See LaTeX Workshop log for details.`);
                })
                if (!record) break;
                let col = (record["column"] > 0) ? record["column"] - 1 : 0;
                let row = record["line"] - 1;
                let pos = new vscode.Position(row, col);

                let doc = await vscode.workspace.openTextDocument(record["input"].replace(/(\r\n|\n|\r)/gm,""));
                let editor = await vscode.window.showTextDocument(doc);
                editor.selection = new vscode.Selection(pos, pos);
                await vscode.commands.executeCommand("revealLine", {lineNumber: row, at: 'center'});
                break;
            case "pagesloaded":
                inPreview(cursor_uri, cursor_position);
                break;
            default:
                console.log(`Unknown command received: ${data.type}`)
                break;
        }
    }
    private onClientClose(client) {
        for (let [candidate, path] of this.clients.entries()) {
            if (candidate == client) {
                this.clients.delete(candidate);
            }
        }
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    public update(uri: vscode.Uri) {
        try {
            cursor_uri = vscode.window.activeTextEditor.document.uri;
            cursor_position = vscode.window.activeTextEditor.selection.active;
        } catch (e) {

        }
        if (!uri)
            uri = vscode.window.activeTextEditor.document.uri;
        uri = uri.with({scheme:'latex-workshop-preview'})
        this._onDidChange.fire(uri);
    }

    public async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        var file = texUri2PdfFile(uri);
        var {address, port} = this.http_server.address();
        var websocket_addr = `ws://${address}:${port}`;
        return `
<!DOCTYPE html><html><head></head>
<body>
<iframe class="preview-panel" src="file://${this.resource_path('pdfjs/web/viewer.html')}?file=${encodeURIComponent(file)}&server=${websocket_addr}&path=${file}" style="position:absolute; border: none; left: 0; top: 0; width: 100%; height: 100%;"></iframe>
</body>
</html>`;
    }
}