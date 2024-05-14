import * as vscode from 'vscode'
import * as path from 'path'
import type * as Ast from '@unified-latex/unified-latex-types'
import { lw } from '../../lw'
import { type TeXElement, TeXElementType } from '../../types'
import { resolveFile } from '../../utils/utils'
import { InputFileRegExp } from '../../utils/inputfilepath'


import { argContentToStr } from '../../utils/parser'

const logger = lw.log('Structure', 'LaTeX')

type StructureConfig = {
    // The LaTeX macros to be extracted.
    macros: {cmds: string[], envs: string[], secs: string[]},
    // The correspondance of section types and depths. Start from zero is
    // the top-most section (e.g., chapter).
    readonly secIndex: {[cmd: string]: number},
    readonly texDirs: string[],
    subFile: boolean,
    // view.outline.floats.caption.enabled
    caption: boolean
}
type FileStructureCache = {
    [filePath: string]: TeXElement[]
}


export async function construct(filePath: string | undefined = undefined, subFile: boolean = true): Promise<TeXElement[]> {
    filePath = filePath ?? lw.root.file.path
    if (filePath === undefined) {
        return []
    }

    const config = refreshLaTeXModelConfig(subFile)
    const structs: FileStructureCache = {}
    await constructFile(filePath, config, structs)
    // In rare cases, the following struct may be undefined. Typically in tests
    // where roots are changed rapidly.
    let struct = subFile ? insertSubFile(structs) : structs[filePath] ?? []
    struct = nestNonSection(struct)
    struct = nestSection(struct, config)
    fixSectionToLine(struct, config, Number.MAX_SAFE_INTEGER)
    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    if (subFile && configuration.get('view.outline.floats.number.enabled') as boolean) {
        struct = addFloatNumber(struct)
    }
    if (subFile && configuration.get('view.outline.numbers.enabled') as boolean) {
        struct = addSectionNumber(struct, config)
    }
    return struct
}

async function constructFile(filePath: string, config: StructureConfig, structs: FileStructureCache): Promise<void> {
    if (structs[filePath] !== undefined) {
        return
    }
    await lw.cache.wait(filePath)
    const content = lw.cache.get(filePath)?.content
    const ast = lw.cache.get(filePath)?.ast
    if (!content || !ast) {
        logger.log(`Error loading ${content ? 'AST' : 'content'} during structuring: ${filePath} .`)
        return
    }
    // Get a list of rnw child chunks
    const rnwSub = parseRnwChildMacro(content, filePath, lw.root.file.path || '')

    // Parse each base-level node. If the node has contents, that function
    // will be called recursively.
    const rootElement = { children: [] }
    structs[filePath] = rootElement.children

    let inAppendix = false
    for (const node of ast.content) {
        if (['string', 'parbreak', 'whitespace'].includes(node.type)) {
            continue
        }
        // Appendix is a one-way journey. Once in it, always in it.
        if (await parseNode(node, rnwSub, rootElement, filePath, config, structs, inAppendix)) {
            inAppendix = true
        }
    }
}

