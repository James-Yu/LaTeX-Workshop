import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../../src/lw'
import { assert, get, mock, set, type TextDocument } from '../utils'
import { type FileCache } from '../../../src/types'
import type * as Ast from '@unified-latex/unified-latex-types'
import { testing as outlineTesting } from '../../../src/outline/structure'
import { TeXElementType, type TeXElement } from '../../../src/types'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    let activeStub: sinon.SinonStub

    before(() => {
        mock.init(lw, 'parser', 'outline')
    })

    afterEach(() => {
        activeStub?.restore()
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.outline->build', () => {
        let getTextStub: sinon.SinonStub

        async function stubCache(content: string) {
            ;(lw.cache.wait as sinon.SinonStub).resolves()
            ;(lw.cache.get as sinon.SinonStub).returns({
                ast: await lw.parser.parse.tex(content),
                content
            } as any as FileCache)
        }

        beforeEach(() => {
            ;(lw.cache.wait as sinon.SinonStub).resetHistory()
            ;(lw.cache.get as sinon.SinonStub).resetHistory()
            outlineTesting.state.cachedDTX = undefined
            outlineTesting.state.cachedBib = undefined
            outlineTesting.state.cachedTeX = undefined
        })

        afterEach(() => {
            getTextStub?.restore()
        })

        it('should clear structure when no root is defined for latex document', async () => {
            activeStub = mock.activeTextEditor(get.path('main.tex'), '\\section{A}', { languageId: 'latex' })
            getTextStub = sinon.stub(vscode.window.activeTextEditor!.document, 'getText').returns('\\section{A}')

            const result = await lw.outline.refresh()

            assert.deepStrictEqual(result, [])
            assert.hasLog('Structure cleared on undefined root.')
        })

        it('should use doctex cache on refresh and recompute on reconstruct', async () => {
            activeStub = mock.activeTextEditor(get.path('doc.dtx'), '% \\section{Doc}', { languageId: 'doctex' })
            getTextStub = sinon.stub(vscode.window.activeTextEditor!.document, 'getText').returns('% \\section{Doc}')

            await lw.outline.refresh(false)
            await lw.outline.refresh(false)
            await lw.outline.reconstruct()

            assert.strictEqual(getTextStub.callCount, 2)
        })

        it('should invalidate doctex cache when active file changes', async () => {
            activeStub = mock.activeTextEditor(get.path('doc-a.dtx'), '% \\section{A}', { languageId: 'doctex' })
            getTextStub = sinon.stub(vscode.window.activeTextEditor!.document, 'getText').returns('% \\section{A}')

            await lw.outline.refresh(false)

            ;(vscode.window.activeTextEditor!.document as TextDocument).fileName = get.path('doc-b.dtx')
            ;(vscode.window.activeTextEditor!.document as TextDocument).content = '% \\section{B}'
            await lw.outline.refresh(false)

            assert.strictEqual(getTextStub.callCount, 2)
        })

        it('should use bibtex cache on refresh and recompute on reconstruct', async () => {
            activeStub = mock.activeTextEditor(get.path('refs.bib'), '@article{a, title={A}}', { languageId: 'bibtex' })
            getTextStub = sinon.stub(vscode.window.activeTextEditor!.document, 'getText').returns('@article{a, title={A}}')

            await lw.outline.refresh(false)
            await lw.outline.refresh(false)
            await lw.outline.reconstruct()

            assert.strictEqual(getTextStub.callCount, 4)
        })

        it('should invalidate bibtex cache when active file changes', async () => {
            activeStub = mock.activeTextEditor(get.path('refs-a.bib'), '@article{a, title={A}}', { languageId: 'bibtex' })
            getTextStub = sinon.stub(vscode.window.activeTextEditor!.document, 'getText').returns('@article{a, title={A}}')

            await lw.outline.refresh(false)

            ;(vscode.window.activeTextEditor!.document as TextDocument).fileName = get.path('refs-b.bib')
            ;(vscode.window.activeTextEditor!.document as TextDocument).content = '@article{b, title={B}}'
            await lw.outline.refresh(false)

            assert.strictEqual(getTextStub.callCount, 4)
        })

        it('should use latex cache on refresh and recompute on reconstruct', async () => {
            set.root('main.tex')
            activeStub = mock.activeTextEditor(get.path('main.tex'), '\\section{A}', { languageId: 'latex' })
            getTextStub = sinon.stub(vscode.window.activeTextEditor!.document, 'getText').returns('\\section{A}')
            await stubCache('\\section{A}')
            await lw.outline.refresh(false)
            await lw.outline.refresh(false)
            await lw.outline.reconstruct()

            assert.strictEqual((lw.cache.wait as sinon.SinonStub).callCount, 2)
        })
    })

    describe('lw.outline->refresh', () => {
        let treeChangedSpy: sinon.SinonSpy

        beforeEach(() => {
            ;(lw.event.fire as sinon.SinonSpy).resetHistory()
            treeChangedSpy = sinon.spy(vscode.EventEmitter.prototype, 'fire')
        })

        afterEach(() => {
            treeChangedSpy.restore()
        })

        it('should fire structure update event by default', async () => {
            activeStub = mock.activeTextEditor(get.path('main.tex'), '\\section{A}', { languageId: 'latex' })

            await lw.outline.refresh()

            assert.strictEqual((lw.event.fire as sinon.SinonSpy).callCount, 1)
            assert.ok((lw.event.fire as sinon.SinonSpy).calledWith(lw.event.StructureUpdated))
        })

        it('should fire structureChanged event by default', async () => {
            activeStub = mock.activeTextEditor(get.path('main.tex'), '\\section{A}', { languageId: 'latex' })

            await lw.outline.refresh()

            assert.ok(treeChangedSpy.calledWith(undefined))
        })

        it('should not fire structure update event when fireChangedEvent is false', async () => {
            activeStub = mock.activeTextEditor(get.path('main.tex'), '\\section{A}', { languageId: 'latex' })

            const result = await lw.outline.refresh(false)

            assert.deepStrictEqual(result, [])
            assert.strictEqual((lw.event.fire as sinon.SinonSpy).callCount, 0)
        })

        it('should not fire structureChanged event when fireChangedEvent is false', async () => {
            activeStub = mock.activeTextEditor(get.path('main.tex'), '\\section{A}', { languageId: 'latex' })

            await lw.outline.refresh(false)

            assert.ok(!treeChangedSpy.calledWith(undefined))
        })
    })

    describe('lw.outline->reconstruct', () => {
        let treeChangedSpy: sinon.SinonSpy

        beforeEach(() => {
            ;(lw.event.fire as sinon.SinonSpy).resetHistory()
            treeChangedSpy = sinon.spy(vscode.EventEmitter.prototype, 'fire')
        })

        afterEach(() => {
            treeChangedSpy.restore()
        })

        it('should always fire structure update event', async () => {
            activeStub = mock.activeTextEditor(get.path('main.tex'), '\\section{A}', { languageId: 'latex' })

            await lw.outline.reconstruct()

            assert.strictEqual((lw.event.fire as sinon.SinonSpy).callCount, 1)
            assert.ok((lw.event.fire as sinon.SinonSpy).calledWith(lw.event.StructureUpdated))
        })

        it('should always fire structureChanged event', async () => {
            activeStub = mock.activeTextEditor(get.path('main.tex'), '\\section{A}', { languageId: 'latex' })

            await lw.outline.reconstruct()

            assert.ok(treeChangedSpy.calledWith(undefined))
        })
    })

    describe('lw.outline->config change', () => {
        let parseResetStub: sinon.SinonStub
        let parseArgsStub: sinon.SinonStub
        let treeChangedSpy: sinon.SinonSpy

        beforeEach(() => {
            parseResetStub = sinon.stub(lw.parser.parse, 'reset').resolves()
            parseArgsStub = sinon.stub(lw.parser.parse, 'args').resolves()
            treeChangedSpy = sinon.spy(vscode.EventEmitter.prototype, 'fire')
            ;(lw.cache.paths as sinon.SinonStub).returns([])
            activeStub = mock.activeTextEditor(get.path('main.tex'), '', { languageId: 'latex' })
        })

        afterEach(() => {
            parseResetStub.restore()
            parseArgsStub.restore()
            treeChangedSpy.restore()
            ;(lw.cache.paths as sinon.SinonStub).reset()
            ;(lw.cache.get as sinon.SinonStub).reset()
        })

        it('should call parser.parse.reset on view.outline.sections change', async () => {
            await set.codeConfig('view.outline.sections', ['chapter', 'section'])

            assert.ok(parseResetStub.called)
        })

        it('should call parser.parse.reset on view.outline.commands change', async () => {
            await set.codeConfig('view.outline.commands', ['mycommand'])

            assert.ok(parseResetStub.called)
        })

        it('should call parser.parse.args for each cached file that has an AST', async () => {
            const fakeAst = { type: 'root', content: [] } as unknown as Ast.Root
            ;(lw.cache.paths as sinon.SinonStub).returns([get.path('main.tex')])
            ;(lw.cache.get as sinon.SinonStub).returns({ ast: fakeAst, content: '' } as unknown as FileCache)

            await set.codeConfig('view.outline.sections', ['chapter', 'section'])

            assert.ok(parseArgsStub.calledWith(fakeAst))
        })

        it('should not call parser.parse.args for cached files without an AST', async () => {
            ;(lw.cache.paths as sinon.SinonStub).returns([get.path('main.tex')])
            ;(lw.cache.get as sinon.SinonStub).returns({ content: '' } as unknown as FileCache)

            await set.codeConfig('view.outline.sections', ['chapter', 'section'])

            assert.ok(!parseArgsStub.called)
        })

        it('should trigger reconstruct and fire structureChanged on view.outline.sections change', async () => {
            await set.codeConfig('view.outline.sections', ['chapter', 'section'])

            assert.ok(treeChangedSpy.calledWith(undefined))
        })

        it('should trigger reconstruct and fire structureChanged on view.outline.commands change', async () => {
            await set.codeConfig('view.outline.commands', ['mycommand'])

            assert.ok(treeChangedSpy.calledWith(undefined))
        })
    })

    describe('lw.outline->traverseSectionTree', () => {
        it('should return the most precise child section on matching file and line', () => {
            const child: TeXElement = {
                type: TeXElementType.Section,
                name: 'subsection',
                label: 'Child',
                lineFr: 5,
                lineTo: 10,
                filePath: get.path('main.tex'),
                children: []
            }
            const root: TeXElement = {
                type: TeXElementType.Section,
                name: 'section',
                label: 'Root',
                lineFr: 0,
                lineTo: 20,
                filePath: get.path('main.tex'),
                children: [child]
            }
            child.parent = root

            const result = outlineTesting.traverseSectionTree([root], get.path('main.tex'), 7)

            assert.strictEqual(result, child)
        })

        it('should return containing node for included child file path', () => {
            const child: TeXElement = {
                type: TeXElementType.SubFile,
                name: 'input',
                label: 'sub',
                lineFr: 2,
                lineTo: 3,
                filePath: get.path('sub.tex'),
                children: []
            }
            const root: TeXElement = {
                type: TeXElementType.Section,
                name: 'section',
                label: 'Root',
                lineFr: 0,
                lineTo: 20,
                filePath: get.path('main.tex'),
                children: [child]
            }
            child.parent = root

            const result = outlineTesting.traverseSectionTree([root], get.path('sub.tex'), 50)

            assert.strictEqual(result, root)
        })

        it('should return undefined when no section matches', () => {
            const root: TeXElement = {
                type: TeXElementType.Section,
                name: 'section',
                label: 'Root',
                lineFr: 0,
                lineTo: 3,
                filePath: get.path('main.tex'),
                children: []
            }

            const result = outlineTesting.traverseSectionTree([root], get.path('main.tex'), 99)

            assert.strictEqual(result, undefined)
        })
    })

    describe('lw.outline->StructureProvider', () => {
        let provider: {
            getTreeItem: (element: TeXElement) => vscode.TreeItem,
            getChildren: (element?: TeXElement) => vscode.ProviderResult<TeXElement[]>,
            getParent: (element?: TeXElement) => TeXElement | undefined
        }

        beforeEach(() => {
            provider = outlineTesting.state.treeDataProvider as unknown as {
                getTreeItem: (element: TeXElement) => vscode.TreeItem,
                getChildren: (element?: TeXElement) => vscode.ProviderResult<TeXElement[]>,
                getParent: (element?: TeXElement) => TeXElement | undefined
            }
        })

        it('should build a tree item with command and tooltip', () => {
            const element: TeXElement = {
                type: TeXElementType.Section,
                name: 'section',
                label: 'Intro',
                lineFr: 3,
                lineTo: 10,
                filePath: get.path('main.tex'),
                children: []
            }

            const treeItem = provider.getTreeItem(element)

            assert.strictEqual(treeItem.label, 'Intro')
            assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None)
            assert.strictEqual(treeItem.command?.command, 'latex-workshop.goto-section')
            assert.deepStrictEqual(treeItem.command?.arguments, [get.path('main.tex'), 3])
            assert.strictEqual(treeItem.tooltip, `Line 4 at ${get.path('main.tex')}`)
        })

        it('should use expanded collapsible state when element has children', () => {
            const element: TeXElement = {
                type: TeXElementType.Section,
                name: 'section',
                label: 'Intro',
                lineFr: 0,
                lineTo: 20,
                filePath: get.path('main.tex'),
                children: [{
                    type: TeXElementType.Section,
                    name: 'subsection',
                    label: 'Child',
                    lineFr: 5,
                    lineTo: 10,
                    filePath: get.path('main.tex'),
                    children: []
                }]
            }

            const treeItem = provider.getTreeItem(element)

            assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.Expanded)
        })

        it('should return empty children when root is undefined', () => {
            const children = provider.getChildren()

            assert.deepStrictEqual(children, [])
        })

        it('should return direct children when an element is provided', () => {
            set.root('main.tex')
            const child: TeXElement = {
                type: TeXElementType.Section,
                name: 'subsection',
                label: 'Child',
                lineFr: 5,
                lineTo: 10,
                filePath: get.path('main.tex'),
                children: []
            }
            const element: TeXElement = {
                type: TeXElementType.Section,
                name: 'section',
                label: 'Root',
                lineFr: 0,
                lineTo: 20,
                filePath: get.path('main.tex'),
                children: [child]
            }

            const children = provider.getChildren(element)

            assert.deepStrictEqual(children, [child])
        })

        it('should return undefined parent when root is undefined', () => {
            const element: TeXElement = {
                type: TeXElementType.Section,
                name: 'section',
                label: 'Root',
                lineFr: 0,
                lineTo: 20,
                filePath: get.path('main.tex'),
                children: []
            }

            const parent = provider.getParent(element)

            assert.strictEqual(parent, undefined)
        })

        it('should return parent when root is defined', () => {
            set.root('main.tex')
            const parentNode: TeXElement = {
                type: TeXElementType.Section,
                name: 'section',
                label: 'Parent',
                lineFr: 0,
                lineTo: 20,
                filePath: get.path('main.tex'),
                children: []
            }
            const childNode: TeXElement = {
                type: TeXElementType.Section,
                name: 'subsection',
                label: 'Child',
                lineFr: 5,
                lineTo: 10,
                filePath: get.path('main.tex'),
                children: [],
                parent: parentNode
            }

            const parent = provider.getParent(childNode)

            assert.strictEqual(parent, parentNode)
        })
    })

    describe('lw.outline->reveal', () => {
        let revealStub: sinon.SinonStub
        let visibleStub: sinon.SinonStub
        let treeState: { structure: TeXElement[], view: { reveal: (...args: unknown[]) => unknown } }

        beforeEach(() => {
            treeState = outlineTesting.state as unknown as { structure: TeXElement[], view: { reveal: (...args: unknown[]) => unknown } }
            revealStub = sinon.stub(treeState.view, 'reveal').resolves()
            visibleStub = sinon.stub(treeState.view as unknown as { visible: boolean }, 'visible').value(true)
        })

        afterEach(() => {
            revealStub.restore()
            visibleStub.restore()
        })

        it('should return undefined when follow editor is disabled', () => {
            set.config('view.outline.follow.editor', false)
            treeState.structure = []
            const event = {
                selections: [new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0))],
                textEditor: { document: { fileName: get.path('main.tex') } }
            } as unknown as vscode.TextEditorSelectionChangeEvent

            const result = lw.outline.reveal(event)

            assert.strictEqual(result, undefined)
            assert.strictEqual(revealStub.callCount, 0)
        })

        it('should reveal the deepest matching section', async () => {
            set.config('view.outline.follow.editor', true)
            const child: TeXElement = {
                type: TeXElementType.Section,
                name: 'subsection',
                label: 'Child',
                lineFr: 5,
                lineTo: 10,
                filePath: get.path('main.tex'),
                children: []
            }
            const root: TeXElement = {
                type: TeXElementType.Section,
                name: 'section',
                label: 'Root',
                lineFr: 0,
                lineTo: 20,
                filePath: get.path('main.tex'),
                children: [child]
            }
            child.parent = root
            treeState.structure = [root]
            const event = {
                selections: [new vscode.Selection(new vscode.Position(7, 0), new vscode.Position(7, 0))],
                textEditor: { document: { fileName: get.path('main.tex') } }
            } as unknown as vscode.TextEditorSelectionChangeEvent

            await lw.outline.reveal(event)

            assert.ok(revealStub.calledWith(child, { select: true }))
        })

        it('should return undefined when no matching section exists', () => {
            set.config('view.outline.follow.editor', true)
            treeState.structure = []
            const event = {
                selections: [new vscode.Selection(new vscode.Position(1, 0), new vscode.Position(1, 0))],
                textEditor: { document: { fileName: get.path('main.tex') } }
            } as unknown as vscode.TextEditorSelectionChangeEvent

            const result = lw.outline.reveal(event)

            assert.strictEqual(result, undefined)
            assert.strictEqual(revealStub.callCount, 0)
        })
    })
})
