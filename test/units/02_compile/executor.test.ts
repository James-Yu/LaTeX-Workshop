import path from 'path'
import * as sinon from 'sinon'
import * as vscode from 'vscode'
import { Executor } from '../../../src/compile/executor'
import { Plan } from '../../../src/compile/plan'
import { Recipe } from '../../../src/compile/recipe'
import type { PlanResult, StepResult, Tool } from '../../../src/compile/types'
import { lw } from '../../../src/lw'
import * as pick from '../../../src/utils/quick-pick'
import { assert, deferred, get, mock, set, sleep, waitFor } from '../utils'

const rootFile = get.path('main.tex')
const subfile = get.path('sub', 'main.tex')
const createRealPlan = Plan.create.bind(Plan)

function stepResult(overrides: Partial<StepResult> = {}): StepResult {
    return {
        status: 'succeeded',
        code: 0,
        signal: null,
        stdout: '',
        stderr: '',
        skipped: false,
        backend: 'unknown',
        ...overrides
    }
}

function createPlan(
    name = 'Recipe',
    options: {rootFile?: string, isExternal?: boolean, tools?: Tool[]} = {}
): Plan {
    const plan = createRealPlan({
        name,
        tools: options.tools ?? [{name: `${name}-tool`, command: 'pdflatex'}],
        rootFile: options.rootFile === undefined ? rootFile : options.rootFile,
        cwd: get.path(),
        isExternal: options.isExternal ?? false
    })
    assert.ok(plan)
    return plan
}

function planResult(plan: Plan, overrides: Partial<PlanResult> = {}): PlanResult {
    const result = stepResult(overrides.result)
    return {
        status: result.status,
        step: plan.steps[0],
        result,
        skipped: false,
        backend: result.backend,
        ...overrides
    }
}

