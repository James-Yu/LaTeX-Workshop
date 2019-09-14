# Contributing to LaTeX-Workshop

## Prerequisites for building the extension

Make sure you have installed:

- [`node.js`](https://nodejs.org/) v10
- `npm`
- the [`eslint`](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extension for VS Code (recommended)

Then run

    npm install

inside the extension workspace to download the node modules needed to build the extension.

## Development

To lint changes, run

    npm run lint

To compile, run

    npm run compile

To build a release image, run

    npm run release

## Testing the extension

In VS Code, simply press `<F5>` (or run `Debug: Start Debugging` from the command palette) and a new window will pop up where you can test the extension.