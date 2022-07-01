import * as vscode from 'vscode'
import * as path from 'path'

import { resolveFile } from './utils'

enum MatchType {
    Input,
    Child
}

interface MatchPath {
    type: MatchType,
    path: string,
    directory: string,
    matchedString: string,
    index: number
}

/**
 * Return the input regex. This function creates one regex to be used repeatedly
 * on one document.
 */
export function createInputRegExp(): RegExp {
    return /\\(?:input|InputIfFileExists|include|SweaveInput|subfile|loadglsentries|(?:(?:sub)?(?:import|inputfrom|includefrom)\*?{([^}]*)}))(?:\[[^[\]{}]*\])?{([^}]*)}/g
}

/**
 * Return the child regex. This function creates one regex to be used repeatedly
 * on one Rnw document.
 */
export function createChildRegExp(): RegExp {
    return /<<(?:[^,]*,)*\s*child='([^']*)'\s*(?:,[^,]*)*>>=/g
}

/**
 * Return the input and child regexes. This function creates two regexes, each
 * one is to be used repeatedly on one document.
 */
export function createInputChildRegExps(): {input: RegExp, child: RegExp} {
    return {input: createInputRegExp(), child: createChildRegExp()}
}

/**
 * Return the matched input path. If there is no match, return undefined
 *
 * @param content the string to match the regex on
 * @param regexp the input regex created by {@link createInputRegExp()}
 * @param currentFile is the name of file in which the regex is executed
 * @param rootFile
 */
export function execInputRegExp(content: string, regexp: RegExp, currentFile: string, rootFile: string): {path: string, match: MatchPath} | undefined {
    const result = regexp.exec(content)
    if (result) {
        const match = {
            type: MatchType.Input,
            path: result[2],
            directory: result[1],
            matchedString: result[0],
            index: result.index
        }
        const filePath = parseInputFilePath(match, currentFile, rootFile)
        return filePath ? {path: filePath, match} : undefined
    }
    return undefined
}

/**
 * Return the matched child path. If there is no match, return undefined
 *
 * @param content the string to match the regex on
 * @param regexp the child regex created by {@link createChildRegExp()}
 * @param currentFile is the name of file in which the regex is executed
 * @param rootFile
 */
export function execChildRegExp(content: string, regexp: RegExp, currentFile: string, rootFile: string): {path: string, match: MatchPath} | undefined {
    const result = regexp.exec(content)
    if (result) {
        const match = {
            type: MatchType.Child,
            path: result[1],
            directory: '',
            matchedString: result[0],
            index: result.index
        }
        const filePath = parseInputFilePath(match, currentFile, rootFile)
        return filePath ? {path: filePath, match} : undefined
    }
    return undefined
}

/**
 * Return the matched input or child path. If there is no match, return
 * undefined
 *
 * @param content the string to match the regex on
 * @param regexps the input and child regexes created by
 *        {@link createInputRegExp()} and {@link createChildRegExp()}
 * @param currentFile is the name of file in which the regex is executed
 * @param rootFile
 */
export function execInputChildRegExps(content: string, regexps: {input: RegExp, child: RegExp}, currentFile: string, rootFile: string): {path: string, match: MatchPath} | undefined {
    return execInputRegExp(content, regexps.input, currentFile, rootFile)
           || execChildRegExp(content, regexps.child, currentFile, rootFile)
}

/**
 * Compute the resolved file path from matches of this.inputReg or this.childReg
 *
 * @param match is the the result of this.inputReg.exec() or this.childReg.exec()
 * @param currentFile is the name of file in which the match has been obtained
 * @param rootFile
 */
function parseInputFilePath(match: MatchPath, currentFile: string, rootFile: string): string | undefined {
    const texDirs = vscode.workspace.getConfiguration('latex-workshop').get('latex.texDirs') as string[]
    /* match of this.childReg */
    if (match.type === MatchType.Child) {
        return resolveFile([path.dirname(currentFile), path.dirname(rootFile), ...texDirs], match.path)
    }

    /* match of this.inputReg */
    if (match.type === MatchType.Input) {
        if (match.matchedString.startsWith('\\subimport') || match.matchedString.startsWith('\\subinputfrom') || match.matchedString.startsWith('\\subincludefrom')) {
            return resolveFile([path.dirname(currentFile)], path.join(match.directory, match.path))
        } else if (match.matchedString.startsWith('\\import') || match.matchedString.startsWith('\\inputfrom') || match.matchedString.startsWith('\\includefrom')) {
            return resolveFile([match.directory, path.join(path.dirname(rootFile), match.directory)], match.path)
        } else {
            return resolveFile([path.dirname(currentFile), path.dirname(rootFile), ...texDirs], match.path)
        }
    }
    return undefined
}
