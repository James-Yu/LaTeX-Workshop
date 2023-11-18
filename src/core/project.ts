import * as path from 'path'
import * as fs from 'fs'
import * as lw from '../lw'
import * as CacherUtils from './cacherlib/cacherutils'
import * as PathUtils from './cacherlib/pathutils'

import { extension } from '../extension'

const logger = extension.log('Project')

export {
    getIncludedBib,
    getIncludedTeX,
    getTeXChildren,
    getFlsChildren
}

/**
 * Return a string array which holds all imported bib files
 * from the given tex `file`. If `file` is `undefined`, traces from the
 * root file, or return empty array if the root file is `undefined`
 *
 * @param filePath The path of a LaTeX file
 */
function getIncludedBib(filePath?: string, includedBib: string[] = []): string[] {
    filePath = filePath ?? lw.manager.rootFile
    if (filePath === undefined) {
        return []
    }
    const fileCache = extension.cache.get(filePath)
    if (fileCache === undefined) {
        return []
    }
    const checkedTeX = [ filePath ]
    includedBib.push(...fileCache.bibfiles)
    for (const child of fileCache.children) {
        if (checkedTeX.includes(child.filePath)) {
            // Already parsed
            continue
        }
        getIncludedBib(child.filePath, includedBib)
    }
    // Make sure to return an array with unique entries
    return Array.from(new Set(includedBib))
}

/**
 * Return a string array which holds all imported tex files
 * from the given `file` including the `file` itself.
 * If `file` is `undefined`, trace from the * root file,
 * or return empty array if the root file is `undefined`
 *
 * @param filePath The path of a LaTeX file
 */
function getIncludedTeX(filePath?: string, includedTeX: string[] = [], cachedOnly: boolean = true): string[] {
    filePath = filePath ?? lw.manager.rootFile
    if (filePath === undefined) {
        return []
    }
    const fileCache = extension.cache.get(filePath)
    if (cachedOnly && fileCache === undefined) {
        return []
    }
    includedTeX.push(filePath)
    if (fileCache === undefined) {
        return []
    }
    for (const child of fileCache.children) {
        if (includedTeX.includes(child.filePath)) {
            // Already included
            continue
        }
        getIncludedTeX(child.filePath, includedTeX, cachedOnly)
    }
    return includedTeX
}

/**
 * Return the list of files (recursively) included in `file`
 *
 * @param filePath The file in which children are recursively computed
 * @param basePath The file currently considered as the rootFile
 * @param children The list of already computed children
 */
function getTeXChildren(filePath: string, basePath: string, children: string[]) {
    const fileCache = extension.cache.get(filePath)
    if (fileCache === undefined) {
        logger.log(`Cache not finished on ${filePath} when getting its children.`)
        return []
    }

    fileCache.children.forEach(async child => {
        if (children.includes(child.filePath)) {
            // Already included
            return
        }
        children.push(child.filePath)
        getTeXChildren(child.filePath, basePath, children)
    })
    return children
}

function getFlsChildren(texFile: string) {
    const flsFile = PathUtils.getFlsFilePath(texFile)
    if (flsFile === undefined) {
        return []
    }
    const rootDir = path.dirname(texFile)
    const ioFiles = CacherUtils.parseFlsContent(fs.readFileSync(flsFile).toString(), rootDir)
    return ioFiles.input
}
