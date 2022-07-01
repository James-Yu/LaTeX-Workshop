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

interface InputFileRegExp {
    input: RegExp,
    child: RegExp
}

/**
 * Return the input and child regexps. This function creates two regexps to be
 * used repeatedly on one document.
 */
export function createInputFileRegExp(): InputFileRegExp {
    return {
        input: /\\(?:input|InputIfFileExists|include|SweaveInput|subfile|loadglsentries|(?:(?:sub)?(?:import|inputfrom|includefrom)\*?{([^}]*)}))(?:\[[^[\]{}]*\])?{([^}]*)}/g,
        child: /<<(?:[^,]*,)*\s*child='([^']*)'\s*(?:,[^,]*)*>>=/g
    }
}

/**
 * Return the matched input path. If there is no match, return undefined
 *
 * @param content the string to match the regex on
 * @param regexps the regexps created by {@link createInputFileRegExp()}
 * @param currentFile is the name of file in which the regex is executed
 * @param rootFile
 */
export function execInputRegExp(content: string, regexps: InputFileRegExp, currentFile: string, rootFile: string): {path: string, match: MatchPath} | undefined {
    const result = regexps.input.exec(content)
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
 * @param regexps the regexps created by {@link createInputFileRegExp()}
 * @param currentFile is the name of file in which the regex is executed
 * @param rootFile
 */
export function execChildRegExp(content: string, regexps: InputFileRegExp, currentFile: string, rootFile: string): {path: string, match: MatchPath} | undefined {
    const result = regexps.child.exec(content)
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
 *        {@link createInputFileRegExp()}
 * @param currentFile is the name of file in which the regex is executed
 * @param rootFile
 */
export function execInputChildRegExps(content: string, regexps: InputFileRegExp, currentFile: string, rootFile: string): {path: string, match: MatchPath} | undefined {
    return execInputRegExp(content, regexps, currentFile, rootFile)
           || execChildRegExp(content, regexps, currentFile, rootFile)
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
