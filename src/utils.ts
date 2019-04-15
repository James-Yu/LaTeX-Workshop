import * as path from 'path'
import * as fs from 'fs'


export interface ExternalCommand {
    command: string,
    args?: string[]
}

export function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
}

/**
 * Remove the comments if any
 */
export function stripComments(text: string, commentSign: string) : string {
    const pattern = '([^\\\\]|^)' + commentSign + '.*$'
    const reg = RegExp(pattern, 'gm')
    return text.replace(reg, '$1')
}

/**
 * Finding the longest substring containing balanced {...}
 * @param s a string
 */
export function getLongestBalancedString(s: string) : string {
    let nested = 1
    let i = 0
    for (i = 0; i < s.length; i++) {
        switch (s[i]) {
            case '{':
                nested++
                break
            case '}':
                nested --
                break
            case '\\':
                // skip an escaped character
                i++
                break
            default:
        }
        if (nested === 0) {
            break
        }
    }
    return s.substring(0, i)
}

// Given an input file determine its full path using the prefixes dirs
export function resolveFile(dirs: string[], inputFile: string, suffix: string = '.tex') : string | null {
    if (inputFile.startsWith('/')) {
        dirs.unshift('')
    }
    for (const d of dirs) {
        let inputFilePath = path.resolve(d, inputFile)
        if (path.extname(inputFilePath) === '') {
            inputFilePath += suffix
        }
        if (!fs.existsSync(inputFilePath) && fs.existsSync(inputFilePath + suffix)) {
            inputFilePath += suffix
        }
        if (fs.existsSync(inputFilePath)) {
            return inputFilePath
        }
    }
    return null
}
