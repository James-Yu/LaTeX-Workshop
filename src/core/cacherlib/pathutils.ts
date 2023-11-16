import * as vscode from 'vscode'
import * as path from 'path'
import * as cs from 'cross-spawn'
import * as fs from 'fs'
import * as lw from '../../lw'
import * as utils from '../../utils/utils'
import { getLogger } from '../../utils/logging/logger'

const logger = getLogger('Cacher', 'Path')

/**
 * Search for a `.fls` file associated to a tex file
 * @param texFile The path of LaTeX file
 * @return The path of the .fls file or undefined
 */
export function getFlsFilePath(texFile: string): string | undefined {
    const rootDir = path.dirname(texFile)
    const outDir = lw.manager.getOutDir(texFile)
    const baseName = path.parse(lw.manager.jobname(texFile)).name
    const flsFile = path.resolve(rootDir, path.join(outDir, baseName + '.fls'))
    if (!fs.existsSync(flsFile)) {
        logger.log(`Non-existent .fls for ${texFile} .`)
        return
    }
    return flsFile
}

export function kpsewhich(args: string[]): string | undefined {
    const command = vscode.workspace.getConfiguration('latex-workshop').get('kpsewhich.path') as string
    logger.log(`Calling ${command} to resolve ${args.join(' ')} .`)

    try {
        const kpsewhichReturn = cs.sync(command, args, {cwd: lw.manager.rootDir || vscode.workspace.workspaceFolders?.[0].uri.path})
        if (kpsewhichReturn.status === 0) {
            const output = kpsewhichReturn.stdout.toString().replace(/\r?\n/, '')
            return output !== '' ? output : undefined
        }
    } catch (e) {
        logger.logError(`Calling ${command} on ${args.join(' ')} failed.`, e)
    }

    return undefined
}

export function resolveBibPath(bib: string, baseDir: string): string[] {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const bibDirs = configuration.get('latex.bibDirs') as string[]
    let searchDirs: string[] = [baseDir, ...bibDirs]
    // chapterbib requires to load the .bib file in every chapter using
    // the path relative to the rootDir
    if (lw.manager.rootDir) {
        searchDirs = [lw.manager.rootDir, ...searchDirs]
    }
    const bibPath = bib.includes('*') ? utils.resolveFileGlob(searchDirs, bib, '.bib') : utils.resolveFile(searchDirs, bib, '.bib')

    if (bibPath === undefined || bibPath.length === 0) {
        if (configuration.get('kpsewhich.enabled')) {
            const kpsePath = kpsewhich(['-format=.bib', bib])
            return kpsePath ? [ kpsePath ] : []
        } else {
            logger.log(`Cannot resolve bib path: ${bib} .`)
            return []
        }
    }
    return [ bibPath ].flat()
}
