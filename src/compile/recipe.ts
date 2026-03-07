import vscode from 'vscode'
import path from 'path'
import { replaceArgumentPlaceholders, splitCommandLineArgs } from '../utils/utils'

import { lw } from '../lw'
import type { Recipe, Tool } from '../types'
import { queue } from './queue'

const logger = lw.log('Build', 'Recipe')

const FIXED_SECURE_RECIPE_NAME = 'secure-latexmk'
const FIXED_SECURE_TOOL: Tool = {
    name: 'latexmk',
    command: 'latexmk',
    args: [
        '-interaction=nonstopmode',
        '-file-line-error',
        '-pdf',
        '-outdir=%DIR%',
        '-auxdir=%DIR%',
        '%DOC%'
    ],
    env: {}
}

let state: {
    prevRecipe: Recipe | undefined,
    prevLangId: string,
    isMikTeX: boolean | undefined
}

initialize()
export function initialize() {
    state = {
        prevRecipe: undefined,
        prevLangId: '',
        isMikTeX: undefined
    }
}

setDockerImage()
lw.onConfigChange('docker.image.latex', setDockerImage)
function setDockerImage() {
    const dockerImageName: string = vscode.workspace.getConfiguration('latex-workshop').get('docker.image.latex', '')
    logger.log(`Set $LATEXWORKSHOP_DOCKER_LATEX: ${JSON.stringify(dockerImageName)}`)
    process.env['LATEXWORKSHOP_DOCKER_LATEX'] = dockerImageName
}

setDockerPath()
lw.onConfigChange('docker.path', setDockerPath)
function setDockerPath() {
    const dockerPath: string = vscode.workspace.getConfiguration('latex-workshop').get('docker.path', '')
    logger.log(`Set $LATEXWORKSHOP_DOCKER_PATH: ${JSON.stringify(dockerPath)}`)
    process.env['LATEXWORKSHOP_DOCKER_PATH'] = dockerPath
}

/**
 * Build LaTeX project using the recipe system. Creates Tools containing the
 * tool info and adds them to the queue. Initiates a buildLoop if there is no
 * running one.
 *
 * @param {string} rootFile - Path to the root LaTeX file.
 * @param {string} langId - The language ID of the root file. Used to determine
 * whether the previous recipe can be applied.
 * @param {Function} buildLoop - A function that represents the build loop.
 * @param {string} [recipeName] - Optional. The name of the recipe to be used.
 * If undefined, the builder tries to determine on its own.
 */
export async function build(rootFile: string, langId: string, buildLoop: () => Promise<void>, recipeName?: string) {
    logger.log(`Build root file ${rootFile}`)
    let cwd: string = path.dirname(lw.file.toUri(rootFile).fsPath)

    // Save all open files in the workspace
    await vscode.workspace.saveAll()

    // Create build tools based on the recipe system
    const tools = await createBuildTools(rootFile, langId, recipeName)

    // Create output subdirectories for included files
    if (tools?.map(tool => tool.command).includes('latexmk') && rootFile === lw.root.subfiles.path && lw.root.file.path) {
        await createAuxSubFolders(lw.root.file.path)
    } else {
        await createAuxSubFolders(rootFile)
    }

    // Check for invalid toolchain
    if (tools === undefined) {
        logger.log('Invalid toolchain.')
        return
    }

    // Add tools to the queue with timestamp
    const timestamp = Date.now()
    tools.forEach(tool => queue.add(tool, rootFile, recipeName || 'Build', timestamp, false, cwd))

    // #4513 If the recipe contains a forced latexmk compilation, don't set the
    // compiledPDFPath so that PDF refresh is handled by file watcher.
    if (!tools.some(tool => tool.command === 'latexmk' &&
                            tool.args?.includes('-interaction=nonstopmode') &&
                            tool.args?.includes('-f'))) {
        lw.compile.compiledPDFPath = lw.file.getSecurityPdfPath(rootFile)
    }
    // Execute the build loop
    await buildLoop()
}

/**
 * Create subdirectories of the output directory. This is necessary as some
 * LaTeX macros do not create the output directory themselves.
 *
 * @param {string} rootFile - Path to the root LaTeX file.
 */
