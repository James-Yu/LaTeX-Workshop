import { sendPanel } from './connection.js'
import * as utils from './utils.js'
import type { PDFViewerApplicationType, PDFViewerPage } from './interface.js'

declare const PDFViewerApplication: PDFViewerApplicationType
declare const pdfjsLib: { isValidExplicitDest(destination: unknown): destination is unknown[] }

let ready = false
let pendingDestination: string | undefined

export function initPdfLinks() {
    if (!utils.isEmbedded()) {
        return
    }
    window.addEventListener('message', event => {
        const message = event.data as { type?: unknown, destination?: unknown } | undefined
        if (event.source !== window.parent || message?.type !== 'navigate_pdf' || typeof message.destination !== 'string') {
            return
        }
        pendingDestination = message.destination
        void navigatePending()
    })
}

export function pdfLinksLoading() {
    ready = false
    if (utils.isEmbedded()) {
        sendPanel({ type: 'pdf_loading' })
    }
}

export function pdfLinksReady() {
    ready = true
    if (utils.isEmbedded()) {
        sendPanel({ type: 'pdf_ready' })
    }
    void navigatePending()
}

async function navigatePending() {
    if (!ready || pendingDestination === undefined) {
        return
    }
    const destination = pendingDestination
    pendingDestination = undefined
    try {
        const doc = PDFViewerApplication.pdfDocument
        if (!destination) {
            PDFViewerApplication.pdfViewer.currentPageNumber = 1
            return
        }
        let target: string | unknown[] = destination
        let explicit = await doc.getDestination(destination)
        if (!explicit) {
            try {
                const parsed: unknown = JSON.parse(destination)
                if (pdfjsLib.isValidExplicitDest(parsed)) {
                    target = explicit = parsed
                }
            } catch { /* Named destinations need not be JSON. */ }
        }
        if (!explicit && destination.includes('%')) {
            target = decodeURIComponent(destination)
            explicit = await doc.getDestination(target)
        }
        if (!pdfjsLib.isValidExplicitDest(explicit)) {
            throw new Error(`PDF destination not found: ${destination}`)
        }
        const first = explicit[0]
        const page = typeof first === 'number' ? first : await doc.getPageIndex(first)
        if (!Number.isInteger(page) || page < 0 || page >= doc.numPages) {
            throw new Error(`Invalid PDF destination: ${destination}`)
        }
        // An annotation/load request may have outlived a PDF refresh.
        if (doc !== PDFViewerApplication.pdfDocument || !ready) {
            pendingDestination ??= destination
            return
        }
        await PDFViewerApplication.pdfLinkService.goToDestination(target)
    } catch (error) {
        sendPanel({ type: 'pdf_link_error', message: error instanceof Error ? error.message : 'Unable to navigate to the linked PDF destination.' })
    }
}

/** Bind only the unresolved local PDF annotations that PDF.js leaves inert. */
export async function bindPdfLinks(view: PDFViewerPage) {
    if (!utils.isEmbedded() || !view.pdfPage) {
        return
    }
    const page = view.pdfPage
    const annotations = await page.getAnnotations()
    if (page !== view.pdfPage || !view.div.isConnected) {
        return
    }
    for (const annotation of annotations) {
        const href = annotation.unsafeUrl
        if (annotation.subtype !== 'Link' || annotation.url || annotation.dest || typeof href !== 'string'
            // eslint-disable-next-line no-control-regex -- Reject unsafe annotation text; the host also validates it.
            || /^[\\/]/.test(href) || !/^[^:\x00-\x1f\x7f]+\.pdf(?:#.*)?$/i.test(href)) {
            continue
        }
        const container = view.div.querySelector<HTMLElement>(`[data-annotation-id="${CSS.escape(annotation.id)}"]`)
        if (!container || container.querySelector('a')) {
            continue
        }
        const anchor = document.createElement('a')
        anchor.href = '#'
        anchor.dataset.elementId = annotation.id
        anchor.dataset.localPdfLink = href
        anchor.title = href
        anchor.setAttribute('aria-label', `Open linked PDF: ${href}`)
        anchor.addEventListener('click', event => {
            event.preventDefault()
            event.stopPropagation()
            sendPanel({ type: 'open_pdf_link', href })
        })
        container.appendChild(anchor)
    }
}
