import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

import { lw } from '../lw'
import * as utils from '../utils/utils'

const logger = lw.log('Root')

export const root = {
    file: {
        path: undefined as string | undefined,
        langId: undefined as string | undefined,
    },
    dir: {
        path: undefined as string | undefined,
    },
    subfiles: {
        path: undefined as string | undefined,
        langId: undefined as string | undefined,
    },
    find,
    getWorkspace,
    _test: {
        getIndicator,
        getWorkspace,
        findFromMagic,
        findFromActive,
        findFromRoot,
        findInWorkspace
    }
}

lw.watcher.src.onDelete(filePath => {
    if (filePath !== root.file.path) {
        return
    }
    root.file = { path: undefined, langId: undefined }
    void find()
})

/**
 * Finds the LaTeX project's root file.
 *
 * This function employs multiple strategies to find the root file for the LaTeX
 * project. It first checks for a magic comment in the active editor, then looks
 * for the root file based on the active editor's content and the entire
 * workspace according to configuration settings. The identified root file
 * triggers relevant events, and dependencies are refreshed accordingly.
 */
async function find(): Promise<undefined> {
    const wsfolders = vscode.workspace.workspaceFolders?.map(e => e.uri.toString(true))
    logger.log(`Current workspace folders: ${JSON.stringify(wsfolders)}`)
    root.subfiles = { path: undefined, langId: undefined }
    const findMethods = [
        () => findFromMagic(),
        () => findFromActive(),
        () => findFromRoot(),
        () => findInWorkspace()
    ]
    for (const method of findMethods) {
        const rootFilePath = await method()
        if (rootFilePath === undefined) {
            continue
        }
        if (rootFilePath === root.file.path) {
            logger.log(`Keep using the same root file: ${root.file.path}`)
            void lw.outline.refresh()
        } else {
            root.file.path = rootFilePath
            root.file.langId = lw.file.getLangId(rootFilePath)
            root.dir.path = path.dirname(rootFilePath)
            logger.log(`Root file changed: from ${root.file.path} to ${rootFilePath}, langID ${root.file.langId} . Refresh dependencies`)
            lw.event.fire(lw.event.RootFileChanged, rootFilePath)

            // We also clean the completions from the old project
            lw.completion.input.reset()
            lw.lint.label.reset()
            lw.cache.reset()
            lw.cache.add(rootFilePath)
            void lw.cache.refreshCache(rootFilePath).then(async () => {
                // We need to parse the fls to discover file dependencies when defined by TeX macro
                // It happens a lot with subfiles, https://tex.stackexchange.com/questions/289450/path-of-figures-in-different-directories-with-subfile-latex
                await lw.cache.loadFlsFile(rootFilePath)
            })
        }
        lw.event.fire(lw.event.RootFileSearched)
        return
    }
    logger.log('No root file found.')
    void lw.outline.refresh()
    lw.event.fire(lw.event.RootFileSearched)
    return
}

/**
 * Gets the indicator regex based on the LaTeX configuration.
 *
 * This function retrieves the indicator regex based on the LaTeX configuration.
 * The indicator is used to identify the root file in the content of the active
 * editor.
 *
 * @returns {RegExp} The indicator regex.
 */
function getIndicator(): RegExp {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const indicator = configuration.get('latex.rootFile.indicator')
    switch (indicator) {
        case '\\documentclass[]{}':
            return /\\documentclass(?:\s*\[.*\])?\s*\{.*\}/ms
        case '\\begin{document}':
            return /\\begin\s*{document}/m
        default:
            logger.logError('Unknown rootFile.indicator', indicator)
            return /\\documentclass(?:\s*\[.*\])?\s*\{.*\}/ms
    }
}

/**
 * Gets the workspace URI for a given file path or the active editor's
 * workspace.
 *
 * This function determines the workspace URI for a given file path or the
 * active editor's workspace. If no workspace is opened, it returns undefined.
 * If provided with a file path, it checks its workspace. If the active text
 * editor is not available, it makes an educated guess based on the first
 * workspace.
 *
 * @param {string} [filePath] - The file path for which to get the workspace
 * URI.
 * @returns {vscode.Uri | undefined} The workspace URI.
 */
