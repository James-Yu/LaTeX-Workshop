import * as vscode from 'vscode'

import { Extension } from '../main'

export class BuildInfo {
    extension: Extension
    status: vscode.StatusBarItem
    panel: vscode.WebviewPanel
    configuration: vscode.WorkspaceConfiguration
    currentBuild: {
        buildStart: number;
        pageTotal?: number | undefined;
        lastStepTime: number;
        stepTimes: { [runName: string]: { [pageNo: number]: number } };
        stdout: string;
        ruleNumber: number;
        ruleName: string;
        ruleProducesPages: boolean | undefined;
    } // | undefined

    constructor(extension: Extension) {
        this.extension = extension
        this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -10001)
        this.status.command = 'latex-workshop.showCompilationPanel'
        this.status.tooltip = 'Show LaTeX Compilation Info Panel'
        this.status.show()
    }

    public buildStarted() {
        this.currentBuild = {
            buildStart: +new Date(),
            pageTotal: undefined,
            lastStepTime: +new Date(),
            stepTimes: {},
            stdout: '',
            ruleNumber: 0,
            ruleName: '',
            ruleProducesPages: undefined
        }
        this.status.text = ''
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'init',
                startTime: this.currentBuild.buildStart,
                pageTotal: this.currentBuild.pageTotal
            })
        }
    }
    public buildEnded() {
        if (this.currentBuild) {
            this.status.text = `( ${((+new Date() - this.currentBuild.buildStart) / 1000).toFixed(1)} s )`
            // @ts-ignore
            this.currentBuild = undefined
            setTimeout(() => {
                if (!this.currentBuild) {
                    this.status.text = ''
                }
            }, 5000)

            if (this.panel) {
                this.panel.webview.postMessage({ type: 'finished' })
            }
        }
    }

    public setPageTotal(count: number) {
        if (this.currentBuild) {
            this.currentBuild.pageTotal = count
        }
    }

    public async newStdoutLine(lines: string) {
        if (!this.currentBuild) {
            throw Error(`Can't Display Progress for non-Started build - see BuildInfo.buildStarted()`)
        }

        for (const line of lines.split('\n')) {
            this.currentBuild.stdout += '\n' + line
            this.checkStdoutForInfo()
        }
    }

    private checkStdoutForInfo() {
        const pageNumberRegex = /\[(\d+)[^\[\]]*\]$/
        const latexmkRuleStartedRegex = /Latexmk: applying rule '([A-z \/]+)'\.\.\.\n$/
        // const auxOutfileReference = /\(\.[\/\w ]+\.aux\)[\w\s\/\(\)\-\.]*$/

        const hardcodedRulesPageProducing = ['pdflatex', 'pdftex']
        const hardcodedRulesOther = ['sage']

        const rulePdfLatexStart = /This is pdfTeX, Version [\d\.\-]+[^\n]*$/
        const ruleSageStart = /Processing Sage code for [\w\.\- \"]+\.\.\.$/
        const ruleBibtexStart = /This is BibTeX[\w\.\- \"\,\(\)]+$/

        // TODO: refactor code below, it could be a lot more efficiently (to look at, not computationally)

        if (this.currentBuild.ruleProducesPages && this.currentBuild.stdout.match(pageNumberRegex)) {
            // @ts-ignore
            const pageNo = parseInt(this.currentBuild.stdout.match(pageNumberRegex)[1])
            if (!isNaN(pageNo)) {
                this.displayProgress(pageNo)
            }
        } else if (this.currentBuild.stdout.match(latexmkRuleStartedRegex)) {
            // @ts-ignore
            const ruleName = this.currentBuild.stdout.match(latexmkRuleStartedRegex)[1]
            // if rule name does not have own entry
            if ([...hardcodedRulesPageProducing, ...hardcodedRulesOther].indexOf(ruleName) === -1) {
                this.currentBuild.ruleName = ruleName
                this.currentBuild.ruleProducesPages = undefined
                this.currentBuild.stepTimes[`${++this.currentBuild.ruleNumber}-${this.currentBuild.ruleName}`] = {}
                this.displayProgress(0)
                this.currentBuild.lastStepTime = +new Date()
            }
        } else if (this.currentBuild.stdout.match(rulePdfLatexStart)) {
            this.currentBuild.ruleName = 'pdfLaTeX'
            this.currentBuild.ruleProducesPages = true
            this.currentBuild.stepTimes[`${++this.currentBuild.ruleNumber}-${this.currentBuild.ruleName}`] = {}
            this.displayProgress(0)
            this.currentBuild.lastStepTime = +new Date()
        } else if (this.currentBuild.stdout.match(ruleBibtexStart)) {
            this.currentBuild.ruleName = 'BibTeX'
            this.currentBuild.ruleProducesPages = false
            this.currentBuild.stepTimes[`${++this.currentBuild.ruleNumber}-${this.currentBuild.ruleName}`] = {}
            this.displayProgress(0)
            this.currentBuild.lastStepTime = +new Date()
        } else if (this.currentBuild.stdout.match(ruleSageStart)) {
            this.currentBuild.ruleName = 'Sage'
            this.currentBuild.ruleProducesPages = false
            this.currentBuild.stepTimes[`${++this.currentBuild.ruleNumber}-${this.currentBuild.ruleName}`] = {}
            this.displayProgress(0)
            this.currentBuild.lastStepTime = +new Date()
        }
        // TODO: Add more rules
    }

    public showPanel() {
        if (this.panel) {
            return
        }
        this.panel = vscode.window.createWebviewPanel('compilationInfo', 'LaTeX Compilation Live Info', vscode.ViewColumn.Beside, {
            enableScripts: true
        })
        this.panel.onDidDispose(() => {
            // @ts-ignore
            this.panel = undefined
        })

        // #region webview html
        this.panel.webview.html = `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />

                <style>
                    #stepTimes div.column {
                        display: inline-block;
                        padding: 0;
                        margin: 0;
                        vertical-align: top;
                        margin-right: 1.5rem;
                    }

                    #stepTimes ul {
                        list-style: none;
                        padding-inline-start: 0;
                        -webkit-padding-start: 0;
                    }

                    #stepTimes h3 {
                        font-size: 1.25rem;
                        background: var(--vscode-editor-foreground);
                        color: var(--vscode-editor-background);
                        padding: 0.1em 0.5em;
                        margin: -0.25em 0 -0.25em 0;
                        width: 12em;
                        border-radius: 0.5em;
                    }

                    #stepTimes ul li {
                        font-size: 1rem;
                        border-radius: 0.5em;
                        padding: 0;
                        margin: 0 0 0.2em 1em;
                        width: 13.5em;
                    }

                    #stepTimes ul li span.item {
                        margin: 0 0.5em 0 0;
                        padding: 0;
                        /* font-weight: 600; */
                        /* position: relative;
                                float: left; */
                    }

                    #stepTimes ul li span.pageTime {
                        position: relative;
                        float: right;
                    }

                    #timeInfo {
                        padding: 0 0 1rem 0.5rem;
                        width: calc(30rem - 1rem);
                    }

                    #timeInfo #total {
                        font-size: 1.5rem;
                        display: inline-block;
                        width: 6em;
                    }
                    #timeInfo #total::after {
                        content: 's';
                        margin-left: 0.25rem;
                        text-transform: none;
                        letter-spacing: initial;
                        display: inline-block;
                    }

                    /* #timeInfo #eta {
                        font-size: 1.5rem;
                        float: right;
                    }
                    #timeInfo #eta::before {
                        content: "Eta";
                        margin-right: 0.5em;
                    } */

                    #compilationSpeed {
                        height: 15rem;
                        width: calc(95vw - 3rem);
                    }

                    .tex,
                    .latex {
                        line-height: 1;
                        margin-left: 0.02em;
                    }

                    .tex sub,
                    .latex sub,
                    .latex sup {
                        text-transform: uppercase;
                    }

                    .tex sub,
                    .latex sub {
                        vertical-align: -0.28ex;
                        margin-left: -0.1667em;
                        margin-right: -0.1em;
                    }

                    .tex,
                    .latex,
                    .tex sub,
                    .latex sub {
                        font-size: 1em;
                    }

                    .latex sup {
                        font-size: 0.85em;
                        vertical-align: 0.2em;
                        margin-left: -0.32em;
                        margin-right: -0.15em;
                    }
                </style>
            </head>
            <body>
                <h1><span class="latex">L<sup>A</sup>T<sub>E</sub>X</span> Compilation Live Info</h1>

                <div style="display: none">
                    <span id="1rem" style="width: 1rem; padding: 0"></span>
                    <span id="color0" style="color: var(--vscode-editor-foreground)"></span>
                    <span id="color1" style="color: var(--vscode-terminal-ansiBlue)"></span>
                    <span id="color2" style="color: var(--vscode-terminal-ansiGreen)"></span>
                    <span id="color3" style="color: var(--vscode-terminal-ansiRed)"></span>
                    <span id="color4" style="color: var(--vscode-terminal-ansiYellow)"></span>
                    <span id="color5" style="color: var(--vscode-terminal-ansiCyan)"></span>
                    <span id="color6" style="color: var(--vscode-terminal-ansiMagenta)"></span>
                    <span id="color7" style="color: var(--vscode-terminal-ansiWhite)"></span>
                </div>

                <canvas id="compilationSpeed"></canvas>

                <div id="timeInfo">
                    <span id="total">Total</span>
                    <!-- <span id="eta"></span> -->
                </div>
                <div id="stepTimes"></div>

                <script>
                    window.addEventListener('message', event => {
                        const data = event.data;

                        if (data.type === 'init') {
                            progressManager.startTime = data.startTime;
                            progressManager.stepTimes = data.stepTimes ? data.stepTimes : {};
                            progressManager.pageTotal = data.pageTotal;

                            progressManager.start(10);
                        } else if (data.type === 'finished') {
                            progressManager.stop();
                        } else if (data.type === 'update') {
                            progressManager.stepTimes = data.stepTimes ? data.stepTimes : {};
                            progressManager.pageTotal = data.pageTotal;

                            if (!progressManager.graph.doneSetup) {
                                progressManager.startTime = data.startTime ? data.startTime : +new Date();
                                progressManager.start(10);
                            } else {
                                progressManager.updateStepTimesUl();
                                progressManager.drawGraph();
                            }
                        }
                    });

                    function styliseTeX(str) {
                        return str
                            .replace(/LaTeX/g, '<span class="latex">L<sup>A</sup>T<sub>E</sub>X</span>')
                            .replace(/TeX/g, '<span class="tex">T<sub>e</sub>X</span>');
                    }

                    const progressManager = {
                        startTime: null,
                        stepTimes: {},
                        pageTotal: null,
                        stepTimesDiv: document.getElementById('stepTimes'),
                        totalSpan: document.getElementById('total'),
                        updateTimesInterval: null,
                        colours: [
                            window.getComputedStyle(document.getElementById('color0')).color,
                            window.getComputedStyle(document.getElementById('color1')).color,
                            window.getComputedStyle(document.getElementById('color2')).color,
                            window.getComputedStyle(document.getElementById('color3')).color,
                            window.getComputedStyle(document.getElementById('color4')).color,
                            window.getComputedStyle(document.getElementById('color5')).color,
                            window.getComputedStyle(document.getElementById('color6')).color,
                            window.getComputedStyle(document.getElementById('color7')).color
                        ],
                        rem: parseFloat(window.getComputedStyle(document.getElementById('1rem')).width.replace('px', '')),
                        graph: {
                            canvas: document.getElementById('compilationSpeed'),
                            context: document.getElementById('compilationSpeed').getContext('2d'),
                            resolutionMultiplier: window.devicePixelRatio * 2,
                            points: {},
                            maxMouseRadiusForTooltip: 10,
                            circleRadius: 5,
                            doneSetup: false,
                            textMargin: 5,
                            lastResize: +new Date()
                        },

                        updateStepTimesUl: function() {
                            this.stepTimesDiv.innerHTML = '';

                            for (const runName in this.stepTimes) {
                                const column = document.createElement('div');
                                column.classList.add('column');

                                const runInfo = document.createElement('h3');
                                runInfo.innerHTML = styliseTeX(runName.replace(/(\\d+)\\-(\\w+)/, '$2 \\u2014 Rule $1'));
                                column.appendChild(runInfo);
                                const ul = document.createElement('ul');
                                for (const item in this.stepTimes[runName]) {
                                    let itemLabel = item;
                                    itemLabel = itemLabel.replace(/^T\\d+\\-/, '');
                                    if (itemLabel.indexOf('PAGE:') === 0) {
                                        itemLabel = itemLabel.replace('PAGE:', '');
                                        itemLabel = 'Page ' + (itemLabel !== '1' ? itemLabel : itemLabel + ' + Preamble');
                                    }
                                    const li = document.createElement('li');
                                    li.innerHTML =
                                        '<span class="item">' +
                                        itemLabel +
                                        '</span> <span class="pageTime">' +
                                        this.stepTimes[runName][item] +
                                        ' <i>ms</i></span>';
                                    ul.appendChild(li);
                                }
                                column.appendChild(ul);
                                this.stepTimesDiv.appendChild(column);
                            }
                        },

                        start: function(updateGap = 10) {
                            this.stop();
                            this.stepTimesDiv.innerHTML = '';
                            this.updateStepTimesUl();
                            this.drawGraph();
                            this.updateTimesInterval = setInterval(() => {
                                this.updateTimingInfo();
                            }, updateGap);

                            if (!this.graph.doneSetup) {
                                this.graph.doneSetup = true;
                                this.graph.canvas.addEventListener('mousemove', this.graphHoverHandler.bind(this));
                                this.graph.canvas.addEventListener('mouseleave', this.graphHoverHandler.bind(this));
                                window.onresize = () => {
                                    this.lastResize = +new Date();
                                    setTimeout(() => {
                                        if (+new Date() - this.lastResize > 200) {
                                            this.drawGraph();
                                        }
                                    }, 210);
                                };
                            }
                        },
                        stop: function() {
                            clearInterval(this.updateTimesInterval);
                        },

                        updateTimingInfo: function() {
                            this.totalSpan.innerHTML = ((+new Date() - this.startTime) / 1000).toFixed(2);
                        },

                        drawGraph: function() {
                            const width =
                                Math.max(
                                    ...Object.values(this.stepTimes).map(pt => Object.values(pt).length - 1),
                                    this.pageTotal ? this.pageTotal : 0
                                );
                            const height = Math.max(...Array.prototype.concat(...Object.values(this.stepTimes).map(pt => Object.values(pt).slice(1))));
                            this.graph.canvas.width = this.graph.canvas.clientWidth * this.graph.resolutionMultiplier;
                            this.graph.canvas.height = this.graph.canvas.clientHeight * this.graph.resolutionMultiplier;
                            const ctx = this.graph.canvas.getContext('2d');
                            ctx.width = this.graph.canvas.width;
                            ctx.height = this.graph.canvas.height;

                            const xCoordFromVal = xVal =>
                                this.graph.margins.left +
                                ctx.width * (1 - (this.graph.margins.left + this.graph.margins.right) / ctx.width) * (xVal / width);
                            const yCoordFromVal = yVal =>
                                this.graph.margins.top +
                                ctx.height * (1 - (this.graph.margins.bottom + this.graph.margins.top) / ctx.height) * (1 - yVal / height);

                            ctx.clearRect(0, 0, ctx.width, ctx.height);

                            this.graph.margins = {
                                bottom: (this.rem * 2 + this.graph.textMargin) * this.graph.resolutionMultiplier,
                                top: this.graph.circleRadius * this.graph.resolutionMultiplier + 2,
                                left: (this.rem * 2.25 + this.graph.textMargin) * this.graph.resolutionMultiplier,
                                right: this.graph.circleRadius * this.graph.resolutionMultiplier + 0.5 * this.rem * this.graph.resolutionMultiplier
                            };

                            // draw axes
                            ctx.lineWidth = 0.5 * this.graph.resolutionMultiplier;
                            ctx.strokeStyle = this.colours[0];
                            ctx.beginPath();
                            ctx.moveTo(
                                // top left
                                this.graph.margins.left - ctx.lineWidth,
                                this.graph.margins.top
                            );
                            ctx.lineTo(
                                // bottom left
                                this.graph.margins.left - ctx.lineWidth,
                                ctx.height - this.graph.margins.bottom + ctx.lineWidth
                            );
                            ctx.lineTo(
                                // bottom right
                                ctx.width - this.graph.margins.right,
                                ctx.height - this.graph.margins.bottom + ctx.lineWidth
                            );

                            // axis ticks (x-axis)
                            const xTicksStep = 10 ** Math.trunc(Math.log10(width * 5) - 1);
                            for (let x = 1; x < width; x++) {
                                if (x % xTicksStep === 0) {
                                    ctx.moveTo(xCoordFromVal(x), ctx.height - this.graph.margins.bottom + ctx.lineWidth);
                                    ctx.lineTo(
                                        xCoordFromVal(x),
                                        ctx.height - this.graph.margins.bottom + ctx.lineWidth + 0.3 * this.rem * this.graph.resolutionMultiplier
                                    );
                                }
                            }

                            ctx.stroke();
                            ctx.closePath();

                            // axis labels
                            ctx.fillStyle = this.colours[0];
                            ctx.font = 0.8 * this.graph.resolutionMultiplier + 'rem serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'top';
                            ctx.fillText(
                                'Page Number',
                                (ctx.width + this.graph.margins.left - this.graph.margins.right) / 2,
                                ctx.height - this.graph.margins.bottom + 1.2 * this.graph.resolutionMultiplier * this.rem
                            );

                            this.graph.points = {};

                            // draw data
                            ctx.lineWidth = 1.5 * this.graph.resolutionMultiplier;
                            let colourIndex = 1;
                            for (const runName in this.stepTimes) {
                                // only draw runs which produce pages (signified by INT step type)
                                const lastItemName = Object.keys(this.stepTimes[runName])[Object.keys(this.stepTimes[runName]).length - 1]
                                if (lastItemName.replace(/^T\\d+\\-/, '').indexOf('PAGE:') !== 0) {
                                    continue;
                                }

                                const points = [];
                                for (const item in this.stepTimes[runName]) {
                                    const pageNo = parseInt(item.replace(/^T\\d+\\-PAGE:/, ''))
                                    if (isNaN(pageNo)) {
                                        continue;
                                    }
                                    points.push({
                                        x: xCoordFromVal(pageNo),
                                        y: yCoordFromVal(this.stepTimes[runName][item]),
                                        item: pageNo,
                                        time: this.stepTimes[runName][item]
                                    });
                                }
                                this.graph.points[runName] = points;

                                ctx.fillStyle = this.colours[colourIndex];
                                ctx.strokeStyle = this.colours[colourIndex++];

                                // draw lines

                                ctx.beginPath();

                                if (points.length > 0) {
                                    ctx.moveTo(points[0].x, points[0].y);
                                }
                                for (const point of points) {
                                    ctx.lineTo(point.x, point.y);
                                }

                                ctx.globalAlpha = 0.6;
                                ctx.stroke();
                                ctx.closePath();

                                // draw shading

                                ctx.beginPath();
                                ctx.moveTo(this.graph.margins.left, ctx.height - this.graph.margins.bottom);
                                for (const point of points) {
                                    ctx.lineTo(point.x, point.y);
                                }
                                if (points.length > 0) {
                                    ctx.lineTo(points[points.length - 1].x, ctx.height - this.graph.margins.bottom);
                                }
                                ctx.lineTo(this.graph.margins.left, ctx.height - this.graph.margins.bottom);

                                ctx.globalAlpha = 0.1;
                                ctx.fill();
                            }
                        },

                        graphHoverHandler: function(e) {
                            const mouseX = e.clientX + window.scrollX - this.graph.canvas.offsetLeft;
                            const mouseY = e.clientY + window.scrollY - this.graph.canvas.offsetTop;

                            let closestPoint = { r2: +Infinity };
                            let runCount = 0;
                            for (const runName in this.graph.points) {
                                for (const point of this.graph.points[runName]) {
                                    const r2 =
                                        (point.x / this.graph.resolutionMultiplier - mouseX) ** 2 +
                                        (point.y / this.graph.resolutionMultiplier - mouseY) ** 2;
                                    if (r2 < closestPoint.r2) {
                                        closestPoint = {
                                            r2,
                                            x: point.x,
                                            y: point.y,
                                            item: point.item,
                                            time: point.time,
                                            runName,
                                            runCount
                                        };
                                    }
                                }
                                runCount++;
                            }

                            if (closestPoint.r2 <= this.graph.maxMouseRadiusForTooltip ** 2 * this.graph.resolutionMultiplier) {
                                this.drawGraph();
                                const ctx = this.graph.canvas.getContext('2d');
                                ctx.strokeStyle = this.colours[closestPoint.runCount + 1];
                                ctx.fillStyle = this.colours[closestPoint.runCount + 1];
                                ctx.globalAlpha = 0.5;
                                ctx.beginPath();
                                ctx.arc(closestPoint.x, closestPoint.y, this.graph.circleRadius * this.graph.resolutionMultiplier, 0, 2 * Math.PI);
                                ctx.stroke();
                                ctx.globalAlpha = 0.1;
                                ctx.fill();

                                ctx.font = this.graph.resolutionMultiplier + 'rem serif';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'top';

                                ctx.globalAlpha = 1;
                                ctx.fillText(
                                    closestPoint.item,
                                    closestPoint.x,
                                    ctx.height - this.graph.margins.bottom + this.graph.textMargin * this.graph.resolutionMultiplier
                                );

                                ctx.textAlign = 'right';
                                ctx.fillText(
                                    closestPoint.time,
                                    this.graph.margins.left - this.graph.textMargin * this.graph.resolutionMultiplier,
                                    closestPoint.y
                                );
                                ctx.font = 0.8 * this.graph.resolutionMultiplier + 'rem serif';
                                ctx.fillText(
                                    'ms',
                                    this.graph.margins.left - this.graph.textMargin * this.graph.resolutionMultiplier,
                                    closestPoint.y + this.rem * this.graph.resolutionMultiplier * 0.8
                                );

                                ctx.globalAlpha = 0.7;
                                ctx.font = 1.2 * this.graph.resolutionMultiplier + 'rem serif';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'top';
                                ctx.fillText(
                                    closestPoint.runName.replace(/(\\d+)\\-(\\w+)/, '$2 (rule $1)'),
                                    (ctx.width + this.graph.margins.left - this.graph.margins.right) / 2,
                                    this.graph.margins.top
                                );
                            } else {
                                this.drawGraph();
                            }
                        }
                    };
                </script>
            </body>
        </html>
        `
        // #endregion

        if (this.currentBuild) {
            this.panel.reveal(vscode.ViewColumn.Beside)
            this.panel.webview.postMessage({
                type: 'init',
                startTime: this.currentBuild.buildStart,
                stepTimes: this.currentBuild.stepTimes,
                pageTotal: this.currentBuild.pageTotal
            })
        }
    }

    private displayProgress(current: string | number) {
        if (!this.currentBuild) {
            throw Error(`Can't Display Progress for non-Started build - see BuildInfo.buildStarted()`)
        }

        this.configuration = vscode.workspace.getConfiguration('latex-workshop')

        if (current === 0) {
            this.currentBuild.stepTimes[`${this.currentBuild.ruleNumber}-${this.currentBuild.ruleName}`][`T${+new Date()}-Wait Time`] =
                +new Date() - this.currentBuild.lastStepTime
        } else {
            if (this.currentBuild.ruleProducesPages) {
                // if page already exists, add times and remove old entry
                const pageAlreadyExistsRegex = new RegExp(`^T\\d+-PAGE:${current}`)
                const pageMatchArray = Object.keys(
                    this.currentBuild.stepTimes[`${this.currentBuild.ruleNumber}-${this.currentBuild.ruleName}`]
                ).map(pageLabel => Boolean(pageLabel.match(pageAlreadyExistsRegex)))

                let extraTime = 0
                if (pageMatchArray.indexOf(true) !== -1) {
                    extraTime = this.currentBuild.stepTimes[`${this.currentBuild.ruleNumber}-${this.currentBuild.ruleName}`][
                        Object.keys(this.currentBuild.stepTimes[`${this.currentBuild.ruleNumber}-${this.currentBuild.ruleName}`])[
                            pageMatchArray.indexOf(true)
                        ]
                    ]
                    delete this.currentBuild.stepTimes[`${this.currentBuild.ruleNumber}-${this.currentBuild.ruleName}`][
                        Object.keys(this.currentBuild.stepTimes[`${this.currentBuild.ruleNumber}-${this.currentBuild.ruleName}`])[
                            pageMatchArray.indexOf(true)
                        ]
                    ]
                } else {
                    const pagesProducedByCurrentRule =
                        Object.keys(this.currentBuild.stepTimes[`${this.currentBuild.ruleNumber}-${this.currentBuild.ruleName}`]).length -
                        1

                    if (typeof this.currentBuild.pageTotal !== 'number' || pagesProducedByCurrentRule > this.currentBuild.pageTotal) {
                        this.currentBuild.pageTotal = pagesProducedByCurrentRule
                    }
                }

                this.currentBuild.stepTimes[`${this.currentBuild.ruleNumber}-${this.currentBuild.ruleName}`][
                    `T${+new Date()}-PAGE:${current}`
                ] = +new Date() - this.currentBuild.lastStepTime + extraTime
            } else {
                this.currentBuild.stepTimes[`${this.currentBuild.ruleNumber}-${this.currentBuild.ruleName}`][`T${+new Date()}-${current}`] =
                    +new Date() - this.currentBuild.lastStepTime
            }
        }

        this.currentBuild.lastStepTime = +new Date()

        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'update',
                stepTimes: this.currentBuild.stepTimes,
                pageTotal: this.currentBuild.pageTotal
            })
        }

        const generateProgressBar = (proportion: number, length: number) => {
            const wholeCharacters = Math.trunc(length * proportion)

            interface IProgressBarCharacterSets {
                [settingsName: string]: {
                    wholeCharacter: string;
                    partialCharacters: string[];
                    blankCharacter: string;
                }
            }

            const characterSets: IProgressBarCharacterSets = {
                none: {
                    wholeCharacter: '',
                    partialCharacters: [''],
                    blankCharacter: ''
                },
                'Block Width': {
                    wholeCharacter: '█',
                    partialCharacters: ['', '▏', '▎', '▍', '▌ ', '▋', '▊', '▉', '█ '],
                    blankCharacter: '░'
                },
                'Block Shading': {
                    wholeCharacter: '█',
                    partialCharacters: ['', '░', '▒', '▓'],
                    blankCharacter: '░'
                },
                'Block Quadrants': {
                    wholeCharacter: '█',
                    partialCharacters: ['', '▖', '▚', '▙'],
                    blankCharacter: '░'
                }
            }

            const selectedCharacterSet = this.configuration.get('progress.barStyle') as string

            const wholeCharacter = characterSets[selectedCharacterSet].wholeCharacter
            const partialCharacter =
                characterSets[selectedCharacterSet].partialCharacters[
                    Math.round((length * proportion - wholeCharacters) * (characterSets[selectedCharacterSet].partialCharacters.length - 1))
                ]
            const blankCharacter = characterSets[selectedCharacterSet].blankCharacter

            return (
                wholeCharacter.repeat(wholeCharacters) +
                partialCharacter +
                blankCharacter.repeat(Math.max(0, length - wholeCharacters - partialCharacter.length))
            )
        }

        const enclosedNumbers = {
            Parenthesised: {
                0: '⒪',
                1: '⑴',
                2: '⑵',
                3: '⑶',
                4: '⑷',
                5: '⑸',
                6: '⑹',
                7: '⑺',
                8: '⑻',
                9: '⑼',
                10: '⑽',
                11: '⑾',
                12: '⑿',
                13: '⒀',
                14: '⒁',
                15: '⒂',
                16: '⒃',
                17: '⒄',
                18: '⒅',
                19: '⒆',
                20: '⒇'
            },
            Circled: {
                0: '⓪',
                1: '①',
                2: '②',
                3: '③',
                4: '④',
                5: '⑤',
                6: '⑥',
                7: '⑦',
                8: '⑧',
                9: '⑨',
                10: '⑩',
                11: '⑪',
                12: '⑫',
                13: '⑬',
                14: '⑭',
                15: '⑮',
                16: '⑯',
                17: '⑰',
                18: '⑱',
                19: '⑲',
                20: '⑳'
            },
            'Solid Circled': {
                0: '⓿',
                1: '❶',
                2: '❷',
                3: '❸',
                4: '❹',
                5: '❺',
                6: '❻',
                7: '❼',
                8: '❽',
                9: '❾',
                10: '❿',
                11: '⓫',
                12: '⓬',
                13: '⓭',
                14: '⓮',
                15: '⓯',
                16: '⓰',
                17: '⓱',
                18: '⓲',
                19: '⓳',
                20: '⓴'
            },
            'Full Stop': {
                0: '0.',
                1: '⒈',
                2: '⒉',
                3: '⒊',
                4: '⒋',
                5: '⒌',
                6: '⒍',
                7: '⒎',
                8: '⒏',
                9: '⒐',
                10: '⒑',
                11: '⒒',
                12: '⒓',
                13: '⒔',
                14: '⒕',
                15: '⒖',
                16: '⒗',
                17: '⒘',
                18: '⒙',
                19: '⒚',
                20: '⒛'
            }
        }
        const padRight = (str: string, desiredMinLength: number) => {
            if (str.length < desiredMinLength) {
                str = str + ' '.repeat(desiredMinLength - str.length)
            }
            return str
        }

        const runIcon: string = enclosedNumbers[this.configuration.get('progress.runIconType') as string][this.currentBuild.ruleNumber]
        // set generic status text
        this.status.text = `${runIcon} ${this.currentBuild.ruleName}`

        // if we have a page no. we can do better
        if (this.currentBuild.ruleProducesPages) {
            if (typeof current === 'string') {
                current = parseInt(current)
            }
            const currentAsString = current.toString()
            const endpointAsString = this.currentBuild.pageTotal ? '/' + this.currentBuild.pageTotal.toString() : ''
            const barAsString = this.currentBuild.pageTotal
                ? generateProgressBar(current / this.currentBuild.pageTotal, this.configuration.get('progress.barLength') as number)
                : ''
            this.status.text = `${runIcon}  Page ${padRight(
                currentAsString + endpointAsString,
                this.currentBuild.pageTotal ? this.currentBuild.pageTotal.toString().length * 2 + 2 : 6
            )} ${barAsString}`
        }
    }
}
