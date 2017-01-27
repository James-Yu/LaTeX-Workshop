'use strict';

import * as path from "path"
import * as vscode from 'vscode';
import * as latex_workshop from './extension';
import * as latex_data from './data';
import {getPreviewPosition} from './preview';
import {find_main_document} from './utilities';

var requirejs = require('requirejs');
requirejs.config({
    nodeRequire: require
});

var compiling = false,
    to_compile = false;

export async function compile(on_save=true) {
    vscode.workspace.saveAll();
    find_main_document();
    getPreviewPosition();

    if (latex_data.main_document == undefined) return;

    // Develop file name related variables
    let uri = vscode.Uri.file(latex_data.main_document);

    // Wait if currently compiling
    if (compiling) {
        to_compile = true;
        return;
    } else {
        compiling = true;
        to_compile = false;
    }

    // Initialize
    latex_workshop.latex_output.clear();
    latex_workshop.workshop_output.clear();

    // Sequentially execute all commands
    var configuration = vscode.workspace.getConfiguration('latex-workshop');
    let cmds = configuration.get('compile_workflow') as Array<string>;
    let error_occurred = false;
    var log_content;
    for (let cmd_idx = 0; cmd_idx < cmds.length; ++cmd_idx){
        // Parse placeholder
        let cmd = cmds[cmd_idx];
        cmd = replace_all(cmd, '%compiler%', configuration.get('compiler'));
        cmd = replace_all(cmd, '%arguments%', configuration.get('compile_argument'));
        cmd = replace_all(cmd, '%document%', '"' + path.basename(latex_data.main_document, '.tex') + '"');
        vscode.window.setStatusBarMessage(`LaTeX compilation step ${cmd_idx + 1}: ${cmd}`, 3000);

        // Execute command
        let promise = require('child-process-promise').exec(cmd, {cwd:path.dirname(latex_data.main_document)});
        let child = promise.childProcess;
        log_content = '';
        child.stdout.on('data', (data) => {
            latex_workshop.latex_output.append(data);
            log_content += data;
        });
        // Wait command finish
        await promise.catch((err) => {
            latex_workshop.workshop_output.append(String(err));
            latex_workshop.workshop_output.show();
            vscode.window.showErrorMessage(`LaTeX compilation step ${cmd_idx + 1} exited with error code ${err.code}. See LaTeX Workshop and LaTeX raw log for details.`);
            error_occurred = true;
        });

        // Terminate if error
        if (error_occurred) {
            to_compile = false;
            break;
        }
    }

    var LatexLogParser = require(latex_workshop.find_path('lib/latex-log-parser'));
    var entries = LatexLogParser.parse(log_content);
    var entry_tag = {
        'typesetting': 'T',
        'warning': 'W',
        'error': 'E'
    }
    var log_level = configuration.get('log_level');
    if (entries.all.length > 0) {
        latex_workshop.workshop_output.show();
        latex_workshop.workshop_output.append('\n------------\nLaTeX Log Parser Result\n');
        for (var entry of entries.all) {
            if ((entry.level == 'typesetting' && log_level == 'all') ||
                (entry.level == 'warning' && log_level != 'error') ||
                (entry.level == 'error'))
            latex_workshop.workshop_output.append(`[${entry_tag[entry.level]}][${entry.file}:${entry.line}] ${entry.message}\n`)
        }
    }

    // Succeed in all steps
    if (!error_occurred) {
        vscode.window.setStatusBarMessage('LaTeX compiled.', 3000);
        latex_workshop.preview_provider.update(uri);
    }
    compiling = false;
    if (to_compile) compile();
}

function replace_all(str, from, to) {
    return str.split(from).join(to);
}
