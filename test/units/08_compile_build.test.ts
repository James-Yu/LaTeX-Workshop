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
        mock.object(lw, 'file', 'root')
        ;(lw.cache.getIncludedTeX as sinon.SinonStub).returns([ get.path('main.tex') ])
        findStub = sinon.stub(lw.root, 'find')
    })

    beforeEach(async () => {
        activeStub = mock.activeTextEditor(get.path('main.tex'), '', { languageId: 'latex' })
        findStub.callsFake(() => {
            set.root('main.tex')
            return Promise.resolve(undefined)
        })
        await set.config('latex.tools', [{ name: 'tool', command: 'bash', args: ['-c', 'exit 0;'] }])
        await set.config('latex.recipes', [{ name: 'recipe', tools: ['tool'] }])
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
            await set.config('latex.external.build.command', 'bash')
            await set.config('latex.external.build.args', ['-c', 'exit 0;#external'])

            await build()

            assert.hasLog('Recipe step 1 The command is bash:["-c","exit 0;#external"].')
        })

        it.only('should use the current pwd as external command cwd', async () => {
            await set.config('latex.external.build.command', 'bash')
            await set.config('latex.external.build.args', ['-c', 'echo $PWD'])

            await build()

            assert.pathStrictEqual(lwLog.getCachedLog().CACHED_COMPILER[0].trim(), path.dirname(get.path('main.tex')).replace(/^([a-zA-Z]):/, (_, p1: string) => '\\' + p1.toLowerCase()))
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
})
