export interface bibtexTidyOptions {
    omit?: string[],
    curly?: boolean,
    numeric?: boolean,
    space?: number,
    tab?: boolean,
    align?: number,
    sort?: string[],
    merge?: boolean,
    stripEnclosingBraces?: boolean,
    dropAllCaps?: boolean,
    escape?: boolean,
    sortFields?: string[],
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
