import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import glob from 'glob'
import minimatch from 'minimatch'
import * as cs from 'cross-spawn'

import type {Extension} from '../main'

export class Cleaner {
    private readonly extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    async clean(rootFile?: string): Promise<void> {
        if (!rootFile) {
            if (this.extension.manager.rootFile !== undefined) {
                await this.extension.manager.findRoot()
            }
            rootFile = this.extension.manager.rootFile
            if (!rootFile) {
                this.extension.logger.addLogMessage('Cannot determine the root file to be cleaned.')
                return
            }
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const cleanMethod = configuration.get('latex.clean.method') as string
        switch (cleanMethod) {
            case 'glob':
                return this.cleanGlob(rootFile)
            case 'cleanCommand':
                return this.cleanCommand(rootFile)
            default:
                this.extension.logger.addLogMessage(`Unknown cleaning method: ${cleanMethod}`)
                return
        }
    }

    /**
     * Removes files in `outDir` matching the glob patterns.
     *
     * Also removes empty folders explicitly specified by the glob pattern. We
     * only remove folders that are empty and the folder glob pattern is added
     * intentionally by the user. Otherwise, the folders will be ignored.
     */
    private async cleanGlob(rootFile: string): Promise<void> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(rootFile))
        let globs = configuration.get('latex.clean.fileTypes') as string[]
        const outdir = path.resolve(path.dirname(rootFile), this.extension.manager.getOutDir(rootFile))
        if (configuration.get('latex.clean.subfolder.enabled') as boolean) {
            globs = globs.map(globType => './**/' + globType)
        }
        globs = Array.from(new Set(globs))  // remove duplicate entries
        this.extension.logger.addLogMessage(`Clean glob matched files: ${JSON.stringify({globs, outdir})}`)

        // Glob patterns into path results and remove the duplicates
        const uniqueGlobedPathResults: Set<string> = new Set(  // unique paths
            globs.map(g => glob.sync(g, {cwd: outdir}))
                 // Reduce the array of arrays to a single array containing all the files that should be deleted
                 .reduce((all, curr) => all.concat(curr), [])
        )
        // Resolve absolute path before removing anything (for symlinked paths)
        // (globPathResult) => (globPathResult, realPath)
        // Here we re-add a tailing slash if the glob result is a directory (`path.resolve()` removes trailing slashes)
        // We use the re-added tailing slash to split results into to arrays in below
        const allPathPairs: [string, string][] = Array.from(uniqueGlobedPathResults)
            .map((globPathResult: string): [string, string] => {
                const tailing: string = globPathResult.endsWith(path.sep) ? path.sep : ''
                return [globPathResult, path.resolve(outdir, globPathResult) + tailing]
            })

        // Helper set to speed up the lookup process in the `filter` method below
        // 'abc' and 'abc/' are different elements here
        const uniqueRealPaths: Set<string> = new Set(allPathPairs.map(([_, realPath]) => realPath))

        // Pattern  `abc/` matches folder "abc/" while `abc/**` matches the same folder as "abc"
        // Remove the duplicates and keep the folder paths with tailing slashes
        const pathPairsToRemove: [string, string][] = allPathPairs.filter(
            ([_, realPath]) => !uniqueRealPaths.has(realPath + path.sep)
        )

