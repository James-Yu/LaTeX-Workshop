# Contributing to LaTeX-Workshop

Please notice that we can reject any kinds of pull requests. Especially, we will reject any requests for changes on default values of settings.
We also reject requests adding additional recipes to default settings.

## Quickstart

```bash
git clone https://github.com/James-Yu/LaTeX-Workshop.git
cd ./LaTeX-Workshop
cp ./dev/githooks/pre-commit .git/hooks/
npm ci
code -n .
```

Press <kbd>F5</kbd> in vscode to start the development version in debug mode.

## Prerequisites for building the extension

Make sure you have installed:

- [`node.js`](https://nodejs.org/) v16
- `npm` v8
- the [`eslint`](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extension for VS Code (recommended)

Then run

    npm ci

inside the extension workspace to download the node modules needed to build the extension.

## Development

To lint changes, run

    npm run lint

To compile, run

    npm run compile

To build a release image, run

    npm run release

To run tests, run

    npm run test

To run a specific test, run

    npm run test build/fixture001

## Testing and debugging the extension

In VS Code, run `Debug: Select and Start Debugging` from the Command Palette, and select `Run Extension`. A new window will pop up where you can test the extension.

## Documents

You can refer to:

- https://github.com/James-Yu/LaTeX-Workshop/wiki
- https://github.com/James-Yu/LaTeX-Workshop/blob/master/src/README.md
- https://github.com/James-Yu/LaTeX-Workshop/blob/master/viewer/README.md
- https://github.com/James-Yu/LaTeX-Workshop/blob/master/data/README.md
- https://github.com/James-Yu/LaTeX-Workshop/blob/master/resources/snippetview/README.md
- https://github.com/James-Yu/LaTeX-Workshop/blob/master/test/README.md
- https://github.com/James-Yu/LaTeX-Workshop/blob/master/.github/workflows/README.md
