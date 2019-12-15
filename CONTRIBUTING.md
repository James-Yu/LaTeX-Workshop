# Contributing to LaTeX-Workshop

## Quickstart (mac/linux)

```bash
git clone https://github.com/James-Yu/LaTeX-Workshop.git
cd ./LaTeX-Workshop
npm install --no-optional
command code .
```
Press <kbd>F5</kbd> in vscode to start the development version in debug mode.

## Prerequisites for building the extension

Make sure you have installed:

- [`node.js`](https://nodejs.org/) v12
- `npm`
- the [`eslint`](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extension for VS Code (recommended)

Then run

    npm install --no-optional

inside the extension workspace to download the node modules needed to build the extension.

## Development

To lint changes, run

    npm run lint

To compile, run

    npm run compile

To build a release image, run

    npm run release

## Testing and debugging the extension

In VS Code, simply press <kbd>F5</kbd> (or run `Debug: Start Debugging` from the command palette) and a new window will pop up where you can test the extension.

### Debugging PDF viewer

To debug the internal PDF viewer, select `View LaTeX PDF > View in web browser,` and view a PDF file in Google Chrome. You can debug the viewer with [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools/) as a general web application.
