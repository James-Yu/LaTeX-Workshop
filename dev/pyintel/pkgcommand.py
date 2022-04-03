import json
import urllib.request
import re
from pathlib import Path
from typing import List, Dict, Tuple, Union

def create_snippet(line: str) -> str:
    """
    Create a placeholder for every argument [], {}
    """
    snippet = line
    curly_index = line.find('{')
    square_index = line.find('[')
    p = PlaceHolder()
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
            cmds: List[str] = []
            if line[0] == '#':
                continue
            line = line.strip()
            arry = line.split('^')
            cmds.append(re.sub(r'^\\', '', arry[2]))
            cmds.append(re.sub(r'^\\', '', arry[3]))
            for m in re.finditer(r'= \\(\w+)[ ,]', arry[-1]):
                cmds.append(m.group(1))
            doc = re.sub(r'\s*[=#xt]\s*\\\w+(\{.*?\})?\s*(\(.*?\))?\s*,', '', arry[-1])
            doc = re.sub(r'\s*[=#xt]\s*\S+\s*,', '', doc)
            doc = doc.strip()
            for c in cmds:
                if c == '' or re.search('{', c):
                    continue
                self.unimath_dict[c] = {'detail': arry[1], 'documentation': doc}



    def parse_cwl_file(self, file_path: Union[Path, str], remove_spaces: bool = False) -> Tuple[Dict[str, Dict[str, str]], List[str]]:
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
        package = file_path.stem
        with file_path.open(encoding='utf8') as f:
            lines = f.readlines()
        pkg_cmds: Dict[str, Dict[str, str]] = {}
        pkg_envs: Dict[str, Dict[str, str, str]] = {}
        if file_path.name == 'caption.cwl':
            lines = apply_caption_tweaks(lines)
        for line in lines:
            line = line.rstrip()
            index_hash = line.find('#')
            if index_hash >= 0:
                line = line[:index_hash]
            if not line:
                continue
            if line[:7] == '\\begin{':
                env = line[line.index('{') + 1:line.index('}')]
                if env in self.envs:
                    continue
                args = line[line.index('}') + 1:]
                snippet_name = env + re.sub(r'(\{|\[)[^\{\[\$]*(\}|\])', r'\1\2', args)
                snippet_name = re.sub(r'\<[a-zA-Z\s]*\>', '<>', snippet_name)
                if remove_spaces:
                    snippet_name = snippet_name.replace(' ', '')
                else:
                    snippet_name = snippet_name.strip()
                snippet = create_snippet(args)
                pkg_envs[snippet_name] = {'name': env, 'detail': env + args, 'snippet': snippet, 'package': package}
                continue
            if line[:5] == '\\end{':
                continue
            if line[0] == '\\':
                line = line[1:]  # Remove leading '\'
                command = line.rstrip()
                name = re.sub(r'(\{|\[)[^\{\[\$]*(\}|\])', r'\1\2', command)
                name = re.sub(r'\([^\{\}\[\]\(\)]*\)', r'()', name)
                name = re.sub(r'\<[a-zA-Z\s]*\>', '<>', name)
                if remove_spaces:
                    name = name.replace(' ', '')
                else:
                    name = name.strip()
                command_dict: Dict[str, str] = {'command': command, 'package': package}
                if name in self.commands:
                    continue

                command_dict['snippet'] = create_snippet(line)
                if self.unimath_dict.get(name):
                    command_dict['detail'] = self.unimath_dict[name]['detail']
                    command_dict['documentation'] = self.unimath_dict[name]['documentation']
                pkg_cmds[name] = command_dict
                continue
            continue
        return (pkg_cmds, pkg_envs)