function getWorkspace(filePath?: string): vscode.Uri | undefined {
    const firstWorkspace = vscode.workspace.workspaceFolders?.[0]
    // If no workspace is opened.
    if (!firstWorkspace) {
        return
    }
    // If provided with a filePath, check its workspace
    if (filePath !== undefined) {
        return (vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath)) ?? firstWorkspace).uri
    }
    // If we don't have an active text editor, we can only make a guess.
    // Let's guess the first one.
    if (!vscode.window.activeTextEditor) {
        return firstWorkspace.uri
    }
    // Get the workspace folder which contains the active document.
    return (vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri) ?? firstWorkspace).uri
}

/**
 * Finds the root file based on a magic comment in the active editor.
 *
 * This function looks for a magic comment in the content of the active editor
 * to determine the root file. It follows the chain of magic comments until a
 * loop is detected or the root file is found.
 *
 * @returns {string | undefined} The root file path, or undefined if not found.
 */
async function findFromMagic(): Promise<string | undefined> {
    if (!vscode.window.activeTextEditor) {
        return
    }

    const regex = /^(?:%\s*!\s*T[Ee]X\sroot\s*=\s*(.*\.(?:tex|[jrsRS]nw|[rR]tex|jtexw))$)/m
    const fileStack: string[] = []
    let content: string | undefined = vscode.window.activeTextEditor.document.getText()
    let filePath = vscode.window.activeTextEditor.document.fileName
    let result = content.match(regex)

    while (result) {
        filePath = path.resolve(path.dirname(filePath), result[1])

        if (fileStack.includes(filePath)) {
            logger.log(`Found looped magic root ${filePath} .`)
            return filePath
        }
        fileStack.push(filePath)
        logger.log(`Found magic root ${filePath}`)

        content = await lw.file.read(filePath)
        if (content === undefined) {
            logger.log(`Non-existent magic root ${filePath} .`)
            return
        }

        result = content.match(regex)
    }
    if (fileStack.length > 0) {
        const finalFilePath = fileStack[fileStack.length - 1]
        logger.log(`Finalized magic root ${finalFilePath} .`)
        return finalFilePath
    }

    return
}

/**
 * Finds the root file based on the active editor's file.
 *
 * This function verifies if the active editor's file is already in the cache of
 * included TeX files. If so, the current root file remains to be the root.
 *
 * @returns {string | undefined} The root file path, or undefined if not found.
 */
function findFromRoot(): string | undefined {
    if (!vscode.window.activeTextEditor || root.file.path === undefined) {
        return
    }
    if (vscode.window.activeTextEditor.document.uri.scheme !== 'file') {
        logger.log(`The active document cannot be used as the root file: ${vscode.window.activeTextEditor.document.uri.toString(true)}`)
        return
    }
    if (lw.cache.getIncludedTeX().includes(vscode.window.activeTextEditor.document.fileName)) {
        return root.file.path
    }
    return
}

/**
 * Finds the root file based on the active editor's content.
 *
 * This function identifies the root file by searching for an indicator RegExp
 * in the content of the active editor. It also handles the case where the root
 * file is a subfile, triggering relevant events.
 *
 * @returns {string | undefined} The root file path, or undefined if not found.
 */
function findFromActive(): string | undefined {
    if (!vscode.window.activeTextEditor) {
        return
    }
    if (vscode.window.activeTextEditor.document.uri.scheme !== 'file') {
        logger.log(`The active document cannot be used as the root file: ${vscode.window.activeTextEditor.document.uri.toString(true)}`)
        return
    }
    const content = utils.stripCommentsAndVerbatim(vscode.window.activeTextEditor.document.getText())
    const result = content.match(getIndicator())
    if (result) {
        const rootFilePath = findSubfiles(content)
        const activeFilePath = vscode.window.activeTextEditor.document.fileName
        if (rootFilePath) {
            root.subfiles.path = activeFilePath
            root.subfiles.langId = lw.file.getLangId(activeFilePath)
            return rootFilePath
        } else {
            logger.log(`Found root file from active editor: ${activeFilePath}`)
            return activeFilePath
        }
    }
    return
}

