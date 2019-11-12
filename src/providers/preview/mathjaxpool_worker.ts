import * as workerpool from 'workerpool'
import * as mj from 'mathjax-node'

mj.config({
    MathJax: {
        jax: ['input/TeX', 'output/SVG'],
        extensions: ['tex2jax.js', 'MathZoom.js'],
        showMathMenu: false,
        showProcessingMessages: false,
        messageStyle: 'none',
        SVG: {
            useGlobalCache: false
        },
        TeX: {
            extensions: ['AMSmath.js', 'AMSsymbols.js', 'autoload-all.js', 'color.js', 'noUndefined.js']
        }
    }
})
mj.start()

function scaleSVG(data: any, scale: number) {
    const svgelm = data.svgNode
    // w0[2] and h0[2] are units, i.e., pt, ex, em, ...
    const w0 = svgelm.getAttribute('width').match(/([.\d]+)(\w*)/)
    const h0 = svgelm.getAttribute('height').match(/([.\d]+)(\w*)/)
    const w = scale * Number(w0[1])
    const h = scale * Number(h0[1])
    svgelm.setAttribute('width', w + w0[2])
    svgelm.setAttribute('height', h + h0[2])
}

function colorSVG(svg: string, color: string): string {
    const ret = svg.replace('</title>', `</title><style> * { color: ${color} }</style>`)
    return ret
}

export async function typeset(arg: any, opts: { scale: number, color: string }): Promise<string> {
    const data = await mj.typeset(arg)
    scaleSVG(data, opts.scale)
    const xml = colorSVG(data.svgNode.outerHTML, opts.color)
    return xml
}

workerpool.worker({
    typeset
})
