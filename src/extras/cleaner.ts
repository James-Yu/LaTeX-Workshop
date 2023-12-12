import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { glob } from 'glob'
import * as cs from 'cross-spawn'
import { lw } from '../lw'
import { replaceArgumentPlaceholders } from '../utils/utils'

const logger = lw.log('Cleaner')

export {
    clean
}

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

async function clean(rootFile?: string): Promise<void> {
    if (!rootFile) {
        if (lw.root.file.path !== undefined) {
            await lw.root.find()
        }
        rootFile = lw.root.file.path
        if (!rootFile) {
            logger.log('Cannot determine the root file to be cleaned.')
            return
        }
    }
    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(rootFile))
    const cleanMethod = configuration.get('latex.clean.method') as string
    switch (cleanMethod) {
        case 'glob':
            return cleanGlob(rootFile)
        case 'cleanCommand':
            await configuration.update('latex.clean.method', 'command')
            void vscode.window.showInformationMessage('The cleaning method `cleanCommand` has been renamed to `command`. Your config is auto-updated.')
            return cleanCommand(rootFile)
        case 'command':
            return cleanCommand(rootFile)
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
function splitGlobs(globs: string[]): { fileOrFolderGlobs: string[], folderGlobsExplicit: string[], folderGlobsWithGlobstar: string[] } {
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
async function cleanGlob(rootFile: string): Promise<void> {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(rootFile))
    const globPrefix = (configuration.get('latex.clean.subfolder.enabled') as boolean) ? './**/' : ''
    const globs = (configuration.get('latex.clean.fileTypes') as string[])
        .map(globType => globPrefix + replaceArgumentPlaceholders(rootFile, lw.file.tmpDirPath)(globType))
    const outdir = path.resolve(path.dirname(rootFile), lw.file.getOutDir(rootFile))
    logger.log(`Clean glob matched files ${JSON.stringify({globs, outdir})} .`)

    const { fileOrFolderGlobs, folderGlobsExplicit, folderGlobsWithGlobstar } = splitGlobs(globs)
    logger.log(`Ignore folder glob patterns with globstar: ${folderGlobsWithGlobstar} .`)

    const explicitFolders: string[] = globAll(folderGlobsExplicit, outdir)
    const explicitFoldersSet: Set<string> = new Set(explicitFolders)
    const filesOrFolders: string[] = globAll(fileOrFolderGlobs, outdir).filter(file => !explicitFoldersSet.has(file))

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

function cleanCommand(rootFile: string): Promise<void> {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(rootFile))
    const command = configuration.get('latex.clean.command') as string
    const args = (configuration.get('latex.clean.args') as string[])
        .map(arg => { return replaceArgumentPlaceholders(rootFile, lw.file.tmpDirPath)(arg)
            // cleaner.ts specific tokens
            .replace(/%TEX%/g, rootFile)
        })
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
