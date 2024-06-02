import * as path from 'path'
import * as assert from 'assert'
import * as sinon from 'sinon'
import { getPath, resetConfig, resetRoot, setConfig, stubObject } from './utils'
import { lw } from '../../src/lw'
import { _test } from '../../src/core/cache'

const testLabel = path.basename(__filename).split('.')[0]

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const texPath = getPath(testLabel, '01', 'main.tex')
    const texPathAnother = getPath(testLabel, '01', 'another.tex')
    const bibPath = getPath(testLabel, '01', 'main.bib')
    const pdfPath = getPath(testLabel, '01', 'main.pdf')
    const bblPath = getPath(testLabel, '01', 'main.bbl')

    before(() => {
        stubObject(lw, 'file', 'watcher', 'cache')
        resetRoot()
    })

    afterEach(async () => {
        resetRoot()
        await resetConfig()
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.cache.canCache', () => {
        it('should return true for supported TeX files', () => {
            assert.ok(_test.canCache(getPath(testLabel, '01', 'main.tex')))
            assert.ok(_test.canCache(getPath(testLabel, '01', 'main.rnw')))
            assert.ok(_test.canCache(getPath(testLabel, '01', 'main.jnw')))
            assert.ok(_test.canCache(getPath(testLabel, '01', 'main.pnw')))
        })

        it('should return false for unsupported files', () => {
            assert.ok(!_test.canCache(getPath(testLabel, '01', 'main.cls')))
            assert.ok(!_test.canCache(getPath(testLabel, '01', 'main.sty')))
            assert.ok(!_test.canCache(getPath(testLabel, '01', 'main.txt')))
        })

        it('should return false for expl3-code.tex', () => {
            assert.ok(!_test.canCache(getPath(testLabel, '01', 'expl3-code.tex')))
        })
    })

    describe('lw.cache.isExcluded', () => {
        it('should return true for excluded files', () => {
            assert.ok(_test.isExcluded(getPath(testLabel, '01', 'main.bbl')))
            assert.ok(_test.isExcluded('/dev/null'))
        })

        it('should return false for non-excluded files', () => {
            assert.ok(!_test.isExcluded(getPath(testLabel, '01', 'main.tex')))
        })
        it('should return true for excluded files with config set ', async () => {
            await setConfig('latex.watch.files.ignore', ['**/*.bbl'])
            assert.ok(_test.isExcluded(getPath(testLabel, '01', 'main.bbl')))
            assert.ok(!_test.isExcluded('/dev/null'))
        })
    })

    describe('lw.cache.add', () => {
        it('should add a TeX file to watcher if not excluded', () => {
            lw.cache.add(texPath)
            assert.ok(lw.watcher.src.has(texPath))
        })

        it('should ignore excluded files', () => {
            lw.cache.add(bblPath)
            assert.ok(!lw.watcher.src.has(bblPath))
        })

        it('should add a file to watcher but not cache it', () => {
            lw.cache.add(texPath)
            assert.strictEqual(lw.cache.promises.get(texPath), undefined)
        })
    })

    describe('lw.cache.get', () => {
        afterEach(() => {
            lw.cache.reset()
        })

        it('should get the cache for a TeX file if exist', async () => {
            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)
            assert.ok(lw.cache.get(texPath))
        })

        it('should get undefined if a TeX file is not cached', () => {
            assert.ok(!lw.cache.get(texPath))
        })
    })

    describe('lw.cache.paths', () => {
        afterEach(() => {
            lw.cache.reset()
        })

        it('should get the paths of cached files', async () => {
            lw.cache.add(texPath)
            lw.cache.add(texPathAnother)
            await lw.cache.refreshCache(texPath)
            await lw.cache.refreshCache(texPathAnother)
            const paths = lw.cache.paths()
            assert.strictEqual(paths.length, 2)
            assert.strictEqual(paths[0], texPath)
            assert.strictEqual(paths[1], texPathAnother)
        })

        it('should get an empty array if no files are cached', () => {
            assert.strictEqual(lw.cache.paths().length, 0)
        })
    })

    describe('lw.cache.wait', () => {
        afterEach(() => {
            lw.cache.reset()
        })

        it('should wait for finishing current caching', async () => {
            lw.cache.add(texPath)
            void lw.cache.refreshCache(texPath)
            await lw.cache.wait(texPath)
            assert.ok(lw.cache.get(texPath))
        })

        it('should initiate a caching if not already cached', async () => {
            await lw.cache.wait(texPath, 0.2)
            assert.ok(lw.cache.get(texPath))
        })

        it('should handle concurrent caching', async () => {
            const wait = lw.cache.wait(texPath)
            void lw.cache.refreshCache(texPath)
            await wait
            assert.ok(lw.cache.get(texPath))
        })
    })

    describe('lw.cache.wait', () => {
        it('should reset the src and bib watchers, but not pdf', () => {
            lw.watcher.src.add(texPath)
            lw.watcher.bib.add(bibPath)
            lw.watcher.pdf.add(pdfPath)
            lw.cache.reset()
            assert.ok(!lw.watcher.src.has(texPath))
            assert.ok(!lw.watcher.bib.has(bibPath))
            assert.ok(lw.watcher.pdf.has(pdfPath))
        })

        it('should reset the cache', async () => {
            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)
            lw.cache.reset()
            assert.strictEqual(lw.cache.paths().length, 0)
        })
    })
})
