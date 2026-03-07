# Contributing to LaTeX-Workshop

Typo fixes and other documentation improvements are welcome.
Please note that pull requests that change default setting values or add additional recipes to the default settings are generally not accepted.

## Quickstart

```bash
git clone https://github.com/James-Yu/LaTeX-Workshop.git
cd ./LaTeX-Workshop
cp ./dev/githooks/pre-commit .git/hooks/
npm ci
code -n .
```

Press <kbd>F5</kbd> in VS Code to start the development version in debug mode.

## Prerequisites for building the extension

Make sure you have installed:

- [`Node.js`](https://nodejs.org/) v18
- `npm` v10
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
