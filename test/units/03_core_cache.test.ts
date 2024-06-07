import * as path from 'path'
import * as assert from 'assert'
import * as sinon from 'sinon'
import { getPath, hasLog, setConfig, sleep, stubObject, stubTextDocument } from './utils'
import { lw } from '../../src/lw'
import { _test } from '../../src/core/cache'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]
    const texPath = getPath(fixture, 'main.tex')
    const texPathAnother = getPath(fixture, 'another.tex')
    const bibPath = getPath(fixture, 'main.bib')
    const pdfPath = getPath(fixture, 'main.pdf')
    const bblPath = getPath(fixture, 'main.bbl')

    before(() => {
        stubObject(lw, 'file', 'watcher', 'cache')
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.cache.canCache', () => {
        it('should return true for supported TeX files', () => {
            assert.ok(_test.canCache(texPath))
            assert.ok(_test.canCache(getPath(fixture, 'main.rnw')))
            assert.ok(_test.canCache(getPath(fixture, 'main.jnw')))
            assert.ok(_test.canCache(getPath(fixture, 'main.pnw')))
        })

        it('should return false for unsupported files', () => {
            assert.ok(!_test.canCache(getPath(fixture, 'main.cls')))
            assert.ok(!_test.canCache(getPath(fixture, 'main.sty')))
            assert.ok(!_test.canCache(getPath(fixture, 'main.txt')))
        })

        it('should return false for expl3-code.tex', () => {
            assert.ok(!_test.canCache(getPath(fixture, 'expl3-code.tex')))
        })
    })

    describe('lw.cache.isExcluded', () => {
        it('should return true for excluded files', () => {
            assert.ok(_test.isExcluded(bblPath))
            assert.ok(_test.isExcluded('/dev/null'))
        })

        it('should return false for non-excluded files', () => {
            assert.ok(!_test.isExcluded(texPath))
        })
        it('should return true for excluded files with config set ', async () => {
            await setConfig('latex.watch.files.ignore', ['**/*.bbl'])
            assert.ok(_test.isExcluded(bblPath))
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

    describe('lw.cache.reset', () => {
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

    describe('lw.cache.refreshCache', () => {
        it('should properly exclude configged sources', async () => {
            await lw.cache.refreshCache(bblPath)
            assert.strictEqual(lw.cache.paths().length, 0)
        })

        it('should properly skip non-cacheable sources', async () => {
            await lw.cache.refreshCache(getPath(fixture, 'expl3-code.tex'))
            assert.strictEqual(lw.cache.paths().length, 0)
        })

        it('should cache provided TeX source', async () => {
            await lw.cache.refreshCache(texPath)
            assert.strictEqual(lw.cache.paths().length, 1)
        })

        it('should call `updateChildren` during caching', async () => {
            await lw.cache.refreshCache(texPath)
            hasLog('Updated inputs of ')
            assert.strictEqual(lw.cache.paths().length, 1)
        })

        it('should cache provided dirty TeX source', async () => {
            const stub = stubTextDocument(texPath, '', { isDirty: true })
            await lw.cache.refreshCache(texPath)
            stub.restore()
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '')
        })

        it('should manage caching promises properly', async () => {
            await lw.cache.refreshCache(texPath)
            assert.ok(!lw.cache.promises.get(texPath))
        })

        it('should refresh cache if content is changed', async () => {
            await lw.cache.refreshCache(texPath)
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '%')
            const stub = stubTextDocument(texPath, '', { isDirty: true })
            await lw.cache.refreshCache(texPath)
            stub.restore()
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '')
        })
    })

    describe('lw.cache.refreshCacheAggressive', () => {
        beforeEach(async () => {
            await setConfig('intellisense.update.aggressive.enabled', true)
            await setConfig('intellisense.update.delay', 100)
        })

        it('should not aggressively cache non-cached files', async () => {
            lw.cache.refreshCacheAggressive(texPath)
            await sleep(150)
            assert.strictEqual(lw.cache.paths().length, 0)
        })

        it('should aggressively cache cached files', async () => {
            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)

            let stub = stubTextDocument(texPath, '', { isDirty: true })
            lw.cache.refreshCacheAggressive(texPath)
            await sleep(50)
            stub.restore()
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '%')

            stub = stubTextDocument(texPath, '', { isDirty: true })
            await sleep(100)
            stub.restore()
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '')
        })

        it('should not aggressively cache cached files without `intellisense.update.aggressive.enabled`', async () => {
            await setConfig('intellisense.update.aggressive.enabled', false)
            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)
            const stub = stubTextDocument(texPath, '', { isDirty: true })
            lw.cache.refreshCacheAggressive(texPath)
            await sleep(150)
            stub.restore()
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '%')
        })

        it('should aggressively cache cached files once on quick changes', async () => {
            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)

            let stub = stubTextDocument(texPath, '', { isDirty: true })
            lw.cache.refreshCacheAggressive(texPath)
            await sleep(50)
            stub.restore()
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '%')

            stub = stubTextDocument(texPath, '%%', { isDirty: true })
            lw.cache.refreshCacheAggressive(texPath)
            await sleep(50)
            stub.restore()
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '%')

            stub = stubTextDocument(texPath, '%%', { isDirty: true })
            await sleep(100)
            stub.restore()
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '%%')
        })

        it('should aggressively cache cached files multiple times on slow changes', async () => {
            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)

            let stub = stubTextDocument(texPath, '', { isDirty: true })
            lw.cache.refreshCacheAggressive(texPath)
            await sleep(150)
            stub.restore()
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '')

            stub = stubTextDocument(texPath, '%%', { isDirty: true })
            lw.cache.refreshCacheAggressive(texPath)
            await sleep(150)
            stub.restore()
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '%%')
        })
    })
})