async function parseNode(
        node: Ast.Node,
        rnwSub: ReturnType<typeof parseRnwChildMacro>,
        root: { children: TeXElement[] },
        filePath: string,
        config: StructureConfig,
        structs: FileStructureCache,
        inAppendix: boolean): Promise<boolean> {
    const attributes = {
        lineFr: (node.position?.start.line ?? 1) - 1,
        lineTo: (node.position?.end.line ?? 1) - 1,
        filePath, children: []
    }
    let element: TeXElement | undefined
    if (node.type === 'macro' && config.macros.secs.includes(node.content) && node.args?.[2].openMark === '{') {
        // To use a macro as an outline item, the macro must have an explicit
        // mandatory argument e.g. \section{} instead of \section. This is to
        // ignore cases like \titleformat{\section} when \titleformat is not
        // globbing arguments in unified-latex.
        element = {
            type: node.args?.[0]?.content[0] ? TeXElementType.SectionAst : TeXElementType.Section,
            name: node.content,
            label: argContentToStr(((node.args?.[1]?.content?.length ?? 0) > 0 ? node.args?.[1]?.content : node.args?.[2]?.content) || []),
            appendix: inAppendix,
            ...attributes
        }
    } else if (node.type === 'macro' && config.macros.cmds.includes(node.content)) {
        const argStr = argContentToStr(node.args?.[2]?.content || [])
        element = {
            type: TeXElementType.Macro,
            name: node.content,
            label: `#${node.content}` + (argStr ? `: ${argStr}` : ''),
            ...attributes
        }
    } else if (node.type === 'macro' && node.content === 'appendix') {
        inAppendix = true
    } else if ((node.type === 'environment') && node.env === 'frame') {
        const frameTitleMacro: Ast.Macro | undefined = node.content.find(sub => sub.type === 'macro' && sub.content === 'frametitle') as Ast.Macro | undefined
        const caption = argContentToStr(node.args?.[3]?.content || []) || argContentToStr(frameTitleMacro?.args?.[2]?.content || [])
        element = {
            type: TeXElementType.Environment,
            name: node.env,
            label: `${node.env.charAt(0).toUpperCase()}${node.env.slice(1)}` + (config.caption && caption ? `: ${caption}` : ''),
            ...attributes
        }
    } else if ((node.type === 'environment') && (
                (node.env === 'figure' || node.env === 'figure*') && config.macros.envs.includes('figure') ||
                (node.env === 'table' || node.env === 'table*') && config.macros.envs.includes('table'))) {
        const captionMacro: Ast.Macro | undefined = node.content.find(sub => sub.type === 'macro' && sub.content === 'caption') as Ast.Macro | undefined
        const caption = argContentToStr(captionMacro?.args?.[1]?.content || [])
        if (node.env.endsWith('*')) {
            node.env = node.env.slice(0, -1)
        }
        element = {
            type: TeXElementType.Environment,
            name: node.env,
            label: `${node.env.charAt(0).toUpperCase()}${node.env.slice(1)}` + (config.caption && caption ? `: ${caption}` : ''),
            ...attributes
        }
    } else if ((node.type === 'environment') && (node.env === 'macro' || node.env === 'environment')) {
        // DocTeX: \begin{macro}{<macro>}
        const caption = (node.content[0] as Ast.Group | undefined)?.content[0] as Ast.String | undefined
        element = {
            type: TeXElementType.Environment,
            name: node.env,
            label: `${node.env.charAt(0).toUpperCase()}${node.env.slice(1)}` + (config.caption && caption ? `: ${caption.content}` : ''),
            ...attributes
        }
    } else if ((node.type === 'environment' || node.type === 'mathenv') && config.macros.envs.includes(node.env)) {
        element = {
            type: TeXElementType.Environment,
            name: node.env,
            label: `${node.env.charAt(0).toUpperCase()}${node.env.slice(1)}`,
            ...attributes
        }
    } else if (node.type === 'macro' && ['input', 'InputIfFileExists', 'include', 'SweaveInput', 'subfile', 'loadglsentries', 'markdownInput'].includes(node.content)) {
        const arg0 = argContentToStr(node.args?.[0]?.content || [])
        const subFile = resolveFile([ path.dirname(filePath), path.dirname(lw.root.file.path || ''), ...config.texDirs ], arg0)
        if (subFile) {
            element = {
                type: TeXElementType.SubFile,
                name: node.content,
                label: config.subFile ? subFile : arg0,
                ...attributes
            }
            if (config.subFile) {
                await constructFile(subFile, config, structs)
            }
        }
    } else if (node.type === 'macro' && ['import', 'inputfrom', 'includefrom'].includes(node.content)) {
        const arg0 = argContentToStr(node.args?.[0]?.content || [])
        const arg1 = argContentToStr(node.args?.[1]?.content || [])
        const subFile = resolveFile([ arg0, path.join(path.dirname(lw.root.file.path || ''), arg0 )], arg1)
        if (subFile) {
            element = {
                type: TeXElementType.SubFile,
                name: node.content,
                label: config.subFile ? subFile : arg1,
                ...attributes
            }
            if (config.subFile) {
                await constructFile(subFile, config, structs)
            }
        }
    } else if (node.type === 'macro' && ['subimport', 'subinputfrom', 'subincludefrom'].includes(node.content)) {
        const arg0 = argContentToStr(node.args?.[0]?.content || [])
        const arg1 = argContentToStr(node.args?.[1]?.content || [])
        const subFile = resolveFile([ path.dirname(filePath) ], path.join(arg0, arg1))
        if (subFile) {
            element = {
                type: TeXElementType.SubFile,
                name: node.content,
                label: config.subFile ? subFile : arg1,
                ...attributes
            }
            if (config.subFile) {
                await constructFile(subFile, config, structs)
            }
        }
    }
    if (rnwSub.length > 0 && rnwSub[rnwSub.length - 1].line >= attributes.lineFr) {
        const rnw = rnwSub.pop()
        if (rnw !== undefined) {
            root.children.push({
                type: TeXElementType.SubFile,
                name: 'RnwChild',
                label: config.subFile ? rnw.subFile : rnw.path,
                lineFr: attributes.lineFr,
                lineTo: attributes.lineTo,
                filePath, children: []
            })
            if (config.subFile) {
                await constructFile(rnw.subFile, config, structs)
            }
        }
    }
    if (element !== undefined) {
        root.children.push(element)
        root = element
    }
    if ('content' in node && typeof node.content !== 'string') {
        for (const sub of node.content) {
            if (['string', 'parbreak', 'whitespace'].includes(sub.type)) {
                continue
            }
            inAppendix = await parseNode(sub, rnwSub, root, filePath, config, structs, inAppendix)
        }
    }

    return inAppendix
}

