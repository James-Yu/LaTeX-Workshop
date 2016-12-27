'use strict';

import * as vscode from 'vscode';
import * as latex_workshop from './extension';

var compiling = false,
    to_compile = false;

export default function compile_try() {
    try {
        compile()
    } catch (e) {
        vscode.window.showErrorMessage('Unexpected '+ e.name +' occurred. See LaTeX Workshop log for details.');
        latex_workshop.workshop_output.clear();
        latex_workshop.workshop_output.append(e.stack);
        latex_workshop.workshop_output.show();
    }
}

function compile() {
    vscode.workspace.saveAll();

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
    var exec = require('child_process').exec;

    // Develop file name relatex variables
    var file_full_path = vscode.window.activeTextEditor.document.fileName;
    var file_path = (file_full_path.match(/(.*)[\/\\]/)[1] || '') + '/';
    var file_name_ext = file_full_path.replace(/^.*[\\\/]/, '');
    var file_name = file_name_ext.split('.')[0];
    var file_ext = file_name_ext.split('.')[1];
    var file_output = file_path + file_name + '.pdf';

    if (file_ext != 'tex') {
        vscode.window.showErrorMessage('You can only compile LaTeX from a .tex file.');
        return;
    }

    // Change working directory for console commands
    var cmd_change_dir = ((process.platform == "win32")?'cd /d ':'cd ') + '"' + file_path + '" && '

    // Create compilation commands and sequence
    function compile_cmd(cmds, idx) {
        // Create compilation command
        var cmd = cmds[idx];
        cmd = replace_all(cmd, '%compiler%', latex_workshop.configuration.compiler);
        cmd = replace_all(cmd, '%arguments%', latex_workshop.configuration.compile_argument);
        cmd = replace_all(cmd, '%document%', '"' + file_name + '"');
        vscode.window.setStatusBarMessage('LaTeX compilation step ' + String(idx + 1) + ': ' + cmd, 3000);

        // Execute the command, set its callback to the next command
        var out = exec(cmd_change_dir + cmd, (err, stdout, stderr) => {
            // Error code not 0
            if (err && err.code != 0) {
                latex_workshop.workshop_output.append(String(err));
                latex_workshop.latex_output.show();
                vscode.window.showErrorMessage('LaTeX compilation step ' + String(idx + 1) + ' exited with error code ' + err.code + '. See LaTeX Workshop and LaTeX raw log for details.');
                compiling = false;
                to_compile = false;
                return;
            }
            // More commands to come
            if (idx < cmds.length - 1)
                compile_cmd(cmds, idx + 1);
            // Just finished the last one
            else {
                compiling = false;
                if (idx >= cmds.length - 1)
                    vscode.window.setStatusBarMessage('LaTeX compiled.', 3000);
                // User want to compile when compiling
                if (to_compile)
                    compile();
            }
        });

        // Output log to console
        out.stdout.on('data', (data) => latex_workshop.latex_output.append(data));
    }
    compile_cmd(latex_workshop.configuration.compile_workflow, 0)
}

function replace_all(str, from, to) {
    return str.split(from).join(to);
}
