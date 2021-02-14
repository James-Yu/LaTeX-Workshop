'''
Fetch the latest list of packages and their descriptions
from CTAN at https://ctan.org/pkg and save the result as a json file.

The result is used to generate usepackage and documentclass
intellisense for LaTeX Workshop.
'''

from pathlib import Path
import json
import requests

class CtanPkg:
    """
    :ctan_source: The url to retrieve the list of packages from CTAN.
    :texmf: The path to the local ``texmf`` directory.
    :ctan_dict: A dictionnary indexed by package names. Each entry contains the following
    dictionnary entries: ``command``, ``documentation``, ``detail``.
    :ls_r_db: The  dictionnary listing for every package the ``.sty`` files it contains.
    :ls_r_all_files: The array of all ``.sty`` files available in ``texmf``.
    :extra_packages:  A dictionnary of extra packages to include.
    """

    def __init__(self, texmf, extra_packages_file=None, ctan_source='https://ctan.org/json/2.0/packages',):
        """
        :param extra_packages_file: The full path to the JSON file containing some extra entries in the same format as ``ctan_dict``
        """

        self.ctan_source = ctan_source
        self.texmf = texmf
        self.ctan_dict = {}
        self.ls_r_db = {}
        self.ls_r_all_files = []
        self.extra_packages = {}
        if extra_packages_file is not None:
            try:
                self.extra_packages = json.load(open(extra_packages_file))
            except:
                print('Cannot read {}'.format(extra_packages_file))
        try:
            ctan_list = requests.get(ctan_source).json()
            self._build_ctan_dict(ctan_list)
            (self.ls_r_db, self.ls_r_all_files) = self.load_texmf_db()
        except:
            print('Cannot get package list from {}'.format(ctan_source))
            return

    def _build_ctan_dict(self, ctan_list):
        for x in ctan_list:
            self.ctan_dict[x['key']] = {}
            self.ctan_dict[x['key']]['command'] = x['key']
            self.ctan_dict[x['key']]['documentation'] = 'https://ctan.org/pkg/' + x['key']
            self.ctan_dict[x['key']]['detail'] = x['caption']

    def load_texmf_db(self):
        """
        Create a dictionnary from the ls-R database from the LaTeX installation

        :return: a tuple (lsRdb, allfiles)
            - lsRdb is a dictionnary mapping for every package in ctanDict all the .sty, .cls, .def
            files listed under that dictionnary in lsR
            - allfiles is an array of all the .sty, .cls, .def files listed in lsR
        """
        ls_r = self.texmf + '/ls-R'
        ls_r_db = {}
        pkg = None
        pkg_files = []
        all_files = []
        all_pkgs = self.ctan_dict.keys()
        with open(ls_r) as fd:
            for line in fd:
                line = line.rstrip('\n')
                if line.startswith('./doc') or line.startswith('./source'):
                    # Skip source and doc entries
                    continue
                if line.endswith(':') and line.startswith('./'):
                    # Enter a new package
                    pkg = None
                    for part in reversed(Path(line[0:-1]).parts):
                        if part in all_pkgs:
                            pkg = part
                            break
                    pkg_files = []
                if pkg is None:
                    continue
                if line != '':
                    pkgfile = Path(line)
                    if pkgfile.suffix in ['.sty', '.def', '.cls']:
                        pkg_files.append(pkgfile.name)
                        all_files.append(pkgfile.name)
                else:
                    if len(pkg_files) > 0:
                        if pkg not in ls_r_db:
                            ls_r_db[pkg] = []
                        ls_r_db[pkg].extend(pkg_files)
                    pkg = None
        return (ls_r_db, all_files)


    def package2sty(self, pkgname):
        """
        Find the main .sty file for a given package

        :return a filename without the .sty extension or None
        """
        styname = pkgname + '.sty'
        if styname in self.ls_r_all_files:
            return pkgname
        if pkgname in self.ls_r_db:
            files = self.ls_r_db[pkgname]
            if pkgname + '.sty' in files:
                return pkgname
            else:
                for f in files:
                    if f.lower() == pkgname + '.sty':
                        return Path(f).stem
        return None


    def pkg_exists(self, pkgname, suffix):
        """
        Check if a file pkgname + suffix exists in the ls-R database

        :param pkgname: The name of a package
        :param suffix: The suffix to add to get a real file name
        """
        if pkgname in self.ls_r_db:
            files = self.ls_r_db[pkgname]
            if pkgname + suffix in files:
                return True
        return False


    def get_classes(self):
        """
        Get all the .cls files from the ls-R database and extract the corresponding details from ctanDict if the entry exists
        """
        class_data = {}
        for c in self.ls_r_all_files:
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
        Get the packages for which a .sty file exists and the extra packages liste in 
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
