import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import Sinon, * as sinon from 'sinon'
import { assert, get, log, mock, set, sleep } from './utils'
import { lw } from '../../src/lw'
import { build, initialize } from '../../src/compile/recipe'
import { queue } from '../../src/compile/queue'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]
    let getOutDirStub: sinon.SinonStub
    let getIncludedTeXStub: sinon.SinonStub

    before(() => {
        mock.object(lw, 'file', 'root')
        getOutDirStub = sinon.stub(lw.file, 'getOutDir').returns('.')
        getIncludedTeXStub = lw.cache.getIncludedTeX as sinon.SinonStub
    })

    beforeEach(async () => {
        initialize()
        getIncludedTeXStub.returns([])
        await set.config('latex.recipe.default', 'first')
    })

    afterEach(() => {
        getOutDirStub.resetHistory()
        getIncludedTeXStub.resetHistory()
        lw.root.subfiles.path = undefined
        lw.compile.compiledPDFPath = ''
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.compile->recipe', () => {
        it('should set the LATEXWORKSHOP_DOCKER_LATEX environment variable based on the configuration', async function (this: Mocha.Context) {
            this.slow(500)
            const expectedImageName = 'your-docker-image'

            await set.config('docker.image.latex', expectedImageName)
            await sleep(150)

            assert.strictEqual(process.env['LATEXWORKSHOP_DOCKER_LATEX'], expectedImageName)
        })

        it('should set the LATEXWORKSHOP_DOCKER_PATH environment variable based on the configuration', async function (this: Mocha.Context) {
            this.slow(500)
            const expectedDockerPath = '/usr/local/bin/docker'

            await set.config('docker.path', expectedDockerPath)
            await sleep(150)

            assert.strictEqual(process.env['LATEXWORKSHOP_DOCKER_PATH'], expectedDockerPath)
        })
    })

    describe('lw.compile->recipe.build', () => {
        it('should save all open files in the workspace', async () => {
            const stub = sinon.stub(vscode.workspace, 'saveAll') as sinon.SinonStub
            const rootFile = set.root(fixture, 'main.tex')

            await build(rootFile, 'latex', async () => {})
            stub.restore()

            assert.ok(stub.calledOnce)
        })

        it('should call `createOutputSubFolders` with correct args', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            const subPath = get.path(fixture, 'sub', 'main.tex')
            await set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk' }])
            await set.config('latex.recipes', [{ name: 'Recipe1', tools: ['latexmk'] }])
            lw.root.subfiles.path = subPath
            getIncludedTeXStub.returns([rootFile, subPath])

            await build(rootFile, 'latex', async () => {})
            assert.hasLog(`outDir: ${path.dirname(rootFile)} .`)
        })

        it('should call `createOutputSubFolders` with correct args with subfiles package', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            const subPath = get.path(fixture, 'sub', 'main.tex')
            await set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk' }])
            await set.config('latex.recipes', [{ name: 'Recipe1', tools: ['latexmk'] }])
            lw.root.subfiles.path = subPath
            getIncludedTeXStub.returns([rootFile, subPath])

            await build(subPath, 'latex', async () => {})
            assert.hasLog(`outDir: ${path.dirname(rootFile)} .`)
        })

        it('should not call buildLoop if no tool is created', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('latex.tools', [])
            await set.config('latex.recipes', [{ name: 'Recipe1', tools: ['nonexistentTool'] }])

            const stub = sinon.stub()
            await build(rootFile, 'latex', stub)

            assert.strictEqual(stub.callCount, 0)
        })

        it('should set lw.compile.compiledPDFPath', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk' }])
            await set.config('latex.recipes', [{ name: 'Recipe1', tools: ['latexmk'] }])

            await build(rootFile, 'latex', async () => {})

            assert.pathStrictEqual(lw.compile.compiledPDFPath, rootFile.replace('.tex', '.pdf'))
        })
    })

    describe('lw.compile->recipe.createBuildTools', () => {
        it('should return undefined if no recipe is found', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('latex.recipes', [])

            await build(rootFile, 'latex', async () => {})

            assert.hasLog('Invalid toolchain.')
        })

        it('should create build tools based on magic comments when enabled', async () => {
            const rootFile = set.root(fixture, 'magic.tex')
            await set.config('latex.recipes', [])
            await set.config('latex.build.forceRecipeUsage', false)
            await set.config('latex.magic.args', ['--shell-escape'])

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.TEX_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
            assert.strictEqual(step.command, 'pdflatex')
            assert.listStrictEqual(step.args, ['--shell-escape'])
        })

        it('should return undefined with magic comments but disabled', async () => {
            const rootFile = set.root(fixture, 'magic.tex')
            await set.config('latex.recipes', [])
            await set.config('latex.build.forceRecipeUsage', true)

            await build(rootFile, 'latex', async () => {})

            assert.hasLog('Invalid toolchain.')
        })

        it('should skip undefined tools in the recipe and log an error', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('latex.tools', [{ name: 'existingTool', command: 'pdflatex' }])
            await set.config('latex.recipes', [{ name: 'Recipe1', tools: ['nonexistentTool', 'existingTool'] }])

            await build(rootFile, 'latex', async () => {})

            assert.hasLog('Skipping undefined tool nonexistentTool in recipe Recipe1.')
            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, 'existingTool')
            assert.strictEqual(step.command, 'pdflatex')
            assert.listStrictEqual(step.args, [])
        })

        it('should return undefined if no tools are prepared', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('latex.tools', [])
            await set.config('latex.recipes', [{ name: 'Recipe1', tools: ['nonexistentTool'] }])

            await build(rootFile, 'latex', async () => {})

            assert.hasLog('Invalid toolchain.')
        })
    })

    describe('lw.compile->recipe.createOutputSubFolders', () => {
        beforeEach(() => {
            getIncludedTeXStub.returns([ set.root(fixture, 'main.tex') ])
        })

        afterEach(() => {
            getOutDirStub.returns('.')
        })

        it('should resolve the output directory relative to the root directory if not absolute', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            const relativeOutDir = 'output'
            const expectedOutDir = path.resolve(path.dirname(rootFile), relativeOutDir)
            getOutDirStub.returns(relativeOutDir)

            await build(rootFile, 'latex', async () => {})

            assert.hasLog(`outDir: ${expectedOutDir} .`)
        })

        it('should use the absolute output directory as is', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            const absoluteOutDir = '/absolute/output'
            getOutDirStub.returns(absoluteOutDir)

            await build(rootFile, 'latex', async () => {})

            assert.hasLog(`outDir: ${absoluteOutDir} .`)
        })

        it('should create the output directory if it does not exist', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            const relativeOutDir = 'output'
            const expectedOutDir = path.resolve(path.dirname(rootFile), relativeOutDir)
            const existsStub = sinon.stub(lw.external, 'existsSync').returns(false)
            const statStub = sinon.stub(lw.external, 'statSync').returns(fs.statSync(get.path(fixture)))
            const mkdirStub = sinon.stub(lw.external, 'mkdirSync').returns(undefined)
            getOutDirStub.returns(relativeOutDir)

            await build(rootFile, 'latex', async () => {})
            existsStub.restore()
            statStub.restore()
            mkdirStub.restore()

            assert.pathStrictEqual(mkdirStub.getCalls()[0].args[0].toString(), expectedOutDir)
            assert.deepStrictEqual(mkdirStub.getCalls()[0].args[1], { recursive: true })
        })

        it('should not create the output directory if it already exists', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            const relativeOutDir = 'output'
            const existsStub = sinon.stub(lw.external, 'existsSync').returns(true)
            const statStub = sinon.stub(lw.external, 'statSync').returns(fs.statSync(get.path(fixture)))
            const mkdirStub = sinon.stub(lw.external, 'mkdirSync').returns(undefined)
            getOutDirStub.returns(relativeOutDir)

            await build(rootFile, 'latex', async () => {})
            mkdirStub.resetHistory()

            await build(rootFile, 'latex', async () => {})
            existsStub.restore()
            statStub.restore()
            mkdirStub.restore()

            assert.ok(!mkdirStub.called)
        })
    })

    describe('lw.compile->recipe.findMagicComments', () => {
        let readStub: sinon.SinonStub

        before(() => {
            readStub = sinon.stub(lw.file, 'read')
            queue.clear()
        })

        beforeEach(async () => {
            await set.config('latex.build.forceRecipeUsage', false)
        })

        afterEach(() => {
            readStub.reset()
            queue.clear()
        })

        after(() => {
            readStub.restore()
        })

        it('should return an empty object if there are no magic comments', async () => {
            readStub.resolves('Some regular content\nwith no magic comments')

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()

            assert.ok(step)
            assert.notStrictEqual(step.name, lw.constant.TEX_MAGIC_PROGRAM_NAME)
            assert.notStrictEqual(step.name, lw.constant.TEX_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
        })

        it('should detect only TeX magic comment', async () => {
            readStub.resolves('% !TEX program = pdflatex\n')

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()

            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.TEX_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
            assert.strictEqual(step.command, 'pdflatex')
        })

        it('should detect TeX magic comment with options', async () => {
            readStub.resolves('% !TEX program = pdflatex\n% !TEX options = --shell-escape\n')

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()

            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.TEX_MAGIC_PROGRAM_NAME)
            assert.strictEqual(step.command, 'pdflatex')
            assert.listStrictEqual(step.args, ['--shell-escape'])
        })

        it('should detect BIB magic comment', async () => {
            readStub.resolves('% !TEX program = pdflatex\n% !BIB program = bibtex\n')

            await build('dummy.tex', 'latex', async () => {})

            queue.getStep() // pdflatex
            const step = queue.getStep() // bibtex

            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.BIB_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
            assert.strictEqual(step.command, 'bibtex')
        })

        it('should detect BIB magic comment with options', async () => {
            readStub.resolves('% !TEX program = pdflatex\n% !BIB program = bibtex\n% !BIB options = --min-crossrefs=100\n')

            await build('dummy.tex', 'latex', async () => {})

            queue.getStep() // pdflatex
            const step = queue.getStep() // bibtex

            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.BIB_MAGIC_PROGRAM_NAME)
            assert.strictEqual(step.command, 'bibtex')
            assert.listStrictEqual(step.args, ['--min-crossrefs=100'])
        })

        it('should detect only LW recipe comment', async () => {
            await set.config('latex.tools', [{ name: 'Tool1', command: 'pdflatex' }, { name: 'Tool2', command: 'xelatex' }])
            await set.config('latex.recipes', [{ name: 'Recipe1', tools: ['Tool1'] }, { name: 'Recipe2', tools: ['Tool2'] }])

            readStub.resolves('% !LW recipe = Recipe2\n')

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, 'Tool2')
            assert.strictEqual(step.command, 'xelatex')
        })

        it('should detect all magic comments', async () => {
            readStub.resolves(
                '% !TEX program = xelatex\n' +
                    '% !TEX options = -interaction=nonstopmode\n' +
                    '% !BIB program = biber\n' +
                    '% !BIB options = --debug'
            )

            await build('dummy.tex', 'latex', async () => {})

            let step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.TEX_MAGIC_PROGRAM_NAME)
            assert.strictEqual(step.command, 'xelatex')
            assert.listStrictEqual(step.args, ['-interaction=nonstopmode'])

            step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.BIB_MAGIC_PROGRAM_NAME)
            assert.strictEqual(step.command, 'biber')
            assert.listStrictEqual(step.args, ['--debug'])
        })

        it('should ignore non-magic comments', async () => {
            readStub.resolves('This is a regular line\n% !TEX program = texprogram')

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.notStrictEqual(step.command, 'texprogram')
        })

        it('should stop reading after encountering non-comment lines', async () => {
            readStub.resolves(
                '% !TEX program = pdflatex\n' +
                    'This is not a comment and should stop further reading\n' +
                    '% !BIB program = bibtex'
            )

            await build('dummy.tex', 'latex', async () => {})

            queue.getStep() // pdflatex
            const step = queue.getStep() // bibtex

            assert.strictEqual(step, undefined)
        })
    })

    describe('lw.compile->recipe.createBuildMagic', () => {
        let readStub: sinon.SinonStub

        before(() => {
            readStub = sinon.stub(lw.file, 'read')
            queue.clear()
        })

        beforeEach(async () => {
            await set.config('latex.build.forceRecipeUsage', false)
            await set.config('latex.magic.args', ['--shell-escape'])
            await set.config('latex.magic.bib.args', ['--min-crossrefs=1000'])
        })

        afterEach(() => {
            readStub.reset()
            queue.clear()
        })

        after(() => {
            readStub.restore()
        })

        it('should set magicTex.args and magicTex.name if magicTex.args is undefined and magicBib is undefined', async () => {
            readStub.resolves('% !TEX program = pdflatex\n\n')

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.TEX_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
            assert.strictEqual(step.command, 'pdflatex')
            assert.listStrictEqual(step.args, ['--shell-escape'])
        })

        it('should set magicTex.args, magicTex.name, magicBib.args, and magicBib.name when magicBib is provided and both args are undefined', async () => {
            readStub.resolves('% !TEX program = xelatex\n% !BIB program = biber\n')

            await build('dummy.tex', 'latex', async () => {})

            let step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.TEX_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
            assert.strictEqual(step.command, 'xelatex')
            assert.listStrictEqual(step.args, ['--shell-escape'])

            step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.BIB_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
            assert.strictEqual(step.command, 'biber')
            assert.listStrictEqual(step.args, ['--min-crossrefs=1000'])
        })

        it('should not overwrite magicTex.args if it is already defined, even when magicBib is provided and magicBib.args is undefined', async () => {
            readStub.resolves('% !TEX program = xelatex\n% !TEX options = -interaction=nonstopmode\n% !BIB program = biber\n')

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.TEX_MAGIC_PROGRAM_NAME)
            assert.strictEqual(step.command, 'xelatex')
            assert.listStrictEqual(step.args, ['-interaction=nonstopmode'])
        })

        it('should not overwrite magicTex.args and magicBib.args if both are already defined', async () => {
            readStub.resolves('% !TEX program = xelatex\n% !TEX options = -interaction=nonstopmode\n% !BIB program = biber\n% !BIB options = --debug\n')

            await build('dummy.tex', 'latex', async () => {})

            let step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.TEX_MAGIC_PROGRAM_NAME)
            assert.strictEqual(step.command, 'xelatex')
            assert.listStrictEqual(step.args, ['-interaction=nonstopmode'])

            step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, lw.constant.BIB_MAGIC_PROGRAM_NAME)
            assert.strictEqual(step.command, 'biber')
            assert.listStrictEqual(step.args, ['--debug'])
        })
    })

    describe('lw.compile->recipe.findRecipe', () => {
        beforeEach(async () => {
            await set.config('latex.tools', [{ name: 'Tool1', command: 'pdflatex' }, { name: 'Tool2', command: 'xelatex' }, { name: 'Tool3', command: 'lualatex' }])
            await set.config('latex.recipes', [{ name: 'Recipe1', tools: ['Tool1'] }, { name: 'Recipe2', tools: ['Tool2'] }, { name: 'Recipe3', tools: ['Tool3'] }])
        })

        it('should return undefined and log an error if no recipes are defined', async () => {
            await set.config('latex.recipes', [])

            await build('dummy.tex', 'latex', async () => {})

            assert.hasLog('No recipes defined.')
        })

        it('should use the default recipe name if recipeName is undefined', async () => {
            await set.config('latex.recipe.default', 'Recipe2')

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, 'Tool2')
        })

        it('should log an error and return undefined if the specified recipe is not found', async () => {
            await build('dummy.tex', 'latex', async () => {}, 'nonExistentRecipe')

            assert.hasLog('Failed to resolve build recipe')
        })

        it('should return the last used recipe if defaultRecipeName is lastUsed', async () => {
            await set.config('latex.recipe.default', 'lastUsed')

            await build('dummy.tex', 'latex', async () => {}, 'Recipe2')
            queue.clear()
            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, 'Tool2')
        })

        it('should reset prevRecipe if the language ID changes', async () => {
            await set.config('latex.recipe.default', 'lastUsed')

            await build('dummy.tex', 'latex', async () => {}, 'Recipe2')
            queue.clear()
            await build('dummy.tex', 'latex-expl3', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.notStrictEqual(step.name, 'Tool2')
        })

        it('should return the first matching recipe based on langId if no recipe is found', async () => {
            await set.config('latex.recipes', [
                { name: 'recipe1', tools: [] },
                { name: 'rsweave Recipe', tools: [] },
                { name: 'weave.jl Recipe', tools: [] },
                { name: 'pweave Recipe', tools: [] },
            ])

            log.start()
            await build('dummy.tex', 'rsweave', async () => {})
            log.stop()

            assert.hasLog('Preparing to run recipe: rsweave Recipe.')
            assert.notHasLog('Preparing to run recipe: weave.jl Recipe.')
            assert.notHasLog('Preparing to run recipe: pweave Recipe.')

            log.start()
            await build('dummy.tex', 'jlweave', async () => {})
            log.stop()

            assert.notHasLog('Preparing to run recipe: rsweave Recipe.')
            assert.hasLog('Preparing to run recipe: weave.jl Recipe.')
            assert.notHasLog('Preparing to run recipe: pweave Recipe.')

            log.start()
            await build('dummy.tex', 'pweave', async () => {})
            log.stop()

            assert.notHasLog('Preparing to run recipe: rsweave Recipe.')
            assert.notHasLog('Preparing to run recipe: weave.jl Recipe.')
            assert.hasLog('Preparing to run recipe: pweave Recipe.')
        })

        it('should log an error and return undefined if no matching recipe is found for the specific langId', async () => {
            await build('dummy.tex', 'rsweave', async () => {})

            assert.hasLog('Cannot find any recipe for langID `rsweave`.')
        })

        it('should return the first recipe if no other recipe matches', async () => {
            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.name, 'Tool1')
        })
    })

    describe('lw.compile->recipe.populateTools', () => {
        let readStub: sinon.SinonStub
        let syncStub: sinon.SinonStub
        let platform: PropertyDescriptor | undefined
        let extRoot: string

        const setPlatform = (newPlatform: NodeJS.Platform) => {
            Object.defineProperty(process, 'platform', { value: newPlatform })
        }

        before(() => {
            readStub = sinon.stub(lw.file, 'read')
            syncStub = sinon.stub(lw.external, 'sync')
            platform = Object.getOwnPropertyDescriptor(process, 'platform')
            extRoot = lw.extensionRoot
        })

        beforeEach(async () => {
            await set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk' }])
            await set.config('latex.recipes', [{ name: 'Recipe1', tools: ['latexmk'] }])
        })

        afterEach(() => {
            readStub.reset()
            syncStub.reset()
            if (platform !== undefined) {
                Object.defineProperty(process, 'platform', platform)
            }
            lw.extensionRoot = extRoot
            queue.clear()
        })

        after(() => {
            readStub.restore()
            syncStub.restore()
        })

        it('should modify command when Docker is enabled on Windows', async () => {
            await set.config('docker.enabled', true)
            setPlatform('win32')
            lw.extensionRoot = '/path/to/extension'

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.pathStrictEqual(step.command, path.resolve('/path/to/extension', './scripts/latexmk.bat'))
        })

        it('should modify command and chmod when Docker is enabled on non-Windows', async () => {
            await set.config('docker.enabled', true)
            setPlatform('linux')
            lw.extensionRoot = '/path/to/extension'

            const stub = sinon.stub(lw.external, 'chmodSync')
            await build('dummy.tex', 'latex', async () => {})
            stub.restore()

            const step = queue.getStep()
            assert.ok(step)
            assert.pathStrictEqual(step.command, path.resolve('/path/to/extension', './scripts/latexmk'))
            assert.strictEqual(stub.getCall(0).args?.[1], 0o755)
        })

        it('should not modify command when Docker is disabled', async () => {
            await set.config('docker.enabled', false)

            await build('dummy.tex', 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.command, 'latexmk')
        })

        it('should replace argument placeholders', async () => {
            await set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk', args: ['%DOC%', '%DOC%', '%DIR%'], env: {} }])
            const rootFile = set.root(fixture, 'main.tex')

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.pathStrictEqual(step.args?.[0], rootFile.replace('.tex', ''))
            assert.pathStrictEqual(step.args?.[1], rootFile.replace('.tex', ''))
            assert.pathStrictEqual(step.args?.[2], get.path(fixture))
        })

        it('should set TeX directories correctly', async () => {
            await set.config('latex.tools', [
                {
                    name: 'latexmk',
                    command: 'latexmk',
                    args: ['-out-directory=out', '-aux-directory=aux'],
                    env: {},
                },
            ])
            const rootFile = set.root(fixture, 'main.tex')

            const stub = sinon.stub(lw.file, 'setTeXDirs')
            await build(rootFile, 'latex', async () => {})
            stub.restore()

            assert.listStrictEqual(stub.getCall(0).args, [rootFile, 'out', 'aux'])
        })

        it('should process environment variables correctly', async () => {
            await set.config('latex.tools', [
                {
                    name: 'latexmk',
                    command: 'latexmk',
                    args: [],
                    env: { DOC: '%DOC%' },
                },
            ])
            const rootFile = set.root(fixture, 'main.tex')

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.pathStrictEqual(step.env?.['DOC'], rootFile.replace('.tex', ''))
        })

        it('should append max print line arguments when enabled', async () => {
            await set.config('latex.option.maxPrintLine.enabled', true)
            await set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk' }])
            syncStub.returns('pdfTeX 3.14159265-2.6-1.40.21 (MiKTeX 2.9.7350 64-bit)')
            const rootFile = set.root(fixture, 'main.tex')

            await build(rootFile, 'latex', async () => {})

            let step = queue.getStep()
            assert.ok(step)
            assert.ok(step.args?.includes('--max-print-line=' + lw.constant.MAX_PRINT_LINE), step.args?.join(' '))

            await set.config('latex.tools', [{ name: 'latexmk', command: 'pdflatex' }])
            initialize()
            await build(rootFile, 'latex', async () => {})

            step = queue.getStep()
            assert.ok(step)
            assert.ok(step.args?.includes('--max-print-line=' + lw.constant.MAX_PRINT_LINE), step.args?.join(' '))

            await set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk', args: ['--lualatex'] }])
            initialize()
            await build(rootFile, 'latex', async () => {})

            step = queue.getStep()
            assert.ok(step)
            assert.ok(!step.args?.includes('--max-print-line=' + lw.constant.MAX_PRINT_LINE), step.args?.join(' '))
        })
    })

    describe('lw.compile->recipe.isMikTeX', () => {
        let syncStub: Sinon.SinonStub

        before(() => {
            syncStub = sinon.stub(lw.external, 'sync')
        })

        beforeEach(async () => {
            await set.config('latex.option.maxPrintLine.enabled', true)
            await set.config('latex.tools', [{ name: 'latexmk', command: 'latexmk' }])
        })

        afterEach(() => {
            syncStub.reset()
        })

        after(() => {
            syncStub.restore()
        })

        it('should return false when pdflatex command fails', async () => {
            syncStub.throws(new Error('Command failed'))
            const rootFile = set.root(fixture, 'main.tex')

            await build(rootFile, 'latex', async () => {})

            const step = queue.getStep()
            assert.ok(step)
            assert.ok(!step.args?.includes('--max-print-line=' + lw.constant.MAX_PRINT_LINE), step.args?.join(' '))
            assert.hasLog('Cannot run `pdflatex` to determine if we are using MiKTeX.')
        })

        it('should return cached value if state.isMikTeX is already defined', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            syncStub.returns('pdfTeX 3.14159265-2.6-1.40.21 (MiKTeX 2.9.7350 64-bit)')

            await build(rootFile, 'latex', async () => {})
            queue.clear()
            syncStub.resetHistory()
            const testEnv = process.env['LATEXWORKSHOP_TEST']
            const ciEnv = process.env['LATEXWORKSHOP_CITEST']
            process.env['LATEXWORKSHOP_TEST'] = ''
            process.env['LATEXWORKSHOP_CITEST'] = ''
            await build(rootFile, 'latex', async () => {})
            process.env['LATEXWORKSHOP_TEST'] = testEnv
            process.env['LATEXWORKSHOP_CITEST'] = ciEnv

            const step = queue.getStep()
            assert.ok(step)
            assert.ok(step.args?.includes('--max-print-line=' + lw.constant.MAX_PRINT_LINE), step.args?.join(' '))
            assert.strictEqual(syncStub.callCount, 0)
        })
    })
})
