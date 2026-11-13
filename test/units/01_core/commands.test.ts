import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { assert, get, mock } from '../utils'
import { lw } from '../../../src/lw'
import { addTexRoot } from '../../../src/core/commands'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = get.fixture(__filename)

    describe('lw.commands.addTexRoot', () => {
        let texrootStub: sinon.SinonStub
        let activeStub: sinon.SinonStub | undefined

        beforeEach(() => {
            texrootStub = sinon.stub(lw.extra, 'texroot')
        })

        afterEach(() => {
            activeStub?.restore()
            activeStub = undefined
            texrootStub.restore()
        })

        for (const [languageId, fileName] of [['latex', 'main.tex'], ['latex-class', 'main.cls'], ['latex-package', 'main.sty']]) {
            it(`should call texroot when the active editor language is ${languageId}`, () => {
                activeStub = mock.activeTextEditor(get.path(fixture, fileName), '', { languageId })

                addTexRoot()

                assert.strictEqual(texrootStub.callCount, 1)
            })
        }

        for (const [languageId, fileName] of [['plaintext', 'main.txt'], ['markdown', 'main.md']]) {
            it(`should not call texroot when the active editor language is ${languageId}`, () => {
                activeStub = mock.activeTextEditor(get.path(fixture, fileName), '', { languageId })

                addTexRoot()

                assert.strictEqual(texrootStub.callCount, 0)
            })
        }

        it('should not call texroot when there is no active editor', () => {
            activeStub = sinon.stub(vscode.window, 'activeTextEditor').value(undefined)

            addTexRoot()

            assert.strictEqual(texrootStub.callCount, 0)
        })
    })
})
