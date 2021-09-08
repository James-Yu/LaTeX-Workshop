import * as vscode from 'vscode'
import type {bibtexParser} from 'latex-utensils'

export interface BibtexFormatConfig {
    tab: string,
    left: string,
    right: string,
    case: 'UPPERCASE' | 'lowercase',
    trailingComma: boolean,
    sort: string[],
    alignOnEqual: boolean,
    sortFields: boolean,
    fieldsOrder: string[],
    firstEntries: string[]
}

export declare type BibtexEntry = bibtexParser.Entry | bibtexParser.StringEntry

/**
 * Read the indentation from vscode configuration
 *
 * @param config VSCode workspace configuration
 * @return the indentation as a string or undefined if the configuration variable is not correct
 */
export function getBibtexFormatTab(config: vscode.WorkspaceConfiguration): string | undefined {
    const tab = config.get('bibtex-format.tab') as string
    if (tab === 'tab') {
        return '\t'
    } else {
        const res = /^(\d+)( spaces)?$/.exec(tab)
        if (res) {
            const nSpaces = parseInt(res[1], 10)
            return ' '.repeat(nSpaces)
        } else {
            return undefined
        }
    }
}

/**
 * Sorting function for bibtex entries
 * @param keys Array of sorting keys
 */
export function bibtexSort(configuration: BibtexFormatConfig, duplicates: Set<bibtexParser.Entry>): (a: bibtexParser.Entry, b: bibtexParser.Entry) => number {
    const keys = configuration.sort
    const firstEntries = configuration.firstEntries
    return function (a, b) {
        let r = 0
        for (const key of keys) {
            // Select the appropriate sort function
            switch (key) {
                case 'key':
                    r = bibtexSortByKey(firstEntries, a, b)
                    break
                case 'year-desc':
                    r = -bibtexSortByField(firstEntries, 'year', a, b)
                    break
                case 'type':
                    r = bibtexSortByType(firstEntries, a, b)
                    break
                default:
                    r = bibtexSortByField(firstEntries, key, a, b)
            }
            // Compare until different
            if (r !== 0) {
                break
            }
        }
        if (r === 0) {
            // It seems that items earlier in the list appear as the variable b here, rather than a
            duplicates.add(a)
        }
        return r
    }
}

/**
 * If one of the entries `a` or `b` is in `firstEntries` or `stickyEntries`, return an order.
 * Otherwise, return undefined
 */
function bibtexSortFirstEntries(firstEntries: string[], a: bibtexParser.Entry, b: bibtexParser.Entry): number | undefined {
    const aFirst = firstEntries.includes(a.entryType)
    const bFirst = firstEntries.includes(b.entryType)
    if (aFirst && !bFirst) {
        return -1
    } else if (!aFirst && bFirst) {
        return 1
    } else if (aFirst && bFirst) {
        const aIndex = firstEntries.indexOf(a.entryType)
        const bIndex = firstEntries.indexOf(b.entryType)
        if (aIndex <= bIndex) {
            return -1
        } else {
            return 1
        }
    }
    return undefined
}

/**
 * Handles all sorting keys that are some bibtex field name
 * @param fieldName which field name to sort by
 */
function bibtexSortByField(firstEntries: string[], fieldName: string, a: bibtexParser.Entry, b: bibtexParser.Entry): number {

    const firstEntriesOrder = bibtexSortFirstEntries(firstEntries, a, b)
    if (firstEntriesOrder) {
        return firstEntriesOrder
    }

    let fieldA: string = ''
    let fieldB: string = ''

    for(let i = 0; i < a.content.length; i++) {
        if (a.content[i].name === fieldName) {
            fieldA = fieldToString(a.content[i].value, '', '', '')
            break
        }
    }
    for(let i = 0; i < b.content.length; i++) {
        if (b.content[i].name === fieldName) {
            fieldB = fieldToString(b.content[i].value, '', '', '')
            break
        }
    }

    // Remove braces to sort properly
    fieldA = fieldA.replace(/{|}/g, '')
    fieldB = fieldB.replace(/{|}/g, '')

    return fieldA.localeCompare(fieldB)
}

