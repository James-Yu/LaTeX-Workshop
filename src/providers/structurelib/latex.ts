import * as vscode from 'vscode'
import * as path from 'path'
import { latexParser } from 'latex-utensils'
import * as lw from '../../lw'
import * as utils from '../../utils/utils'
import { TeXElement, TeXElementType } from '../structure'
import { resolveFile } from '../../utils/utils'
import { InputFileRegExp } from '../../utils/inputfilepath'

import { getLogger } from '../../components/logger'
import { parser } from '../../components/parser'

const logger = getLogger('Structure', 'LaTeX')

interface LaTeXConfig {
    // The LaTeX commands to be extracted.
    LaTeXCommands: {cmds: string[], envs: string[], secs: string[]},
    // The correspondance of section types and depths. Start from zero is
    // the top-most section (e.g., chapter). -1 is reserved for non-section
    // commands.
    readonly LaTeXSectionDepths: {[cmd: string]: number}
}

/**
 * This function parses the AST tree of a LaTeX document to build its
 * structure. This is a two-step process. In the first step, all AST nodes
 * are traversed and filtered to build an array of sections that will appear
 * in the vscode view, but without any hierarchy. Then in the second step,
 * the hierarchy is constructed based on the config `view.outline.sections`.
 *
 * @param file The base file to start building the structure. If left
 * `undefined`, the current `rootFile` is used, i.e., build the structure
 * for the whole document/project.
 * @param subFile Whether subfiles should be included in the structure.
 * Default is `true`. If true, all input/subfile/subimport-like commands
 * will be parsed.
 * @param dirty Whether disk or dirty content should be used. Default is
 * `false`. When `subFile` is `true`, `dirty` should always be `false`.
 * @returns An array of {@link TeXElement} to be shown in vscode view.
 */
export async function buildLaTeX(file?: string, subFile = true, dirty: boolean = false): Promise<TeXElement[]> {
    dirty = dirty && !subFile
    file = file ? file : lw.manager.rootFile
    if (!file) {
        return []
    }

    const config = refreshLaTeXModelConfig()
    // To avoid looping import, this variable is used to store file paths
    // that have been parsed.
    const filesBuilt = new Set<string>()

    // Step 1: Create a flat array of sections.
    const flatNodes = await buildLaTeXSectionFromFile(config, file, subFile, filesBuilt, dirty)

    buildFloatNumber(flatNodes, subFile)

    const {preambleFloats, flatSections} = buildSectionNumber(config, flatNodes, subFile)

    // Step 2: Create the hierarchy of these sections.
    const preamble = buildNestedFloats(preambleFloats, flatSections)
    const sections = buildNestedSections(config, flatSections)
    const structure = [...preamble, ...sections]

    // Step 3: Determine the toLine of all sections.
    buildLaTeXSectionToLine(config, structure, Number.MAX_SAFE_INTEGER)

    return structure
}

/**
 * This function, different from {@link buildLaTeX}, focus on building the
 * structure of one particular file. Thus, recursive call is made upon subfiles.
 *
 * @param config The {@link LaTeXConfig} that defines how outline should be
 * structured
 * @param file The LaTeX file whose AST is to be parsed.
 * @param subFile Whether the subfile-like commands should be considered.
 * @param filesBuilt The files that have already been parsed.
 * @returns A flat array of {@link TeXElement} of this file.
 */
