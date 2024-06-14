import * as Mocha from 'mocha'
import * as path from 'path'
import * as sinon from 'sinon'
import { assert, get, has, mock, set, sleep } from './utils'
import { lw } from '../../src/lw'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]

    before(() => {
        mock.object(lw, 'file', 'watcher', 'cache')
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.cache.canCache', () => {
        it('should return true for supported TeX files', () => {
            const texPath = get.path(fixture, 'main.tex')

            assert.ok(lw.cache._test.canCache(texPath))
            assert.ok(lw.cache._test.canCache(get.path(fixture, 'main.rnw')))
            assert.ok(lw.cache._test.canCache(get.path(fixture, 'main.jnw')))
            assert.ok(lw.cache._test.canCache(get.path(fixture, 'main.pnw')))
        })

        it('should return false for unsupported files', () => {
            assert.ok(!lw.cache._test.canCache(get.path(fixture, 'main.cls')))
            assert.ok(!lw.cache._test.canCache(get.path(fixture, 'main.sty')))
            assert.ok(!lw.cache._test.canCache(get.path(fixture, 'main.txt')))
        })

        it('should return false for expl3-code.tex', () => {
            assert.ok(!lw.cache._test.canCache(get.path(fixture, 'expl3-code.tex')))
        })
    })

    describe('lw.cache.isExcluded', () => {
        const texPath = get.path(fixture, 'main.tex')
        const bblPath = get.path(fixture, 'main.bbl')

        it('should return true for excluded files', () => {
            assert.ok(lw.cache._test.isExcluded(bblPath))
            assert.ok(lw.cache._test.isExcluded('/dev/null'))
        })

        it('should return false for non-excluded files', () => {
            assert.ok(!lw.cache._test.isExcluded(texPath))
        })
        it('should return true for excluded files with config set ', async () => {
            await set.config('latex.watch.files.ignore', ['**/*.bbl'])
            assert.ok(lw.cache._test.isExcluded(bblPath))
            assert.ok(!lw.cache._test.isExcluded('/dev/null'))
        })
    })

    describe('lw.cache.add', () => {
        it('should add a TeX file to watcher if not excluded', () => {
            const texPath = get.path(fixture, 'main.tex')

            lw.cache.add(texPath)
            assert.ok(lw.watcher.src.has(texPath))
        })

        it('should ignore excluded files', () => {
            const bblPath = get.path(fixture, 'main.bbl')

            lw.cache.add(bblPath)
            assert.ok(!lw.watcher.src.has(bblPath))
        })

        it('should add a file to watcher but not cache it', () => {
            const texPath = get.path(fixture, 'main.tex')

            lw.cache.add(texPath)
            assert.strictEqual(lw.cache.promises.get(texPath), undefined)
        })
    })

    describe('lw.cache.get', () => {
        it('should get the cache for a TeX file if exist', async () => {
            const texPath = get.path(fixture, 'main.tex')

            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)
            assert.ok(lw.cache.get(texPath))
        })

        it('should get undefined if a TeX file is not cached', () => {
            const texPath = get.path(fixture, 'main.tex')

            assert.ok(!lw.cache.get(texPath))
        })
    })

    describe('lw.cache.paths', () => {
        it('should get the paths of cached files', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const texPathAnother = get.path(fixture, 'another.tex')

            lw.cache.add(texPath)
            lw.cache.add(texPathAnother)
            await lw.cache.refreshCache(texPath)
            await lw.cache.refreshCache(texPathAnother)
            const paths = lw.cache.paths()
            assert.listStrictEqual(paths, [ texPath, texPathAnother ])
        })

        it('should get an empty array if no files are cached', () => {
            assert.listStrictEqual(lw.cache.paths(), [ ])
        })
    })

    describe('lw.cache.wait', () => {
        it('should wait for finishing current caching', async () => {
            const texPath = get.path(fixture, 'main.tex')

            lw.cache.add(texPath)
            void lw.cache.refreshCache(texPath)
            await lw.cache.wait(texPath)
            assert.ok(lw.cache.get(texPath))
        })

        it('should initiate a caching if not already cached', async () => {
            const texPath = get.path(fixture, 'main.tex')

            await lw.cache.wait(texPath, 0.2)
            assert.ok(lw.cache.get(texPath))
        })

        it('should handle concurrent caching', async () => {
            const texPath = get.path(fixture, 'main.tex')

            const wait = lw.cache.wait(texPath)
            void lw.cache.refreshCache(texPath)
            await wait
            assert.ok(lw.cache.get(texPath))
        })
    })

    describe('lw.cache.reset', () => {
        it('should reset the src and bib watchers, but not pdf', () => {
            const texPath = get.path(fixture, 'main.tex')
            const bibPath = get.path(fixture, 'main.bib')
            const pdfPath = get.path(fixture, 'main.pdf')

            lw.watcher.src.add(texPath)
            lw.watcher.bib.add(bibPath)
            lw.watcher.pdf.add(pdfPath)
            lw.cache.reset()
            assert.ok(!lw.watcher.src.has(texPath))
            assert.ok(!lw.watcher.bib.has(bibPath))
            assert.ok(lw.watcher.pdf.has(pdfPath))
        })

        it('should reset the cache', async () => {
            const texPath = get.path(fixture, 'main.tex')

            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)
            lw.cache.reset()
            assert.listStrictEqual(lw.cache.paths(), [ ])
        })
    })

    describe('lw.cache.refreshCache', () => {
        it('should properly exclude configged sources', async () => {
            const bblPath = get.path(fixture, 'main.bbl')

            await lw.cache.refreshCache(bblPath)
            assert.listStrictEqual(lw.cache.paths(), [ ])
        })

        it('should properly skip non-cacheable sources', async () => {
            await lw.cache.refreshCache(get.path(fixture, 'expl3-code.tex'))
            assert.listStrictEqual(lw.cache.paths(), [ ])
        })

        it('should cache provided TeX source', async () => {
            const texPath = get.path(fixture, 'main.tex')

            await lw.cache.refreshCache(texPath)
            assert.listStrictEqual(lw.cache.paths(), [ texPath ])
        })

        it('should update children during caching', async () => {
            const texPath = get.path(fixture, 'main.tex')

            await lw.cache.refreshCache(texPath)
            assert.ok(has.log('Updated inputs of '))
        })

        it('should update AST during caching', async () => {
            const texPath = get.path(fixture, 'main.tex')

            await lw.cache.refreshCache(texPath)
            assert.ok(has.log('Parsed LaTeX AST in '))
        })

        it('should update document elements during caching', async () => {
            const texPath = get.path(fixture, 'main.tex')

            await lw.cache.refreshCache(texPath)
            assert.ok(has.log('Updated elements in '))
        })

        it('should cache provided dirty TeX source', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const stub = mock.textDocument(texPath, '', { isDirty: true })

            await lw.cache.refreshCache(texPath)
            stub.restore()
            assert.listStrictEqual(lw.cache.paths(), [ texPath ])
            assert.strictEqual(lw.cache.get(texPath)?.content, '')
        })

        it('should manage caching promises properly', async () => {
            const texPath = get.path(fixture, 'main.tex')

            await lw.cache.refreshCache(texPath)
            assert.ok(!lw.cache.promises.get(texPath))
        })

        it('should refresh cache if content is changed', async () => {
            const texPath = get.path(fixture, 'main.tex')

            await lw.cache.refreshCache(texPath)
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '%')
            const stub = mock.textDocument(texPath, '', { isDirty: true })
            await lw.cache.refreshCache(texPath)
            stub.restore()
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '')
        })
    })

    describe('lw.cache.refreshCacheAggressive', () => {
        beforeEach(async () => {
            await set.config('intellisense.update.aggressive.enabled', true)
            await set.config('intellisense.update.delay', 100)
        })

        it('should not aggressively cache non-cached files', async function (this: Mocha.Context) {
            this.slow(350)
            const texPath = get.path(fixture, 'main.tex')

            lw.cache.refreshCacheAggressive(texPath)
            await sleep(150)
            assert.listStrictEqual(lw.cache.paths(), [ ])
        })

        it('should aggressively cache cached files', async function (this: Mocha.Context) {
            this.slow(350)
            const texPath = get.path(fixture, 'main.tex')

            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)

            let stub = mock.textDocument(texPath, '', { isDirty: true })
            lw.cache.refreshCacheAggressive(texPath)
            await sleep(50)
            stub.restore()
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '%')

            stub = mock.textDocument(texPath, '', { isDirty: true })
            await sleep(100)
            stub.restore()
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '')
        })

        it('should reload .fls file when aggressively caching cached files', async function (this: Mocha.Context) {
            this.slow(350)
            const texPath = get.path(fixture, 'main.tex')

            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)

            const stub = mock.textDocument(texPath, '', { isDirty: true })
            lw.cache.refreshCacheAggressive(texPath)
            await sleep(150)
            stub.restore()
            assert.ok(has.log('Parsing .fls '))
        })

        it('should not aggressively cache cached files without `intellisense.update.aggressive.enabled`', async function (this: Mocha.Context) {
            this.slow(350)
            const texPath = get.path(fixture, 'main.tex')

            await set.config('intellisense.update.aggressive.enabled', false)
            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)
            const stub = mock.textDocument(texPath, '', { isDirty: true })
            lw.cache.refreshCacheAggressive(texPath)
            await sleep(150)
            stub.restore()
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '%')
        })

        it('should aggressively cache cached files once on quick changes', async function (this: Mocha.Context) {
            this.slow(450)
            const texPath = get.path(fixture, 'main.tex')

            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)

            let stub = mock.textDocument(texPath, '', { isDirty: true })
            lw.cache.refreshCacheAggressive(texPath)
            await sleep(50)
            stub.restore()
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '%')

            stub = mock.textDocument(texPath, '%%', { isDirty: true })
            lw.cache.refreshCacheAggressive(texPath)
            await sleep(50)
            stub.restore()
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '%')

            stub = mock.textDocument(texPath, '%%', { isDirty: true })
            await sleep(100)
            stub.restore()
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '%%')
        })

        it('should aggressively cache cached files multiple times on slow changes', async function (this: Mocha.Context) {
            this.slow(650)
            const texPath = get.path(fixture, 'main.tex')

            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)

            let stub = mock.textDocument(texPath, '', { isDirty: true })
            lw.cache.refreshCacheAggressive(texPath)
            await sleep(150)
            stub.restore()
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '')

            stub = mock.textDocument(texPath, '%%', { isDirty: true })
            lw.cache.refreshCacheAggressive(texPath)
            await sleep(150)
            stub.restore()
            assert.strictEqual(lw.cache.get(lw.cache.paths()[0])?.content, '%%')
        })
    })

    describe('lw.cache.updateAST', () => {
        it('should call lw.parser.parse.tex to parse AST', async () => {
            const texPath = get.path(fixture, 'main.tex')

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
            const texPath = get.path(fixture, 'main.tex')

            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)
            assert.listStrictEqual(lw.cache.get(texPath)?.children, [ ])
        })

        it('should not add a child if the files does not exist', async () => {
            const toParse = get.path(fixture, 'update_children', 'file_not_exist.tex')

            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            assert.listStrictEqual(lw.cache.get(toParse)?.children, [ ])
        })

        it('should not add a child if it is the root', async () => {
            const toParse = get.path(fixture, 'update_children', 'input_main.tex')

            set.root(fixture, 'main.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            assert.listStrictEqual(lw.cache.get(toParse)?.children, [ ])
        })

        it('should add a child and cache it if not cached', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const toParse = get.path(fixture, 'update_children', 'input_main.tex')

            set.root(fixture, 'another.tex')
            assert.strictEqual(lw.cache.get(texPath), undefined)
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            assert.listStrictEqual(lw.cache.get(toParse)?.children.map(child => child.filePath), [ texPath ])
            await lw.cache.wait(texPath, 60)
            assert.strictEqual(lw.cache.get(texPath)?.filePath, texPath)
        })

        it('should watch the child', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const toParse = get.path(fixture, 'update_children', 'input_main.tex')

            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            assert.ok(lw.watcher.src.has(texPath))
        })

        it('should add two children if there are two inputs', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const texPathAnother = get.path(fixture, 'another.tex')
            const toParse = get.path(fixture, 'update_children', 'two_inputs.tex')

            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            assert.listStrictEqual(lw.cache.get(toParse)?.children.map(child => child.filePath), [ texPath, texPathAnother ])
        })

        it('should add one child if two inputs are identical', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const toParse = get.path(fixture, 'update_children', 'two_same_inputs.tex')

            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            assert.listStrictEqual(lw.cache.get(toParse)?.children.map(child => child.filePath), [ texPath ])
        })
    })

    describe('lw.cache.updateChildrenXr', () => {
        it('should not add any children if there is nothing', async () => {
            const texPath = get.path(fixture, 'main.tex')

            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)
            const fileCache = lw.cache.get(texPath)
            assert.ok(fileCache)
            assert.listStrictEqual(Object.keys(fileCache.external), [ ])
        })

        it('should not add a child if the files does not exist', async () => {
            const toParse = get.path(fixture, 'update_children_xr', 'file_not_exist.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            const fileCache = lw.cache.get(toParse)
            assert.ok(fileCache)
            assert.listStrictEqual(Object.keys(fileCache.external), [ ])
        })

        it('should not add a child if it is the root', async () => {
            const toParse = get.path(fixture, 'update_children_xr', 'input_main.tex')
            set.root(fixture, 'main.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            const fileCache = lw.cache.get(toParse)
            assert.ok(fileCache)
            assert.listStrictEqual(Object.keys(fileCache.external), [ ])
        })

        it('should add a child to root instead of the current file', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const texPathAnother = get.path(fixture, 'another.tex')

            set.root(texPathAnother)
            lw.cache.add(texPathAnother)
            await lw.cache.refreshCache(texPathAnother)

            const toParse = get.path(fixture, 'update_children_xr', 'input_main.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)

            let fileCache = lw.cache.get(texPathAnother)
            assert.ok(fileCache)
            assert.listStrictEqual(Object.keys(fileCache.external), [ texPath ])

            fileCache = lw.cache.get(toParse)
            assert.ok(fileCache)
            assert.listStrictEqual(Object.keys(fileCache.external), [ ])
        })

        it('should add a child if it is next to the source', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const toParse = get.path(fixture, 'update_children_xr', 'input_main.tex')

            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            const fileCache = lw.cache.get(toParse)
            assert.ok(fileCache)
            assert.listStrictEqual(Object.keys(fileCache.external), [ texPath ])
        })

        it('should add a child if it is next to the root', async () => {
            const rootPath = get.path(fixture, 'update_children_xr', 'sub', 'main.tex')
            set.root(rootPath)
            lw.cache.add(rootPath)
            await lw.cache.refreshCache(rootPath)

            const toParse = get.path(fixture, 'update_children_xr', 'input_sub.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)

            const fileCache = lw.cache.get(rootPath)
            assert.ok(fileCache)
            assert.listStrictEqual(Object.keys(fileCache.external), [ get.path(fixture, 'update_children_xr', 'sub', 'sub.tex') ])
        })

        it('should add a child if it is defined in `latex.texDirs`', async () => {
            const texPath = get.path(fixture, 'main.tex')

            await set.config('latex.texDirs', [ get.path(fixture, 'update_children_xr', 'sub') ])

            set.root(texPath)
            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)

            const toParse = get.path(fixture, 'update_children_xr', 'input_sub.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)

            const fileCache = lw.cache.get(texPath)
            assert.ok(fileCache)
            assert.listStrictEqual(Object.keys(fileCache.external), [ get.path(fixture, 'update_children_xr', 'sub', 'sub.tex') ])
        })

        it('should add a child and cache it if not cached', async () => {
            const texPath = get.path(fixture, 'main.tex')

            assert.strictEqual(lw.cache.get(texPath), undefined)

            const toParse = get.path(fixture, 'update_children_xr', 'input_main.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            await lw.cache.wait(texPath, 60)
            assert.strictEqual(lw.cache.get(texPath)?.filePath, texPath)
        })

        it('should watch the child', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const toParse = get.path(fixture, 'update_children_xr', 'input_main.tex')

            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            assert.ok(lw.watcher.src.has(texPath))
        })

        it('should add a child with prefix', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const toParse = get.path(fixture, 'update_children_xr', 'input_main_prefix.tex')

            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            const fileCache = lw.cache.get(toParse)
            assert.ok(fileCache)
            assert.strictEqual(fileCache.external[texPath], 'prefix')
        })
    })

    describe('lw.cache.updateBibfiles', () => {
        it('should not add any bib files if there is nothing', async () => {
            const texPath = get.path(fixture, 'main.tex')

            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)
            const fileCache = lw.cache.get(texPath)
            assert.ok(fileCache)
            assert.strictEqual(fileCache.bibfiles.size, 0)
        })

        it('should not add a bib file if the file does not exist', async () => {
            const toParse = get.path(fixture, 'update_bibfiles', 'file_not_exist.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            const fileCache = lw.cache.get(toParse)
            assert.ok(fileCache)
            assert.listStrictEqual(Array.from(fileCache.bibfiles), [ ])
        })

        it('should add bib files with \\bibliography, \\addbibresource, \\putbib, and possible presense of \\subfix', async () => {
            const bibPath = get.path(fixture, 'main.bib')
            const toParse = get.path(fixture, 'update_bibfiles', 'main.tex')

            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            const fileCache = lw.cache.get(toParse)
            assert.ok(fileCache)
            assert.listStrictEqual(Array.from(fileCache.bibfiles), [
                bibPath,
                get.path(fixture, 'update_bibfiles', 'bib', '1.bib'),
                get.path(fixture, 'update_bibfiles', 'bib', '2.bib'),
                get.path(fixture, 'update_bibfiles', 'bib', '3.bib'),
                get.path(fixture, 'update_bibfiles', 'bib', '4.bib'),
                get.path(fixture, 'update_bibfiles', 'bib', '5.bib')
            ])
        })

        it('should add multiple bib files in one macro', async () => {
            const bibPath = get.path(fixture, 'main.bib')
            const toParse = get.path(fixture, 'update_bibfiles', 'same_macro.tex')

            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            const fileCache = lw.cache.get(toParse)
            assert.ok(fileCache)
            assert.listStrictEqual(Array.from(fileCache.bibfiles), [
                bibPath,
                get.path(fixture, 'update_bibfiles', 'bib', '1.bib')
            ])
        })

        it('should not add excluded bib files', async () => {
            const toParse = get.path(fixture, 'update_bibfiles', 'file_excluded.tex')
            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            const fileCache = lw.cache.get(toParse)
            assert.ok(fileCache)
            assert.listStrictEqual(Array.from(fileCache.bibfiles), [ ])
        })

        it('should watch bib files if added', async () => {
            const bibPath = get.path(fixture, 'main.bib')
            const toParse = get.path(fixture, 'update_bibfiles', 'same_macro.tex')

            lw.cache.add(toParse)
            await lw.cache.refreshCache(toParse)
            assert.ok(lw.watcher.bib.has(bibPath))
        })
    })

    describe('lw.cache.loadFlsFile and lw.cache.parseFlsContent', () => {
        it('should do nothing if no .fls is found', async () => {
            const texPathAnother = get.path(fixture, 'another.tex')

            await lw.cache.loadFlsFile(texPathAnother)
            assert.ok(!has.log('Parsing .fls '))
        })

        it('should not consider files that are both INPUT and OUTPUT', async () => {
            const toParse = get.path(fixture, 'load_fls_file', 'both_input_output.tex')
            await lw.cache.refreshCache(toParse)
            await lw.cache.loadFlsFile(toParse)
            assert.listStrictEqual(lw.cache.get(toParse)?.children, [ ])
        })

        it('should not consider files that are excluded', async () => {
            const toParse = get.path(fixture, 'load_fls_file', 'excluded_file.tex')
            await lw.cache.refreshCache(toParse)
            await lw.cache.loadFlsFile(toParse)
            assert.listStrictEqual(lw.cache.get(toParse)?.children, [ ])
        })

        it('should not consider files that do not exist', async () => {
            const toParse = get.path(fixture, 'load_fls_file', 'file_not_exist.tex')
            await lw.cache.refreshCache(toParse)
            await lw.cache.loadFlsFile(toParse)
            assert.listStrictEqual(lw.cache.get(toParse)?.children, [ ])
        })

        it('should not consider the file itself if listed in .fls', async () => {
            const toParse = get.path(fixture, 'load_fls_file', 'self_include.tex')
            await lw.cache.refreshCache(toParse)
            await lw.cache.loadFlsFile(toParse)
            assert.listStrictEqual(lw.cache.get(toParse)?.children, [ ])
        })

        it('should not consider files that already been cached', async () => {
            const texPath = get.path(fixture, 'main.tex')

            lw.cache.add(texPath)
            await lw.cache.refreshCache(texPath)
            const toParse = get.path(fixture, 'load_fls_file', 'include_main.tex')
            await lw.cache.refreshCache(toParse)
            await lw.cache.loadFlsFile(toParse)
            assert.listStrictEqual(lw.cache.get(toParse)?.children, [ ])
        })

        it('should add file as child if all checks passed', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const toParse = get.path(fixture, 'load_fls_file', 'include_main.tex')

            await lw.cache.loadFlsFile(toParse)
            assert.listStrictEqual(lw.cache.get(toParse)?.children.map(child => child.filePath), [ texPath ])
        })

        it('should add multiple files as children if all checks passed', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const texPathAnother = get.path(fixture, 'another.tex')
            const toParse = get.path(fixture, 'load_fls_file', 'include_many.tex')

            await lw.cache.loadFlsFile(toParse)
            assert.listStrictEqual(lw.cache.get(toParse)?.children.map(child => child.filePath), [ texPath, texPathAnother ])
        })

        it('should watch added .tex files', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const toParse = get.path(fixture, 'load_fls_file', 'include_main.tex')

            await lw.cache.loadFlsFile(toParse)
            assert.ok(lw.watcher.src.has(texPath))
        })

        it('should watch added non-.tex files', async () => {
            const pdfPath = get.path(fixture, 'main.pdf')
            const toParse = get.path(fixture, 'load_fls_file', 'non_tex_input.tex')

            await lw.cache.loadFlsFile(toParse)
            assert.ok(lw.watcher.src.has(pdfPath))
        })

        it('should watch added non-.tex files, except for aux or out files', async () => {
            const toParse = get.path(fixture, 'load_fls_file', 'aux_out_input.tex')
            await lw.cache.loadFlsFile(toParse)
            assert.ok(!lw.watcher.src.has(get.path(fixture, 'load_fls_file', 'main.aux')))
            assert.ok(!lw.watcher.src.has(get.path(fixture, 'load_fls_file', 'main.out')))
        })
    })

    describe('lw.cache.parseAuxFile', () => {
        it('should do nothing if no \\bibdata is found', async () => {
            const toParse = get.path(fixture, 'load_aux_file', 'nothing.tex')
            set.root(fixture, 'load_aux_file', 'nothing.tex')
            await lw.cache.refreshCache(toParse)
            await lw.cache.loadFlsFile(toParse)
            assert.listStrictEqual(Array.from(lw.cache.get(toParse)?.bibfiles ?? new Set([''])), [ ])
        })

        it('should add \\bibdata from .aux file', async () => {
            const toParse = get.path(fixture, 'load_aux_file', 'main.tex')
            set.root(fixture, 'load_aux_file', 'main.tex')
            await lw.cache.refreshCache(toParse)
            await lw.cache.loadFlsFile(toParse)
            assert.listStrictEqual(Array.from(lw.cache.get(toParse)?.bibfiles ?? new Set()), [ get.path(fixture, 'load_aux_file', 'main.bib') ])
        })

        it('should not add \\bibdata if the bib is excluded', async () => {
            await set.config('latex.watch.files.ignore', ['**/main.bib'])
            const toParse = get.path(fixture, 'load_aux_file', 'main.tex')
            set.root(fixture, 'load_aux_file', 'main.tex')
            await lw.cache.refreshCache(toParse)
            await lw.cache.loadFlsFile(toParse)
            assert.listStrictEqual(Array.from(lw.cache.get(toParse)?.bibfiles ?? new Set([''])), [ ])
        })

        it('should watch bib files if added', async () => {
            const toParse = get.path(fixture, 'load_aux_file', 'main.tex')
            set.root(fixture, 'load_aux_file', 'main.tex')
            await lw.cache.refreshCache(toParse)
            await lw.cache.loadFlsFile(toParse)
            assert.ok(lw.watcher.bib.has(get.path(fixture, 'load_aux_file', 'main.bib')))
        })
    })

    describe('lw.cache.getIncludedBib', () => {
        it('should return an empty list if no file path is given', () => {
            assert.listStrictEqual(lw.cache.getIncludedBib(), [ ])
        })

        it('should return an empty list if the given file is not cached', () => {
            const toParse = get.path(fixture, 'included_bib', 'main.tex')
            assert.listStrictEqual(lw.cache.getIncludedBib(toParse), [ ])
        })

        it('should return a list of included .bib files', async () => {
            const bibPath = get.path(fixture, 'main.bib')
            const toParse = get.path(fixture, 'included_bib', 'main.tex')

            await lw.cache.refreshCache(toParse)
            assert.listStrictEqual(lw.cache.getIncludedBib(toParse), [ bibPath ])
        })

        it('should return a list of included .bib files with \\input', async () => {
            const bibPath = get.path(fixture, 'main.bib')
            const toParse = get.path(fixture, 'included_bib', 'another.tex')

            await lw.cache.refreshCache(toParse)
            assert.listStrictEqual(lw.cache.getIncludedBib(toParse), [ bibPath ])
        })

        it('should return a list of included .bib files with circular inclusions', async () => {
            const bibPath = get.path(fixture, 'main.bib')
            const toParse = get.path(fixture, 'included_bib', 'circular_1.tex')

            await lw.cache.refreshCache(toParse)
            assert.listStrictEqual(lw.cache.getIncludedBib(toParse), [ bibPath ])
        })

        it('should return a list of de-duplicated .bib files', async () => {
            const bibPath = get.path(fixture, 'main.bib')
            const toParse = get.path(fixture, 'included_bib', 'duplicate_1.tex')

            await lw.cache.refreshCache(toParse)
            assert.listStrictEqual(lw.cache.getIncludedBib(toParse), [ bibPath ])
        })
    })

    describe('lw.cache.getIncludedTeX', () => {
        it('should return an empty list if no file path is given', () => {
            assert.listStrictEqual(lw.cache.getIncludedTeX(), [ ])
        })

        it('should return an empty list if the given file is not cached', () => {
            const toParse = get.path(fixture, 'included_tex', 'main.tex')
            assert.listStrictEqual(lw.cache.getIncludedTeX(toParse), [ ])
        })

        it('should return a list of included .tex files', async () => {
            const toParse = get.path(fixture, 'included_tex', 'main.tex')
            await lw.cache.refreshCache(toParse)
            assert.listStrictEqual(lw.cache.getIncludedTeX(toParse), [
                get.path(fixture, 'included_tex', 'main.tex'),
                get.path(fixture, 'included_tex', 'another.tex')
            ])
        })

        it('should return a list of included .tex files even non-cached with `cachedOnly` set to `false`', async () => {
            const toParse = get.path(fixture, 'included_tex', 'main.tex')
            await lw.cache.refreshCache(toParse)
            lw.cache._test.caches.delete(get.path(fixture, 'included_tex', 'another.tex'))
            assert.listStrictEqual(lw.cache.getIncludedTeX(toParse, false), [
                get.path(fixture, 'included_tex', 'main.tex'),
                get.path(fixture, 'included_tex', 'another.tex')
            ])
        })

        it('should return a list of included .bib files with circular inclusions', async () => {
            const toParse = get.path(fixture, 'included_tex', 'circular_1.tex')
            await lw.cache.refreshCache(toParse)
            assert.listStrictEqual(lw.cache.getIncludedTeX(toParse), [
                get.path(fixture, 'included_tex', 'circular_1.tex'),
                get.path(fixture, 'included_tex', 'circular_2.tex')
            ])
        })

        it('should return a list of de-duplicated .tex files', async () => {
            const toParse = get.path(fixture, 'included_tex', 'duplicate_1.tex')
            await lw.cache.refreshCache(toParse)
            await lw.cache.wait(get.path(fixture, 'included_tex', 'another.tex'))
            assert.listStrictEqual(lw.cache.getIncludedTeX(toParse), [
                get.path(fixture, 'included_tex', 'duplicate_1.tex'),
                get.path(fixture, 'included_tex', 'duplicate_2.tex'),
                get.path(fixture, 'included_tex', 'main.tex'),
                get.path(fixture, 'included_tex', 'another.tex')
            ])
        })
    })

    describe('lw.cache.getFlsChildren', () => {
        it('should return an empty list if no .fls is found', async () => {
            const texPathAnother = get.path(fixture, 'another.tex')

            assert.listStrictEqual(await lw.cache.getFlsChildren(texPathAnother), [ ])
        })

        it('should return a list of input files in the .fls file', async () => {
            const texPath = get.path(fixture, 'main.tex')
            const toParse = get.path(fixture, 'load_fls_file', 'include_main.tex')

            assert.listStrictEqual(await lw.cache.getFlsChildren(toParse), [ texPath ])
        })
    })
})
