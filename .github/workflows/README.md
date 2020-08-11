## Overview

We run tests on GitHub Actions on Windows, macOS, and Linux with the minimal installations of TeX Live.

We can see [software](https://docs.github.com/en/actions/reference/software-installed-on-github-hosted-runners) installed on each platform by default. Perl 5 is installed even on Windows. So, all we have to do is just installing TeX Live.

### Cache

To avoid install TeX Live each time, we use a caching feature, [actions/cache](https://github.com/actions/cache). The caches for the `master` branch are also used for feature branches.

The caches are removed if they have not been accessed in over 7 days.
When we want to remove the caches manually, increase the number of `cache-version` on each YAML file.

```yaml
env:
  cache-version: v2
```

### References

For the details of GitHub Actions, read the following documents.

- https://docs.github.com/en/actions
- https://docs.github.com/en/actions/configuring-and-managing-workflows/caching-dependencies-to-speed-up-workflows
- https://github.com/actions/checkout
- https://github.com/actions/cache
- https://github.com/actions/setup-node

For the `tlmgr` command of TeX Live, see:

- https://www.tug.org/texlive/tlmgr.html
- https://www.tug.org/texlive/doc/tlmgr.html
