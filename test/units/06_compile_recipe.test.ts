import * as vscode from 'vscode'
import * as path from 'path'
import Sinon, * as sinon from 'sinon'
import { assert, get, mock, set, sleep } from './utils'
import { lw } from '../../src/lw'
import { build, initialize } from '../../src/compile/recipe'
import { queue } from '../../src/compile/queue'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    let getAuxDirStub: sinon.SinonStub
    let getIncludedTeXStub: sinon.SinonStub
    let mkdirStub: sinon.SinonStub

    before(() => {
        mock.init(lw)
        getAuxDirStub = sinon.stub(lw.file, 'getAuxDir').returns('.')
        getIncludedTeXStub = lw.cache.getIncludedTeX as sinon.SinonStub
        mkdirStub = sinon.stub(lw.external, 'mkdirSync').returns(undefined)
    })

    beforeEach(() => {
        initialize()
        getIncludedTeXStub.returns([])
    })

    afterEach(() => {
        queue.clear()
        getAuxDirStub.resetHistory()
        getIncludedTeXStub.resetHistory()
        mkdirStub.resetHistory()
        lw.root.subfiles.path = undefined
        lw.compile.compiledPDFPath = ''
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.compile->recipe.build', () => {
        it('should call `saveAll` before building', async () => {
            const saveStub = sinon.stub(vscode.workspace, 'saveAll') as sinon.SinonStub
            const rootFile = set.root('main.tex')

            await build(rootFile, 'latex', async () => {})
            saveStub.restore()

            assert.ok(saveStub.calledOnce)
        })

        it('should prepare the fixed secure latexmk tool and call buildLoop', async () => {
            const rootFile = set.root('main.tex')
            const buildLoop = sinon.stub().resolves()

            await build(rootFile, 'latex', buildLoop)

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, 'latexmk')
            assert.strictEqual(step.command, 'latexmk')
            assert.ok(buildLoop.calledOnce)
            assert.pathStrictEqual(lw.compile.compiledPDFPath, rootFile.replace('.tex', '.pdf'))
        })

        it('should create auxiliary subfolders relative to the root directory', async () => {
            const rootFile = set.root('main.tex')
            const subPath = get.path('sub', 'main.tex')
            lw.root.subfiles.path = subPath
            getIncludedTeXStub.returns([rootFile, subPath])

            await build(rootFile, 'latex', async () => {})

            assert.hasLog(`auxDir: ${path.dirname(rootFile)} .`)
        })
    })

    describe('lw.compile->recipe.fixed secure recipe', () => {
        let readStub: sinon.SinonStub

        beforeEach(() => {
            readStub = sinon.stub(lw.file, 'read')
        })

        afterEach(() => {
            readStub.restore()
        })

        it('should ignore custom recipes and tools from configuration', async () => {
            const rootFile = set.root('main.tex')
            set.config('latex.tools', [{ name: 'RecipeTool', command: 'xelatex' }])
            set.config('latex.recipes', [{ name: 'Recipe1', tools: ['RecipeTool'] }])

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, 'latexmk')
            assert.strictEqual(step.command, 'latexmk')
        })

        it('should ignore build magic comments and keep the fixed recipe', async () => {
            const rootFile = set.root('magic.tex')
            readStub.resolves('% !TEX program = pdflatex\n% !LW recipe = custom\n')
            set.config('latex.build.enableMagicComments', true)

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.command, 'latexmk')
            assert.hasLog('Ignoring magic-command comments in secure build.')
        })

        it('should ignore requested recipe names', async () => {
            await build('dummy.tex', 'latex', async () => {}, 'customRecipe')

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.command, 'latexmk')
            assert.hasLog('Ignoring requested recipe customRecipe in this secure build.')
        })
    })

    describe('lw.compile->recipe.populateTools', () => {
        let syncStub: Sinon.SinonStub
        let platform: PropertyDescriptor | undefined
        let extRoot: string

        const setPlatform = (newPlatform: NodeJS.Platform) => {
            Object.defineProperty(process, 'platform', { value: newPlatform })
        }

        before(() => {
            syncStub = sinon.stub(lw.external, 'sync')
            platform = Object.getOwnPropertyDescriptor(process, 'platform')
            extRoot = lw.extensionRoot
        })

        afterEach(() => {
            syncStub.reset()
            if (platform !== undefined) {
                Object.defineProperty(process, 'platform', platform)
            }
            lw.extensionRoot = extRoot
            queue.clear()
        })

        after(() => {
            syncStub.restore()
        })

        it('should replace placeholders in the fixed latexmk arguments', async () => {
            const rootFile = set.root('main.tex')

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.ok(step.args?.includes(rootFile.replace('.tex', '')))
            assert.ok(step.args?.includes(`-outdir=${path.dirname(rootFile)}`))
            assert.ok(step.args?.includes(`-auxdir=${path.dirname(rootFile)}`))
        })

        it('should modify the fixed command when Docker is enabled on Windows', async () => {
            set.config('docker.enabled', true)
            setPlatform('win32')
            lw.extensionRoot = '/path/to/extension'

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.pathStrictEqual(step.command, path.resolve('/path/to/extension', './scripts/latexmk.bat'))
        })

        it('should modify the fixed command when Docker is enabled on non-Windows', async () => {
            set.config('docker.enabled', true)
            setPlatform('linux')
            lw.extensionRoot = '/path/to/extension'

            const chmodStub = sinon.stub(lw.external, 'chmodSync')
            await build('dummy.tex', 'latex', async () => {})
            chmodStub.restore()

            const step = queue.getStep()
            assert.ok(step)
            assert.pathStrictEqual(step.command, path.resolve('/path/to/extension', './scripts/latexmk'))
            assert.strictEqual(chmodStub.getCall(0).args?.[1], 0o755)
        })

        it('should append max print line to the fixed latexmk invocation on MiKTeX', async () => {
            set.config('latex.option.maxPrintLine.enabled', true)
            syncStub.returns({ stdout: 'pdfTeX (MiKTeX)' })
            const rootFile = set.root('main.tex')

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.ok(step.args?.includes('--max-print-line=' + lw.constant.MAX_PRINT_LINE), step.args?.join(' '))
        })

        it('should cache MiKTeX detection across builds', async () => {
            syncStub.returns({ stdout: 'pdfTeX (MiKTeX)' })
            const rootFile = set.root('main.tex')

            await build(rootFile, 'latex', async () => {})
            queue.clear()
            syncStub.resetHistory()
            await build(rootFile, 'latex', async () => {})

            assert.strictEqual(syncStub.callCount, 0)
        })
    })

    describe('lw.compile->recipe config propagation', () => {
        it('should set the LATEXWORKSHOP_DOCKER_LATEX environment variable based on configuration', async () => {
            const expectedImageName = 'your-docker-image'

            await set.codeConfig('docker.image.latex', expectedImageName)
            await sleep(150)

            assert.strictEqual(process.env['LATEXWORKSHOP_DOCKER_LATEX'], expectedImageName)
        })

        it('should set the LATEXWORKSHOP_DOCKER_PATH environment variable based on configuration', async () => {
            const expectedDockerPath = '/usr/local/bin/docker'

            await set.codeConfig('docker.path', expectedDockerPath)
            await sleep(150)

            assert.strictEqual(process.env['LATEXWORKSHOP_DOCKER_PATH'], expectedDockerPath)
        })
    })
})