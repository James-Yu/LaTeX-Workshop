import * as vscode from 'vscode'
import { bibtexParser } from 'latex-utensils'
import { lw } from '../../lw'


const logger = lw.log('Format', 'Bib')

export declare type BibtexEntry = bibtexParser.Entry | bibtexParser.StringEntry

/**
 * Read the indentation from vscode configuration
 *
 * @param tab VSCode configuration for bibtex-format.tab
 * @return the indentation as a string or undefined if the configuration variable is not correct
 */
function getBibtexFormatTab(tab: string): string | undefined {
    if (tab === 'tab') {
        return '\t'
    } else {
        const res = /^(\d+)( spaces)?$/.exec(tab)
        if (res) {
            const nSpaces = parseInt(res[1], 10)
            return ' '.repeat(nSpaces)
        } else {
            return
        }
    }
}

type BibtexFormatConfig = {
    tab: string,
    left: string,
    right: string,
    case: {
        field: 'UPPERCASE' | 'lowercase',
        type: 'UPPERCASE' | 'lowercase'
    },
    trailingComma: boolean,
    sort: string[],
    alignOnEqual: boolean,
    sortFields: boolean,
    fieldsOrder: string[],
    firstEntries: string[]
}

export function getBibtexFormatConfig(scope: vscode.ConfigurationScope | undefined): BibtexFormatConfig {
    const config = vscode.workspace.getConfiguration('latex-workshop', scope)
    const leftright = config.get('bibtex-format.surround') === 'Curly braces' ? [ '{', '}' ] : [ '"', '"']
    let tabs: string | undefined = getBibtexFormatTab(config.get('bibtex-format.tab') as string)
    if (tabs === undefined) {
        logger.log(`Wrong value for bibtex-format.tab: ${config.get('bibtex-format.tab')}`)
        logger.log('Setting bibtex-format.tab to \'2 spaces\'')
        tabs = '  '
    }
    const formatConfig: BibtexFormatConfig = {
        tab: tabs,
        case: {
            field: config.get('bibtex-format.case.field') as ('UPPERCASE' | 'lowercase'),
            type: config.get('bibtex-format.case.type') as ('UPPERCASE' | 'lowercase')
        },
        left: leftright[0],
        right: leftright[1],
        trailingComma: config.get('bibtex-format.trailingComma') as boolean,
        sort :config.get('bibtex-format.sortby') as string[],
        alignOnEqual: config.get('bibtex-format.align-equal.enabled') as boolean,
        sortFields: config.get('bibtex-fields.sort.enabled') as boolean,
        fieldsOrder: config.get('bibtex-fields.order') as string[],
        firstEntries: config.get('bibtex-entries.first') as string[]
    }
    logger.log(`Bibtex format config: ${JSON.stringify(formatConfig)}`)
    return formatConfig
}

/**
 * Sorting function for bibtex entries
 * @param keys Array of sorting keys
 */
export function bibtexSort(duplicates: Set<bibtexParser.Entry>, config: BibtexFormatConfig): (a: BibtexEntry, b: BibtexEntry) => number {
    return (a, b) => bibtexSortSwitch(a, b, duplicates, config)
}

function bibtexSortSwitch(a: BibtexEntry, b: BibtexEntry, duplicates: Set<bibtexParser.Entry>, config: BibtexFormatConfig): number {
    const firstEntryCompare = bibtexSortFirstEntries(config.firstEntries, a, b)
    if (firstEntryCompare !== 0) {
        return firstEntryCompare
    }
    const keys = config.sort
    let r = 0
    for (const key of keys) {
        // Select the appropriate sort function
        switch (key) {
            case 'key':
                r = bibtexSortByKey(a, b)
                break
            case 'year-desc':
                r = -bibtexSortByField('year', a, b, config)
                break
            case 'type':
                r = bibtexSortByType(a, b)
                break
            case 'month':
                r = bibtexSortByMonth(a, b, config)
                break
            default:
                r = bibtexSortByField(key, a, b, config)
        }
        // Compare until different
        if (r !== 0) {
            break
        }
    }
    if (r === 0 && bibtexParser.isEntry(a)) {
        // It seems that items earlier in the list appear as the variable b here, rather than a
        duplicates.add(a)
    }
    return r
}

/**
 * If one of the entries `a` or `b` is in `firstEntries` or `stickyEntries`, return an order.
 * Otherwise, return undefined
 */