async function createAuxSubFolders(rootFile: string) {
    const rootDir = path.dirname(rootFile)
    let auxDir = lw.file.getSecurityAuxDir(rootFile)
    if (!path.isAbsolute(auxDir)) {
        auxDir = path.resolve(rootDir, auxDir)
    }
    logger.log(`auxDir: ${auxDir} .`)
    for (const file of lw.cache.getIncludedTeX(rootFile)) {
        const relativePath = path.dirname(file.replace(rootDir, '.'))
        const fullAuxDir = path.resolve(auxDir, relativePath)
        // To avoid issues when fullAuxDir is the root dir
        // Using fs.mkdir() on the root directory even with recursion will result in an error
        try {
            const fileStat = await lw.file.exists(fullAuxDir)
            if (
                !fileStat ||
                ![vscode.FileType.Directory, vscode.FileType.Directory | vscode.FileType.SymbolicLink].includes(
                    fileStat.type
                )
            ) {
                lw.external.mkdirSync(fullAuxDir, { recursive: true })
            }
        } catch (e) {
            if (e instanceof Error) {
                // #4048
                logger.log(`Unexpected Error: ${e.name}: ${e.message} .`)
            } else {
                logger.log('Unexpected Error: please see the console log of the Developer Tools of VS Code.')
                logger.refreshStatus('x', 'errorForeground')
                throw(e)
            }
        }
    }
}


/**
 * Given an optional recipe, create the corresponding {@link Tool}s.
 *
 * @param {string} rootFile - Path to the root LaTeX file.
 * @param {string} langId - The language ID of the root file.
 * @param {string} [recipeName] - Optional. The name of the recipe to be used.
 * @returns {Tool[] | undefined} - An array of Tool objects representing the
 * build tools.
 */
async function createBuildTools(rootFile: string, langId: string, recipeName?: string): Promise<Tool[] | undefined> {
    let buildTools: Tool[] = []

    const configuration = vscode.workspace.getConfiguration('latex-workshop', lw.file.toUri(rootFile))
    const magic = await findMagicComments(rootFile)
    const hasBuildMagicComments = magic.tex !== undefined || magic.bib !== undefined || magic.recipe !== undefined

    if (hasBuildMagicComments && configuration.get('latex.build.enableMagicComments')) {
        logger.log('Ignoring magic-command comments in secure build.')
    }
    const recipe = findRecipe(rootFile, langId, recipeName)
    if (recipe === undefined) {
        return
    }
    logger.log(`Preparing to run recipe: ${recipe.name}.`)
    state.prevRecipe = recipe
    state.prevLangId = langId
    recipe.tools.forEach(tool => {
        if (typeof tool !== 'string') {
            buildTools.push(tool)
        }
    })
    logger.log(`Prepared ${buildTools.length} tools.`)
    if (buildTools.length < 1) {
        return
    }

    // Use JSON.parse and JSON.stringify for a deep copy.
    buildTools = JSON.parse(JSON.stringify(buildTools)) as Tool[]

    populateTools(rootFile, buildTools)

    return buildTools
}

/**
 * Find magic comments in the root file, including TeX and BibTeX programs, and
 * the LW recipe name.
 *
 * @param {string} rootFile - Path to the root LaTeX file.
 * @returns {{tex?: Tool, bib?: Tool, recipe?: string}} - An object containing
 * the TeX and BibTeX tools and the LW recipe name.
 */
async function findMagicComments(rootFile: string): Promise<{tex?: Tool, bib?: Tool, recipe?: string}> {
    const regexTex = /^(?:%\s*!\s*T[Ee]X\s(?:TS-)?program\s*=\s*([^\s]*)$)/m
    const regexBib = /^(?:%\s*!\s*BIB\s(?:TS-)?program\s*=\s*([^\s]*)$)/m
    const regexTexOptions = /^(?:%\s*!\s*T[Ee]X\s(?:TS-)?options\s*=\s*(.*)$)/m
    const regexBibOptions = /^(?:%\s*!\s*BIB\s(?:TS-)?options\s*=\s*(.*)$)/m
    const regexRecipe = /^(?:%\s*!\s*LW\srecipe\s*=\s*(.*)$)/m
    let content = ''
    for (const line of (await lw.file.read(rootFile))?.split('\n') || []) {
        if (line.startsWith('%') || line.trim().length === 0) {
            content += line + '\n'
        } else {
            break
        }
    }

    const tex = content.match(regexTex)
    let texCommand: Tool | undefined = undefined
    if (tex) {
        texCommand = {
            name: lw.constant.TEX_MAGIC_PROGRAM_NAME,
            command: tex[1]
        }
        logger.log(`Found TeX program by magic comment: ${texCommand.command}.`)
        const res = content.match(regexTexOptions)
        if (res) {
            texCommand.args = splitCommandLineArgs(res[1])
            logger.log(`Found TeX options by magic comment: ${texCommand.args}.`)
        }
    }

    const bib = content.match(regexBib)
    let bibCommand: Tool | undefined = undefined
    if (bib) {
        bibCommand = {
            name: lw.constant.BIB_MAGIC_PROGRAM_NAME,
            command: bib[1]
        }
        logger.log(`Found BIB program by magic comment: ${bibCommand.command}.`)
        const res = content.match(regexBibOptions)
        if (res) {
            bibCommand.args = splitCommandLineArgs(res[1])
            logger.log(`Found BIB options by magic comment: ${bibCommand.args}.`)
        }
    }

    const recipe = content.match(regexRecipe)
    if (recipe && recipe[1]) {
        logger.log(`Found LW recipe '${recipe[1]}' by magic comment: ${recipe}.`)
    }

    return {tex: texCommand, bib: bibCommand, recipe: recipe?.[1]}
}

