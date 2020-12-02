export const config: any
export function start(): any
export function typeset(arg: TypesetArg): Promise<any>

export type TypesetArg = {
    width?: number,
    equationNumbers?: string,
    math: string,
    format: string,
    svgNode: boolean,
    state?: {
        AMS: {
            labels: { [k: string]: string },
            IDs: { [k: string]: string },
            startNumber: number
        }
    }
}