async function buildLaTeXSectionFromFile(config: LaTeXConfig, file: string, subFile: boolean, filesBuilt: Set<string>, dirty: boolean = false): Promise<TeXElement[]> {
    // Skip if the file has already been parsed. This is to avoid indefinite
    // loop under the case that A imports B and B imports back A.
    if (filesBuilt.has(file)) {
        return []
    }
    filesBuilt.add(file)

    logger.log(`Building LaTeX structure from ${file} .`)
    let content: string | undefined
    let ast: latexParser.LatexAst | undefined
    if (dirty) {
        content = vscode.window.activeTextEditor?.document.getText()
        if (content) {
            const configuration = vscode.workspace.getConfiguration('latex-workshop')
            const fastparse = configuration.get('intellisense.fastparse.enabled') as boolean
            logger.log('Parse active document LaTeX AST ' + (fastparse ? 'with fast-parse.' : '.'))
            ast = await parser.parseLatex(fastparse ? utils.stripText(content) : content)
        }
    }

    if (!dirty || !content || !ast){
        let waited = 0
        while (!lw.cacher.promise(file) && !lw.cacher.has(file)) {
            // Just open vscode, has not cached, wait for a bit?
            await new Promise(resolve => setTimeout(resolve, 100))
            waited++
            if (waited >= 20) {
                // Waited for two seconds before starting cache. Really?
                logger.log(`Error loading cache during structuring: ${file} .`)
                return []
            }
        }
        await lw.cacher.promise(file)

        content = lw.cacher.get(file)?.content
        ast = lw.cacher.get(file)?.ast
    }
    if (!content) {
        logger.log(`Error loading content during structuring: ${file} .`)
        return []
    }
    if (!ast) {
        logger.log(`Error loading AST during structuring: ${file} .`)
        return []
    }

    // Get a list of rnw child chunks
    const rnwChildren = subFile ? parseRnwChildCommand(content, file, lw.manager.rootFile || '') : []
    let rnwChild = rnwChildren.shift()

    // Parse each base-level node. If the node has contents, that function
    // will be called recursively.
    let sections: TeXElement[] = []
    for (const node of ast.content) {
        while (rnwChild && node.location && rnwChild.line <= node.location.start.line) {
            sections = [
                ...sections,
                ...await buildLaTeXSectionFromFile(config, rnwChild.subFile, subFile, filesBuilt, dirty)
            ]
            rnwChild = rnwChildren.shift()
        }
        sections = [
            ...sections,
            ...await parseLaTeXNode(node, config, file, subFile, filesBuilt)
        ]
    }

    return sections
}

/**
 * This function parses a particular LaTeX AST node and its sub-nodes
 * (contents by `latex-utensils`).
 *
 * @param node The AST node to be parsed.
 *
 * All other parameters are identical to {@link buildLaTeXSectionFromFile}.
 *
 * @returns A flat array of {@link TeXElement} of this node.
 */
async function parseLaTeXNode(node: latexParser.Node, config: LaTeXConfig, filePath: string, subFile: boolean, filesBuilt: Set<string>): Promise<TeXElement[]> {
    let sections: TeXElement[] = []
    if (latexParser.isCommand(node)) {
        if (config.LaTeXCommands.secs.includes(node.name.replace(/\*$/, ''))) {
            // \section{Title}
            if (node.args.length > 0) {
                // Avoid \section alone
                const captionArg = node.args.find(latexParser.isGroup)
                if (captionArg) {
                    sections.push({
                        type: node.name.endsWith('*') ? TeXElementType.SectionAst : TeXElementType.Section,
                        name: node.name.replace(/\*$/, ''),
                        label: captionify(captionArg),
                        index: 0,
                        lineFr: node.location.start.line - 1,
                        lineTo: node.location.end.line - 1,
                        filePath, children: []
                    })
                }
            }
        } else if (config.LaTeXCommands.cmds.includes(node.name.replace(/\*$/, ''))) {
            // \notlabel{Show}{ShowAlso}
            // const caption = node.args.map(arg => {
                // const argContent = latexParser.stringify(arg)
            //     return argContent.slice(1, argContent.length - 1)
            // }).join(', ') // -> Show, ShowAlso
            let caption = ''
            const captionArg = node.args.find(latexParser.isGroup)
            if (captionArg) {
                caption = latexParser.stringify(captionArg)
                caption = caption.slice(1, caption.length - 1)
            }
            sections.push({
                type: TeXElementType.Command,
                name: node.name.replace(/\*$/, ''),
                label: `#${node.name}: ${caption}`,
                index: 0,
                lineFr: node.location.start.line - 1,
                lineTo: node.location.end.line - 1,
                filePath, children: []
            })
        } else if (subFile) {
            // Check if this command is a subfile one
            sections = [
                ...sections,
                ...await parseLaTeXSubFileCommand(node, config, filePath, filesBuilt)
            ]
        }
    } else if (latexParser.isLabelCommand(node) && config.LaTeXCommands.cmds.includes(node.name)) {
        // \label{this:is_a-label}
        sections.push({
            type: TeXElementType.Command,
            name: node.name.replace(/\*$/, ''),
            label: `#${node.name}: ${node.label}`, // -> #this:is_a-label
            index: 0,
            lineFr: node.location.start.line - 1,
            lineTo: node.location.end.line - 1,
            filePath, children: []
        })
    } else if (latexParser.isEnvironment(node) && config.LaTeXCommands.envs.includes(node.name.replace(/\*$/, ''))) {
        // \begin{figure}...\end{figure}
        const caption = findEnvCaption(node)
        sections.push({
            type: TeXElementType.Environment,
            name: node.name.replace(/\*$/, ''),
            // -> Figure: Caption of figure
            label: node.name.charAt(0).toUpperCase() + node.name.slice(1) + (caption ? `: ${caption}` : ''),
            index: 0,
            lineFr: node.location.start.line - 1,
            lineTo: node.location.end.line - 1,
            filePath, children: []
        })
    }
    if (latexParser.hasContentArray(node)) {
        for (const subNode of node.content) {
            sections = [
                ...sections,
                ...await parseLaTeXNode(subNode, config, filePath, subFile, filesBuilt)
            ]
        }
    }
    return sections
}

