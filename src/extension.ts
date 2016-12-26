'use strict';

import * as vscode from 'vscode';

var configuration;
var latex_output;
var compiling = false;
var to_compile = false;

export function activate(context: vscode.ExtensionContext) {

    console.log('LaTeX Workshop activated.');
    configuration = vscode.workspace.getConfiguration('latex-workshop');
    latex_output = vscode.window.createOutputChannel('LaTeX Raw Output');

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

function compile() {
    if (compiling) {
        to_compile = true;
        return;
    } else {
        compiling = true;
        to_compile = false;
    }
    var exec = require('child_process').exec;
    vscode.workspace.saveAll();

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
    var compile_error = false;
    function compile_cmd(cmds, idx) {
        // Create compilation command
        var cmd = cmds[idx];
        cmd = replace_all(cmd, '%compiler%', configuration.compiler);
        cmd = replace_all(cmd, '%arguments%', configuration.compile_argument);
        cmd = replace_all(cmd, '%document%', '"' + file_name + '"');
        vscode.window.setStatusBarMessage('LaTeX compilation step ' + String(idx + 1) + ': ' + cmd, 3000);

        // Execute the command, set its callback to the next command
        var out = exec(cmd_change_dir + cmd, function(){
            // More commands to come
            if ((idx < cmds.length - 1) && !compile_error)
                compile_cmd(cmds, idx + 1);
            // Just finished the last one
            else {
                compiling = false;
                if (idx >= cmds.length - 1)
                    vscode.window.setStatusBarMessage('LaTeX compiled.', 3000);
                // User want to compile when compiling
                if (to_compile)
                    compile()
            }
        });

        // Detect if error occurs
        out.stdout.on('data', function(data){
            latex_output.append(data);
            if (String(data).toLowerCase().indexOf('error') <= 0 || compile_error)
                return;
            compile_error = true;
            latex_output.show();
            vscode.window.showErrorMessage('An error occurs when compiling LaTeX. See compilation log for details.');
        })
    }
    latex_output.clear();
    compile_cmd(configuration.compile_workflow, 0)
}

function replace_all(str, from, to) {
    return str.split(from).join(to);
}
