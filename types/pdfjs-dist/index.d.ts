/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { PDFOperatorList } from "pdfjs-dist";

/**
 * @module pdfjs-dist
 */
declare module "pdfjs-dist" {
    /**
     * TODO https://github.com/mozilla/pdf.js/pull/10575
     * @typedef {any} IPDFStream
     */
    type IPDFStream = any;
    /**
     * @typedef {function} IPDFStreamFactory
     * @param {DocumentInitParameters} params The document initialization
     * parameters. The "url" key is always present.
     * @return {IPDFStream}
     */
    type IPDFStreamFactory = (params: DocumentInitParameters) => IPDFStream;
    /** @type IPDFStreamFactory
     */
    var createPDFNetworkStream: IPDFStreamFactory;
    /**
     * Sets the function that instantiates a IPDFStream as an alternative PDF data
     * transport.
     * @param {IPDFStreamFactory} pdfNetworkStreamFactory - the factory function
     * that takes document initialization parameters (including a "url") and returns
     * an instance of IPDFStream.
     */
    function setPDFNetworkStreamFactory(pdfNetworkStreamFactory: IPDFStreamFactory): void;
    /**
     * @typedef {Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array} TypedArray //
     */
    type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array;
    /**
     * Document initialization / loading parameters object.
     *
     * @typedef {Object} DocumentInitParameters
     * @property {string}     url   - The URL of the PDF.
     * @property {TypedArray|Array<number>|string} data - Binary PDF data. Use
     *   typed arrays (Uint8Array) to improve the memory usage. If PDF data is
     *   BASE64-encoded, use atob() to convert it to a binary string first.
     * @property {Object}     httpHeaders - Basic authentication headers.
     * @property {boolean}    withCredentials - Indicates whether or not cross-site
     *   Access-Control requests should be made using credentials such as cookies
     *   or authorization headers. The default is false.
     * @property {string}     password - For decrypting password-protected PDFs.
     * @property {TypedArray} initialData - A typed array with the first portion or
     *   all of the pdf data. Used by the extension since some data is already
     *   loaded before the switch to range requests.
     * @property {number}     length - The PDF file length. It's used for progress
     *   reports and range requests operations.
     * @property {PDFDataRangeTransport} range
     * @property {number}     rangeChunkSize - Optional parameter to specify
     *   maximum number of bytes fetched per range request. The default value is
     *   2^16 = 65536.
     * @property {PDFWorker}  worker - (optional) The worker that will be used for
     *   the loading and parsing of the PDF data.
     * @property {boolean} postMessageTransfers - (optional) Enables transfer usage
     *   in postMessage for ArrayBuffers. The default value is `true`.
     * @property {number} verbosity - (optional) Controls the logging level; the
     *   constants from {VerbosityLevel} should be used.
     * @property {string} docBaseUrl - (optional) The base URL of the document,
     *   used when attempting to recover valid absolute URLs for annotations, and
     *   outline items, that (incorrectly) only specify relative URLs.
     * @property {string} nativeImageDecoderSupport - (optional) Strategy for
     *   decoding certain (simple) JPEG images in the browser. This is useful for
     *   environments without DOM image and canvas support, such as e.g. Node.js.
     *   Valid values are 'decode', 'display' or 'none'; where 'decode' is intended
     *   for browsers with full image/canvas support, 'display' for environments
     *   with limited image support through stubs (useful for SVG conversion),
     *   and 'none' where JPEG images will be decoded entirely by PDF.js.
     *   The default value is 'decode'.
     * @property {string} cMapUrl - (optional) The URL where the predefined
     *   Adobe CMaps are located. Include trailing slash.
     * @property {boolean} cMapPacked - (optional) Specifies if the Adobe CMaps are
     *   binary packed.
     * @property {Object} CMapReaderFactory - (optional) The factory that will be
     *   used when reading built-in CMap files. Providing a custom factory is useful
     *   for environments without `XMLHttpRequest` support, such as e.g. Node.js.
     *   The default value is {DOMCMapReaderFactory}.
     * @property {boolean} stopAtErrors - (optional) Reject certain promises, e.g.
     *   `getOperatorList`, `getTextContent`, and `RenderTask`, when the associated
     *   PDF data cannot be successfully parsed, instead of attempting to recover
     *   whatever possible of the data. The default value is `false`.
     * @property {number} maxImageSize - (optional) The maximum allowed image size
     *   in total pixels, i.e. width * height. Images above this value will not be
     *   rendered. Use -1 for no limit, which is also the default value.
     * @property {boolean} isEvalSupported - (optional) Determines if we can eval
     *   strings as JS. Primarily used to improve performance of font rendering,
     *   and when parsing PDF functions. The default value is `true`.
     * @property {boolean} disableFontFace - (optional) By default fonts are
     *   converted to OpenType fonts and loaded via font face rules. If disabled,
     *   fonts will be rendered using a built-in font renderer that constructs the
     *   glyphs with primitive path commands. The default value is `false`.
     * @property {boolean} disableRange - (optional) Disable range request loading
     *   of PDF files. When enabled, and if the server supports partial content
     *   requests, then the PDF will be fetched in chunks.
     *   The default value is `false`.
     * @property {boolean} disableStream - (optional) Disable streaming of PDF file
     *   data. By default PDF.js attempts to load PDFs in chunks.
     *   The default value is `false`.
     * @property {boolean} disableAutoFetch - (optional) Disable pre-fetching of PDF
     *   file data. When range requests are enabled PDF.js will automatically keep
     *   fetching more data even if it isn't needed to display the current page.
     *   The default value is `false`.
     *   NOTE: It is also necessary to disable streaming, see above,
     *         in order for disabling of pre-fetching to work correctly.
     * @property {boolean} disableCreateObjectURL - (optional) Disable the use of
     *   `URL.createObjectURL`, for compatibility with older browsers.
     *   The default value is `false`.
     * @property {boolean} pdfBug - (optional) Enables special hooks for debugging
     *   PDF.js (see `web/debugger.js`). The default value is `false`.
     */
    type DocumentInitParameters = {
        url?: string;
        data?: TypedArray | number[] | string;
        httpHeaders?: any;
        withCredentials?: boolean;
        password?: string;
        initialData?: TypedArray;
        length?: number;
        range?: PDFDataRangeTransport;
        rangeChunkSize?: number;
        worker?: PDFWorker;
        postMessageTransfers?: boolean;
        verbosity?: number;
        docBaseUrl?: string;
        nativeImageDecoderSupport?: string;
        cMapUrl?: string;
        cMapPacked?: boolean;
        CMapReaderFactory?: any;
        stopAtErrors?: boolean;
        maxImageSize?: number;
        isEvalSupported?: boolean;
        disableFontFace?: boolean;
        disableRange?: boolean;
        disableStream?: boolean;
        disableAutoFetch?: boolean;
        disableCreateObjectURL?: boolean;
        pdfBug?: boolean;
    };
    /**
     * @typedef {Object} PDFDocumentStats
     * @property {Array<boolean>} streamTypes - Used stream types in the document
     *   (an item is set to true if specific stream ID was used in the document).
     * @property {Array<boolean>} fontTypes - Used font type in the document
     *   (an item is set to true if specific font ID was used in the document).
     */
    type PDFDocumentStats = {
        streamTypes: boolean[];
        fontTypes: boolean[];
    };
    /**
     * This is the main entry point for loading a PDF and interacting with it.
     * NOTE: If a URL is used to fetch the PDF data a standard XMLHttpRequest(XHR)
     * is used, which means it must follow the same origin rules that any XHR does
     * e.g. No cross domain requests without CORS.
     *
     * @param {string|TypedArray|DocumentInitParameters|PDFDataRangeTransport} src
     * Can be a url to where a PDF is located, a typed array (Uint8Array)
     * already populated with data or parameter object.
     *
     * @return {PDFDocumentLoadingTask}
     */
    function getDocument(src: string | TypedArray | DocumentInitParameters | PDFDataRangeTransport): PDFDocumentLoadingTask;
    /**
     * PDF document loading operation.
     * @class
     */
    class PDFDocumentLoadingTask {
        constructor();
        /**
         * @type {Promise<PDFDocumentProxy>}
         */
        promise: Promise<PDFDocumentProxy>;
        /**
         * Aborts all network requests and destroys worker.
         * @return {Promise<void>} A promise that is resolved after destruction
         *                         activity is completed.
         */
        destroy(): Promise<void>;
        /**
         * Registers callbacks to indicate the document loading completion.
         *
         * @param {function} onFulfilled The callback for the loading completion.
         * @param {function} onRejected The callback for the loading failure.
         * @return {Promise<any>} A promise that is resolved after the onFulfilled
         *                        or onRejected callback.
         */
        then(onFulfilled: (...params: any[]) => any, onRejected: (...params: any[]) => any): Promise<any>;
    }
    /**
     * Abstract class to support range requests file loading.
     * @param {number} length
     * @param {Uint8Array} initialData
     */
    class PDFDataRangeTransport {
        constructor(length: number, initialData: Uint8Array);
    }
    /**
     * Proxy to a PDFDocument in the worker thread. Also, contains commonly used
     * properties that can be read synchronously.
     */
    class PDFDocumentProxy {
        constructor();
        /**
         * @type {number} Total number of pages the PDF contains.
         */
        numPages: number;
        /**
         * @type {string} A (not guaranteed to be) unique ID to identify a PDF.
         */
        fingerprint: string;
        /**
         * @param {number} pageNumber - The page number to get. The first page is 1.
         * @return {Promise<PDFPageProxy>} A promise that is resolved with
         *   a {@link PDFPageProxy} object.
         */
        getPage(pageNumber: number): Promise<PDFPageProxy>;
        /**
         * @param {{num: number, gen: number}} ref - The page reference. Must have
         *   the `num` and `gen` properties.
         * @return {Promise<{num: number, gen: number}>} A promise that is resolved
         *   with the page index that is associated with the reference.
         */
        getPageIndex(ref: any): Promise<{num: number, gen: number}>;
        /**
         * @return {Promise< Object<string,any> >} A promise that is resolved with
         *   a lookup table for mapping named destinations to reference numbers.
         *
         * This can be slow for large documents. Use `getDestination` instead.
         */
        getDestinations(): Promise<{
            [key: string]: any;
        }>;
        /**
         * @param {string} id - The named destination to get.
         * @return {Promise<Array<any>>} A promise that is resolved with all
         *   information of the given named destination.
         */
        getDestination(id: string): Promise<any[]>;
        /**
         * @return {Promise< Array<string> > | Promise<null>} A promise that is
         *   resolved with an {Array} containing the page labels that correspond to
         *   the page indexes, or `null` when no page labels are present in the PDF
         *   file.
         */
        getPageLabels(): Promise<string[]> | Promise<null>;
        /**
         * @return {Promise<string>} A promise that is resolved with a {string}
         *   containing the page mode name.
         */
        getPageMode(): Promise<string>;
        /**
         * @return {Promise<any | null>} A promise that is resolved with an {Array}
         *   containing the destination, or `null` when no open action is present in
         *   the PDF file.
         */
        getOpenActionDestination(): Promise<any | null>;
        /**
         * @return {Promise<any>} A promise that is resolved with a lookup table for
         *   mapping named attachments to their content.
         */
        getAttachments(): Promise<any>;
        /**
         * @return {Promise< Array<string> > | Promise<null>} A promise that is
         *   resolved with an {Array} of all the JavaScript strings in the name tree,
         *   or `null` if no JavaScript exists.
         */
        getJavaScript(): Promise<string[]> | Promise<null>;
        /**
         * @return {Promise< Array<OutlineNode> >} A promise that is resolved with
         * an {Array} that is a tree outline (if it has one) of the PDF. The tree is
         * in the format of:
         * [
         *   {
         *     title: string,
         *     bold: boolean,
         *     italic: boolean,
         *     color: rgb Uint8ClampedArray,
         *     dest: dest obj,
         *     url: string,
         *     items: array of more items like this
         *   },
         *   ...
         * ]
         */
        getOutline(): Promise<OutlineNode[]>;
        /**
         * @return {Promise< Array<string | null> >} A promise that is resolved with
         *   an {Array} that contains the permission flags for the PDF document, or
         *   `null` when no permissions are present in the PDF file.
         */
        getPermissions(): Promise<(string | null)[]>;
        /**
         * @return {Promise<{ info: any, metadata: any }>} A promise that is resolved
         *   with an {Object} that has `info` and `metadata` properties. `info` is
         *   an {Object} filled with anything available in the information dictionary
         *   and similarly `metadata` is a {Metadata} object with information from
         *   the metadata section of the PDF.
         */
        getMetadata(): Promise<{info: any, metadata: any}>;
        /**
         * @return {Promise<TypedArray>} A promise that is resolved with
         * a {TypedArray} that has the raw data from the PDF.
         */
        getData(): Promise<TypedArray>;
        /**
         * @return {Promise<{ length: number }>} A promise that is resolved when the
         *   document's data is loaded. It is resolved with an {Object} that contains
         *   the `length` property that indicates size of the PDF data in bytes.
         */
        getDownloadInfo(): Promise<{length: number}>;
        /**
         * @return {Promise<PDFDocumentStats>} A promise this is resolved with
         *   current statistics about document structures
         *   (see {@link PDFDocumentStats}).
         */
        getStats(): Promise<PDFDocumentStats>;
        /**
         * Cleans up resources allocated by the document, e.g. created `@font-face`.
         */
        cleanup(): void;
        /**
         * Destroys the current document instance and terminates the worker.
         */
        destroy(): void;
        /**
         * @type {DocumentInitParameters} A subset of the current
         *   {DocumentInitParameters}, which are either needed in the viewer and/or
         *   whose default values may be affected by the `apiCompatibilityParams`.
         */
        loadingParams: DocumentInitParameters;
    }
    /**
       TODO https://github.com/mozilla/pdf.js/pull/10575
     * @typedef {Object} OutlineNode
     * @property {string} title
     * @property {boolean} bold
     * @property {boolean} italic
     * @property {Uint8ClampedArray} color
     * @property {any} dest
     * @property {string} url
     * @property {Array<OutlineNode>} items
     */
    type OutlineNode = {
        title: string;
        bold: boolean;
        italic: boolean;
        color: Uint8ClampedArray;
        dest: any;
        url: string;
        items: OutlineNode[];
    };
    /**
     * Page getViewport parameters.
     *
     * @typedef {Object} GetViewportParameters
     * @property {number} scale - The desired scale of the viewport.
     * @property {number} rotation - (optional) The desired rotation, in degrees, of
     *   the viewport. If omitted it defaults to the page rotation.
     * @property {boolean} dontFlip - (optional) If true, the y-axis will not be
     *   flipped. The default value is `false`.
     */
    type GetViewportParameters = {
        scale: number;
        rotation?: number;
        dontFlip?: boolean;
    };
    /**
     * Page getTextContent parameters.
     *
     * @typedef {Object} getTextContentParameters
     * @property {boolean} normalizeWhitespace - replaces all occurrences of
     *   whitespace with standard spaces (0x20). The default value is `false`.
     * @property {boolean} disableCombineTextItems - do not attempt to combine
     *   same line {@link TextItem}'s. The default value is `false`.
     */
    type getTextContentParameters = {
        normalizeWhitespace: boolean;
        disableCombineTextItems: boolean;
    };
    /**
     * TODO https://github.com/mozilla/pdf.js/pull/10575
     * @typedef {Object} TextStyles
     */
    type TextStyles = any;
    /**
     * Page text content.
     *
     * @typedef {Object} TextContent
     * @property {Array<TextItem>} items - array of {@link TextItem}
     * @property {Object<string, TextStyles>} styles - {@link TextStyles} objects,
     *   indexed by font name.
     */
    type TextContent = {
        items: TextItem[];
        styles: {
            [key: string]: TextStyles;
        };
    };
    /**
     * Page text content part.
     *
     * @typedef {Object} TextItem
     * @property {string} str - text content.
     * @property {string} dir - text direction: 'ttb', 'ltr' or 'rtl'.
     * @property {Array<any>} transform - transformation matrix.
     * @property {number} width - width in device space.
     * @property {number} height - height in device space.
     * @property {string} fontName - font name used by pdf.js for converted font.
     */
    type TextItem = {
        str: string;
        dir: string;
        transform: any[];
        width: number;
        height: number;
        fontName: string;
    };
    /**
     * Text style.
     *
     * @typedef {Object} TextStyle
     * @property {number} ascent - font ascent.
     * @property {number} descent - font descent.
     * @property {boolean} vertical - text is in vertical mode.
     * @property {string} fontFamily - possible font family
     */
    type TextStyle = {
        ascent: number;
        descent: number;
        vertical: boolean;
        fontFamily: string;
    };
    /**
     * Page annotation parameters.
     *
     * @typedef {Object} GetAnnotationsParameters
     * @property {string} intent - Determines the annotations that will be fetched,
     *                    can be either 'display' (viewable annotations) or 'print'
     *                    (printable annotations).
     *                    If the parameter is omitted, all annotations are fetched.
     */
    type GetAnnotationsParameters = {
        intent: string;
    };
    /**
     * Page render parameters.
     *
     * @typedef {Object} RenderParameters
     * @property {Object} canvasContext - A 2D context of a DOM Canvas object.
     * @property {PageViewport} viewport - Rendering viewport obtained by
     *                          calling the `PDFPageProxy.getViewport` method.
     * @property {string} intent - Rendering intent, can be 'display' or 'print'
     *                    (default value is 'display').
     * @property {boolean} enableWebGL - (optional) Enables WebGL accelerated
     *   rendering for some operations. The default value is `false`.
     * @property {boolean} renderInteractiveForms - (optional) Whether or not
     *                     interactive form elements are rendered in the display
     *                     layer. If so, we do not render them on canvas as well.
     * @property {Array<any>}  transform - (optional) Additional transform, applied
     *                         just before viewport transform.
     * @property {Object} imageLayer - (optional) An object that has beginLayout,
     *                    endLayout and appendImage functions.
     * @property {Object} canvasFactory - (optional) The factory that will be used
     *                    when creating canvases. The default value is
     *                    {DOMCanvasFactory}.
     * @property {Object} background - (optional) Background to use for the canvas.
     *                    Can use any valid canvas.fillStyle: A DOMString parsed as
     *                    CSS <color> value, a CanvasGradient object (a linear or
     *                    radial gradient) or a CanvasPattern object (a repetitive
     *                    image). The default value is 'rgb(255,255,255)'.
     */
    type RenderParameters = {
        canvasContext: any;
        viewport: PageViewport;
        intent: string;
        enableWebGL?: boolean;
        renderInteractiveForms?: boolean;
        transform?: any[];
        imageLayer?: any;
        canvasFactory?: any;
        background?: any;
    };
    /**
     * PDF page operator list.
     *
     * @typedef {Object} PDFOperatorList
     * @property {Array<Function>} fnArray - Array containing the operator
     *                                       functions.
     * @property {Array<any>} argsArray - Array containing the arguments of the
     *                                    functions.
     */
    type PDFOperatorList = {
        fnArray: ((...params: any[]) => any)[];
        argsArray: any[];
    };
    /**
     * Proxy to a PDFPage in the worker thread.
     */
    class PDFPageProxy {
        constructor();
        /**
         * @type {number} Page number of the page. First page is 1.
         */
        pageNumber: number;
        /**
         * @type {number} The number of degrees the page is rotated clockwise.
         */
        rotate: number;
        /**
         * @type {Object} The reference that points to this page. It has 'num' and
         * 'gen' properties.
         */
        ref: any;
        /**
         * @type {number} The default size of units in 1/72nds of an inch.
         */
        userUnit: number;
        /**
         * @type {Array<number>} An array of the visible portion of the PDF page in
         * the user space units - [x1, y1, x2, y2].
         */
        view: number[];
        /**
         * @param {GetViewportParameters} params - Viewport parameters.
         * @return {PageViewport} Contains 'width' and 'height' properties
         *   along with transforms required for rendering.
         */
        getViewport(params: GetViewportParameters): PageViewport;
        /**
         * @param {GetAnnotationsParameters} params - Annotation parameters.
         * @return {Promise< Array<any> >} A promise that is resolved with an {Array}
         * of the annotation objects.
         */
        getAnnotations(params: GetAnnotationsParameters): Promise<any[]>;
        /**
         * Begins the process of rendering a page to the desired context.
         * @param {RenderParameters} params Page render parameters.
         * @return {RenderTask} An object that contains the promise, which
         *                      is resolved when the page finishes rendering.
         */
        render(params: RenderParameters): RenderTask;
        /**
         * @return {Promise<PDFOperatorList>} A promise resolved with an
         *   {@link PDFOperatorList} object that represents page's operator list.
         */
        getOperatorList(): Promise<PDFOperatorList>;
        /**
         * @param {getTextContentParameters} params - getTextContent parameters.
         * @return {ReadableStream} ReadableStream to read textContent chunks.
         */
//        streamTextContent(params: getTextContentParameters): ReadableStream;
        /**
         * @param {getTextContentParameters} params - getTextContent parameters.
         * @return {Promise<TextContent>} That is resolved a {@link TextContent}
         * object that represent the page text content.
         */
        getTextContent(params: getTextContentParameters): Promise<TextContent>;
        /**
         * Destroys page object.
         */
        _destroy(): void;
        /**
         * Cleans up resources allocated by the page.
         * @param {boolean} resetStats - (optional) Reset page stats, if enabled.
         *   The default value is `false`.
         */
        cleanup(resetStats: boolean): void;
        /**
         * @type {Object} Returns page stats, if enabled.
         */
        stats: any;