function bibtexSortFirstEntries(firstEntries: string[], a: BibtexEntry, b: BibtexEntry): number {
    const aFirst = firstEntries.includes(a.entryType)
    const bFirst = firstEntries.includes(b.entryType)
    if (aFirst && !bFirst) {
        return -1
    } else if (!aFirst && bFirst) {
        return 1
    } else if (aFirst && bFirst) {
        const aIndex = firstEntries.indexOf(a.entryType)
        const bIndex = firstEntries.indexOf(b.entryType)
        if (aIndex < bIndex) {
            return -1
        } else if (aIndex > bIndex) {
            return 1
        } else {
            return 0
        }
    }
    return 0
}

/**
 * Handles all sorting keys that are some bibtex field name
 * @param fieldName which field name to sort by
 */
function bibtexSortByField(fieldName: string, a: BibtexEntry, b: BibtexEntry, config: BibtexFormatConfig): number {
    const fieldA = getFieldString(a, fieldName, config).replace(/{|}/g, '')
    const fieldB = getFieldString(b, fieldName, config).replace(/{|}/g, '')

    return fieldA.localeCompare(fieldB)
}

function bibtexSortByKey(a: BibtexEntry, b: BibtexEntry): number {
    let aKey: string | undefined = undefined
    let bKey: string | undefined = undefined
    if (bibtexParser.isEntry(a)) {
        aKey = a.internalKey
    }
    if (bibtexParser.isEntry(b)) {
        bKey = b.internalKey
    }
    if (!aKey && !bKey) {
        return 0
    } else if (!aKey) {
        return -1 // sort undefined keys first
    } else if (!bKey) {
        return 1
    } else {
        return aKey.localeCompare(bKey)
    }
}

function bibtexSortByType(a: BibtexEntry, b: BibtexEntry): number {
    return a.entryType.localeCompare(b.entryType)
}

function bibtexSortByMonth(a: BibtexEntry, b: BibtexEntry, config: BibtexFormatConfig): number {
    const monthOrder = [ 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec' ]
    return monthOrder.indexOf(getFieldString(a, 'month', config).toLowerCase()) - monthOrder.indexOf(getFieldString(b, 'month', config).toLowerCase())
}

/**
 * Creates an aligned string from a bibtexParser.Entry
 * @param entry the bibtexParser.Entry
 */
export function bibtexFormat(entry: bibtexParser.Entry, config: BibtexFormatConfig): string {
    let s = ''

    s += '@' + (config.case.type === 'lowercase' ? entry.entryType.toLowerCase() : entry.entryType.toUpperCase()) + '{' + (entry.internalKey ?? '')

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

    const convertCase = config.case.field === 'lowercase' ? (str: string) => str.toLowerCase() : (str: string) => str.toUpperCase()
    fields.forEach(field => {
        s += ',\n' + config.tab + convertCase(field.name)
        let indent = config.tab + ' '.repeat(field.name.length)
        if (config.alignOnEqual) {
            const adjustedLength = ' '.repeat(maxFieldLength - field.name.length)
            s += adjustedLength
            indent += adjustedLength
        }
        s += ' = '
        indent += ' '.repeat(' = '.length + config.left.length)
        s += fieldToString(field.value, indent, config)
    })

    if (config.trailingComma) {
        s += ','
    }

    s += '\n}'

    return s
}

/**
 * Return the string value of a named field for an entry, or empty string if not present.
 */
function getFieldString(entry: BibtexEntry, fieldName: string, config: BibtexFormatConfig): string {
    if (bibtexParser.isEntry(entry)) {
        for (let i = 0; i < entry.content.length; i++) {
            if (entry.content[i].name === fieldName) {
                return fieldToString(entry.content[i].value, '', config)
            }
        }
    }
    return ''
}

/**
 * Convert a bibtexParser.FieldValue to a string
 * @param field the bibtexParser.FieldValue to parse
 * @param prefix what to add to every but the first line of a multiline field.
 */
function fieldToString(field: bibtexParser.FieldValue, prefix: string, config: BibtexFormatConfig): string {
    const left = config.left
    const right = config.right
    switch(field.kind) {
        case 'abbreviation':
        case 'number':
            return field.content
        case 'text_string': {
            if (prefix !== '') {
                const lines = field.content.split(/\r\n|\r|\n/g)
                for (let i = 1; i < lines.length; i++) {
                    lines[i] = prefix + lines[i].trimStart()
                }
                return left + lines.join('\n') + right
            } else {
                return left + field.content + right
            }
        }
        case 'concat':
            return field.content.map(value => fieldToString(value, prefix, config)).reduce((acc, cur) => {return acc + ' # ' + cur})
        default:
            return ''
    }
}

/**
 * Sorting function for bibtex entries
 * @param keys Array of sorting keys
 */
function bibtexSortFields(keys: string[]): (a: bibtexParser.Field, b: bibtexParser.Field) => number {
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
