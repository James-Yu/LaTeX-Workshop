import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'
import { assert, mock, set } from './utils'
import { parser } from '../../src/parse/parser'
import type * as Ast from '@unified-latex/unified-latex-types'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    before(() => {
        mock.init(lw, 'parser')
        ;(lw.cache.paths as sinon.SinonStub).returns([])
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.parser->tex', () => {
        it('should parse LaTeX content', async () => {
            const ast = await parser.tex('\\documentclass{article}')

            assert.strictEqual(ast.content[0].type, 'macro')
            assert.strictEqual(ast.content[0].content, 'documentclass')
        })
    })

    describe('lw.parser->bib', () => {
        it('should parse BibTeX content', async () => {
            const ast = await parser.bib('@article{key, author = "author"}')

            assert.ok(ast)
            assert.strictEqual(ast.content[0].entryType, 'article')
            assert.strictEqual(ast.content[0].internalKey, 'key')
            assert.strictEqual(ast.content[0].content[0].name, 'author')
            assert.strictEqual(ast.content[0].content[0].value.kind, 'text_string')
            assert.strictEqual(ast.content[0].content[0].value.content, 'author')
        })

        it('should log error when parsing BibTeX content fails', async () => {
            const ast = await parser.bib('@article{key, author = "author",')

            assert.strictEqual(ast, undefined)
            assert.hasLog('Error when parsing bib file.')
        })
    })

    describe('lw.parser->args', () => {
        function emptyArg(arg: Ast.Argument) {
            assert.strictEqual(arg.content.length, 0)
        }

        function strArg(arg: Ast.Argument) {
            assert.strictEqual(arg.content[0].type, 'string')
        }

        async function hasArgs(tex: string, signature: string) {
            const node = (await parser.tex(tex)).content[0]
            const args: ((arg: Ast.Argument) => void)[] = []
            for (const arg of signature.replaceAll(' ', '').split('')) {
                args.push(arg === 's' ? strArg : emptyArg)
            }
            assert.strictEqual(node.type, 'macro')

            if (signature.length === 0) {
                assert.strictEqual(node.args, undefined)
            } else {
                assert.strictEqual(node.args?.length, args.length)
                for (let i = 0; i < args.length; i++) {
                    args[i](node.args[i])
                }
            }
        }

        it('should correctly parse arguments of `InputIfFileExists`', async () => {
            await hasArgs('\\InputIfFileExists{file}', 's')
        })

        it('should correctly parse arguments of `SweaveInput`', async () => {
            await hasArgs('\\SweaveInput{file}', 's')
        })

        it('should correctly parse arguments of `subfile`', async () => {
            await hasArgs('\\SweaveInput{file}', 's')
        })

        it('should correctly parse arguments of `loadglsentries`', async () => {
            await hasArgs('\\SweaveInput{file}', 's')
        })

        it('should correctly parse arguments of `markdownInput`', async () => {
            await hasArgs('\\SweaveInput{file}', 's')
        })

        it('should correctly parse arguments of `import`', async () => {
            await hasArgs('\\import{folder}{file}', 'ss')
        })

        it('should correctly parse arguments of `inputfrom`', async () => {
            await hasArgs('\\import{folder}{file}', 'ss')
        })

        it('should correctly parse arguments of `includefrom`', async () => {
            await hasArgs('\\import{folder}{file}', 'ss')
        })

        it('should correctly parse arguments of `subimport`', async () => {
            await hasArgs('\\import{folder}{file}', 'ss')
        })

        it('should correctly parse arguments of `subinputfrom`', async () => {
            await hasArgs('\\import{folder}{file}', 'ss')
        })

        it('should correctly parse arguments of `subincludefrom`', async () => {
            await hasArgs('\\import{folder}{file}', 'ss')
        })

        it('should correctly parse arguments of `linelabel`', async () => {
            await hasArgs('\\linelabel{tag}', 'ees')
            await hasArgs('\\linelabel[short]{tag}', 'ess')
            await hasArgs('\\linelabel<beamer>[short]{tag}', 'sss')
        })

        it('should correctly parse arguments of `newglossaryentry`', async () => {
            await hasArgs('\\newglossaryentry{arg1}{arg2}', 'ss')
        })

        it('should correctly parse arguments of `provideglossaryentry`', async () => {
            await hasArgs('\\provideglossaryentry{arg1}{arg2}', 'ss')
        })

        it('should correctly parse arguments of `longnewglossaryentry`', async () => {
            await hasArgs('\\longnewglossaryentry{arg1}{arg2}{arg3}', 'esss')
            await hasArgs('\\longnewglossaryentry[opt]{arg1}{arg2}{arg3}', 'ssss')
        })

        it('should correctly parse arguments of `longprovideglossaryentry`', async () => {
            await hasArgs('\\longprovideglossaryentry{arg1}{arg2}{arg3}', 'esss')
            await hasArgs('\\longprovideglossaryentry[opt]{arg1}{arg2}{arg3}', 'ssss')
        })

        it('should correctly parse arguments of `newacronym`', async () => {
            await hasArgs('\\newacronym{arg1}{arg2}{arg3}', 'esss')
            await hasArgs('\\newacronym[opt]{arg1}{arg2}{arg3}', 'ssss')
        })

        it('should correctly parse arguments of `newabbreviation`', async () => {
            await hasArgs('\\newabbreviation{arg1}{arg2}{arg3}', 'esss')
            await hasArgs('\\newabbreviation[opt]{arg1}{arg2}{arg3}', 'ssss')
        })

        it('should correctly parse arguments of `newabbr`', async () => {
            await hasArgs('\\newabbr{arg1}{arg2}{arg3}', 'esss')
            await hasArgs('\\newabbr[opt]{arg1}{arg2}{arg3}', 'ssss')
        })

        it('should correctly parse arguments of `newrobustcmd`', async () => {
            await hasArgs('\\newrobustcmd{arg1}{arg2}', 'eesees')
            await hasArgs('\\newrobustcmd*<opt1>{arg1}[opt2][opt3]{arg2}', 'ssssss')
        })

        it('should correctly parse arguments of `renewrobustcmd`', async () => {
            await hasArgs('\\renewrobustcmd{arg1}{arg2}', 'eesees')
            await hasArgs('\\renewrobustcmd*<opt1>{arg1}[opt2][opt3]{arg2}', 'ssssss')
        })

        it('should correctly parse arguments of `providerobustcmd`', async () => {
            await hasArgs('\\providerobustcmd{arg1}{arg2}', 'esees')
            await hasArgs('\\providerobustcmd*{arg1}[opt1][opt2]{arg2}', 'sssss')
        })

        it('should correctly parse arguments of `DeclareRobustCommand`', async () => {
            await hasArgs('\\DeclareRobustCommand{arg1}{arg2}', 'esees')
            await hasArgs('\\DeclareRobustCommand*{arg1}[opt1][opt2]{arg2}', 'sssss')
        })

        it('should correctly parse arguments of `DeclareMathOperator`', async () => {
            await hasArgs('\\DeclareMathOperator{arg1}{arg2}', 'ess')
            await hasArgs('\\DeclareMathOperator*{arg1}{arg2}', 'sss')
        })

        it('should correctly parse arguments of `DeclarePairedDelimiter`', async () => {
            await hasArgs('\\DeclarePairedDelimiter{arg1}{arg2}{arg3}', 'sss')
        })

        it('should correctly parse arguments of `DeclarePairedDelimiterX`', async () => {
            await hasArgs('\\DeclarePairedDelimiterX{arg1}{arg2}{arg3}{arg4}', 'sesss')
            await hasArgs('\\DeclarePairedDelimiterX{arg1}[opt]{arg2}{arg3}{arg4}', 'sssss')
        })

        it('should correctly parse arguments of `DeclarePairedDelimiterXPP`', async () => {
            await hasArgs('\\DeclarePairedDelimiterXPP{arg1}{arg2}{arg3}{arg4}{arg5}{arg6}', 'sesssss')
            await hasArgs('\\DeclarePairedDelimiterXPP{arg1}[opt]{arg2}{arg3}{arg4}{arg5}{arg6}', 'sssssss')
        })

        it('should register and parse macros defined in `view.outline.commands`', async () => {
            await hasArgs('\\randommacro{arg}', '')

            await set.codeConfig('view.outline.commands', ['randommacro'])
            await hasArgs('\\randommacro{tag}', 'ees')
            await hasArgs('\\randommacro[short]{tag}', 'ess')
            await hasArgs('\\randommacro<beamer>[short]{tag}', 'sss')

        })

        it('should register and parse macros defined in `intellisense.label.command`', async () => {
            await hasArgs('\\randommacro{arg}', '')

            await set.codeConfig('intellisense.label.command', ['randommacro'])
            await hasArgs('\\randommacro{tag}', 'ees')
            await hasArgs('\\randommacro[short]{tag}', 'ess')
            await hasArgs('\\randommacro<beamer>[short]{tag}', 'sss')

        })

        it('should register and parse macros defined in `view.outline.sections`', async () => {
            await hasArgs('\\randommacro{arg}', '')

            await set.codeConfig('view.outline.sections', ['randommacro'])
            await hasArgs('\\randommacro{tag}', 'ees')
            await hasArgs('\\randommacro[short]{tag}', 'ess')
            await hasArgs('\\randommacro*[short]{tag}', 'sss')
        })
    })
})
