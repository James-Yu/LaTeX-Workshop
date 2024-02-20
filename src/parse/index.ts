import { parser as parse } from './parser'
import { findTeX, findMath, findEndPair } from './find'
import { findMacros } from './newcommandfinder'

export const parser = {
    parse,
    find: {
        tex: findTeX,
        math: findMath,
        macro: findMacros,
        endPair: findEndPair
    }
}
