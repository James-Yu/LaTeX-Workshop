export interface bibtexTidyOptions {
    omit?: string[] | boolean,
    curly?: boolean,
    numeric?: boolean,
    space?: number | boolean,
    tab?: boolean,
    align?: number | boolean,
    sort?: string[] | boolean,
    merge?: boolean,
    stripEnclosingBraces?: boolean,
    dropAllCaps?: boolean,
    escape?: boolean,
    sortFields?: string[] | boolean,
    stripComments?: boolean,
    encodeUrls?: boolean,
    tidyComments?: boolean
}

export interface bibtexTidyWarning {
    code: string,
    message: string,
    entry: object,
    duplicateOf?: object
}

export function tidy(input: string, options: bibtexTidyOptions): {bibtex: string, warnings: bibtexTidyWarning[], entries: any}
