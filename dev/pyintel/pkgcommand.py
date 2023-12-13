import json
import urllib.request
import re
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict, Union

PKGS_IGNORE_KEYVALS = []

@dataclass
class KeyVal:
    key: str
    snippet: str

@dataclass
class Cmd:
    snippet: Union[str, None]
    option: Union[str, None]
    keyvalindex: Union[int, None]
    keyvalpos: Union[int, None]
    detail: Union[str, None]
    documentation: Union[str, None]

@dataclass
class Env:
    name: Union[str, None]
    snippet: Union[str, None]
    option: Union[str, None]
    keyvalindex: Union[int, None]
    keyvalpos: Union[int, None]

@dataclass
class Pkg:
    includes: Dict[str, List[str]]
    macros: Dict[str, Cmd]
    envs: Dict[str, Env]
    options: List[str]
    keyvals: List[List[str]]

def create_snippet(line: str) -> str:
    """
    Create a placeholder for every argument [], {}
    """
    snippet = line
    p = PlaceHolder()
    if ('%<..%>' in snippet or '%|' in snippet): # \left%<..%>\right#mM or \Bigg(%|\Bigg)#mM
        p.usePlaceHolders = False
        snippet = re.sub(r'()(%<\.\.%>)()', p.sub, snippet).replace('%<..%>', '')
        snippet = re.sub(r'()(%\|)()', p.sub, snippet).replace('%|', '')
        p.usePlaceHolders = True
    else:
        curly_index = line.find('{')
        square_index = line.find('[')
        if square_index < curly_index:
            # If all the optional args are before {}, we number the {} first
            snippet = re.sub(r'(\{)([^\{\$]*)(\})', p.sub, snippet)
            snippet = re.sub(r'(\[)([^\[\$]*)(\])', p.sub, snippet)
        else:
            snippet = re.sub(r'(\{|\[)([^\{\[\$]*)(\}|\])', p.sub, snippet)
    snippet = re.sub(r'(?<![\{\s:\[])(\<)([a-zA-Z\s]*)(\>)', p.sub, snippet)
    snippet = re.sub(r'(\()([^\{\}\[\]\(\)]*)(\))', p.sub, snippet)
    p.setKeepDelimiters(False)
    snippet = re.sub(r'(?<![\{:\[=-])(%\<)([a-zA-Z\s]*)(%\>)(?!})', p.sub, snippet)

    t = TabStop()
    snippet = re.sub(r'(?<![\. ])\.\.(?![\. ])', t.sub, snippet)

    snippet = re.sub(r'%keyvals', '', snippet)
    snippet = re.sub(r'%<([^%]*?)%:.*?%>', r'\1', snippet)
    snippet = re.sub(r'%<([^%]*?)%>', r'\1', snippet)
    snippet = re.sub(r'\$\{(\d+:.*?)%.*?\}', r'${\1}', snippet)
    return snippet


class TabStop:
    """
    Count tab stops inside a regex and make the appropriate substitution

    :count: The number of tabstops that have already been replaced.
    """


    def __init__(self):
        self.count = 0

    def sub(self, _matchObject) -> str:
        self.count += 1
        return '${' + str(self.count) + '}'


class PlaceHolder:
    """
    Count placeholders and make the proper substitutions

    :count: The number of tabstops that have already been replaced.
    :usePlaceHolders: When True, keep the placeholder name in the snippet
    :keepDelimiters: When True, keep the delimiters (usually {} or []) surrounding every placeholder
    """

    def __init__(self):
        self.count = 0
        self.usePlaceHolders = True
        self.keepDelimiters = True

    def setUsePlaceHolders(self, trueOrFalse: bool):
        self.usePlaceHolders = trueOrFalse

    def setKeepDelimiters(self, trueOrFalse: bool):
        self.keepDelimiters = trueOrFalse

    def isToSkip(self, delimiters: str, string: str):
        if delimiters == '()' and string in ['s', 'en anglais', 'en français']:
            return True
        else:
            return False

    def sub(self, matchObject) -> str:
        if self.isToSkip(matchObject.group(1) + matchObject.group(3), matchObject.group(2)):
            return matchObject.group(1) + matchObject.group(2) + matchObject.group(3)

        self.count += 1
        name = ''
        if self.usePlaceHolders:
            name = ':' + matchObject.group(2)
        if self.keepDelimiters:
            return matchObject.group(1) + '${' + str(self.count) + name + '}' + matchObject.group(3)
        else:
            return '${' + str(self.count) + name + '}'

