## Overview

With [VS Code Remote Development](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack), we can develop LaTeX Workshop in a container by executing `Remote-Containers: Reopen Folder in Container`. See:

- https://code.visualstudio.com/docs/remote/containers#_quick-start-open-an-existing-folder-in-a-container
- https://code.visualstudio.com/api/advanced-topics/remote-extensions#debugging-in-a-custom-development-container

## Docker images

`stable/Dockerfile`: Docker image to develop the extension with the stable version of TeX Live. Based on one of [the official node images](https://hub.docker.com/_/node).

`develop/Dockerfile`: Docker image to develop the extension with the develop version of TeX Live. Based on [the official texlive image](https://hub.docker.com/r/texlive/texlive).
