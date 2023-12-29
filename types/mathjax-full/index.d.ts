import type { default as TexError } from 'mathjax-full/js/input/tex/TexError.js'
import type { TeX } from 'mathjax-full/js/input/tex.js'
import type { LiteElement } from 'mathjax-full/js/adaptors/lite/Element'
import type { LiteDocument } from 'mathjax-full/js/adaptors/lite/Document.js'
import type { LiteText } from 'mathjax-full/js/adaptors/lite/Text.js'

export type SupportedExtension =
    'action' |
    'ams' |
    'amscd' |
    'autoload' |
    'base' |
    'bbox' |
    'boldsymbol' |
    'braket' |
    'bussproofs' |
    'cancel' |
    'cases' |
    'centernot' |
    'color' |
    'colortbl' |
    'colorv2' |
    'configmacros' |
    'empheq' |
    'enclose' |
    'extpfeil' |
    'gensymb' |
    'html' |
    'mathtools' |
    'mhchem' |
    'newcommand' |
    'noerrors' |
    'noundefined' |
    'physics' |
    'require' |
    'setoptions' |
    'tagformat' |
    'textcomp' |
    'textmacros' |
    'unicode' |
    'upgreek' |
    'verb'

export type MacrosOption = {
    [name: string]: object;
}

export type TexOption = {
    packages?: readonly SupportedExtension[],
    inlineMath?: readonly [string, string][],
    displayMath?: readonly [string, string][],
    processEscapes?: boolean,
    processEnvironments?: boolean,
    processRefs?: boolean,
    digits?: RegExp,
    tags?: 'all' | 'ams' | 'none',
    tagSide?: 'right' | 'left',
    tagIndent?: string,
    useLabelIds?: boolean,
    maxMacros?: number,
    maxBuffer?: number,
    baseURL?: string,
    macros?: MacrosOption,
    formatError?: (jax: TeX<LiteElement, LiteText, LiteDocument>, message: TexError) => unknown
}

export type SvgOption = {
    scale?: number,
    minScale?: number,
    mtextInheritFont?: boolean,
    merrorInheritFont?: boolean,
    mathmlSpacing?: boolean,
    skipAttributes?: readonly { [attrname: string]: boolean },
    exFactor?: number,
    displayAlign?: 'left' | 'center' | 'right',
    displayIndent?: number,
    fontCache?: 'local' | 'global' | 'none',
    internalSpeechTitles?: boolean
}

export type ConvertOption = {
    display?: boolean,
    em?: number,
    ex?: number,
    containerWidth?: number,
    lineWidth?: number,
    scale?: number
}
