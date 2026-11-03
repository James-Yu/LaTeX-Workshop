// Test-only instrumentation; never included in the packaged extension.
window.labWorkers = { created: 0, terminated: 0, live: 0, maxLive: 0 };
const NativeWorker = window.Worker;
window.Worker = class extends NativeWorker {
    constructor(...args) {
        super(...args);
        window.labWorkers.created++; window.labWorkers.live++;
        window.labWorkers.maxLive = Math.max(window.labWorkers.maxLive, window.labWorkers.live);
    }
    terminate() {
        if (!this.labTerminated) {
            this.labTerminated = true;
            window.labWorkers.terminated++; window.labWorkers.live--;
        }
        return super.terminate();
    }
};
window.labErrors = [];
window.addEventListener('error', e => window.labErrors.push(String(e.error || e.message)));
window.addEventListener('unhandledrejection', e => window.labErrors.push(String(e.reason)));
