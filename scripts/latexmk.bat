@docker -H %LATEXWORKSHOP_DOCKER_LOCATION% run -i --rm -w /data -v "%cd%:/data" %LATEXWORKSHOP_DOCKER_LATEX% latexmk %*
