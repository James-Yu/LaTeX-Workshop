'''
Fetch the latest list of packages and their descriptions
from CTAN at https://ctan.org/pkg and save the result as a json file.

The result is used to generate usepackage and documentclass
intellisense for LaTeX Workshop.
'''

from pathlib import Path
import json
import requests

# The file parse_tlpdb.py comes TeX Live Utility, which is a Mac OS X graphical interface for TeX Live Manager. https://github.com/amaxwell/tlutility/blob/master/parse_tlpdb.py
from . import parse_tlpdb

class CtanPkg:
    """
    :ctan_source: The url to retrieve the list of packages from CTAN.
    :ctan_dict: A dictionnary indexed by package names. Each entry contains the following
    dictionnary entries: `command`, `documentation`, `detail`.
    :tl_packages: The array of all packages available in TeXLive. Every element is a `TLPackage` object
    :tl_packages_index_map: The dictionnary of all packages listed in `tl_packages` giving their index in the array
    :tl_all_files: The array of all `.sty` and `.cls` files listed as runfiles in `tl_packages`
    :extra_packages:  A dictionnary of extra packages to include.
    """

    def __init__(self, extra_packages_file=None, ctan_source='https://ctan.org/json/2.0/packages',tlpdb_url='https://mirrors.ircam.fr/pub/CTAN/systems/texlive/tlnet/tlpkg/texlive.tlpdb'):
        """
        :param extra_packages_file: The full path to the JSON file containing some extra entries in the same format as `ctan_dict`
        """

        self.ctan_dict = {}
        self.tl_packages = []
        self.tl_packages_index_map = {}
        self.extra_packages = {}
        self.tl_all_files = []
        self._load_extra_packages(extra_packages_file)
        self._build_ctan_dict(ctan_source)
        self._read_tlpdb(tlpdb_url)


    def _load_extra_packages(self, extra_packages_file):
        if extra_packages_file is not None:
            try:
                self.extra_packages = json.load(open(extra_packages_file))
            except:
                print('Cannot read {}'.format(extra_packages_file))


    def _build_ctan_dict(self, ctan_source):
        try:
            print('Dowloading CTAN package list...')
            ctan_list = requests.get(ctan_source).json()
        except:
            print('Cannot get package list from {}'.format(ctan_source))
            return
        for x in ctan_list:
            self.ctan_dict[x['key']] = {}
            self.ctan_dict[x['key']]['command'] = x['key']
            self.ctan_dict[x['key']]['documentation'] = 'https://ctan.org/pkg/' + x['key']
            self.ctan_dict[x['key']]['detail'] = x['caption']


    def _read_tlpdb(self, tlpdb_url):
        try:
            print('Downloading TL Package DB...')
            r = requests.get(tlpdb_url)
            r.encoding = 'utf-8' # No encoding is present in the response as it is ASCII, we have to enforce it to get strings and not bytes.
            self.tl_packages, self.tl_packages_index_map = parse_tlpdb.packages_from_tlpdb(r.iter_lines(decode_unicode=True))
        except:
            print('Cannot retrieve the tlpdb file from {}'.format(tlpdb_url))
            return
        self.tl_all_files = [Path(f).name for pkg in self.tl_packages for f in pkg.runfiles if Path(f).suffix in ['.sty', '.def', '.cls'] ]


    def package2sty(self, pkgname):
        """
        Find the main .sty file for a given package

        :return a filename without the .sty extension or None
        """
        styname = pkgname + '.sty'
        if styname in self.tl_all_files:
            return pkgname
        if pkgname in self.tl_packages_index_map:
            files = [Path(f) for f in self.tl_packages[self.tl_packages_index_map[pkgname]].runfiles]
            if pkgname + '.sty' in files:
                return pkgname
            else:
                for f in files:
                    if f.name.lower() == pkgname + '.sty':
                        return f.stem
        return None


    def pkg_exists(self, pkgname, suffix):
        """
        Check if a file pkgname + suffix exists in `tl_all_files`

        :param pkgname: The name of a package
        :param suffix: The suffix to add to get a real file name
        """
        if pkgname in self.tl_packages_index_map:
            files = [Path(f).name for f in self.tl_packages[self.tl_packages_index_map[pkgname]].runfiles]
            if pkgname + suffix in files:
                return True
        return False


    def get_classes(self):
        """
        Get all the .cls files in `tl_all_files` and extract the corresponding details from `ctan_dict` if the entry exists
        """
        class_data = {}
        for c in self.tl_all_files:
            if not c.endswith('.cls'):
                continue
            base = Path(c).stem
            detail = ''
            documentation = ''
            if base in self.ctan_dict:
                detail = self.ctan_dict[base]['detail']
                documentation = self.ctan_dict[base]['documentation']
            class_data[base] = {}
            class_data[base]['command'] = base
            class_data[base]['detail'] = detail
            class_data[base]['documentation'] = documentation
        return class_data


    def get_packages(self):
        """
        Get the packages for which a .sty file exists and the extra_packages
        """
        packages = {}
        for pkg in self.ctan_dict:
            basefile = self.package2sty(pkg)
            if basefile is not None:
                packages[pkg] = self.ctan_dict[pkg].copy()
                packages[pkg]['command'] = basefile
        for pkg in self.extra_packages:
            if pkg not in packages.keys():
                packages[pkg] = self.extra_packages[pkg].copy()
        return packages
