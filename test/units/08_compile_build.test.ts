import * as vscode from 'vscode'
import type { SpawnOptions } from 'child_process'
import * as cs from 'cross-spawn'
import * as path from 'path'
import * as sinon from 'sinon'
import { assert, get, log, mock, set, sleep } from './utils'
import { lw } from '../../src/lw'
import { autoBuild, build } from '../../src/compile/build'
import * as pick from '../../src/utils/quick-pick'
import { terminate } from '../../src/compile/terminate'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    let activeStub: sinon.SinonStub
    let findStub: sinon.SinonStub

    before(() => {
        mock.init(lw, 'file', 'root')
        ;(lw.cache.getIncludedTeX as sinon.SinonStub).returns([get.path('main.tex')])
        findStub = sinon.stub(lw.root, 'find')
        ;(lw.extra.clean as sinon.SinonStub).resolves(Promise.resolve())
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
                get.compiler.log().split('\n')[0].trim(),
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

            const stub = lw.viewer.refresh as sinon.SinonStub
            stub.resetHistory()
            await build()

            assert.ok(!stub.called)

            set.config('latex.tools', [{ name: 'tool', command: 'bash', args: ['-c', 'exit 0;'] }])

            stub.resetHistory()
            await build()

            assert.ok(stub.called)
        })
    })

    describe('lw.compile->build.spawnProcess', () => {
        let readStub: sinon.SinonStub

        before(() => {
            readStub = sinon.stub(lw.file, 'read')
        })

        after(() => {
            readStub.restore()
        })


        it('should respect `latex.build.clearLog.everyRecipeStep.enabled` config', async () => {
            set.config('latex.tools', [{ name: 'tool', command: 'bash', args: ['-c', 'echo 1;'] }])
            set.config('latex.recipes', [{ name: 'recipe', tools: ['tool', 'tool'] }])
            set.config('latex.build.clearLog.everyRecipeStep.enabled', true)

            await build()
            const stepLog = get.compiler.log()

            set.config('latex.build.clearLog.everyRecipeStep.enabled', false)
            await build()
            assert.strictEqual(stepLog + stepLog, get.compiler.log())
        })

        it('should handle magic comment %!TEX program', async () => {
            readStub.resolves('% !TEX program = echo\n')
            set.config('latex.build.forceRecipeUsage', false)
            set.config('latex.magic.args', ['--arg1', '--arg2'])

            await build()
            assert.strictEqual(get.compiler.log().trim(), '--arg1 --arg2')
        })

        it('should handle magic comment % !TEX program with % !TEX options', async () => {
            readStub.resolves('% !TEX program = echo\n% !TEX options = --arg1 --arg2\n')
            set.config('latex.build.forceRecipeUsage', false)

            await build()
            assert.strictEqual(get.compiler.log().trim(), '--arg1 --arg2')
        })

        it('should use the root file directory as cwd when building', async () => {
            set.root('main.tex')
            const spawnSpy = sinon.spy(lw.external, 'spawn')

            await build()
            spawnSpy.restore()

            assert.pathStrictEqual(spawnSpy.getCall(0)?.args?.[2].cwd?.toString(), path.dirname(get.path('main.tex')))
        })

        it('should change current working directory to root when using subfiles to compile sub files', async () => {
            set.root('main.tex')
            set.config('latex.tools', [
                { name: 'tool', command: 'latexmk', args: [] },
            ])
            lw.root.subfiles.path = get.path('sub/subfile.tex')

            const spawnStub = sinon.stub(lw.external, 'spawn')
            let lastSpawnArgs: [command: string, args: readonly string[], options: SpawnOptions] | undefined
            spawnStub.callsFake((...args) => {
                lastSpawnArgs = args
                return cs.spawn('true')
            })

            await build(true, get.path('sub/subfile.tex'), 'latex')
            spawnStub.restore()

            lw.root.subfiles.path = undefined

            assert.pathStrictEqual(lastSpawnArgs?.[2].cwd?.toString(), path.dirname(get.path('main.tex')))
        })

        it('should set and use `max_print_line` envvar when building', async () => {
            const spawnSpy = sinon.spy(lw.external, 'spawn')

            await build()
            spawnSpy.restore()

            assert.strictEqual(spawnSpy.getCall(0)?.args?.[2].env?.['max_print_line'], lw.constant.MAX_PRINT_LINE)
        })

        it('should spawn external commands with no env', async () => {
            set.config('latex.external.build.command', 'echo')
            const spawnSpy = sinon.spy(lw.external, 'spawn')

            await build()
            spawnSpy.restore()

            assert.strictEqual(spawnSpy.getCall(0)?.args?.[2].env, undefined)
        })
    })

    describe('lw.compile->build.monitorProcess', () => {
        it('should handle process error', async () => {
            set.config('latex.tools', [{ name: 'tool', command: 'absolutely-nonexistent', args: [] }])

            await build()

            assert.hasLog('LaTeX fatal error on PID')
            assert.hasLog('Error: spawn absolutely-nonexistent ENOENT')
        })

        it('should stop the recipe on process error', async () => {
            set.config('latex.tools', [{ name: 'tool', command: 'absolutely-nonexistent', args: [] }])
            set.config('latex.recipes', [{ name: 'recipe', tools: ['tool', 'tool'] }])

            await build()

            assert.notHasLog('Recipe step 2')
        })

        it('should retry building on non-zero exit code and `latex.autoBuild.cleanAndRetry.enabled`', async () => {
            set.config('latex.autoBuild.cleanAndRetry.enabled', true)
            set.config('latex.autoClean.run', 'onFailed')
            set.config('latex.recipes', [{ name: 'recipe', tools: ['bad'] }])

            ;(lw.extra.clean as sinon.SinonStub).resetHistory()
            await build()

            // First build
            assert.hasLog('Cleaning auxiliary files and retrying build after toolchain error.')
            // Second build
            assert.strictEqual((lw.extra.clean as sinon.SinonStub).callCount, 2)
        })

        it('should handle external command failure', async () => {
            set.config('latex.external.build.command', 'bash')
            set.config('latex.external.build.args', ['-c', 'exit 1;#external'])

            await build()

            assert.hasLog('Build with external command returns error')
        })

        it('should silently omit user termination', async () => {
            set.config('latex.autoBuild.cleanAndRetry.enabled', false)
            set.config('latex.tools', [{ name: 'tool', command: 'bash', args: ['-c', 'sleep 10;exit 0;'] }])

            ;(lw.extra.clean as sinon.SinonStub).resetHistory()
            const promise = build()
            let spawned = false
            while (!spawned) {
                try {
                    assert.hasLog('Recipe step 1 The command is bash:["-c","sleep 10;exit 0;"].')
                    spawned = true
                } catch (_) {
                    await sleep(10)
                }
            }
            terminate()
            await promise

            assert.notHasLog('Cleaning auxiliary files and retrying build after toolchain error.')
            assert.notHasLog('Build with external command returns error')
            assert.strictEqual((lw.extra.clean as sinon.SinonStub).callCount, 0)
        })
    })

    describe('lw.compile->build.afterSuccessfulBuilt', () => {
        it('should refresh the viewer after successful external command build, nothing else', async () => {
            set.config('latex.external.build.command', 'bash')
            set.config('latex.external.build.args', ['-c', 'exit 0;#external'])
            set.root('main.tex')

            const stub = lw.viewer.refresh as sinon.SinonStub
            stub.resetHistory()
            await build()

            assert.ok(stub.called)
            assert.notHasLog(`Successfully built ${get.path('main.tex')}`)
        })

        it('should not refresh viewer if the build is a skipped latexmk one', async () => {
            set.config('latex.tools', [
                { name: 'tool', command: 'bash', args: ['-c', 'echo "Latexmk: All targets (build) are up-to-date";'] },
            ])

            const stub = lw.viewer.refresh as sinon.SinonStub
            stub.resetHistory()
            await build()

            assert.ok(!stub.called)
        })

        it('should refresh viewer on general successful builds', async () => {
            const stub = lw.viewer.refresh as sinon.SinonStub
            stub.resetHistory()
            await build()

            assert.ok(stub.called)
        })

        it('should call `lw.completion.reference.setNumbersFromAuxFile` to set reference numbers', async () => {
            const stub = lw.completion.reference.setNumbersFromAuxFile as sinon.SinonStub
            stub.resetHistory()
            await build()

            assert.ok(stub.called)
        })

        it('should load generated .fls file in cache', async () => {
            const stub = lw.cache.loadFlsFile as sinon.SinonStub
            stub.resetHistory()
            await build()

            assert.ok(stub.called)
        })

        it('should call syncTeX only if the viewer is in `external` mode', async () => {
            set.config('view.pdf.viewer', 'external')
            set.config('synctex.afterBuild.enabled', true)

            await build()

            assert.hasLog('SyncTex after build invoked.')
        })

        it('should not call syncTeX if the viewer is not in `external` mode', async () => {
            set.config('view.pdf.viewer', 'tab')
            set.config('synctex.afterBuild.enabled', true)

            await build()

            assert.notHasLog('SyncTex after build invoked.')
        })

        it('should not call syncTeX if `synctex.afterBuild.enabled` is false', async () => {
            set.config('view.pdf.viewer', 'external')
            set.config('synctex.afterBuild.enabled', false)

            await build()

            assert.notHasLog('SyncTex after build invoked.')
        })

        it('should auto-clean if `latex.autoClean.run` is `onSucceeded` or `onBuilt`', async () => {
            set.config('latex.autoClean.run', 'onSucceeded')
            ;(lw.extra.clean as sinon.SinonStub).resetHistory()
            await build()
            assert.strictEqual((lw.extra.clean as sinon.SinonStub).callCount, 1)

            set.config('latex.autoClean.run', 'onBuilt')
            ;(lw.extra.clean as sinon.SinonStub).resetHistory()
            await build()
            assert.strictEqual((lw.extra.clean as sinon.SinonStub).callCount, 1)
        })
    })

    describe('lw.compile->build.autoBuild', () => {
        beforeEach(() => {
            lw.compile.lastAutoBuildTime = 0
        })

        it('should not trigger auto-build if invoking event is not set in config', async () => {
            set.config('latex.autoBuild.run', 'onFileChange')
            log.start()
            await autoBuild(get.path('main.tex'), 'onSave')
            log.stop()
            assert.notHasLog('Auto build started')

            set.config('latex.autoBuild.run', 'onSave')
            log.start()
            await autoBuild(get.path('main.tex'), 'onFileChange')
            log.stop()
            assert.notHasLog('Auto build started')
        })

        it('should not trigger auto-build if the last auto-build is too soon', async () => {
            set.config('latex.autoBuild.run', 'onFileChange')
            set.config('latex.autoBuild.delay', 10000)

            await autoBuild(get.path('main.tex'), 'onFileChange')
            log.start()
            await autoBuild(get.path('main.tex'), 'onFileChange')
            log.stop()

            assert.hasLog('Auto build started')
            assert.hasLog('Autobuild temporarily disabled.')

            lw.compile.lastAutoBuildTime = 0
            log.start()
            await autoBuild(get.path('main.tex'), 'onFileChange')
            log.stop()

            assert.notHasLog('Autobuild temporarily disabled.')
        })

        it('should auto-build subfiles if `latex.rootFile.useSubFile` is true and no bib change is detected', async () => {
            set.config('latex.autoBuild.run', 'onFileChange')
            set.config('latex.rootFile.useSubFile', true)
            set.root('main.tex')
            lw.root.subfiles.path = get.path('subfile.tex')
            lw.root.subfiles.langId = 'latex'

            log.start()
            await autoBuild(get.path('subfile.tex'), 'onFileChange', false)
            log.stop()

            lw.root.subfiles.path = undefined
            lw.root.subfiles.langId = undefined

            assert.hasLog(`Building root file: ${get.path('subfile.tex')}`)
            assert.notHasLog(`Building root file: ${get.path('main.tex')}`)

            lw.compile.lastAutoBuildTime = 0
            log.start()
            await autoBuild(get.path('subfile.tex'), 'onFileChange', false)
            log.stop()

            assert.hasLog(`Building root file: ${get.path('main.tex')}`)
            assert.notHasLog(`Building root file: ${get.path('subfile.tex')}`)
        })

        it('should auto-build when watched source is changed', () => {
            set.config('latex.autoBuild.run', 'onFileChange')

            log.start()
            for (const handler of lw.watcher.src['onChangeHandlers']) {
                try {
                    handler(vscode.Uri.file(get.path('main.tex')))
                } catch (_) { }
            }
            log.stop()

            assert.hasLog(`Auto build started detecting the change of a file: ${get.path('main.tex')}`)
        })

        it('should auto-build when watched bib file is changed', () => {
            set.config('latex.autoBuild.run', 'onFileChange')

            log.start()
            for (const handler of lw.watcher.bib['onChangeHandlers']) {
                try {
                    handler(vscode.Uri.file(get.path('main.bib')))
                } catch (_) { }
            }
            log.stop()

            assert.hasLog(`Auto build started detecting the change of a file: ${get.path('main.bib')}`)
        })
    })
})
