import * as workerpool from 'workerpool'
import type * as Ast from '@unified-latex/unified-latex-types'
// @ts-expect-error This import will originates from 'out/src/' to .cjs in 'src/'
import * as unifiedLaTeXParse from '../../../../src/lib/unified-latex-util-parse.cjs'
// @ts-expect-error This import will originates from 'out/src/' to .cjs in 'src/'
import * as unifiedLaTeXArgs from '../../../../src/lib/unified-latex-util-arguments.cjs'

type UnifiedParser = { parse: (content: string) => Ast.Root }
let unifiedParser: UnifiedParser

function parse(content: string, macros: Ast.MacroInfoRecord, environments: Ast.EnvInfoRecord): Ast.Root {
    return (unifiedParser ?? reset(macros, environments)).parse(content)
}

function attachArgs(ast: Ast.Root, macros: Ast.MacroInfoRecord): Ast.Root | undefined {
    (unifiedLaTeXArgs.attachMacroArgs as (tree: Ast.Ast, macros: Ast.MacroInfoRecord) => void)(ast, macros)
    return ast
}

type UnifiedParserOption = {
    mode?: 'math' | 'regular',
    macros?: Ast.MacroInfoRecord,
    environments?: Ast.EnvInfoRecord,
    flags?: {
        atLetter?: boolean,
        expl3?: boolean,
        autodetectExpl3AndAtLetter?: boolean
    }
}

function reset(macros: Ast.MacroInfoRecord, environments: Ast.EnvInfoRecord): UnifiedParser {
    unifiedParser = (unifiedLaTeXParse.getParser as (options: UnifiedParserOption) => UnifiedParser)(
        { macros, environments, flags: { autodetectExpl3AndAtLetter: true } })
    return unifiedParser
}

const workers = {
    parse,
    attachArgs,
    reset
}

export type UnifiedWorker = typeof workers

workerpool.worker(workers)