function insertSubFile(structs: FileStructureCache, struct?: TeXElement[], traversed?: string[]): TeXElement[] {
    if (lw.root.file.path === undefined) {
        return []
    }
    struct = struct ?? structs[lw.root.file.path] ?? []
    traversed = traversed ?? [lw.root.file.path]
    let elements: TeXElement[] = []
    for (const element of struct) {
        if (element.type === TeXElementType.SubFile
            && structs[element.label]
            && !traversed.includes(element.label)) {
            elements = [...elements, ...insertSubFile(structs, structs[element.label], [...traversed, element.label])]
            continue
        }
        if (element.children.length > 0) {
            element.children = insertSubFile(structs, element.children)
        }
        elements.push(element)
    }
    return elements
}

function nestNonSection(struct: TeXElement[]): TeXElement[] {
    const elements: TeXElement[] = []
    let currentSection: TeXElement | undefined
    for (const element of struct) {
        if (element.type === TeXElementType.Section || element.type === TeXElementType.SectionAst) {
            elements.push(element)
            currentSection = element
        } else if (currentSection === undefined) {
            elements.push(element)
        } else {
            currentSection.children.push(element)
        }
        if (element.children.length > 0) {
            element.children = nestNonSection(element.children)
        }
    }
    return elements
}

function nestSection(struct: TeXElement[], config: StructureConfig): TeXElement[] {
    const stack: TeXElement[] = []
    const elements: TeXElement[] = []
    for (const element of struct) {
        if (element.type !== TeXElementType.Section && element.type !== TeXElementType.SectionAst) {
            elements.push(element)
        } else if (stack.length === 0) {
            stack.push(element)
            elements.push(element)
        } else if (config.secIndex[element.name] <= config.secIndex[stack[0].name]) {
            stack.length = 0
            stack.push(element)
            elements.push(element)
        } else if (config.secIndex[element.name] > config.secIndex[stack[stack.length - 1].name]) {
            stack[stack.length - 1].children.push(element)
            stack.push(element)
        } else {
            while(config.secIndex[element.name] <= config.secIndex[stack[stack.length - 1].name]) {
                stack.pop()
            }
            stack[stack.length - 1].children.push(element)
            stack.push(element)
        }
    }
    return elements
}

