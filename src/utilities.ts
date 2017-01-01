'use strict';

import * as path from "path";
import * as vscode from 'vscode';
import * as latex_workshop from './extension';
import * as latex_data from './data';

var fs = require('fs');

export function find_citation_keys() {
    var reg = /\\bibliography{(.*?)}/g;
    var text = vscode.window.activeTextEditor.document.getText();
    var bib;
    var keys = []
    function parse_keys(data) {
        var key, key_reg = /\@\w+\{(.*?),/g;
        while (key = key_reg.exec(data)) {
            key = key[1]
            if (keys.indexOf(key) < 0) {
                keys.push(key);
            }
        }
    }
    while (bib = reg.exec(text)) {
        var file = path.join(path.dirname(vscode.window.activeTextEditor.document.uri.fsPath), path.basename(bib[1], '.bib') + '.bib')
        if (!fs.existsSync(file)) continue;
        if (latex_data.get_citation_keys().length == 0) {
            var buffer = fs.readFileSync(file);
            parse_keys(buffer);
            latex_data.set_citation_keys(keys);
        } else {
            fs.readFile(file, (err, data) => {
                if (err) return;
                parse_keys(data);
                latex_data.set_citation_keys(keys);
            })
        }
    }
}

export function find_label_keys() {
    var reg = /\\label{(.*?)}/g;
    var text = vscode.window.activeTextEditor.document.getText();
    var keys = [];
    var key;
    // Parse in document labels
    while (key = reg.exec(text)) {
        key = key[1]
        if (keys.indexOf(key) < 0) {
            keys.push(key);
        }
    }
    // Parse aux labels
    let uri = vscode.window.activeTextEditor.document.uri;
    let aux_file = path.join(path.dirname(uri.fsPath), path.basename(uri.fsPath, '.tex') + '.aux');
    if (fs.existsSync(aux_file)) {
        function parse_keys(data) {
            var key, key_reg = /\\newlabel{(.*?)}/g;
            while (key = key_reg.exec(data)) {
                key = key[1]
                if (keys.indexOf(key) < 0) {
                    keys.push(key);
                }
            }
        }
        if (latex_data.get_label_keys().length == 0) {
            var buffer = fs.readFileSync(aux_file);
            parse_keys(buffer);
            latex_data.set_label_keys(keys);
        } else {
            fs.readFile(aux_file, (err, data) => {
                if (err) return;
                parse_keys(data);
                latex_data.set_label_keys(keys);
            })
        }
    }
}