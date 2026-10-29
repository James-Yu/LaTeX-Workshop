import * as path from 'path'
import * as vscode from 'vscode'
import { tokenizer } from '../../../src/utils/tokenizer'
import { assert } from '../utils'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const documents = new Map<string, vscode.TextDocument>()

    async function getDocument(content: string, language: string): Promise<vscode.TextDocument> {
        // Reuse real documents without accumulating a model for every cursor position.
        const key = `${language}:${content.includes('\r\n') ? 'crlf' : 'lf'}`
        let document = documents.get(key)
        if (!document || document.isClosed) {
            document = await vscode.workspace.openTextDocument({ language, content })
            documents.set(key, document)
        } else if (document.getText() !== content) {
            const edit = new vscode.WorkspaceEdit()
            edit.replace(document.uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), content)
            assert.ok(await vscode.workspace.applyEdit(edit))
        }
        // Keep offsets in the input string aligned with the reused document.
        const eol = content.includes('\r\n') ? vscode.EndOfLine.CRLF : vscode.EndOfLine.LF
        if (document.eol !== eol) {
            const edit = new vscode.WorkspaceEdit()
            edit.set(document.uri, [vscode.TextEdit.setEndOfLine(eol)])
            assert.ok(await vscode.workspace.applyEdit(edit))
        }
        assert.strictEqual(document.getText(), content)
        return document
    }

    async function assertTokenAtCursor(contentWithCursor: string, expected: string | undefined, language = 'latex'): Promise<void> {
        const offset = contentWithCursor.indexOf('|')
        assert.notStrictEqual(offset, -1, 'The input must mark its cursor with |')
        assert.strictEqual(contentWithCursor.lastIndexOf('|'), offset, 'The input must have one cursor')
        const content = contentWithCursor.slice(0, offset) + contentWithCursor.slice(offset + 1)
        const document = await getDocument(content, language)
        const position = document.positionAt(offset)
        const range = tokenizer(document, position)

        if (expected === undefined) {
            assert.strictEqual(range, undefined)
            return
        }
        assert.ok(range)
        assert.strictEqual(document.getText(range), expected)
        const start = content.lastIndexOf(expected, offset)
        assert.notStrictEqual(start, -1)
        assert.ok(range.isEqual(new vscode.Range(document.positionAt(start), document.positionAt(start + expected.length))))
        assert.ok(range.contains(position))
    }

    describe('macro ranges', () => {
        const cases: [string, string, string][] = [
            ['latex', String.raw`Name: & \studentname \\[0.5cm]`, String.raw`\studentname`],
            ['latex', String.raw`Name: & \studentname \\`, String.raw`\studentname`],
            ['latex', String.raw`\studentname`, String.raw`\studentname`],
            ['latex', String.raw`\studentname{arg}`, String.raw`\studentname`],
            ['latex', String.raw`\studentname[opt]`, String.raw`\studentname`],
            ['latex', String.raw`\studentname \textbf{X}`, String.raw`\studentname`],
            ['latex', String.raw`\studentname text {X}`, String.raw`\studentname`],
            ['latex', String.raw`\studentname% comment {X}`, String.raw`\studentname`],
            ['latex', String.raw`\studentname$ x {X}`, String.raw`\studentname`],
            ['latex', String.raw`\studentname, {X}`, String.raw`\studentname`],
            ['latex', String.raw`\studentname*{X}`, String.raw`\studentname`],
            ['latex', String.raw`\studentname123{X}`, String.raw`\studentname`],
            ['latex', String.raw`\studentname	\\[0.5cm]`, String.raw`\studentname`],
            ['latex-expl3', String.raw`\foo_bar:nn{X}{Y}`, String.raw`\foo_bar:nn`],
            ['latex-expl3', String.raw`\foo_bar:nn`, String.raw`\foo_bar:nn`],
            ['latex-expl3', String.raw`\__foo_bar:n \other{X}`, String.raw`\__foo_bar:n`],
            ['latex-expl3', String.raw`\foo@bar:n{X}`, String.raw`\foo@bar:n`]
        ]

        for (const [language, content, expected] of cases) {
            it(`should select only ${expected} in ${JSON.stringify(content)} (${language})`, async () => {
                const document = await getDocument(content, language)
                const start = content.indexOf(expected)
                const expectedRange = new vscode.Range(0, start, 0, start + expected.length)

                for (let character = start; character <= expectedRange.end.character; character++) {
                    const range = tokenizer(document, new vscode.Position(0, character))

                    assert.ok(range, `No token at column ${character}`)
                    assert.strictEqual(document.getText(range), expected, `Wrong token at column ${character}`)
                    assert.ok(range.isEqual(expectedRange), `Wrong range at column ${character}`)
                }
            })
        }
    })

    describe('command starts and language-specific names', () => {
        const cases: [string, string | undefined][] = [
            ['|', undefined],
            ['pla|in', undefined],
            ['|plain \\later{X}', undefined],
            ['\\|', undefined],
            ['\\foo1|bar', undefined],
            ['\\foo_|bar', undefined],
            ['\\foo:|bar', undefined],
            ['\\foo@|bar', undefined],
            ['|\\alpha', '\\alpha'],
            ['\\|alpha', '\\alpha'],
            ['\\alph|a', '\\alpha'],
            ['\\alpha|', '\\alpha'],
            ['prefix \\Al|pha', '\\Alpha'],
            ['\\first\\se|cond', '\\second'],
            ['\\fir|st\\second{X}', '\\first'],
            ['\\alpha \\al|pha', '\\alpha'],
            ['{\\al|pha}', '\\alpha'],
            ['[\\al|pha]', '\\alpha'],
            ['{\\al|pha,other}', '\\alpha'],
            ['\\alpha wo|rd', 'word']
        ]

        for (const [content, expected] of cases) {
            it(`should handle the command start in ${JSON.stringify(content)}`, async () => {
                await assertTokenAtCursor(content, expected)
            })
        }

        for (const language of ['latex', 'tex', 'latex-class', 'latex-package']) {
            it(`should use ordinary command names for ${language}`, async () => {
                await assertTokenAtCursor('\\MiX|ed{X}', '\\MiXed', language)
                await assertTokenAtCursor('\\foo_|bar', undefined, language)
            })
        }

        for (const name of ['foo_bar:nn', '__foo_bar:n', 'foo@bar:n']) {
            it(`should recognize every position in the expl3 name ${name}`, async () => {
                const macro = '\\' + name
                for (let offset = 0; offset <= macro.length; offset++) {
                    await assertTokenAtCursor(macro.slice(0, offset) + '|' + macro.slice(offset) + '{X}', macro, 'latex-expl3')
                }
            })
        }

        for (const delimiter of ['{', '}', '[', ']', ',']) {
            it(`should not search past ${delimiter} for an expl3 command start`, async () => {
                await assertTokenAtCursor(`\\foo_bar:n${delimiter}wo|rd`, ['{', '[', ','].includes(delimiter) ? 'word' : undefined, 'latex-expl3')
            })
        }
    })

    describe('single-character control symbols', () => {
        for (const language of ['latex', 'latex-expl3']) {
            for (const symbol of ['%', '&', '#', '$', '_', '{', '}', '[', ']', '\\', '1']) {
                it(`should recognize the control symbol ${JSON.stringify('\\' + symbol)} in ${language}`, async () => {
                    await assertTokenAtCursor(`\\|${symbol}{X}`, '\\' + symbol, language)
                    await assertTokenAtCursor(`\\${symbol}|{X}`, '\\' + symbol, language)
                    await assertTokenAtCursor(`\\|${symbol}`, '\\' + symbol, language)
                })
            }
        }

        it('should recognize @ as a control symbol outside expl3', async () => {
            await assertTokenAtCursor('\\|@{X}', '\\@')
        })

        it('should not include text after a control symbol', async () => {
            await assertTokenAtCursor('\\|%text{X}', '\\%')
            await assertTokenAtCursor('\\%te|xt{X}', undefined)
        })
    })

    describe('bracket and word boundaries', () => {
        for (const content of ['\\ma|cro{X}', '\\macro|{X}', '\\ma|cro[opt]', '\\macro|[opt]', '\\ma|cro', '\\macro|']) {
            it(`should handle absent and immediately adjacent brackets in ${JSON.stringify(content)}`, async () => {
                await assertTokenAtCursor(content, '\\macro')
            })
        }

        it('should keep the full command when the editor word pattern splits its letters', async () => {
            const configuration = vscode.languages.setLanguageConfiguration('latex', { wordPattern: /[a-zA-Z]/ })
            try {
                await assertTokenAtCursor('prefix \\ma|cro', '\\macro')
                await assertTokenAtCursor('prefix \\ma|cro{X}', '\\macro')
            } finally {
                configuration.dispose()
            }
        })

        it('should not include punctuation or a star in a command without arguments', async () => {
            await assertTokenAtCursor('\\ma|cro,', '\\macro')
            await assertTokenAtCursor('\\ma|cro*', '\\macro')
        })

        it('should stop before horizontal whitespace', async () => {
            await assertTokenAtCursor('\\ma|cro\t\\\\[0.5cm]', '\\macro')
        })
    })

    describe('line-local ranges', () => {
        for (const eol of ['\n', '\r\n']) {
            it(`should return the correct range on a nonzero line (${eol === '\n' ? 'LF' : 'CRLF'})`, async () => {
                await assertTokenAtCursor(`\\previous{X}${eol}Name: & \\stu|dentname \\\\[0.5cm]${eol}\\next{Y}`, '\\studentname')
            })
        }

        it('should not use a command start from the previous line', async () => {
            await assertTokenAtCursor('\\previous\npla|in', undefined)
        })

        it('should not extend a macro to a bracket on the next line', async () => {
            await assertTokenAtCursor('\\ma|cro\n\\other{X}', '\\macro')
        })

        it('should handle CRLF line endings', async () => {
            await assertTokenAtCursor('\\previous\r\nprefix \\ma|cro\r\n[opt]', '\\macro')
        })

        it('should handle positions beyond column 65535', async () => {
            await assertTokenAtCursor('x'.repeat(65536) + ' \\ma|cro \\\\[0.5cm]', '\\macro')
        })
    })

    describe('argument ranges', () => {
        const cases: [string, string][] = [
            [String.raw`\ref{sec:test}`, 'sec:test'],
            [String.raw`\cite{first,second:key}`, 'second:key'],
            [String.raw`\usepackage[opt]{my-package}`, 'my-package'],
            [String.raw`\studentname[option]`, 'option'],
            [String.raw`\ref{Even theorem}`, 'Even theorem'],
            [String.raw`\cref{first,Even theorem}`, 'Even theorem'],
            [String.raw`\input{chapter one.tex}`, 'chapter one.tex']
        ]

        for (const [content, expected] of cases) {
            it(`should select the argument in ${JSON.stringify(content)}`, async () => {
                const document = await getDocument(content, 'latex')
                const start = content.indexOf(expected)
                for (let character = start; character <= start + expected.length; character++) {
                    const range = tokenizer(document, new vscode.Position(0, character))

                    assert.ok(range)
                    assert.strictEqual(document.getText(range), expected, `Wrong token at column ${character}`)
                    assert.ok(range.isEqual(new vscode.Range(0, start, 0, start + expected.length)))
                }
            })
        }

        for (const [content, expected] of [
            ['\\macro{|}', ''],
            ['\\macro[|]', ''],
            ['\\ref{sec:|test}', 'sec:test'],
            ['\\ref{sec:test|}', 'sec:test'],
            ['\\cite{first,se|cond}', 'second'],
            ['\\cite{first, se|cond}', 'second'],
            ['\\macro{first se|cond}', 'first second'],
            ['\\cite{first,  se|cond  }', 'second'],
            ['\\ref{  Even the|orem  }', 'Even theorem'],
            ['\\macro{unfi|nished', 'unfinished'],
            ['\\macro{key|$rest}', 'key'],
            ['\\macro{outer{in|ner}}', 'inner']
        ]) {
            it(`should fall back to the argument in ${JSON.stringify(content)}`, async () => {
                await assertTokenAtCursor(content, expected)
            })
        }

        for (const eol of ['\n', '\r\n']) {
            for (const content of [
                `\\cite{${eol}    fir|st,${eol}    second${eol}}`,
                `\\cite{${eol}\tfirst, se|cond,${eol}}`,
                `\\cite{${eol}    first,${eol}    sec|ond}${eol}`,
                `\\cite{${eol}    first,${eol}    sec|ond${eol}}`
            ]) {
                it(`should preserve multiline citation ranges in ${JSON.stringify(content)}`, async () => {
                    await assertTokenAtCursor(content, content.includes('fir|st') ? 'first' : 'second')
                })
            }
        }
    })
})
