import * as vscode from 'vscode'

export class SurroundCommand {

    surround(cmdItems: vscode.CompletionItem[]) {
        if (!vscode.window.activeTextEditor) {
            return
        }
        const editor = vscode.window.activeTextEditor
        const candidate: {command: string, detail: string, label: string}[] = []
        cmdItems.forEach(item => {
            if (item.insertText === undefined) {
                return
            }
            if (item.label === '\\begin') { // Causing a lot of trouble
                return
            }
            const command = (typeof item.insertText !== 'string') ? item.insertText.value : item.insertText
            if (command.match(/(.*)(\${\d.*?})/)) {
                const commandStr = command.replace('\\\\', '\\').replace(':${TM_SELECTED_TEXT}', '')
                candidate.push({
                    command: commandStr,
                    detail: '\\' + commandStr.replace(/[\n\t]/g, '').replace(/\$\{(\d+)\}/g, '$$$1'),
                    label: item.label
                })
            }
        })
        void vscode.window.showQuickPick(candidate, {
            placeHolder: 'Press ENTER to surround previous selection with selected command',
            matchOnDetail: false,
            matchOnDescription: false
        }).then(selected => {
            if (selected === undefined) {
                return
            }
            void editor.edit( editBuilder => {
                for (const selection of editor.selections) {
                    const selectedContent = editor.document.getText(selection)
                    const selectedCommand = '\\' + selected.command
                    editBuilder.replace(new vscode.Range(selection.start, selection.end),
                        selectedCommand.replace(/(.*)(\${\d.*?})/, `$1${selectedContent}`) // Replace text
                                       .replace(/\${\d:?(.*?)}/g, '$1')                    // Remove snippet placeholders
                                       .replace('\\\\', '\\')                              // Unescape backslashes, e.g., begin{${1:env}}\n\t$2\n\\\\end{${1:env}}
                                       .replace(/\$\d/, ''))                               // Remove $2 etc
                }
            })
        })
        return
    }

}
