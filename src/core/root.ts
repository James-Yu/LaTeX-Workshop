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
    getWorkspace
}

lw.watcher.src.onDelete(filePath => {
    if (filePath !== root.file.path) {
        return
    }
    root.file = { path: undefined, langId: undefined }
    void find()
})

/**
 * Finds the root file with respect to the current workspace and returns it.
 * The found root is also set to `rootFile`.
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
            void lw.structureViewer.refresh()
        } else {
            root.file.path = rootFilePath
            root.file.langId = lw.file.getLangId(rootFilePath)
            root.dir.path = path.dirname(rootFilePath)
            logger.log(`Root file changed: from ${root.file.path} to ${rootFilePath}, langID ${root.file.langId} . Refresh dependencies`)
            lw.event.fire(lw.event.RootFileChanged, rootFilePath)

            // We also clean the completions from the old project
            lw.completer.input.reset()
            lw.dupLabelDetector.reset()
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
    void lw.structureViewer.refresh()
    lw.event.fire(lw.event.RootFileSearched)
    return
}

function getIndicator() {
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

function findFromMagic(): string | undefined {
    if (!vscode.window.activeTextEditor) {
        return
    }
    const regex = /^(?:%\s*!\s*T[Ee]X\sroot\s*=\s*(.*\.(?:tex|[jrsRS]nw|[rR]tex|jtexw))$)/m
    let content: string | undefined = vscode.window.activeTextEditor.document.getText()

    let result = content.match(regex)
    const fileStack: string[] = []
    if (result) {
        let filePath = path.resolve(path.dirname(vscode.window.activeTextEditor.document.fileName), result[1])
        content = lw.file.read(filePath)
        if (content === undefined) {
            logger.log(`Non-existent magic root ${filePath} .`)
            return
        }
        fileStack.push(filePath)
        logger.log(`Found magic root ${filePath} from active.`)

        result = content.match(regex)
        while (result) {
            filePath = path.resolve(path.dirname(filePath), result[1])
            if (fileStack.includes(filePath)) {
                logger.log(`Found looped magic root ${filePath} .`)
                return filePath
            } else {
                fileStack.push(filePath)
                logger.log(`Found magic root ${filePath}`)
            }

            content = lw.file.read(filePath)
            if (content === undefined) {
                logger.log(`Non-existent magic root ${filePath} .`)
                return
            }
            result = content.match(regex)
        }
        logger.log(`Finalized magic root ${filePath} .`)
        return filePath
    }
    return
}

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

function findSubfiles(content: string): string | undefined {
    if (!vscode.window.activeTextEditor) {
        return
    }
    const regex = /(?:\\documentclass\[(.*)\]{subfiles})/s
    const result = content.match(regex)
    if (result) {
        const filePath = utils.resolveFile([path.dirname(vscode.window.activeTextEditor.document.fileName)], result[1])
        if (filePath) {
            logger.log(`Found subfile root ${filePath} from active.`)
        }
        return filePath
    }
    return
}

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
            const flsChildren = lw.cache.getFlsChildren(fileUri.fsPath)
            if (vscode.window.activeTextEditor && flsChildren.includes(vscode.window.activeTextEditor.document.fileName)) {
                logger.log(`Found root file from '.fls': ${fileUri.fsPath}`)
                return fileUri.fsPath
            }
            const content = utils.stripCommentsAndVerbatim(fs.readFileSync(fileUri.fsPath).toString())
            const result = content.match(getIndicator())
            if (result) {
                // Can be a root
                const children = lw.cache.getIncludedTeX(fileUri.fsPath).filter(filePath => filePath !== fileUri.fsPath)
                if (vscode.window.activeTextEditor && children.includes(vscode.window.activeTextEditor.document.fileName)) {
                    logger.log(`Found root file from parent: ${fileUri.fsPath}`)
                    return fileUri.fsPath
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
