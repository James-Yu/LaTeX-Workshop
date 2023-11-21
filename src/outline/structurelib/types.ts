export enum TeXElementType { Environment, Command, Section, SectionAst, SubFile, BibItem, BibField }

export type TeXElement = {
    readonly type: TeXElementType,
    readonly name: string,
    label: string,
    readonly lineFr: number,
    lineTo: number,
    readonly filePath: string,
    children: TeXElement[],
    parent?: TeXElement,
    appendix?: boolean
}
