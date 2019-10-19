const vscode = acquireVsCodeApi();
const img = document.getElementById('math');
img.addEventListener('load', () => {
  const mathBlock = document.getElementById('mathBlock');
  mathBlock.style.height = window.innerHeight + 'px';
  img.style.top = (window.innerHeight - img.height) / 2 + 'px';
  if (img.width >= window.innerWidth) {
    img.style.left = '0px';
  } else {
    const leftRatio = 0.5;
    img.style.left = (window.innerWidth - img.width) * leftRatio + 'px';
    window.addEventListener('resize', () => {
      img.style.left = (window.innerWidth - img.width) * leftRatio + 'px';
    })
  }
  img.style.visibility = 'visible';
});
window.addEventListener('message', event => {
  const message = event.data; // The JSON data our extension sent
  switch (message.type) {
    case "mathImage":
      img.src = message.src;
      break;
    default:
      break;
  }
});
vscode.postMessage({type: 'initialized'});
