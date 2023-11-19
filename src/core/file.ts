import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as tmp from 'tmp'
import * as cs from 'cross-spawn'
import * as utils from '../utils/utils'
import { constants, extension } from '../extension'

const logger = extension.log('File')

export const file = {
    tmpDirPath: '' as string,
    getOutDir,
    getLangId,
    getJobname,
    getBibPath,
    getPdfPath,
    getFlsPath,
    hasBinaryExt,
    hasTeXExt,
    hasTexLangId,
    hasBibLangId,
    hasDtxLangId,
    exists,
    read,
    kpsewhich
}

try {
    file.tmpDirPath = tmp.dirSync({ unsafeCleanup: true }).name.split(path.sep).join('/')
} catch (error) {
    void vscode.window.showErrorMessage('Error during making tmpdir to build TeX files. Please check the environment variables, TEMP, TMP, and TMPDIR on your system.')
    console.log(`TEMP, TMP, and TMPDIR: ${JSON.stringify([process.env.TEMP, process.env.TMP, process.env.TMPDIR])}`)
    // https://github.com/James-Yu/LaTeX-Workshop/issues/2911#issuecomment-944318278
    if (/['"]/.exec(os.tmpdir())) {
        const msg = `The path of tmpdir cannot include single quotes and double quotes: ${os.tmpdir()}`
        void vscode.window.showErrorMessage(msg)
        console.log(msg)
    }
    throw error
}

function hasTeXExt(extname: string) {
    return [
        ...constants.TEX_EXT,
        ...constants.RSWEAVE_EXT,
        ...constants.JLWEAVE_EXT,
        ...constants.PWEAVE_EXT
    ].includes(extname)
}

function hasBinaryExt(extname: string) {
    return ![
        ...constants.TEX_EXT,
        ...constants.TEX_NOCACHE_EXT,
        ...constants.RSWEAVE_EXT,
        ...constants.JLWEAVE_EXT,
        ...constants.PWEAVE_EXT
    ].includes(extname)
}

/**
 * Returns `true` if the language of `id` is one of supported languages.
 *
 * @param id The language identifier
 */
function hasTexLangId(id: string) {
    return ['tex', 'latex', 'latex-expl3', 'doctex', 'pweave', 'jlweave', 'rsweave'].includes(id)
}

/**
 * Returns `true` if the language of `id` is bibtex
 *
 * @param id The language identifier
 */
function hasBibLangId(id: string) {
    return id === 'bibtex'
}

/**
 * Returns `true` if the language of `id` is doctex
 *
 * @param id The language identifier
 */
function hasDtxLangId(id: string) {
    return id === 'doctex'
}

/**
 * Returns the output directory developed according to the input tex path
 * and 'latex.outDir' config. If `texPath` is `undefined`, the default root
 * file is used. If there is not root file, returns './'.
 * The returned path always uses `/` even on Windows.
 *
 * @param texPath The path of a LaTeX file.
 */
function getOutDir(texPath?: string) {
    texPath = texPath ?? extension.root.file.path
    // rootFile is also undefined
    if (texPath === undefined) {
        return './'
    }

    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(texPath))
    const outDir = configuration.get('latex.outDir') as string
    const out = utils.replaceArgumentPlaceholders(texPath, file.tmpDirPath)(outDir)
    return path.normalize(out).split(path.sep).join('/')
}

function getLangId(filename: string): string | undefined {
    const ext = path.extname(filename).toLocaleLowerCase()
    if (ext === '.tex') {
        return 'latex'
    } else if (constants.PWEAVE_EXT.includes(ext)) {
        return 'pweave'
    } else if (constants.JLWEAVE_EXT.includes(ext)) {
        return 'jlweave'
    } else if (constants.RSWEAVE_EXT.includes(ext)) {
        return 'rsweave'
    } else if (ext === '.dtx') {
        return 'doctex'
    } else {
        return
    }
}

/**
 * Returns the jobname. If empty, return the name of the input `texPath`.
 *
 * @param texPath The path of a LaTeX file.
 */
function getJobname(texPath: string) {
    const config = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(texPath))
    const jobname = config.get('latex.jobname') as string
    const texname = path.parse(texPath).name
    return jobname || texname
}

/**
 * Returns the path of a PDF file with respect to `texPath`.
 *
 * @param texPath The path of a LaTeX file.
 */
function getPdfPath(texPath: string) {
    return path.resolve(path.dirname(texPath), getOutDir(texPath), path.basename(`${getJobname(texPath)}.pdf`))
}

/**
 * Search for a `.fls` file associated to a tex file
 * @param texPath The path of LaTeX file
 * @return The path of the .fls file or undefined
 */
function getFlsPath(texPath: string): string | undefined {
    const rootDir = path.dirname(texPath)
    const outDir = getOutDir(texPath)
    const baseName = path.parse(getJobname(texPath)).name
    const flsFile = path.resolve(rootDir, path.join(outDir, baseName + '.fls'))
    if (!fs.existsSync(flsFile)) {
        return
    }
    return flsFile
}

function kpsewhich(args: string[]): string | undefined {
    const command = vscode.workspace.getConfiguration('latex-workshop').get('kpsewhich.path') as string
    logger.log(`Calling ${command} to resolve ${args.join(' ')} .`)

    try {
        const kpsewhichReturn = cs.sync(command, args, {cwd: extension.root.dir.path || vscode.workspace.workspaceFolders?.[0].uri.path})
        if (kpsewhichReturn.status === 0) {
            const output = kpsewhichReturn.stdout.toString().replace(/\r?\n/, '')
            return output !== '' ? output : undefined
        }
    } catch (e) {
        logger.logError(`Calling ${command} on ${args.join(' ')} failed.`, e)
    }

    return undefined
}

function getBibPath(bib: string, baseDir: string): string[] {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const bibDirs = configuration.get('latex.bibDirs') as string[]
    let searchDirs: string[] = [baseDir, ...bibDirs]
    // chapterbib requires to load the .bib file in every chapter using
    // the path relative to the rootDir
    if (extension.root.dir.path) {
        searchDirs = [extension.root.dir.path, ...searchDirs]
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

/**
 * This function gracefully read a local file given in `filePath`. If `raise` is
 * set to true, exceptions are raised normally. Otherwise, `undefined` is
 * returned.
 */
function read(filePath: string, raise: boolean = false) {
    try {
        return fs.readFileSync(filePath).toString()
    } catch (err) {
        if (raise === false) {
            return undefined
        }
        throw err
    }
}

async function exists(uri: vscode.Uri): Promise<boolean> {
    try {
        if (uri.scheme === 'file') {
            return fs.existsSync(uri.fsPath)
        } else {
            await vscode.workspace.fs.stat(uri)
            return true
        }
    } catch {
        return false
    }
}