        objs: PDFObjects;
        commonObjs: PDFObjects;
    }
    /**
     * TODO https://github.com/mozilla/pdf.js/pull/10575
     * @typedef {Object} PageViewport
     * @property {number} width
     * @property {number} height
     */
    type PageViewport = {
        width: number;
        height: number;
    };
    /**
     * @typedef {Object} PDFWorkerParameters
     * @property {string} name - (optional) The name of the worker.
     * @property {Object} port - (optional) The `workerPort`.
     * @property {boolean} postMessageTransfers - (optional) Enables transfer usage
     *   in postMessage for ArrayBuffers. The default value is `true`.
     * @property {number} verbosity - (optional) Controls the logging level; the
     *   constants from {VerbosityLevel} should be used.
     */
    type PDFWorkerParameters = {
        name: string;
        port: any;
        postMessageTransfers: boolean;
        verbosity: number;
    };
    /**
     * PDF.js web worker abstraction, it controls instantiation of PDF documents and
     * WorkerTransport for them. If creation of a web worker is not possible,
     * a "fake" worker will be used instead.
     * @class
     */
    class PDFWorker {
        constructor();
        /**
         * Destroys the worker instance.
         */
        destroy(): void;
        /**
         * @param {PDFWorkerParameters} params - The worker initialization
         *                                       parameters.
         */
        static fromPort(params: PDFWorkerParameters): void;
    }
}

