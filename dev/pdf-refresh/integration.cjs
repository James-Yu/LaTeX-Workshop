const vscode = require('vscode');
const fs = require('node:fs');
const path = require('node:path');
exports.run = async function() {
    const lab=__dirname;
    const output=path.join(lab,'results'); fs.mkdirSync(output,{recursive:true});
    const extension=vscode.extensions.getExtension('James-Yu.latex-workshop');
    await extension.activate();
    const {lw}=require(path.join(extension.extensionPath,'out/src/lw.js'));
    const events=[];
    let done,fail;
    const finished=new Promise((resolve,reject)=>{done=resolve;fail=reject;});
    const record=data=>{
        if(data.type==='lab_result') {
            const event=data.value;events.push(event);
            fs.writeFileSync(path.join(output,'electron-render-progress.json'),JSON.stringify(events,null,2));
            console.log('[LAB]',JSON.stringify(event));
            if(event.phase==='complete')done(event);
            if(event.phase==='failed')fail(Error(event.error));
        }
    };
    lw.server.setHandler(request=>['/viewer.html','/lab-prelude.mjs','/lab-render-test.mjs','/lab-test-config.json'].includes(request.split('?')[0])?path.join(__dirname,'assets'):undefined);
    await lw.server.initialized();
    const tex=vscode.Uri.file(path.join(lab,'project/fixture.tex'));
    const doc=await vscode.workspace.openTextDocument(tex);
    await vscode.window.showTextDocument(doc,vscode.ViewColumn.One);
    const pdf=vscode.Uri.file(path.join(lab,'project/fixture.pdf'));
    await lw.viewer.view(pdf,'tab');
    const manager=require(path.join(extension.extensionPath,'out/src/preview/viewer/pdfviewermanager.js'));
    const subscriptions=[];
    for(const panel of manager.getPanels(pdf) ?? [])subscriptions.push(panel.webviewPanel.webview.onDidReceiveMessage(record));
    const timer=setTimeout(()=>fail(Error('Integration run timed out')),25*60*1000);
    try {
        const result=await finished;
        fs.writeFileSync(path.join(output,'electron-render-result.json'),JSON.stringify({vscode:vscode.version,extension:extension.packageJSON.version,...result},null,2));
    } finally {clearTimeout(timer);for(const subscription of subscriptions)subscription.dispose();}
};