/**
 * Finds the root file for subfiles in the active editor's content.
 *
 * This function identifies the root file for subfiles in the content of the
 * active editor by searching for a specific pattern.
 *
 * @param {string} content - The content of the active editor.
 * @returns {string | undefined} The root file path for subfiles, or undefined
 * if not found.
 */
function findSubfiles(content: string): string | undefined {
    const regex = /(?:\\documentclass\[(.*)\]{subfiles})/s
    const result = content.match(regex)
    if (!result) {
        return
    }
    const filePath = utils.resolveFile([path.dirname(vscode.window.activeTextEditor!.document.fileName)], result[1])
    if (filePath) {
        logger.log(`Found subfile root ${filePath} from active.`)
    }
    return filePath
}

/**
 * Finds the root file in the entire workspace based on configuration settings.
 *
 * This function scans the entire workspace based on configuration settings to
 * find potential root files. It considers patterns for inclusion and exclusion
 * and validates candidates based on TeX file indicators. The identified root
 * file triggers relevant events, and dependencies are refreshed accordingly.
 *
 * @returns {Promise<string | undefined>} A promise that resolves to the root
 * file path, or undefined if not found.
 */
async function findInWorkspace(): Promise<string | undefined> {
    const workspace = getWorkspace()
    logger.log(`Current workspaceRootDir: ${workspace ? workspace.toString(true) : ''} .`)

    if (!workspace) {
        return
    }

    const configuration = vscode.workspace.getConfiguration('latex-workshop', workspace)
    const rootFilesIncludePatterns = configuration.get('latex.search.rootFiles.include') as string[]
    const rootFilesIncludeGlob = '{' + rootFilesIncludePatterns.join(',') + '}'
    const rootFilesExcludePatterns = configuration.get('latex.search.rootFiles.exclude') as string[]
    const rootFilesExcludeGlob = rootFilesExcludePatterns.length > 0 ? '{' + rootFilesExcludePatterns.join(',') + '}' : undefined
    try {
        const fileUris = await vscode.workspace.findFiles(rootFilesIncludeGlob, rootFilesExcludeGlob)
        const candidates: string[] = []
        for (const fileUri of fileUris) {
            if (fileUri.scheme !== 'file') {
                logger.log(`Skip the file: ${fileUri.toString(true)}`)
                continue
            }
            const flsChildren = await lw.cache.getFlsChildren(fileUri.fsPath)
            if (vscode.window.activeTextEditor && flsChildren.includes(vscode.window.activeTextEditor.document.fileName)) {
                logger.log(`Found root file from '.fls': ${fileUri.fsPath}`)
                return fileUri.fsPath
            }
            const content = utils.stripCommentsAndVerbatim(fs.readFileSync(fileUri.fsPath).toString())
            const result = content.match(getIndicator())
            if (result) {
                // Can be a root
                const children = lw.cache.getIncludedTeX(fileUri.fsPath, false).filter(filePath => filePath !== fileUri.fsPath)
                if (vscode.window.activeTextEditor && children.includes(vscode.window.activeTextEditor.document.fileName)) {
                    logger.log(`Found root file from active editor by parent: ${fileUri.fsPath}`)
                    candidates.unshift(fileUri.fsPath)
                }
                // Not including the active file, yet can still be a root candidate
                candidates.push(fileUri.fsPath)
            }
        }
        if (root.file.path && candidates.includes(root.file.path)) {
            logger.log(`Found files that might be root including the current root: ${candidates} .`)
            return root.file.path
        } else if (candidates.length > 0) {
            logger.log(`Found files that might be root, choose the first one: ${candidates} .`)
            return candidates[0]
        }
    } catch (e) {}
    return
}
