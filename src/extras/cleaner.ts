import * as path from 'path'
import * as fs from 'fs'
import { glob } from 'glob'
import { lw } from '../lw'
import { replaceArgumentPlaceholders } from '../utils/utils'

const logger = lw.log('Cleaner')
const FIXED_CLEAN_FILE_TYPES = [
    '%DOCFILE%.aux',
    '%DOCFILE%.bbl',
    '%DOCFILE%.blg',
    '%DOCFILE%.idx',
    '%DOCFILE%.ind',
    '%DOCFILE%.lof',
    '%DOCFILE%.lot',
    '%DOCFILE%.out',
    '%DOCFILE%.toc',
    '%DOCFILE%.acn',
    '%DOCFILE%.acr',
    '%DOCFILE%.alg',
    '%DOCFILE%.glg',
    '%DOCFILE%.glo',
    '%DOCFILE%.gls',
    '%DOCFILE%.fls',
    '%DOCFILE%.log',
    '%DOCFILE%.fdb_latexmk',
    '%DOCFILE%.snm',
    '%DOCFILE%.synctex(busy)',
    '%DOCFILE%.synctex.gz(busy)',
    '%DOCFILE%.nav',
    '%DOCFILE%.vrb'
]

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

function globAllMultipleCwds(globs: string[], cwds: string[]): string[] {
    return unique(
        cwds.map(cwd => globAll(globs, cwd)).flat()
    ).sort((a, b) => b.localeCompare(a))
}


async function clean(rootFile?: string): Promise<void> {
    if (!rootFile) {
        rootFile = await lw.root.resolveSecurityRoot()
        if (!rootFile) {
            logger.log('Cannot determine the root file to be cleaned.')
            return
        }
    }
    return cleanGlob(rootFile)
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
 * Removes files in `outDir` and `auxDir` matching the glob patterns.
 *
 * Also removes empty folders explicitly specified by the glob pattern. We
 * only remove folders that are empty and the folder glob pattern is added
 * intentionally by the user. Otherwise, the folders will be ignored.
 */
async function cleanGlob(rootFile: string): Promise<void> {
    const globs = FIXED_CLEAN_FILE_TYPES
        .map(globType => replaceArgumentPlaceholders(rootFile, lw.file.tmpDirPath)(globType))
    const outdir = path.resolve(path.dirname(rootFile), lw.file.getSecurityOutDir(rootFile))
    logger.log(`Clean glob matched files ${JSON.stringify({globs, outdir})} .`)
    const auxdir = path.resolve(path.dirname(rootFile), lw.file.getSecurityAuxDir(rootFile))
    logger.log(`Clean glob matched files ${JSON.stringify({globs, auxdir})} .`)

    const { fileOrFolderGlobs, folderGlobsExplicit, folderGlobsWithGlobstar } = splitGlobs(globs)
    logger.log(`Ignore folder glob patterns with globstar: ${folderGlobsWithGlobstar} .`)

    const explicitFolders: string[] = globAllMultipleCwds(folderGlobsExplicit, [auxdir,outdir])
    const explicitFoldersSet: Set<string> = new Set(explicitFolders)
    const filesOrFolders: string[] = globAllMultipleCwds(fileOrFolderGlobs, [auxdir, outdir]).filter(file => !explicitFoldersSet.has(file))

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
            logger.refreshStatus('x', 'errorForeground', `Cleaning failed: ${err}`, 'error')
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
