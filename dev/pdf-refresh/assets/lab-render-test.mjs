import * as refreshApi from './out/viewer/components/refresh.js';
import { send } from './out/viewer/components/connection.js';
const {refresh}=refreshApi;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const report = async value => {
    window.parent.postMessage({type:'lab_result', value}, '*');
    await send({type:'add_log',message:'[LAB]'+JSON.stringify(value)});
};
async function waitFor(predicate, timeout=30000) {
    const started=Date.now();
    while(!predicate()) { if(Date.now()-started>timeout)throw Error('Timed out waiting for test condition'); await sleep(20); }
}
try {
    await waitFor(()=>window.PDFViewerApplication?.pdfDocument);
    const app=window.PDFViewerApplication;
    await app.pdfViewer.firstPagePromise;
    await sleep(500);
    const params=await (await fetch('lab-test-config.json')).json();
    const count=params.count;
    const baseline=params.kind==='baseline';
    const trackedListeners=new Map();
    const busPrototype=Object.getPrototypeOf(app.eventBus);
    const originalOn=busPrototype.on, originalOff=busPrototype.off;
    busPrototype.on=function(name,fn,...args) { if(this===app.eventBus) { if(!trackedListeners.has(name))trackedListeners.set(name,new Set()); trackedListeners.get(name).add(fn); } return originalOn.call(this,name,fn,...args); };
    busPrototype.off=function(name,fn,...args) { if(this===app.eventBus)trackedListeners.get(name)?.delete(fn); return originalOff.call(this,name,fn,...args); };
    const samples=[];

    for(let i=0;i<count;i++) {
        if(i%100===0) {
            app.pdfViewer.currentScaleValue = i%200===0 ? 'page-width' : '1.5';
            await sleep(100);
            const targetPage = [1,2,3,1][Math.floor(i/100)%4];
            app.pdfViewer.currentPageNumber = targetPage;
            await sleep(300);
            if (app.pdfViewer.currentPageNumber !== targetPage) throw Error('Navigation did not persist before refresh: '+targetPage+' became '+app.pdfViewer.currentPageNumber);
        }
        const page=app.pdfViewer.currentPageNumber;
        const before=performance.now();
        const oldDocument=app.pdfDocument;
        await refresh();
        await waitFor(()=>app.pdfDocument && app.pdfDocument!==oldDocument);
        await waitFor(()=>document.hidden || (app.pdfViewer._getVisiblePages().views.length && app.pdfViewer._getVisiblePages().views.every(p=>p.view.renderingState===3)));
        const state=refreshApi.getRefreshDiagnostics?.() ?? {failed:0};
        if(state.failed)throw Error('Refresh diagnostics reported a failure: '+JSON.stringify(state));
        if(app.pdfViewer.currentPageNumber!==page)throw Error('Page position changed unexpectedly');
        if(!baseline && window.labWorkers.live!==1)throw Error('Unexpected live worker count: '+window.labWorkers.live);
        if(document.querySelectorAll('.lw-refresh-mask').length)throw Error('Snapshot mask was not released');
        if(window.labErrors.length)throw Error('Unhandled errors: '+window.labErrors.join('; '));
        const listenerCount=[...trackedListeners.values()].reduce((n,a)=>n+a.size,0);

        await sleep(1100); // Let the existing upstream rate-limit timer finish.
        if(i%25===0 || i===count-1) {
            const sample={iteration:i+1,durationMs:Math.round(performance.now()-before),workers:{...window.labWorkers},
                listeners:listenerCount,heap:performance.memory?.usedJSHeapSize,page,diagnostics:state};
            samples.push(sample); await report({phase:'progress',...sample});
        }
    }
    await report({phase:'complete',count,kind:params.kind,samples,errors:window.labErrors});
} catch(error) {
    await report({phase:'failed',error:String(error),stack:error?.stack,workers:window.labWorkers,errors:window.labErrors});
}
