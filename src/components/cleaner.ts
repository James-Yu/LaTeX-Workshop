import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import glob from 'glob'
import * as cs from 'cross-spawn'

import type {Extension} from '../main'


/**
 * Removes the duplicate elements. Note that the order of the sequence will not be preserved.
 */
function unique(sequence: string[]): string[] {
    return Array.from(new Set(sequence))
}

/**
 * Globs all given patterns into absolute paths. The result will be sorted in
 * reverse order and all tailing slashes will be stripped.
 */
function globAll(globs: string[], cwd: string): string[] {
    return unique(
        globs.map(g => glob.sync(g, { cwd }))
             // Reduce the array of arrays to a single array containing all the elements
             .reduce((all, curr) => all.concat(curr), [])
             // Resolve absolute path (tailing slashes will be stripped)
             .map((globedPath: string): string => path.resolve(cwd, globedPath))
    )
    // Sort in descending dictionary order, make sure the children are sorted before the parents
    // For example: [..., 'out/folder1/folder2/', 'out/folder1/', ...] ('out/folder1/folder2/' > 'out/folder1/' in directory order)
    .sort((a, b) => b.localeCompare(a))
}

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
     * Splits the given glob patterns into three groups (duplicates will be ignored)
     *   1. file globs (not end with tailing slashes)
     *   2. globs explicitly for folders
     *   3. folder globs with globstar (`**`)
     *
     * We will remove the <1.> type paths if they are files, remove the <2.> type
     * paths if they are empty folders, and ignore the <3.> type paths.
     *
     * @param globs a list of glob patterns
     * @returns three groups of glob patterns
     */
    private static splitGlobs(globs: string[]): [string[], string[], string[]] {
        const fileGlobs: string[] = []
        const folderGlobsWithGlobStar: string[] = []
        const folderGlobsExplicit: string[] = []

        for (const pattern of unique(globs)) {
            if (pattern.endsWith(path.sep)) {
                // The pattern ends with a slash only matches folders
                if (path.basename(pattern).includes('**')) {
                    // Contains globstar `**` in the last component
                    folderGlobsWithGlobStar.push(pattern)
                }
                else {
                    // All glob patterns EXPLICITLY given for folders, the glob should be end with a slash (`path.sep`)
                    // and the last component should not contain globstar`**`
                    //
                    // Positive examples: ['abc/', 'abc*/', '**/abc*/', 'abc/**/def/', 'abc/**/def*/']
                    // Negative examples:
                    //   - not end with a slash: ['abc', 'abc*', 'abc/**/def*']
                    //   - contain globstar `**` in the last component: ['**', '**/', 'abc/**', 'abc/**/', 'abc/def**/', 'abc/d**ef/']
                    folderGlobsExplicit.push(pattern)
                }
            } else {
                // The pattern can match both files and folders
                fileGlobs.push(pattern)
            }
        }

        return [fileGlobs, folderGlobsExplicit, folderGlobsWithGlobStar]
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
        this.extension.logger.addLogMessage(`Clean glob matched files: ${JSON.stringify({globs, outdir})}`)

        const [fileGlobs, folderGlobsExplicit, folderGlobsWithGlobStar] = Cleaner.splitGlobs(globs)

        this.extension.logger.addLogMessage(`Ignore folder glob patterns with globstar: ${folderGlobsWithGlobStar}`)

        // All folders explicitly specified by the user, remove them if empty after cleaning files
        const explicitFolders: string[] = globAll(folderGlobsExplicit, outdir)

        // All files to remove. Note that the file globs can match directories, we will check it with `fs.stat`
        // Pattern `abc/**` can match folder as "abc", remove duplicates
        const explicitFoldersSet: Set<string> = new Set(explicitFolders)
        const files: string[] = globAll(fileGlobs, outdir).filter(file => !explicitFoldersSet.has(file))

        // Remove files first
        for (const realPath of files) {
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

        // Then remove empty folders EXPLICITLY specified
        for (const folderRealPath of explicitFolders) {
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
