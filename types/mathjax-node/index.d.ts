export const config: (arg: ConfigArg) => void
export function start(): () => void
export function typeset(arg: TypesetArg): Promise<TypesetReturnType>

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

export type TypesetReturnType = {
    svgNode: {
        getAttribute: (name: string) => string,
        setAttribute: (name: string, value: string) => void,
        outerHTML: string
    }
}

type ConfigArg = {
    MathJax: {
        jax: string[],
        extensions: string[],
        showMathMenu: boolean,
        showProcessingMessages: boolean,
        messageStyle: string,
        SVG: {
            useGlobalCache: boolean
        },
        TeX: {
            extensions: string[]
        }
    }
}
