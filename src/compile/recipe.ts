import vscode from 'vscode'
import path from 'path'
import fs from 'fs'
import * as cp from 'child_process'
import { replaceArgumentPlaceholders } from '../utils/utils'

import { lw } from '../lw'
import type { Recipe, Tool } from '../types'
import { queue } from './queue'

const logger = lw.log('Build', 'Recipe')

let prevRecipe: Recipe | undefined = undefined
let prevLangId = ''

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

    // Save all open files in the workspace
    await vscode.workspace.saveAll()

    // Create build tools based on the recipe system
    const tools = createBuildTools(rootFile, langId, recipeName)

    // Create output subdirectories for included files
    if (tools?.map(tool => tool.command).includes('latexmk') && rootFile === lw.root.subfiles.path && lw.root.file.path) {
        createOutputSubFolders(lw.root.file.path)
    } else {
        createOutputSubFolders(rootFile)
    }

    // Check for invalid toolchain
    if (tools === undefined) {
        logger.log('Invalid toolchain.')
        return
    }

    // Add tools to the queue with timestamp
    const timestamp = Date.now()
    tools.forEach(tool => queue.add(tool, rootFile, recipeName || 'Build', timestamp))

    lw.compile.compiledPDFPath = lw.file.getPdfPath(rootFile)
    // Execute the build loop
    await buildLoop()
}

/**
 * Create subdirectories of the output directory. This is necessary as some
 * LaTeX macros do not create the output directory themselves.
 *
 * @param {string} rootFile - Path to the root LaTeX file.
 */
