## Overview

With [VS Code Remote Development](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack), we can develop LaTeX Workshop in a container by executing `Remote-Containers: Reopen Folder in Container`. See:

- https://code.visualstudio.com/docs/remote/containers#_quick-start-open-an-existing-folder-in-a-container
- https://code.visualstudio.com/api/advanced-topics/remote-extensions#debugging-in-a-custom-development-container

## Docker images

We can switch docker images by rewriting the `dockerFile` property in `devcontainer.json`. See also [the reference](https://code.visualstudio.com/docs/remote/devcontainerjson-reference).

`stable/`: Docker image to develop the extension with the stable version of TeX Live. Based on the `bullseye` image on [the official Debian](https://hub.docker.com/_/debian).

`sid/`: Docker image to develop the extension with the testing version of TeX Live. Based on the `sid` image on [the official Debian](https://hub.docker.com/_/debian). See also https://www.debian.org/releases/index.en.html.

`texlive/`: Docker image to develop the extension with the testing version of TeX Live. Based on [the official texlive image](https://hub.docker.com/r/texlive/texlive).
