import * as vscode from 'vscode'
import type { ReferenceItem, TeXMathEnv } from '../../../types'
import * as utils from '../../../utils/utils'
import { type ITextDocumentLike, TextDocumentLike } from './textdocumentlike'

const ENV_NAMES = [
    'align', 'align\\*', 'alignat', 'alignat\\*', 'aligned', 'alignedat', 'array', 'Bmatrix', 'bmatrix', 'cases', 'CD', 'eqnarray', 'eqnarray\\*', 'equation', 'equation\\*', 'flalign', 'flalign\\*', 'gather', 'gather\\*', 'gathered', 'matrix', 'multline', 'multline\\*', 'pmatrix', 'smallmatrix', 'split', 'subarray', 'Vmatrix', 'vmatrix'
]
const MATH_ENV_NAMES = [
    'align', 'align\\*', 'alignat', 'alignat\\*', 'eqnarray', 'eqnarray\\*', 'equation', 'equation\\*', 'flalign', 'flalign\\*', 'gather', 'gather\\*', 'multline', 'multline\\*'
]

export class TeXMathEnvFinder {
    static findHoverOnTex(document: ITextDocumentLike, position: vscode.Position): TeXMathEnv | undefined {
        const envBeginPat = new RegExp(`\\\\begin\\{(${ENV_NAMES.join('|')})\\}`)
        let r = document.getWordRangeAtPosition(position, envBeginPat)
        if (r) {
            const envname = TeXMathEnvFinder.getFirstRememberedSubstring(document.getText(r), envBeginPat)
            return TeXMathEnvFinder.findHoverOnEnv(document, envname, r.start)
        }
        const parenBeginPat = /(\\\[|\\\(|\$\$)/
        r = document.getWordRangeAtPosition(position, parenBeginPat)
        if (r) {
            const paren = TeXMathEnvFinder.getFirstRememberedSubstring(document.getText(r), parenBeginPat)
            return TeXMathEnvFinder.findHoverOnParen(document, paren, r.start)
        }
        return TeXMathEnvFinder.findHoverOnInline(document, position)
    }

    static findHoverOnRef(
        document: ITextDocumentLike,
        position: vscode.Position,
        refData: Pick<ReferenceItem, 'file' | 'position'>,
        token: string,
    ): TeXMathEnv | undefined {
        const limit = vscode.workspace.getConfiguration('latex-workshop').get('hover.preview.maxLines') as number
        const docOfRef = TextDocumentLike.load(refData.file)
        const envBeginPatMathMode = new RegExp(`\\\\begin\\{(${MATH_ENV_NAMES.join('|')})\\}`)
        const l = docOfRef.lineAt(refData.position.line).text
        const pat = new RegExp('\\\\label\\{' + utils.escapeRegExp(token) + '\\}')
        const m = l.match(pat)
        if (m && m.index !== undefined) {
            const labelPos = new vscode.Position(refData.position.line, m.index)
            const beginPos = TeXMathEnvFinder.findBeginPair(docOfRef, envBeginPatMathMode, labelPos, limit)
            if (beginPos) {
                const t = TeXMathEnvFinder.findHoverOnTex(docOfRef, beginPos)
                if (t) {
                    const beginEndRange = t.range
                    const refRange = document.getWordRangeAtPosition(position, /\S+?\{.*?\}/)
                    if (refRange && beginEndRange.contains(labelPos)) {
                        t.range = refRange
                        return t
                    }
                }
            }
        }
        return
    }

    static findMathEnvIncludingPosition(document: ITextDocumentLike, position: vscode.Position): TeXMathEnv | undefined {
        const limit = vscode.workspace.getConfiguration('latex-workshop').get('hover.preview.maxLines') as number
        const envNamePatMathMode = new RegExp(`(${MATH_ENV_NAMES.join('|')})`)
        const envBeginPatMathMode = new RegExp(`\\\\\\[|\\\\\\(|\\\\begin\\{(${MATH_ENV_NAMES.join('|')})\\}`)
        //: /\\\[|\\\(|\\begin\{(align|align\*|alignat|alignat\*|eqnarray|eqnarray\*|equation|equation\*|flalign|flalign\*|gather|gather\*)\}/
        let texMath = TeXMathEnvFinder.findHoverOnTex(document, position)
        if (texMath && (texMath.envname === '$' || texMath.envname.match(envNamePatMathMode))) {
            return texMath
        }
        const beginPos = TeXMathEnvFinder.findBeginPair(document, envBeginPatMathMode, position, limit)
        if (beginPos) {
            texMath = TeXMathEnvFinder.findHoverOnTex(document, beginPos)
            if (texMath) {
                const beginEndRange = texMath.range
                if (beginEndRange.contains(position)) {
                    return texMath
                }
            }
        }
        return
    }

    private static getFirstRememberedSubstring(s: string, pat: RegExp): string {
        const m = s.match(pat)
        if (m && m[1]) {
            return m[1]
        }
        return 'never return here'
    }

    //  \begin{...}                \end{...}
    //             ^
    //             startPos1
    static findEndPair(document: ITextDocumentLike, endPat: RegExp, startPos1: vscode.Position): vscode.Position | undefined {
        const currentLine = document.lineAt(startPos1).text.substring(startPos1.character)
        const l = utils.stripCommentsAndVerbatim(currentLine)
        let m = l.match(endPat)
        if (m && m.index !== undefined) {
            return new vscode.Position(startPos1.line, startPos1.character + m.index + m[0].length)
        }

        let lineNum = startPos1.line + 1
        while (lineNum <= document.lineCount) {
            m = utils.stripCommentsAndVerbatim(document.lineAt(lineNum).text).match(endPat)
            if (m && m.index !== undefined) {
                return new vscode.Position(lineNum, m.index + m[0].length)
            }
            lineNum += 1
        }
        return
    }

    //  \begin{...}                \end{...}
    //  ^                          ^
    //  return pos                 endPos1
    private static findBeginPair(document: ITextDocumentLike, beginPat: RegExp, endPos1: vscode.Position, limit: number): vscode.Position | undefined {
        const currentLine = document.lineAt(endPos1).text.substring(0, endPos1.character)
        let l = utils.stripCommentsAndVerbatim(currentLine)
        let m = l.match(beginPat)
        if (m && m.index !== undefined) {
            return new vscode.Position(endPos1.line, m.index)
        }
        let lineNum = endPos1.line - 1
        let i = 0
        while (lineNum >= 0 && i < limit) {
            l = document.lineAt(lineNum).text
            l = utils.stripCommentsAndVerbatim(l)
            m = l.match(beginPat)
            if (m && m.index !== undefined) {
                return new vscode.Position(lineNum, m.index)
            }
            lineNum -= 1
            i += 1
        }
        return
    }

    //  \begin{...}                \end{...}
    //  ^
    //  startPos
    private static findHoverOnEnv(document: ITextDocumentLike, envname: string, startPos: vscode.Position): TeXMathEnv | undefined {
        const pattern = new RegExp('\\\\end\\{' + utils.escapeRegExp(envname) + '\\}')
        const startPos1 = new vscode.Position(startPos.line, startPos.character + envname.length + '\\begin{}'.length)
        const endPos = TeXMathEnvFinder.findEndPair(document, pattern, startPos1)
        if ( endPos ) {
            const range = new vscode.Range(startPos, endPos)
            return {texString: document.getText(range), range, envname}
        }
        return
    }

    //  \[                \]
    //  ^
    //  startPos
    private static findHoverOnParen(document: ITextDocumentLike, envname: string, startPos: vscode.Position): TeXMathEnv | undefined {
        const pattern = envname === '\\[' ? /\\\]/ : envname === '\\(' ? /\\\)/ : /\$\$/
        const startPos1 = new vscode.Position(startPos.line, startPos.character + envname.length)
        const endPos = TeXMathEnvFinder.findEndPair(document, pattern, startPos1)
        if ( endPos ) {
            const range = new vscode.Range(startPos, endPos)
            return {texString: document.getText(range), range, envname}
        }
        return
    }

    private static findHoverOnInline(document: ITextDocumentLike, position: vscode.Position): TeXMathEnv | undefined {
        const currentLine = document.lineAt(position.line).text
        const regex = /(?<!\$|\\)\$(?!\$)(?:\\.|[^\\])+?\$|\\\(.+?\\\)/
        let s = currentLine
        let base = 0
        let m: RegExpMatchArray | null = s.match(regex)
        while (m) {
            if (m.index !== undefined) {
                const matchStart = base + m.index
                const matchEnd = base + m.index + m[0].length
                if ( matchStart <= position.character && position.character <= matchEnd ) {
                    const range = new vscode.Range(position.line, matchStart, position.line, matchEnd)
                    return {texString: document.getText(range), range, envname: '$'}
                } else {
                    base = matchEnd
                    s = currentLine.substring(base)
                }
            } else {
                break
            }
            m = s.match(regex)
        }
        return
    }
}
