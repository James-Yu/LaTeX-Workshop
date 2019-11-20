window.addEventListener('message', event => {
    const data = event.data;

    if (data.type === 'init') {
        if (progressManager.startTime) {
            progressManager.backupTimeElapsed = progressManager.totalSpan.innerHTML;
        }
        progressManager.startTime = data.startTime;
        if (progressManager.stepTimes) {
            progressManager.backupStepTimes = progressManager.stepTimes;
        }
        progressManager.stepTimes = data.stepTimes ? data.stepTimes : {};
        progressManager.pageTotal = data.pageTotal;
        progressManager.maxTime = 0;

        progressManager.start(10);
    } else if (data.type === 'finished') {
        progressManager.stop();

        // if nothing happened i.e. latexmk ran and did nothing, keep the old data
        if (Object.keys(progressManager.stepTimes).length === 0) {
            progressManager.stepTimes = progressManager.backupStepTimes;
            progressManager.updateStepTimesUl();
            progressManager.drawGraph();
            if (progressManager.backupTimeElapsed) {
                progressManager.totalSpan.innerHTML = progressManager.backupTimeElapsed;
            }
        }
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
    backupStartTime: null,
    stepTimes: {},
    backupStepTimes: {},
    pageTotal: null,
    stepTimesDiv: document.getElementById('stepTimes'),
    totalSpan: document.getElementById('total'),
    updateTimesInterval: null,
    colours: [],
    maxTime: 0,
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

    init: function() {
        this.colours = [
            window.getComputedStyle(document.getElementById('color0')).color,
            window.getComputedStyle(document.getElementById('color1')).color,
            window.getComputedStyle(document.getElementById('color2')).color,
            window.getComputedStyle(document.getElementById('color3')).color,
            window.getComputedStyle(document.getElementById('color4')).color,
            window.getComputedStyle(document.getElementById('color5')).color,
            window.getComputedStyle(document.getElementById('color6')).color,
            window.getComputedStyle(document.getElementById('color7')).color
        ];
    },

    updateStepTimesUl: function() {
        this.stepTimesDiv.innerHTML = '';
        let colourIndex = 1;

        for (const runName in this.stepTimes) {
            colourIndex++;

            const column = document.createElement('div');
            column.classList.add('column');

            const runInfo = document.createElement('h3');
            runInfo.innerHTML = styliseTeX(runName.replace(/(\d+)\-(\w+)/, '$2 \u2014 Rule $1'));
            column.appendChild(runInfo);
            const ul = document.createElement('ul');
            for (const item in this.stepTimes[runName]) {
                let itemLabel = item;
                itemLabel = itemLabel.replace(/^T\d+\-/, '');
                if (itemLabel.indexOf('PAGE:') === 0) {
                    itemLabel = itemLabel.replace('PAGE:', '');
                    itemLabel = 'Page ' + (itemLabel !== '1' ? itemLabel : itemLabel + ' + Preamble');
                }
                const li = document.createElement('li');
                const timeBar = `<div class="timeBar" style="
                    background: ${progressManager.colours[colourIndex]};
                    width: ${(100 * this.stepTimes[runName][item]) / this.maxTime}%;
                " data-time="${this.stepTimes[runName][item]}"></div>`;
                if (this.stepTimes[runName][item] > this.maxTime) {
                    this.maxTime = this.stepTimes[runName][item];
                    this.recalculateTimeBars();
                }
                li.innerHTML =
                    timeBar +
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

    recalculateTimeBars: function() {
        const bars = document.querySelectorAll('.timeBar');
        bars.forEach(bar => {
            bar.style.width = (100 * parseInt(bar.getAttribute('data-time'))) / this.maxTime + '%';
        });
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
        const width = Math.max(
            ...Object.values(this.stepTimes).map(pt => Object.values(pt).length - 1),
            this.pageTotal ? this.pageTotal : 0
        );
        const height = Math.max(
            ...Array.prototype.concat(...Object.values(this.stepTimes).map(pt => Object.values(pt).slice(1)))
        );
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
            right:
                this.graph.circleRadius * this.graph.resolutionMultiplier +
                0.5 * this.rem * this.graph.resolutionMultiplier
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
                    ctx.height -
                        this.graph.margins.bottom +
                        ctx.lineWidth +
                        0.3 * this.rem * this.graph.resolutionMultiplier
                );
            }
        }

        ctx.stroke();
        ctx.closePath();

        // axis labels
        ctx.fillStyle = this.colours[0];
        ctx.font = 0.8 * this.graph.resolutionMultiplier + 'rem sans-serif';
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
            const lastItemName = Object.keys(this.stepTimes[runName])[Object.keys(this.stepTimes[runName]).length - 1];
            if (lastItemName.replace(/^T\d+\-/, '').indexOf('PAGE:') !== 0) {
                continue;
            }

            const points = [];
            for (const item in this.stepTimes[runName]) {
                const pageNo = parseInt(item.replace(/^T\d+\-PAGE:/, ''));
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
            ctx.arc(
                closestPoint.x,
                closestPoint.y,
                this.graph.circleRadius * this.graph.resolutionMultiplier,
                0,
                2 * Math.PI
            );
            ctx.stroke();
            ctx.globalAlpha = 0.1;
            ctx.fill();

            ctx.font = this.graph.resolutionMultiplier + 'rem sans-serif';
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
            ctx.font = 0.8 * this.graph.resolutionMultiplier + 'rem sans-serif';
            ctx.fillText(
                'ms',
                this.graph.margins.left - this.graph.textMargin * this.graph.resolutionMultiplier,
                closestPoint.y + this.rem * this.graph.resolutionMultiplier * 0.8
            );

            ctx.globalAlpha = 0.7;
            ctx.font = 1.2 * this.graph.resolutionMultiplier + 'rem sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(
                closestPoint.runName.replace(/(\d+)\-(\w+)/, '$2 (rule $1)'),
                (ctx.width + this.graph.margins.left - this.graph.margins.right) / 2,
                this.graph.margins.top
            );
        } else {
            this.drawGraph();
        }
    }
};

window.onload = () => {
    progressManager.init();
};
