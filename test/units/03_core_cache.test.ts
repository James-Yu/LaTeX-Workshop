import * as Mocha from 'mocha'
import * as path from 'path'
import * as assert from 'assert'
import * as sinon from 'sinon'
import { getPath, hasLog, setConfig, setRoot, sleep, stubObject, stubTextDocument } from './utils'
import { lw } from '../../src/lw'

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
            assert.ok(lw.cache._test.canCache(texPath))
            assert.ok(lw.cache._test.canCache(getPath(fixture, 'main.rnw')))
            assert.ok(lw.cache._test.canCache(getPath(fixture, 'main.jnw')))
            assert.ok(lw.cache._test.canCache(getPath(fixture, 'main.pnw')))
        })

        it('should return false for unsupported files', () => {
            assert.ok(!lw.cache._test.canCache(getPath(fixture, 'main.cls')))
            assert.ok(!lw.cache._test.canCache(getPath(fixture, 'main.sty')))
            assert.ok(!lw.cache._test.canCache(getPath(fixture, 'main.txt')))
        })

        it('should return false for expl3-code.tex', () => {
            assert.ok(!lw.cache._test.canCache(getPath(fixture, 'expl3-code.tex')))
        })
    })

    describe('lw.cache.isExcluded', () => {
        it('should return true for excluded files', () => {
            assert.ok(lw.cache._test.isExcluded(bblPath))
            assert.ok(lw.cache._test.isExcluded('/dev/null'))
        })

        it('should return false for non-excluded files', () => {
            assert.ok(!lw.cache._test.isExcluded(texPath))
        })
        it('should return true for excluded files with config set ', async () => {
            await setConfig('latex.watch.files.ignore', ['**/*.bbl'])
            assert.ok(lw.cache._test.isExcluded(bblPath))
            assert.ok(!lw.cache._test.isExcluded('/dev/null'))
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

        it('should update children during caching', async () => {
            await lw.cache.refreshCache(texPath)
            assert.ok(hasLog('Updated inputs of '))
            assert.strictEqual(lw.cache.paths().length, 1)
        })

        it('should update AST during caching', async () => {
            await lw.cache.refreshCache(texPath)
            assert.ok(hasLog('Parsed LaTeX AST in '))
            assert.strictEqual(lw.cache.paths().length, 1)
        })

        it('should update document elements during caching', async () => {
            await lw.cache.refreshCache(texPath)
            assert.ok(hasLog('Updated elements in '))
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

        it('should not aggressively cache non-cached files', async function (this: Mocha.Context) {
            this.slow(350)

            lw.cache.refreshCacheAggressive(texPath)
            await sleep(150)
            assert.strictEqual(lw.cache.paths().length, 0)
        })

        it('should aggressively cache cached files', async function (this: Mocha.Context) {
            this.slow(350)

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

        it('should reload .fls file when aggressively caching cached files', async function (this: Mocha.Context) {
            this.slow(350)

            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)

            const stub = stubTextDocument(texPath, '', { isDirty: true })
            lw.cache.refreshCacheAggressive(texPath)
            await sleep(150)
            stub.restore()
            assert.ok(hasLog('Parsing .fls '))
        })

        it('should not aggressively cache cached files without `intellisense.update.aggressive.enabled`', async function (this: Mocha.Context) {
            this.slow(350)

            await setConfig('intellisense.update.aggressive.enabled', false)
            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)
            const stub = stubTextDocument(texPath, '', { isDirty: true })
            lw.cache.refreshCacheAggressive(texPath)
            await sleep(150)
            stub.restore()
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '%')
        })

        it('should aggressively cache cached files once on quick changes', async function (this: Mocha.Context) {
            this.slow(450)

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

        it('should aggressively cache cached files multiple times on slow changes', async function (this: Mocha.Context) {
            this.slow(650)

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

    describe('lw.cache.updateAST', () => {
        it('should call lw.parser.parse.tex to parse AST', async () => {
            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)
            const texCache = lw.cache.get(texPath)
            assert.ok(texCache)
            ;(lw.parser.parse.tex as sinon.SinonStub).reset()
            await lw.cache._test.updateAST(texCache)
            assert.strictEqual((lw.parser.parse.tex as sinon.SinonStub).callCount, 1)
        })
    })

    describe('lw.cache.updateChildrenInput', () => {
        it('should not add any children if there is nothing', async () => {
            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)
            assert.strictEqual(lw.cache.get(texPath)?.children.length, 0)
        })

        it('should not add a child if the files does not exist', async () => {
            const toParse = getPath(fixture, 'update_children_file_not_exist.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            assert.strictEqual(lw.cache.get(toParse)?.children.length, 0)
        })

        it('should not add a child if it is the root', async () => {
            const toParse = getPath(fixture, 'update_children_input_main.tex')
            setRoot(fixture, 'main.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            assert.strictEqual(lw.cache.get(toParse)?.children.length, 0)
        })

        it('should add a child and cache it if not cached', async () => {
            const toParse = getPath(fixture, 'update_children_input_main.tex')
            setRoot(fixture, 'another.tex')
            assert.strictEqual(lw.cache.get(texPath), undefined)
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            assert.strictEqual(lw.cache.get(toParse)?.children.length, 1)
            await lw.cache.wait(texPath, 60)
            assert.strictEqual(lw.cache.get(texPath)?.filePath, texPath)
        })

        it('should watch the child', async () => {
            const toParse = getPath(fixture, 'update_children_input_main.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            assert.ok(lw.watcher.src.has(texPath))
        })

        it('should add two children if there are two inputs', async () => {
            const toParse = getPath(fixture, 'update_children_two_inputs.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            assert.strictEqual(lw.cache.get(toParse)?.children.length, 2)
        })

        it('should add one child if two inputs are identical', async () => {
            const toParse = getPath(fixture, 'update_children_two_same_inputs.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            assert.strictEqual(lw.cache.get(toParse)?.children.length, 1)
        })
    })

    describe('lw.cache.updateChildrenXr', () => {
        it('should not add any children if there is nothing', async () => {
            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)
            const fileCache = lw.cache.get(texPath)
            assert.ok(fileCache)
            assert.strictEqual(Object.keys(fileCache.external).length, 0)
        })

        it('should not add a child if the files does not exist', async () => {
            const toParse = getPath(fixture, 'update_childrenxr_file_not_exist.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            const fileCache = lw.cache.get(toParse)
            assert.ok(fileCache)
            assert.strictEqual(Object.keys(fileCache.external).length, 0)
        })

        it('should not add a child if it is the root', async () => {
            const toParse = getPath(fixture, 'update_childrenxr_input_main.tex')
            setRoot(fixture, 'main.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            const fileCache = lw.cache.get(toParse)
            assert.ok(fileCache)
            assert.strictEqual(Object.keys(fileCache.external).length, 0)
        })

        it('should add a child to root instead of the current file', async () => {
            setRoot(texPathAnother)
            lw.cache.add(texPathAnother)
            await lw.cache.refreshCache(texPathAnother)

            const toParse = getPath(fixture, 'update_childrenxr_input_main.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)

            let fileCache = lw.cache.get(texPathAnother)
            assert.ok(fileCache)
            assert.strictEqual(Object.keys(fileCache.external)[0], texPath)

            fileCache = lw.cache.get(toParse)
            assert.ok(fileCache)
            assert.strictEqual(Object.keys(fileCache.external).length, 0)
        })

        it('should add a child if it is next to the source', async () => {
            const toParse = getPath(fixture, 'update_childrenxr_input_main.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            const fileCache = lw.cache.get(toParse)
            assert.ok(fileCache)
            assert.strictEqual(Object.keys(fileCache.external)[0], texPath)
        })

        it('should add a child if it is next to the root', async () => {
            const rootPath = getPath(fixture, 'sub', 'main.tex')
            setRoot(rootPath)
            lw.cache.add(rootPath)
            await lw.cache.refreshCache(rootPath)

            const toParse = getPath(fixture, 'update_childrenxr_input_sub.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)

            const fileCache = lw.cache.get(rootPath)
            assert.ok(fileCache)
            assert.strictEqual(Object.keys(fileCache.external)[0], getPath(fixture, 'sub', 'sub.tex'))
        })

        it('should add a child if it is defined in `latex.texDirs`', async () => {
            await setConfig('latex.texDirs', [ getPath(fixture, 'sub') ])

            setRoot(texPath)
            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)

            const toParse = getPath(fixture, 'update_childrenxr_input_sub.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)

            const fileCache = lw.cache.get(texPath)
            assert.ok(fileCache)
            assert.strictEqual(Object.keys(fileCache.external)[0], getPath(fixture, 'sub', 'sub.tex'))
        })

        it('should add a child and cache it if not cached', async () => {
            assert.strictEqual(lw.cache.get(texPath), undefined)

            const toParse = getPath(fixture, 'update_childrenxr_input_main.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            await lw.cache.wait(texPath, 60)
            assert.strictEqual(lw.cache.get(texPath)?.filePath, texPath)
        })

        it('should watch the child', async () => {
            const toParse = getPath(fixture, 'update_childrenxr_input_main.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            assert.ok(lw.watcher.src.has(texPath))
        })

        it('should add a child with prefix', async () => {
            const toParse = getPath(fixture, 'update_childrenxr_input_main_prefix.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            const fileCache = lw.cache.get(toParse)
            assert.ok(fileCache)
            assert.strictEqual(fileCache.external[texPath], 'prefix')
        })
    })

    describe('lw.cache.updateBibfiles', () => {
        it('should not add any bib files if there is nothing', async () => {
            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)
            const fileCache = lw.cache.get(texPath)
            assert.ok(fileCache)
            assert.strictEqual(fileCache.bibfiles.size, 0)
        })

        it('should not add a bib file if the file does not exist', async () => {
            const toParse = getPath(fixture, 'update_bibfiles_file_not_exist.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            const fileCache = lw.cache.get(toParse)
            assert.ok(fileCache)
            assert.strictEqual(fileCache.bibfiles.size, 0)
        })

        it('should add bib files with \\bibliography, \\addbibresource, \\putbib, and possible presense of \\subfix', async () => {
            const toParse = getPath(fixture, 'update_bibfiles.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            const fileCache = lw.cache.get(toParse)
            assert.ok(fileCache)
            assert.strictEqual(fileCache.bibfiles.size, 6)
        })

        it('should add multiple bib files in one macro', async () => {
            const toParse = getPath(fixture, 'update_bibfiles_same_macro.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            const fileCache = lw.cache.get(toParse)
            assert.ok(fileCache)
            assert.strictEqual(fileCache.bibfiles.size, 2)
        })

        it('should not add excluded bib files', async () => {
            const toParse = getPath(fixture, 'update_bibfiles_file_excluded.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            const fileCache = lw.cache.get(toParse)
            assert.ok(fileCache)
            assert.strictEqual(fileCache.bibfiles.size, 0)
        })

        it('should watch bib files if added', async () => {
            const toParse = getPath(fixture, 'update_bibfiles_same_macro.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            assert.ok(lw.watcher.bib.has(bibPath))
        })
    })
})
