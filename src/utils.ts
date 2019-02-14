
export function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
}

/**
 * Remove the comments if any
 * @param line
 */
export function stripComments(line: string) : string {
    let commentPos = line.search(/(?!\\)%/)
    if (commentPos !== -1) {
        commentPos++
        return line.slice(0, commentPos)
    }
    return line
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


export interface ExternalCommand {
    command: string,
    args?: string[]
}
