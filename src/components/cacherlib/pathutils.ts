import * as vscode from 'vscode'
import * as path from 'path'
import * as cs from 'cross-spawn'
import * as fs from 'fs'

import type { Extension } from '../../main'
import * as utils from '../../utils/utils'
import * as logger from '../logger'

export class PathUtils {
    private readonly extension: Extension

    constructor(extension: Extension) {
        this.extension = extension
    }

    private get rootDir() {
        return this.extension.manager.rootDir
    }

    private getOutDir(texFile: string) {
        return this.extension.manager.getOutDir(texFile)
    }

    /**
     * Search for a `.fls` file associated to a tex file
     * @param texFile The path of LaTeX file
     * @return The path of the .fls file or undefined
     */
    getFlsFilePath(texFile: string): string | undefined {
        const rootDir = path.dirname(texFile)
        const outDir = this.getOutDir(texFile)
        const baseName = path.parse(texFile).name
        const flsFile = path.resolve(rootDir, path.join(outDir, baseName + '.fls'))
        if (!fs.existsSync(flsFile)) {
            logger.log(`[Cacher][Path] Non-existent .fls for ${texFile} .`)
            return undefined
        }
        return flsFile
    }

    private kpsewhichBibPath(bib: string): string | undefined {
        const kpsewhich = vscode.workspace.getConfiguration('latex-workshop').get('kpsewhich.path') as string
        logger.log(`[Cacher][Path] Calling ${kpsewhich} to resolve ${bib} .`)
        try {
            const kpsewhichReturn = cs.sync(kpsewhich, ['-format=.bib', bib])
            if (kpsewhichReturn.status === 0) {
                const bibPath = kpsewhichReturn.stdout.toString().replace(/\r?\n/, '')
                if (bibPath === '') {
                    return undefined
                } else {
                    return bibPath
                }
            }
        } catch(e) {
            logger.logError(`[Cacher][Path] Calling ${kpsewhich} on ${bib} failed.`, e)
        }
        return undefined
    }

    resolveBibPath(bib: string, baseDir: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const bibDirs = configuration.get('latex.bibDirs') as string[]
        let searchDirs: string[]
        if (this.rootDir) {
            // chapterbib requires to load the .bib file in every chapter using
            // the path relative to the rootDir
            searchDirs = [this.rootDir, baseDir, ...bibDirs]
        } else {
            searchDirs = [baseDir, ...bibDirs]
        }
        const bibPath = utils.resolveFile(searchDirs, bib, '.bib')

        if (!bibPath) {
            if (configuration.get('kpsewhich.enabled')) {
                return this.kpsewhichBibPath(bib)
            } else {
                logger.log(`[Cacher][Path] Cannot resolve ${bib} .`)
                return undefined
            }
        }
        return bibPath
    }

}
