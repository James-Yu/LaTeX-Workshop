import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'
import { assert, get, mock, set } from './utils'
import { provider as macroProvider } from '../../src/completion/completer/macro'
import { provider as packageProvider } from '../../src/completion/completer/package'
import type { CompletionProvider } from '../../src/types'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]
    const texPath = get.path(fixture, 'main.tex')
    let readStub: sinon.SinonStub

    before(() => {
        mock.init(lw, 'root', 'cache', 'parser', 'completion')
        readStub = sinon.stub(lw.file, 'read')
    })

    beforeEach(async () => {
        set.root(texPath)
        readStub.resolves('\\usepackage{import}\n\\usepackage[savemem]{listings}')
        await lw.cache.refreshCache(texPath)
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.completion->package', () => {
        function getSuggestions(provider: CompletionProvider) {
            return provider.from(['', ''], {
                uri: lw.file.toUri(texPath),
                langId: 'latex',
                line: '',
                position: new vscode.Position(0, 0),
            })
        }

        function getMacros() {
            return getSuggestions(macroProvider).map((s) => s.label)
        }

        it('should provide \\usepackage suggestions', () => {
            const labels = getSuggestions(packageProvider).map((s) => s.label)

            assert.ok(labels.includes('amsmath'))
        })

        it('should follow `intellisense.package.exclude` to exclude a particular package', async () => {
            await set.codeConfig('intellisense.package.exclude', ['import'])
            const labels = getMacros()

            assert.ok(labels.includes('\\date{}'))
            assert.ok(!labels.includes('\\import{}{}'))
            assert.ok(labels.includes('\\lstinputlisting{}'))
        })

        it('should follow `intellisense.package.exclude` to exclude multiple package', async () => {
            await set.codeConfig('intellisense.package.exclude', ['import', 'listings'])
            const labels = getMacros()

            assert.ok(labels.includes('\\date{}'))
            assert.ok(!labels.includes('\\import{}{}'))
            assert.ok(!labels.includes('\\lstinputlisting{}'))
        })

        it('should follow `intellisense.package.exclude` to exclude default packages with `lw-default` key', async () => {
            await set.codeConfig('intellisense.package.exclude', ['lw-default'])
            const labels = getMacros()

            assert.ok(!labels.includes('\\date{}'))
            assert.ok(labels.includes('\\import{}{}'))
            assert.ok(labels.includes('\\lstinputlisting{}'))
        })

        it('should provide base KOMAScript macros/envs in KOMAScript class', async () => {
            readStub.resolves('\\documentclass{scrartcl}')
            await lw.cache.refreshCache(texPath)
            const labels = getMacros()
            // in class-scrartcl.cwl
            assert.ok(labels.includes('\\addpart{}'))
            // in base
            assert.ok(labels.includes('\\addchap{}'))
        })
    })
})