/**
 * Find a recipe based on the provided recipe name, language ID, and root file.
 *
 * @param {string} rootFile - Path to the root LaTeX file.
 * @param {string} langId - The language ID of the root file.
 * @param {string} [recipeName] - Optional. The name of the recipe to be used.
 * @returns {Recipe | undefined} - The Recipe object corresponding to the
 * provided parameters.
 */
function findRecipe(rootFile: string, langId: string, recipeName?: string): Recipe | undefined {
    void rootFile
    void langId
    if (recipeName && recipeName !== FIXED_SECURE_RECIPE_NAME) {
        logger.log(`Ignoring requested recipe ${recipeName} in this secure build.`)
    }
    return {
        name: FIXED_SECURE_RECIPE_NAME,
        tools: [JSON.parse(JSON.stringify(FIXED_SECURE_TOOL)) as Tool]
    }
}

/**
 * Expand the bare {@link Tool} with Docker and argument placeholder strings.
 *
 * @param {string} rootFile - Path to the root LaTeX file.
 * @param {Tool[]} buildTools - An array of Tool objects to be populated.
 * @returns {Tool[]} - An array of Tool objects with expanded values.
 */
function populateTools(rootFile: string, buildTools: Tool[]): Tool[] {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', lw.file.toUri(rootFile))
    const docker = configuration.get('docker.enabled')

    buildTools.forEach(tool => {
        if (docker) {
            switch (tool.command) {
                case 'latexmk':
                    logger.log('Use Docker to invoke the command.')
                    if (process.platform === 'win32') {
                        tool.command = path.resolve(lw.extensionRoot, './scripts/latexmk.bat')
                    } else {
                        tool.command = path.resolve(lw.extensionRoot, './scripts/latexmk')
                        lw.external.chmodSync(tool.command, 0o755)
                    }
                    break
                default:
                    logger.log(`Do not use Docker to invoke the command: ${tool.command}.`)
                    break
            }
        }
        tool.args = tool.args?.map(replaceArgumentPlaceholders(rootFile, lw.file.tmpDirPath))
        lw.file.setTeXDirs(
            rootFile,
            tool.args?.filter(arg => arg.startsWith('-out-directory') || arg.startsWith('-outdir'))[0]?.replace(/^-out-directory=|^-outdir=/, ''),
            tool.args?.filter(arg => arg.startsWith('-aux-directory') || arg.startsWith('-auxdir'))[0]?.replace(/^-aux-directory=|^-auxdir=/, '')
        )
        const env = tool.env ?? {}
        Object.entries(env).forEach(([key, value]) => {
            env[key] = value && replaceArgumentPlaceholders(rootFile, lw.file.tmpDirPath)(value)
        })
        if (configuration.get('latex.option.maxPrintLine.enabled')) {
            tool.args = tool.args ?? []
            const isLaTeXmk =
                tool.command === 'latexmk' &&
                !(
                    tool.args.includes('-lualatex') ||
                    tool.args.includes('-pdflua') ||
                    tool.args.includes('-pdflualatex') ||
                    tool.args.includes('--lualatex') ||
                    tool.args.includes('--pdflua') ||
                    tool.args.includes('--pdflualatex')
                )
            if ((isLaTeXmk || tool.command === 'pdflatex') && isMikTeX()) {
                tool.args.unshift('--max-print-line=' + lw.constant.MAX_PRINT_LINE)
            }
        }
    })
    return buildTools
}

/**
 * Check whether the LaTeX toolchain compilers are provided by MikTeX.
 *
 * @returns {boolean} - True if the LaTeX toolchain is provided by MikTeX;
 * otherwise, false.
 */
function isMikTeX(): boolean {
    if (state.isMikTeX === undefined) {
        try {
            const log = lw.external.sync('pdflatex', ['--version']).stdout.toString()
            if (log.includes('MiKTeX')) {
                state.isMikTeX = true
                logger.log('`pdflatex` is provided by MiKTeX.')
            } else {
                state.isMikTeX = false
            }
        } catch (err) {
            logger.logError('Cannot run `pdflatex` to determine if we are using MiKTeX.', err)
            state.isMikTeX = false
        }
    }
    return state.isMikTeX
}
