import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'
import { get, mock, set } from './utils'
import { provider } from '../../src/completion/completer/reference'
import assert from 'assert'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]
    const texPath = get.path(fixture, 'main.tex')
    const subPath = get.path(fixture, 'sub.tex')
    let readStub: sinon.SinonStub
    let existsStub: sinon.SinonStub

    before(() => {
        mock.init(lw, 'root', 'cache', 'parser', 'completion')
        readStub = sinon.stub(lw.file, 'read')
        existsStub = sinon.stub(lw.file, 'exists')
    })

    beforeEach(async () => {
        readStub.withArgs(texPath).resolves('\\section{1}\\label{sec:1}\n\\begin{frame}[label={frame}]label={trap}\\end{frame}\\input{sub}')
        readStub.withArgs(subPath).resolves('\\section{2}\\label{sec:2}')
        existsStub.withArgs(texPath).resolves(true)
        existsStub.withArgs(subPath).resolves(true)
        set.root(texPath)
        await lw.cache.refreshCache(texPath)
        await lw.cache.refreshCache(subPath)
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.completion->reference', () => {
        function getSuggestions() {
            return provider.from(['', ''], { uri: vscode.Uri.file(texPath), langId: 'latex', line: '', position: new vscode.Position(0, 0) })
        }

        function getLabels() {
            return getSuggestions().map(s => s.label)
        }

        it('should provide label references', () => {
            const labels = getLabels()

            assert.ok(labels.includes('sec:1'))
        })

        it('should parse `[label={frame}]` references', () => {
            const labels = getLabels()

            assert.ok(labels.includes('frame'))
        })

        it('should avoid plain `label={frame}` fake references', () => {
            const labels = getLabels()

            assert.ok(!labels.includes('trap'))
        })

        it('should follow tex input tree to obtain references', () => {
            const labels = getLabels()

            assert.ok(labels.includes('sec:2'))
        })

        it('should follow `intellisense.label.command` to parse references', async () => {
            readStub.withArgs(texPath).resolves('\\label{label:1}\n\\linelabel{label:2}\n\\customlabel{label:3}')
            await lw.cache.refreshCache(texPath)
            let labels = getLabels()
            assert.ok(labels.includes('label:1'))
            assert.ok(labels.includes('label:2'))
            assert.ok(!labels.includes('label:3'))

            await set.codeConfig('intellisense.label.command', ['customlabel'])
            await lw.cache.refreshCache(texPath)
            labels = getLabels()
            assert.ok(!labels.includes('label:1'))
            assert.ok(!labels.includes('label:2'))
            assert.ok(labels.includes('label:3'))
        })

        it('should parse `xr` package references', async () => {
            readStub.withArgs(texPath).resolves('\\externaldocument{sub}')
            await lw.cache.refreshCache(texPath)
            await lw.cache.refreshCache(subPath)
            const labels = getLabels()

            assert.ok(labels.includes('sec:2'))
        })

        it('should parse `xr` package references with prefix', async () => {
            readStub.withArgs(texPath).resolves('\\externaldocument[pre-]{sub}')
            await lw.cache.refreshCache(texPath)
            await lw.cache.refreshCache(subPath)
            const labels = getLabels()

            assert.ok(labels.includes('pre-sec:2'))
        })
    })
})