/**
 * This function parses a particular LaTeX AST command to see if it is a
 * sub-file-like one. If so, the flat section array of the sub-file is
 * parsed using {@link buildLaTeXSectionFromFile} and returned.
 *
 * @param node The AST command to be parsed.
 *
 * All other parameters are identical to {@link buildLaTeXSectionFromFile}.
 *
 * @returns A flat array of {@link TeXElement} of this sub-file, or an empty
 * array if the command is not a sub-file-like.
 */
async function parseLaTeXSubFileCommand(node: latexParser.Command, config: LaTeXConfig, file: string, filesBuilt: Set<string>): Promise<TeXElement[]> {
    const cmdArgs: string[] = []
    node.args.forEach((arg) => {
        if (latexParser.isOptionalArg(arg)) {
            return
        }
        const argString = latexParser.stringify(arg)
        cmdArgs.push(argString.slice(1, argString.length - 1))
    })

    const texDirs = vscode.workspace.getConfiguration('latex-workshop').get('latex.texDirs') as string[]

    let candidate: string | undefined
    // \input{sub.tex}
    if (['input', 'InputIfFileExists', 'include', 'SweaveInput', 'subfile', 'loadglsentries', 'markdownInput'].includes(node.name.replace(/\*$/, ''))
        && cmdArgs.length > 0) {
        candidate = resolveFile(
            [path.dirname(file),
                path.dirname(lw.manager.rootFile || ''),
                ...texDirs],
            cmdArgs[0])
    }
    // \import{sections/}{section1.tex}
    if (['import', 'inputfrom', 'includefrom'].includes(node.name.replace(/\*$/, ''))
        && cmdArgs.length > 1) {
        candidate = resolveFile(
            [cmdArgs[0],
                path.join(
                path.dirname(lw.manager.rootFile || ''),
                cmdArgs[0])],
            cmdArgs[1])
    }
    // \subimport{01-IntroDir/}{01-Intro.tex}
    if (['subimport', 'subinputfrom', 'subincludefrom'].includes(node.name.replace(/\*$/, ''))
        && cmdArgs.length > 1) {
        candidate = resolveFile(
            [path.dirname(file)],
            path.join(cmdArgs[0], cmdArgs[1]))
    }

    return candidate ? buildLaTeXSectionFromFile(config, candidate, true, filesBuilt) : []
}

/**
 * This function tries to figure the caption of a `frame`, `figure`, or
 * `table` using their respective syntax.
 *
 * @param node The environment node to be parsed
 * @returns The caption found, or empty.
 */
function findEnvCaption(node: latexParser.Environment): string {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    if (!configuration.get('view.outline.floats.caption.enabled')) {
        return ''
    }
    let captionNode: latexParser.Command | undefined
    let caption: string = ''
    if (node.name.replace(/\*$/, '') === 'frame') {
        // Frame titles can be specified as either \begin{frame}{Frame Title}
        // or \begin{frame} \frametitle{Frame Title}
        // \begin{frame}(whitespace){Title} will set the title as long as the whitespace contains no more than 1 newline

        captionNode = node.content.filter(latexParser.isCommand).find(subNode => subNode.name.replace(/\*$/, '') === 'frametitle')

        // \begin{frame}(whitespace){Title}
        const nodeArg = node.args.find(latexParser.isGroup)
        caption = nodeArg ? captionify(nodeArg) : caption
    } else if (['figure', 'table'].includes(node.name.replace(/\*$/, ''))) {
        // \begin{figure} \caption{Figure Title}
        captionNode = node.content.filter(latexParser.isCommand).find(subNode => subNode.name.replace(/\*$/, '') === 'caption')
    } else if (['macro', 'environment'].includes(node.name.replace(/\*$/, ''))) {
        // DocTeX: \begin{macro}{<macro>}
        const nodeArg = node.args.find(latexParser.isGroup)
        caption = nodeArg ? captionify(nodeArg) : caption
    }
    // \frametitle can override title set in \begin{frame}{<title>}
    // \frametitle{Frame Title} or \caption{Figure Title}
    if (captionNode) {
        const arg = captionNode.args.find(latexParser.isGroup)
        caption = arg ? captionify(arg) : caption
    }
    return caption
}