function bibtexSortByKey(firstEntries: string[], a: bibtexParser.Entry, b: bibtexParser.Entry): number {
    const firstEntriesOrder = bibtexSortFirstEntries(firstEntries, a, b)
    if (firstEntriesOrder) {
        return firstEntriesOrder
    }
    if (!a.internalKey && !b.internalKey) {
        return 0
    } else if (!a.internalKey) {
        return -1 // sort undefined keys first
    } else if (!b.internalKey) {
        return 1
    } else {
        return a.internalKey.localeCompare(b.internalKey)
    }
}

function bibtexSortByType(firstEntries: string[], a: bibtexParser.Entry, b: bibtexParser.Entry): number {
    const firstEntriesOrder = bibtexSortFirstEntries(firstEntries, a, b)
    if (firstEntriesOrder) {
        return firstEntriesOrder
    }
    return a.entryType.localeCompare(b.entryType)
}

/**
 * Creates an aligned string from a bibtexParser.Entry
 * @param entry the bibtexParser.Entry
 * @param config the bibtex format options
 */
export function bibtexFormat(entry: bibtexParser.Entry, config: BibtexFormatConfig): string {
    let s = ''

    s += '@' + entry.entryType + '{' + (entry.internalKey ? entry.internalKey : '')

    // Find the longest field name in entry
    let maxFieldLength = 0
    if (config.alignOnEqual) {
        entry.content.forEach(field => {
            maxFieldLength = Math.max(maxFieldLength, field.name.length)
        })
    }

    let fields: bibtexParser.Field[] = entry.content
    if (config.sortFields) {
        fields = entry.content.sort(bibtexSortFields(config.fieldsOrder))
    }

    fields.forEach(field => {
        s += ',\n' + config.tab + (config.case === 'lowercase' ? field.name : field.name.toUpperCase())
        let indent = config.tab + ' '.repeat(field.name.length)
        if (config.alignOnEqual) {
            const adjustedLength = ' '.repeat(maxFieldLength - field.name.length)
            s += adjustedLength
            indent += adjustedLength
        }
        s += ' = '
        indent += ' '.repeat(' = '.length + config.left.length)
        s += fieldToString(field.value, config.left, config.right, indent)
    })

    if (config.trailingComma) {
        s += ','
    }

    s += '\n}'

    return s
}

/**
 * Convert a bibtexParser.FieldValue to a string
 * @param field the bibtexParser.FieldValue to parse
 * @param left what to put before a text_string (i.e. `{` or `"`)
 * @param right what to put after a text_string (i.e. `}` or `"`)
 * @param prefix what to add to every but the first line of a multiline field.
 */
function fieldToString(field: bibtexParser.FieldValue, left: string, right: string, prefix: string): string {
    switch(field.kind) {
        case 'abbreviation':
        case 'number':
            return field.content
        case 'text_string': {
            if (prefix !== '') {
                const lines = field.content.split(/\r\n|\r|\n/g)
                for (let i = 1; i < lines.length; i++) {
                    lines[i] = prefix + lines[i].trimLeft()
                }
                return left + lines.join('\n') + right
            } else {
                return left + field.content + right
            }
        }
        case 'concat':
            return field.content.map(value => fieldToString(value, left, right, prefix)).reduce((acc, cur) => {return acc + ' # ' + cur})
        default:
            return ''
    }
}

/**
 * Sorting function for bibtex entries
 * @param keys Array of sorting keys
 */
export function bibtexSortFields(keys: string[]): (a: bibtexParser.Field, b: bibtexParser.Field) => number {
    return function (a, b) {
        const indexA = keys.indexOf(a.name)
        const indexB = keys.indexOf(b.name)

        if (indexA === -1 && indexB === -1) {
            return a.name.localeCompare(b.name)
        } else if (indexA === -1) {
           return 1
        } else if (indexB === -1) {
           return -1
        } else {
            return indexA - indexB
        }
    }
}