declare module "pdfjs-dist" {
    module PDFWorker {
        /**
         * @param {PDFWorkerParameters} params - The worker initialization parameters.
         */
        class PDFWorker {
            constructor(params: PDFWorkerParameters);
        }
    }
}

/**
 * Allows controlling of the rendering tasks.
 * @alias RenderTask
 */
declare class RenderTask {
    constructor();
    /**
     * Callback for incremental rendering -- a function that will be called
     * each time the rendering is paused.  To continue rendering call the
     * function that is the first argument to the callback.
     * @type {function}
     */
    onContinue: (...params: any[]) => any;
    /**
     * Promise for rendering task completion.
     * @type {Promise<void>}
     */
    promise: Promise<void>;
    /**
     * Cancels the rendering task. If the task is currently rendering it will
     * not be cancelled until graphics pauses with a timeout. The promise that
     * this object extends will be rejected when cancelled.
     */
    cancel(): void;
    /**
     * Registers callbacks to indicate the rendering task completion.
     *
     * @param {function} onFulfilled The callback for the rendering completion.
     * @param {function} onRejected The callback for the rendering failure.
     * @return {Promise<any>} A promise that is resolved after the onFulfilled or
     *                        onRejected callback.
     */
    then(onFulfilled: (...params: any[]) => any, onRejected: (...params: any[]) => any): Promise<any>;
}

