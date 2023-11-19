import vscode from 'vscode'
import { replaceArgumentPlaceholders } from '../utils/utils'

import { extension } from '../extension'
import type { Tool } from '.'
import { queue } from './queue'

const logger = extension.log('Build', 'External')

/**
 * Build LaTeX project using external command. This function creates a
 * {@link Tool} containing the external command info and adds it to the
 * queue. After that, this function tries to initiate a {@link buildLoop} if
 * there is no one running.
 *
 * @param command The external command to be executed.
 * @param args The arguments to {@link command}.
 * @param pwd The current working directory. This argument will be overrided
 * if there are workspace folders. If so, the root of the first workspace
 * folder is used as the current working directory.
 * @param rootFile Path to the root LaTeX file.
 */
export async function build(command: string, args: string[], pwd: string, buildLoop: () => Promise<void>, rootFile?: string) {
    if (extension.compile.compiling) {
        void logger.showErrorMessageWithCompilerLogButton('Please wait for the current build to finish.')
        return
    }

    await vscode.workspace.saveAll()

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
    const cwd = workspaceFolder?.uri.fsPath || pwd
    if (rootFile !== undefined) {
        args = args.map(replaceArgumentPlaceholders(rootFile, extension.file.tmpDirPath))
    }
    const tool: Tool = { name: command, command, args }

    queue.add(tool, rootFile, 'External', Date.now(), true, cwd)

    await buildLoop()
}