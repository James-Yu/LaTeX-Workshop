import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { assert, get, mock, set } from '../utils'
import { lw } from '../../../src/lw'
import { getWorkingFolder, replaceArgumentPlaceholders } from '../../../src/utils/utils'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = get.fixture(__filename)

	before(() => {
		mock.init(lw)
	})

	after(() => {
		sinon.restore()
	})

	describe('lw.utils->getWorkingFolder', () => {
		let rootFile: string
		let workspaceDir: string
		let getWorkspaceFolderStub: sinon.SinonStub | undefined

		beforeEach(() => {
			workspaceDir = get.path()
			rootFile = get.path(fixture, 'main.tex')
			getWorkspaceFolderStub = undefined
		})

		afterEach(() => {
			getWorkspaceFolderStub?.restore()
		})

		it('should return the root directory when `latex.build.fromFolder` is empty', () => {
			set.config('latex.build.fromFolder', '')

			const workingFolder = getWorkingFolder(rootFile)

			assert.pathStrictEqual(workingFolder, path.dirname(rootFile))
		})

		it('should resolve `latex.build.fromFolder` from workspace directory', () => {
			const workspaceFolder: vscode.WorkspaceFolder = {
				uri: vscode.Uri.file(workspaceDir),
				name: path.basename(workspaceDir),
				index: 0
			}
			getWorkspaceFolderStub = sinon.stub(vscode.workspace, 'getWorkspaceFolder').returns(workspaceFolder)
			set.config('latex.build.fromFolder', 'test/units')

			const workingFolder = getWorkingFolder(rootFile)

			assert.pathStrictEqual(workingFolder, path.resolve(workspaceDir, 'test', 'units'))
		})

		it('should resolve `latex.build.fromFolder` from root directory when no workspace is found', () => {
			getWorkspaceFolderStub = sinon.stub(vscode.workspace, 'getWorkspaceFolder').returns(undefined)
			set.config('latex.build.fromFolder', 'build')

			const workingFolder = getWorkingFolder(rootFile)

			assert.pathStrictEqual(workingFolder, path.resolve(path.dirname(rootFile), 'build'))
		})
	})

	describe('lw.utils->replaceArgumentPlaceholders', () => {
		let workspaceDir: string
		let rootFile: string
		let tmpDir: string
		let workspaceFoldersStub: sinon.SinonStub
		let getWorkspaceFolderStub: sinon.SinonStub

		const placeholdersReplacedOnce = new Set([
			'%RELATIVE_DIR%',
			'%RELATIVE_DOC%',
			'%RELATIVE_CWD_DIR%',
			'%RELATIVE_CWD_DOC%'
		])

		function toPosix(filePath: string): string {
			return filePath.split(path.sep).join('/')
		}

		function buildExpectedValues(inputRootFile: string, inputWorkspaceDir: string, inputTmpDir: string, docker: boolean): Record<string, string> {
			const rootFileParsed = path.parse(inputRootFile)
			const docfile = rootFileParsed.name
			const docfileExt = rootFileParsed.base
			const dirW32 = path.normalize(rootFileParsed.dir)
			const dir = toPosix(dirW32)
			const docW32 = path.join(dirW32, docfile)
			const doc = toPosix(docW32)
			const docExtW32 = path.join(dirW32, docfileExt)
			const docExt = toPosix(docExtW32)
			const relativeWorkspaceDir = toPosix(path.relative(inputWorkspaceDir, dir))
			const relativeWorkspaceDoc = toPosix(path.relative(inputWorkspaceDir, doc))
			const workingFolder = path.resolve(inputWorkspaceDir, 'test', 'units')
			const relativeWorkingDir = toPosix(path.relative(workingFolder, dir))
			const relativeWorkingDoc = toPosix(path.relative(workingFolder, doc))

			const outDirW32 = path.normalize(docker ? './out' : `${dir}/out`)
			const outDir = toPosix(outDirW32)

			return {
				'%DOC%': docker ? docfile : doc,
				'%DOC_W32%': docker ? docfile : docW32,
				'%DOC_EXT%': docker ? docfileExt : docExt,
				'%DOC_EXT_W32%': docker ? docfileExt : docExtW32,
				'%DOCFILE_EXT%': docfileExt,
				'%DOCFILE%': docfile,
				'%DIR%': docker ? './' : dir,
				'%DIR_W32%': docker ? './' : dirW32,
				'%TMPDIR%': inputTmpDir,
				'%WORKSPACE_FOLDER%': docker ? './' : toPosix(inputWorkspaceDir),
				'%RELATIVE_DIR%': docker ? './' : relativeWorkspaceDir,
				'%RELATIVE_DOC%': docker ? docfile : relativeWorkspaceDoc,
				'%RELATIVE_CWD_DIR%': docker ? './' : relativeWorkingDir,
				'%RELATIVE_CWD_DOC%': docker ? docfile : relativeWorkingDoc,
				'%OUTDIR%': outDir,
				'%OUTDIR_W32%': outDirW32,
				'%AUXDIR%': `${outDir}/aux`
			}
		}

		function assertOccurrenceKinds(replacer: (arg: string) => string, placeholder: string, expectedValue: string) {
			assert.strictEqual(replacer(`${placeholder}-tail`), `${expectedValue}-tail`)
			assert.strictEqual(replacer(`head-${placeholder}-tail`), `head-${expectedValue}-tail`)
			assert.strictEqual(replacer(`head-${placeholder}`), `head-${expectedValue}`)

			const repeatedInput = `${placeholder}|${placeholder}|${placeholder}`
			const repeatedExpected = placeholdersReplacedOnce.has(placeholder)
				? `${expectedValue}|${placeholder}|${placeholder}`
				: `${expectedValue}|${expectedValue}|${expectedValue}`
			assert.strictEqual(replacer(repeatedInput), repeatedExpected)
		}

		function setupWorkspaceStubs(inputWorkspaceDir: string) {
			const workspaceFolder: vscode.WorkspaceFolder = {
				uri: vscode.Uri.file(inputWorkspaceDir),
				name: path.basename(inputWorkspaceDir),
				index: 0
			}
			const workspaceFoldersStubLocal = sinon.stub(vscode.workspace, 'workspaceFolders').value([workspaceFolder])
			const getWorkspaceFolderStubLocal = sinon.stub(vscode.workspace, 'getWorkspaceFolder').returns(workspaceFolder)

			return { workspaceFoldersStub: workspaceFoldersStubLocal, getWorkspaceFolderStub: getWorkspaceFolderStubLocal }
		}

		beforeEach(() => {
			workspaceDir = get.path()
			rootFile = get.path(fixture, 'main.tex')
			tmpDir = path.resolve(workspaceDir, 'tmp')
			;({ workspaceFoldersStub, getWorkspaceFolderStub } = setupWorkspaceStubs(workspaceDir))

			set.config('latex.build.fromFolder', 'test/units')
			set.config('latex.outDir', '%DIR%/out')
			set.config('latex.auxDir', '%OUTDIR%/aux')
		})

		afterEach(() => {
			workspaceFoldersStub.restore()
			getWorkspaceFolderStub.restore()
		})

		it('should replace each placeholder individually in non-docker mode for all occurrence kinds', () => {
			set.config('docker.enabled', false)

			const replacer = replaceArgumentPlaceholders(rootFile, tmpDir)
			const expectedValues = buildExpectedValues(rootFile, workspaceDir, tmpDir, false)

			for (const [placeholder, expected] of Object.entries(expectedValues)) {
				assertOccurrenceKinds(replacer, placeholder, expected)
			}
		})

		it('should replace each placeholder individually in docker mode for all occurrence kinds', () => {
			set.config('docker.enabled', true)

			const replacer = replaceArgumentPlaceholders(rootFile, tmpDir)
			const expectedValues = buildExpectedValues(rootFile, workspaceDir, tmpDir, true)

			for (const [placeholder, expected] of Object.entries(expectedValues)) {
				assertOccurrenceKinds(replacer, placeholder, expected)
			}
		})

		it('should replace mixed placeholders in one argument', () => {
			set.config('docker.enabled', false)

			const replacer = replaceArgumentPlaceholders(rootFile, tmpDir)
			const expectedValues = buildExpectedValues(rootFile, workspaceDir, tmpDir, false)
			const argument = [
				'ROOT=%DOCFILE_EXT%',
				'PATH=%DOC%',
				'OUT=%OUTDIR%',
				'AUX=%AUXDIR%',
				'REL=%RELATIVE_DOC%',
				'CWD=%RELATIVE_CWD_DOC%',
				'TMP=%TMPDIR%'
			].join(';')

			const replaced = replacer(argument)

			assert.strictEqual(
				replaced,
				[
					`ROOT=${expectedValues['%DOCFILE_EXT%']}`,
					`PATH=${expectedValues['%DOC%']}`,
					`OUT=${expectedValues['%OUTDIR%']}`,
					`AUX=${expectedValues['%AUXDIR%']}`,
					`REL=${expectedValues['%RELATIVE_DOC%']}`,
					`CWD=${expectedValues['%RELATIVE_CWD_DOC%']}`,
					`TMP=${expectedValues['%TMPDIR%']}`
				].join(';')
			)
		})
	})
})
