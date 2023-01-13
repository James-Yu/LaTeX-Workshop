import * as vscode from 'vscode'
import * as path from 'path'
import * as cs from 'cross-spawn'
import * as fs from 'fs'
import * as lw from '../../lw'
import * as utils from '../../utils/utils'
import { getLogger } from '../logger'

const logger = getLogger('Cacher', 'Path')

export class PathUtils {
    private static get rootDir() {
        return lw.manager.rootDir
    }

    private static getOutDir(texFile: string) {
        return lw.manager.getOutDir(texFile)
    }

    /**
     * Search for a `.fls` file associated to a tex file
     * @param texFile The path of LaTeX file
     * @return The path of the .fls file or undefined
     */
    static getFlsFilePath(texFile: string): string | undefined {
        const rootDir = path.dirname(texFile)
        const outDir = PathUtils.getOutDir(texFile)
        const baseName = path.parse(texFile).name
        const flsFile = path.resolve(rootDir, path.join(outDir, baseName + '.fls'))
        if (!fs.existsSync(flsFile)) {
            logger.log(`Non-existent .fls for ${texFile} .`)
            return
        }
        return flsFile
    }

    private static kpsewhichBibPath(bib: string): string | undefined {
        const kpsewhich = vscode.workspace.getConfiguration('latex-workshop').get('kpsewhich.path') as string
        logger.log(`Calling ${kpsewhich} to resolve ${bib} .`)
        try {
            const kpsewhichReturn = cs.sync(kpsewhich, ['-format=.bib', bib])
            if (kpsewhichReturn.status === 0) {
                const bibPath = kpsewhichReturn.stdout.toString().replace(/\r?\n/, '')
                if (bibPath === '') {
                    return
                } else {
                    return bibPath
                }
            }
        } catch(e) {
            logger.logError(`Calling ${kpsewhich} on ${bib} failed.`, e)
        }
        return
    }

    static resolveBibPath(bib: string, baseDir: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const bibDirs = configuration.get('latex.bibDirs') as string[]
        let searchDirs: string[]
        if (PathUtils.rootDir) {
            // chapterbib requires to load the .bib file in every chapter using
            // the path relative to the rootDir
            searchDirs = [PathUtils.rootDir, baseDir, ...bibDirs]
        } else {
            searchDirs = [baseDir, ...bibDirs]
        }
        const bibPath = utils.resolveFile(searchDirs, bib, '.bib')

        if (!bibPath) {
            if (configuration.get('kpsewhich.enabled')) {
                return PathUtils.kpsewhichBibPath(bib)
            } else {
                logger.log(`Cannot resolve ${bib} .`)
                return
            }
        }
        return bibPath
    }

}
