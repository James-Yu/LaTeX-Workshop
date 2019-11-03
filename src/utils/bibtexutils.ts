import {bibtexParser} from 'latex-utensils'

export function bibtexFormat(entry: bibtexParser.Entry): string {
    let s = ''
    const tab = '  '

    s += '@' + entry.entryType + '{' + (entry.internalKey ? entry.internalKey : '')

    // Find the longest field name in entry
    let maxFieldLength = 0
    entry.content.forEach(field => {
        maxFieldLength = Math.max(maxFieldLength, field.name.length)
    })

    entry.content.forEach(field => {
        s += ',\n' + tab + field.name + ' '.repeat(maxFieldLength - field.name.length) + ' = ' + fieldToString(field.value)
    })

    s += '\n}'

    return s
}

function fieldToString(field: bibtexParser.FieldValue): string {
    switch(field.kind) {
        case 'abbreviation':
        case 'number':
            return field.content
        case 'text_string':
            return '{' + field.content + '}'
        case 'concat':
            return field.content.map(value => fieldToString(value)).reduce((acc, cur) => {return acc + ' # ' + cur})
        default:
            return ''
    }
}