function createOutputSubFolders(rootFile: string) {
    const rootDir = path.dirname(rootFile)
    let outDir = lw.file.getOutDir(rootFile)
    if (!path.isAbsolute(outDir)) {
        outDir = path.resolve(rootDir, outDir)
    }
    logger.log(`outDir: ${outDir} .`)
    lw.cache.getIncludedTeX(rootFile).forEach(file => {
        const relativePath = path.dirname(file.replace(rootDir, '.'))
        const fullOutDir = path.resolve(outDir, relativePath)
        // To avoid issues when fullOutDir is the root dir
        // Using fs.mkdir() on the root directory even with recursion will result in an error
        try {
            if (! (fs.existsSync(fullOutDir) && fs.statSync(fullOutDir).isDirectory())) {
                fs.mkdirSync(fullOutDir, { recursive: true })
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
    })
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
function createBuildTools(rootFile: string, langId: string, recipeName?: string): Tool[] | undefined {
    let buildTools: Tool[] = []

    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(rootFile))
    const magic = findMagicComments(rootFile)

    if (recipeName === undefined && magic.tex && !configuration.get('latex.build.forceRecipeUsage')) {
        buildTools = createBuildMagic(rootFile, magic.tex, magic.bib)
    } else {
        const recipe = findRecipe(rootFile, langId, recipeName || magic.recipe)
        if (recipe === undefined) {
            return
        }
        logger.log(`Preparing to run recipe: ${recipe.name}.`)
        prevRecipe = recipe
        prevLangId = langId
        const tools = configuration.get('latex.tools') as Tool[]
        recipe.tools.forEach(tool => {
            if (typeof tool === 'string') {
                const candidates = tools.filter(candidate => candidate.name === tool)
                if (candidates.length < 1) {
                    logger.log(`Skipping undefined tool ${tool} in recipe ${recipe.name}.`)
                    void logger.showErrorMessage(`Skipping undefined tool "${tool}" in recipe "${recipe.name}."`)
                } else {
                    buildTools.push(candidates[0])
                }
            } else {
                buildTools.push(tool)
            }
        })
        logger.log(`Prepared ${buildTools.length} tools.`)
    }
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
function findMagicComments(rootFile: string): {tex?: Tool, bib?: Tool, recipe?: string} {
    const regexTex = /^(?:%\s*!\s*T[Ee]X\s(?:TS-)?program\s*=\s*([^\s]*)$)/m
    const regexBib = /^(?:%\s*!\s*BIB\s(?:TS-)?program\s*=\s*([^\s]*)$)/m
    const regexTexOptions = /^(?:%\s*!\s*T[Ee]X\s(?:TS-)?options\s*=\s*(.*)$)/m
    const regexBibOptions = /^(?:%\s*!\s*BIB\s(?:TS-)?options\s*=\s*(.*)$)/m
    const regexRecipe = /^(?:%\s*!\s*LW\srecipe\s*=\s*(.*)$)/m
    let content = ''
    for (const line of fs.readFileSync(rootFile).toString().split('\n')) {
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
            texCommand.args = [res[1]]
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
            bibCommand.args = [res[1]]
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
 * Create build tools based on magic comments in the root file.
 *
 * @param {string} rootFile - Path to the root LaTeX file.
 * @param {Tool} magicTex - Tool object representing the TeX command from magic
 * comments.
 * @param {Tool} [magicBib] - Optional. Tool object representing the BibTeX
 * command from magic comments.
 * @returns {Tool[]} - An array of Tool objects representing the build tools.
 */
function createBuildMagic(rootFile: string, magicTex: Tool, magicBib?: Tool): Tool[] {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(rootFile))

    if (!magicTex.args) {
        magicTex.args = configuration.get('latex.magic.args') as string[]
        magicTex.name = lw.constant.TEX_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX
    }
    if (magicBib) {
        if (!magicBib.args) {
            magicBib.args = configuration.get('latex.magic.bib.args') as string[]
            magicBib.name = lw.constant.BIB_MAGIC_PROGRAM_NAME + lw.constant.MAGIC_PROGRAM_ARGS_SUFFIX
        }
        return [magicTex, magicBib, magicTex, magicTex]
    } else {
        return [magicTex]
    }
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
    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(rootFile))

    const recipes = configuration.get('latex.recipes') as Recipe[]
    const defaultRecipeName = configuration.get('latex.recipe.default') as string

    if (recipes.length < 1) {
        logger.log('No recipes defined.')
        void logger.showErrorMessage('[Builder] No recipes defined.')
        return
    }
    if (prevLangId !== langId) {
        prevRecipe = undefined
    }
    let recipe: Recipe | undefined
    // Find recipe according to the given name
    if (recipeName === undefined && !['first', 'lastUsed'].includes(defaultRecipeName)) {
        recipeName = defaultRecipeName
    }
    if (recipeName) {
        recipe = recipes.find(candidate => candidate.name === recipeName)
        if (recipe === undefined) {
            logger.log(`Failed to resolve build recipe: ${recipeName}.`)
            void logger.showErrorMessage(`[Builder] Failed to resolve build recipe: ${recipeName}.`)
        }
    }
    // Find default recipe of last used
    if (recipe === undefined && defaultRecipeName === 'lastUsed' && recipes.find(candidate => candidate.name === prevRecipe?.name)) {
        recipe = prevRecipe
    }
    // If still not found, fallback to 'first'
    if (recipe === undefined) {
        let candidates: Recipe[] = recipes
        if (langId === 'rsweave') {
            candidates = recipes.filter(candidate => candidate.name.toLowerCase().match('rnw|rsweave'))
        } else if (langId === 'jlweave') {
            candidates = recipes.filter(candidate => candidate.name.toLowerCase().match('jnw|jlweave|weave.jl'))
        } else if (langId === 'pweave') {
            candidates = recipes.filter(candidate => candidate.name.toLowerCase().match('pnw|pweave'))
        }
        if (candidates.length < 1) {
            logger.log(`Failed to resolve build recipe: ${recipeName}.`)
            void logger.showErrorMessage(`Failed to resolve build recipe: ${recipeName}.`)
        }
        recipe = candidates[0]
    }
    return recipe
}

/**
 * Expand the bare {@link Tool} with Docker and argument placeholder strings.
 *
 * @param {string} rootFile - Path to the root LaTeX file.
 * @param {Tool[]} buildTools - An array of Tool objects to be populated.
 * @returns {Tool[]} - An array of Tool objects with expanded values.
 */
function populateTools(rootFile: string, buildTools: Tool[]): Tool[] {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(rootFile))
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
                        fs.chmodSync(tool.command, 0o755)
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
            const isLuaLatex = tool.args.includes('-lualatex') ||
                               tool.args.includes('-pdflua') ||
                               tool.args.includes('-pdflualatex') ||
                               tool.args.includes('--lualatex') ||
                               tool.args.includes('--pdflua') ||
                               tool.args.includes('--pdflualatex')
            if (isMikTeX() && ((tool.command === 'latexmk' && !isLuaLatex) || tool.command === 'pdflatex')) {
                tool.args.unshift('--max-print-line=' + lw.constant.MAX_PRINT_LINE)
            }
        }
    })
    return buildTools
}

let _isMikTeX: boolean
/**
 * Check whether the LaTeX toolchain compilers are provided by MikTeX.
 *
 * @returns {boolean} - True if the LaTeX toolchain is provided by MikTeX;
 * otherwise, false.
 */
function isMikTeX(): boolean {
    if (_isMikTeX === undefined) {
        try {
            if (cp.execSync('pdflatex --version').toString().match(/MiKTeX/)) {
                _isMikTeX = true
                logger.log('`pdflatex` is provided by MiKTeX.')
            } else {
                _isMikTeX = false
            }
        } catch (e) {
            logger.log('Cannot run `pdflatex` to determine if we are using MiKTeX.')
            _isMikTeX = false
        }
    }
    return _isMikTeX
}