def apply_caption_tweaks(content: List[str]) -> List[str]:
    return [re.sub(r'#([0-9])', r'arg\1', line, flags=re.A) for line in content]


class CwlIntel:
    """
    Parse a CWL file to generate intellisense data in JSON format

    :unimath_dict: Dictionnary of unimathsymbols
    """

    def __init__(self, commands_file: Union[Path, str], envs_file: Union[Path, str], unimathsymbols: Union[Path, str]):
        """
        :param commands_file: Path to the JSON file contaning the default commands
        :param envs_file: Path to the JSON file contaning the default environments
        :param unimathsymbols: Path to unimathsymbols.txt. If the file exists, it
        is read from this location. If not, it is retrieved from
        http://milde.users.sourceforge.net/LUCR/Math/data/ and written to this location.
        """
        self.unimath_dict: Dict[str, Dict[str, str]] = {}
        self.unimathsymbols = Path(unimathsymbols)
        try:
            self.commands = json.load(open(commands_file, encoding='utf8'))
        except (OSError, json.JSONDecodeError):
            print(f'Cannot read JSON file {commands_file}')
            self.commands = []
        try:
            self.envs = json.load(open(envs_file, encoding='utf8'))
        except (OSError, json.JSONDecodeError):
            print(f'Cannot read JSON file {envs_file}')
            self.envs = []
        self.compute_unimathsymbols()


    def compute_unimathsymbols(self) -> Dict[str, Dict[str, str]]:
        """
        Create a dictionnary of unmimathsymbols
        """
        if not self.unimathsymbols.exists():
            urllib.request.urlretrieve('http://milde.users.sourceforge.net/LUCR/Math/data/unimathsymbols.txt', self.unimathsymbols)
        with self.unimathsymbols.open(encoding='utf8') as f:
            lines = f.readlines()
        for line in lines:
            macros: List[str] = []
            if line[0] == '#':
                continue
            line = line.strip()
            arry = line.split('^')
            macros.append(re.sub(r'^\\', '', arry[2]))
            macros.append(re.sub(r'^\\', '', arry[3]))
            for m in re.finditer(r'= \\(\w+)[ ,]', arry[-1]):
                macros.append(m.group(1))
            doc = re.sub(r'\s*[=#xt]\s*\\\w+(\{.*?\})?\s*(\(.*?\))?\s*,', '', arry[-1])
            doc = re.sub(r'\s*[=#xt]\s*\S+\s*,', '', doc)
            doc = doc.strip()
            for c in macros:
                if c == '' or re.search('{', c):
                    continue
                self.unimath_dict[c] = {'detail': arry[1], 'documentation': doc}



    def parse_cwl_file(self, file_path: Union[Path, str], remove_spaces: bool = False) -> Pkg:
        """
        Parse a CWL file to extract the provided commands and environments

        :param file_path: Path to the .cwl file to parse
        :param remove_spaces: If true, spaces are removed to compute the name of the snippet
        """
        if isinstance(file_path, str):
            file_path = Path(file_path)
        if not file_path.exists():
            print(f'File {file_path.as_posix} does not exist')
            return ({}, {})
        with file_path.open(encoding='utf8') as f:
            lines = f.readlines()
        pkg = Pkg(includes={}, macros={}, envs={}, options=[], keyvals=[])
        if file_path.name == 'caption.cwl':
            lines = apply_caption_tweaks(lines)
        
        cwl_keyval = None
        cwl_option = None
        for line in lines:
            line = line.rstrip()
            if len(line) == 0:                      # empty line
                continue
            elif line.startswith('#include:'):      # '#include:keyval'
                if (line[9:] not in pkg.includes):  # 'keyval'
                    pkg.includes[line[9:]] = []
                if (cwl_option is not None):
                    pkg.includes[line[9:]].append(cwl_option)
            elif line.startswith('#ifOption:'):     # '#ifOption:newfloat=true'
                cwl_option = line[10:]              # 'newfloat=true'
            elif line.startswith('#endif'):         # '#endif'
                cwl_option = None
            elif line.startswith('#keyvals:\\usepackage/'): # '#keyvals:\usepackage/color#c'
                cwl_keyval = 'PACKAGE_OPTIONS'
            elif line.startswith('#keyvals:\\documentclass/'): # '#keyvals:\usepackage/color#c'
                cwl_keyval = 'PACKAGE_OPTIONS'
            elif line.startswith('#keyvals:'):      # '#keyvals:\begin{minted},\mint,\inputminted'
                cwl_keyval = line[9:]               # '\begin{minted},\mint,\inputminted'
            elif line.startswith('#endkeyvals'):    # '#endkeyvals'
                cwl_keyval = None
            elif line.startswith('#'):
                continue
            elif line.startswith('\\begin{'):       # '\begin{minted}[options%keyvals]#S'
                match = re.match(r'\\begin{(.*?)}([^#\n]*)#?(.*)$', line)
                if match is None:
                    continue
                if len(match.groups()) >= 2 and match[2]:
                    name = match[1] + re.sub(r'(\{|\[)[^\{\[\$]*(\}|\])', r'\1\2', match[2])
                else:
                    name = match[1]
                name = re.sub(r'\<[a-zA-Z\s]*\>', '<>', name)
                if remove_spaces:
                    name = name.replace(' ', '')
                else:
                    name = name.strip()
                # The name field can only contain letters, `{`, `}`, `[`, `]` and `*`.
                # https://github.com/James-Yu/LaTeX-Workshop/issues/3264#issuecomment-1138733921
                if re.search(r'[^A-Za-z0-9\[\]\{\}\<\>\*_^:\s]', name) is not None or '%' in name:
                    continue
                snippet = create_snippet(match[2] if len(match.groups()) >= 2 and match[2] else '')
                pkg.envs[name] = Env(
                    name=None if name == match[1] else match[1],
                    snippet=None if snippet == '' else snippet,
                    option=cwl_option,
                    keyvalindex=None,
                    keyvalpos=None)
            elif line.startswith('\\end{'):         # '\end{minted}'
                continue
            elif line.startswith('\\'):             # '\inputminted[options%keyvals]{language}{file}#i'
                if ((re.match(r'\\left[^a-zA-Z]', line) is not None and '\\right' not in line) or
                    (re.match(r'\\right[^a-zA-Z]', line))): # Special cases in latex-document
                    continue
                match = re.match(r'\\([^[\{\n]*?)((?:\{|\[)[^#\n]*)?(#.*)?$', line)
                if match is None:
                    continue
                if len(match.groups()) >= 2 and match[2]:
                    name = match[1] + re.sub(r'(\{|\[)[^\{\[\$]*(\}|\])', r'\1\2', match[2])
                else:
                    name = match[1]
                name = re.sub(r'\([^\{\}\[\]\(\)]*\)', r'()', name)
                name = re.sub(r'\<[a-zA-Z\s]*\>', '<>', name)
                name = re.sub(r'\|.*?\|', '', name) # Remove |%<code%>| from '\mintinline[%<options%>]{%<language%>}|%<code%>|#M'
                if remove_spaces:
                    name = name.replace(' ', '')
                else:
                    name = name.strip()
                # The name field can only contain letters, `{`, `}`, `[`, `]` and `*`.
                # https://github.com/James-Yu/LaTeX-Workshop/issues/3264#issuecomment-1138733921
                if re.search(r'[^A-Za-z\[\]\{\}\<\>\*_^:\s]', name) is not None:
                    continue
                if name in self.commands:
                    continue
                snippet = create_snippet(match[1] + (match[2] if len(match.groups()) >= 2 and match[2] else ''))
                detail = self.unimath_dict[name]['detail'] if self.unimath_dict.get(name) else None
                documentation = self.unimath_dict[name]['documentation'] if self.unimath_dict.get(name) else None

                if (('left' in name.lower() and 'right' not in name.lower() and 'right' in line.lower()) or
                    (name.lower().count('big') == 1 and line.lower().count('big') == 2)):
                    if (name[-1] in [')', ']', '}']):
                        name = name[:-1]

                pkg.macros[name] = Cmd(
                    snippet=None if name == snippet else snippet,
                    option=cwl_option,
                    keyvalindex=None,
                    keyvalpos=None,
                    detail=detail,
                    documentation=documentation)
            elif cwl_keyval == 'PACKAGE_OPTIONS':
                for i in range(len(re.findall(r'%<([^%]*?)%>', line))):
                    line = re.sub(r'%<([^%]*?)%>', '${' + str(i + 1) + r':\1}', line, 1)
                match = re.match(r'^([^#%\n]*)', line)
                if match is None:
                    continue
                pkg.options.append(match[1])
            elif cwl_keyval is not None and file_path.stem not in PKGS_IGNORE_KEYVALS:
                for i in range(len(re.findall(r'%<([^%]*?)%>', line))):
                    line = re.sub(r'%<([^%]*?)%>', '${' + str(i + 1) + r':\1}', line, 1)
                match = re.match(r'^([^#\n]*)', line)
                if match is None:
                    continue
                for envcmd in cwl_keyval.split(','):
                    if envcmd.startswith('\\begin{'):
                        env = re.match(r'\\begin{(.*?)}', envcmd)[1]
                        for pkgenv in pkg.envs:
                            if (pkg.envs[pkgenv].name != env):
                                continue
                            haskeyvals = re.search(r':keys|:keyvals|:options|:library', pkg.envs[pkgenv].snippet)
                            if (haskeyvals is None):
                                continue
                            if (pkg.envs[pkgenv].keyvalpos is None):
                                pkg.envs[pkgenv].keyvalpos = len(re.findall(r'\[\]|\(\)|<>|{}', re.sub(r'\${.*?}', '', pkg.envs[pkgenv].snippet[:haskeyvals.start()])))
                            pkg.envs[pkgenv].keyvalindex = pkg.envs[pkgenv].keyvalindex or []
                            pkg.envs[pkgenv].keyvalindex.append(match[1])
                    else:
                        cmd = re.match(r'\\?([^{\[#]*)', envcmd)[1]
                        for pkgcmd in pkg.macros:
                            if (re.sub(r'\[\]|\(\)|<>|{}', '', pkgcmd) != cmd):
                                continue
                            haskeyvals = re.search(r':keys|:keyvals|:options|:library', pkg.macros[pkgcmd].snippet or pkgcmd)
                            if (haskeyvals is None):
                                continue
                            if (pkg.macros[pkgcmd].keyvalpos is None):
                                pkg.macros[pkgcmd].keyvalpos = len(re.findall(r'\[\]|\(\)|<>|{}', re.sub(r'\${.*?}', '', pkg.macros[pkgcmd].snippet[:haskeyvals.start()])))
                            pkg.macros[pkgcmd].keyvalindex = pkg.macros[pkgcmd].keyvalindex or []
                            pkg.macros[pkgcmd].keyvalindex.append(match[1])
        
        for pkgcmd in pkg.macros:
            if pkg.macros[pkgcmd].keyvalindex is None:
                continue
            keyvalset = set(pkg.macros[pkgcmd].keyvalindex)
            found = False
            for idx, cand in enumerate(pkg.keyvals):
                candset = set(cand)
                if (keyvalset == candset):
                    found = True
                    pkg.macros[pkgcmd].keyvalindex = idx
                    break
            if not found:
                pkg.keyvals.append(pkg.macros[pkgcmd].keyvalindex)
                pkg.macros[pkgcmd].keyvalindex = len(pkg.keyvals) - 1
        
        for pkgenv in pkg.envs:
            if pkg.envs[pkgenv].keyvalindex is None:
                continue
            keyvalset = set(pkg.envs[pkgenv].keyvalindex)
            found = False
            for idx, cand in enumerate(pkg.keyvals):
                candset = set(cand)
                if (keyvalset == candset):
                    found = True
                    pkg.envs[pkgenv].keyvalindex = idx
                    break
            if not found:
                pkg.keyvals.append(pkg.envs[pkgenv].keyvalindex)
                pkg.envs[pkgenv].keyvalindex = len(pkg.keyvals) - 1

        return pkg