function captionify(argNode: latexParser.Group | latexParser.OptionalArg): string {
    for (let index = 0; index < argNode.content.length; ++index){
        const node = argNode.content[index]
        if (latexParser.isCommand(node)
            && node.name === 'texorpdfstring'
            && node.args.length === 2) {
            const pdfString = latexParser.stringify(node.args[1])
            const firstArg = node.args[1].content[0]
            if (latexParser.isTextString(firstArg)) {
                firstArg.content = pdfString.slice(1, pdfString.length - 1)
                argNode.content[index] = firstArg
            }
        }
    }
    const caption = latexParser.stringify(argNode).replace(/\n/g, ' ')
    return caption.slice(1, caption.length - 1) // {Title} -> Title
}

function buildFloatNumber(flatNodes: TeXElement[], subFile: boolean) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    if (!configuration.get('view.outline.floats.number.enabled' || ! subFile)) {
        return
    }
    if (flatNodes.length === 0) {
        return
    }
    const counter: {[key: string]: number} = {}

    flatNodes.forEach(section => {
        if (section.type !== TeXElementType.Environment) {
            return
        }
        if (section.label.toLowerCase().startsWith('macro') || section.label.toLowerCase().startsWith('environment')) {
            // DocTeX
            return
        }
        const labelSegments = section.label.split(':')
        counter[labelSegments[0]] = counter[labelSegments[0]] ? counter[labelSegments[0]] + 1 : 1
        labelSegments[0] = `${labelSegments[0]} ${counter[labelSegments[0]]}`
        section.label = labelSegments.join(':')
    })
}

/**
 * Build the number of sections. Also put all non-sections into their
 * leading section. This is to make the subsequent logic clearer.
 */
function buildSectionNumber(config: LaTeXConfig, flatNodes: TeXElement[], subFile: boolean) {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const sectionNumber = subFile && configuration.get('view.outline.numbers.enabled') as boolean
    // All non-section nodes before the first section
    const preambleFloats: TeXElement[] = []
    // Only holds section-like Sections
    const flatSections: TeXElement[] = []

    const lowest = Math.min(...flatNodes
        .filter(node => config.LaTeXSectionDepths[node.name] !== undefined)
        .map(node => config.LaTeXSectionDepths[node.name]))

    // This counter is used to calculate the section numbers. The array
    // holds the current numbering. When developing the numbers, just +1 to
    // the appropriate item and retrieve the sub-array.
    let counter: number[] = []
    flatNodes.forEach(node => {
        if (config.LaTeXSectionDepths[node.name] === undefined) {
            // non-section node
            if (flatSections.length === 0) {
                // no section appeared yet
                preambleFloats.push(node)
            } else {
                flatSections[flatSections.length - 1].children.push(node)
            }
        } else {
            if (sectionNumber && node.type === TeXElementType.Section) {
                const depth = config.LaTeXSectionDepths[node.name] - lowest
                if (depth + 1 > counter.length) {
                    counter = [...counter, ...new Array(depth + 1 - counter.length).fill(0) as number[]]
                } else {
                    counter = counter.slice(0, depth + 1)
                }
                counter[counter.length - 1] += 1
                node.label = `${counter.join('.')} ${node.label}`
            } else if (sectionNumber && node.type === TeXElementType.SectionAst) {
                node.label = `* ${node.label}`
            }
            flatSections.push(node)
        }
    })

    return {preambleFloats, flatSections}
}

function buildNestedFloats(preambleFloats: TeXElement[], flatSections: TeXElement[]) {
    const findChild = (parentNode: TeXElement, childNode: TeXElement): boolean => {
        if (childNode.lineFr >= parentNode.lineFr && childNode.lineTo <= parentNode.lineTo) {
            let added = false
            for (let index = 0; index < parentNode.children.length; index++) {
                const parentCandidate = parentNode.children[index]
                if (findChild(parentCandidate, childNode)) {
                    added = true
                    break
                }
            }
            if (!added) {
                parentNode.children.push(childNode)
            }
            return true
        }
        return false
    }

    // Non-sections may also be nested.
    const preamble = preambleFloats[0] ? [preambleFloats[0]] : []
    for (let index = 1; index < preambleFloats.length; index++) {
        if (!findChild(preamble[preamble.length - 1], preambleFloats[index])) {
            preamble.push(preambleFloats[index])
        }
    }
    flatSections.forEach(section => {
        const children = [section.children[0]]
        for (let index = 1; index < section.children.length; index++) {
            findChild(children[children.length - 1], section.children[index])
        }
    })

    return preamble
}

