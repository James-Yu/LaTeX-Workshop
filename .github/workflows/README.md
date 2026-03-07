# Overview

We run tests on GitHub Actions on Windows, macOS, and Linux with the minimal installations of TeX Live.

We can see [preinstalled software](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners#preinstalled-software) on each platform. Perl 5 is installed even on Windows. So, all we have to do is just installing TeX Live.

## Installing TeX Live

For the installer of TeX Live, `install-tl`, see the [official manual](https://tug.org/texlive/doc/install-tl.html). Giving a profile fie to the option, `-profile`, we can install TeX Live in batch mode with no user interaction.

The CI workflows download TeX Live installers from CTAN over HTTPS only, and verify them with the published `.sha512` checksum and `.sha512.asc` signature before extraction or execution. When changing these workflows, avoid plaintext HTTP downloads and prefer strict `curl` options that fail closed on transfer or TLS errors.

We no longer download standalone `latexindent` binaries in CI. Instead, after `tlmgr install latexindent`, each workflow creates a small wrapper around the installed `latexindent.pl` script. This avoids executing an extra unsigned binary fetched from a mirror.

We can see available installation schemes, `scheme-infraonly`, `scheme-small`, and so on in
```
/usr/local/texlive/2019/tlpkg/texlive.tlpdb
```

For the management command of TeX Live, `tlmgr`, see the [official document](https://www.tug.org/texlive/doc/tlmgr.html).

## Cache

To avoid install TeX Live each time, we use a caching feature, [actions/cache](https://github.com/actions/cache). The caches for the `master` branch are also used for feature branches.

Because these caches contain executable toolchains, any cache-key changes should be treated as a trust-boundary change and reviewed carefully.

The caches are removed if they have not been accessed in over 7 days.
When we want to remove the caches manually, increase the number of `cache-version` on each YAML file.

```yaml
env:
  cache-version: v2
```

## References

For the details of GitHub Actions, read the following documents.

- https://docs.github.com/en/actions
- https://docs.github.com/en/actions/configuring-and-managing-workflows/caching-dependencies-to-speed-up-workflows
- https://github.com/actions/checkout
- https://github.com/actions/cache
- https://github.com/actions/setup-node