describe(path.basename(__filename).split('.')[0] + ':', () => {
    let executor: Executor
    let activeEditor: sinon.SinonStub
    let findRoot: sinon.SinonStub
    let saveAll: sinon.SinonStub
    let pickRoot: sinon.SinonStub
    let createRecipe: sinon.SinonStub
    let createExternal: sinon.SinonStub
    let createPlanStub: sinon.SinonStub
    let getAuxDir: sinon.SinonStub
    let fileExists: sinon.SinonStub
    let mkdir: sinon.SinonStub
    let plans: Plan[]

    before(() => {
        mock.init(lw)
        findRoot = lw.root.find as sinon.SinonStub
        saveAll = sinon.stub(vscode.workspace, 'saveAll')
        pickRoot = sinon.stub(pick, 'pickRootPath')
        createRecipe = sinon.stub(Recipe, 'create')
        createExternal = sinon.stub(Recipe, 'createExternal')
        createPlanStub = sinon.stub(Plan, 'create')
        getAuxDir = sinon.stub(lw.file, 'getAuxDir')
        fileExists = sinon.stub(lw.file, 'exists')
        mkdir = sinon.stub(lw.external, 'mkdirSync')
    })

    beforeEach(() => {
        executor = new Executor()
        plans = []
        activeEditor = mock.activeTextEditor(rootFile, '', {languageId: 'latex'})
        findRoot.reset()
        findRoot.callsFake(() => {
            set.root('main.tex')
            return Promise.resolve()
        })
        saveAll.reset()
        saveAll.resolves(true)
        pickRoot.reset()
        pickRoot.resolves(rootFile)
        createRecipe.reset()
        createRecipe.callsFake((file: string, _languageId: string, recipeName?: string) => Promise.resolve({
            name: recipeName ?? 'Recipe',
            tools: [{name: 'tool', command: 'pdflatex'}],
            rootFile: file,
            cwd: path.dirname(file),
            isExternal: false
        }))
        createExternal.reset()
        createExternal.returns(undefined)
        createPlanStub.reset()
        createPlanStub.callsFake((recipe: {
            name: string,
            tools: Tool[],
            rootFile?: string,
            cwd: string,
            isExternal: boolean
        }) => {
            const plan = createRealPlan(recipe)
            assert.ok(plan)
            sinon.stub(plan, 'run').resolves(planResult(plan))
            plans.push(plan)
            return plan
        })
        ;(lw.cache.getIncludedTeX as sinon.SinonStub).reset()
        ;(lw.cache.getIncludedTeX as sinon.SinonStub).returns([])
        ;(lw.cache.loadFlsFile as sinon.SinonStub).reset()
        ;(lw.cache.loadFlsFile as sinon.SinonStub).resolves()
        getAuxDir.reset()
        getAuxDir.returns('.')
        fileExists.reset()
        fileExists.resolves({type: vscode.FileType.Directory})
        mkdir.reset()
        ;(lw.extra.clean as sinon.SinonStub).reset()
        ;(lw.extra.clean as sinon.SinonStub).resolves()
        ;(lw.event.fire as sinon.SinonStub).reset()
        ;(lw.viewer.refresh as sinon.SinonStub).reset()
        ;(lw.completion.reference.setNumbersFromAuxFile as sinon.SinonStub).reset()
        ;(lw.locate.synctex.toPDF as sinon.SinonStub).reset()
        set.config('latex.tools', [])
        set.config('latex.external.build.command', '')
        set.config('latex.external.build.args', [])
        set.config('latex.rootFile.useSubFile', false)
        set.config('latex.watch.pdf.delay', 0)
        set.config('latex.autoClean.run', 'never')
        set.config('view.pdf.viewer', 'tab')
        set.config('synctex.afterBuild.enabled', false)
    })

    afterEach(() => {
        activeEditor.restore()
        lw.root.subfiles.path = undefined
        lw.root.subfiles.langId = undefined
    })

    after(() => {
        sinon.restore()
    })

    describe('Executor.initialize', () => {
        it('sets Docker environment and registers each listener once', () => {
            set.config('docker.image.latex', 'image')
            set.config('docker.path', '/docker')
            const onConfigChange = lw.onConfigChange as sinon.SinonStub
            onConfigChange.reset()

            executor.initialize()
            executor.initialize()

            assert.strictEqual(process.env['LATEXWORKSHOP_DOCKER_LATEX'], 'image')
            assert.strictEqual(process.env['LATEXWORKSHOP_DOCKER_PATH'], '/docker')
            assert.ok(onConfigChange.calledTwice)
            assert.deepStrictEqual(onConfigChange.firstCall.args[0], 'docker.image.latex')
            assert.deepStrictEqual(onConfigChange.secondCall.args[0], 'docker.path')
        })

        it('updates Docker environment from registered callbacks', () => {
            const onConfigChange = lw.onConfigChange as sinon.SinonStub
            onConfigChange.reset()
            executor.initialize()
            set.config('docker.image.latex', 'new-image')
            set.config('docker.path', '/new-docker')

            const updateImage = onConfigChange.firstCall.args[1] as () => void
            const updatePath = onConfigChange.secondCall.args[1] as () => void
            updateImage()
            updatePath()

            assert.strictEqual(process.env['LATEXWORKSHOP_DOCKER_LATEX'], 'new-image')
            assert.strictEqual(process.env['LATEXWORKSHOP_DOCKER_PATH'], '/new-docker')
        })
    })

    describe('Executor.run preparation', () => {
        it('returns without an active editor', async () => {
            activeEditor.restore()
            await executor.run({isAuto: false, isBibChanged: false})
            assert.ok(createRecipe.notCalled)
            assert.hasLog('active editor is undefined')
        })

        it('finds a manual LaTeX root and forwards a recipe name', async () => {
            await executor.run({recipeName: 'named', isAuto: false, isBibChanged: false})
            assert.ok(findRoot.calledOnce)
            assert.ok(createRecipe.calledOnceWithExactly(rootFile, 'latex', 'named'))
            assert.ok(saveAll.calledOnce)
        })

        it('does not find a root for a non-LaTeX editor', async () => {
            activeEditor.restore()
            activeEditor = mock.activeTextEditor(rootFile, '', {languageId: 'markdown'})
            await executor.run({isAuto: false, isBibChanged: false})
            assert.ok(findRoot.notCalled)
            assert.ok(createRecipe.notCalled)
            assert.hasLog('Cannot find LaTeX root file.')
        })

        it('returns when manual root discovery finds no root', async () => {
            findRoot.callsFake(() => Promise.resolve(undefined))
            await executor.run({isAuto: false, isBibChanged: false})
            assert.ok(saveAll.notCalled)
            assert.hasLog('Cannot find LaTeX root file.')
        })

        it('builds the picked subfile and returns when picking is cancelled', async () => {
            lw.root.subfiles.path = subfile
            lw.root.subfiles.langId = 'latex'
            pickRoot.resolves(subfile)
            await executor.run({isAuto: false, isBibChanged: false})
            assert.ok(createRecipe.calledWithExactly(subfile, 'latex', undefined))

            createRecipe.resetHistory()
            pickRoot.resolves(undefined)
            await executor.run({isAuto: false, isBibChanged: false})
            assert.ok(createRecipe.notCalled)
        })

        it('uses a subfile for auto build except after a bibliography change', async () => {
            set.root('main.tex')
            lw.root.subfiles.path = subfile
            lw.root.subfiles.langId = 'latex'
            set.config('latex.rootFile.useSubFile', true)
            await executor.run({isAuto: true, isBibChanged: false})
            assert.ok(findRoot.notCalled)
            assert.ok(createRecipe.calledWithExactly(subfile, 'latex', undefined))

            createRecipe.resetHistory()
            await executor.run({isAuto: true, isBibChanged: true})
            assert.ok(createRecipe.calledWithExactly(rootFile, 'latex', undefined))
        })

        it('uses the active editor scope when auto build has no root', async () => {
            await executor.run({isAuto: true, isBibChanged: false})
            assert.ok(createRecipe.notCalled)
            assert.hasLog('Cannot find LaTeX root file.')
        })

        it('runs an external recipe before subfile selection and saves once', async () => {
            lw.root.subfiles.path = subfile
            const external = {
                name: 'External',
                tools: [{name: 'make', command: 'make'}],
                rootFile,
                cwd: get.path(),
                isExternal: true
            }
            createExternal.returns(external)
            await executor.run({isAuto: false, isBibChanged: false})
            assert.ok(findRoot.calledBefore(createExternal))
            assert.ok(pickRoot.notCalled)
            assert.ok(createRecipe.notCalled)
            assert.ok(saveAll.calledOnce)
        })

        it('passes the active document directory as external fallback cwd', async () => {
            activeEditor.restore()
            const activeFile = get.path('active', 'document.tex')
            activeEditor = mock.activeTextEditor(activeFile, '', {languageId: 'latex'})

            await executor.run({isAuto: false, isBibChanged: false})

            assert.pathStrictEqual(createExternal.firstCall.args[1] as string, path.dirname(activeFile))
        })

        it('rejects saveAll errors without calling Recipe.create', async () => {
            const error = new Error('save failed')
            saveAll.rejects(error)
            await assert.rejects(
                executor.run({isAuto: false, isBibChanged: false}),
                error
            )
            assert.ok(createRecipe.notCalled)
        })

        it('does not execute when Recipe or Plan creation is invalid', async () => {
            createRecipe.resolves(undefined)
            await executor.run({isAuto: false, isBibChanged: false})
            assert.strictEqual(executor.compiledPDFWriting, 0)

            createRecipe.reset()
            createRecipe.resolves({name: 'invalid'})
            createPlanStub.returns(undefined)
            await executor.run({isAuto: false, isBibChanged: false})
            assert.strictEqual(executor.compiledPDFWriting, 0)
        })
    })

    describe('Executor execution preparation', () => {
        it('sets active state, backend, PDF path, and delayed writing counter', async () => {
            const gate = deferred<PlanResult>()
            createPlanStub.callsFake(() => {
                const plan = createPlan()
                sinon.stub(plan, 'run').returns(gate.promise)
                plans.push(plan)
                return plan
            })

            const run = executor.run({isAuto: false, isBibChanged: false})
            await waitFor(() => executor.activePlan !== undefined, {interval: 0})
            assert.strictEqual(executor.activePlan, plans[0])
            assert.strictEqual(executor.compiledPDFWriting, 1)
            assert.pathStrictEqual(executor.compiledPDFPath, get.path('main.pdf'))
            gate.resolve(planResult(plans[0], {backend: 'xetex'}))
            await run
            assert.strictEqual(executor.activePlan, undefined)
            assert.strictEqual(executor.backend, 'xetex')
            assert.strictEqual(executor.compiledPDFWriting, 1)
            await sleep(0)
            assert.strictEqual(executor.compiledPDFWriting, 0)
        })

        it('keeps the previous PDF path for a forced internal latexmk plan', async () => {
            Reflect.set(executor, '_compiledPDFPath', '/previous.pdf')
            createPlanStub.callsFake(() => {
                const plan = createPlan('forced', {
                    tools: [{
                        name: 'latexmk',
                        command: 'latexmk',
                        args: ['-interaction=nonstopmode', '-f']
                    }]
                })
                sinon.stub(plan, 'run').resolves(planResult(plan))
                plans.push(plan)
                return plan
            })

            await executor.run({isAuto: false, isBibChanged: false})

            assert.strictEqual(executor.compiledPDFPath, '/previous.pdf')
        })

        it('sets an external PDF path even when the command is latexmk', async () => {
            createExternal.returns({
                name: 'External',
                tools: [{name: 'latexmk', command: 'latexmk', args: ['-interaction=nonstopmode', '-f']}],
                rootFile,
                cwd: get.path(),
                isExternal: true
            })

            await executor.run({isAuto: false, isBibChanged: false})

            assert.pathStrictEqual(executor.compiledPDFPath, get.path('main.pdf'))
            assert.ok(getAuxDir.notCalled)
        })

        it('uses the main root for latexmk subfile aux preparation', async () => {
            set.root('main.tex')
            lw.root.subfiles.path = subfile
            lw.root.subfiles.langId = 'latex'
            set.config('latex.rootFile.useSubFile', true)
            createPlanStub.callsFake(() => {
                const plan = createPlan('subfile', {
                    rootFile: subfile,
                    tools: [{name: 'latexmk', command: 'latexmk'}]
                })
                sinon.stub(plan, 'run').resolves(planResult(plan))
                plans.push(plan)
                return plan
            })

            await executor.run({isAuto: true, isBibChanged: false})

            assert.ok(getAuxDir.calledWithExactly(rootFile))
        })

        it('creates missing relative aux subdirectories', async () => {
            const included = get.path('chapters', 'part.tex')
            getAuxDir.returns('out')
            ;(lw.cache.getIncludedTeX as sinon.SinonStub).returns([included])
            fileExists.resolves(undefined)

            await executor.run({isAuto: false, isBibChanged: false})

            assert.ok(mkdir.calledOnceWithExactly(get.path('out', 'chapters'), {recursive: true}))
        })

        it('keeps absolute aux paths and existing directory links', async () => {
            const auxDir = get.path('absolute-aux')
            getAuxDir.returns(auxDir)
            ;(lw.cache.getIncludedTeX as sinon.SinonStub).returns([rootFile])
            fileExists.resolves({
                type: vscode.FileType.Directory | vscode.FileType.SymbolicLink
            })

            await executor.run({isAuto: false, isBibChanged: false})

            assert.hasLog(`RootFile auxDir: ${auxDir}`)
            assert.ok(mkdir.notCalled)
        })

        it('logs Error aux failures and continues with later files', async () => {
            ;(lw.cache.getIncludedTeX as sinon.SinonStub).returns([rootFile, subfile])
            fileExists.onFirstCall().rejects(new Error('stat failed'))
            fileExists.onSecondCall().resolves({type: vscode.FileType.Directory})

            await executor.run({isAuto: false, isBibChanged: false})

            assert.hasLog('Unexpected Error: Error: stat failed')
            assert.ok(fileExists.calledTwice)
        })

        it('rethrows non-Error aux failures and restores state', async () => {
            ;(lw.cache.getIncludedTeX as sinon.SinonStub).returns([rootFile])
            fileExists.callsFake(() => Promise.reject('stat failed'))

            await assert.rejects(
                executor.run({isAuto: false, isBibChanged: false}),
                error => error === 'stat failed'
            )
            assert.strictEqual(executor.activePlan, undefined)
            await sleep(0)
            assert.strictEqual(executor.compiledPDFWriting, 0)
        })
    })

    describe('Executor plan outcomes', () => {
        it('performs successful internal follow-up in order', async () => {
            set.config('view.pdf.viewer', 'external')
            set.config('synctex.afterBuild.enabled', true)
            set.config('latex.autoClean.run', 'onSucceeded')
            const calls: string[] = []
            ;(lw.event.fire as sinon.SinonStub).callsFake(() => calls.push('event'))
            ;(lw.viewer.refresh as sinon.SinonStub).callsFake(() => calls.push('viewer'))
            ;(lw.completion.reference.setNumbersFromAuxFile as sinon.SinonStub).callsFake(() => calls.push('reference'))
            ;(lw.cache.loadFlsFile as sinon.SinonStub).callsFake(() => Promise.resolve(calls.push('fls')))
            ;(lw.locate.synctex.toPDF as sinon.SinonStub).callsFake(() => calls.push('synctex'))
            ;(lw.extra.clean as sinon.SinonStub).callsFake(() => Promise.resolve(calls.push('clean')))

            await executor.run({isAuto: false, isBibChanged: false})

            assert.deepStrictEqual(calls, ['event', 'viewer', 'reference', 'fls', 'synctex', 'clean'])
            assert.hasLog(`Successfully built ${rootFile}`)
        })

        it('fires BuildDone but skips other internal follow-up for skipped plans', async () => {
            createPlanStub.callsFake(() => {
                const plan = createPlan()
                sinon.stub(plan, 'run').resolves(planResult(plan, {skipped: true}))
                plans.push(plan)
                return plan
            })

            await executor.run({isAuto: false, isBibChanged: false})

            assert.ok((lw.event.fire as sinon.SinonStub).calledOnceWithExactly(lw.event.BuildDone))
            assert.ok((lw.viewer.refresh as sinon.SinonStub).notCalled)
        })

        it('refreshes only the viewer for a rootless external plan', async () => {
            createExternal.returns({
                name: 'External',
                tools: [{name: 'make', command: 'make'}],
                rootFile: undefined,
                cwd: get.path(),
                isExternal: true
            })
            await executor.run({isAuto: false, isBibChanged: false})
            assert.ok((lw.viewer.refresh as sinon.SinonStub).calledOnceWithExactly())
            assert.ok((lw.event.fire as sinon.SinonStub).notCalled)
        })

        it('refreshes rooted external output and performs rooted follow-up', async () => {
            createExternal.returns({
                name: 'External',
                tools: [{name: 'make', command: 'make'}],
                rootFile,
                cwd: get.path(),
                isExternal: true
            })
            await executor.run({isAuto: false, isBibChanged: false})
            assert.ok((lw.viewer.refresh as sinon.SinonStub).calledOnce)
            assert.ok((lw.cache.loadFlsFile as sinon.SinonStub).calledOnceWithExactly(rootFile))
        })

        it('does not invoke SyncTeX unless both settings enable it', async () => {
            set.config('view.pdf.viewer', 'external')
            await executor.run({isAuto: false, isBibChanged: false})
            assert.ok((lw.locate.synctex.toPDF as sinon.SinonStub).notCalled)

            ;(lw.locate.synctex.toPDF as sinon.SinonStub).resetHistory()
            set.config('view.pdf.viewer', 'tab')
            set.config('synctex.afterBuild.enabled', true)
            await executor.run({isAuto: false, isBibChanged: false})
            assert.ok((lw.locate.synctex.toPDF as sinon.SinonStub).notCalled)
        })

        it('cleans successful plans for onBuilt', async () => {
            set.config('latex.autoClean.run', 'onBuilt')
            await executor.run({isAuto: false, isBibChanged: false})
            assert.ok((lw.extra.clean as sinon.SinonStub).calledOnceWithExactly(rootFile))
        })

        it('propagates successful clean errors and restores state', async () => {
            set.config('latex.autoClean.run', 'onSucceeded')
            ;(lw.extra.clean as sinon.SinonStub).rejects(new Error('clean failed'))
            await assert.rejects(
                executor.run({isAuto: false, isBibChanged: false}),
                /clean failed/
            )
            assert.strictEqual(executor.activePlan, undefined)
        })

        for (const mode of ['onFailed', 'onBuilt']) {
            it(`cleans an internal failed plan for ${mode}`, async () => {
                set.config('latex.autoClean.run', mode)
                createPlanStub.callsFake(() => {
                    const plan = createPlan()
                    sinon.stub(plan, 'run').resolves(planResult(plan, {
                        status: 'failed',
                        result: stepResult({status: 'failed', code: 1})
                    }))
                    plans.push(plan)
                    return plan
                })
                await executor.run({isAuto: false, isBibChanged: false})
                assert.ok((lw.extra.clean as sinon.SinonStub).calledOnceWithExactly(rootFile))
            })
        }

        it('logs failed clean rejection without replacing the build failure', async () => {
            set.config('latex.autoClean.run', 'onFailed')
            ;(lw.extra.clean as sinon.SinonStub).rejects(new Error('clean failed'))
            createPlanStub.callsFake(() => {
                const plan = createPlan()
                sinon.stub(plan, 'run').resolves(planResult(plan, {
                    status: 'failed',
                    result: stepResult({status: 'failed', code: 1})
                }))
                plans.push(plan)
                return plan
            })
            await executor.run({isAuto: false, isBibChanged: false})
            assert.hasLog('Failed to clean auxiliary files after build failure.')
        })

        it('reports external failure without cleaning', async () => {
            set.config('latex.autoClean.run', 'onBuilt')
            createExternal.returns({
                name: 'External',
                tools: [{name: 'make', command: 'make'}],
                rootFile,
                cwd: get.path(),
                isExternal: true
            })
            createPlanStub.callsFake((recipe: {
                readonly name: string,
                readonly tools: (string | Tool)[],
                readonly rootFile?: string,
                readonly cwd: string,
                readonly isExternal: boolean
            }) => {
                const plan = createRealPlan(recipe)
                assert.ok(plan)
                Reflect.set(plan.steps[0], 'process', {pid: 314})
                sinon.stub(plan, 'run').resolves(planResult(plan, {
                    status: 'failed',
                    result: stepResult({status: 'failed', code: 1})
                }))
                return plan
            })
            await executor.run({isAuto: false, isBibChanged: false})
            assert.hasLog('Build with external command returns error on PID 314')
            assert.ok((lw.extra.clean as sinon.SinonStub).notCalled)
        })

        it('handles a failed rootless internal Plan', async () => {
            createPlanStub.callsFake(() => {
                const plan = createPlan('rootless', {rootFile: undefined})
                Reflect.set(plan, 'rootFile', undefined)
                sinon.stub(plan, 'run').resolves(planResult(plan, {
                    status: 'failed',
                    result: stepResult({status: 'failed', code: 1})
                }))
                return plan
            })
            await executor.run({isAuto: false, isBibChanged: false})
            assert.ok((lw.extra.clean as sinon.SinonStub).notCalled)
        })

        it('does not duplicate fatal process errors or clean terminated plans', async () => {
            for (const outcome of [
                {status: 'failed' as const, error: new Error('spawn failed')},
                {status: 'terminated' as const, signal: 'SIGTERM' as const}
            ]) {
                createPlanStub.callsFake(() => {
                    const plan = createPlan()
                    sinon.stub(plan, 'run').resolves(planResult(plan, {
                        status: outcome.status,
                        result: stepResult(outcome)
                    }))
                    return plan
                })
                await executor.run({isAuto: false, isBibChanged: false})
            }
            assert.ok((lw.extra.clean as sinon.SinonStub).notCalled)
        })

        it('points at Perl when MiKTeX cannot find the Perl script engine', async () => {
            const showError = sinon.stub(vscode.window, 'showErrorMessage')
            createPlanStub.callsFake(() => {
                const plan = createPlan('latexmk', {tools: [{name: 'latexmk', command: 'latexmk'}]})
                sinon.stub(plan, 'run').resolves(planResult(plan, {
                    status: 'failed',
                    result: stepResult({
                        status: 'failed',
                        code: 1,
                        stderr: 'Sorry, but latexmk did not succeed for the following reason:\n\n' +
                            '  MiKTeX could not find the script engine \'perl\' which is required to execute \'latexmk\'.\n'
                    })
                }))
                return plan
            })
            await executor.run({isAuto: false, isBibChanged: false})
            assert.ok(showError.calledOnce)
            const message = showError.firstCall.args[0] as string
            assert.ok(message.includes('MiKTeX could not run "latexmk"'), message)
            assert.ok(message.includes('Install Perl'), message)
            assert.notStrictEqual(message, 'Recipe terminated with error.')
            showError.restore()
        })

        it('keeps the generic message for other failures and other missing script engines', async () => {
            for (const stderr of [
                '! Undefined control sequence.',
                'MiKTeX could not find the script engine \'python\' which is required to execute \'pythontex\'.'
            ]) {
                const showError = sinon.stub(vscode.window, 'showErrorMessage')
                createPlanStub.callsFake(() => {
                    const plan = createPlan()
                    sinon.stub(plan, 'run').resolves(planResult(plan, {
                        status: 'failed',
                        result: stepResult({status: 'failed', code: 1, stderr})
                    }))
                    return plan
                })
                await executor.run({isAuto: false, isBibChanged: false})
                assert.ok(showError.calledOnce, stderr)
                assert.strictEqual(showError.firstCall.args[0], 'Recipe terminated with error.', stderr)
                showError.restore()
            }
        })
    })

    describe('Executor pending and drain state', () => {
        function installPlanRuns(
            runs: Record<string, PlanResult | Promise<PlanResult>>,
            order: string[]
        ) {
            createPlanStub.callsFake((recipe: {
                readonly name: string,
                readonly tools: (string | Tool)[],
                readonly rootFile?: string,
                readonly cwd: string,
                readonly isExternal: boolean
            }) => {
                const plan = createRealPlan(recipe)
                assert.ok(plan)
                sinon.stub(plan, 'run').callsFake(() => {
                    order.push(plan.name)
                    return Promise.resolve(runs[plan.name] ?? planResult(plan))
                })
                plans.push(plan)
                return plan
            })
        }

        it('lets the third successful Plan replace the older pending Plan', async () => {
            const active = deferred<PlanResult>()
            const order: string[] = []
            installPlanRuns({A: active.promise, B: undefined!, C: undefined!}, order)

            const owner = executor.run({recipeName: 'A', isAuto: false, isBibChanged: false})
            await waitFor(() => executor.activePlan?.name === 'A', {interval: 0})
            await executor.run({recipeName: 'B', isAuto: false, isBibChanged: false})
            await executor.run({recipeName: 'C', isAuto: false, isBibChanged: false})
            active.resolve(planResult(plans.find(plan => plan.name === 'A')!))
            await owner

            assert.deepStrictEqual(order, ['A', 'C'])
        })

        it('waits for pending preparation after the active Plan succeeds', async () => {
            const active = deferred<PlanResult>()
            const pendingRecipe = deferred<Awaited<ReturnType<typeof Recipe.create>>>()
            const order: string[] = []
            installPlanRuns({A: active.promise, B: undefined!}, order)
            createRecipe.withArgs(rootFile, 'latex', 'B').returns(pendingRecipe.promise)

            let ownerSettled = false
            const owner = executor.run({recipeName: 'A', isAuto: false, isBibChanged: false})
                .then(() => { ownerSettled = true })
            await waitFor(() => executor.activePlan?.name === 'A', {interval: 0})
            const pending = executor.run({recipeName: 'B', isAuto: false, isBibChanged: false})
            active.resolve(planResult(plans.find(plan => plan.name === 'A')!))
            await active.promise
            assert.strictEqual(ownerSettled, false)
            assert.deepStrictEqual(order, ['A'])

            pendingRecipe.resolve({
                name: 'B', tools: [{name: 'B-tool', command: 'pdflatex'}],
                rootFile, cwd: get.path(), isExternal: false
            })
            await pending
            await owner
            assert.deepStrictEqual(order, ['A', 'B'])
        })

        it('isolates a pending preparation error from the active Plan', async () => {
            const active = deferred<PlanResult>()
            const order: string[] = []
            installPlanRuns({A: active.promise}, order)
            createRecipe.withArgs(rootFile, 'latex', 'B').rejects(new Error('B failed'))

            const owner = executor.run({recipeName: 'A', isAuto: false, isBibChanged: false})
            await waitFor(() => executor.activePlan?.name === 'A', {interval: 0})
            await assert.rejects(
                executor.run({recipeName: 'B', isAuto: false, isBibChanged: false}),
                /B failed/
            )
            active.resolve(planResult(plans[0]))
            await owner
            assert.deepStrictEqual(order, ['A'])
        })

        it('keeps an existing pending Plan when a newer preparation fails', async () => {
            const active = deferred<PlanResult>()
            const order: string[] = []
            installPlanRuns({A: active.promise, B: undefined!}, order)
            createRecipe.withArgs(rootFile, 'latex', 'C').rejects(new Error('C failed'))

            const owner = executor.run({recipeName: 'A', isAuto: false, isBibChanged: false})
            await waitFor(() => executor.activePlan?.name === 'A', {interval: 0})
            await executor.run({recipeName: 'B', isAuto: false, isBibChanged: false})
            await assert.rejects(
                executor.run({recipeName: 'C', isAuto: false, isBibChanged: false}),
                /C failed/
            )
            active.resolve(planResult(plans.find(plan => plan.name === 'A')!))
            await owner
            assert.deepStrictEqual(order, ['A', 'B'])
        })

        it('allows an older in-flight preparation to fill in after a newer failure', async () => {
            const active = deferred<PlanResult>()
            const olderRecipe = deferred<Awaited<ReturnType<typeof Recipe.create>>>()
            const order: string[] = []
            installPlanRuns({A: active.promise, B: undefined!}, order)
            createRecipe.withArgs(rootFile, 'latex', 'B').returns(olderRecipe.promise)
            createRecipe.withArgs(rootFile, 'latex', 'C').rejects(new Error('C failed'))

            const owner = executor.run({recipeName: 'A', isAuto: false, isBibChanged: false})
            await waitFor(() => executor.activePlan?.name === 'A', {interval: 0})
            const older = executor.run({recipeName: 'B', isAuto: false, isBibChanged: false})
            await assert.rejects(
                executor.run({recipeName: 'C', isAuto: false, isBibChanged: false}),
                /C failed/
            )
            active.resolve(planResult(plans.find(plan => plan.name === 'A')!))
            olderRecipe.resolve({
                name: 'B', tools: [{name: 'B-tool', command: 'pdflatex'}],
                rootFile, cwd: get.path(), isExternal: false
            })
            await older
            await owner
            assert.deepStrictEqual(order, ['A', 'B'])
        })

        it('uses request order when preparations finish out of order', async () => {
            const active = deferred<PlanResult>()
            const olderRecipe = deferred<Awaited<ReturnType<typeof Recipe.create>>>()
            const newerRecipe = deferred<Awaited<ReturnType<typeof Recipe.create>>>()
            const order: string[] = []
            installPlanRuns({A: active.promise, B: undefined!, C: undefined!}, order)
            createRecipe.withArgs(rootFile, 'latex', 'B').returns(olderRecipe.promise)
            createRecipe.withArgs(rootFile, 'latex', 'C').returns(newerRecipe.promise)

            const owner = executor.run({recipeName: 'A', isAuto: false, isBibChanged: false})
            await waitFor(() => executor.activePlan?.name === 'A', {interval: 0})
            const older = executor.run({recipeName: 'B', isAuto: false, isBibChanged: false})
            const newer = executor.run({recipeName: 'C', isAuto: false, isBibChanged: false})
            newerRecipe.resolve({
                name: 'C', tools: [{name: 'C-tool', command: 'pdflatex'}],
                rootFile, cwd: get.path(), isExternal: false
            })
            await newer
            olderRecipe.resolve({
                name: 'B', tools: [{name: 'B-tool', command: 'pdflatex'}],
                rootFile, cwd: get.path(), isExternal: false
            })
            await older
            active.resolve(planResult(plans.find(plan => plan.name === 'A')!))
            await owner
            assert.deepStrictEqual(order, ['A', 'C'])
        })

        it('lets a pending request return after enqueueing', async () => {
            const active = deferred<PlanResult>()
            const pendingRun = deferred<PlanResult>()
            const order: string[] = []
            installPlanRuns({A: active.promise, B: pendingRun.promise}, order)

            const owner = executor.run({recipeName: 'A', isAuto: false, isBibChanged: false})
            await waitFor(() => executor.activePlan?.name === 'A', {interval: 0})
            await executor.run({recipeName: 'B', isAuto: false, isBibChanged: false})
            assert.deepStrictEqual(order, ['A'])
            active.resolve(planResult(plans.find(plan => plan.name === 'A')!))
            await waitFor(() => executor.activePlan?.name === 'B', {interval: 0})
            pendingRun.resolve(planResult(plans.find(plan => plan.name === 'B')!))
            await owner
        })

        it('hands off drain ownership when the first request has no Plan', async () => {
            const firstRecipe = deferred<Awaited<ReturnType<typeof Recipe.create>>>()
            const order: string[] = []
            installPlanRuns({B: undefined!}, order)
            createRecipe.withArgs(rootFile, 'latex', 'A').returns(firstRecipe.promise)

            const first = executor.run({recipeName: 'A', isAuto: false, isBibChanged: false})
            const second = executor.run({recipeName: 'B', isAuto: false, isBibChanged: false})
            await second
            firstRecipe.resolve(undefined)
            await first
            assert.deepStrictEqual(order, ['B'])
        })

        it('rejects the first request and drains an independent pending Plan', async () => {
            const firstRecipe = deferred<Awaited<ReturnType<typeof Recipe.create>>>()
            const order: string[] = []
            installPlanRuns({B: undefined!}, order)
            createRecipe.withArgs(rootFile, 'latex', 'A').returns(firstRecipe.promise)

            const first = executor.run({recipeName: 'A', isAuto: false, isBibChanged: false})
            const second = executor.run({recipeName: 'B', isAuto: false, isBibChanged: false})
            await second
            firstRecipe.reject(new Error('A failed'))
            await assert.rejects(first, /A failed/)
            await waitFor(() => order.includes('B'), {interval: 0})
        })

        it('starts a drain when pending preparation finishes after the owner rejects', async () => {
            const firstRecipe = deferred<Awaited<ReturnType<typeof Recipe.create>>>()
            const secondRecipe = deferred<Awaited<ReturnType<typeof Recipe.create>>>()
            const order: string[] = []
            installPlanRuns({B: undefined!}, order)
            createRecipe.withArgs(rootFile, 'latex', 'A').returns(firstRecipe.promise)
            createRecipe.withArgs(rootFile, 'latex', 'B').returns(secondRecipe.promise)

            const first = executor.run({recipeName: 'A', isAuto: false, isBibChanged: false})
            const second = executor.run({recipeName: 'B', isAuto: false, isBibChanged: false})
            firstRecipe.reject(new Error('A failed'))
            await assert.rejects(first, /A failed/)
            secondRecipe.resolve({
                name: 'B', tools: [{name: 'B-tool', command: 'pdflatex'}],
                rootFile, cwd: get.path(), isExternal: false
            })
            await second
            await waitFor(() => order.includes('B'), {interval: 0})
        })

        it('hands pending work to another drain after successful follow-up rejects', async () => {
            const active = deferred<PlanResult>()
            const order: string[] = []
            installPlanRuns({A: active.promise, B: undefined!}, order)
            set.config('latex.autoClean.run', 'onSucceeded')
            ;(lw.extra.clean as sinon.SinonStub).rejects(new Error('clean failed'))

            const owner = executor.run({recipeName: 'A', isAuto: false, isBibChanged: false})
            await waitFor(() => executor.activePlan?.name === 'A', {interval: 0})
            await executor.run({recipeName: 'B', isAuto: false, isBibChanged: false})
            active.resolve(planResult(plans.find(plan => plan.name === 'A')!))
            await assert.rejects(owner, /clean failed/)
            ;(lw.extra.clean as sinon.SinonStub).resolves()
            await waitFor(() => order.includes('B'), {interval: 0})
        })

        it('updates PDF and aux state only when a pending Plan becomes active', async () => {
            const active = deferred<PlanResult>()
            const pending = deferred<PlanResult>()
            const order: string[] = []
            const otherRoot = get.path('other.tex')
            createRecipe.withArgs(rootFile, 'latex', 'B').resolves({
                name: 'B', tools: [{name: 'B-tool', command: 'pdflatex'}],
                rootFile: otherRoot, cwd: get.path(), isExternal: false
            })
            installPlanRuns({A: active.promise, B: pending.promise}, order)

            const owner = executor.run({recipeName: 'A', isAuto: false, isBibChanged: false})
            await waitFor(() => executor.activePlan?.name === 'A', {interval: 0})
            await executor.run({recipeName: 'B', isAuto: false, isBibChanged: false})
            assert.pathStrictEqual(executor.compiledPDFPath, get.path('main.pdf'))
            assert.ok(getAuxDir.calledOnceWithExactly(rootFile))

            active.resolve(planResult(plans.find(plan => plan.name === 'A')!))
            await waitFor(() => executor.activePlan?.name === 'B', {interval: 0})
            assert.pathStrictEqual(executor.compiledPDFPath, get.path('other.pdf'))
            assert.ok(getAuxDir.calledWithExactly(otherRoot))
            pending.resolve(planResult(plans.find(plan => plan.name === 'B')!))
            await owner
        })

        it('keeps skipped state independent across pending Plans', async () => {
            const active = deferred<PlanResult>()
            const order: string[] = []
            installPlanRuns({A: active.promise, B: undefined!}, order)
            const owner = executor.run({recipeName: 'A', isAuto: false, isBibChanged: false})
            await waitFor(() => executor.activePlan?.name === 'A', {interval: 0})
            await executor.run({recipeName: 'B', isAuto: false, isBibChanged: false})
            active.resolve(planResult(plans.find(plan => plan.name === 'A')!, {skipped: true}))
            await owner
            assert.ok((lw.viewer.refresh as sinon.SinonStub).calledOnce)
        })
    })

    describe('Executor failure generations and termination', () => {
        function failed(plan: Plan, status: 'failed' | 'terminated' = 'failed'): PlanResult {
            return planResult(plan, {
                status,
                result: stepResult({
                    status,
                    code: status === 'failed' ? 1 : null,
                    signal: status === 'terminated' ? 'SIGTERM' : null
                })
            })
        }

        for (const status of ['failed', 'terminated'] as const) {
            it(`clears old pending after an active Plan is ${status}`, async () => {
                const active = deferred<PlanResult>()
                const order: string[] = []
                createPlanStub.callsFake((recipe: {
                    readonly name: string,
                    readonly tools: (string | Tool)[],
                    readonly rootFile?: string,
                    readonly cwd: string,
                    readonly isExternal: boolean
                }) => {
                    const plan = createRealPlan(recipe)
                    assert.ok(plan)
                    sinon.stub(plan, 'run').callsFake(() => {
                        order.push(plan.name)
                        return plan.name === 'A' ? active.promise : Promise.resolve(planResult(plan))
                    })
                    plans.push(plan)
                    return plan
                })

                const owner = executor.run({recipeName: 'A', isAuto: false, isBibChanged: false})
                await waitFor(() => executor.activePlan?.name === 'A', {interval: 0})
                await executor.run({recipeName: 'B', isAuto: false, isBibChanged: false})
                active.resolve(failed(plans.find(plan => plan.name === 'A')!, status))
                await owner
                assert.deepStrictEqual(order, ['A'])
            })
        }

        it('accepts a new generation request during failure cleaning', async () => {
            const active = deferred<PlanResult>()
            const cleaning = deferred<undefined>()
            const order: string[] = []
            set.config('latex.autoClean.run', 'onFailed')
            ;(lw.extra.clean as sinon.SinonStub).returns(cleaning.promise)
            createPlanStub.callsFake((recipe: {
                readonly name: string,
                readonly tools: (string | Tool)[],
                readonly rootFile?: string,
                readonly cwd: string,
                readonly isExternal: boolean
            }) => {
                const plan = createRealPlan(recipe)
                assert.ok(plan)
                sinon.stub(plan, 'run').callsFake(() => {
                    order.push(plan.name)
                    return plan.name === 'A' ? active.promise : Promise.resolve(planResult(plan))
                })
                plans.push(plan)
                return plan
            })

            const owner = executor.run({recipeName: 'A', isAuto: false, isBibChanged: false})
            await waitFor(() => executor.activePlan?.name === 'A', {interval: 0})
            active.resolve(failed(plans.find(plan => plan.name === 'A')!))
            await waitFor(() => (lw.extra.clean as sinon.SinonStub).calledOnce, {interval: 0})
            await executor.run({recipeName: 'B', isAuto: false, isBibChanged: false})
            cleaning.resolve(undefined)
            await owner
            assert.deepStrictEqual(order, ['A', 'B'])
        })

        it('forwards terminate, clears pending, and invalidates late preparation', async () => {
            const active = deferred<PlanResult>()
            const lateRecipe = deferred<Awaited<ReturnType<typeof Recipe.create>>>()
            const order: string[] = []
            let terminate: sinon.SinonStub | undefined
            createRecipe.withArgs(rootFile, 'latex', 'B').returns(lateRecipe.promise)
            createPlanStub.callsFake((recipe: {
                readonly name: string,
                readonly tools: (string | Tool)[],
                readonly rootFile?: string,
                readonly cwd: string,
                readonly isExternal: boolean
            }) => {
                const plan = createRealPlan(recipe)
                assert.ok(plan)
                sinon.stub(plan, 'run').callsFake(() => {
                    order.push(plan.name)
                    return active.promise
                })
                terminate = sinon.stub(plan, 'terminate').returns(new Error('kill failed'))
                plans.push(plan)
                return plan
            })

            const owner = executor.run({recipeName: 'A', isAuto: false, isBibChanged: false})
            await waitFor(() => executor.activePlan?.name === 'A', {interval: 0})
            const late = executor.run({recipeName: 'B', isAuto: false, isBibChanged: false})
            const error = executor.terminate()
            assert.strictEqual(error?.message, 'kill failed')
            assert.ok(terminate?.calledOnce)
            lateRecipe.resolve({
                name: 'B', tools: [{name: 'B-tool', command: 'pdflatex'}],
                rootFile, cwd: get.path(), isExternal: false
            })
            await late
            active.resolve(failed(plans[0], 'terminated'))
            await owner
            assert.deepStrictEqual(order, ['A'])
        })

        it('runs a new request made after terminate once the old Step exits', async () => {
            const active = deferred<PlanResult>()
            const order: string[] = []
            createPlanStub.callsFake((recipe: {
                readonly name: string,
                readonly tools: (string | Tool)[],
                readonly rootFile?: string,
                readonly cwd: string,
                readonly isExternal: boolean
            }) => {
                const plan = createRealPlan(recipe)
                assert.ok(plan)
                sinon.stub(plan, 'run').callsFake(() => {
                    order.push(plan.name)
                    return plan.name === 'A' ? active.promise : Promise.resolve(planResult(plan))
                })
                sinon.stub(plan, 'terminate')
                plans.push(plan)
                return plan
            })

            const owner = executor.run({recipeName: 'A', isAuto: false, isBibChanged: false})
            await waitFor(() => executor.activePlan?.name === 'A', {interval: 0})
            executor.terminate()
            await executor.run({recipeName: 'D', isAuto: false, isBibChanged: false})
            active.resolve(failed(plans.find(plan => plan.name === 'A')!, 'terminated'))
            await owner
            assert.deepStrictEqual(order, ['A', 'D'])
        })

        it('returns undefined when terminating without an active Plan', () => {
            assert.strictEqual(executor.terminate(), undefined)
        })

        it('rejects an invalidated preparation error without changing pending state', async () => {
            const active = deferred<PlanResult>()
            const lateRecipe = deferred<Awaited<ReturnType<typeof Recipe.create>>>()
            createRecipe.withArgs(rootFile, 'latex', 'B').returns(lateRecipe.promise)
            createPlanStub.callsFake((recipe: {
                readonly name: string,
                readonly tools: (string | Tool)[],
                readonly rootFile?: string,
                readonly cwd: string,
                readonly isExternal: boolean
            }) => {
                const plan = createRealPlan(recipe)
                assert.ok(plan)
                sinon.stub(plan, 'run').returns(active.promise)
                sinon.stub(plan, 'terminate')
                plans.push(plan)
                return plan
            })

            const owner = executor.run({recipeName: 'A', isAuto: false, isBibChanged: false})
            await waitFor(() => executor.activePlan?.name === 'A', {interval: 0})
            const late = executor.run({recipeName: 'B', isAuto: false, isBibChanged: false})
            executor.terminate()
            lateRecipe.reject(new Error('late failed'))
            await assert.rejects(late, /late failed/)
            active.resolve(failed(plans[0], 'terminated'))
            await owner
        })

        it('rejects external builds while a Plan is active', async () => {
            const active = deferred<PlanResult>()
            createPlanStub.callsFake((recipe: {
                readonly name: string,
                readonly tools: (string | Tool)[],
                readonly rootFile?: string,
                readonly cwd: string,
                readonly isExternal: boolean
            }) => {
                const plan = createRealPlan(recipe)
                assert.ok(plan)
                sinon.stub(plan, 'run').returns(active.promise)
                plans.push(plan)
                return plan
            })
            const owner = executor.run({recipeName: 'A', isAuto: false, isBibChanged: false})
            await waitFor(() => executor.activePlan?.name === 'A', {interval: 0})
            createExternal.returns({
                name: 'External', tools: [{name: 'make', command: 'make'}],
                rootFile, cwd: get.path(), isExternal: true
            })
            await executor.run({recipeName: 'external', isAuto: false, isBibChanged: false})
            assert.strictEqual(plans.length, 1)
            active.resolve(planResult(plans[0]))
            await owner
        })
    })
})
