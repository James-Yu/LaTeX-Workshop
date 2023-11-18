import vscode from 'vscode'
import path from 'path'
import fs from 'fs'
import * as cp from 'child_process'
import * as lw from '../lw'
import { replaceArgumentPlaceholders } from '../utils/utils'
import { queue } from './queue'
import type { Recipe, Tool } from '.'
import { extension } from '../extension'

const logger = extension.log('Build', 'Recipe')

export const TEX_MAGIC_PROGRAM_NAME = 'TEX_MAGIC_PROGRAM_NAME'
export const BIB_MAGIC_PROGRAM_NAME = 'BIB_MAGIC_PROGRAM_NAME'
export const MAGIC_PROGRAM_ARGS_SUFFIX = '_WITH_ARGS'
export const MAX_PRINT_LINE = '10000'

let prevRecipe: Recipe | undefined = undefined
let prevLangId = ''

/**
 * Build LaTeX project using the recipe system. This function creates
 * {@link Tool}s containing the tool info and adds them to the queue. After
 * that, this function tries to initiate a {@link buildLoop} if there is no
 * one running.
 *
 * @param rootFile Path to the root LaTeX file.
 * @param langId The language ID of the root file. This argument is used to
 * determine whether the previous recipe can be applied to this root file.
 * @param recipeName The name of recipe to be used. If `undefined`, the
 * builder tries to determine on its own, in {@link createBuildTools}. This
 * parameter is given only when RECIPE command is invoked. For all other
 * cases, it should be `undefined`.
 */
export async function build(rootFile: string, langId: string, buildLoop: () => Promise<void>, recipeName?: string) {
    logger.log(`Build root file ${rootFile}`)

    await vscode.workspace.saveAll()

    createOutputSubFolders(rootFile)

    const tools = createBuildTools(rootFile, langId, recipeName)

    if (tools === undefined) {
        logger.log('Invalid toolchain.')

        extension.compile.compiling = false
        return
    }
    const timestamp = Date.now()
    tools.forEach(tool => queue.add(tool, rootFile, recipeName || 'Build', timestamp))

    await buildLoop()
}

/**
 * Create sub directories of output directory This was supposed to create
 * the outputDir as latexmk does not take care of it (neither does any of
 * latex command). If the output directory does not exist, the latex
 * commands simply fail.
 */
function createOutputSubFolders(rootFile: string) {
    const rootDir = path.dirname(rootFile)
    let outDir = lw.manager.getOutDir(rootFile)
    if (!path.isAbsolute(outDir)) {
        outDir = path.resolve(rootDir, outDir)
    }
    logger.log(`outDir: ${outDir} .`)
    extension.cache.getIncludedTeX(rootFile).forEach(file => {
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
            name: TEX_MAGIC_PROGRAM_NAME,
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
            name: BIB_MAGIC_PROGRAM_NAME,
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

function createBuildMagic(rootFile: string, magicTex: Tool, magicBib?: Tool): Tool[] {
    const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(rootFile))

    if (!magicTex.args) {
        magicTex.args = configuration.get('latex.magic.args') as string[]
        magicTex.name = TEX_MAGIC_PROGRAM_NAME + MAGIC_PROGRAM_ARGS_SUFFIX
    }
    if (magicBib) {
        if (!magicBib.args) {
            magicBib.args = configuration.get('latex.magic.bib.args') as string[]
            magicBib.name = BIB_MAGIC_PROGRAM_NAME + MAGIC_PROGRAM_ARGS_SUFFIX
        }
        return [magicTex, magicBib, magicTex, magicTex]
    } else {
        return [magicTex]
    }
}


/**
 * @param recipeName This recipe name may come from user selection of RECIPE
 * command, or from the %! LW recipe magic command.
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
        const candidates = recipes.filter(candidate => candidate.name === recipeName)
        if (candidates.length < 1) {
            logger.log(`Failed to resolve build recipe: ${recipeName}.`)
            void logger.showErrorMessage(`[Builder] Failed to resolve build recipe: ${recipeName}.`)
        }
        recipe = candidates[0]
    }
    // Find default recipe of last used
    if (recipe === undefined && defaultRecipeName === 'lastUsed') {
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
 * Expand the bare {@link Tool} with docker and argument placeholder
 * strings.
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
        tool.args = tool.args?.map(replaceArgumentPlaceholders(rootFile, lw.manager.tmpDir))
        const env = tool.env ?? {}
        Object.entries(env).forEach(([key, value]) => {
            env[key] = value && replaceArgumentPlaceholders(rootFile, lw.manager.tmpDir)(value)
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
                tool.args.unshift('--max-print-line=' + MAX_PRINT_LINE)
            }
        }
    })
    return buildTools
}

let _isMikTeX: boolean
/**
 * Whether latex toolchain compilers are provided by MikTeX. This function uses
 * a cache variable `_isMikTeX`.
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