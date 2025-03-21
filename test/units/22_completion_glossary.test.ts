import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'
import { assert, get, mock, set } from './utils'
import { glossary, provider } from '../../src/completion/completer/glossary'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]
    const texPath = get.path(fixture, 'main.tex')
    const glsPath = get.path(fixture, 'gls.tex')
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

    function getSuggestions() {
        return provider.from(['', ''], {
            uri: lw.file.toUri(texPath),
            langId: 'latex',
            line: '',
            position: new vscode.Position(0, 0),
        })
    }

    describe('lw.completion->glossary', () => {
        it('should parse and provide \\newacronym definition', async () => {
            readStub.resolves('\\newacronym{rf}{RF}{radio-frequency}')
            await lw.cache.refreshCache(texPath)

            const suggestions = getSuggestions()

            assert.ok(suggestions.some(s => s.label === 'rf'))
            assert.strictEqual(suggestions.find(s => s.label === 'rf')?.detail, 'radio-frequency')
        })

        it('should reject ill-formed glossary definitions', async () => {
            readStub.resolves('\\newacronym[argopt]{EPE_x}{E} % ill-formed entry')
            await lw.cache.refreshCache(texPath)

            const suggestions = getSuggestions()

            assert.ok(!suggestions.some(s => s.label === 'EPE_x'))
        })

        it('should parse and provide \\newglossaryentry definition', async () => {
            readStub.resolves('\\newglossaryentry{vs_code}{name=VSCode, description=Editor}')
            await lw.cache.refreshCache(texPath)

            const suggestions = getSuggestions()

            assert.ok(suggestions.some(s => s.label === 'vs_code'))
            assert.strictEqual(suggestions.find(s => s.label === 'vs_code')?.detail, 'Editor')
        })

        it('should parse and provide \\newglossaryentry definition with curly brace fence', async () => {
            readStub.resolves('\\newglossaryentry{lw}{name={LaTeX Workshop}, description={What this extension is $\\mathbb{A}$}}')
            await lw.cache.refreshCache(texPath)

            const suggestions = getSuggestions()

            assert.ok(suggestions.some(s => s.label === 'lw'))
            assert.strictEqual(suggestions.find(s => s.label === 'lw')?.detail, 'What this extension is $\\mathbb{A}$')
        })

        it('should parse and provide \\newabbr definition', async () => {
            readStub.resolves('\\newabbr{abbr_x}{Ebbr}{A first abbreviation}')
            await lw.cache.refreshCache(texPath)

            const suggestions = getSuggestions()

            assert.ok(suggestions.some(s => s.label === 'abbr_x'))
            assert.strictEqual(suggestions.find(s => s.label === 'abbr_x')?.detail, 'A first abbreviation')
        })

        it('should parse and provide \\newabbreviation definition', async () => {
            readStub.resolves('\\newabbreviation[optional arg]{abbr_y}{Ybbr}{A second abbreviation}')
            await lw.cache.refreshCache(texPath)

            const suggestions = getSuggestions()

            assert.ok(suggestions.some(s => s.label === 'abbr_y'))
            assert.strictEqual(suggestions.find(s => s.label === 'abbr_y')?.detail, 'A second abbreviation')
        })

        it('should parse and provide glossary definitions in another file given in \\loadglsentries', async () => {
            const stub = sinon.stub(lw.file, 'exists').resolves({ type: 1, ctime: 0, mtime: 0, size: 0 })
            readStub.resolves('\\newacronym{rf}{RF}{radio-frequency}')
            readStub.withArgs(texPath).resolves('\\loadglsentries{gls}')
            await lw.cache.refreshCache(texPath)
            await lw.cache.refreshCache(glsPath)
            stub.restore()

            const suggestions = getSuggestions()

            assert.ok(suggestions.some(s => s.label === 'rf'))
            assert.strictEqual(suggestions.find(s => s.label === 'rf')?.detail, 'radio-frequency')
        })
    })

    describe('lw.completion->glossary.parseBibFile', () => {
        const bibFile = 'glossary.bib'
        const bibPath = get.path(fixture, bibFile)

        it('should parse the bib file', async () => {
            readStub.withArgs(texPath).resolves(`\\GlsXtrLoadResources[src={${bibFile}}]`)
            await lw.cache.refreshCache(texPath)
            sinon.restore()

            await glossary.parseBibFile(bibPath)

            const suggestions = getSuggestions()
            assert.ok(suggestions.find(item => item.label === 'fs' && item.detail?.includes('\\ensuremath{f_s}')))
            assert.ok(suggestions.find(item => item.label === 'theta' && item.detail?.includes('\\ensuremath{\\theta}')))
            assert.ok(suggestions.find(item => item.label === 'caesar' && item.detail?.includes('\\sortname{Gaius Julius}{Caesar}')))
            assert.ok(suggestions.find(item => item.label === 'wellesley' && item.detail?.includes('\\sortname{Arthur}{Wellesley}')))
            assert.ok(suggestions.find(item => item.label === 'wellington' && item.detail?.includes('Wellington')))
        })
    })
})