/**
 * Attempts to create a valid absolute URL.
 *
 * @param {URL|string} url - An absolute, or relative, URL.
 * @param {URL|string} baseUrl - An absolute URL.
 * @returns Either a valid {URL}, or `null` otherwise.
 */
// declare function createValidAbsoluteUrl(url: URL | string, baseUrl: URL | string): URL;

/**
 * Error caused during parsing PDF data.
 */
declare var FormatError: any;

/**
 * Error used to indicate task cancellation.
 */
declare var AbortException: any;

/**
 * Gets length of the array (Array, Uint8Array, or string) in bytes.
 * @param {Array<any>|Uint8Array|string} arr
 * @returns {number}
 */
declare function arrayByteLength(arr: any[] | Uint8Array | string): number;

/**
 * Combines array items (arrays) into single Uint8Array object.
 * @param {Array<Array<any>|Uint8Array|string>} arr - the array of the arrays
 *   (Array, Uint8Array, or string).
 * @returns {Uint8Array}
 */
declare function arraysToBytes(arr: any[]): Uint8Array;

/**
 * Promise Capability object.
 *
 * @typedef {Object} PromiseCapability
 * @property {Promise<any>} promise - A Promise object.
 * @property {boolean} settled - If the Promise has been fulfilled/rejected.
 * @property {function} resolve - Fulfills the Promise.
 * @property {function} reject - Rejects the Promise.
 */
