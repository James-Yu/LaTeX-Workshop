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
var open = require('open');
var client = undefined;
var position = undefined;
var http_server;
var ws_server;
var listening;
var in_browser_url = undefined;

export function create_server(context) {
    var html_file = context.asAbsolutePath('pdfjs')
    http_server = http.createServer((request, response) => {
        if (request.url.indexOf('/pdf-preview') < 0) {
            var file = path.join(html_file, request.url.split('?')[0])
            var extname = path.extname(file);
            var contentType = 'text/html';
            switch (extname) {
                case '.js':
                    contentType = 'text/javascript';
                    break;
                case '.css':
                    contentType = 'text/css';
                    break;
                case '.json':
                    contentType = 'application/json';
                    break;
                case '.png':
                    contentType = 'image/png';
                    break;      
                case '.jpg':
                    contentType = 'image/jpg';
                    break;
            }
            fs.readFile(file, function(error, content) {
                if (error) {
                    if(error.code == 'ENOENT'){
                        response.writeHead(404);
                        response.end(); 
                    }
                    else {
                        response.writeHead(500);
                        response.end(); 
                    }
                }
                else {
                    response.writeHead(200, { 'Content-Type': contentType });
                    response.end(content, 'utf-8');
                }
            });
        } else {
            find_main_document();
            var file = tex2PdfFile(latex_data.main_document)
            var stat = fs.statSync(file);
            response.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-Length': stat.size
            });
            fs.createReadStream(file).pipe(response)
        }
    });
    ws_server = ws.createServer({server: http_server});
    listening = new Promise((c, e) => http_server.listen(0, "localhost", undefined, err => {
        if (err)
            e(err)
        else {
            var {address, port} = http_server.address();
            in_browser_url = `http://${address}:${port}/web/viewer.html?file=pdf-preview`
            c()
        }
    }));
    ws_server.on("connection", ws => {
        ws.on("message", onClientMessage);
        ws.on("close", onClientClose);
    });
}

async function onClientMessage(msg) {
    let ws = this
    let data = JSON.parse(msg);

    switch (data.type) {
        case "open":
            client = ws;
            break;
        case "click":
            if (!latex_workshop.has_synctex) break;
            let cmd = `synctex edit -o "${data.page}:${data.pos[0]}:${data.pos[1]}:${tex2PdfFile(latex_data.main_document)}"`;
            
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

            let file = path.join(path.dirname(latex_data.main_document), record["input"].replace(/(\r\n|\n|\r)/gm,""));
            let doc = await vscode.workspace.openTextDocument(file);
            let editor = await vscode.window.showTextDocument(doc);
            editor.selection = new vscode.Selection(pos, pos);
            await vscode.commands.executeCommand("revealLine", {lineNumber: row, at: 'center'});
            break;
        case "loaded":
            if (position != undefined)
                client.send(JSON.stringify(position));
            break;
        case "position":
            position = data;
            break;
        default:
            console.log(`Unknown command received: ${data.type}`)
            break;
    }
}

function onClientClose() {
    client = undefined
}

export function preview_browser() {
    if (in_browser_url == undefined) {
        vscode.window.showErrorMessage(`Please wait for a few seconds for file server initialization`);
        return;
    }
    find_main_document();
    if (!fs.existsSync(tex2PdfFile(latex_data.main_document))) {
        compile();
    }
    open(in_browser_url);
}

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
    if (client == undefined) return;
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
        client.send(JSON.stringify({type:"synctex", data:record}))
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

export function getPreviewPosition() {
    if (client != undefined)
        client.send(JSON.stringify({type:"get_position"}));
}

export class previewProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private resource_path;
    private exec = require('child_process').exec;

    constructor(private context) {
        this.resource_path = file => this.context.asAbsolutePath(file);
    }

    dispose() {}

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    public update(uri: vscode.Uri) {
        if (client != undefined)
            client.send(JSON.stringify({type:"refresh"}))
        if (!uri)
            uri = vscode.window.activeTextEditor.document.uri;
        uri = uri.with({scheme:'latex-workshop-preview'})
        this._onDidChange.fire(uri);
    }

    public async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        var file = texUri2PdfFile(uri);
        var {address, port} = http_server.address();
        var websocket_addr = `ws://${address}:${port}`;
        return `
<!DOCTYPE html style="position:absolute; left: 0; top: 0; width: 100%; height: 100%;"><html><head></head>
<body style="position:absolute; left: 0; top: 0; width: 100%; height: 100%;">
<iframe class="preview-panel" src="file://${this.resource_path('pdfjs/web/viewer.html')}?file=${encodeURIComponent(file)}&server=${websocket_addr}" style="position:absolute; border: none; left: 0; top: 0; width: 100%; height: 100%;"></iframe>
</body>
</html>`;
    }
}