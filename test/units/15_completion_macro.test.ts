import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'
import { get, mock, set } from './utils'
import { provider } from '../../src/completion/completer/macro'
import assert from 'assert'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]
    const texPath = get.path(fixture, 'main.tex')
    let readStub: sinon.SinonStub

    before(() => {
        mock.init(lw, 'root', 'cache', 'parser', 'completion')
        readStub = sinon.stub(lw.file, 'read')
    })

    beforeEach(() => {
        set.root(texPath)
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.completion->macro', () => {
        function getSuggestions() {
            return provider.from(['', ''], { uri: vscode.Uri.file(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) })
        }
        function getMacros() {
            return getSuggestions().map(s => s.label)
        }

        it('should provide default macros', () => {
            const labels = getMacros()

            assert.ok(labels.includes('\\begin'))
            assert.ok(labels.includes('\\left('))
            assert.ok(labels.includes('\\section{}'))
        })

        it('should provide macros defined in packages', async () => {
            assert.ok(!getMacros().includes('\\lstinputlisting{}'))

            readStub.resolves('\\usepackage[savemem]{listings}')
            await lw.cache.refreshCache(texPath)
            assert.ok(getMacros().includes('\\lstinputlisting{}'))
        })

        it('should provide macros defined in packages and filtered by package arguments', async () => {
            readStub.resolves('\\usepackage[savemem]{listings}')
            await lw.cache.refreshCache(texPath)
            assert.ok(!getMacros().includes('\\lstdefineformat{}{}'))

            readStub.resolves('\\usepackage[savemem,formats]{listings}')
            await lw.cache.refreshCache(texPath)
            assert.ok(getMacros().includes('\\lstdefineformat{}{}'))
        })

        it('should provide macros defined in packages and filtered by unusual tag', async () => {
            readStub.resolves('\\usepackage[savemem]{listings}')
            await lw.cache.refreshCache(texPath)
            assert.ok(!getMacros().includes('\\lstname'))

            set.config('intellisense.package.unusual', true)
            await lw.cache.refreshCache(texPath)
            assert.ok(getMacros().includes('\\lstname'))
        })

        it('should provide macros defined by \\newcommand', async () => {
            let macros = getMacros()
            assert.ok(!macros.includes('\\WARNING'))
            assert.ok(!macros.includes('\\FIXME{}'))
            assert.ok(!macros.includes('\\FIXMETOO[]{}'))
            assert.ok(!macros.includes('\\fix[]{}{}'))

            readStub.resolves(`
                \\newcommand\\WARNING{\\textcolor{red}{WARNING}}
                \\newcommand\\FIXME[1]{\\textcolor{red}{FIX:}\\textcolor{red}{#1}}
                \\newcommand\\FIXMETOO[2][]{\\textcolor{red}{FIX:}\\textcolor{red}{#1}}
                \\newcommand{\\fix}[3][]{\\chdeleted{#2}\\chadded[comment={#1}]{#3}}
            `)
            await lw.cache.refreshCache(texPath)
            macros = getMacros()
            assert.ok(macros.includes('\\WARNING'))
            assert.ok(macros.includes('\\FIXME{}'))
            assert.ok(macros.includes('\\FIXMETOO[]{}'))
            assert.ok(macros.includes('\\fix[]{}{}'))
        })

        it('should provide macros defined by \\NewDocumentCommand', async () => {
            let macros = getMacros()
            assert.ok(!macros.includes('\\testNoArg'))
            assert.ok(!macros.includes('\\testA{}'))
            assert.ok(!macros.includes('\\testB[]{}'))
            assert.ok(!macros.includes('\\testC{}[][]{}{}'))

            readStub.resolves(`
                \\NewDocumentCommand\\testNoArg{}{ABC}
                \\DeclareDocumentCommand\\testA{m}{ABC #1}
                \\NewDocumentCommand{\\testB}{O{}m}{ABC #2 #1}
                \\ProvideDocumentCommand{\\testC}{m o O{} m r() m}{ABC}
            `)
            await lw.cache.refreshCache(texPath)
            macros = getMacros()
            assert.ok(macros.includes('\\testNoArg'))
            assert.ok(macros.includes('\\testA{}'))
            assert.ok(macros.includes('\\testB[]{}'))
            assert.ok(macros.includes('\\testC{}[][]{}{}'))
        })

        it('should not provide argument hints if `intellisense.argumentHint.enabled` is false', async () => {
            readStub.resolves('\\usepackage{import}')
            await lw.cache.refreshCache(texPath)

            let suggestion = getSuggestions().find(s => s.label === '\\includefrom{}{}')
            let snippet = suggestion?.insertText
            assert.ok(typeof snippet !== 'string')
            assert.ok(snippet?.value.includes('${1:'))

            set.config('intellisense.argumentHint.enabled', false)
            suggestion = getSuggestions().find(s => s.label === '\\includefrom{}{}')
            snippet = suggestion?.insertText
            assert.ok(typeof snippet !== 'string')
            assert.ok(!snippet?.value.includes('${1:'))
        })

        it('should add new macros from `intellisense.command.user`', async () => {
            assert.ok(!getMacros().includes('\\mycommand[]{}'))
            await set.codeConfig('intellisense.command.user', { 'mycommand[]{}': 'notsamecommand[${2:option}]{$TM_SELECTED_TEXT$1}' })
            assert.ok(getMacros().includes('\\mycommand[]{}'))
        })

        it('should change existing macros from `intellisense.command.user`', async () => {
            assert.ok(getMacros().includes('\\parbox{}{}'))
            assert.ok(!getMacros().includes('\\defchanged'))
            await set.codeConfig('intellisense.command.user', { 'parbox{}{}': 'defchanged' })
            assert.ok(!getMacros().includes('\\parbox{}{}'))
            assert.ok(getMacros().includes('\\defchanged'))
        })

        it('should remove existing macros from `intellisense.command.user`', async () => {
            assert.ok(getMacros().includes('\\overline{}'))
            await set.codeConfig('intellisense.command.user', { 'overline{}': '' })
            assert.ok(!getMacros().includes('\\overline{}'))
        })
    })
})