/**
 * This function builds the hierarchy of a flat {@link TeXElement} array
 * according to the input hierarchy data. This is a two-step process. The
 * first step puts all non-section {@link TeXElement}s into their leading
 * section {@link TeXElement}. The section numbers are also optionally added in
 * this step. Then in the second step, the section {@link TeXElement}s are
 * iterated to build the hierarchy.
 *
 * @param flatStructure The flat sections whose hierarchy is to be built.
 * @param showHierarchyNumber Whether the section numbers should be computed
 * and prepended to section captions.
 * @returns The final sections to be shown with hierarchy.
 */
function buildNestedSections(config: LaTeXConfig, flatSections: TeXElement[]): TeXElement[] {
    const sections: TeXElement[] = []

    const lowest = Math.min(...flatSections
        .filter(node => config.LaTeXSectionDepths[node.name] !== undefined)
        .map(node => config.LaTeXSectionDepths[node.name]))

    flatSections.forEach(section => {
        if (config.LaTeXSectionDepths[section.name] === lowest) {
            // base level section
            sections.push(section)
        } else if (sections.length === 0) {
            // non-base level section, no previous sections available, create one
            sections.push(section)
        } else {
            // Starting from the last base-level section, find out the
            // proper level.
            let currentSection = sections[sections.length - 1]
            while (config.LaTeXSectionDepths[currentSection.name] < config.LaTeXSectionDepths[section.name] - 1) {
                const children = currentSection.children.filter(candidate => config.LaTeXSectionDepths[candidate.name] !== undefined)
                if (children.length > 0) {
                    // If there is a section child
                    currentSection = children[children.length - 1]
                } else {
                    // If there is a jump e.g., section -> subsubsection,
                    // give up finding.
                    break
                }
            }
            currentSection.children.push(section)
        }
    })

    return sections
}

function buildLaTeXSectionToLine(config: LaTeXConfig, structure: TeXElement[], lastLine: number) {
    const sections = structure.filter(section => config.LaTeXSectionDepths[section.name] !== undefined)
    sections.forEach(section => {
        const sameFileSections = sections.filter(candidate =>
            (candidate.filePath === section.filePath) &&
            (candidate.lineFr >= section.lineFr) &&
            (candidate !== section))
        if (sameFileSections.length > 0 && sameFileSections[0].lineFr === section.lineFr) {
            // On the same line, e.g., \section{one}\section{two}
            return
        } else if (sameFileSections.length > 0) {
            section.lineTo = sameFileSections[0].lineFr - 1
        } else {
            section.lineTo = lastLine
        }
        if (section.children.length > 0) {
            buildLaTeXSectionToLine(config, section.children, section.lineTo)
        }
    })
}

function parseRnwChildCommand(content: string, file: string, rootFile: string): {subFile: string, line: number}[] {
    const children: {subFile: string, line: number}[] = []
    const childRegExp = new InputFileRegExp()
    while(true) {
        const result = childRegExp.execChild(content, file, rootFile)
        if (!result) {
            break
        }
        const line = (content.slice(0, result.match.index).match(/\n/g) || []).length
        children.push({subFile: result.path, line})
    }
    return children
}

function refreshLaTeXModelConfig(defaultFloats = ['frame']): LaTeXConfig {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const cmds = configuration.get('view.outline.commands') as string[]
    const envs = configuration.get('view.outline.floats.enabled') as boolean ? ['figure', 'table', ...defaultFloats] : defaultFloats

    const structConfig: LaTeXConfig = {
        LaTeXCommands: {cmds: [], envs: [], secs: []},
        LaTeXSectionDepths: {}
    }

    const hierarchy = (configuration.get('view.outline.sections') as string[])
    hierarchy.forEach((sec, index) => {
        sec.split('|').forEach(cmd => {
            structConfig.LaTeXSectionDepths[cmd] = index
        })
    })

    structConfig.LaTeXCommands = {cmds, envs, secs: hierarchy.map(sec => sec.split('|')).flat()}

    return structConfig
}

export const outline = {
    refreshLaTeXModelConfig,
    parseLaTeXNode,
    buildFloatNumber,
    buildSectionNumber,
    buildNestedFloats,
    buildNestedSections,
    buildLaTeXSectionToLine
}
