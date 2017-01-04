'use strict';

import * as path from "path"
import * as vscode from 'vscode';
import * as latex_workshop from './extension';
import * as latex_data from './data';
import {find_main_document} from './utilities';

var compiling = false,
    to_compile = false;

export async function compile(non_tex_alert=false) {
    vscode.workspace.saveAll();
    find_main_document();
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
    let cmds = latex_workshop.configuration.compile_workflow;
    let error_occurred = false;
    for (let cmd_idx = 0; cmd_idx < cmds.length; ++cmd_idx){
        // Parse placeholder
        let cmd = cmds[cmd_idx];
        cmd = replace_all(cmd, '%compiler%', latex_workshop.configuration.compiler);
        cmd = replace_all(cmd, '%arguments%', latex_workshop.configuration.compile_argument);
        cmd = replace_all(cmd, '%document%', '"' + path.basename(latex_data.main_document, '.tex') + '"');
        vscode.window.setStatusBarMessage(`LaTeX compilation step ${cmd_idx + 1}: ${cmd}`, 3000);

        // Execute command
        let promise = require('child-process-promise').exec(cmd, {cwd:path.dirname(latex_data.main_document)});
        let child = promise.childProcess;
        child.stdout.on('data', (data) => latex_workshop.latex_output.append(data));

        // Wait command finish
        await promise.catch((err) => {
            latex_workshop.workshop_output.append(String(err));
            latex_workshop.latex_output.show();
            vscode.window.showErrorMessage(`LaTeX compilation step ${cmd_idx + 1} exited with error code ${err.code}. See LaTeX Workshop and LaTeX raw log for details.`);
            error_occurred = true;
        });

        // Terminate if error
        if (error_occurred) {
            to_compile = false;
            break;
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
