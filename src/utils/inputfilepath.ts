import * as vscode from 'vscode'
import * as path from 'path'

import * as utils from './utils'

export enum MatchType {
    Input,
    Child
}

export interface MatchPath {
    type: MatchType,
    path: string,
    directory: string,
    matchedString: string,
    index: number
}

export class PathRegExp {
    private readonly inputRegexp: RegExp
    private readonly childRegexp: RegExp

    constructor() {
        this.inputRegexp = /\\(?:input|InputIfFileExists|include|SweaveInput|subfile|loadglsentries|(?:(?:sub)?(?:import|inputfrom|includefrom)\*?{([^}]*)}))(?:\[[^[\]{}]*\])?{([^}]*)}/g
        this.childRegexp = /<<(?:[^,]*,)*\s*child='([^']*)'\s*(?:,[^,]*)*>>=/g
    }

    resetLastIndex() {
        this.inputRegexp.lastIndex = 0
        this.childRegexp.lastIndex = 0
    }

    /**
     * Return the matched input or child path. If there is no match, return undefined
     *
     * @param content the string to match the regex on
     */
    exec(content: string): MatchPath | undefined {
        let result = this.inputRegexp.exec(content)
        if (result) {
            return {
                type: MatchType.Input,
                path: result[2],
                directory: result[1],
                matchedString: result[0],
                index: result.index
            }
        }
        result = this.childRegexp.exec(content)
        if (result) {
            return {
                type: MatchType.Child,
                path: result[1],
                directory: '',
                matchedString: result[0],
                index: result.index
            }
        }
        return undefined
    }
    /**
     * Compute the resolved file path from matches of this.inputReg or this.childReg
     *
     * @param regResult is the the result of this.inputReg.exec() or this.childReg.exec()
     * @param currentFile is the name of file in which the match has been obtained
     * @param rootFile
     */
    parseInputFilePath(match: MatchPath, currentFile: string, rootFile: string): string | undefined {
        const texDirs = vscode.workspace.getConfiguration('latex-workshop').get('latex.texDirs') as string[]
        /* match of this.childReg */
        if (match.type === MatchType.Child) {
            return utils.resolveFile([path.dirname(currentFile), path.dirname(rootFile), ...texDirs], match.path)
        }

        /* match of this.inputReg */
        if (match.type === MatchType.Input) {
            if (match.matchedString.startsWith('\\subimport') || match.matchedString.startsWith('\\subinputfrom') || match.matchedString.startsWith('\\subincludefrom')) {
                return utils.resolveFile([path.dirname(currentFile)], path.join(match.directory, match.path))
            } else if (match.matchedString.startsWith('\\import') || match.matchedString.startsWith('\\inputfrom') || match.matchedString.startsWith('\\includefrom')) {
                return utils.resolveFile([match.directory, path.join(path.dirname(rootFile), match.directory)], match.path)
            } else {
                return utils.resolveFile([path.dirname(currentFile), path.dirname(rootFile), ...texDirs], match.path)
            }
        }
        return undefined
    }

}