        await this.cleanGlobFiles(pathPairsToRemove)
        await this.cleanGlobFolders(globs, pathPairsToRemove)
    }

    private async cleanGlobFiles(pathPairsToRemove: [string, string][]) {
        // Partition the result into to arrays by whether the path ends with a slash (`path.sep`)
        // NOTE: The the array for files below may contain directories because we haven't checked it with `fs.stat` yet
        //       But it should be fine because we won't remove the directories in the array because it don't end with a slash
        const filePathsToRemove: string[] = pathPairsToRemove.filter(
            ([_, realPath]) => !realPath.endsWith(path.sep)  // not using `fs.stat` yet and the element could be a directory
        ).map(([_, realPath]) => realPath)

        // Remove files
        for (const realPath of filePathsToRemove) {
            try {
                const stats: fs.Stats = fs.statSync(realPath)
                if (stats.isFile()) {
                    await fs.promises.unlink(realPath)
                    this.extension.logger.addLogMessage(`Cleaning file: ${realPath}`)
                } else if (stats.isDirectory()) {
                    this.extension.logger.addLogMessage(`Not removing folder that is not explicitly specified: ${realPath}`)
                } else {
                    this.extension.logger.addLogMessage(`Not removing non-file: ${realPath}`)
                }
            } catch (err) {
                this.extension.logger.addLogMessage(`Error cleaning path: ${realPath}`)
                if (err instanceof Error) {
                    this.extension.logger.logError(err)
                }
            }
        }
    }

    private async cleanGlobFolders(globs: string[], pathPairsToRemove: [string, string][]) {
        // All glob patterns EXPLICITLY given for folders, the glob should be end with a slash (`path.sep`) and the last component should not contain globstar `**`
        // Positive examples: ['abc/', 'abc*/', '**/abc*/', 'abc/**/def/', 'abc/**/def*/']
        // Negative examples:
        //   - not end with a slash: ['abc', 'abc*', 'abc/**/def*']
        //   - contain globstar `**` in the last component: ['**', '**/', 'abc/**', 'abc/**/', 'abc/def**/', 'abc/d**ef/']
        const explicitFolderGlobs: string[] = globs.filter(globType => globType.endsWith(path.sep) && !path.basename(globType).includes('**'))
        const matchExplicitFolderGlobs = (folder: string): boolean => explicitFolderGlobs.some(globType => minimatch(folder, globType))
        // Each folder path should match at least one EXPLICIT folder glob pattern
        // NOTE: All elements in this array is a directory because they are globed by patterns with tailing slashes.
        const explicitFolderPathsToRemove: string[] = pathPairsToRemove.filter(
            ([globPathResult, realPath]) => realPath.endsWith(path.sep) && matchExplicitFolderGlobs(globPathResult)
        ).map(([_, realPath]) => realPath)
        // Sort by descending dictionary order, make sure the children folders are sorted before the parents
        // For example: [..., 'out/folder1/folder2/', 'out/folder1/', ...] ('out/folder1/folder2/' > 'out/folder1/' in directory order)
        .sort((a, b) => b.localeCompare(a))

        // Remove empty folders EXPLICITLY specified
        for (const folderRealPath of explicitFolderPathsToRemove) {
            try {
                // We are sure that this is a folder because it's globed by pattern with a trailing slash
                // Only check emptiness
                if (fs.readdirSync(folderRealPath).length === 0) {
                    await fs.promises.rmdir(folderRealPath)
                    this.extension.logger.addLogMessage(`Removing empty folder: ${folderRealPath}`)
                } else {
                    this.extension.logger.addLogMessage(`Not removing non-empty folder: ${folderRealPath}`)
                }
            } catch (err) {
                this.extension.logger.addLogMessage(`Error cleaning folder: ${folderRealPath}`)
                if (err instanceof Error) {
                    this.extension.logger.logError(err)
                }
            }
        }
    }

    private cleanCommand(rootFile: string): Promise<void> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(rootFile))
        const command = configuration.get('latex.clean.command') as string
        let args = configuration.get('latex.clean.args') as string[]
        if (args) {
            args = args.map(arg => arg.replace('%TEX%', rootFile))
        }
        this.extension.logger.logCommand('Clean temporary files command', command, args)
        return new Promise((resolve, _reject) => {
            const proc = cs.spawn(command, args, {cwd: path.dirname(rootFile), detached: true})
            let stderr = ''
            proc.stderr.on('data', newStderr => {
                stderr += newStderr
            })
            proc.on('error', err => {
                this.extension.logger.addLogMessage(`Cannot run ${command}: ${err.message}, ${stderr}`)
                if (err instanceof Error) {
                    this.extension.logger.logError(err)
                }
                resolve()
            })
            proc.on('exit', exitCode => {
                if (exitCode !== 0) {
                    this.extension.logger.addLogMessage(`The clean command failed with exit code ${exitCode}`)
                    this.extension.logger.addLogMessage(`Clean command stderr: ${stderr}`)
                }
                resolve()
            })

        })

    }
}
