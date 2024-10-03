import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'
import { assert, get, mock, set } from './utils'
import { provider } from '../../src/completion/completer/environment'
import { provider as macro } from '../../src/completion/completer/macro'

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

    describe('lw.completion->environment', () => {
        function getSuggestions() {
            return provider.from(['', ''], {
                uri: vscode.Uri.file(texPath),
                langId: 'latex',
                line: '',
                position: new vscode.Position(0, 0),
            })
        }

        function getEnvs() {
            return getSuggestions().map((s) => s.label)
        }

        it('should provide default environments', () => {
            const labels = getEnvs()

            assert.ok(labels.includes('document'))
        })

        it('should provide environments in the form of macros', () => {
            const labels = macro
                .from(['', ''], {
                    uri: vscode.Uri.file(texPath),
                    langId: 'latex',
                    line: '',
                    position: new vscode.Position(0, 0),
                })
                .map((s) => s.label)

            assert.ok(labels.includes('document'))
        })

        it('should provide environments defined in packages', async () => {
            assert.ok(!getEnvs().includes('algorithm'))

            readStub.resolves('\\usepackage{algorithm2e}')
            await lw.cache.refreshCache(texPath)
            assert.ok(getEnvs().includes('algorithm'))
        })

        it('should provide environments defined in packages and filtered by package arguments', async () => {
            readStub.resolves('\\usepackage{algorithm2e}')
            await lw.cache.refreshCache(texPath)
            assert.ok(!getEnvs().includes('algorithm2e'))

            readStub.resolves('\\usepackage[algo2e]{algorithm2e}')
            await lw.cache.refreshCache(texPath)
            assert.ok(getEnvs().includes('algorithm2e'))
        })

        it('should provide environments in the form of macros', async () => {
            readStub.resolves('\\usepackage{algorithm2e}')
            await lw.cache.refreshCache(texPath)

            const labels = macro
                .from(['', ''], {
                    uri: vscode.Uri.file(texPath),
                    langId: 'latex',
                    line: '',
                    position: new vscode.Position(0, 0),
                })
                .map((s) => s.label)

            assert.ok(labels.includes('algorithm'))
        })
    })
})