function fixSectionToLine(structure: TeXElement[], config: StructureConfig, lastLine: number) {
    const sections = structure.filter(section => config.secIndex[section.name] !== undefined)
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
            fixSectionToLine(section.children, config, section.lineTo)
        }
    })
}

function addFloatNumber(struct: TeXElement[], counter: {[env: string]: number} = {}): TeXElement[] {
    for (const element of struct) {
        if (element.type === TeXElementType.Environment && element.name !== 'macro' && element.name !== 'environment') {
            counter[element.name] = (counter[element.name] ?? 0) + 1
            const parts = element.label.split(':')
            parts[0] += ` ${(counter[element.name] ?? 0).toString()}`
            element.label = parts.join(':')
        }
        if (element.children.length > 0) {
            addFloatNumber(element.children, counter)
        }
    }
    return struct
}

function addSectionNumber(struct: TeXElement[], config: StructureConfig, tag?: string, lowest?: number): TeXElement[] {
    tag = tag ?? ''
    lowest = lowest ?? Math.min(...struct
        .filter(element => config.secIndex[element.name] !== undefined)
        .map(element => config.secIndex[element.name]))
    let counter: {[level: number]: number} = {}
    let inAppendix = false
    for (const element of struct) {
        if (element.appendix && !inAppendix) {
            inAppendix = true
            counter = {}
        }
        if (config.secIndex[element.name] === undefined) {
            continue
        }
        if (element.type === TeXElementType.Section) {
            counter[config.secIndex[element.name]] = (counter[config.secIndex[element.name]] ?? 0) + 1
        }
        let sectionNumber = tag +
            '0.'.repeat(config.secIndex[element.name] - lowest) +
            (counter[config.secIndex[element.name]] ?? 0).toString()
        if (inAppendix) {
            const segments = sectionNumber.split('.')
            segments[0] = String.fromCharCode(parseInt(sectionNumber.split('.')[0]) + 64)
            sectionNumber = segments.join('.')
        }
        element.label = `${element.type === TeXElementType.Section ? sectionNumber : '*'} ${element.label}`
        if (element.children.length > 0) {
            addSectionNumber(element.children, config, sectionNumber + '.', config.secIndex[element.name] + 1)
        }
    }
    return struct
}

function parseRnwChildMacro(content: string, file: string, rootFile: string): {subFile: string, path: string, line: number}[] {
    const children: {subFile: string, path: string, line: number}[] = []
    const childRegExp = new InputFileRegExp()
    while(true) {
        const result = childRegExp.execChild(content, file, rootFile)
        if (!result) {
            break
        }
        const line = (content.slice(0, result.match.index).match(/\n/g) || []).length
        children.push({subFile: result.path, path: result.match.path, line})
    }
    return children
}

function refreshLaTeXModelConfig(subFile: boolean = true, defaultFloats = ['frame']): StructureConfig {
    const configuration = vscode.workspace.getConfiguration('latex-workshop')

    const structConfig: StructureConfig = {
        macros: {
            cmds: configuration.get('view.outline.commands') as string[],
            envs: configuration.get('view.outline.floats.enabled') as boolean ? ['figure', 'table', ...defaultFloats] : defaultFloats,
            secs: []
        },
        secIndex: {},
        texDirs: configuration.get('latex.texDirs') as string[],
        subFile,
        caption: configuration.get('view.outline.floats.caption.enabled') as boolean
    }

    const hierarchy = configuration.get('view.outline.sections') as string[]
    hierarchy.forEach((sec, index) => {
        sec.split('|').forEach(cmd => {
            structConfig.secIndex[cmd] = index
        })
    })

    structConfig.macros.secs = hierarchy.map(sec => sec.split('|')).flat()

    return structConfig
}

export const outline = {
    refreshLaTeXModelConfig,
    parseNode,
    nestNonSection,
    nestSection,
    addFloatNumber,
    addSectionNumber
}
