'use strict';

import * as vscode from 'vscode';

var output_channel;

export function activate(context: vscode.ExtensionContext) {

    console.log('LaTeX Workshop activated.');
    output_channel = vscode.window.createOutputChannel('LaTeX Workshop');

    // Code heavily borrowed from LaTeXCompile extension
    let compile_func = vscode.commands.registerCommand('latex-workshop.compile', compile);

    context.subscriptions.push(compile_func);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

function compile() {
    // Settings
    var compiler = 'pdflatex',
        args = '-halt-on-error -file-line-error',
        cmds = ['%compiler% %args% %document%',
                'bibtex %document%',
                '%compiler% %args% %document%',
                '%compiler% %args% %document%'];
    
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
        cmd = replace_all(cmd, '%compiler%', compiler);
        cmd = replace_all(cmd, '%args%', args);
        cmd = replace_all(cmd, '%document%', '"' + file_name + '"');
        vscode.window.setStatusBarMessage('LaTeX compilation step ' + String(idx + 1) + ': ' + cmd, 3000);

        // Execute the command, set its callback to the next command
        var out = exec(cmd_change_dir + cmd, function(){
            // More commands to come
            if ((idx < cmds.length - 1) && !compile_error)
                compile_cmd(cmds, idx + 1);
            // Just finished the last one
            else if (idx >= cmds.length - 1)
                vscode.window.setStatusBarMessage('LaTeX compiled.', 3000);
        });

        // Detect if error occurs
        out.stdout.on('data', function(data){
            output_channel.append(data);
            if (String(data).toLowerCase().indexOf('error') <= 0 || compile_error)
                return;
            compile_error = true;
            output_channel.show();
            vscode.window.showErrorMessage('An error occurs when compiling LaTeX. See compilation log for details.');
        })
    }
    output_channel.clear();
    compile_cmd(cmds, 0)
}

function replace_all(str, from, to) {
    return str.split(from).join(to);
}
