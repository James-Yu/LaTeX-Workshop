import * as path from 'path'
import * as sinon from 'sinon'
import type * as Ast from '@unified-latex/unified-latex-types'
import { lw } from '../../../src/lw'
import type { FileCache, TeXElement } from '../../../src/types'
import { TeXElementType } from '../../../src/types'
import { InputFileRegExp } from '../../../src/utils/inputfilepath'
import * as utils from '../../../src/utils/utils'
import { construct, outline } from '../../../src/outline/structure/latex'
import { assert, get, mock, set } from '../utils'

describe(path.basename(__filename).split('.')[0] + ':', () => {
	const cache = new Map<string, FileCache>()

	async function cacheAst(filePath: string, content: string) {
		const ast = await lw.parser.parse.tex(content)
		await lw.parser.parse.args(ast)
		cache.set(filePath, { content, ast } as any as FileCache)
	}

	async function firstNode(content: string): Promise<Ast.Node> {
		const ast = await lw.parser.parse.tex(content)
		return ast.content.find(node => !['string', 'parbreak', 'whitespace'].includes(node.type)) as Ast.Node
	}

	beforeEach(() => {
		mock.init(lw, 'parser', 'outline')
		cache.clear()
		;(lw.cache.wait as sinon.SinonStub).callsFake(async () => {})
		;(lw.cache.get as sinon.SinonStub).callsFake((filePath: string) => cache.get(filePath))
	})

	afterEach(() => {
		sinon.restore()
	})

	describe('refreshLaTeXModelConfig', () => {
		it('should build section hierarchy and configurable macro/env lists', () => {
			set.config('view.outline.sections', ['chapter|part', 'section'])
			set.config('view.outline.commands', ['todo', 'mycmd'])
			set.config('view.outline.floats.enabled', false)
			set.config('view.outline.floats.caption.enabled', false)
			set.config('latex.texDirs', ['sections'])

			const config = outline.refreshLaTeXModelConfig(false)

			assert.deepStrictEqual(config.macros.cmds, ['todo', 'mycmd'])
			assert.deepStrictEqual(config.macros.envs, ['frame'])
			assert.deepStrictEqual(config.macros.secs, ['chapter', 'part', 'section'])
			assert.strictEqual(config.secIndex.chapter, 0)
			assert.strictEqual(config.secIndex.part, 0)
			assert.strictEqual(config.secIndex.section, 1)
			assert.strictEqual(config.subFile, false)
			assert.strictEqual(config.caption, false)
			assert.deepStrictEqual(config.texDirs, ['sections'])
		})
	})

	describe('parseNode', () => {
		it('should parse section commands with optional argument caption fallback', async () => {
			const node = await firstNode('\\section[Short]{Long}')
			const root = { children: [] as TeXElement[] }
			const config = outline.refreshLaTeXModelConfig()

			await outline.parseNode(node, [], root, get.path('main.tex'), config, {}, false)

			assert.strictEqual(root.children.length, 1)
			assert.strictEqual(root.children[0].type, TeXElementType.Section)
			assert.strictEqual(root.children[0].label, 'Short')
		})

		it('should parse configured command macros with argument text', async () => {
            set.config('view.outline.commands', ['todo'])
			const node = await firstNode('\\todo{fix me}')
			const root = { children: [] as TeXElement[] }
			const config = outline.refreshLaTeXModelConfig()

			await outline.parseNode(node, [], root, get.path('main.tex'), config, {}, false)

			assert.strictEqual(root.children.length, 1)
			assert.strictEqual(root.children[0].type, TeXElementType.Macro)
			assert.strictEqual(root.children[0].label, '#todo')
		})

		it('should parse figure* as figure and include caption text', async () => {
			const node = await firstNode('\\begin{figure*}\\caption{Plot}\\end{figure*}')
			const root = { children: [] as TeXElement[] }
			const config = outline.refreshLaTeXModelConfig()

			await outline.parseNode(node, [], root, get.path('main.tex'), config, {}, false)

			assert.strictEqual(root.children.length, 1)
			assert.strictEqual(root.children[0].type, TeXElementType.Environment)
			assert.strictEqual(root.children[0].name, 'figure')
			assert.strictEqual(root.children[0].label, 'Figure: Plot')
		})

		it('should parse frame environment caption from frametitle macro', async () => {
			const node = await firstNode('\\begin{frame}\\frametitle{Talk}Body\\end{frame}')
			const root = { children: [] as TeXElement[] }
			const config = outline.refreshLaTeXModelConfig()

			await outline.parseNode(node, [], root, get.path('main.tex'), config, {}, false)

			assert.strictEqual(root.children.length, 1)
			assert.strictEqual(root.children[0].name, 'frame')
			assert.strictEqual(root.children[0].label, 'Frame: Talk')
		})

		it('should return appendix state after encountering appendix macro', async () => {
			const node = await firstNode('\\appendix')
			const root = { children: [] as TeXElement[] }
			const config = outline.refreshLaTeXModelConfig()

			const inAppendix = await outline.parseNode(node, [], root, get.path('main.tex'), config, {}, false)

			assert.strictEqual(inAppendix, true)
			assert.strictEqual(root.children.length, 0)
		})

		it('should resolve and parse input subfiles when enabled', async () => {
			const node = await firstNode('\\input{sub}')
			const root = { children: [] as TeXElement[] }
			const config = outline.refreshLaTeXModelConfig(true)
			const main = get.path('main.tex')
			const sub = get.path('sub.tex')
			const structs: { [filePath: string]: TeXElement[] } = {}
			const resolveFileStub = sinon.stub(utils, 'resolveFile').resolves(sub)
			await cacheAst(main, '\\input{sub}')
			await cacheAst(sub, '\\section{In sub}')

			await outline.parseNode(node, [], root, main, config, structs, false)
            resolveFileStub.restore()

			assert.strictEqual(root.children.length, 1)
			assert.strictEqual(root.children[0].type, TeXElementType.SubFile)
			assert.strictEqual(root.children[0].label, sub)
			assert.ok(structs[sub] !== undefined)
		})
	})

	describe('nestNonSection', () => {
		it('should attach non-section items to the latest section', () => {
			const sec: TeXElement = {
				type: TeXElementType.Section,
				name: 'section',
				label: 'A',
				lineFr: 0,
				lineTo: 10,
				filePath: get.path('main.tex'),
				children: []
			}
			const macro: TeXElement = {
				type: TeXElementType.Macro,
				name: 'todo',
				label: '#todo',
				lineFr: 1,
				lineTo: 1,
				filePath: get.path('main.tex'),
				children: []
			}

			const nested = outline.nestNonSection([sec, macro])

			assert.strictEqual(nested.length, 1)
			assert.strictEqual(nested[0], sec)
			assert.strictEqual(sec.children.length, 1)
			assert.strictEqual(sec.children[0], macro)
		})
	})

	describe('nestSection', () => {
		it('should nest deeper sections and reset when moving back up', () => {
			const config = outline.refreshLaTeXModelConfig()
			const top = (label: string, name: string): TeXElement => ({
				type: TeXElementType.Section,
				name,
				label,
				lineFr: 0,
				lineTo: 0,
				filePath: get.path('main.tex'),
				children: []
			})
			const s1 = top('S1', 'section')
			const ss1 = top('SS1', 'subsection')
			const s2 = top('S2', 'section')

			const nested = outline.nestSection([s1, ss1, s2], config)

			assert.deepStrictEqual(nested, [s1, s2])
			assert.deepStrictEqual(s1.children, [ss1])
		})
	})

	describe('addFloatNumber', () => {
		it('should count environments independently and recursively', () => {
			const struct: TeXElement[] = [{
				type: TeXElementType.Environment,
				name: 'figure',
				label: 'Figure: A',
				lineFr: 0,
				lineTo: 0,
				filePath: get.path('main.tex'),
				children: [{
					type: TeXElementType.Environment,
					name: 'table',
					label: 'Table: T',
					lineFr: 1,
					lineTo: 1,
					filePath: get.path('main.tex'),
					children: []
				}]
			}, {
				type: TeXElementType.Environment,
				name: 'figure',
				label: 'Figure: B',
				lineFr: 2,
				lineTo: 2,
				filePath: get.path('main.tex'),
				children: []
			}]

			const result = outline.addFloatNumber(struct)

			assert.strictEqual(result[0].label, 'Figure 1: A')
			assert.strictEqual(result[0].children[0].label, 'Table 1: T')
			assert.strictEqual(result[1].label, 'Figure 2: B')
		})
	})

	describe('addSectionNumber', () => {
		it('should number sections with stars for section-ast and appendix letters', () => {
			const config = outline.refreshLaTeXModelConfig()
			const structure: TeXElement[] = [{
				type: TeXElementType.Section,
				name: 'section',
				label: 'One',
				lineFr: 0,
				lineTo: 0,
				filePath: get.path('main.tex'),
				children: [{
					type: TeXElementType.SectionAst,
					name: 'subsection',
					label: 'Star',
					lineFr: 1,
					lineTo: 1,
					filePath: get.path('main.tex'),
					children: []
				}]
			}, {
				type: TeXElementType.Section,
				name: 'section',
				label: 'App',
				lineFr: 2,
				lineTo: 2,
				filePath: get.path('main.tex'),
				children: [],
				appendix: true
			}]

			outline.addSectionNumber(structure, config)

			assert.strictEqual(structure[0].label, '1 One')
			assert.strictEqual(structure[0].children[0].label, '* Star')
			assert.strictEqual(structure[1].label, 'A App')
		})
	})

	describe('construct', () => {
		it('should return empty list when no root file is defined', async () => {
			const result = await construct()

			assert.deepStrictEqual(result, [])
		})

		it('should log and return empty when cached AST/content is missing', async () => {
			const main = set.root('main.tex')
			cache.set(main, { content: '' } as any as FileCache)

			const result = await construct(main)

			assert.deepStrictEqual(result, [])
			assert.hasLog(new RegExp('Error loading content during structuring:'))
		})

		it('should compose complete structure with line ranges, section numbers and float numbers', async () => {
			const main = set.root('main.tex')
			await cacheAst(main, [
				'\\section{Intro}',
				'\\begin{figure}',
				'\\caption{Plot}',
				'\\end{figure}',
				'\\subsection{Deep}',
				'\\section{Next}'
			].join('\n'))

			const result = await construct(main, true)

			assert.strictEqual(result.length, 2)
			assert.strictEqual(result[0].label, '1 Intro')
			assert.strictEqual(result[0].lineTo, 4)
			assert.strictEqual(result[0].children[0].type, TeXElementType.Environment)
			assert.strictEqual(result[0].children[0].label, 'Figure 1: Plot')
			assert.strictEqual(result[0].children[1].label, '1.1 Deep')
			assert.strictEqual(result[1].label, '2 Next')
		})

		it('should omit section numbering when view.outline.numbers.enabled is false', async () => {
			set.config('view.outline.numbers.enabled', false)
			const main = set.root('main.tex')
			await cacheAst(main, [
				'\\documentclass{article}',
				'\\begin{document}',
				'\\section{Section 1}',
				'\\section{Section 2}',
				'\\end{document}'
			].join('\n'))

			const result = await construct(main, true)

			assert.strictEqual(result[0].label, 'Section 1')
			assert.strictEqual(result[1].label, 'Section 2')
		})

		it('should build nested sections from construct output', async () => {
			const main = set.root('main.tex')
			await cacheAst(main, [
				'\\documentclass{article}',
				'\\begin{document}',
				'\\section{Section 1}',
				'\\subsection{Section 1.1}',
				'\\subsubsection{Section 1.1.1}',
				'\\end{document}'
			].join('\n'))

			const result = await construct(main, true)

			assert.strictEqual(result.length, 1)
			assert.strictEqual(result[0].children[0].label, '1.1 Section 1.1')
			assert.strictEqual(result[0].children[0].children[0].label, '1.1.1 Section 1.1.1')
		})

		it('should preserve numbering gaps for skipped section levels', async () => {
			const main = set.root('main.tex')
			await cacheAst(main, [
				'\\documentclass{article}',
				'\\begin{document}',
				'\\section{Section 1}',
				'\\subsubsection{Section 1.0.1}',
				'\\end{document}'
			].join('\n'))

			const result = await construct(main, true)

			assert.strictEqual(result[0].children[0].label, '1.0.1 Section 1.0.1')
		})

		it('should keep sections appearing before the first root-level section', async () => {
			const main = set.root('main.tex')
			await cacheAst(main, [
				'\\documentclass{article}',
				'\\begin{document}',
				'\\subsubsection{Section 0.0.1}',
				'\\subsection{Section 0.1}',
				'\\section{Section 1}',
				'\\end{document}'
			].join('\n'))

			const result = await construct(main, true)

			assert.strictEqual(result.length, 3)
		})

		it('should handle starred sections in construct output', async () => {
			const main = set.root('main.tex')
			await cacheAst(main, [
				'\\documentclass{article}',
				'\\begin{document}',
				'\\section{Section 1}',
				'\\section*{Section *}',
				'\\subsection{Section 1.1}',
				'\\subsection*{Section *}',
				'\\end{document}'
			].join('\n'))

			const result = await construct(main, true)

			assert.strictEqual(result[0].label, '1 Section 1')
			assert.strictEqual(result[1].label, '* Section *')
			assert.strictEqual(result[1].children[0].label, '1.1 Section 1.1')
			assert.strictEqual(result[1].children[1].label, '* Section *')
		})

		it('should keep atypical section titles readable', async () => {
			const main = set.root('main.tex')
			await cacheAst(main, [
				'\\documentclass{article}',
				'\\begin{document}',
				'\\section{Title with',
				'line break}',
				'\\section{Title with \\texorpdfstring{wrong}{pdf} switch}',
				'\\section{Title with \\textit{macros}}',
				'\\section[Short]{Title with a short one}',
				'\\end{document}'
			].join('\n'))

			const result = await construct(main, true)

			assert.strictEqual(result[0].label, '1 Title with line break')
			assert.strictEqual(result[1].label, '2 Title with pdf switch')
			assert.strictEqual(result[2].label, '3 Title with \\textit{macros}')
			assert.strictEqual(result[3].label, '4 Short')
		})

		it('should respect custom sections from view.outline.sections', async () => {
			await set.codeConfig('view.outline.sections', ['customsection', 'subsubsection'])
			const main = set.root('main.tex')
			await cacheAst(main, [
				'\\documentclass{article}',
				'\\begin{document}',
				'\\customsection{Section 1}',
				'\\subsection{Section}',
				'\\subsubsection{Section 1.1}',
				'\\end{document}'
			].join('\n'))

			const result = await construct(main, true)

			assert.strictEqual(result[0].label, '1 Section 1')
			assert.strictEqual(result[0].children[0].label, '1.1 Section 1.1')
		})

		it('should respect custom section hierarchy from view.outline.sections', async () => {
			set.config('view.outline.sections', ['section', 'subsection|subsubsection'])
			const main = set.root('main.tex')
			await cacheAst(main, [
				'\\documentclass{article}',
				'\\begin{document}',
				'\\section{Section 1}',
				'\\subsection{Section 1.1}',
				'\\subsubsection{Section 1.1.1}',
				'\\end{document}'
			].join('\n'))

			const result = await construct(main, true)

			assert.strictEqual(result[0].label, '1 Section 1')
			assert.strictEqual(result[0].children[0].label, '1.1 Section 1.1')
			assert.strictEqual(result[0].children[1].label, '1.2 Section 1.1.1')
		})

		it('should include configured label commands in the structure', async () => {
			set.config('view.outline.commands', ['label'])
			const main = set.root('main.tex')
			await cacheAst(main, [
				'\\documentclass{article}',
				'\\begin{document}',
				'\\section{Section 1}',
				'\\label{sec-1}',
				'\\subsection{Section 1.1}\\label{sec-11}',
				'\\end{document}'
			].join('\n'))

			const result = await construct(main, true)

			assert.strictEqual(result[0].children[0].label, '#label: sec-1')
			assert.strictEqual(result[0].children[1].children[0].label, '#label: sec-11')
		})

		it('should include custom commands from view.outline.commands', async () => {
			await set.codeConfig('view.outline.commands', ['note'])
			const main = set.root('main.tex')
			await cacheAst(main, [
				'\\documentclass{article}',
				'\\begin{document}',
				'\\section{Section 1}',
				'\\label{no-show}',
				'\\note{A note}',
				'\\end{document}'
			].join('\n'))

			const result = await construct(main, true)

			assert.strictEqual(result[0].children[0].label, '#note: A note')
		})

		it('should build frame environments and respect float numbering toggle', async () => {
			const main = set.root('main.tex')
			await cacheAst(main, [
				'\\documentclass{article}',
				'\\begin{document}',
				'\\begin{frame}',
				'\\end{frame}',
				'\\end{document}'
			].join('\n'))

			const numbered = await construct(main, true)
			set.config('view.outline.floats.number.enabled', false)
			const unnumbered = await construct(main, true)

			assert.strictEqual(numbered[0].label, 'Frame 1')
			assert.strictEqual(unnumbered[0].label, 'Frame')
		})

		it('should build frame titles and respect caption toggle', async () => {
			const main = set.root('main.tex')
			await cacheAst(main, [
				'\\documentclass{article}',
				'\\begin{document}',
				'\\begin{frame}{Frame 1}',
				'\\end{frame}',
				'\\begin{frame}{Frame 2}',
				'\\frametitle{Trap title}',
				'\\end{frame}',
				'\\begin{frame}',
				'\\frametitle{Frame 3}',
				'\\end{frame}',
				'\\begin{frame}{}',
				'\\frametitle{Frame 4}',
				'\\end{frame}',
				'\\begin{frame}',
				'\\end{frame}',
				'\\end{document}'
			].join('\n'))

			const captioned = await construct(main, true)
			set.config('view.outline.floats.caption.enabled', false)
			const plain = await construct(main, true)

			assert.strictEqual(captioned[0].label, 'Frame 1: Frame 1')
			assert.strictEqual(captioned[1].label, 'Frame 2: Frame 2')
			assert.strictEqual(captioned[2].label, 'Frame 3: Frame 3')
			assert.strictEqual(captioned[3].label, 'Frame 4: Frame 4')
			assert.strictEqual(captioned[4].label, 'Frame 5')
			assert.strictEqual(plain[0].label, 'Frame 1')
		})

		it('should build floats and nested floats and respect float toggles', async () => {
			const main = set.root('main.tex')
			await cacheAst(main, [
				'\\documentclass{article}',
				'\\begin{document}',
				'\\begin{table}',
				'\\caption{Table 1}',
				'\\end{table}',
				'\\begin{figure}',
				'\\end{figure}',
				'\\begin{figure*}',
				'\\end{figure*}',
				'\\begin{frame}',
				'\\end{frame}',
				'\\end{document}'
			].join('\n'))

			const result = await construct(main, true)

			set.config('view.outline.floats.enabled', false)
			const disabled = await construct(main, true)

			set.config('view.outline.floats.enabled', true)
			set.config('view.outline.floats.caption.enabled', false)
			const noCaption = await construct(main, true)

			assert.strictEqual(result[0].label, 'Table 1: Table 1')
			assert.strictEqual(result[1].label, 'Figure 1')
			assert.strictEqual(result[2].label, 'Figure 2')
			assert.strictEqual(disabled[0].label, 'Frame 1')
			assert.strictEqual(noCaption[0].label, 'Table 1')
		})

		it('should not number floats and sections when subfile expansion is disabled', async () => {
			set.config('view.outline.floats.number.enabled', true)
			set.config('view.outline.numbers.enabled', true)
			set.config('view.outline.floats.caption.enabled', true)
			const nested = set.root('nested.tex')
			await cacheAst(nested, [
				'\\documentclass{article}',
				'\\begin{document}',
				'\\section{Top}',
				'\\subsection{Inner}',
				'\\begin{table}',
				'\\caption{Table 1}',
				'\\begin{figure}',
				'\\end{figure}',
				'\\end{table}',
				'\\end{document}'
			].join('\n'))

			const result = await construct(nested, false)

			assert.strictEqual(result[0].label, 'Top')
			assert.strictEqual(result[0].children[0].label, 'Inner')
			assert.strictEqual(result[0].children[0].children[0].label, 'Table: Table 1')
			assert.strictEqual(result[0].children[0].children[0].children[0].label, 'Figure')
		})

		it('should inline parsed subfile content and avoid re-parsing duplicates', async () => {
			const main = set.root('main.tex')
			const sub = get.path('sections/sub.tex')
			const resolveFileStub = sinon.stub(utils, 'resolveFile').callsFake((_dirs: string[], file: string) => {
				return Promise.resolve(file === 'sub' ? sub : undefined)
			})
			await cacheAst(main, '\\input{sub}\n\\input{sub}')
			await cacheAst(sub, '\\section{From sub}')

			const result = await construct(main, true)
			resolveFileStub.restore()

			assert.strictEqual((lw.cache.wait as sinon.SinonStub).withArgs(sub).callCount, 1)
			assert.strictEqual(result.length, 2)
			assert.strictEqual(result[0].label, '1 From sub')
		})

		it('should inline nested input, import and subimport subfiles', async () => {
			const main = set.root('main.tex')
			const s1 = get.path('sub/s1.tex')
			const s2 = get.path('sub/s2.tex')
			const s3 = get.path('sub/s3.tex')
			const resolveFileStub = sinon.stub(utils, 'resolveFile').callsFake((_dirs: string[], file: string) => {
				switch (file) {
					case 'sub/s1':
					case 'sub\\s1': // Windows path
						return Promise.resolve(s1)
					case 's2.tex':
						return Promise.resolve(s2)
					case 'sub/s3.tex':
					case 'sub\\s3.tex': // Windows path
						return Promise.resolve(s3)
					default:
						return Promise.resolve(undefined)
				}
			})
			await cacheAst(main, [
				'\\documentclass{article}',
				'\\begin{document}',
				'\\input{sub/s1}',
				'\\import{sub/}{s2.tex}',
				'\\subimport{sub/}{s3.tex}',
				'\\subsubsection{Section 3.0.1}',
				'\\end{document}'
			].join('\n'))
			await cacheAst(s1, '\\section{Section 1}\n\\subsection{Section 1.1}')
			await cacheAst(s2, '\\subsubsection{Section 1.1.1}\n\\section{Section 2}')
			await cacheAst(s3, '\\section{Section 3}')

			const result = await construct(main, true)
			resolveFileStub.restore()

			assert.strictEqual(result[0].label, '1 Section 1')
			assert.strictEqual(result[0].children[0].label, '1.1 Section 1.1')
			assert.strictEqual(result[0].children[0].children[0].label, '1.1.1 Section 1.1.1')
			assert.strictEqual(result[1].label, '2 Section 2')
			assert.strictEqual(result[2].label, '3 Section 3')
			assert.strictEqual(result[2].children[0].label, '3.0.1 Section 3.0.1')
		})

		it('should keep subfile nodes when subFile expansion is disabled', async () => {
			const main = set.root('main.tex')
			const sub = get.path('sub.tex')
			const resolveFileStub = sinon.stub(utils, 'resolveFile').resolves(sub)
			await cacheAst(main, '\\input{sub}')
			await cacheAst(sub, '\\section{From sub}')

			const result = await construct(main, false)
			resolveFileStub.restore()

			assert.strictEqual(result.length, 1)
			assert.strictEqual(result[0].type, TeXElementType.SubFile)
			assert.strictEqual(result[0].label, 'sub')
		})

		it('should insert Rnw child subfile entries from child macro parser', async () => {
			const main = set.root('main.tex')
			const child = get.path('child.tex')
			await cacheAst(main, '\\section{A}')
			await cacheAst(child, '\\section{Child}')
			const execChildStub = sinon.stub(InputFileRegExp.prototype, 'execChild')
			execChildStub.onFirstCall().resolves({
				path: child,
				match: {
					type: 1,
					path: 'child.tex',
					directory: '',
					matchedString: "<<child='child.tex'>>=",
					index: 0
				}
			})
			execChildStub.onSecondCall().resolves(undefined)

			const result = await construct(main, true)
            execChildStub.restore()

			assert.strictEqual(result.length, 2)
			assert.strictEqual(result[0].label, '1 Child')
			assert.strictEqual(result[1].label, '2 A')
		})

		it('should avoid infinite recursion for cyclic subfile inclusion', async () => {
			const main = set.root('main.tex')
			const sub = get.path('sub.tex')
			const resolveFileStub = sinon.stub(utils, 'resolveFile').callsFake((_dirs: string[], file: string) => {
				if (file === 'sub') {
					return Promise.resolve(sub)
				}
				if (file === 'main') {
					return Promise.resolve(main)
				}
				return Promise.resolve(undefined)
			})
			await cacheAst(main, '\\section{Main}\\input{sub}')
			await cacheAst(sub, '\\section{Sub}\\input{main}')

			const result = await construct(main, true)
			resolveFileStub.restore()

			assert.deepStrictEqual(result.map(section => section.label), ['1 Main', '2 Sub'])
		})
	})
})
