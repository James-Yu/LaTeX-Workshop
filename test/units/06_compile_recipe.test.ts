import * as path from 'path'
import * as fs from 'fs'
import * as sinon from 'sinon'
import { assert, get, has, mock, set } from './utils'
import { lw } from '../../src/lw'
import { queue } from '../../src/compile/queue'
import { _test as recipe } from '../../src/compile/recipe'
import type { Tool } from '../../src/types'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]

    before(() => {
        mock.object(lw, 'file', 'root')
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.compile->queue', () => {
        beforeEach(() => {
            queue.clear()
        })

        it('should clear the queue', () => {
            queue.add({ name: 'latex', command: 'pdflatex' }, 'main.tex', 'Recipe1', Date.now(), false)
            assert.strictEqual(queue._test.getQueue().steps.length, 1)

            queue.clear()
            assert.strictEqual(queue._test.getQueue().steps.length, 0)
        })

        it('should get the next step from the queue', () => {
            queue.add({ name: 'latex', command: 'pdflatex' }, 'main.tex', 'Recipe1', Date.now(), false)
            queue.add({ name: 'bibtex', command: 'bibtex' }, 'main.tex', 'Recipe1', Date.now(), false)

            const step1 = queue.getStep()
            const step2 = queue.getStep()

            assert.strictEqual(step1?.name, 'latex')
            assert.strictEqual(step2?.name, 'bibtex')
        })

        it('should add a Tool as a RecipeStep to the queue', () => {
            queue.add({ name: 'latex', command: 'pdflatex' }, 'main.tex', 'Recipe1', Date.now())

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.rootFile, 'main.tex')
            assert.strictEqual(step.recipeName, 'Recipe1')
            assert.strictEqual(step.isExternal, false)
        })

        it('should add a Tool as an ExternalStep to the queue', () => {
            queue.add({ name: 'latex', command: 'pdflatex' }, 'main.tex', 'Recipe1', Date.now(), true, '/usr/bin')

            const step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.recipeName, 'External')
            assert.strictEqual(step.isExternal, true)
            assert.strictEqual(step.cwd, '/usr/bin')
        })

        it('should prepend a Tool as a RecipeStep to the queue', () => {
            queue.add({ name: 'latex', command: 'pdflatex' }, 'main.tex', 'Recipe1', Date.now())

            let step = queue.getStep()
            queue.clear()
            queue.add({ name: 'latex', command: 'pdflatex' }, 'alt.tex', 'Recipe1', Date.now())

            assert.ok(step)
            queue.prepend(step)

            step = queue.getStep()
            assert.ok(step)
            assert.strictEqual(step.rootFile, 'main.tex')
            assert.strictEqual(step.recipeName, 'Recipe1')
            assert.strictEqual(step.isExternal, false)
        })

        it('should check if the last step in the queue', () => {
            queue.add({ name: 'latex', command: 'pdflatex' }, 'main.tex', 'Recipe1', Date.now(), false)

            let step = queue.getStep()
            assert.ok(step)
            assert.ok(queue.isLastStep(step))

            queue.add({ name: 'latex', command: 'pdflatex' }, 'main.tex', 'Recipe1', Date.now(), false)
            queue.add({ name: 'latex', command: 'pdflatex' }, 'main.tex', 'Recipe1', Date.now() + 1, false)

            step = queue.getStep()
            assert.ok(step)
            assert.ok(queue.isLastStep(step))
        })

        it('should get the formatted string representation of a step', () => {
            queue.add({ name: 'latex', command: 'pdflatex' }, 'main.tex', 'Recipe1', Date.now(), false)

            const step = queue.getStep()
            assert.ok(step)
            const stepString = queue.getStepString(step)
            assert.strictEqual(stepString, 'Recipe1')
        })

        it('should get correct step repr with multiple recipes', () => {
            queue.add({ name: 'latex', command: 'pdflatex' }, 'main.tex', 'Recipe1', Date.now(), false)
            queue.add({ name: 'latex', command: 'pdflatex' }, 'main.tex', 'Recipe1', Date.now() + 1, false)
            const step = queue.getStep()
            assert.ok(step)
            const stepString = queue.getStepString(step)
            assert.strictEqual(stepString, 'Recipe1')
        })

        it('should get correct step repr with multiple tools in one recipe', () => {
            const recipeTime = Date.now()
            queue.add({ name: 'latex1', command: 'pdflatex' }, 'main.tex', 'Recipe1', recipeTime, false)
            queue.add({ name: 'latex2', command: 'pdflatex' }, 'main.tex', 'Recipe1', recipeTime, false)

            let step = queue.getStep()
            assert.ok(step)
            let stepString = queue.getStepString(step)
            assert.strictEqual(stepString, 'Recipe1: 1/2 (latex1)')

            step = queue.getStep()
            assert.ok(step)
            stepString = queue.getStepString(step)
            assert.strictEqual(stepString, 'Recipe1: 2/2 (latex2)')
        })
    })

    describe('lw.compile->recipe', () => {
        it('should set the LATEXWORKSHOP_DOCKER_LATEX environment variable based on the configuration', async () => {
            const expectedImageName = 'your-docker-image'

            await set.config('docker.image.latex', expectedImageName)
            recipe.setDockerImage()

            assert.strictEqual(process.env['LATEXWORKSHOP_DOCKER_LATEX'], expectedImageName)
        })

        it('should set the LATEXWORKSHOP_DOCKER_PATH environment variable based on the configuration', async () => {
            const expectedDockerPath = '/usr/local/bin/docker'

            await set.config('docker.path', expectedDockerPath)
            recipe.setDockerPath()

            assert.strictEqual(process.env['LATEXWORKSHOP_DOCKER_PATH'], expectedDockerPath)
        })
    })

    describe('lw.compile->recipe.createOutputSubFolders', () => {
        let getOutDirStub: sinon.SinonStub
        let getIncludedTeXStub: sinon.SinonStub

        before(() => {
            getOutDirStub = sinon.stub(lw.file, 'getOutDir')
            getIncludedTeXStub = lw.cache.getIncludedTeX as sinon.SinonStub
        })

        afterEach(() => {
            getOutDirStub.reset()
            getIncludedTeXStub.reset()
        })

        after(() => {
            getOutDirStub.restore()
        })

        it('should resolve the output directory relative to the root directory if not absolute', () => {
            const rootFile = set.root(fixture, 'main.tex')
            const relativeOutDir = 'output'
            const expectedOutDir = path.resolve(path.dirname(rootFile), relativeOutDir)

            getOutDirStub.returns(relativeOutDir)
            getIncludedTeXStub.returns([rootFile])

            recipe.createOutputSubFolders(rootFile)

            assert.ok(getOutDirStub.calledWith(rootFile))
            assert.ok(has.log(`outDir: ${expectedOutDir} .`))
        })

        it('should use the absolute output directory as is', () => {
            const rootFile = set.root(fixture, 'main.tex')
            const absoluteOutDir = '/absolute/output'

            getOutDirStub.returns(absoluteOutDir)
            getIncludedTeXStub.returns([rootFile])

            recipe.createOutputSubFolders(rootFile)

            assert.ok(getOutDirStub.calledWith(rootFile))
            assert.ok(has.log(`outDir: ${absoluteOutDir} .`))
        })

        it('should create the output directory if it does not exist', () => {
            const rootFile = set.root(fixture, 'main.tex')
            const relativeOutDir = 'output'
            const expectedOutDir = path.resolve(path.dirname(rootFile), relativeOutDir)

            getOutDirStub.returns(relativeOutDir)
            getIncludedTeXStub.returns([rootFile])
            const existsStub = sinon.stub(lw.external, 'existsSync').returns(false)
            const statStub = sinon.stub(lw.external, 'statSync').returns(fs.statSync(get.path(fixture)))
            const mkdirStub = sinon.stub(lw.external, 'mkdirSync').returns(undefined)

            recipe.createOutputSubFolders(rootFile)
            existsStub.restore()
            statStub.restore()
            mkdirStub.restore()

            assert.pathStrictEqual(mkdirStub.getCalls()[0].args[0].toString(), expectedOutDir)
            assert.deepStrictEqual(mkdirStub.getCalls()[0].args[1], { recursive: true })
        })

        it('should not create the output directory if it already exists', () => {
            const rootFile = set.root(fixture, 'main.tex')
            const relativeOutDir = 'output'

            getOutDirStub.returns(relativeOutDir)
            getIncludedTeXStub.returns([rootFile])
            const existsStub = sinon.stub(lw.external, 'existsSync').returns(true)
            const statStub = sinon.stub(lw.external, 'statSync').returns(fs.statSync(get.path(fixture)))
            const mkdirStub = sinon.stub(lw.external, 'mkdirSync').returns(undefined)

            recipe.createOutputSubFolders(rootFile)
            existsStub.restore()
            statStub.restore()
            mkdirStub.restore()

            recipe.createOutputSubFolders(rootFile)
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
        })

        afterEach(() => {
            readStub.reset()
        })

        after(() => {
            readStub.restore()
        })

        it('should return an empty object if there are no magic comments', async () => {
            readStub.resolves('Some regular content\nwith no magic comments')

            const result = await recipe.findMagicComments('dummy.tex')

            assert.deepStrictEqual(result, { tex: undefined, bib: undefined, recipe: undefined })
        })

        it('should detect only TeX magic comment', async () => {
            readStub.resolves('% !TEX program = pdflatex\n')

            const result = await recipe.findMagicComments('dummy.tex')

            assert.deepStrictEqual(result, {
                tex: { name: lw.constant.TEX_MAGIC_PROGRAM_NAME, command: 'pdflatex' },
                bib: undefined,
                recipe: undefined,
            })
        })

        it('should detect TeX magic comment with options', async () => {
            readStub.resolves('% !TEX program = pdflatex\n% !TEX options = --shell-escape\n')

            const result = await recipe.findMagicComments('dummy.tex')

            assert.deepStrictEqual(result, {
                tex: { name: lw.constant.TEX_MAGIC_PROGRAM_NAME, command: 'pdflatex', args: ['--shell-escape'] },
                bib: undefined,
                recipe: undefined,
            })
        })

        it('should detect only BIB magic comment', async () => {
            readStub.resolves('% !BIB program = bibtex\n')

            const result = await recipe.findMagicComments('dummy.tex')

            assert.deepStrictEqual(result, {
                tex: undefined,
                bib: { name: lw.constant.BIB_MAGIC_PROGRAM_NAME, command: 'bibtex' },
                recipe: undefined,
            })
        })

        it('should detect BIB magic comment with options', async () => {
            readStub.resolves('% !BIB program = bibtex\n% !BIB options = --min-crossrefs=100\n')

            const result = await recipe.findMagicComments('dummy.tex')

            assert.deepStrictEqual(result, {
                tex: undefined,
                bib: { name: lw.constant.BIB_MAGIC_PROGRAM_NAME, command: 'bibtex', args: ['--min-crossrefs=100'] },
                recipe: undefined,
            })
        })

        it('should detect only LW recipe comment', async () => {
            readStub.resolves('% !LW recipe = default\n')

            const result = await recipe.findMagicComments('dummy.tex')

            assert.deepStrictEqual(result, {
                tex: undefined,
                bib: undefined,
                recipe: 'default',
            })
        })

        it('should detect all magic comments', async () => {
            readStub.resolves(
                '% !TEX program = xelatex\n' +
                    '% !TEX options = -interaction=nonstopmode\n' +
                    '% !BIB program = biber\n' +
                    '% !BIB options = --debug\n' +
                    '% !LW recipe = customRecipe'
            )

            const result = await recipe.findMagicComments('dummy.tex')

            assert.deepStrictEqual(result, {
                tex: {
                    name: lw.constant.TEX_MAGIC_PROGRAM_NAME,
                    command: 'xelatex',
                    args: ['-interaction=nonstopmode'],
                },
                bib: {
                    name: lw.constant.BIB_MAGIC_PROGRAM_NAME,
                    command: 'biber',
                    args: ['--debug'],
                },
                recipe: 'customRecipe',
            })
        })

        it('should ignore non-magic comments', async () => {
            readStub.resolves('This is a regular line\n% !TEX program = lualatex')

            const result = await recipe.findMagicComments('dummy.tex')

            assert.deepStrictEqual(result, {
                tex: undefined,
                bib: undefined,
                recipe: undefined,
            })
        })

        it('should stop reading after encountering non-comment lines', async () => {
            readStub.resolves(
                '% !TEX program = pdflatex\n' +
                    'This is not a comment and should stop further reading\n' +
                    '% !BIB program = bibtex'
            )

            const result = await recipe.findMagicComments('dummy.tex')

            assert.deepStrictEqual(result, {
                tex: { name: lw.constant.TEX_MAGIC_PROGRAM_NAME, command: 'pdflatex' },
                bib: undefined,
                recipe: undefined,
            })
        })
    })

    describe.only('lw.compile->recipe.createBuildMagic', () => {
        it('should set magicTex.args and magicTex.name if magicTex.args is undefined and magicBib is undefined', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('latex.magic.args', ['--shell-escape'])

            let tool: Tool = {
                command: 'pdflatex',
                args: undefined,
                name: 'TeXTool',
            }
            tool = recipe.createBuildMagic(rootFile, tool)[0]

            assert.strictEqual(tool.name, lw.constant.TEX_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
            assert.listStrictEqual(tool.args, ['--shell-escape'])
        })

        it('should set magicTex.args, magicTex.name, magicBib.args, and magicBib.name when magicBib is provided and both args are undefined', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('latex.magic.args', ['--shell-escape'])
            await set.config('latex.magic.bib.args', ['--min-crossrefs=1000'])

            let texTool: Tool = {
                command: 'pdflatex',
                args: undefined,
                name: 'TeXTool',
            }
            let bibTool: Tool = {
                command: 'bibtex',
                args: undefined,
                name: 'BibTool',
            }

            const result = recipe.createBuildMagic(rootFile, texTool, bibTool)
            texTool = result[0]
            bibTool = result[1]

            assert.strictEqual(texTool.name, lw.constant.TEX_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
            assert.listStrictEqual(texTool.args, ['--shell-escape'])
            assert.strictEqual(bibTool.name, lw.constant.BIB_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
            assert.listStrictEqual(bibTool.args, ['--min-crossrefs=1000'])
        })

        it('should not overwrite magicTex.args if it is already defined, even when magicBib is provided and magicBib.args is undefined', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('latex.magic.args', ['--shell-escape'])
            await set.config('latex.magic.bib.args', ['--min-crossrefs=1000'])

            let texTool: Tool = {
                command: 'pdflatex',
                args: ['-interaction=nonstopmode'],
                name: 'TeXTool',
            }
            let bibTool: Tool = {
                command: 'bibtex',
                args: undefined,
                name: 'BibTool',
            }

            const result = recipe.createBuildMagic(rootFile, texTool, bibTool)
            texTool = result[0]
            bibTool = result[1]

            assert.strictEqual(texTool.name, 'TeXTool')
            assert.listStrictEqual(texTool.args, ['-interaction=nonstopmode'])
            assert.strictEqual(bibTool.name, lw.constant.BIB_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX)
            assert.listStrictEqual(bibTool.args, ['--min-crossrefs=1000'])
        })

        it('should not overwrite magicTex.args and magicBib.args if both are already defined', async () => {
            const rootFile = set.root(fixture, 'main.tex')
            await set.config('latex.magic.args', ['--shell-escape'])
            await set.config('latex.magic.bib.args', ['--min-crossrefs=1000'])

            let texTool: Tool = {
                command: 'pdflatex',
                args: ['-interaction=nonstopmode'],
                name: 'TeXTool',
            }
            let bibTool: Tool = {
                command: 'bibtex',
                args: ['--min-crossrefs=2'],
                name: 'BibTool',
            }

            const result = recipe.createBuildMagic(rootFile, texTool, bibTool)
            texTool = result[0]
            bibTool = result[1]

            assert.strictEqual(texTool.name, 'TeXTool')
            assert.listStrictEqual(texTool.args, ['-interaction=nonstopmode'])
            assert.strictEqual(bibTool.name, 'BibTool')
            assert.listStrictEqual(bibTool.args, ['--min-crossrefs=2'])
        })
    })
})
