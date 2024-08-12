import * as path from 'path'
import * as sinon from 'sinon'
import { assert, mock } from './utils'
import { lw } from '../../src/lw'
import { queue } from '../../src/compile/queue'

describe(path.basename(__filename).split('.')[0] + ':', () => {
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
})
