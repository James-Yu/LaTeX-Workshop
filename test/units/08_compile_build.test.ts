import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { assert, get, mock, set } from './utils'
import { lw } from '../../src/lw'
import { log as lwLog } from '../../src/utils/logger'
import { build } from '../../src/compile/build'
import * as pick from '../../src/utils/quick-pick'

describe.only(path.basename(__filename).split('.')[0] + ':', () => {
    let activeStub: sinon.SinonStub
    let findStub: sinon.SinonStub

    before(() => {
        mock.init(lw, 'file', 'root')
        ;(lw.cache.getIncludedTeX as sinon.SinonStub).returns([get.path('main.tex')])
        findStub = sinon.stub(lw.root, 'find')
    })

    beforeEach(() => {
        activeStub = mock.activeTextEditor(get.path('main.tex'), '', { languageId: 'latex' })
        findStub.callsFake(() => {
            set.root('main.tex')
            return Promise.resolve(undefined)
        })
        set.config('latex.tools', [
            { name: 'tool', command: 'bash', args: ['-c', 'exit 0;'] },
            { name: 'bad', command: 'bash', args: ['-c', 'exit 1;'] },
        ])
        set.config('latex.recipes', [{ name: 'recipe', tools: ['tool'] }])
    })

    afterEach(() => {
        activeStub.restore()
        findStub.resetHistory()
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.compile->build.build', () => {
        it('should do nothing if there is no active text editor', async () => {
            activeStub.restore()

            await build()

            assert.hasLog('Cannot start to build because the active editor is undefined.')
        })

        it('should try find root if not given as an argument', async () => {
            await build()

            assert.ok(findStub.called)
        })

        it('should skip finding root if given as an argument', async () => {
            await build(false, get.path('alt.tex'), 'latex')

            assert.ok(!findStub.called)
        })

        it('should use the correct root file if not given as an argument', async () => {
            set.root('main.tex')

            await build()

            assert.hasLog(`Building root file: ${get.path('main.tex')}`)
        })

        it('should use external command to build project if set', async () => {
            set.config('latex.external.build.command', 'bash')
            set.config('latex.external.build.args', ['-c', 'exit 0;#external'])

            await build()

            assert.hasLog('Recipe step 1 The command is bash:["-c","exit 0;#external"].')
        })

        it('should use the current pwd as external command cwd', async () => {
            set.config('latex.external.build.command', 'bash')
            set.config('latex.external.build.args', ['-c', 'echo $PWD'])

            await build()

            assert.pathStrictEqual(
                lwLog.getCachedLog().CACHED_COMPILER[0].trim(),
                path.dirname(get.path('main.tex')).replace(/^([a-zA-Z]):/, (_, p1: string) => '\\' + p1.toLowerCase())
            )
        })

        it('should do nothing if cannot find root and not external', async () => {
            findStub.callsFake(() => {
                lw.root.file.path = undefined
                lw.root.file.langId = undefined
                return Promise.resolve(undefined)
            })

            await build()

            assert.hasLog('Cannot find LaTeX root file. See')
        })

        it('should let use pick root file when subfile is detected', async () => {
            lw.root.subfiles.path = get.path('subfile.tex')
            lw.root.file.langId = 'latex'
            const stub = sinon.stub(pick, 'pickRootPath').resolves(get.path('subfile.tex'))

            await build()

            lw.root.subfiles.path = undefined
            lw.root.file.langId = undefined
            stub.restore()

            assert.hasLog(`Building root file: ${get.path('subfile.tex')}`)
        })

        it('should skip picking root file if `skipSelection` is `true`', async () => {
            lw.root.subfiles.path = get.path('subfile.tex')
            lw.root.file.langId = 'latex'
            const stub = sinon.stub(pick, 'pickRootPath').resolves(get.path('subfile.tex'))

            await build(true)

            lw.root.subfiles.path = undefined
            lw.root.file.langId = undefined
            stub.restore()

            assert.hasLog(`Building root file: ${get.path('main.tex')}`)
        })
    })

    describe('lw.compile->build.buildLoop', () => {
        it('should not loop a new build if another one is ongoing', async () => {
            set.config('latex.tools', [{ name: 'tool', command: 'bash', args: ['-c', 'sleep .5;exit 0;'] }])

            const buildPromise = build()
            await build()
            await buildPromise

            assert.hasLog('Another build loop is already running.')
        })

        it('should increment `lw.compile.compiledPDFWriting` to avoid PDF refresh during compilation', async () => {
            await build()

            assert.ok(lw.compile.compiledPDFWriting > 0, lw.compile.compiledPDFWriting.toString())

            await new Promise((resolve) =>
                setTimeout(
                    resolve,
                    (vscode.workspace.getConfiguration('latex-workshop').get('latex.watch.pdf.delay') as number) + 100
                )
            )

            assert.strictEqual(lw.compile.compiledPDFWriting, 0)
        })

        it('should handle multiple steps one by one', async () => {
            set.config('latex.recipes', [{ name: 'recipe', tools: ['tool', 'tool'] }])

            await build()

            assert.hasLog('Recipe step 1 The command is bash:["-c","exit 0;"].')
            assert.hasLog('Recipe step 2 The command is bash:["-c","exit 0;"].')
        })

        it('should early-terminate if a step returns non-zero code', async () => {
            set.config('latex.recipes', [{ name: 'recipe', tools: ['bad', 'tool'] }])
            set.config('latex.autoBuild.cleanAndRetry.enabled', false)

            await build()

            assert.hasLog('Recipe step 1 The command is bash:["-c","exit 1;"].')
            assert.notHasLog('Recipe step 2 The command is bash:["-c","exit 0;"].')
        })

        it('should correctly set `skipped` flag to `true` for skipped latexmk steps', async () => {
            set.config('latex.tools', [
                { name: 'tool', command: 'bash', args: ['-c', 'echo "Latexmk: All targets (build) are up-to-date";'] },
            ])

            const refreshStub = lw.viewer.refresh as sinon.SinonStub
            refreshStub.resetHistory()
            await build()

            assert.ok(!refreshStub.called)

            set.config('latex.tools', [{ name: 'tool', command: 'bash', args: ['-c', 'exit 0;'] }])

            refreshStub.resetHistory()
            await build()

            assert.ok(refreshStub.called)
        })
    })
})
