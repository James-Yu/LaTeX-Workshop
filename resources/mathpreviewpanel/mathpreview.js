const vscode = acquireVsCodeApi();
const img = document.getElementById('math');
window.addEventListener('message', event => {
  const message = event.data;
  switch (message.type) {
    case "mathImage": {
      img.src = message.src;
      break;
    }
    default: {
      break;
    }
  }
});
vscode.postMessage({type: 'initialized'});
