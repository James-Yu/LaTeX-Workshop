
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
