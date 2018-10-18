import * as vscode from 'vscode'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as stripJsonComments from 'strip-json-comments'
import * as envpair from '../components/envpair'
import {Extension} from '../main'
import {tokenizer} from './tokenizer'

export class HoverProvider implements vscode.HoverProvider {
    extension: Extension
    jaxInitialized = false
    color
    mj

    constructor(extension: Extension) {
        this.extension = extension
        import('mathjax-node').then(mj => {
            this.mj = mj
            mj.config({
                MathJax: {
                    jax: ['input/TeX', 'output/SVG'],
                    extensions: ['tex2jax.js', 'MathZoom.js'],
                    showMathMenu: false,
                    showProcessingMessages: false,
                    messageStyle: 'none',
                    SVG: {
                        useGlobalCache: false
                    },
                    TeX: {
                        extensions: ['AMSmath.js', 'AMSsymbols.js', 'autoload-all.js', 'color.js', 'noUndefined.js']
                    }
                }
            })
            mj.start()
            this.jaxInitialized = true
        })
    }

    public provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken) :
    Thenable<vscode.Hover> {
        this.getColor()
        return new Promise((resolve, _reject) => {
            const configuration = vscode.workspace.getConfiguration('latex-workshop')
            const hov = configuration.get('hoverPreview.enabled') as boolean
            if (hov) {
                const tr = this.findHoverOnTex(document, position)
                if (tr) {
                    const scale = configuration.get('hoverPreview.scale') as number
                    const [tex, range] = tr
                    this.mj.typeset({
                        math: this.colorTeX(tex),
                        format: 'TeX',
                        svg: true,
                    }).then(data => this.scaleSVG(data.svg, scale))
                        .then(xml => this.svgToDataUrl(xml))
                        .then(md => resolve( new vscode.Hover(new vscode.MarkdownString( `![equation](${md})`), range ) ))
                    return
                }
            }
            const token = tokenizer(document, position)
            if (token === undefined) {
                resolve()
                return
            }
            if (token in this.extension.completer.reference.referenceData) {
                resolve(new vscode.Hover(
                    {language: 'latex', value: this.extension.completer.reference.referenceData[token].text }
                ))
                return
            }
            if (token in this.extension.completer.citation.citationData) {
                resolve(new vscode.Hover(
                    this.extension.completer.citation.citationData[token].text
                ))
                return
            }
            resolve()
        })
    }

    private scaleSVG(svg: string, scale: number) : string {
        const widthReg = svg.match(/( width=")([\.\d]+)(\w*" )/)
        const heightReg = svg.match(/( height=")([\.\d]+)(\w*" )/)
        if (!widthReg || !heightReg) {
            return svg
        }
        svg = svg.replace(/( width=")([\.\d]+)(\w*" )/, `${widthReg[1]}${parseFloat(widthReg[2]) * scale}${widthReg[3]}`)
        svg = svg.replace(/( height=")([\.\d]+)(\w*" )/, `${heightReg[1]}${parseFloat(heightReg[2]) * scale}${heightReg[3]}`)
        return svg
    }

    private svgToDataUrl(xml: string) : string {
        const svg64 = Buffer.from(unescape(encodeURIComponent(xml))).toString('base64')
        const b64Start = 'data:image/svg+xml;base64,'
        return b64Start + svg64
    }

    private hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
        } : null
    }

    private colorTeX(tex: string) : string {
        const color = '\\color[rgb]{' + this.color + '}'
        tex = tex.replace(/^(\$|\\\(|\\\[|\\begin{.*?}({.*?})*)/, '$1' + color)
        tex = tex.replace(/(\\begin{CD}[\s\S]*?\\end{CD}|((?:\\[^\\]|[^&\\])*&+|\\\\))/g, '$1' + color)

        if (tex.startsWith('$') && tex.endsWith('$')) {
            tex = tex.slice(1, tex.length - 1)
        }
        if (tex.startsWith('\\(') && tex.endsWith('\\)')) {
            tex = tex.slice(2, tex.length - 2)
        }
        if (tex.startsWith('\\[') && tex.endsWith('\\]')) {
            tex = tex.slice(2, tex.length - 2)
        }
        return tex
    }

    private getColor() {
        const colorTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme')
        for (const extension of vscode.extensions.all) {
            if (extension.packageJSON.contributes.themes === undefined) {
                continue
            }
            const candidateThemes = extension.packageJSON.contributes.themes.filter(themePkg => themePkg.label === colorTheme || themePkg.id === colorTheme)
            if (candidateThemes.length === 0) {
                continue
            }
            const themePath = path.join(extension.extensionPath, candidateThemes[0].path)
            let theme = JSON.parse(stripJsonComments(fs.readFileSync(themePath, 'utf8')))
            while (theme.include) {
                const includedTheme = JSON.parse(stripJsonComments(fs.readFileSync(path.join(path.dirname(themePath), theme.include), 'utf8')))
                theme.include = undefined
                theme = {... theme, ...includedTheme}
            }
            const bgColor = this.hexToRgb(theme.colors['editor.background'])
            if (bgColor) {
                // http://stackoverflow.com/a/3943023/112731
                const r = bgColor.r <= 0.03928 ? bgColor.r / 12.92 : Math.pow((bgColor.r + 0.055) / 1.055, 2.4)
                const g = bgColor.r <= 0.03928 ? bgColor.g / 12.92 : Math.pow((bgColor.g + 0.055) / 1.055, 2.4)
                const b = bgColor.r <= 0.03928 ? bgColor.b / 12.92 : Math.pow((bgColor.b + 0.055) / 1.055, 2.4)
                const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
                if (L > 0.179) {
                    this.color = '0, 0, 0'
                } else {
                    this.color = '1, 1, 1'
                }
                return
            } else if (theme.type && theme.type === 'dark') {
                this.color = '1, 1, 1'
                return
            }
        }
        this.color = '0, 0, 0'
    }

    // Test whether cursor is in tex command strings
    // like \begin{...} \end{...} \xxxx{ \[ \] \( \) or \\
    private isCursorInTeXCommand(document: vscode.TextDocument) : boolean {
        const editor = vscode.window.activeTextEditor
        if (!editor) {
            return false
        }
        const cursor = editor.selection.active
        const r = document.getWordRangeAtPosition(cursor, /\\(?:begin|end)\{.*?\}|\\[a-zA-Z]+\{?|\\[\(\)\[\]]|\\\\/)
        if (r && r.start.isBefore(cursor) && r.end.isAfter(cursor) ) {
            return true
        }
        return false
    }

    private renderCursor(document: vscode.TextDocument, range: vscode.Range) : string {
        const editor = vscode.window.activeTextEditor
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const conf = configuration.get('hoverPreview.cursor.enabled') as boolean
        if (editor && conf && !this.isCursorInTeXCommand(document)) {
            const cursor = editor.selection.active
            const symbol = configuration.get('hoverPreview.cursor.symbol') as string
            const color = configuration.get('hoverPreview.cursor.color') as string
            let sym = `{${symbol}}`
            if (color !== 'auto') {
                sym = `{\\color{${color}}${symbol}}`
            }
            if (range.contains(cursor)) {
                return document.getText( new vscode.Range(range.start, cursor) ) + sym + document.getText( new vscode.Range(cursor, range.end))
            }
        }
        return document.getText(range)
    }

    private mathjaxify(tex: string, envname: string) : string {
        // remove TeX comments
        let s = tex.replace(/^\s*%.*\r?\n/mg, '')
        s = s.replace(/^((?:\\.|[^%])*).*$/mg, '$1')
        // remove \label{...}
        s = s.replace(/\\label\{.*?\}/g, '')
        if (envname.match(/^(aligned|alignedat|array|Bmatrix|bmatrix|cases|CD|gathered|matrix|pmatrix|smallmatrix|split|subarray|Vmatrix|vmatrix)$/)) {
            s = '\\begin{equation}' + s + '\\end{equation}'
        }
        return s
    }

    private findHoverOnTex(document: vscode.TextDocument, position: vscode.Position) : [string, vscode.Range] | undefined {
        const envBeginPat = /\\begin\{(align|align\*|alignat|alignat\*|aligned|alignedat|array|Bmatrix|bmatrix|cases|CD|eqnarray|eqnarray\*|equation|equation\*|gather|gather\*|gathered|matrix|multline|multline\*|pmatrix|smallmatrix|split|subarray|Vmatrix|vmatrix)\}/
        let r = document.getWordRangeAtPosition(position, envBeginPat)
        if (r) {
            const envname = this.getFirstRmemberedSubstring(document.getText(r), envBeginPat)
            return this.findHoverOnEnv(document, envname, r.start)
        }
        const parenBeginPat = /(\\\[|\\\()/
        r = document.getWordRangeAtPosition(position, parenBeginPat)
        if (r) {
            const paren = this.getFirstRmemberedSubstring(document.getText(r), parenBeginPat)
            return this.findHoverOnParen(document, paren, r.start)
        }
        return this.findHoverOnInline(document, position)
    }

    private getFirstRmemberedSubstring(s: string, pat: RegExp) : string {
        const m = s.match(pat)
        if (m && m[1]) {
            return m[1]
        }
        return 'never return here'
    }

    private removeComment(line: string) : string {
        return line.replace(/^((?:\\.|[^%])*).*$/, '$1')
    }

    //  \begin{...}                \end{...}
    //             ^
    //             startPos1
    private findEndPair(document: vscode.TextDocument, endPat: RegExp, startPos1: vscode.Position) : vscode.Position | undefined {
        const currentLine = document.lineAt(startPos1).text.substring(startPos1.character)
        const l = this.removeComment(currentLine)
        let m = l.match(endPat)
        if (m && m.index !== undefined) {
            return new vscode.Position(startPos1.line, startPos1.character + m.index + m[0].length)
        }

        let lineNum = startPos1.line + 1
        while (lineNum <= document.lineCount) {
            m  = this.removeComment(document.lineAt(lineNum).text).match(endPat)
            if (m && m.index !== undefined) {
                return new vscode.Position(lineNum, m.index + m[0].length)
            }
            lineNum += 1
        }
        return undefined
    }

    //  \begin{...}                \end{...}
    //  ^
    //  startPos
    private findHoverOnEnv(document: vscode.TextDocument, envname: string, startPos: vscode.Position) : [string, vscode.Range] | undefined {
        const pattern = new RegExp('\\\\end\\{' + envpair.escapeRegExp(envname) + '\\}')
        const startPos1 = new vscode.Position(startPos.line, startPos.character + envname.length + '\\begin{}'.length)
        const endPos = this.findEndPair(document, pattern, startPos1)
        if ( endPos ) {
            const range = new vscode.Range(startPos, endPos)
            const ret = this.mathjaxify( this.renderCursor(document, range), envname )
            return [ret, range]
        }
        return undefined
    }

    //  \[                \]
    //  ^
    //  startPos
    private findHoverOnParen(document: vscode.TextDocument, envname: string, startPos: vscode.Position) : [string, vscode.Range] | undefined {
        const pattern = envname === '\\[' ? /\\\]/ : /\\\)/
        const startPos1 = new vscode.Position(startPos.line, startPos.character + envname.length)
        const endPos = this.findEndPair(document, pattern, startPos1)
        if ( endPos ) {
            const range = new vscode.Range(startPos, endPos)
            const ret = this.mathjaxify( this.renderCursor(document, range), envname )
            return [ret, range]
        }
        return undefined
    }

    private findHoverOnInline(document: vscode.TextDocument, position: vscode.Position) : [string, vscode.Range] | undefined {
        const currentLine = document.lineAt(position.line).text
        let s = currentLine
        let base = 0
        let m: RegExpMatchArray | null = s.match(/\$(?:\\.|[^\\])+?\$|\\\(.+?\\\)/)
        while (m) {
            if (m && m.index !== undefined) {
                const matchStart = base + m.index
                const matchEnd = base + m.index + m[0].length
                if ( matchStart <= position.character && position.character <= matchEnd ) {
                    const range = new vscode.Range(position.line, matchStart, position.line, matchEnd)
                    const ret = this.mathjaxify( this.renderCursor(document, range), '$' )
                    return [ret, range]
                } else {
                    base = matchEnd
                    s = currentLine.substring(base)
                }
            } else {
                break
            }
            m = s.match(/\$(?:\\.|[^\\])+?\$|\\\(.+?\\\)/)
        }
        return undefined
    }

}
