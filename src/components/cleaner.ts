import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import glob from 'glob'
import * as cs from 'cross-spawn'
import * as lw from '../lw'
import {replaceArgumentPlaceholders} from '../utils/utils'

import { getLogger } from './logger'

const logger = getLogger('Cleaner')

/**
 * Removes the duplicate elements. Note that the order of the sequence will not be preserved.
 */
function unique(sequence: string[]): string[] {
    return Array.from(new Set(sequence))
}

/**
 * Globs all given patterns into absolute paths. The result will be sorted in
 * reverse order and all tailing slashes will be stripped.
 *
 * The result is sorted in descending dictionary order, make sure the children are sorted before the parents.
 * For example: [..., 'out/folder1/folder2/', 'out/folder1/', ...] ('out/folder1/folder2/' > 'out/folder1/' in directory order)
 */
function globAll(globs: string[], cwd: string): string[] {
    return unique(
        globs.map(g => glob.sync(g, { cwd }))
             .flat()
             .map((globedPath: string): string => path.resolve(cwd, globedPath))
    ).sort((a, b) => b.localeCompare(a))
}

export class Cleaner {

    async clean(rootFile?: string): Promise<void> {
        if (!rootFile) {
            if (lw.manager.rootFile !== undefined) {
                await lw.manager.findRoot()
            }
            rootFile = lw.manager.rootFile
            if (!rootFile) {
                logger.log('Cannot determine the root file to be cleaned.')
                return
            }
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(rootFile))
        const cleanMethod = configuration.get('latex.clean.method') as string
        switch (cleanMethod) {
            case 'glob':
                return this.cleanGlob(rootFile)
            case 'cleanCommand':
                return this.cleanCommand(rootFile)
            default:
                logger.log(`Unknown cleaning method ${cleanMethod} .`)
                return
        }
    }

    /**
     * Splits the given glob patterns into three distinct groups (duplicates will be ignored)
     *   1. file or folder globs (not end with tailing slashes)
     *   2. globs explicitly for folders
     *   3. folder globs with globstar (`**`)
     *
     * We will remove the <1.> type paths if they are files, remove the <2.> type
     * paths if they are empty folders, and ignore the <3.> type paths.
     *
     * @param globs a list of glob patterns
     * @returns three distinct groups of glob patterns
     */
    private static splitGlobs(globs: string[]): { fileOrFolderGlobs: string[], folderGlobsExplicit: string[], folderGlobsWithGlobstar: string[] } {
        const fileOrFolderGlobs: string[] = []
        const folderGlobsWithGlobstar: string[] = []
        const folderGlobsExplicit: string[] = []

        for (const pattern of unique(globs)) {
            if (pattern.endsWith(path.sep)) {
                if (path.basename(pattern).includes('**')) {
                    folderGlobsWithGlobstar.push(pattern)
                } else {
                    folderGlobsExplicit.push(pattern)
                }
            } else {
                fileOrFolderGlobs.push(pattern)
            }
        }

        return { fileOrFolderGlobs, folderGlobsExplicit, folderGlobsWithGlobstar }
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
        const outdir = path.resolve(path.dirname(rootFile), lw.manager.getOutDir(rootFile))
        if (configuration.get('latex.clean.subfolder.enabled') as boolean) {
            globs = globs.map(globType => './**/' + globType)
        }
        logger.log(`Clean glob matched files ${JSON.stringify({globs, outdir})} .`)

        const { fileOrFolderGlobs, folderGlobsExplicit, folderGlobsWithGlobstar } = Cleaner.splitGlobs(globs)
        logger.log(`Ignore folder glob patterns with globstar: ${folderGlobsWithGlobstar} .`)

        const explicitFolders: string[] = globAll(folderGlobsExplicit, outdir)
        const explicitFoldersSet: Set<string> = new Set(explicitFolders)
        const jobName = (configuration.get('latex-workshop.latex.clean.jobname') as boolean && lw.manager.rootFile) ? lw.manager.jobname(lw.manager.rootFile) : undefined
        const filesOrFolders: string[] = globAll(fileOrFolderGlobs, outdir)
            .filter(file => !explicitFoldersSet.has(file))
            .filter(file => jobName ? path.parse(file).name === jobName : true)

        // Remove files first
        for (const realPath of filesOrFolders) {
            try {
                const stats: fs.Stats = fs.statSync(realPath)
                if (stats.isFile()) {
                    await fs.promises.unlink(realPath)
                    logger.log(`Cleaning file ${realPath} .`)
                } else if (stats.isDirectory()) {
                    logger.log(`Not removing folder that is not explicitly specified ${realPath} .`)
                } else {
                    logger.log(`Not removing non-file ${realPath} .`)
                }
            } catch (err) {
                logger.logError(`Failed cleaning path ${realPath} .`, err)
            }
        }

        // Then remove empty folders EXPLICITLY specified by the user
        for (const folderRealPath of explicitFolders) {
            try {
                if (fs.readdirSync(folderRealPath).length === 0) {
                    await fs.promises.rmdir(folderRealPath)
                    logger.log(`Removing empty folder: ${folderRealPath} .`)
                } else {
                    logger.log(`Not removing non-empty folder: ${folderRealPath} .`)
                }
            } catch (err) {
                logger.logError(`Failed cleaning folder ${folderRealPath} .`, err)
            }
        }
    }

    private cleanCommand(rootFile: string): Promise<void> {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(rootFile))
        const command = configuration.get('latex.clean.command') as string
        let args = configuration.get('latex.clean.args') as string[]
        if (args) {
            args = args.map(arg => { return replaceArgumentPlaceholders(rootFile, lw.manager.tmpDir)(arg)
                // cleaner.ts specific tokens
                .replace(/%TEX%/g, rootFile)
            })
        }
        logger.logCommand('Clean temporary files command', command, args)
        return new Promise((resolve, _reject) => {
            // issue #3679 #3687: spawning with `detached: true` causes latexmk from MiKTeX to fail on Windows when "install on-the-fly" is enabled
            const proc = cs.spawn(command, args, {cwd: path.dirname(rootFile)})
            let stderr = ''
            proc.stderr.on('data', newStderr => {
                stderr += newStderr
            })
            proc.on('error', err => {
                logger.logError(`Failed running cleaning command ${command} .`, err, stderr)
                resolve()
            })
            proc.on('exit', exitCode => {
                if (exitCode !== 0) {
                    logger.logError('The clean command failed.', exitCode, stderr)
                }
                resolve()
            })
        })
    }
}