declare type PromiseCapability = {
    promise: Promise<any>;
    settled: boolean;
    resolve: (...params: any[]) => any;
    reject: (...params: any[]) => any;
};

/**
 * Creates a promise capability object.
 * @alias createPromiseCapability
 *
 * @return {PromiseCapability}
 */
declare function createPromiseCapability(): PromiseCapability;

/**
 * Contains all data regarding an annotation's border style.
 */
declare class AnnotationBorderStyle {
    constructor();
    /**
     * Set the width.
     *
     * @public
     * @memberof AnnotationBorderStyle
     * @param {number} width - The width
     */
    public setWidth(width: number): void;
    /**
     * Set the style.
     *
     * @public
     * @memberof AnnotationBorderStyle
     * @param {Name} style - The annotation style.
     * @see {@link shared/util.js}
     */
    public setStyle(style: Name): void;
    /**
     * Set the dash array.
     *
     * @public
     * @memberof AnnotationBorderStyle
     * @param {Array<number>} dashArray - The dash array with at least one element
     */
    public setDashArray(dashArray: number[]): void;
    /**
     * Set the horizontal corner radius (from a Border dictionary).
     *
     * @public
     * @memberof AnnotationBorderStyle
     * @param {number} radius - The horizontal corner radius
     */
    public setHorizontalCornerRadius(radius: number): void;
    /**
     * Set the vertical corner radius (from a Border dictionary).
     *
     * @public
     * @memberof AnnotationBorderStyle
     * @param {number} radius - The vertical corner radius
     */
    public setVerticalCornerRadius(radius: number): void;
}

/**
 * TODO https://github.com/mozilla/pdf.js/pull/10575
 * @typedef {any} Name
 */
declare type Name = any;

declare module "pdfjs-dist" {
    class PDFObjects {}
    class SVGGraphics {
        constructor(commonObjs: PDFObjects, objs: PDFObjects, forceDataSchema?: boolean);
        embedFonts: boolean;
        getSVG(opList: PDFOperatorList, viewport: PageViewport): Promise<object>;
    }
}
