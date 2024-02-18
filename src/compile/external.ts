import vscode from 'vscode'
import { replaceArgumentPlaceholders } from '../utils/utils'

import { lw } from '../lw'
import type { Tool } from '../types'
import { queue } from './queue'

/**
 * Build LaTeX project using external command. This function creates a
 * {@link Tool} containing the external command info and adds it to the
 * queue. After that, this function tries to initiate a {@link buildLoop} if
 * there is no one running.
 *
 * @param {string} command - The command to execute for building the project.
 * @param {string[]} args - The arguments to pass to the build command.
 * @param {string} pwd - The current working directory for the build.
 * @param {() => Promise<void>} buildLoop - A function that represents the build loop.
 * @param {string} [rootFile] - Optional. The root file for the build.
 */
export async function build(command: string, args: string[], pwd: string, buildLoop: () => Promise<void>, rootFile?: string) {
    // Save all open files in the workspace
    await vscode.workspace.saveAll()

    // Determine the current working directory for the build
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
    const cwd = workspaceFolder?.uri.fsPath || pwd

    // Replace argument placeholders if a root file is provided
    if (rootFile !== undefined) {
        args = args.map(replaceArgumentPlaceholders(rootFile, lw.file.tmpDirPath))
    }

    // Create a Tool object representing the build command and arguments
    const tool: Tool = { name: command, command, args }

    // Add the build tool to the queue for execution
    queue.add(tool, rootFile, 'External', Date.now(), true, cwd)

    lw.compile.compiledPDFPath = rootFile ? lw.file.getPdfPath(rootFile) : ''
    // Execute the build loop
    await buildLoop()
}
