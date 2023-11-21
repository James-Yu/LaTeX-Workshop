import * as vscode from 'vscode'

export async function rootFile(rootFile: string, localRootFile: string, verb: string): Promise<string | undefined> {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(rootFile))
    const doNotPrompt = configuration.get('latex.rootFile.doNotPrompt') as boolean
    if (doNotPrompt) {
        if (configuration.get('latex.rootFile.useSubFile')) {
            return localRootFile
        } else {
            return rootFile
        }
    }
    const pickedRootFile = await vscode.window.showQuickPick([{
        label: 'Default root file',
        description: `Path: ${rootFile}`
    }, {
        label: 'Subfiles package root file',
        description: `Path: ${localRootFile}`
    }], {
        placeHolder: `Subfiles package detected. Which file to ${verb}?`,
        matchOnDescription: true
    }).then( selected => {
        if (!selected) {
            return
        }
        switch (selected.label) {
            case 'Default root file':
                return rootFile
            case 'Subfiles package root file':
                return localRootFile
            default:
                return
        }
    })
    return pickedRootFile
}
