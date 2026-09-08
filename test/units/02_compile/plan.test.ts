import path from 'path'
import * as sinon from 'sinon'
import * as vscode from 'vscode'
import { lw } from '../../../src/lw'
import { MAX_PRINT_LINE, TEX_MAGIC_PROGRAM_NAME } from '../../../src/compile/constants'
import { Plan } from '../../../src/compile/plan'
import { Recipe } from '../../../src/compile/recipe'
import type { StepResult, Tool } from '../../../src/compile/types'
import { assert, get, mock, set } from '../utils'

const rootFile = get.path('main.tex')
const cwd = get.path()

function createPlan(
    tools: (string | Tool)[] = [{name: 'tool', command: 'command'}],
    context: {
        rootFile?: string,
        cwd: string,
        isExternal: boolean
    } = {rootFile, cwd, isExternal: false},
    name = 'Recipe'
): Plan {
    const plan = Plan.create({name, tools, ...context})
    assert.ok(plan)
    return plan
}

function result(overrides: Partial<StepResult> = {}): StepResult {
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

describe(path.basename(__filename).split('.')[0] + ':', () => {
    let syncStub: sinon.SinonStub
    let chmodStub: sinon.SinonStub
    let setTeXDirsStub: sinon.SinonStub
    let cleanStub: sinon.SinonStub
    let platform: PropertyDescriptor | undefined
    let extensionRoot: string

    function setPlatform(value: NodeJS.Platform) {
        Object.defineProperty(process, 'platform', {value, configurable: true})
    }

    before(() => {
        mock.init(lw)
        syncStub = sinon.stub(lw.external, 'sync')
        chmodStub = sinon.stub(lw.external, 'chmodSync')
        setTeXDirsStub = sinon.stub(lw.file, 'setTeXDirs')
        cleanStub = lw.extra.clean as sinon.SinonStub
        platform = Object.getOwnPropertyDescriptor(process, 'platform')
        extensionRoot = lw.extensionRoot
    })

    beforeEach(() => {
        Plan.initialize()
        syncStub.reset()
        syncStub.returns({stdout: Buffer.from('TeX Live')})
        chmodStub.reset()
        setTeXDirsStub.reset()
        cleanStub.reset()
        cleanStub.resolves()
        set.config('latex.tools', [])
        set.config('docker.enabled', false)
        set.config('latex.option.maxPrintLine.enabled', false)
        set.config('latex.autoBuild.cleanAndRetry.enabled', false)
        set.config('latex.build.rootfileInStatus', false)
    })

    afterEach(() => {
        if (platform) {
            Object.defineProperty(process, 'platform', platform)
        }
        lw.extensionRoot = extensionRoot
    })

    after(() => {
        sinon.restore()
    })

    describe('Plan.create', () => {
        it('resolves named tools and preserves their order with inline tools', () => {
            set.config('latex.tools', [
                {name: 'first', command: 'pdflatex'},
                {name: 'last', command: 'bibtex'}
            ])

            const plan = createPlan(['first', {name: 'middle', command: 'biber'}, 'last'])

            assert.deepStrictEqual(plan.steps.map(step => step.command), ['pdflatex', 'biber', 'bibtex'])
        })

        it('skips an undefined named tool and continues with valid tools', () => {
            const plan = createPlan(['missing', {name: 'inline', command: 'xelatex'}])

            assert.deepStrictEqual(plan.steps.map(step => step.name), ['inline'])
            assert.hasLog('Skipping undefined tool missing in recipe Recipe.')
        })

        it('returns undefined when every tool is undefined', () => {
            const plan = Plan.create({
                name: 'Recipe',
                tools: ['missing'],
                rootFile,
                cwd,
                isExternal: false
            })

            assert.strictEqual(plan, undefined)
        })

        it('deep-copies tools without modifying the configured objects', () => {
            const configured: Tool = {
                name: 'configured',
                command: 'command',
                args: ['%DOC%'],
                cwd: '%DIR%/build',
                env: {DOCUMENT: '%DOC%', PRESERVED: undefined}
            }
            set.config('latex.tools', [configured])

            const plan = createPlan(['configured'])

            assert.deepStrictEqual(configured, {
                name: 'configured',
                command: 'command',
                args: ['%DOC%'],
                cwd: '%DIR%/build',
                env: {DOCUMENT: '%DOC%', PRESERVED: undefined}
            })
            assert.notStrictEqual(plan.steps[0].args, configured.args)
            assert.notStrictEqual(plan.steps[0].env, configured.env)
            assert.ok(Object.prototype.hasOwnProperty.call(plan.steps[0].env ?? {}, 'PRESERVED'))
        })

        it('stores plan fields and creates ordered steps with total count', () => {
            const plan = createPlan([
                {name: 'one', command: 'one'},
                {name: 'two', command: 'two'}
            ], {rootFile, cwd, isExternal: false}, 'Named Recipe')

            assert.strictEqual(plan.name, 'Named Recipe')
            assert.strictEqual(plan.rootFile, rootFile)
            assert.strictEqual(plan.cwd, cwd)
            assert.strictEqual(plan.isExternal, false)
            assert.deepStrictEqual(plan.steps.map(step => [step.index, step.total]), [[0, 2], [1, 2]])
            assert.ok(plan.steps.every(step => step.rootFile === rootFile && step.recipeName === 'Named Recipe'))
        })

        it('leaves tools unchanged when the recipe has no root file', () => {
            const plan = createPlan(
                [{name: 'tool', command: 'latexmk', args: ['%DOC%'], cwd: 'relative'}],
                {cwd: '/fallback', isExternal: false}
            )

            assert.deepStrictEqual(plan.steps[0].args, ['%DOC%'])
            assert.strictEqual(plan.steps[0].cwd, 'relative')
            assert.ok(syncStub.notCalled)
            assert.ok(setTeXDirsStub.notCalled)
        })

        it('expands only args for an external recipe with a root file', () => {
            set.config('docker.enabled', true)
            set.config('latex.option.maxPrintLine.enabled', true)
            const plan = createPlan([{
                name: 'external',
                command: 'latexmk',
                args: ['%DOC%'],
                cwd: 'tool-cwd',
                env: {DOCUMENT: '%DOC%'}
            }], {rootFile, cwd: '/external-cwd', isExternal: true})

            assert.strictEqual(plan.steps[0].args?.[0], path.parse(rootFile).name)
            assert.strictEqual(plan.steps[0].command, 'latexmk')
            assert.strictEqual(plan.steps[0].cwd, '/external-cwd')
            assert.deepStrictEqual(plan.steps[0].env, {DOCUMENT: '%DOC%'})
            assert.strictEqual(plan.steps[0].rootFile, rootFile)
            assert.ok(chmodStub.notCalled)
            assert.ok(setTeXDirsStub.notCalled)
            assert.ok(syncStub.notCalled)
        })

        it('does not expand external args without a root file', () => {
            const plan = createPlan(
                [{name: 'external', command: 'command', args: ['%DOC%']}],
                {cwd: '/external-cwd', isExternal: true}
            )

            assert.deepStrictEqual(plan.steps[0].args, ['%DOC%'])
            assert.strictEqual(plan.steps[0].rootFile, undefined)
        })

        it('expands internal args, cwd, and environment placeholders', () => {
            const plan = createPlan([{
                name: 'tool',
                command: 'command',
                args: ['%DOC%'],
                cwd: '%DIR%/build',
                env: {DOCUMENT: '%DOC%'}
            }])

            assert.pathStrictEqual(plan.steps[0].args?.[0], rootFile.replace('.tex', ''))
            assert.pathStrictEqual(plan.steps[0].cwd, path.resolve(path.dirname(rootFile), 'build'))
            assert.pathStrictEqual(plan.steps[0].env?.DOCUMENT, rootFile.replace('.tex', ''))
        })

        it('resolves relative cwd from the recipe cwd', () => {
            const plan = createPlan([{name: 'tool', command: 'command', cwd: 'nested'}])

            assert.pathStrictEqual(plan.steps[0].cwd, path.resolve(cwd, 'nested'))
        })

        it('keeps an absolute cwd and uses recipe cwd when omitted', () => {
            const absolute = get.path('absolute')
            const plan = createPlan([
                {name: 'absolute', command: 'command', cwd: absolute},
                {name: 'default', command: 'command'}
            ])

            assert.pathStrictEqual(plan.steps[0].cwd, absolute)
            assert.pathStrictEqual(plan.steps[1].cwd, cwd)
        })
    })

    describe('Plan tool configuration', () => {
        it('leaves latexmk unchanged when Docker is disabled', () => {
            const plan = createPlan([{name: 'latexmk', command: 'latexmk'}])

            assert.strictEqual(plan.steps[0].command, 'latexmk')
            assert.ok(chmodStub.notCalled)
        })

        it('does not wrap a non-latexmk Docker command', () => {
            set.config('docker.enabled', true)

            const plan = createPlan([{name: 'pdflatex', command: 'pdflatex'}])

            assert.strictEqual(plan.steps[0].command, 'pdflatex')
            assert.hasLog('Do not use Docker to invoke the command: pdflatex.')
        })

        it('wraps latexmk and makes the script executable outside Windows', () => {
            setPlatform('linux')
            set.config('docker.enabled', true)
            lw.extensionRoot = '/extension'

            const plan = createPlan([{name: 'latexmk', command: 'latexmk'}])

            assert.pathStrictEqual(plan.steps[0].command, path.resolve('/extension/scripts/latexmk'))
            assert.ok(chmodStub.calledOnceWithExactly(plan.steps[0].command, 0o755))
        })

        it('uses the Docker batch script without chmod on Windows', () => {
            setPlatform('win32')
            set.config('docker.enabled', true)
            lw.extensionRoot = 'C:/extension'

            const plan = createPlan([{name: 'latexmk', command: 'latexmk'}])

            assert.pathStrictEqual(plan.steps[0].command, path.resolve('C:/extension/scripts/latexmk.bat'))
            assert.ok(chmodStub.notCalled)
        })

        it('propagates Docker chmod failures', () => {
            setPlatform('darwin')
            set.config('docker.enabled', true)
            chmodStub.throws(new Error('chmod failed'))

            assert.throws(() => createPlan([{name: 'latexmk', command: 'latexmk'}]), /chmod failed/)
        })

        it('records single-hyphen output and auxiliary directory variants', () => {
            createPlan([{
                name: 'tool',
                command: 'command',
                args: ['irrelevant', '-out-directory=out', '-auxdir=aux']
            }])

            assert.ok(setTeXDirsStub.calledOnceWithExactly(rootFile, 'out', 'aux'))
        })

        it('records double-hyphen short and long directory variants', () => {
            createPlan([
                {name: 'one', command: 'command', args: ['--outdir=first', '--aux-directory=first-aux']},
                {name: 'two', command: 'command', args: ['--out-directory=second', '--auxdir=second-aux']}
            ])

            assert.ok(setTeXDirsStub.calledWithExactly(rootFile, 'first', 'first-aux'))
            assert.ok(setTeXDirsStub.calledWithExactly(rootFile, 'second', 'second-aux'))
        })

        it('records undefined directories when arguments are omitted', () => {
            createPlan()

            assert.ok(setTeXDirsStub.calledOnceWithExactly(rootFile, undefined, undefined))
        })

        it('does not probe MiKTeX when max print line is disabled', () => {
            createPlan([{name: 'tool', command: 'pdflatex'}])

            assert.ok(syncStub.notCalled)
        })

        it('does not probe MiKTeX for an unrelated command', () => {
            set.config('latex.option.maxPrintLine.enabled', true)

            const plan = createPlan([{name: 'tool', command: 'xelatex'}])

            assert.deepStrictEqual(plan.steps[0].args, [])
            assert.ok(syncStub.notCalled)
        })

        it('does not probe MiKTeX for a LuaLaTeX latexmk invocation', () => {
            set.config('latex.option.maxPrintLine.enabled', true)

            const plan = createPlan([{name: 'latexmk', command: 'latexmk', args: ['--lualatex']}])

            assert.deepStrictEqual(plan.steps[0].args, ['--lualatex'])
            assert.ok(syncStub.notCalled)
        })

        it('does not add max print line outside MiKTeX and caches the result', () => {
            set.config('latex.option.maxPrintLine.enabled', true)

            const first = createPlan([{name: 'one', command: 'pdflatex'}])
            const second = createPlan([{name: 'two', command: 'pdflatex'}])

            assert.deepStrictEqual(first.steps[0].args, [])
            assert.deepStrictEqual(second.steps[0].args, [])
            assert.ok(syncStub.calledOnce)
        })

        it('adds max print line to MiKTeX pdflatex and pdfLaTeX latexmk', () => {
            set.config('latex.option.maxPrintLine.enabled', true)
            syncStub.returns({stdout: Buffer.from('MiKTeX')})

            const pdflatex = createPlan([{name: 'pdflatex', command: 'pdflatex'}])
            const latexmk = createPlan([{name: 'latexmk', command: 'latexmk'}])

            assert.deepStrictEqual(pdflatex.steps[0].args, [`--max-print-line=${MAX_PRINT_LINE}`])
            assert.deepStrictEqual(latexmk.steps[0].args, [`--max-print-line=${MAX_PRINT_LINE}`])
            assert.ok(syncStub.calledOnce)
            assert.hasLog('`pdflatex` is provided by MiKTeX.')
        })

        it('builds the issue #4976 magic comments without changing argument boundaries', async () => {
            set.config('latex.build.enableMagicComments', true)
            set.config('latex.option.maxPrintLine.enabled', true)
            syncStub.returns({stdout: Buffer.from('MiKTeX')})
            const options = '-lualatex -synctex=1 -interaction=nonstopmode -file-line-error "%DOC%"'
            const readStub = sinon.stub(lw.file, 'read').resolves(`%!TEX program = latexmk\n%!TEX options = ${options}\n`)
            try {
                const recipe = await Recipe.create(rootFile, 'latex')
                assert.ok(recipe)
                const plan = Plan.create(recipe)
                assert.ok(plan)
                assert.strictEqual(plan.steps[0].command, 'latexmk')
                assert.deepStrictEqual(plan.steps[0].args, [
                    options.replace('%DOC%', rootFile.replace(/\\/g, '/').replace(/\.tex$/, ''))
                ])
                assert.ok(syncStub.notCalled)
            } finally {
                readStub.restore()
            }
        })

        it('recognizes the lualatex magic option', () => {
            set.config('latex.option.maxPrintLine.enabled', true)
            syncStub.returns({stdout: Buffer.from('MiKTeX')})
            const options = '-lualatex main'

            const plan = createPlan([{name: TEX_MAGIC_PROGRAM_NAME, command: 'latexmk', args: [options]}])

            assert.deepStrictEqual(plan.steps[0].args, [options])
            assert.ok(syncStub.notCalled)
        })

        it('recognizes the pdflua magic option', () => {
            set.config('latex.option.maxPrintLine.enabled', true)
            syncStub.returns({stdout: Buffer.from('MiKTeX')})
            const options = '-pdflua main'

            const plan = createPlan([{name: TEX_MAGIC_PROGRAM_NAME, command: 'latexmk', args: [options]}])

            assert.deepStrictEqual(plan.steps[0].args, [options])
            assert.ok(syncStub.notCalled)
        })

        it('recognizes the pdflualatex magic option', () => {
            set.config('latex.option.maxPrintLine.enabled', true)
            syncStub.returns({stdout: Buffer.from('MiKTeX')})
            const options = '-pdflualatex main'

            const plan = createPlan([{name: TEX_MAGIC_PROGRAM_NAME, command: 'latexmk', args: [options]}])

            assert.deepStrictEqual(plan.steps[0].args, [options])
            assert.ok(syncStub.notCalled)
        })

        it('recognizes the double-dash lualatex magic option', () => {
            set.config('latex.option.maxPrintLine.enabled', true)
            syncStub.returns({stdout: Buffer.from('MiKTeX')})
            const options = '--lualatex main'

            const plan = createPlan([{name: TEX_MAGIC_PROGRAM_NAME, command: 'latexmk', args: [options]}])

            assert.deepStrictEqual(plan.steps[0].args, [options])
            assert.ok(syncStub.notCalled)
        })

        it('recognizes the double-dash pdflua magic option', () => {
            set.config('latex.option.maxPrintLine.enabled', true)
            syncStub.returns({stdout: Buffer.from('MiKTeX')})
            const options = '--pdflua main'

            const plan = createPlan([{name: TEX_MAGIC_PROGRAM_NAME, command: 'latexmk', args: [options]}])

            assert.deepStrictEqual(plan.steps[0].args, [options])
            assert.ok(syncStub.notCalled)
        })

        it('recognizes the double-dash pdflualatex magic option', () => {
            set.config('latex.option.maxPrintLine.enabled', true)
            syncStub.returns({stdout: Buffer.from('MiKTeX')})
            const options = '--pdflualatex main'

            const plan = createPlan([{name: TEX_MAGIC_PROGRAM_NAME, command: 'latexmk', args: [options]}])

            assert.deepStrictEqual(plan.steps[0].args, [options])
            assert.ok(syncStub.notCalled)
        })

        it('recognizes a double-quoted LuaLaTeX magic option', () => {
            set.config('latex.option.maxPrintLine.enabled', true)
            syncStub.returns({stdout: Buffer.from('MiKTeX')})
            const options = '"-lualatex" main'

            const plan = createPlan([{name: TEX_MAGIC_PROGRAM_NAME, command: 'latexmk', args: [options]}])

            assert.deepStrictEqual(plan.steps[0].args, [options])
            assert.ok(syncStub.notCalled)
        })

        it('recognizes a single-quoted LuaLaTeX magic option', () => {
            set.config('latex.option.maxPrintLine.enabled', true)
            syncStub.returns({stdout: Buffer.from('MiKTeX')})
            const options = "'-lualatex' main"

            const plan = createPlan([{name: TEX_MAGIC_PROGRAM_NAME, command: 'latexmk', args: [options]}])

            assert.deepStrictEqual(plan.steps[0].args, [options])
            assert.ok(syncStub.notCalled)
        })

        it('preserves a quoted path in pdflatex magic options', () => {
            set.config('latex.option.maxPrintLine.enabled', true)
            syncStub.returns({stdout: Buffer.from('MiKTeX')})
            const options = '"C:/with space/main"'

            const plan = createPlan([{name: TEX_MAGIC_PROGRAM_NAME, command: 'pdflatex', args: [options]}])

            assert.deepStrictEqual(plan.steps[0].args, [`--max-print-line=${MAX_PRINT_LINE} ${options}`])
        })

        it('preserves a quoted output directory in latexmk magic options', () => {
            set.config('latex.option.maxPrintLine.enabled', true)
            syncStub.returns({stdout: Buffer.from('MiKTeX')})
            const options = '--output-directory="with space" main'

            const plan = createPlan([{name: TEX_MAGIC_PROGRAM_NAME, command: 'latexmk', args: [options]}])

            assert.deepStrictEqual(plan.steps[0].args, [`--max-print-line=${MAX_PRINT_LINE} ${options}`])
        })

        it('ignores a LuaLaTeX flag inside a quoted value', () => {
            set.config('latex.option.maxPrintLine.enabled', true)
            syncStub.returns({stdout: Buffer.from('MiKTeX')})
            const options = '-jobname="example -lualatex document" main'

            const plan = createPlan([{name: TEX_MAGIC_PROGRAM_NAME, command: 'latexmk', args: [options]}])

            assert.deepStrictEqual(plan.steps[0].args, [`--max-print-line=${MAX_PRINT_LINE} ${options}`])
        })

        it('requires a complete LuaLaTeX option match', () => {
            set.config('latex.option.maxPrintLine.enabled', true)
            syncStub.returns({stdout: Buffer.from('MiKTeX')})
            const options = '-lualatex-suffix main'

            const plan = createPlan([{name: TEX_MAGIC_PROGRAM_NAME, command: 'latexmk', args: [options]}])

            assert.deepStrictEqual(plan.steps[0].args, [`--max-print-line=${MAX_PRINT_LINE} ${options}`])
        })

        it('logs and caches MiKTeX probe errors as false', () => {
            set.config('latex.option.maxPrintLine.enabled', true)
            syncStub.throws(new Error('pdflatex missing'))

            const first = createPlan([{name: 'one', command: 'pdflatex'}])
            const second = createPlan([{name: 'two', command: 'pdflatex'}])

            assert.deepStrictEqual(first.steps[0].args, [])
            assert.deepStrictEqual(second.steps[0].args, [])
            assert.ok(syncStub.calledOnce)
            assert.hasLog('Cannot run `pdflatex` to determine if we are using MiKTeX.')
        })
    })

    describe('Plan.run', () => {
        it('runs steps serially and returns the final step backend', async () => {
            const plan = createPlan([
                {name: 'one', command: 'one'},
                {name: 'two', command: 'two'}
            ])
            const order: string[] = []
            sinon.stub(plan.steps[0], 'run').callsFake(() => {
                order.push('one')
                return Promise.resolve(result({backend: 'pdftex'}))
            })
            sinon.stub(plan.steps[1], 'run').callsFake(() => {
                order.push('two')
                return Promise.resolve(result({backend: 'luatex'}))
            })

            const outcome = await plan.run()

            assert.deepStrictEqual(order, ['one', 'two'])
            assert.strictEqual(outcome.status, 'succeeded')
            assert.strictEqual(outcome.step, plan.steps[1])
            assert.strictEqual(outcome.result.backend, 'luatex')
            assert.strictEqual(outcome.backend, 'luatex')
        })

        it('stops after the first failed step', async () => {
            const plan = createPlan([
                {name: 'one', command: 'one'},
                {name: 'two', command: 'two'}
            ])
            sinon.stub(plan.steps[0], 'run').resolves(result({status: 'failed', code: 1}))
            const second = sinon.stub(plan.steps[1], 'run').resolves(result())

            const outcome = await plan.run()

            assert.strictEqual(outcome.status, 'failed')
            assert.ok(second.notCalled)
        })

        it('returns a terminated result without retrying', async () => {
            set.config('latex.autoBuild.cleanAndRetry.enabled', true)
            const plan = createPlan()
            sinon.stub(plan.steps[0], 'run').resolves(result({
                status: 'terminated',
                code: null,
                signal: 'SIGTERM'
            }))

            const outcome = await plan.run()

            assert.strictEqual(outcome.status, 'terminated')
            assert.ok(cleanStub.notCalled)
        })

        it('aggregates skipped over all internal steps', async () => {
            const plan = createPlan([
                {name: 'one', command: 'one'},
                {name: 'two', command: 'two'}
            ])
            plan.steps.forEach(step => {
                step.isSkipped = true
                sinon.stub(step, 'run').resolves(result({skipped: true}))
            })

            assert.strictEqual((await plan.run()).skipped, true)
        })

        it('keeps skipped false after any internal attempt is not skipped', async () => {
            const plan = createPlan([
                {name: 'one', command: 'one'},
                {name: 'two', command: 'two'}
            ])
            plan.steps[0].isSkipped = false
            plan.steps[1].isSkipped = true
            sinon.stub(plan.steps[0], 'run').resolves(result())
            sinon.stub(plan.steps[1], 'run').resolves(result({skipped: true}))

            assert.strictEqual((await plan.run()).skipped, false)
        })

        it('never reports an external plan as skipped', async () => {
            const plan = createPlan(undefined, {rootFile, cwd, isExternal: true}, 'External')
            plan.steps[0].isSkipped = true
            sinon.stub(plan.steps[0], 'run').resolves(result({skipped: true}))

            assert.strictEqual((await plan.run()).skipped, false)
        })

        it('does not retry a fatal process error', async () => {
            set.config('latex.autoBuild.cleanAndRetry.enabled', true)
            const plan = createPlan()
            const run = sinon.stub(plan.steps[0], 'run').resolves(result({
                status: 'failed',
                code: null,
                error: new Error('spawn failed')
            }))

            assert.strictEqual((await plan.run()).status, 'failed')
            assert.ok(run.calledOnce)
            assert.ok(cleanStub.notCalled)
        })

        it('does not retry a failed external step', async () => {
            set.config('latex.autoBuild.cleanAndRetry.enabled', true)
            const plan = createPlan(undefined, {rootFile, cwd, isExternal: true}, 'External')
            sinon.stub(plan.steps[0], 'run').resolves(result({status: 'failed', code: 1}))

            assert.strictEqual((await plan.run()).status, 'failed')
            assert.ok(cleanStub.notCalled)
        })

        it('does not retry a failed result carrying SIGTERM', async () => {
            set.config('latex.autoBuild.cleanAndRetry.enabled', true)
            const plan = createPlan()
            sinon.stub(plan.steps[0], 'run').resolves(result({status: 'failed', code: null, signal: 'SIGTERM'}))

            assert.strictEqual((await plan.run()).status, 'failed')
            assert.ok(cleanStub.notCalled)
        })

        it('does not retry a step already marked as a retry', async () => {
            set.config('latex.autoBuild.cleanAndRetry.enabled', true)
            const plan = createPlan()
            plan.steps[0].isRetry = true
            sinon.stub(plan.steps[0], 'run').resolves(result({status: 'failed', code: 1}))

            assert.strictEqual((await plan.run()).status, 'failed')
            assert.ok(cleanStub.notCalled)
        })

        it('does not retry when clean-and-retry is disabled', async () => {
            const plan = createPlan()
            sinon.stub(plan.steps[0], 'run').resolves(result({status: 'failed', code: 1}))

            assert.strictEqual((await plan.run()).status, 'failed')
            assert.ok(cleanStub.notCalled)
        })

        it('cleans and retries the same step once', async () => {
            set.config('latex.autoBuild.cleanAndRetry.enabled', true)
            const plan = createPlan()
            const run = sinon.stub(plan.steps[0], 'run')
            run.onFirstCall().resolves(result({status: 'failed', code: 1, backend: 'pdftex'}))
            run.onSecondCall().resolves(result({backend: 'luatex'}))

            const outcome = await plan.run()

            assert.strictEqual(outcome.status, 'succeeded')
            assert.strictEqual(outcome.backend, 'luatex')
            assert.strictEqual(plan.steps[0].isRetry, true)
            assert.ok(run.calledTwice)
            assert.ok(cleanStub.calledOnceWithExactly(rootFile))
        })

        it('retries an internal plan without a root file', async () => {
            set.config('latex.autoBuild.cleanAndRetry.enabled', true)
            const plan = createPlan(undefined, {cwd, isExternal: false})
            const run = sinon.stub(plan.steps[0], 'run')
            run.onFirstCall().callsFake(() => {
                plan.steps[0].isSkipped = true
                return Promise.resolve(result({status: 'failed', code: 1, skipped: true}))
            })
            run.onSecondCall().callsFake(() => {
                plan.steps[0].isSkipped = true
                return Promise.resolve(result({skipped: true}))
            })

            const outcome = await plan.run()

            assert.strictEqual(outcome.status, 'succeeded')
            assert.strictEqual(outcome.skipped, true)
            assert.ok(cleanStub.calledOnceWithExactly(undefined))
        })

        it('waits for cleaning before retrying', async () => {
            set.config('latex.autoBuild.cleanAndRetry.enabled', true)
            let finishClean: (() => void) | undefined
            cleanStub.returns(new Promise<void>(resolve => {
                finishClean = resolve
            }))
            const plan = createPlan()
            const run = sinon.stub(plan.steps[0], 'run')
            run.onFirstCall().resolves(result({status: 'failed', code: 1}))
            run.onSecondCall().resolves(result())

            const outcome = plan.run()
            await Promise.resolve()
            await Promise.resolve()
            assert.ok(run.calledOnce)
            finishClean?.()
            assert.strictEqual((await outcome).status, 'succeeded')
        })

        it('still retries when cleaning rejects', async () => {
            set.config('latex.autoBuild.cleanAndRetry.enabled', true)
            cleanStub.rejects(new Error('clean failed'))
            const plan = createPlan()
            const run = sinon.stub(plan.steps[0], 'run')
            run.onFirstCall().resolves(result({status: 'failed', code: 1}))
            run.onSecondCall().resolves(result())

            const outcome = await plan.run()

            assert.strictEqual(outcome.status, 'succeeded')
            assert.ok(run.calledTwice)
            assert.hasLog('Failed to clean auxiliary files before retrying.')
        })

        it('returns the retry failure and its backend', async () => {
            set.config('latex.autoBuild.cleanAndRetry.enabled', true)
            const plan = createPlan()
            const run = sinon.stub(plan.steps[0], 'run')
            run.onFirstCall().resolves(result({status: 'failed', code: 1, backend: 'pdftex'}))
            run.onSecondCall().resolves(result({status: 'failed', code: 2, backend: 'dvipdfmx'}))

            const outcome = await plan.run()

            assert.strictEqual(outcome.status, 'failed')
            assert.strictEqual(outcome.result.code, 2)
            assert.strictEqual(outcome.backend, 'dvipdfmx')
            assert.ok(run.calledTwice)
        })

        it('includes each actual retry attempt in skipped aggregation', async () => {
            set.config('latex.autoBuild.cleanAndRetry.enabled', true)
            const plan = createPlan()
            const run = sinon.stub(plan.steps[0], 'run')
            run.onFirstCall().callsFake(() => {
                plan.steps[0].isSkipped = false
                return Promise.resolve(result({status: 'failed', code: 1}))
            })
            run.onSecondCall().callsFake(() => {
                plan.steps[0].isSkipped = true
                return Promise.resolve(result({skipped: true}))
            })

            assert.strictEqual((await plan.run()).skipped, false)
        })

        it('exposes and then clears the active step while running', async () => {
            const plan = createPlan()
            let activeDuringRun
            sinon.stub(plan.steps[0], 'run').callsFake(() => {
                activeDuringRun = plan.activeStep
                return Promise.resolve(result())
            })

            await plan.run()

            assert.strictEqual(activeDuringRun, plan.steps[0])
            assert.strictEqual(plan.activeStep, undefined)
        })

        it('clears the active step when Step.run rejects', async () => {
            const plan = createPlan()
            sinon.stub(plan.steps[0], 'run').rejects(new Error('unexpected'))

            await assert.rejects(plan.run(), /unexpected/)

            assert.strictEqual(plan.activeStep, undefined)
        })

        it('formats single and multi-step progress with optional root filename', async () => {
            const relativePath = sinon.stub(vscode.workspace, 'asRelativePath').returns('main.tex')
            const single = createPlan(undefined, {cwd, isExternal: false})
            const formatSingle = Reflect.get(single, 'formatStepProgress') as (step: typeof single.steps[number]) => string
            assert.strictEqual(formatSingle.call(single, single.steps[0]), 'Recipe')
            sinon.stub(single.steps[0], 'run').resolves(result())
            await single.run()
            assert.ok(relativePath.notCalled)

            set.config('latex.build.rootfileInStatus', true)
            const multiple = createPlan([
                {name: 'one', command: 'one'},
                {name: 'two', command: 'two'}
            ])
            const formatMultiple = Reflect.get(multiple, 'formatStepProgress') as (step: typeof multiple.steps[number]) => string
            assert.strictEqual(
                formatMultiple.call(multiple, multiple.steps[0]),
                'main.tex: Recipe: 1/2 (one)'
            )
            multiple.steps.forEach(step => sinon.stub(step, 'run').resolves(result()))
            await multiple.run()

            assert.strictEqual(relativePath.callCount, 3)
            relativePath.restore()
        })

        it('rejects a malformed plan without steps', async () => {
            const plan = createPlan()
            plan.steps.length = 0

            await assert.rejects(plan.run(), /must contain at least one Step/)
        })
    })

    describe('Plan.terminate', () => {
        it('forwards termination to the active step and returns its error', () => {
            const plan = createPlan()
            const error = new Error('kill failed')
            const terminate = sinon.stub(plan.steps[0], 'terminate').returns(error)
            plan.activeStep = plan.steps[0]

            assert.strictEqual(plan.terminate(), error)
            assert.ok(terminate.calledOnce)
        })

        it('does nothing without an active step', () => {
            assert.strictEqual(createPlan().terminate(), undefined)
        })
    })
})
