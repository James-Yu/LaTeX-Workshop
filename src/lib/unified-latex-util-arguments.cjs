"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../node_modules/trie-prefix-tree/dist/config.js
var require_config = __commonJS({
  "../../node_modules/trie-prefix-tree/dist/config.js"(exports, module2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = {
      END_WORD: "$",
      END_WORD_REPLACER: "9a219a89-91cd-42e2-abd5-eb113af08ca8",
      PERMS_MIN_LEN: 2
    };
    module2.exports = exports["default"];
  }
});

// ../../node_modules/trie-prefix-tree/dist/append.js
var require_append = __commonJS({
  "../../node_modules/trie-prefix-tree/dist/append.js"(exports, module2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = append;
    var _config = require_config();
    var _config2 = _interopRequireDefault(_config);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function append(trie, letter, index, array) {
      var isEndWordLetter = letter === _config2.default.END_WORD;
      var isLastLetter = index === array.length - 1;
      if (isEndWordLetter && !isLastLetter) {
        trie[_config2.default.END_WORD] = 1;
        trie[_config2.default.END_WORD_REPLACER] = {};
        trie = trie[_config2.default.END_WORD_REPLACER];
      } else {
        trie[letter] = trie[letter] || {};
        trie = trie[letter];
      }
      if (isLastLetter) {
        trie[_config2.default.END_WORD] = 1;
      }
      return trie;
    }
    module2.exports = exports["default"];
  }
});

// ../../node_modules/trie-prefix-tree/dist/create.js
var require_create = __commonJS({
  "../../node_modules/trie-prefix-tree/dist/create.js"(exports, module2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function(obj) {
      return typeof obj;
    } : function(obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
    exports.default = create;
    var _append = require_append();
    var _append2 = _interopRequireDefault(_append);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function create(input) {
      if (!Array.isArray(input)) {
        throw "Expected parameter Array, received " + (typeof input === "undefined" ? "undefined" : _typeof(input));
      }
      var trie = input.reduce(function(accumulator, item) {
        item.toLowerCase().split("").reduce(_append2.default, accumulator);
        return accumulator;
      }, {});
      return trie;
    }
    module2.exports = exports["default"];
  }
});

// ../../node_modules/trie-prefix-tree/dist/utils.js
var require_utils = __commonJS({
  "../../node_modules/trie-prefix-tree/dist/utils.js"(exports, module2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = {
      objectCopy: function objectCopy(obj) {
        if (typeof obj === "undefined") {
          return {};
        }
        return JSON.parse(JSON.stringify(obj));
      },
      stringify: function stringify(obj) {
        var spacer = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 2;
        if (typeof obj === "undefined") {
          return "";
        }
        return JSON.stringify(obj, null, spacer);
      }
    };
    module2.exports = exports["default"];
  }
});

// ../../node_modules/trie-prefix-tree/dist/checkPrefix.js
var require_checkPrefix = __commonJS({
  "../../node_modules/trie-prefix-tree/dist/checkPrefix.js"(exports, module2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = checkPrefix;
    var _utils = require_utils();
    var _utils2 = _interopRequireDefault(_utils);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function checkPrefix(prefixNode, prefix) {
      var input = prefix.toLowerCase().split("");
      var prefixFound = input.every(function(letter, index) {
        if (!prefixNode[letter]) {
          return false;
        }
        return prefixNode = prefixNode[letter];
      });
      return {
        prefixFound,
        prefixNode
      };
    }
    module2.exports = exports["default"];
  }
});

// ../../node_modules/trie-prefix-tree/dist/recursePrefix.js
var require_recursePrefix = __commonJS({
  "../../node_modules/trie-prefix-tree/dist/recursePrefix.js"(exports, module2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = recursePrefix;
    var _config = require_config();
    var _config2 = _interopRequireDefault(_config);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var pushInOrder = function pushInOrder2(word, prefixes) {
      var i = 0;
      while (i < prefixes.length) {
        if (word < prefixes[i]) {
          break;
        }
        i += 1;
      }
      prefixes.splice(i, 0, word);
      return prefixes;
    };
    function recursePrefix(node, prefix, sorted) {
      var prefixes = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : [];
      var word = prefix;
      for (var branch in node) {
        var currentLetter = branch;
        if (branch === _config2.default.END_WORD && typeof node[branch] === "number") {
          if (sorted) {
            pushInOrder(word, prefixes);
          } else {
            prefixes.push(word);
          }
          word = "";
        } else if (branch === _config2.default.END_WORD_REPLACER) {
          currentLetter = _config2.default.END_WORD;
        }
        recursePrefix(node[branch], prefix + currentLetter, sorted, prefixes);
      }
      return prefixes;
    }
    module2.exports = exports["default"];
  }
});

// ../../node_modules/trie-prefix-tree/dist/recurseRandomWord.js
var require_recurseRandomWord = __commonJS({
  "../../node_modules/trie-prefix-tree/dist/recurseRandomWord.js"(exports, module2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = recurseRandomWord;
    var _config = require_config();
    var _config2 = _interopRequireDefault(_config);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function recurseRandomWord(node, prefix) {
      var word = prefix;
      var branches = Object.keys(node);
      var branch = branches[Math.floor(Math.random() * branches.length)];
      if (branch === _config2.default.END_WORD) {
        return word;
      }
      return recurseRandomWord(node[branch], prefix + branch);
    }
    module2.exports = exports["default"];
  }
});

// ../../node_modules/trie-prefix-tree/dist/permutations.js
var require_permutations = __commonJS({
  "../../node_modules/trie-prefix-tree/dist/permutations.js"(exports, module2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function(obj) {
      return typeof obj;
    } : function(obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
    exports.default = permutations;
    var _config = require_config();
    var _config2 = _interopRequireDefault(_config);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function permutations(letters, trie) {
      var opts = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {
        type: "anagram"
      };
      if (typeof letters !== "string") {
        throw "Permutations expects string letters, received " + (typeof letters === "undefined" ? "undefined" : _typeof(letters));
      }
      var words = [];
      var permute = function permute2(word, node) {
        var prefix = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "";
        var wordIsEmpty = word.length === 0;
        var wordFound = words.indexOf(prefix) !== -1;
        var endWordFound = node[_config2.default.END_WORD] === 1;
        if (wordIsEmpty && endWordFound && !wordFound) {
          words.push(prefix);
        }
        for (var i = 0, len = word.length; i < len; i++) {
          var letter = word[i];
          if (opts.type === "sub-anagram") {
            if (endWordFound && !(words.indexOf(prefix) !== -1)) {
              words.push(prefix);
            }
          }
          if (node[letter]) {
            var remaining = word.substring(0, i) + word.substring(i + 1, len);
            permute2(remaining, node[letter], prefix + letter, words);
          }
        }
        return words.sort();
      };
      return permute(letters, trie);
    }
    module2.exports = exports["default"];
  }
});

// ../../node_modules/trie-prefix-tree/dist/index.js
var require_dist = __commonJS({
  "../../node_modules/trie-prefix-tree/dist/index.js"(exports, module2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function(obj) {
      return typeof obj;
    } : function(obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
    exports.default = function(input) {
      if (!Array.isArray(input)) {
        throw "Expected parameter Array, received " + (typeof input === "undefined" ? "undefined" : _typeof(input));
      }
      var trie = (0, _create2.default)([].concat(_toConsumableArray(input)));
      return {
        /**
         * Get the generated raw trie object
        */
        tree: function tree() {
          return trie;
        },
        /**
         * Get a string representation of the trie
        */
        dump: function dump() {
          var spacer = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 0;
          return _utils2.default.stringify(trie, spacer);
        },
        /**
         * Add a new word to the trie
         */
        addWord: function addWord(word) {
          if (typeof word !== "string" || word === "") {
            throw "Expected parameter string, received " + (typeof word === "undefined" ? "undefined" : _typeof(word));
          }
          var reducer = function reducer2() {
            return _append2.default.apply(void 0, arguments);
          };
          var input2 = word.toLowerCase().split("");
          input2.reduce(reducer, trie);
          return this;
        },
        /**
         * Remove an existing word from the trie
         */
        removeWord: function removeWord(word) {
          if (typeof word !== "string" || word === "") {
            throw "Expected parameter string, received " + (typeof word === "undefined" ? "undefined" : _typeof(word));
          }
          var _checkPrefix = (0, _checkPrefix6.default)(trie, word), prefixFound = _checkPrefix.prefixFound, prefixNode = _checkPrefix.prefixNode;
          if (prefixFound) {
            delete prefixNode[_config2.default.END_WORD];
          }
          return this;
        },
        /**
         * Check a prefix is valid
         * @returns Boolean
        */
        isPrefix: function isPrefix(prefix) {
          if (typeof prefix !== "string") {
            throw "Expected string prefix, received " + (typeof prefix === "undefined" ? "undefined" : _typeof(prefix));
          }
          var _checkPrefix2 = (0, _checkPrefix6.default)(trie, prefix), prefixFound = _checkPrefix2.prefixFound;
          return prefixFound;
        },
        /**
        * Get a list of all words in the trie with the given prefix
        * @returns Array
        */
        getPrefix: function getPrefix(strPrefix) {
          var sorted = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : true;
          if (typeof strPrefix !== "string") {
            throw "Expected string prefix, received " + (typeof strPrefix === "undefined" ? "undefined" : _typeof(strPrefix));
          }
          if (typeof sorted !== "boolean") {
            throw "Expected sort parameter as boolean, received " + (typeof sorted === "undefined" ? "undefined" : _typeof(sorted));
          }
          if (!this.isPrefix(strPrefix)) {
            return [];
          }
          var prefixNode = strPrefix.length ? (0, _checkPrefix6.default)(trie, strPrefix).prefixNode : trie;
          return (0, _recursePrefix2.default)(prefixNode, strPrefix, sorted);
        },
        /**
        * Get a random word in the trie with the given prefix
        * @returns Array
        */
        getRandomWordWithPrefix: function getRandomWordWithPrefix(strPrefix) {
          if (typeof strPrefix !== "string") {
            throw "Expected string prefix, received " + (typeof strPrefix === "undefined" ? "undefined" : _typeof(strPrefix));
          }
          if (!this.isPrefix(strPrefix)) {
            return "";
          }
          var _checkPrefix3 = (0, _checkPrefix6.default)(trie, strPrefix), prefixNode = _checkPrefix3.prefixNode;
          return (0, _recurseRandomWord2.default)(prefixNode, strPrefix);
        },
        /**
        * Count the number of words with the given prefixSearch
        * @returns Number
        */
        countPrefix: function countPrefix(strPrefix) {
          var prefixes = this.getPrefix(strPrefix);
          return prefixes.length;
        },
        /**
        * Get all words in the trie
        * @returns Array
        */
        getWords: function getWords() {
          var sorted = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : true;
          return this.getPrefix("", sorted);
        },
        /**
        * Check the existence of a word in the trie
        * @returns Boolean
        */
        hasWord: function hasWord(word) {
          if (typeof word !== "string") {
            throw "Expected string word, received " + (typeof word === "undefined" ? "undefined" : _typeof(word));
          }
          var _checkPrefix4 = (0, _checkPrefix6.default)(trie, word), prefixFound = _checkPrefix4.prefixFound, prefixNode = _checkPrefix4.prefixNode;
          if (prefixFound) {
            return prefixNode[_config2.default.END_WORD] === 1;
          }
          return false;
        },
        /**
        * Get a list of valid anagrams that can be made from the given letters
        * @returns Array
        */
        getAnagrams: function getAnagrams(letters) {
          if (typeof letters !== "string") {
            throw "Anagrams expected string letters, received " + (typeof letters === "undefined" ? "undefined" : _typeof(letters));
          }
          if (letters.length < PERMS_MIN_LEN) {
            throw "getAnagrams expects at least " + PERMS_MIN_LEN + " letters";
          }
          return (0, _permutations2.default)(letters, trie, {
            type: "anagram"
          });
        },
        /**
        * Get a list of all sub-anagrams that can be made from the given letters
        * @returns Array
        */
        getSubAnagrams: function getSubAnagrams(letters) {
          if (typeof letters !== "string") {
            throw "Expected string letters, received " + (typeof letters === "undefined" ? "undefined" : _typeof(letters));
          }
          if (letters.length < PERMS_MIN_LEN) {
            throw "getSubAnagrams expects at least " + PERMS_MIN_LEN + " letters";
          }
          return (0, _permutations2.default)(letters, trie, {
            type: "sub-anagram"
          });
        }
      };
    };
    var _create = require_create();
    var _create2 = _interopRequireDefault(_create);
    var _append = require_append();
    var _append2 = _interopRequireDefault(_append);
    var _checkPrefix5 = require_checkPrefix();
    var _checkPrefix6 = _interopRequireDefault(_checkPrefix5);
    var _recursePrefix = require_recursePrefix();
    var _recursePrefix2 = _interopRequireDefault(_recursePrefix);
    var _recurseRandomWord = require_recurseRandomWord();
    var _recurseRandomWord2 = _interopRequireDefault(_recurseRandomWord);
    var _utils = require_utils();
    var _utils2 = _interopRequireDefault(_utils);
    var _config = require_config();
    var _config2 = _interopRequireDefault(_config);
    var _permutations = require_permutations();
    var _permutations2 = _interopRequireDefault(_permutations);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function _toConsumableArray(arr) {
      if (Array.isArray(arr)) {
        for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
          arr2[i] = arr[i];
        }
        return arr2;
      } else {
        return Array.from(arr);
      }
    }
    var PERMS_MIN_LEN = _config2.default.PERMS_MIN_LEN;
    module2.exports = exports["default"];
  }
});

// index.ts
var unified_latex_util_arguments_exports = {};
__export(unified_latex_util_arguments_exports, {
  attachMacroArgs: () => attachMacroArgs,
  attachMacroArgsInArray: () => attachMacroArgsInArray,
  getArgsContent: () => getArgsContent,
  getNamedArgsContent: () => getNamedArgsContent,
  gobbleArguments: () => gobbleArguments,
  gobbleSingleArgument: () => gobbleSingleArgument,
  unifiedLatexAttachMacroArguments: () => unifiedLatexAttachMacroArguments
});
module.exports = __toCommonJS(unified_latex_util_arguments_exports);

// ../unified-latex-util-print-raw/dist/index.js
var linebreak = Symbol("linebreak");
var ESCAPE = "\\";
function _printRaw(node) {
  if (typeof node === "string") {
    return [node];
  }
  if (Array.isArray(node)) {
    return [].concat(
      ...node.map((n) => _printRaw(n))
    );
  }
  let argsString, escape;
  switch (node.type) {
    case "root":
      return _printRaw(node.content);
    case "argument":
      return [node.openMark, ..._printRaw(node.content), node.closeMark];
    case "comment":
      var suffix = node.suffixParbreak ? "" : linebreak;
      var leadingWhitespace = "";
      if (node.sameline && node.leadingWhitespace) {
        leadingWhitespace = " ";
      }
      if (node.sameline) {
        return [
          leadingWhitespace,
          "%",
          ..._printRaw(node.content),
          suffix
        ];
      }
      return [linebreak, "%", ..._printRaw(node.content), suffix];
    case "environment":
    case "mathenv":
    case "verbatim":
      var env = _printRaw(node.env);
      var envStart = [ESCAPE + "begin{", ...env, "}"];
      var envEnd = [ESCAPE + "end{", ...env, "}"];
      argsString = node.args == null ? [] : _printRaw(node.args);
      return [
        ...envStart,
        ...argsString,
        ..._printRaw(node.content),
        ...envEnd
      ];
    case "displaymath":
      return [ESCAPE + "[", ..._printRaw(node.content), ESCAPE + "]"];
    case "group":
      return ["{", ..._printRaw(node.content), "}"];
    case "inlinemath":
      return ["$", ..._printRaw(node.content), "$"];
    case "macro":
      argsString = node.args == null ? [] : _printRaw(node.args);
      escape = node.escapeToken == null ? ESCAPE : node.escapeToken;
      return [escape, ..._printRaw(node.content), ...argsString];
    case "parbreak":
      return [linebreak, linebreak];
    case "string":
      return [node.content];
    case "verb":
      return [
        ESCAPE,
        node.env,
        node.escape,
        ..._printRaw(node.content),
        node.escape
      ];
    case "whitespace":
      return [" "];
    default:
      console.warn(
        "Cannot find render for node ",
        node,
        `(of type ${typeof node})`
      );
      return ["" + node];
  }
}
function printRaw(node, options) {
  const asArray = options != null ? options.asArray : false;
  const printedTokens = _printRaw(node);
  if (asArray) {
    return printedTokens;
  }
  return printedTokens.map((x) => x === linebreak ? "\n" : x).join("");
}

// ../unified-latex-util-match/dist/index.js
function createMacroMatcher(macros) {
  const macrosHash = Array.isArray(macros) ? macros.length > 0 ? typeof macros[0] === "string" ? Object.fromEntries(
    macros.map((macro2) => {
      if (typeof macro2 !== "string") {
        throw new Error("Wrong branch of map function");
      }
      return [macro2, {}];
    })
  ) : Object.fromEntries(
    macros.map((macro2) => {
      if (typeof macro2 === "string") {
        throw new Error("Wrong branch of map function");
      }
      if (macro2.escapeToken != null) {
        return [
          macro2.content,
          { escapeToken: macro2.escapeToken }
        ];
      }
      return [macro2.content, {}];
    })
  ) : {} : macros;
  return function matchAgainstMacros(node) {
    if (node == null || node.type !== "macro") {
      return false;
    }
    const spec = macrosHash[node.content];
    if (!spec) {
      return false;
    }
    if (typeof spec === "object" && "escapeToken" in spec) {
      return spec.escapeToken == null || spec.escapeToken === node.escapeToken;
    }
    return true;
  };
}
function createEnvironmentMatcher(macros) {
  const environmentsHash = Array.isArray(macros) ? Object.fromEntries(
    macros.map((str) => {
      return [str, {}];
    })
  ) : macros;
  return function matchAgainstEnvironments(node) {
    if (!match.anyEnvironment(node)) {
      return false;
    }
    const envName = printRaw(node.env);
    const spec = environmentsHash[envName];
    if (!spec) {
      return false;
    }
    return true;
  };
}
var match = {
  macro(node, macroName) {
    if (node == null) {
      return false;
    }
    return node.type === "macro" && (macroName == null || node.content === macroName);
  },
  anyMacro(node) {
    return match.macro(node);
  },
  environment(node, envName) {
    if (node == null) {
      return false;
    }
    return (node.type === "environment" || node.type === "mathenv") && (envName == null || printRaw(node.env) === envName);
  },
  anyEnvironment(node) {
    return match.environment(node);
  },
  comment(node) {
    if (node == null) {
      return false;
    }
    return node.type === "comment";
  },
  parbreak(node) {
    if (node == null) {
      return false;
    }
    return node.type === "parbreak";
  },
  whitespace(node) {
    if (node == null) {
      return false;
    }
    return node.type === "whitespace";
  },
  /**
   * Matches whitespace or a comment with leading whitespace.
   */
  whitespaceLike(node) {
    if (node == null) {
      return false;
    }
    return node.type === "whitespace" || node.type === "whitespace" && node.leadingWhitespace === true;
  },
  string(node, value) {
    if (node == null) {
      return false;
    }
    return node.type === "string" && (value == null || node.content === value);
  },
  anyString(node) {
    return match.string(node);
  },
  group(node) {
    if (node == null) {
      return false;
    }
    return node.type === "group";
  },
  argument(node) {
    if (node == null) {
      return false;
    }
    return node.type === "argument";
  },
  blankArgument(node) {
    if (!match.argument(node)) {
      return false;
    }
    return node.openMark === "" && node.closeMark === "" && node.content.length === 0;
  },
  math(node) {
    if (node == null) {
      return false;
    }
    return node.type === "displaymath" || node.type === "inlinemath";
  },
  createMacroMatcher,
  createEnvironmentMatcher
};
var {
  anyEnvironment,
  anyMacro,
  anyString,
  argument,
  blankArgument,
  comment,
  environment,
  group,
  macro,
  math,
  parbreak,
  string,
  whitespace
} = match;

// ../unified-latex-util-pegjs/dist/index.js
var latex_default = (
  // Generated by Peggy 2.0.1.
  //
  // https://peggyjs.org/
  function() {
    "use strict";
    function peg$subclass(child, parent) {
      function C() {
        this.constructor = child;
      }
      C.prototype = parent.prototype;
      child.prototype = new C();
    }
    function peg$SyntaxError(message, expected, found, location) {
      var self = Error.call(this, message);
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(self, peg$SyntaxError.prototype);
      }
      self.expected = expected;
      self.found = found;
      self.location = location;
      self.name = "SyntaxError";
      return self;
    }
    peg$subclass(peg$SyntaxError, Error);
    function peg$padEnd(str, targetLength, padString) {
      padString = padString || " ";
      if (str.length > targetLength) {
        return str;
      }
      targetLength -= str.length;
      padString += padString.repeat(targetLength);
      return str + padString.slice(0, targetLength);
    }
    peg$SyntaxError.prototype.format = function(sources) {
      var str = "Error: " + this.message;
      if (this.location) {
        var src = null;
        var k;
        for (k = 0; k < sources.length; k++) {
          if (sources[k].source === this.location.source) {
            src = sources[k].text.split(/\r\n|\n|\r/g);
            break;
          }
        }
        var s2 = this.location.start;
        var loc = this.location.source + ":" + s2.line + ":" + s2.column;
        if (src) {
          var e = this.location.end;
          var filler = peg$padEnd("", s2.line.toString().length, " ");
          var line = src[s2.line - 1];
          var last = s2.line === e.line ? e.column : line.length + 1;
          var hatLen = last - s2.column || 1;
          str += "\n --> " + loc + "\n" + filler + " |\n" + s2.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
        } else {
          str += "\n at " + loc;
        }
      }
      return str;
    };
    peg$SyntaxError.buildMessage = function(expected, found) {
      var DESCRIBE_EXPECTATION_FNS = {
        literal: function(expectation) {
          return '"' + literalEscape(expectation.text) + '"';
        },
        class: function(expectation) {
          var escapedParts = expectation.parts.map(function(part) {
            return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
          });
          return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
        },
        any: function() {
          return "any character";
        },
        end: function() {
          return "end of input";
        },
        other: function(expectation) {
          return expectation.description;
        }
      };
      function hex(ch) {
        return ch.charCodeAt(0).toString(16).toUpperCase();
      }
      function literalEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function classEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function describeExpectation(expectation) {
        return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
      }
      function describeExpected(expected2) {
        var descriptions = expected2.map(describeExpectation);
        var i, j;
        descriptions.sort();
        if (descriptions.length > 0) {
          for (i = 1, j = 1; i < descriptions.length; i++) {
            if (descriptions[i - 1] !== descriptions[i]) {
              descriptions[j] = descriptions[i];
              j++;
            }
          }
          descriptions.length = j;
        }
        switch (descriptions.length) {
          case 1:
            return descriptions[0];
          case 2:
            return descriptions[0] + " or " + descriptions[1];
          default:
            return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
        }
      }
      function describeFound(found2) {
        return found2 ? '"' + literalEscape(found2) + '"' : "end of input";
      }
      return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
    };
    function peg$parse(input, options) {
      options = options !== void 0 ? options : {};
      var peg$FAILED = {};
      var peg$source = options.grammarSource;
      var peg$startRuleFunctions = { document: peg$parsedocument, math: peg$parsemath };
      var peg$startRuleFunction = peg$parsedocument;
      var peg$c0 = "%";
      var peg$c1 = ".";
      var peg$c2 = "verb*";
      var peg$c3 = "verb";
      var peg$c4 = "verbatim*";
      var peg$c5 = "verbatim";
      var peg$c6 = "filecontents*";
      var peg$c7 = "filecontents";
      var peg$c8 = "comment";
      var peg$c9 = "lstlisting";
      var peg$c10 = "[";
      var peg$c11 = "]";
      var peg$c12 = "(";
      var peg$c13 = ")";
      var peg$c14 = "begin";
      var peg$c15 = "end";
      var peg$c16 = "equation*";
      var peg$c17 = "equation";
      var peg$c18 = "align*";
      var peg$c19 = "align";
      var peg$c20 = "alignat*";
      var peg$c21 = "alignat";
      var peg$c22 = "gather*";
      var peg$c23 = "gather";
      var peg$c24 = "multline*";
      var peg$c25 = "multline";
      var peg$c26 = "flalign*";
      var peg$c27 = "flalign";
      var peg$c28 = "split";
      var peg$c29 = "math";
      var peg$c30 = "displaymath";
      var peg$c31 = "\\";
      var peg$c32 = "{";
      var peg$c33 = "}";
      var peg$c34 = "$";
      var peg$c35 = "&";
      var peg$c36 = "\r";
      var peg$c37 = "\n";
      var peg$c38 = "\r\n";
      var peg$c39 = "#";
      var peg$c40 = "^";
      var peg$c41 = "_";
      var peg$c42 = "\0";
      var peg$r0 = /^[ \t]/;
      var peg$r1 = /^[a-zA-Z]/;
      var peg$r2 = /^[0-9]/;
      var peg$r3 = /^[.,;:\-*\/()!?=+<>[\]`'"~]/;
      var peg$e0 = peg$otherExpectation("document");
      var peg$e1 = peg$otherExpectation("math");
      var peg$e2 = peg$otherExpectation("token");
      var peg$e3 = peg$anyExpectation();
      var peg$e4 = peg$otherExpectation("parbreak");
      var peg$e5 = peg$otherExpectation("math token");
      var peg$e6 = peg$otherExpectation("nonchar token");
      var peg$e7 = peg$literalExpectation("%", false);
      var peg$e8 = peg$otherExpectation("whitespace");
      var peg$e9 = peg$otherExpectation("number");
      var peg$e10 = peg$literalExpectation(".", false);
      var peg$e11 = peg$otherExpectation("special macro");
      var peg$e12 = peg$literalExpectation("verb*", false);
      var peg$e13 = peg$literalExpectation("verb", false);
      var peg$e14 = peg$otherExpectation("verbatim environment");
      var peg$e15 = peg$literalExpectation("verbatim*", false);
      var peg$e16 = peg$literalExpectation("verbatim", false);
      var peg$e17 = peg$literalExpectation("filecontents*", false);
      var peg$e18 = peg$literalExpectation("filecontents", false);
      var peg$e19 = peg$literalExpectation("comment", false);
      var peg$e20 = peg$literalExpectation("lstlisting", false);
      var peg$e21 = peg$otherExpectation("macro");
      var peg$e22 = peg$otherExpectation("group");
      var peg$e23 = peg$otherExpectation("environment");
      var peg$e24 = peg$otherExpectation("math environment");
      var peg$e25 = peg$otherExpectation("math group");
      var peg$e26 = peg$literalExpectation("[", false);
      var peg$e27 = peg$literalExpectation("]", false);
      var peg$e28 = peg$literalExpectation("(", false);
      var peg$e29 = peg$literalExpectation(")", false);
      var peg$e30 = peg$literalExpectation("begin", false);
      var peg$e31 = peg$literalExpectation("end", false);
      var peg$e32 = peg$literalExpectation("equation*", false);
      var peg$e33 = peg$literalExpectation("equation", false);
      var peg$e34 = peg$literalExpectation("align*", false);
      var peg$e35 = peg$literalExpectation("align", false);
      var peg$e36 = peg$literalExpectation("alignat*", false);
      var peg$e37 = peg$literalExpectation("alignat", false);
      var peg$e38 = peg$literalExpectation("gather*", false);
      var peg$e39 = peg$literalExpectation("gather", false);
      var peg$e40 = peg$literalExpectation("multline*", false);
      var peg$e41 = peg$literalExpectation("multline", false);
      var peg$e42 = peg$literalExpectation("flalign*", false);
      var peg$e43 = peg$literalExpectation("flalign", false);
      var peg$e44 = peg$literalExpectation("split", false);
      var peg$e45 = peg$literalExpectation("math", false);
      var peg$e46 = peg$literalExpectation("displaymath", false);
      var peg$e47 = peg$otherExpectation("escape");
      var peg$e48 = peg$literalExpectation("\\", false);
      var peg$e49 = peg$literalExpectation("{", false);
      var peg$e50 = peg$literalExpectation("}", false);
      var peg$e51 = peg$literalExpectation("$", false);
      var peg$e52 = peg$literalExpectation("&", false);
      var peg$e53 = peg$otherExpectation("newline");
      var peg$e54 = peg$literalExpectation("\r", false);
      var peg$e55 = peg$literalExpectation("\n", false);
      var peg$e56 = peg$literalExpectation("\r\n", false);
      var peg$e57 = peg$literalExpectation("#", false);
      var peg$e58 = peg$literalExpectation("^", false);
      var peg$e59 = peg$literalExpectation("_", false);
      var peg$e60 = peg$literalExpectation("\0", false);
      var peg$e61 = peg$classExpectation([" ", "	"], false, false);
      var peg$e62 = peg$otherExpectation("letter");
      var peg$e63 = peg$classExpectation([["a", "z"], ["A", "Z"]], false, false);
      var peg$e64 = peg$otherExpectation("digit");
      var peg$e65 = peg$classExpectation([["0", "9"]], false, false);
      var peg$e66 = peg$otherExpectation("punctuation");
      var peg$e67 = peg$classExpectation([".", ",", ";", ":", "-", "*", "/", "(", ")", "!", "?", "=", "+", "<", ">", "[", "]", "`", "'", '"', "~"], false, false);
      var peg$e68 = peg$otherExpectation("full comment");
      var peg$e69 = peg$otherExpectation("comment");
      var peg$f0 = function(content) {
        return createNode("root", { content });
      };
      var peg$f1 = function(t) {
        return t;
      };
      var peg$f2 = function(eq) {
        return createNode("inlinemath", { content: eq });
      };
      var peg$f3 = function(s2) {
        return createNode("string", { content: s2 });
      };
      var peg$f4 = function(s2) {
        return createNode("string", { content: s2 });
      };
      var peg$f5 = function() {
        return createNode("parbreak");
      };
      var peg$f6 = function(x) {
        return x;
      };
      var peg$f7 = function(x) {
        return x;
      };
      var peg$f8 = function() {
        return createNode("macro", { content: "^", escapeToken: "" });
      };
      var peg$f9 = function() {
        return createNode("macro", { content: "_", escapeToken: "" });
      };
      var peg$f10 = function(s2) {
        return createNode("string", { content: s2 });
      };
      var peg$f11 = function() {
        return createNode("whitespace");
      };
      var peg$f12 = function(a, b) {
        return a.join("") + "." + b.join("");
      };
      var peg$f13 = function(b) {
        return "." + b.join("");
      };
      var peg$f14 = function(a) {
        return a.join("") + ".";
      };
      var peg$f15 = function(s2) {
        return createNode("string", { content: s2 });
      };
      var peg$f16 = function(env, e, end) {
        return end == e;
      };
      var peg$f17 = function(env, e, x) {
        return x;
      };
      var peg$f18 = function(env, e, x, end) {
        return end == e;
      };
      var peg$f19 = function(env, e, x) {
        return createNode("verb", {
          env,
          escape: e,
          content: x.join("")
        });
      };
      var peg$f20 = function(x) {
        return x;
      };
      var peg$f21 = function(x) {
        return createNode("displaymath", { content: x });
      };
      var peg$f22 = function(x) {
        return x;
      };
      var peg$f23 = function(x) {
        return createNode("inlinemath", { content: x });
      };
      var peg$f24 = function(x) {
        return x;
      };
      var peg$f25 = function(x) {
        return createNode("displaymath", { content: x });
      };
      var peg$f26 = function(env, end_env) {
        return compare_env({ content: [env] }, end_env);
      };
      var peg$f27 = function(env, x) {
        return x;
      };
      var peg$f28 = function(env, body) {
        return createNode("verbatim", {
          env,
          content: body.join("")
        });
      };
      var peg$f29 = function(n) {
        return n.join("");
      };
      var peg$f30 = function(n) {
        return n;
      };
      var peg$f31 = function(m) {
        return createNode("macro", { content: m });
      };
      var peg$f32 = function(c) {
        return c;
      };
      var peg$f33 = function(x) {
        return createNode("group", { content: x });
      };
      var peg$f34 = function(g) {
        return text().slice(1, -1);
      };
      var peg$f35 = function(env, env_comment, end_env) {
        return compare_env(env, end_env);
      };
      var peg$f36 = function(env, env_comment, x) {
        return x;
      };
      var peg$f37 = function(env, env_comment, body) {
        return createNode("environment", {
          env,
          content: env_comment ? [env_comment, ...body] : body
        });
      };
      var peg$f38 = function(env, env_comment, end_env) {
        return compare_env({ content: [env] }, end_env);
      };
      var peg$f39 = function(env, env_comment, x) {
        return x;
      };
      var peg$f40 = function(env, env_comment, body) {
        return createNode("mathenv", {
          env,
          content: env_comment ? [env_comment, ...body] : body
        });
      };
      var peg$f41 = function(c) {
        return c;
      };
      var peg$f42 = function(x) {
        return createNode("group", { content: x });
      };
      var peg$f43 = function(e) {
        return createNode("string", { content: e });
      };
      var peg$f44 = function() {
        return createNode("string", { content: "\\" });
      };
      var peg$f45 = function(s2) {
        return createNode("string", { content: s2 });
      };
      var peg$f46 = function(s2) {
        return createNode("string", { content: s2 });
      };
      var peg$f47 = function(s2) {
        return createNode("string", { content: s2 });
      };
      var peg$f48 = function(s2) {
        return createNode("string", { content: s2 });
      };
      var peg$f49 = function(s2) {
        return createNode("string", { content: s2 });
      };
      var peg$f50 = function(s2) {
        return createNode("string", { content: s2 });
      };
      var peg$f51 = function(s2) {
        return createNode("string", { content: s2 });
      };
      var peg$f52 = function() {
        return " ";
      };
      var peg$f53 = function(p) {
        return createNode("string", { content: p });
      };
      var peg$f54 = function(leading_sp, comment2) {
        return createNode("comment", {
          ...comment2,
          sameline: false,
          leadingWhitespace: leading_sp.length > 0
        });
      };
      var peg$f55 = function(spaces, x) {
        return createNode("comment", {
          ...x,
          sameline: true,
          leadingWhitespace: spaces.length > 0
        });
      };
      var peg$f56 = function(c) {
        return c;
      };
      var peg$f57 = function(c) {
        return { content: c.join(""), suffixParbreak: true };
      };
      var peg$f58 = function(c) {
        return c;
      };
      var peg$f59 = function(c) {
        return { content: c.join("") };
      };
      var peg$f60 = function() {
        var loc = location();
        return loc.start.column === 1;
      };
      var peg$currPos = 0;
      var peg$savedPos = 0;
      var peg$posDetailsCache = [{ line: 1, column: 1 }];
      var peg$maxFailPos = 0;
      var peg$maxFailExpected = [];
      var peg$silentFails = 0;
      var peg$result;
      if ("startRule" in options) {
        if (!(options.startRule in peg$startRuleFunctions)) {
          throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
        }
        peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
      }
      function text() {
        return input.substring(peg$savedPos, peg$currPos);
      }
      function offset() {
        return peg$savedPos;
      }
      function range() {
        return {
          source: peg$source,
          start: peg$savedPos,
          end: peg$currPos
        };
      }
      function location() {
        return peg$computeLocation(peg$savedPos, peg$currPos);
      }
      function expected(description, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildStructuredError(
          [peg$otherExpectation(description)],
          input.substring(peg$savedPos, peg$currPos),
          location2
        );
      }
      function error(message, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildSimpleError(message, location2);
      }
      function peg$literalExpectation(text2, ignoreCase) {
        return { type: "literal", text: text2, ignoreCase };
      }
      function peg$classExpectation(parts, inverted, ignoreCase) {
        return { type: "class", parts, inverted, ignoreCase };
      }
      function peg$anyExpectation() {
        return { type: "any" };
      }
      function peg$endExpectation() {
        return { type: "end" };
      }
      function peg$otherExpectation(description) {
        return { type: "other", description };
      }
      function peg$computePosDetails(pos) {
        var details = peg$posDetailsCache[pos];
        var p;
        if (details) {
          return details;
        } else {
          p = pos - 1;
          while (!peg$posDetailsCache[p]) {
            p--;
          }
          details = peg$posDetailsCache[p];
          details = {
            line: details.line,
            column: details.column
          };
          while (p < pos) {
            if (input.charCodeAt(p) === 10) {
              details.line++;
              details.column = 1;
            } else {
              details.column++;
            }
            p++;
          }
          peg$posDetailsCache[pos] = details;
          return details;
        }
      }
      function peg$computeLocation(startPos, endPos) {
        var startPosDetails = peg$computePosDetails(startPos);
        var endPosDetails = peg$computePosDetails(endPos);
        return {
          source: peg$source,
          start: {
            offset: startPos,
            line: startPosDetails.line,
            column: startPosDetails.column
          },
          end: {
            offset: endPos,
            line: endPosDetails.line,
            column: endPosDetails.column
          }
        };
      }
      function peg$fail(expected2) {
        if (peg$currPos < peg$maxFailPos) {
          return;
        }
        if (peg$currPos > peg$maxFailPos) {
          peg$maxFailPos = peg$currPos;
          peg$maxFailExpected = [];
        }
        peg$maxFailExpected.push(expected2);
      }
      function peg$buildSimpleError(message, location2) {
        return new peg$SyntaxError(message, null, null, location2);
      }
      function peg$buildStructuredError(expected2, found, location2) {
        return new peg$SyntaxError(
          peg$SyntaxError.buildMessage(expected2, found),
          expected2,
          found,
          location2
        );
      }
      function peg$parsedocument() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parsetoken();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parsetoken();
        }
        peg$savedPos = s0;
        s1 = peg$f0(s1);
        s0 = s1;
        peg$silentFails--;
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e0);
        }
        return s0;
      }
      function peg$parsemath() {
        var s0, s1;
        peg$silentFails++;
        s0 = [];
        s1 = peg$parsemath_token();
        while (s1 !== peg$FAILED) {
          s0.push(s1);
          s1 = peg$parsemath_token();
        }
        peg$silentFails--;
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e1);
        }
        return s0;
      }
      function peg$parsetoken() {
        var s0, s1, s2, s3, s4, s5;
        peg$silentFails++;
        s0 = peg$parsespecial_macro();
        if (s0 === peg$FAILED) {
          s0 = peg$parsemacro();
          if (s0 === peg$FAILED) {
            s0 = peg$parsefull_comment();
            if (s0 === peg$FAILED) {
              s0 = peg$parsegroup();
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                s1 = peg$parsemath_shift();
                if (s1 !== peg$FAILED) {
                  s2 = [];
                  s3 = peg$currPos;
                  s4 = peg$currPos;
                  peg$silentFails++;
                  s5 = peg$parsemath_shift();
                  peg$silentFails--;
                  if (s5 === peg$FAILED) {
                    s4 = void 0;
                  } else {
                    peg$currPos = s4;
                    s4 = peg$FAILED;
                  }
                  if (s4 !== peg$FAILED) {
                    s5 = peg$parsemath_token();
                    if (s5 !== peg$FAILED) {
                      peg$savedPos = s3;
                      s3 = peg$f1(s5);
                    } else {
                      peg$currPos = s3;
                      s3 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                  }
                  if (s3 !== peg$FAILED) {
                    while (s3 !== peg$FAILED) {
                      s2.push(s3);
                      s3 = peg$currPos;
                      s4 = peg$currPos;
                      peg$silentFails++;
                      s5 = peg$parsemath_shift();
                      peg$silentFails--;
                      if (s5 === peg$FAILED) {
                        s4 = void 0;
                      } else {
                        peg$currPos = s4;
                        s4 = peg$FAILED;
                      }
                      if (s4 !== peg$FAILED) {
                        s5 = peg$parsemath_token();
                        if (s5 !== peg$FAILED) {
                          peg$savedPos = s3;
                          s3 = peg$f1(s5);
                        } else {
                          peg$currPos = s3;
                          s3 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s3;
                        s3 = peg$FAILED;
                      }
                    }
                  } else {
                    s2 = peg$FAILED;
                  }
                  if (s2 !== peg$FAILED) {
                    s3 = peg$parsemath_shift();
                    if (s3 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s0 = peg$f2(s2);
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
                if (s0 === peg$FAILED) {
                  s0 = peg$parsealignment_tab();
                  if (s0 === peg$FAILED) {
                    s0 = peg$parseparbreak();
                    if (s0 === peg$FAILED) {
                      s0 = peg$parsemacro_parameter();
                      if (s0 === peg$FAILED) {
                        s0 = peg$parseignore();
                        if (s0 === peg$FAILED) {
                          s0 = peg$parsenumber();
                          if (s0 === peg$FAILED) {
                            s0 = peg$parsewhitespace();
                            if (s0 === peg$FAILED) {
                              s0 = peg$parsepunctuation();
                              if (s0 === peg$FAILED) {
                                s0 = peg$currPos;
                                s1 = peg$currPos;
                                s2 = [];
                                s3 = peg$currPos;
                                s4 = peg$currPos;
                                peg$silentFails++;
                                s5 = peg$parsenonchar_token();
                                peg$silentFails--;
                                if (s5 === peg$FAILED) {
                                  s4 = void 0;
                                } else {
                                  peg$currPos = s4;
                                  s4 = peg$FAILED;
                                }
                                if (s4 !== peg$FAILED) {
                                  if (input.length > peg$currPos) {
                                    s5 = input.charAt(peg$currPos);
                                    peg$currPos++;
                                  } else {
                                    s5 = peg$FAILED;
                                    if (peg$silentFails === 0) {
                                      peg$fail(peg$e3);
                                    }
                                  }
                                  if (s5 !== peg$FAILED) {
                                    s4 = [s4, s5];
                                    s3 = s4;
                                  } else {
                                    peg$currPos = s3;
                                    s3 = peg$FAILED;
                                  }
                                } else {
                                  peg$currPos = s3;
                                  s3 = peg$FAILED;
                                }
                                if (s3 !== peg$FAILED) {
                                  while (s3 !== peg$FAILED) {
                                    s2.push(s3);
                                    s3 = peg$currPos;
                                    s4 = peg$currPos;
                                    peg$silentFails++;
                                    s5 = peg$parsenonchar_token();
                                    peg$silentFails--;
                                    if (s5 === peg$FAILED) {
                                      s4 = void 0;
                                    } else {
                                      peg$currPos = s4;
                                      s4 = peg$FAILED;
                                    }
                                    if (s4 !== peg$FAILED) {
                                      if (input.length > peg$currPos) {
                                        s5 = input.charAt(peg$currPos);
                                        peg$currPos++;
                                      } else {
                                        s5 = peg$FAILED;
                                        if (peg$silentFails === 0) {
                                          peg$fail(peg$e3);
                                        }
                                      }
                                      if (s5 !== peg$FAILED) {
                                        s4 = [s4, s5];
                                        s3 = s4;
                                      } else {
                                        peg$currPos = s3;
                                        s3 = peg$FAILED;
                                      }
                                    } else {
                                      peg$currPos = s3;
                                      s3 = peg$FAILED;
                                    }
                                  }
                                } else {
                                  s2 = peg$FAILED;
                                }
                                if (s2 !== peg$FAILED) {
                                  s1 = input.substring(s1, peg$currPos);
                                } else {
                                  s1 = s2;
                                }
                                if (s1 !== peg$FAILED) {
                                  peg$savedPos = s0;
                                  s1 = peg$f3(s1);
                                }
                                s0 = s1;
                                if (s0 === peg$FAILED) {
                                  s0 = peg$parsebegin_group();
                                  if (s0 === peg$FAILED) {
                                    s0 = peg$parseend_group();
                                    if (s0 === peg$FAILED) {
                                      s0 = peg$parsemath_shift();
                                      if (s0 === peg$FAILED) {
                                        s0 = peg$currPos;
                                        if (input.length > peg$currPos) {
                                          s1 = input.charAt(peg$currPos);
                                          peg$currPos++;
                                        } else {
                                          s1 = peg$FAILED;
                                          if (peg$silentFails === 0) {
                                            peg$fail(peg$e3);
                                          }
                                        }
                                        if (s1 !== peg$FAILED) {
                                          peg$savedPos = s0;
                                          s1 = peg$f4(s1);
                                        }
                                        s0 = s1;
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e2);
          }
        }
        return s0;
      }
      function peg$parseparbreak() {
        var s0, s1, s2, s3, s4, s5, s6, s7;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = [];
        s3 = peg$parsesp();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsesp();
        }
        s3 = peg$parsenl();
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$currPos;
          s6 = [];
          s7 = peg$parsesp();
          while (s7 !== peg$FAILED) {
            s6.push(s7);
            s7 = peg$parsesp();
          }
          s7 = peg$parsenl();
          if (s7 !== peg$FAILED) {
            s6 = [s6, s7];
            s5 = s6;
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          if (s5 !== peg$FAILED) {
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$currPos;
              s6 = [];
              s7 = peg$parsesp();
              while (s7 !== peg$FAILED) {
                s6.push(s7);
                s7 = peg$parsesp();
              }
              s7 = peg$parsenl();
              if (s7 !== peg$FAILED) {
                s6 = [s6, s7];
                s5 = s6;
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            }
          } else {
            s4 = peg$FAILED;
          }
          if (s4 !== peg$FAILED) {
            s5 = [];
            s6 = peg$parsesp();
            while (s6 !== peg$FAILED) {
              s5.push(s6);
              s6 = peg$parsesp();
            }
            s6 = peg$currPos;
            peg$silentFails++;
            s7 = peg$parsecomment_start();
            peg$silentFails--;
            if (s7 === peg$FAILED) {
              s6 = void 0;
            } else {
              peg$currPos = s6;
              s6 = peg$FAILED;
            }
            if (s6 !== peg$FAILED) {
              s2 = [s2, s3, s4, s5, s6];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 === peg$FAILED) {
          s1 = peg$currPos;
          s2 = [];
          s3 = peg$parsesp();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parsesp();
          }
          s3 = peg$parsenl();
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = peg$currPos;
            s6 = [];
            s7 = peg$parsesp();
            while (s7 !== peg$FAILED) {
              s6.push(s7);
              s7 = peg$parsesp();
            }
            s7 = peg$parsenl();
            if (s7 !== peg$FAILED) {
              s6 = [s6, s7];
              s5 = s6;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
            if (s5 !== peg$FAILED) {
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = peg$currPos;
                s6 = [];
                s7 = peg$parsesp();
                while (s7 !== peg$FAILED) {
                  s6.push(s7);
                  s7 = peg$parsesp();
                }
                s7 = peg$parsenl();
                if (s7 !== peg$FAILED) {
                  s6 = [s6, s7];
                  s5 = s6;
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              }
            } else {
              s4 = peg$FAILED;
            }
            if (s4 !== peg$FAILED) {
              s2 = [s2, s3, s4];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f5();
        }
        s0 = s1;
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e4);
          }
        }
        return s0;
      }
      function peg$parsemath_token() {
        var s0, s1, s2, s3, s4;
        peg$silentFails++;
        s0 = peg$parsespecial_macro();
        if (s0 === peg$FAILED) {
          s0 = peg$parsemacro();
          if (s0 === peg$FAILED) {
            s0 = peg$parsefull_comment();
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = [];
              s2 = peg$parsewhitespace();
              while (s2 !== peg$FAILED) {
                s1.push(s2);
                s2 = peg$parsewhitespace();
              }
              s2 = peg$parsegroup();
              if (s2 !== peg$FAILED) {
                s3 = [];
                s4 = peg$parsewhitespace();
                while (s4 !== peg$FAILED) {
                  s3.push(s4);
                  s4 = peg$parsewhitespace();
                }
                peg$savedPos = s0;
                s0 = peg$f6(s2);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                s1 = [];
                s2 = peg$parsewhitespace();
                while (s2 !== peg$FAILED) {
                  s1.push(s2);
                  s2 = peg$parsewhitespace();
                }
                s2 = peg$parsealignment_tab();
                if (s2 !== peg$FAILED) {
                  s3 = [];
                  s4 = peg$parsewhitespace();
                  while (s4 !== peg$FAILED) {
                    s3.push(s4);
                    s4 = peg$parsewhitespace();
                  }
                  peg$savedPos = s0;
                  s0 = peg$f7(s2);
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
                if (s0 === peg$FAILED) {
                  s0 = peg$parsemacro_parameter();
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    s1 = [];
                    s2 = peg$parsewhitespace();
                    while (s2 !== peg$FAILED) {
                      s1.push(s2);
                      s2 = peg$parsewhitespace();
                    }
                    s2 = peg$parsesuperscript();
                    if (s2 !== peg$FAILED) {
                      s3 = [];
                      s4 = peg$parsewhitespace();
                      while (s4 !== peg$FAILED) {
                        s3.push(s4);
                        s4 = peg$parsewhitespace();
                      }
                      peg$savedPos = s0;
                      s0 = peg$f8();
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                    if (s0 === peg$FAILED) {
                      s0 = peg$currPos;
                      s1 = [];
                      s2 = peg$parsewhitespace();
                      while (s2 !== peg$FAILED) {
                        s1.push(s2);
                        s2 = peg$parsewhitespace();
                      }
                      s2 = peg$parsesubscript();
                      if (s2 !== peg$FAILED) {
                        s3 = [];
                        s4 = peg$parsewhitespace();
                        while (s4 !== peg$FAILED) {
                          s3.push(s4);
                          s4 = peg$parsewhitespace();
                        }
                        peg$savedPos = s0;
                        s0 = peg$f9();
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                      if (s0 === peg$FAILED) {
                        s0 = peg$parseignore();
                        if (s0 === peg$FAILED) {
                          s0 = peg$parsewhitespace();
                          if (s0 === peg$FAILED) {
                            s0 = peg$currPos;
                            if (input.length > peg$currPos) {
                              s1 = input.charAt(peg$currPos);
                              peg$currPos++;
                            } else {
                              s1 = peg$FAILED;
                              if (peg$silentFails === 0) {
                                peg$fail(peg$e3);
                              }
                            }
                            if (s1 !== peg$FAILED) {
                              peg$savedPos = s0;
                              s1 = peg$f10(s1);
                            }
                            s0 = s1;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e5);
          }
        }
        return s0;
      }
      function peg$parsenonchar_token() {
        var s0, s1;
        peg$silentFails++;
        s0 = peg$parseescape();
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 37) {
            s0 = peg$c0;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e7);
            }
          }
          if (s0 === peg$FAILED) {
            s0 = peg$parsebegin_group();
            if (s0 === peg$FAILED) {
              s0 = peg$parseend_group();
              if (s0 === peg$FAILED) {
                s0 = peg$parsemath_shift();
                if (s0 === peg$FAILED) {
                  s0 = peg$parsealignment_tab();
                  if (s0 === peg$FAILED) {
                    s0 = peg$parsenl();
                    if (s0 === peg$FAILED) {
                      s0 = peg$parsemacro_parameter();
                      if (s0 === peg$FAILED) {
                        s0 = peg$parseignore();
                        if (s0 === peg$FAILED) {
                          s0 = peg$parsesp();
                          if (s0 === peg$FAILED) {
                            s0 = peg$parsepunctuation();
                            if (s0 === peg$FAILED) {
                              s0 = peg$parseEOF();
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e6);
          }
        }
        return s0;
      }
      function peg$parsewhitespace() {
        var s0, s1, s2, s3, s4, s5, s6, s7;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = peg$parsenl();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parsesp();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parsesp();
          }
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 === peg$FAILED) {
          s1 = peg$currPos;
          s2 = [];
          s3 = peg$parsesp();
          if (s3 !== peg$FAILED) {
            while (s3 !== peg$FAILED) {
              s2.push(s3);
              s3 = peg$parsesp();
            }
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parsenl();
            if (s3 !== peg$FAILED) {
              s4 = peg$currPos;
              peg$silentFails++;
              s5 = peg$parsecomment_start();
              peg$silentFails--;
              if (s5 === peg$FAILED) {
                s4 = void 0;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
              if (s4 !== peg$FAILED) {
                s5 = [];
                s6 = peg$parsesp();
                while (s6 !== peg$FAILED) {
                  s5.push(s6);
                  s6 = peg$parsesp();
                }
                s6 = peg$currPos;
                peg$silentFails++;
                s7 = peg$parsenl();
                peg$silentFails--;
                if (s7 === peg$FAILED) {
                  s6 = void 0;
                } else {
                  peg$currPos = s6;
                  s6 = peg$FAILED;
                }
                if (s6 !== peg$FAILED) {
                  s2 = [s2, s3, s4, s5, s6];
                  s1 = s2;
                } else {
                  peg$currPos = s1;
                  s1 = peg$FAILED;
                }
              } else {
                peg$currPos = s1;
                s1 = peg$FAILED;
              }
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
          if (s1 === peg$FAILED) {
            s1 = [];
            s2 = peg$parsesp();
            if (s2 !== peg$FAILED) {
              while (s2 !== peg$FAILED) {
                s1.push(s2);
                s2 = peg$parsesp();
              }
            } else {
              s1 = peg$FAILED;
            }
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f11();
        }
        s0 = s1;
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e8);
          }
        }
        return s0;
      }
      function peg$parsenumber() {
        var s0, s1, s2, s3, s4, s5;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = [];
        s3 = peg$parsenum();
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parsenum();
          }
        } else {
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 46) {
            s3 = peg$c1;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e10);
            }
          }
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = peg$parsenum();
            if (s5 !== peg$FAILED) {
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = peg$parsenum();
              }
            } else {
              s4 = peg$FAILED;
            }
            if (s4 !== peg$FAILED) {
              peg$savedPos = s1;
              s1 = peg$f12(s2, s4);
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 === peg$FAILED) {
          s1 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 46) {
            s2 = peg$c1;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e10);
            }
          }
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$parsenum();
            if (s4 !== peg$FAILED) {
              while (s4 !== peg$FAILED) {
                s3.push(s4);
                s4 = peg$parsenum();
              }
            } else {
              s3 = peg$FAILED;
            }
            if (s3 !== peg$FAILED) {
              peg$savedPos = s1;
              s1 = peg$f13(s3);
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
          if (s1 === peg$FAILED) {
            s1 = peg$currPos;
            s2 = [];
            s3 = peg$parsenum();
            if (s3 !== peg$FAILED) {
              while (s3 !== peg$FAILED) {
                s2.push(s3);
                s3 = peg$parsenum();
              }
            } else {
              s2 = peg$FAILED;
            }
            if (s2 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 46) {
                s3 = peg$c1;
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e10);
                }
              }
              if (s3 !== peg$FAILED) {
                peg$savedPos = s1;
                s1 = peg$f14(s2);
              } else {
                peg$currPos = s1;
                s1 = peg$FAILED;
              }
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f15(s1);
        }
        s0 = s1;
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e9);
          }
        }
        return s0;
      }
      function peg$parsespecial_macro() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$parseescape();
        if (s1 !== peg$FAILED) {
          if (input.substr(peg$currPos, 5) === peg$c2) {
            s2 = peg$c2;
            peg$currPos += 5;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e12);
            }
          }
          if (s2 === peg$FAILED) {
            if (input.substr(peg$currPos, 4) === peg$c3) {
              s2 = peg$c3;
              peg$currPos += 4;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e13);
              }
            }
          }
          if (s2 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e3);
              }
            }
            if (s3 !== peg$FAILED) {
              s4 = [];
              s5 = peg$currPos;
              s6 = peg$currPos;
              peg$silentFails++;
              s7 = peg$currPos;
              if (input.length > peg$currPos) {
                s8 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s8 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e3);
                }
              }
              if (s8 !== peg$FAILED) {
                peg$savedPos = peg$currPos;
                s9 = peg$f16(s2, s3, s8);
                if (s9) {
                  s9 = void 0;
                } else {
                  s9 = peg$FAILED;
                }
                if (s9 !== peg$FAILED) {
                  s8 = [s8, s9];
                  s7 = s8;
                } else {
                  peg$currPos = s7;
                  s7 = peg$FAILED;
                }
              } else {
                peg$currPos = s7;
                s7 = peg$FAILED;
              }
              peg$silentFails--;
              if (s7 === peg$FAILED) {
                s6 = void 0;
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
              if (s6 !== peg$FAILED) {
                if (input.length > peg$currPos) {
                  s7 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e3);
                  }
                }
                if (s7 !== peg$FAILED) {
                  peg$savedPos = s5;
                  s5 = peg$f17(s2, s3, s7);
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = peg$currPos;
                s6 = peg$currPos;
                peg$silentFails++;
                s7 = peg$currPos;
                if (input.length > peg$currPos) {
                  s8 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s8 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e3);
                  }
                }
                if (s8 !== peg$FAILED) {
                  peg$savedPos = peg$currPos;
                  s9 = peg$f16(s2, s3, s8);
                  if (s9) {
                    s9 = void 0;
                  } else {
                    s9 = peg$FAILED;
                  }
                  if (s9 !== peg$FAILED) {
                    s8 = [s8, s9];
                    s7 = s8;
                  } else {
                    peg$currPos = s7;
                    s7 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s7;
                  s7 = peg$FAILED;
                }
                peg$silentFails--;
                if (s7 === peg$FAILED) {
                  s6 = void 0;
                } else {
                  peg$currPos = s6;
                  s6 = peg$FAILED;
                }
                if (s6 !== peg$FAILED) {
                  if (input.length > peg$currPos) {
                    s7 = input.charAt(peg$currPos);
                    peg$currPos++;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) {
                      peg$fail(peg$e3);
                    }
                  }
                  if (s7 !== peg$FAILED) {
                    peg$savedPos = s5;
                    s5 = peg$f17(s2, s3, s7);
                  } else {
                    peg$currPos = s5;
                    s5 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              }
              s5 = peg$currPos;
              if (input.length > peg$currPos) {
                s6 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e3);
                }
              }
              if (s6 !== peg$FAILED) {
                peg$savedPos = peg$currPos;
                s7 = peg$f18(s2, s3, s4, s6);
                if (s7) {
                  s7 = void 0;
                } else {
                  s7 = peg$FAILED;
                }
                if (s7 !== peg$FAILED) {
                  s6 = [s6, s7];
                  s5 = s6;
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f19(s2, s3, s4);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$parseverbatim_environment();
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parsebegin_display_math();
            if (s1 !== peg$FAILED) {
              s2 = [];
              s3 = peg$currPos;
              s4 = peg$currPos;
              peg$silentFails++;
              s5 = peg$parseend_display_math();
              peg$silentFails--;
              if (s5 === peg$FAILED) {
                s4 = void 0;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parsemath_token();
                if (s5 !== peg$FAILED) {
                  peg$savedPos = s3;
                  s3 = peg$f20(s5);
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
              while (s3 !== peg$FAILED) {
                s2.push(s3);
                s3 = peg$currPos;
                s4 = peg$currPos;
                peg$silentFails++;
                s5 = peg$parseend_display_math();
                peg$silentFails--;
                if (s5 === peg$FAILED) {
                  s4 = void 0;
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
                if (s4 !== peg$FAILED) {
                  s5 = peg$parsemath_token();
                  if (s5 !== peg$FAILED) {
                    peg$savedPos = s3;
                    s3 = peg$f20(s5);
                  } else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              }
              s3 = peg$parseend_display_math();
              if (s3 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f21(s2);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = peg$parsebegin_inline_math();
              if (s1 !== peg$FAILED) {
                s2 = [];
                s3 = peg$currPos;
                s4 = peg$currPos;
                peg$silentFails++;
                s5 = peg$parseend_inline_math();
                peg$silentFails--;
                if (s5 === peg$FAILED) {
                  s4 = void 0;
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
                if (s4 !== peg$FAILED) {
                  s5 = peg$parsemath_token();
                  if (s5 !== peg$FAILED) {
                    peg$savedPos = s3;
                    s3 = peg$f22(s5);
                  } else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
                while (s3 !== peg$FAILED) {
                  s2.push(s3);
                  s3 = peg$currPos;
                  s4 = peg$currPos;
                  peg$silentFails++;
                  s5 = peg$parseend_inline_math();
                  peg$silentFails--;
                  if (s5 === peg$FAILED) {
                    s4 = void 0;
                  } else {
                    peg$currPos = s4;
                    s4 = peg$FAILED;
                  }
                  if (s4 !== peg$FAILED) {
                    s5 = peg$parsemath_token();
                    if (s5 !== peg$FAILED) {
                      peg$savedPos = s3;
                      s3 = peg$f22(s5);
                    } else {
                      peg$currPos = s3;
                      s3 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                  }
                }
                s3 = peg$parseend_inline_math();
                if (s3 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s0 = peg$f23(s2);
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                s1 = peg$parsemath_shift();
                if (s1 !== peg$FAILED) {
                  s2 = peg$parsemath_shift();
                  if (s2 !== peg$FAILED) {
                    s3 = [];
                    s4 = peg$currPos;
                    s5 = peg$currPos;
                    peg$silentFails++;
                    s6 = peg$currPos;
                    s7 = peg$parsemath_shift();
                    if (s7 !== peg$FAILED) {
                      s8 = peg$parsemath_shift();
                      if (s8 !== peg$FAILED) {
                        s7 = [s7, s8];
                        s6 = s7;
                      } else {
                        peg$currPos = s6;
                        s6 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s6;
                      s6 = peg$FAILED;
                    }
                    peg$silentFails--;
                    if (s6 === peg$FAILED) {
                      s5 = void 0;
                    } else {
                      peg$currPos = s5;
                      s5 = peg$FAILED;
                    }
                    if (s5 !== peg$FAILED) {
                      s6 = peg$parsemath_token();
                      if (s6 !== peg$FAILED) {
                        peg$savedPos = s4;
                        s4 = peg$f24(s6);
                      } else {
                        peg$currPos = s4;
                        s4 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s4;
                      s4 = peg$FAILED;
                    }
                    while (s4 !== peg$FAILED) {
                      s3.push(s4);
                      s4 = peg$currPos;
                      s5 = peg$currPos;
                      peg$silentFails++;
                      s6 = peg$currPos;
                      s7 = peg$parsemath_shift();
                      if (s7 !== peg$FAILED) {
                        s8 = peg$parsemath_shift();
                        if (s8 !== peg$FAILED) {
                          s7 = [s7, s8];
                          s6 = s7;
                        } else {
                          peg$currPos = s6;
                          s6 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s6;
                        s6 = peg$FAILED;
                      }
                      peg$silentFails--;
                      if (s6 === peg$FAILED) {
                        s5 = void 0;
                      } else {
                        peg$currPos = s5;
                        s5 = peg$FAILED;
                      }
                      if (s5 !== peg$FAILED) {
                        s6 = peg$parsemath_token();
                        if (s6 !== peg$FAILED) {
                          peg$savedPos = s4;
                          s4 = peg$f24(s6);
                        } else {
                          peg$currPos = s4;
                          s4 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s4;
                        s4 = peg$FAILED;
                      }
                    }
                    s4 = peg$parsemath_shift();
                    if (s4 !== peg$FAILED) {
                      s5 = peg$parsemath_shift();
                      if (s5 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s0 = peg$f25(s3);
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
                if (s0 === peg$FAILED) {
                  s0 = peg$parsemath_environment();
                  if (s0 === peg$FAILED) {
                    s0 = peg$parseenvironment();
                  }
                }
              }
            }
          }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e11);
          }
        }
        return s0;
      }
      function peg$parseverbatim_environment() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$parsebegin_env();
        if (s1 !== peg$FAILED) {
          s2 = peg$parsebegin_group();
          if (s2 !== peg$FAILED) {
            s3 = peg$parseverbatim_env_name();
            if (s3 !== peg$FAILED) {
              s4 = peg$parseend_group();
              if (s4 !== peg$FAILED) {
                s5 = [];
                s6 = peg$currPos;
                s7 = peg$currPos;
                peg$silentFails++;
                s8 = peg$currPos;
                s9 = peg$parseend_env();
                if (s9 !== peg$FAILED) {
                  s10 = peg$parsegroup();
                  if (s10 !== peg$FAILED) {
                    peg$savedPos = peg$currPos;
                    s11 = peg$f26(s3, s10);
                    if (s11) {
                      s11 = void 0;
                    } else {
                      s11 = peg$FAILED;
                    }
                    if (s11 !== peg$FAILED) {
                      s9 = [s9, s10, s11];
                      s8 = s9;
                    } else {
                      peg$currPos = s8;
                      s8 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s8;
                    s8 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s8;
                  s8 = peg$FAILED;
                }
                peg$silentFails--;
                if (s8 === peg$FAILED) {
                  s7 = void 0;
                } else {
                  peg$currPos = s7;
                  s7 = peg$FAILED;
                }
                if (s7 !== peg$FAILED) {
                  if (input.length > peg$currPos) {
                    s8 = input.charAt(peg$currPos);
                    peg$currPos++;
                  } else {
                    s8 = peg$FAILED;
                    if (peg$silentFails === 0) {
                      peg$fail(peg$e3);
                    }
                  }
                  if (s8 !== peg$FAILED) {
                    peg$savedPos = s6;
                    s6 = peg$f27(s3, s8);
                  } else {
                    peg$currPos = s6;
                    s6 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s6;
                  s6 = peg$FAILED;
                }
                while (s6 !== peg$FAILED) {
                  s5.push(s6);
                  s6 = peg$currPos;
                  s7 = peg$currPos;
                  peg$silentFails++;
                  s8 = peg$currPos;
                  s9 = peg$parseend_env();
                  if (s9 !== peg$FAILED) {
                    s10 = peg$parsegroup();
                    if (s10 !== peg$FAILED) {
                      peg$savedPos = peg$currPos;
                      s11 = peg$f26(s3, s10);
                      if (s11) {
                        s11 = void 0;
                      } else {
                        s11 = peg$FAILED;
                      }
                      if (s11 !== peg$FAILED) {
                        s9 = [s9, s10, s11];
                        s8 = s9;
                      } else {
                        peg$currPos = s8;
                        s8 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s8;
                      s8 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s8;
                    s8 = peg$FAILED;
                  }
                  peg$silentFails--;
                  if (s8 === peg$FAILED) {
                    s7 = void 0;
                  } else {
                    peg$currPos = s7;
                    s7 = peg$FAILED;
                  }
                  if (s7 !== peg$FAILED) {
                    if (input.length > peg$currPos) {
                      s8 = input.charAt(peg$currPos);
                      peg$currPos++;
                    } else {
                      s8 = peg$FAILED;
                      if (peg$silentFails === 0) {
                        peg$fail(peg$e3);
                      }
                    }
                    if (s8 !== peg$FAILED) {
                      peg$savedPos = s6;
                      s6 = peg$f27(s3, s8);
                    } else {
                      peg$currPos = s6;
                      s6 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s6;
                    s6 = peg$FAILED;
                  }
                }
                s6 = peg$parseend_env();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parsebegin_group();
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parseverbatim_env_name();
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parseend_group();
                      if (s9 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s0 = peg$f28(s3, s5);
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e14);
          }
        }
        return s0;
      }
      function peg$parseverbatim_env_name() {
        var s0;
        if (input.substr(peg$currPos, 9) === peg$c4) {
          s0 = peg$c4;
          peg$currPos += 9;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e15);
          }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 8) === peg$c5) {
            s0 = peg$c5;
            peg$currPos += 8;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e16);
            }
          }
          if (s0 === peg$FAILED) {
            if (input.substr(peg$currPos, 13) === peg$c6) {
              s0 = peg$c6;
              peg$currPos += 13;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e17);
              }
            }
            if (s0 === peg$FAILED) {
              if (input.substr(peg$currPos, 12) === peg$c7) {
                s0 = peg$c7;
                peg$currPos += 12;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e18);
                }
              }
              if (s0 === peg$FAILED) {
                if (input.substr(peg$currPos, 7) === peg$c8) {
                  s0 = peg$c8;
                  peg$currPos += 7;
                } else {
                  s0 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e19);
                  }
                }
                if (s0 === peg$FAILED) {
                  if (input.substr(peg$currPos, 10) === peg$c9) {
                    s0 = peg$c9;
                    peg$currPos += 10;
                  } else {
                    s0 = peg$FAILED;
                    if (peg$silentFails === 0) {
                      peg$fail(peg$e20);
                    }
                  }
                }
              }
            }
          }
        }
        return s0;
      }
      function peg$parsemacro() {
        var s0, s1, s2, s3, s4;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = peg$parseescape();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parsechar();
          if (s4 !== peg$FAILED) {
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parsechar();
            }
          } else {
            s3 = peg$FAILED;
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s1;
            s1 = peg$f29(s3);
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 === peg$FAILED) {
          s1 = peg$currPos;
          s2 = peg$parseescape();
          if (s2 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e3);
              }
            }
            if (s3 !== peg$FAILED) {
              peg$savedPos = s1;
              s1 = peg$f30(s3);
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f31(s1);
        }
        s0 = s1;
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e21);
          }
        }
        return s0;
      }
      function peg$parsegroup() {
        var s0, s1, s2, s3, s4, s5;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$parsebegin_group();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$currPos;
          s4 = peg$currPos;
          peg$silentFails++;
          s5 = peg$parseend_group();
          peg$silentFails--;
          if (s5 === peg$FAILED) {
            s4 = void 0;
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parsetoken();
            if (s5 !== peg$FAILED) {
              peg$savedPos = s3;
              s3 = peg$f32(s5);
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$currPos;
            s4 = peg$currPos;
            peg$silentFails++;
            s5 = peg$parseend_group();
            peg$silentFails--;
            if (s5 === peg$FAILED) {
              s4 = void 0;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parsetoken();
              if (s5 !== peg$FAILED) {
                peg$savedPos = s3;
                s3 = peg$f32(s5);
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          }
          s3 = peg$parseend_group();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f33(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e22);
          }
        }
        return s0;
      }
      function peg$parsegroup_contents_as_string() {
        var s0, s1;
        s0 = peg$currPos;
        s1 = peg$parsegroup();
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f34(s1);
        }
        s0 = s1;
        return s0;
      }
      function peg$parseenvironment() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$parsebegin_env();
        if (s1 !== peg$FAILED) {
          s2 = peg$parsegroup_contents_as_string();
          if (s2 !== peg$FAILED) {
            s3 = peg$parsesameline_comment();
            if (s3 === peg$FAILED) {
              s3 = null;
            }
            s4 = [];
            s5 = peg$currPos;
            s6 = peg$currPos;
            peg$silentFails++;
            s7 = peg$currPos;
            s8 = peg$parseend_env();
            if (s8 !== peg$FAILED) {
              s9 = peg$parsegroup_contents_as_string();
              if (s9 !== peg$FAILED) {
                peg$savedPos = peg$currPos;
                s10 = peg$f35(s2, s3, s9);
                if (s10) {
                  s10 = void 0;
                } else {
                  s10 = peg$FAILED;
                }
                if (s10 !== peg$FAILED) {
                  s8 = [s8, s9, s10];
                  s7 = s8;
                } else {
                  peg$currPos = s7;
                  s7 = peg$FAILED;
                }
              } else {
                peg$currPos = s7;
                s7 = peg$FAILED;
              }
            } else {
              peg$currPos = s7;
              s7 = peg$FAILED;
            }
            peg$silentFails--;
            if (s7 === peg$FAILED) {
              s6 = void 0;
            } else {
              peg$currPos = s6;
              s6 = peg$FAILED;
            }
            if (s6 !== peg$FAILED) {
              s7 = peg$parsetoken();
              if (s7 !== peg$FAILED) {
                peg$savedPos = s5;
                s5 = peg$f36(s2, s3, s7);
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$currPos;
              s6 = peg$currPos;
              peg$silentFails++;
              s7 = peg$currPos;
              s8 = peg$parseend_env();
              if (s8 !== peg$FAILED) {
                s9 = peg$parsegroup_contents_as_string();
                if (s9 !== peg$FAILED) {
                  peg$savedPos = peg$currPos;
                  s10 = peg$f35(s2, s3, s9);
                  if (s10) {
                    s10 = void 0;
                  } else {
                    s10 = peg$FAILED;
                  }
                  if (s10 !== peg$FAILED) {
                    s8 = [s8, s9, s10];
                    s7 = s8;
                  } else {
                    peg$currPos = s7;
                    s7 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s7;
                  s7 = peg$FAILED;
                }
              } else {
                peg$currPos = s7;
                s7 = peg$FAILED;
              }
              peg$silentFails--;
              if (s7 === peg$FAILED) {
                s6 = void 0;
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
              if (s6 !== peg$FAILED) {
                s7 = peg$parsetoken();
                if (s7 !== peg$FAILED) {
                  peg$savedPos = s5;
                  s5 = peg$f36(s2, s3, s7);
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            }
            s5 = peg$parseend_env();
            if (s5 !== peg$FAILED) {
              s6 = peg$parsegroup_contents_as_string();
              if (s6 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f37(s2, s3, s4);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e23);
          }
        }
        return s0;
      }
      function peg$parsemath_environment() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$parsebegin_env();
        if (s1 !== peg$FAILED) {
          s2 = peg$parsebegin_group();
          if (s2 !== peg$FAILED) {
            s3 = peg$parsemath_env_name();
            if (s3 !== peg$FAILED) {
              s4 = peg$parseend_group();
              if (s4 !== peg$FAILED) {
                s5 = peg$parsesameline_comment();
                if (s5 === peg$FAILED) {
                  s5 = null;
                }
                s6 = [];
                s7 = peg$currPos;
                s8 = peg$currPos;
                peg$silentFails++;
                s9 = peg$currPos;
                s10 = peg$parseend_env();
                if (s10 !== peg$FAILED) {
                  s11 = peg$parsegroup();
                  if (s11 !== peg$FAILED) {
                    peg$savedPos = peg$currPos;
                    s12 = peg$f38(s3, s5, s11);
                    if (s12) {
                      s12 = void 0;
                    } else {
                      s12 = peg$FAILED;
                    }
                    if (s12 !== peg$FAILED) {
                      s10 = [s10, s11, s12];
                      s9 = s10;
                    } else {
                      peg$currPos = s9;
                      s9 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s9;
                    s9 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s9;
                  s9 = peg$FAILED;
                }
                peg$silentFails--;
                if (s9 === peg$FAILED) {
                  s8 = void 0;
                } else {
                  peg$currPos = s8;
                  s8 = peg$FAILED;
                }
                if (s8 !== peg$FAILED) {
                  s9 = peg$parsemath_token();
                  if (s9 !== peg$FAILED) {
                    peg$savedPos = s7;
                    s7 = peg$f39(s3, s5, s9);
                  } else {
                    peg$currPos = s7;
                    s7 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s7;
                  s7 = peg$FAILED;
                }
                while (s7 !== peg$FAILED) {
                  s6.push(s7);
                  s7 = peg$currPos;
                  s8 = peg$currPos;
                  peg$silentFails++;
                  s9 = peg$currPos;
                  s10 = peg$parseend_env();
                  if (s10 !== peg$FAILED) {
                    s11 = peg$parsegroup();
                    if (s11 !== peg$FAILED) {
                      peg$savedPos = peg$currPos;
                      s12 = peg$f38(s3, s5, s11);
                      if (s12) {
                        s12 = void 0;
                      } else {
                        s12 = peg$FAILED;
                      }
                      if (s12 !== peg$FAILED) {
                        s10 = [s10, s11, s12];
                        s9 = s10;
                      } else {
                        peg$currPos = s9;
                        s9 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s9;
                      s9 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s9;
                    s9 = peg$FAILED;
                  }
                  peg$silentFails--;
                  if (s9 === peg$FAILED) {
                    s8 = void 0;
                  } else {
                    peg$currPos = s8;
                    s8 = peg$FAILED;
                  }
                  if (s8 !== peg$FAILED) {
                    s9 = peg$parsemath_token();
                    if (s9 !== peg$FAILED) {
                      peg$savedPos = s7;
                      s7 = peg$f39(s3, s5, s9);
                    } else {
                      peg$currPos = s7;
                      s7 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s7;
                    s7 = peg$FAILED;
                  }
                }
                s7 = peg$parseend_env();
                if (s7 !== peg$FAILED) {
                  s8 = peg$parsebegin_group();
                  if (s8 !== peg$FAILED) {
                    s9 = peg$parsemath_env_name();
                    if (s9 !== peg$FAILED) {
                      s10 = peg$parseend_group();
                      if (s10 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s0 = peg$f40(s3, s5, s6);
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e24);
          }
        }
        return s0;
      }
      function peg$parsemath_group() {
        var s0, s1, s2, s3, s4, s5;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$parsebegin_group();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$currPos;
          s4 = peg$currPos;
          peg$silentFails++;
          s5 = peg$parseend_group();
          peg$silentFails--;
          if (s5 === peg$FAILED) {
            s4 = void 0;
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parsemath_token();
            if (s5 !== peg$FAILED) {
              peg$savedPos = s3;
              s3 = peg$f41(s5);
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$currPos;
            s4 = peg$currPos;
            peg$silentFails++;
            s5 = peg$parseend_group();
            peg$silentFails--;
            if (s5 === peg$FAILED) {
              s4 = void 0;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parsemath_token();
              if (s5 !== peg$FAILED) {
                peg$savedPos = s3;
                s3 = peg$f41(s5);
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          }
          s3 = peg$parseend_group();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f42(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e25);
          }
        }
        return s0;
      }
      function peg$parsebegin_display_math() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$parseescape();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 91) {
            s2 = peg$c10;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e26);
            }
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseend_display_math() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$parseescape();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 93) {
            s2 = peg$c11;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e27);
            }
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsebegin_inline_math() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$parseescape();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 40) {
            s2 = peg$c12;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e28);
            }
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseend_inline_math() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$parseescape();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 41) {
            s2 = peg$c13;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e29);
            }
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsebegin_env() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$parseescape();
        if (s1 !== peg$FAILED) {
          if (input.substr(peg$currPos, 5) === peg$c14) {
            s2 = peg$c14;
            peg$currPos += 5;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e30);
            }
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseend_env() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$parseescape();
        if (s1 !== peg$FAILED) {
          if (input.substr(peg$currPos, 3) === peg$c15) {
            s2 = peg$c15;
            peg$currPos += 3;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e31);
            }
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsemath_env_name() {
        var s0, s1;
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 9) === peg$c16) {
          s1 = peg$c16;
          peg$currPos += 9;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e32);
          }
        }
        if (s1 === peg$FAILED) {
          if (input.substr(peg$currPos, 8) === peg$c17) {
            s1 = peg$c17;
            peg$currPos += 8;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e33);
            }
          }
          if (s1 === peg$FAILED) {
            if (input.substr(peg$currPos, 6) === peg$c18) {
              s1 = peg$c18;
              peg$currPos += 6;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e34);
              }
            }
            if (s1 === peg$FAILED) {
              if (input.substr(peg$currPos, 5) === peg$c19) {
                s1 = peg$c19;
                peg$currPos += 5;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e35);
                }
              }
              if (s1 === peg$FAILED) {
                if (input.substr(peg$currPos, 8) === peg$c20) {
                  s1 = peg$c20;
                  peg$currPos += 8;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e36);
                  }
                }
                if (s1 === peg$FAILED) {
                  if (input.substr(peg$currPos, 7) === peg$c21) {
                    s1 = peg$c21;
                    peg$currPos += 7;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) {
                      peg$fail(peg$e37);
                    }
                  }
                  if (s1 === peg$FAILED) {
                    if (input.substr(peg$currPos, 7) === peg$c22) {
                      s1 = peg$c22;
                      peg$currPos += 7;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) {
                        peg$fail(peg$e38);
                      }
                    }
                    if (s1 === peg$FAILED) {
                      if (input.substr(peg$currPos, 6) === peg$c23) {
                        s1 = peg$c23;
                        peg$currPos += 6;
                      } else {
                        s1 = peg$FAILED;
                        if (peg$silentFails === 0) {
                          peg$fail(peg$e39);
                        }
                      }
                      if (s1 === peg$FAILED) {
                        if (input.substr(peg$currPos, 9) === peg$c24) {
                          s1 = peg$c24;
                          peg$currPos += 9;
                        } else {
                          s1 = peg$FAILED;
                          if (peg$silentFails === 0) {
                            peg$fail(peg$e40);
                          }
                        }
                        if (s1 === peg$FAILED) {
                          if (input.substr(peg$currPos, 8) === peg$c25) {
                            s1 = peg$c25;
                            peg$currPos += 8;
                          } else {
                            s1 = peg$FAILED;
                            if (peg$silentFails === 0) {
                              peg$fail(peg$e41);
                            }
                          }
                          if (s1 === peg$FAILED) {
                            if (input.substr(peg$currPos, 8) === peg$c26) {
                              s1 = peg$c26;
                              peg$currPos += 8;
                            } else {
                              s1 = peg$FAILED;
                              if (peg$silentFails === 0) {
                                peg$fail(peg$e42);
                              }
                            }
                            if (s1 === peg$FAILED) {
                              if (input.substr(peg$currPos, 7) === peg$c27) {
                                s1 = peg$c27;
                                peg$currPos += 7;
                              } else {
                                s1 = peg$FAILED;
                                if (peg$silentFails === 0) {
                                  peg$fail(peg$e43);
                                }
                              }
                              if (s1 === peg$FAILED) {
                                if (input.substr(peg$currPos, 5) === peg$c28) {
                                  s1 = peg$c28;
                                  peg$currPos += 5;
                                } else {
                                  s1 = peg$FAILED;
                                  if (peg$silentFails === 0) {
                                    peg$fail(peg$e44);
                                  }
                                }
                                if (s1 === peg$FAILED) {
                                  if (input.substr(peg$currPos, 4) === peg$c29) {
                                    s1 = peg$c29;
                                    peg$currPos += 4;
                                  } else {
                                    s1 = peg$FAILED;
                                    if (peg$silentFails === 0) {
                                      peg$fail(peg$e45);
                                    }
                                  }
                                  if (s1 === peg$FAILED) {
                                    if (input.substr(peg$currPos, 11) === peg$c30) {
                                      s1 = peg$c30;
                                      peg$currPos += 11;
                                    } else {
                                      s1 = peg$FAILED;
                                      if (peg$silentFails === 0) {
                                        peg$fail(peg$e46);
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f43(s1);
        }
        s0 = s1;
        return s0;
      }
      function peg$parseescape() {
        var s0, s1;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 92) {
          s1 = peg$c31;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e48);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f44();
        }
        s0 = s1;
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e47);
          }
        }
        return s0;
      }
      function peg$parsebegin_group() {
        var s0, s1;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 123) {
          s1 = peg$c32;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e49);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f45(s1);
        }
        s0 = s1;
        return s0;
      }
      function peg$parseend_group() {
        var s0, s1;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 125) {
          s1 = peg$c33;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e50);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f46(s1);
        }
        s0 = s1;
        return s0;
      }
      function peg$parsemath_shift() {
        var s0, s1;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 36) {
          s1 = peg$c34;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e51);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f47(s1);
        }
        s0 = s1;
        return s0;
      }
      function peg$parsealignment_tab() {
        var s0, s1;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 38) {
          s1 = peg$c35;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e52);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f48(s1);
        }
        s0 = s1;
        return s0;
      }
      function peg$parsenl() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        if (input.charCodeAt(peg$currPos) === 13) {
          s2 = peg$c36;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e54);
          }
        }
        peg$silentFails--;
        if (s2 === peg$FAILED) {
          s1 = void 0;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 10) {
            s2 = peg$c37;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e55);
            }
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 13) {
            s0 = peg$c36;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e54);
            }
          }
          if (s0 === peg$FAILED) {
            if (input.substr(peg$currPos, 2) === peg$c38) {
              s0 = peg$c38;
              peg$currPos += 2;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e56);
              }
            }
          }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e53);
          }
        }
        return s0;
      }
      function peg$parsemacro_parameter() {
        var s0, s1;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 35) {
          s1 = peg$c39;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e57);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f49(s1);
        }
        s0 = s1;
        return s0;
      }
      function peg$parsesuperscript() {
        var s0, s1;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 94) {
          s1 = peg$c40;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e58);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f50(s1);
        }
        s0 = s1;
        return s0;
      }
      function peg$parsesubscript() {
        var s0, s1;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 95) {
          s1 = peg$c41;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e59);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f51(s1);
        }
        s0 = s1;
        return s0;
      }
      function peg$parseignore() {
        var s0;
        if (input.charCodeAt(peg$currPos) === 0) {
          s0 = peg$c42;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e60);
          }
        }
        return s0;
      }
      function peg$parsesp() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = [];
        if (peg$r0.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e61);
          }
        }
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            if (peg$r0.test(input.charAt(peg$currPos))) {
              s2 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e61);
              }
            }
          }
        } else {
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f52();
        }
        s0 = s1;
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e8);
          }
        }
        return s0;
      }
      function peg$parsechar() {
        var s0, s1;
        peg$silentFails++;
        if (peg$r1.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e63);
          }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e62);
          }
        }
        return s0;
      }
      function peg$parsenum() {
        var s0, s1;
        peg$silentFails++;
        if (peg$r2.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e65);
          }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e64);
          }
        }
        return s0;
      }
      function peg$parsepunctuation() {
        var s0, s1;
        peg$silentFails++;
        s0 = peg$currPos;
        if (peg$r3.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e67);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f53(s1);
        }
        s0 = s1;
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e66);
          }
        }
        return s0;
      }
      function peg$parsecomment_start() {
        var s0;
        if (input.charCodeAt(peg$currPos) === 37) {
          s0 = peg$c0;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e7);
          }
        }
        return s0;
      }
      function peg$parsefull_comment() {
        var s0, s1;
        peg$silentFails++;
        s0 = peg$parseownline_comment();
        if (s0 === peg$FAILED) {
          s0 = peg$parsesameline_comment();
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e68);
          }
        }
        return s0;
      }
      function peg$parseownline_comment() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = [];
        s3 = peg$parsesp();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsesp();
        }
        s3 = peg$parsenl();
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 === peg$FAILED) {
          s1 = null;
        }
        s2 = peg$parseleading_sp();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsecomment();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f54(s2, s3);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsesameline_comment() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parsesp();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parsesp();
        }
        s2 = peg$parsecomment();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f55(s1, s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsecomment() {
        var s0, s1, s2, s3, s4, s5, s6, s7;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$parsecomment_start();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$currPos;
          s4 = peg$currPos;
          peg$silentFails++;
          s5 = peg$parsenl();
          peg$silentFails--;
          if (s5 === peg$FAILED) {
            s4 = void 0;
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e3);
              }
            }
            if (s5 !== peg$FAILED) {
              peg$savedPos = s3;
              s3 = peg$f56(s5);
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$currPos;
            s4 = peg$currPos;
            peg$silentFails++;
            s5 = peg$parsenl();
            peg$silentFails--;
            if (s5 === peg$FAILED) {
              s4 = void 0;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
            if (s4 !== peg$FAILED) {
              if (input.length > peg$currPos) {
                s5 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e3);
                }
              }
              if (s5 !== peg$FAILED) {
                peg$savedPos = s3;
                s3 = peg$f56(s5);
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          }
          s3 = peg$currPos;
          peg$silentFails++;
          s4 = peg$parseparbreak();
          peg$silentFails--;
          if (s4 !== peg$FAILED) {
            peg$currPos = s3;
            s3 = void 0;
          } else {
            s3 = peg$FAILED;
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f57(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parsecomment_start();
          if (s1 !== peg$FAILED) {
            s2 = [];
            s3 = peg$currPos;
            s4 = peg$currPos;
            peg$silentFails++;
            s5 = peg$parsenl();
            peg$silentFails--;
            if (s5 === peg$FAILED) {
              s4 = void 0;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
            if (s4 !== peg$FAILED) {
              if (input.length > peg$currPos) {
                s5 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e3);
                }
              }
              if (s5 !== peg$FAILED) {
                peg$savedPos = s3;
                s3 = peg$f58(s5);
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
            while (s3 !== peg$FAILED) {
              s2.push(s3);
              s3 = peg$currPos;
              s4 = peg$currPos;
              peg$silentFails++;
              s5 = peg$parsenl();
              peg$silentFails--;
              if (s5 === peg$FAILED) {
                s4 = void 0;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
              if (s4 !== peg$FAILED) {
                if (input.length > peg$currPos) {
                  s5 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e3);
                  }
                }
                if (s5 !== peg$FAILED) {
                  peg$savedPos = s3;
                  s3 = peg$f58(s5);
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            }
            s3 = peg$currPos;
            s4 = peg$parsenl();
            if (s4 !== peg$FAILED) {
              s5 = [];
              s6 = peg$parsesp();
              while (s6 !== peg$FAILED) {
                s5.push(s6);
                s6 = peg$parsesp();
              }
              s6 = peg$currPos;
              peg$silentFails++;
              s7 = peg$parsecomment_start();
              peg$silentFails--;
              if (s7 === peg$FAILED) {
                s6 = void 0;
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
              if (s6 !== peg$FAILED) {
                s4 = [s4, s5, s6];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
            if (s3 === peg$FAILED) {
              s3 = peg$parsenl();
              if (s3 === peg$FAILED) {
                s3 = peg$parseEOF();
              }
            }
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f59(s2);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e69);
          }
        }
        return s0;
      }
      function peg$parseleading_sp() {
        var s0, s1, s2, s3, s4;
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = peg$parsestart_of_line();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parsesp();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parsesp();
          }
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          s0 = input.substring(s0, peg$currPos);
        } else {
          s0 = s1;
        }
        return s0;
      }
      function peg$parsestart_of_line() {
        var s0;
        peg$savedPos = peg$currPos;
        s0 = peg$f60();
        if (s0) {
          s0 = void 0;
        } else {
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseEOF() {
        var s0, s1;
        s0 = peg$currPos;
        peg$silentFails++;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        peg$silentFails--;
        if (s1 === peg$FAILED) {
          s0 = void 0;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function toString(e) {
        if (typeof e === "string") {
          return e;
        }
        if (typeof e.content === "string") {
          return e.content;
        }
        if (e && e.type === "whitespace") {
          return " ";
        }
        return e;
      }
      function compare_env(g1, g2) {
        const g1Name = typeof g1 === "string" ? g1 : g1.content.map(toString).join("");
        const g2Name = typeof g2 === "string" ? g2 : g2.content.map(toString).join("");
        return g1Name === g2Name;
      }
      function createNode(type, extra = {}) {
        return { type, ...extra, position: location() };
      }
      peg$result = peg$startRuleFunction();
      if (peg$result !== peg$FAILED && peg$currPos === input.length) {
        return peg$result;
      } else {
        if (peg$result !== peg$FAILED && peg$currPos < input.length) {
          peg$fail(peg$endExpectation());
        }
        throw peg$buildStructuredError(
          peg$maxFailExpected,
          peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
          peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
        );
      }
    }
    return {
      SyntaxError: peg$SyntaxError,
      parse: peg$parse
    };
  }()
);
var align_environment_default = (
  // Generated by Peggy 2.0.1.
  //
  // https://peggyjs.org/
  function() {
    "use strict";
    function peg$subclass(child, parent) {
      function C() {
        this.constructor = child;
      }
      C.prototype = parent.prototype;
      child.prototype = new C();
    }
    function peg$SyntaxError(message, expected, found, location) {
      var self = Error.call(this, message);
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(self, peg$SyntaxError.prototype);
      }
      self.expected = expected;
      self.found = found;
      self.location = location;
      self.name = "SyntaxError";
      return self;
    }
    peg$subclass(peg$SyntaxError, Error);
    function peg$padEnd(str, targetLength, padString) {
      padString = padString || " ";
      if (str.length > targetLength) {
        return str;
      }
      targetLength -= str.length;
      padString += padString.repeat(targetLength);
      return str + padString.slice(0, targetLength);
    }
    peg$SyntaxError.prototype.format = function(sources) {
      var str = "Error: " + this.message;
      if (this.location) {
        var src = null;
        var k;
        for (k = 0; k < sources.length; k++) {
          if (sources[k].source === this.location.source) {
            src = sources[k].text.split(/\r\n|\n|\r/g);
            break;
          }
        }
        var s2 = this.location.start;
        var loc = this.location.source + ":" + s2.line + ":" + s2.column;
        if (src) {
          var e = this.location.end;
          var filler = peg$padEnd("", s2.line.toString().length, " ");
          var line = src[s2.line - 1];
          var last = s2.line === e.line ? e.column : line.length + 1;
          var hatLen = last - s2.column || 1;
          str += "\n --> " + loc + "\n" + filler + " |\n" + s2.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
        } else {
          str += "\n at " + loc;
        }
      }
      return str;
    };
    peg$SyntaxError.buildMessage = function(expected, found) {
      var DESCRIBE_EXPECTATION_FNS = {
        literal: function(expectation) {
          return '"' + literalEscape(expectation.text) + '"';
        },
        class: function(expectation) {
          var escapedParts = expectation.parts.map(function(part) {
            return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
          });
          return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
        },
        any: function() {
          return "any character";
        },
        end: function() {
          return "end of input";
        },
        other: function(expectation) {
          return expectation.description;
        }
      };
      function hex(ch) {
        return ch.charCodeAt(0).toString(16).toUpperCase();
      }
      function literalEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function classEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function describeExpectation(expectation) {
        return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
      }
      function describeExpected(expected2) {
        var descriptions = expected2.map(describeExpectation);
        var i, j;
        descriptions.sort();
        if (descriptions.length > 0) {
          for (i = 1, j = 1; i < descriptions.length; i++) {
            if (descriptions[i - 1] !== descriptions[i]) {
              descriptions[j] = descriptions[i];
              j++;
            }
          }
          descriptions.length = j;
        }
        switch (descriptions.length) {
          case 1:
            return descriptions[0];
          case 2:
            return descriptions[0] + " or " + descriptions[1];
          default:
            return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
        }
      }
      function describeFound(found2) {
        return found2 ? '"' + literalEscape(found2) + '"' : "end of input";
      }
      return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
    };
    function peg$parse(input, options) {
      options = options !== void 0 ? options : {};
      var peg$FAILED = {};
      var peg$source = options.grammarSource;
      var peg$startRuleFunctions = { body: peg$parsebody };
      var peg$startRuleFunction = peg$parsebody;
      var peg$e0 = peg$anyExpectation();
      var peg$f0 = function() {
        return [];
      };
      var peg$f1 = function(x) {
        return { cells: [], colSeps: [], ...x };
      };
      var peg$f2 = function(rowItems, rowSep, trailingComment) {
        return { ...rowItems, rowSep, trailingComment };
      };
      var peg$f3 = function(rowItems, trailingComment) {
        return { ...rowItems, rowSep: null, trailingComment };
      };
      var peg$f4 = function(x) {
        return x;
      };
      var peg$f5 = function(x) {
        return {
          cells: [],
          colSeps: [],
          rowSep: null,
          trailingComment: x
        };
      };
      var peg$f6 = function(x) {
        return x;
      };
      var peg$f7 = function(colSep, cell) {
        return { colSep, cell };
      };
      var peg$f8 = function(colSep) {
        return { colSep };
      };
      var peg$f9 = function(a, b) {
        return processRow(a, b);
      };
      var peg$f10 = function(b) {
        return processRow(null, b);
      };
      var peg$f11 = function(tok) {
        return options.isSameLineComment(tok);
      };
      var peg$f12 = function(tok) {
        return tok;
      };
      var peg$f13 = function(tok) {
        return options.isOwnLineComment(tok);
      };
      var peg$f14 = function(tok) {
        return tok;
      };
      var peg$f15 = function(tok) {
        return options.isWhitespace(tok);
      };
      var peg$f16 = function(tok) {
        return tok;
      };
      var peg$f17 = function(tok) {
        return options.isRowSep(tok);
      };
      var peg$f18 = function(tok) {
        return tok;
      };
      var peg$f19 = function(tok) {
        return options.isColSep(tok);
      };
      var peg$f20 = function(tok) {
        return tok;
      };
      var peg$currPos = 0;
      var peg$savedPos = 0;
      var peg$posDetailsCache = [{ line: 1, column: 1 }];
      var peg$maxFailPos = 0;
      var peg$maxFailExpected = [];
      var peg$silentFails = 0;
      var peg$result;
      if ("startRule" in options) {
        if (!(options.startRule in peg$startRuleFunctions)) {
          throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
        }
        peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
      }
      function text() {
        return input.substring(peg$savedPos, peg$currPos);
      }
      function offset() {
        return peg$savedPos;
      }
      function range() {
        return {
          source: peg$source,
          start: peg$savedPos,
          end: peg$currPos
        };
      }
      function location() {
        return peg$computeLocation(peg$savedPos, peg$currPos);
      }
      function expected(description, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildStructuredError(
          [peg$otherExpectation(description)],
          input.substring(peg$savedPos, peg$currPos),
          location2
        );
      }
      function error(message, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildSimpleError(message, location2);
      }
      function peg$literalExpectation(text2, ignoreCase) {
        return { type: "literal", text: text2, ignoreCase };
      }
      function peg$classExpectation(parts, inverted, ignoreCase) {
        return { type: "class", parts, inverted, ignoreCase };
      }
      function peg$anyExpectation() {
        return { type: "any" };
      }
      function peg$endExpectation() {
        return { type: "end" };
      }
      function peg$otherExpectation(description) {
        return { type: "other", description };
      }
      function peg$computePosDetails(pos) {
        var details = peg$posDetailsCache[pos];
        var p;
        if (details) {
          return details;
        } else {
          p = pos - 1;
          while (!peg$posDetailsCache[p]) {
            p--;
          }
          details = peg$posDetailsCache[p];
          details = {
            line: details.line,
            column: details.column
          };
          while (p < pos) {
            if (input.charCodeAt(p) === 10) {
              details.line++;
              details.column = 1;
            } else {
              details.column++;
            }
            p++;
          }
          peg$posDetailsCache[pos] = details;
          return details;
        }
      }
      function peg$computeLocation(startPos, endPos) {
        var startPosDetails = peg$computePosDetails(startPos);
        var endPosDetails = peg$computePosDetails(endPos);
        return {
          source: peg$source,
          start: {
            offset: startPos,
            line: startPosDetails.line,
            column: startPosDetails.column
          },
          end: {
            offset: endPos,
            line: endPosDetails.line,
            column: endPosDetails.column
          }
        };
      }
      function peg$fail(expected2) {
        if (peg$currPos < peg$maxFailPos) {
          return;
        }
        if (peg$currPos > peg$maxFailPos) {
          peg$maxFailPos = peg$currPos;
          peg$maxFailExpected = [];
        }
        peg$maxFailExpected.push(expected2);
      }
      function peg$buildSimpleError(message, location2) {
        return new peg$SyntaxError(message, null, null, location2);
      }
      function peg$buildStructuredError(expected2, found, location2) {
        return new peg$SyntaxError(
          peg$SyntaxError.buildMessage(expected2, found),
          expected2,
          found,
          location2
        );
      }
      function peg$parsebody() {
        var s0, s1;
        s0 = [];
        s1 = peg$parsecomment_only_line();
        if (s1 === peg$FAILED) {
          s1 = peg$parserow_with_end();
          if (s1 === peg$FAILED) {
            s1 = peg$parserow_without_end();
          }
        }
        if (s1 !== peg$FAILED) {
          while (s1 !== peg$FAILED) {
            s0.push(s1);
            s1 = peg$parsecomment_only_line();
            if (s1 === peg$FAILED) {
              s1 = peg$parserow_with_end();
              if (s1 === peg$FAILED) {
                s1 = peg$parserow_without_end();
              }
            }
          }
        } else {
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parseEOL();
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f0();
          }
          s0 = s1;
        }
        return s0;
      }
      function peg$parserow_with_end() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = peg$parserow_items();
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        peg$savedPos = s1;
        s2 = peg$f1(s2);
        s1 = s2;
        s2 = peg$parserow_sep();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsetrailing_comment();
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          peg$savedPos = s0;
          s0 = peg$f2(s1, s2, s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parserow_without_end() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$parserow_items();
        if (s1 !== peg$FAILED) {
          s2 = peg$parsetrailing_comment();
          if (s2 === peg$FAILED) {
            s2 = null;
          }
          peg$savedPos = s0;
          s0 = peg$f3(s1, s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsetrailing_comment() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parsewhitespace();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parsewhitespace();
        }
        s2 = peg$parsesame_line_comment();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f4(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsecomment_only_line() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parsewhitespace();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parsewhitespace();
        }
        s2 = peg$parseown_line_comment();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f5(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsetoken() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        s2 = peg$parserow_sep();
        if (s2 === peg$FAILED) {
          s2 = peg$parsecol_sep();
          if (s2 === peg$FAILED) {
            s2 = peg$parsetrailing_comment();
            if (s2 === peg$FAILED) {
              s2 = peg$parseown_line_comment();
            }
          }
        }
        peg$silentFails--;
        if (s2 === peg$FAILED) {
          s1 = void 0;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e0);
            }
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f6(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsecell() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parsetoken();
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parsetoken();
          }
        } else {
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          s0 = input.substring(s0, peg$currPos);
        } else {
          s0 = s1;
        }
        return s0;
      }
      function peg$parseseparated_cell() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$parsecol_sep();
        if (s1 !== peg$FAILED) {
          s2 = peg$parsecell();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f7(s1, s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parsecol_sep();
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f8(s1);
          }
          s0 = s1;
        }
        return s0;
      }
      function peg$parserow_items() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$parsecell();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parseseparated_cell();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parseseparated_cell();
          }
          peg$savedPos = s0;
          s0 = peg$f9(s1, s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = [];
          s2 = peg$parseseparated_cell();
          if (s2 !== peg$FAILED) {
            while (s2 !== peg$FAILED) {
              s1.push(s2);
              s2 = peg$parseseparated_cell();
            }
          } else {
            s1 = peg$FAILED;
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f10(s1);
          }
          s0 = s1;
        }
        return s0;
      }
      function peg$parsesame_line_comment() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f11(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f12(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseown_line_comment() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f13(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f14(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsewhitespace() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f15(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f16(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parserow_sep() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f17(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f18(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsecol_sep() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f19(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f20(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseEOL() {
        var s0, s1;
        s0 = peg$currPos;
        peg$silentFails++;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        peg$silentFails--;
        if (s1 === peg$FAILED) {
          s0 = void 0;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function processRow(leadCell, otherCells) {
        const cells = [leadCell || []];
        const seps = [];
        for (const x of otherCells) {
          cells.push(x.cell || []);
          seps.push(x.colSep);
        }
        return { cells, colSeps: seps };
      }
      if (!options.isWhitespace) {
        try {
          Object.assign(
            options,
            createMatchers(["\\", "hline", "cr"], ["&"])
          );
        } catch (e) {
          console.warn("Error when initializing parser", e);
        }
      }
      peg$result = peg$startRuleFunction();
      if (peg$result !== peg$FAILED && peg$currPos === input.length) {
        return peg$result;
      } else {
        if (peg$result !== peg$FAILED && peg$currPos < input.length) {
          peg$fail(peg$endExpectation());
        }
        throw peg$buildStructuredError(
          peg$maxFailExpected,
          peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
          peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
        );
      }
    }
    return {
      SyntaxError: peg$SyntaxError,
      parse: peg$parse
    };
  }()
);
var xparse_argspec_default = (
  // Generated by Peggy 2.0.1.
  //
  // https://peggyjs.org/
  function() {
    "use strict";
    function peg$subclass(child, parent) {
      function C() {
        this.constructor = child;
      }
      C.prototype = parent.prototype;
      child.prototype = new C();
    }
    function peg$SyntaxError(message, expected, found, location) {
      var self = Error.call(this, message);
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(self, peg$SyntaxError.prototype);
      }
      self.expected = expected;
      self.found = found;
      self.location = location;
      self.name = "SyntaxError";
      return self;
    }
    peg$subclass(peg$SyntaxError, Error);
    function peg$padEnd(str, targetLength, padString) {
      padString = padString || " ";
      if (str.length > targetLength) {
        return str;
      }
      targetLength -= str.length;
      padString += padString.repeat(targetLength);
      return str + padString.slice(0, targetLength);
    }
    peg$SyntaxError.prototype.format = function(sources) {
      var str = "Error: " + this.message;
      if (this.location) {
        var src = null;
        var k;
        for (k = 0; k < sources.length; k++) {
          if (sources[k].source === this.location.source) {
            src = sources[k].text.split(/\r\n|\n|\r/g);
            break;
          }
        }
        var s2 = this.location.start;
        var loc = this.location.source + ":" + s2.line + ":" + s2.column;
        if (src) {
          var e = this.location.end;
          var filler = peg$padEnd("", s2.line.toString().length, " ");
          var line = src[s2.line - 1];
          var last = s2.line === e.line ? e.column : line.length + 1;
          var hatLen = last - s2.column || 1;
          str += "\n --> " + loc + "\n" + filler + " |\n" + s2.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
        } else {
          str += "\n at " + loc;
        }
      }
      return str;
    };
    peg$SyntaxError.buildMessage = function(expected, found) {
      var DESCRIBE_EXPECTATION_FNS = {
        literal: function(expectation) {
          return '"' + literalEscape(expectation.text) + '"';
        },
        class: function(expectation) {
          var escapedParts = expectation.parts.map(function(part) {
            return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
          });
          return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
        },
        any: function() {
          return "any character";
        },
        end: function() {
          return "end of input";
        },
        other: function(expectation) {
          return expectation.description;
        }
      };
      function hex(ch) {
        return ch.charCodeAt(0).toString(16).toUpperCase();
      }
      function literalEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function classEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function describeExpectation(expectation) {
        return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
      }
      function describeExpected(expected2) {
        var descriptions = expected2.map(describeExpectation);
        var i, j;
        descriptions.sort();
        if (descriptions.length > 0) {
          for (i = 1, j = 1; i < descriptions.length; i++) {
            if (descriptions[i - 1] !== descriptions[i]) {
              descriptions[j] = descriptions[i];
              j++;
            }
          }
          descriptions.length = j;
        }
        switch (descriptions.length) {
          case 1:
            return descriptions[0];
          case 2:
            return descriptions[0] + " or " + descriptions[1];
          default:
            return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
        }
      }
      function describeFound(found2) {
        return found2 ? '"' + literalEscape(found2) + '"' : "end of input";
      }
      return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
    };
    function peg$parse(input, options) {
      options = options !== void 0 ? options : {};
      var peg$FAILED = {};
      var peg$source = options.grammarSource;
      var peg$startRuleFunctions = { args_spec_list: peg$parseargs_spec_list };
      var peg$startRuleFunction = peg$parseargs_spec_list;
      var peg$c0 = "+";
      var peg$c1 = "v";
      var peg$c2 = "b";
      var peg$c3 = "!";
      var peg$c4 = "D";
      var peg$c5 = "d";
      var peg$c6 = "s";
      var peg$c7 = "O";
      var peg$c8 = "o";
      var peg$c9 = "e";
      var peg$c10 = "E";
      var peg$c11 = "t";
      var peg$c12 = "R";
      var peg$c13 = "r";
      var peg$c14 = "u";
      var peg$c15 = "m";
      var peg$c16 = "{";
      var peg$c17 = "}";
      var peg$c18 = " ";
      var peg$c19 = "\n";
      var peg$c20 = "\r";
      var peg$r0 = /^[{ ]/;
      var peg$e0 = peg$literalExpectation("+", false);
      var peg$e1 = peg$literalExpectation("v", false);
      var peg$e2 = peg$anyExpectation();
      var peg$e3 = peg$literalExpectation("b", false);
      var peg$e4 = peg$literalExpectation("!", false);
      var peg$e5 = peg$literalExpectation("D", false);
      var peg$e6 = peg$literalExpectation("d", false);
      var peg$e7 = peg$literalExpectation("s", false);
      var peg$e8 = peg$literalExpectation("O", false);
      var peg$e9 = peg$literalExpectation("o", false);
      var peg$e10 = peg$literalExpectation("e", false);
      var peg$e11 = peg$literalExpectation("E", false);
      var peg$e12 = peg$literalExpectation("t", false);
      var peg$e13 = peg$literalExpectation("R", false);
      var peg$e14 = peg$literalExpectation("r", false);
      var peg$e15 = peg$literalExpectation("u", false);
      var peg$e16 = peg$classExpectation(["{", " "], false, false);
      var peg$e17 = peg$literalExpectation("m", false);
      var peg$e18 = peg$literalExpectation("{", false);
      var peg$e19 = peg$literalExpectation("}", false);
      var peg$e20 = peg$literalExpectation(" ", false);
      var peg$e21 = peg$literalExpectation("\n", false);
      var peg$e22 = peg$literalExpectation("\r", false);
      var peg$f0 = function(x) {
        return x;
      };
      var peg$f1 = function(spec) {
        return spec;
      };
      var peg$f2 = function(spec) {
        return spec;
      };
      var peg$f3 = function(openBrace) {
        return createNode("verbatim", { openBrace, closeBrace: openBrace });
      };
      var peg$f4 = function() {
        return createNode("body");
      };
      var peg$f5 = function(leading_bang, spec) {
        return leading_bang ? { ...spec, noLeadingWhitespace: true } : spec;
      };
      var peg$f6 = function(braceSpec, defaultArg) {
        return createNode("optional", { ...braceSpec, defaultArg });
      };
      var peg$f7 = function(braceSpec) {
        return createNode("optional", braceSpec);
      };
      var peg$f8 = function() {
        return createNode("optionalStar");
      };
      var peg$f9 = function(g) {
        return createNode("optional", { defaultArg: g });
      };
      var peg$f10 = function() {
        return createNode("optional");
      };
      var peg$f11 = function(args) {
        return createNode("embellishment", {
          embellishmentTokens: args.content
        });
      };
      var peg$f12 = function(args, g) {
        return createNode("embellishment", {
          embellishmentTokens: args.content,
          defaultArg: g
        });
      };
      var peg$f13 = function(tok) {
        return createNode("optionalToken", { token: tok });
      };
      var peg$f14 = function(braceSpec, defaultArg) {
        return createNode("mandatory", { ...braceSpec, defaultArg });
      };
      var peg$f15 = function(braceSpec) {
        return createNode("mandatory", braceSpec);
      };
      var peg$f16 = function(stopTokens) {
        return createNode("until", { stopTokens });
      };
      var peg$f17 = function(x) {
        return [x];
      };
      var peg$f18 = function(g) {
        return g.content;
      };
      var peg$f19 = function() {
        return createNode("mandatory");
      };
      var peg$f20 = function(openBrace, closeBrace) {
        return { openBrace, closeBrace };
      };
      var peg$f21 = function(content) {
        return { type: "group", content };
      };
      var peg$f22 = function() {
        return "";
      };
      var peg$currPos = 0;
      var peg$savedPos = 0;
      var peg$posDetailsCache = [{ line: 1, column: 1 }];
      var peg$maxFailPos = 0;
      var peg$maxFailExpected = [];
      var peg$silentFails = 0;
      var peg$result;
      if ("startRule" in options) {
        if (!(options.startRule in peg$startRuleFunctions)) {
          throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
        }
        peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
      }
      function text() {
        return input.substring(peg$savedPos, peg$currPos);
      }
      function offset() {
        return peg$savedPos;
      }
      function range() {
        return {
          source: peg$source,
          start: peg$savedPos,
          end: peg$currPos
        };
      }
      function location() {
        return peg$computeLocation(peg$savedPos, peg$currPos);
      }
      function expected(description, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildStructuredError(
          [peg$otherExpectation(description)],
          input.substring(peg$savedPos, peg$currPos),
          location2
        );
      }
      function error(message, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildSimpleError(message, location2);
      }
      function peg$literalExpectation(text2, ignoreCase) {
        return { type: "literal", text: text2, ignoreCase };
      }
      function peg$classExpectation(parts, inverted, ignoreCase) {
        return { type: "class", parts, inverted, ignoreCase };
      }
      function peg$anyExpectation() {
        return { type: "any" };
      }
      function peg$endExpectation() {
        return { type: "end" };
      }
      function peg$otherExpectation(description) {
        return { type: "other", description };
      }
      function peg$computePosDetails(pos) {
        var details = peg$posDetailsCache[pos];
        var p;
        if (details) {
          return details;
        } else {
          p = pos - 1;
          while (!peg$posDetailsCache[p]) {
            p--;
          }
          details = peg$posDetailsCache[p];
          details = {
            line: details.line,
            column: details.column
          };
          while (p < pos) {
            if (input.charCodeAt(p) === 10) {
              details.line++;
              details.column = 1;
            } else {
              details.column++;
            }
            p++;
          }
          peg$posDetailsCache[pos] = details;
          return details;
        }
      }
      function peg$computeLocation(startPos, endPos) {
        var startPosDetails = peg$computePosDetails(startPos);
        var endPosDetails = peg$computePosDetails(endPos);
        return {
          source: peg$source,
          start: {
            offset: startPos,
            line: startPosDetails.line,
            column: startPosDetails.column
          },
          end: {
            offset: endPos,
            line: endPosDetails.line,
            column: endPosDetails.column
          }
        };
      }
      function peg$fail(expected2) {
        if (peg$currPos < peg$maxFailPos) {
          return;
        }
        if (peg$currPos > peg$maxFailPos) {
          peg$maxFailPos = peg$currPos;
          peg$maxFailExpected = [];
        }
        peg$maxFailExpected.push(expected2);
      }
      function peg$buildSimpleError(message, location2) {
        return new peg$SyntaxError(message, null, null, location2);
      }
      function peg$buildStructuredError(expected2, found, location2) {
        return new peg$SyntaxError(
          peg$SyntaxError.buildMessage(expected2, found),
          expected2,
          found,
          location2
        );
      }
      function peg$parseargs_spec_list() {
        var s0, s1, s2, s3, s4;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$currPos;
        s3 = peg$parsewhitespace();
        s4 = peg$parsearg_spec();
        if (s4 !== peg$FAILED) {
          peg$savedPos = s2;
          s2 = peg$f0(s4);
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$currPos;
          s3 = peg$parsewhitespace();
          s4 = peg$parsearg_spec();
          if (s4 !== peg$FAILED) {
            peg$savedPos = s2;
            s2 = peg$f0(s4);
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        }
        s2 = peg$parsewhitespace();
        peg$savedPos = s0;
        s0 = peg$f1(s1);
        return s0;
      }
      function peg$parsearg_spec() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 43) {
          s1 = peg$c0;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 === peg$FAILED) {
          s1 = null;
        }
        s2 = peg$parseoptional();
        if (s2 === peg$FAILED) {
          s2 = peg$parsemandatory();
          if (s2 === peg$FAILED) {
            s2 = peg$parseverbatim();
            if (s2 === peg$FAILED) {
              s2 = peg$parserequired();
              if (s2 === peg$FAILED) {
                s2 = peg$parsebody();
                if (s2 === peg$FAILED) {
                  s2 = peg$parseuntil();
                }
              }
            }
          }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f2(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseverbatim() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 118) {
          s1 = peg$c1;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e1);
          }
        }
        if (s1 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e2);
            }
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f3(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsebody() {
        var s0, s1;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 98) {
          s1 = peg$c2;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f4();
        }
        s0 = s1;
        return s0;
      }
      function peg$parseoptional() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 33) {
          s1 = peg$c3;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e4);
          }
        }
        if (s1 === peg$FAILED) {
          s1 = null;
        }
        s2 = peg$parseoptional_star();
        if (s2 === peg$FAILED) {
          s2 = peg$parseoptional_standard();
          if (s2 === peg$FAILED) {
            s2 = peg$parseoptional_delimited();
            if (s2 === peg$FAILED) {
              s2 = peg$parseoptional_embellishment();
              if (s2 === peg$FAILED) {
                s2 = peg$parseoptional_token();
              }
            }
          }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f5(s1, s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseoptional_delimited() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 68) {
          s1 = peg$c4;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e5);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsebrace_spec();
          s3 = peg$parsebraced_group();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f6(s2, s3);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 100) {
            s1 = peg$c5;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e6);
            }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parsebrace_spec();
            peg$savedPos = s0;
            s0 = peg$f7(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        }
        return s0;
      }
      function peg$parseoptional_star() {
        var s0, s1;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 115) {
          s1 = peg$c6;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e7);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f8();
        }
        s0 = s1;
        return s0;
      }
      function peg$parseoptional_standard() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 79) {
          s1 = peg$c7;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e8);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsebraced_group();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f9(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 111) {
            s1 = peg$c8;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e9);
            }
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f10();
          }
          s0 = s1;
        }
        return s0;
      }
      function peg$parseoptional_embellishment() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 101) {
          s1 = peg$c9;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e10);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsebraced_group();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f11(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 69) {
            s1 = peg$c10;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e11);
            }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parsebraced_group();
            if (s2 !== peg$FAILED) {
              s3 = peg$parsebraced_group();
              if (s3 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f12(s2, s3);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        }
        return s0;
      }
      function peg$parseoptional_token() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 116) {
          s1 = peg$c11;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e12);
          }
        }
        if (s1 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e2);
            }
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f13(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parserequired() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 82) {
          s1 = peg$c12;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e13);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsebrace_spec();
          s3 = peg$parsebraced_group();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f14(s2, s3);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 114) {
            s1 = peg$c13;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e14);
            }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parsebrace_spec();
            peg$savedPos = s0;
            s0 = peg$f15(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        }
        return s0;
      }
      function peg$parseuntil() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 117) {
          s1 = peg$c14;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e15);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseuntil_stop_token();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f16(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseuntil_stop_token() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        if (peg$r0.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e16);
          }
        }
        peg$silentFails--;
        if (s2 === peg$FAILED) {
          s1 = void 0;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e2);
            }
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f17(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parsebraced_group();
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f18(s1);
          }
          s0 = s1;
        }
        return s0;
      }
      function peg$parsemandatory() {
        var s0, s1;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 109) {
          s1 = peg$c15;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e17);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f19();
        }
        s0 = s1;
        return s0;
      }
      function peg$parsebrace_spec() {
        var s0, s1, s2, s3, s4, s5;
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = peg$currPos;
        s3 = peg$currPos;
        peg$silentFails++;
        s4 = peg$parsewhitespace_token();
        peg$silentFails--;
        if (s4 === peg$FAILED) {
          s3 = void 0;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e2);
            }
          }
          if (s4 !== peg$FAILED) {
            s3 = [s3, s4];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        s1 = input.substring(s1, peg$currPos);
        s2 = peg$currPos;
        s3 = peg$currPos;
        s4 = peg$currPos;
        peg$silentFails++;
        s5 = peg$parsewhitespace_token();
        peg$silentFails--;
        if (s5 === peg$FAILED) {
          s4 = void 0;
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        if (s4 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e2);
            }
          }
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        s2 = input.substring(s2, peg$currPos);
        peg$savedPos = s0;
        s0 = peg$f20(s1, s2);
        return s0;
      }
      function peg$parsebraced_group() {
        var s0, s1, s2, s3, s4, s5, s6, s7;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 123) {
          s1 = peg$c16;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e18);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$currPos;
          s4 = peg$currPos;
          s5 = peg$currPos;
          peg$silentFails++;
          if (input.charCodeAt(peg$currPos) === 125) {
            s6 = peg$c17;
            peg$currPos++;
          } else {
            s6 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e19);
            }
          }
          peg$silentFails--;
          if (s6 === peg$FAILED) {
            s5 = void 0;
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$currPos;
            peg$silentFails++;
            s7 = peg$parsebraced_group();
            peg$silentFails--;
            if (s7 === peg$FAILED) {
              s6 = void 0;
            } else {
              peg$currPos = s6;
              s6 = peg$FAILED;
            }
            if (s6 !== peg$FAILED) {
              if (input.length > peg$currPos) {
                s7 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s7 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e2);
                }
              }
              if (s7 !== peg$FAILED) {
                s5 = [s5, s6, s7];
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 !== peg$FAILED) {
            s3 = input.substring(s3, peg$currPos);
          } else {
            s3 = s4;
          }
          if (s3 === peg$FAILED) {
            s3 = peg$parsebraced_group();
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$currPos;
            s4 = peg$currPos;
            s5 = peg$currPos;
            peg$silentFails++;
            if (input.charCodeAt(peg$currPos) === 125) {
              s6 = peg$c17;
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e19);
              }
            }
            peg$silentFails--;
            if (s6 === peg$FAILED) {
              s5 = void 0;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$currPos;
              peg$silentFails++;
              s7 = peg$parsebraced_group();
              peg$silentFails--;
              if (s7 === peg$FAILED) {
                s6 = void 0;
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
              if (s6 !== peg$FAILED) {
                if (input.length > peg$currPos) {
                  s7 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e2);
                  }
                }
                if (s7 !== peg$FAILED) {
                  s5 = [s5, s6, s7];
                  s4 = s5;
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
            if (s4 !== peg$FAILED) {
              s3 = input.substring(s3, peg$currPos);
            } else {
              s3 = s4;
            }
            if (s3 === peg$FAILED) {
              s3 = peg$parsebraced_group();
            }
          }
          if (input.charCodeAt(peg$currPos) === 125) {
            s3 = peg$c17;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e19);
            }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f21(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsewhitespace() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parsewhitespace_token();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parsewhitespace_token();
        }
        peg$savedPos = s0;
        s1 = peg$f22();
        s0 = s1;
        return s0;
      }
      function peg$parsewhitespace_token() {
        var s0;
        if (input.charCodeAt(peg$currPos) === 32) {
          s0 = peg$c18;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e20);
          }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 10) {
            s0 = peg$c19;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e21);
            }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 13) {
              s0 = peg$c20;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e22);
              }
            }
          }
        }
        return s0;
      }
      const DEFAULT_OPTIONS = {
        optional: { openBrace: "[", closeBrace: "]" },
        mandatory: { openBrace: "{", closeBrace: "}" }
      };
      function createNode(type, options2) {
        const computedOptions = DEFAULT_OPTIONS[type] || {};
        return { type, ...computedOptions, ...options2 };
      }
      peg$result = peg$startRuleFunction();
      if (peg$result !== peg$FAILED && peg$currPos === input.length) {
        return peg$result;
      } else {
        if (peg$result !== peg$FAILED && peg$currPos < input.length) {
          peg$fail(peg$endExpectation());
        }
        throw peg$buildStructuredError(
          peg$maxFailExpected,
          peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
          peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
        );
      }
    }
    return {
      SyntaxError: peg$SyntaxError,
      parse: peg$parse
    };
  }()
);
var pgfkeys_default = (
  // Generated by Peggy 2.0.1.
  //
  // https://peggyjs.org/
  function() {
    "use strict";
    function peg$subclass(child, parent) {
      function C() {
        this.constructor = child;
      }
      C.prototype = parent.prototype;
      child.prototype = new C();
    }
    function peg$SyntaxError(message, expected, found, location) {
      var self = Error.call(this, message);
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(self, peg$SyntaxError.prototype);
      }
      self.expected = expected;
      self.found = found;
      self.location = location;
      self.name = "SyntaxError";
      return self;
    }
    peg$subclass(peg$SyntaxError, Error);
    function peg$padEnd(str, targetLength, padString) {
      padString = padString || " ";
      if (str.length > targetLength) {
        return str;
      }
      targetLength -= str.length;
      padString += padString.repeat(targetLength);
      return str + padString.slice(0, targetLength);
    }
    peg$SyntaxError.prototype.format = function(sources) {
      var str = "Error: " + this.message;
      if (this.location) {
        var src = null;
        var k;
        for (k = 0; k < sources.length; k++) {
          if (sources[k].source === this.location.source) {
            src = sources[k].text.split(/\r\n|\n|\r/g);
            break;
          }
        }
        var s2 = this.location.start;
        var loc = this.location.source + ":" + s2.line + ":" + s2.column;
        if (src) {
          var e = this.location.end;
          var filler = peg$padEnd("", s2.line.toString().length, " ");
          var line = src[s2.line - 1];
          var last = s2.line === e.line ? e.column : line.length + 1;
          var hatLen = last - s2.column || 1;
          str += "\n --> " + loc + "\n" + filler + " |\n" + s2.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
        } else {
          str += "\n at " + loc;
        }
      }
      return str;
    };
    peg$SyntaxError.buildMessage = function(expected, found) {
      var DESCRIBE_EXPECTATION_FNS = {
        literal: function(expectation) {
          return '"' + literalEscape(expectation.text) + '"';
        },
        class: function(expectation) {
          var escapedParts = expectation.parts.map(function(part) {
            return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
          });
          return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
        },
        any: function() {
          return "any character";
        },
        end: function() {
          return "end of input";
        },
        other: function(expectation) {
          return expectation.description;
        }
      };
      function hex(ch) {
        return ch.charCodeAt(0).toString(16).toUpperCase();
      }
      function literalEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function classEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function describeExpectation(expectation) {
        return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
      }
      function describeExpected(expected2) {
        var descriptions = expected2.map(describeExpectation);
        var i, j;
        descriptions.sort();
        if (descriptions.length > 0) {
          for (i = 1, j = 1; i < descriptions.length; i++) {
            if (descriptions[i - 1] !== descriptions[i]) {
              descriptions[j] = descriptions[i];
              j++;
            }
          }
          descriptions.length = j;
        }
        switch (descriptions.length) {
          case 1:
            return descriptions[0];
          case 2:
            return descriptions[0] + " or " + descriptions[1];
          default:
            return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
        }
      }
      function describeFound(found2) {
        return found2 ? '"' + literalEscape(found2) + '"' : "end of input";
      }
      return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
    };
    function peg$parse(input, options) {
      options = options !== void 0 ? options : {};
      var peg$FAILED = {};
      var peg$source = options.grammarSource;
      var peg$startRuleFunctions = { body: peg$parsebody };
      var peg$startRuleFunction = peg$parsebody;
      var peg$e0 = peg$anyExpectation();
      var peg$f0 = function() {
        return [];
      };
      var peg$f1 = function(rowItems, trailingComment) {
        return {
          itemParts: [],
          ...rowItems,
          trailingComment,
          trailingComma: true
        };
      };
      var peg$f2 = function(rowItems, trailingComment) {
        return { ...rowItems, trailingComment };
      };
      var peg$f3 = function(a, b) {
        return processItem(a, b);
      };
      var peg$f4 = function(b) {
        return processItem(null, b);
      };
      var peg$f5 = function(cell) {
        return { cell };
      };
      var peg$f6 = function() {
        return {};
      };
      var peg$f7 = function(part) {
        return part;
      };
      var peg$f8 = function(x) {
        return x;
      };
      var peg$f9 = function(space, x) {
        return {
          trailingComment: x,
          leadingParbreak: space.parbreak > 0
        };
      };
      var peg$f10 = function(list) {
        return {
          whitespace: list.filter((x) => options.isWhitespace(x)).length,
          parbreak: list.filter((x) => options.isParbreak(x)).length
        };
      };
      var peg$f11 = function() {
        return !options.allowParenGroups;
      };
      var peg$f12 = function(tok) {
        return options.isSameLineComment(tok);
      };
      var peg$f13 = function(tok) {
        return tok;
      };
      var peg$f14 = function(tok) {
        return options.isOwnLineComment(tok);
      };
      var peg$f15 = function(tok) {
        return tok;
      };
      var peg$f16 = function(tok) {
        return options.isWhitespace(tok);
      };
      var peg$f17 = function(tok) {
        return tok;
      };
      var peg$f18 = function(tok) {
        return options.isParbreak(tok);
      };
      var peg$f19 = function(tok) {
        return tok;
      };
      var peg$f20 = function(tok) {
        return options.isComma(tok);
      };
      var peg$f21 = function(tok) {
        return tok;
      };
      var peg$f22 = function(tok) {
        return options.isEquals(tok);
      };
      var peg$f23 = function(tok) {
        return tok;
      };
      var peg$f24 = function(tok) {
        return options.isChar(tok, "(");
      };
      var peg$f25 = function(tok) {
        return tok;
      };
      var peg$f26 = function(tok) {
        return options.isChar(tok, ")");
      };
      var peg$f27 = function(tok) {
        return tok;
      };
      var peg$currPos = 0;
      var peg$savedPos = 0;
      var peg$posDetailsCache = [{ line: 1, column: 1 }];
      var peg$maxFailPos = 0;
      var peg$maxFailExpected = [];
      var peg$silentFails = 0;
      var peg$result;
      if ("startRule" in options) {
        if (!(options.startRule in peg$startRuleFunctions)) {
          throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
        }
        peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
      }
      function text() {
        return input.substring(peg$savedPos, peg$currPos);
      }
      function offset() {
        return peg$savedPos;
      }
      function range() {
        return {
          source: peg$source,
          start: peg$savedPos,
          end: peg$currPos
        };
      }
      function location() {
        return peg$computeLocation(peg$savedPos, peg$currPos);
      }
      function expected(description, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildStructuredError(
          [peg$otherExpectation(description)],
          input.substring(peg$savedPos, peg$currPos),
          location2
        );
      }
      function error(message, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildSimpleError(message, location2);
      }
      function peg$literalExpectation(text2, ignoreCase) {
        return { type: "literal", text: text2, ignoreCase };
      }
      function peg$classExpectation(parts, inverted, ignoreCase) {
        return { type: "class", parts, inverted, ignoreCase };
      }
      function peg$anyExpectation() {
        return { type: "any" };
      }
      function peg$endExpectation() {
        return { type: "end" };
      }
      function peg$otherExpectation(description) {
        return { type: "other", description };
      }
      function peg$computePosDetails(pos) {
        var details = peg$posDetailsCache[pos];
        var p;
        if (details) {
          return details;
        } else {
          p = pos - 1;
          while (!peg$posDetailsCache[p]) {
            p--;
          }
          details = peg$posDetailsCache[p];
          details = {
            line: details.line,
            column: details.column
          };
          while (p < pos) {
            if (input.charCodeAt(p) === 10) {
              details.line++;
              details.column = 1;
            } else {
              details.column++;
            }
            p++;
          }
          peg$posDetailsCache[pos] = details;
          return details;
        }
      }
      function peg$computeLocation(startPos, endPos) {
        var startPosDetails = peg$computePosDetails(startPos);
        var endPosDetails = peg$computePosDetails(endPos);
        return {
          source: peg$source,
          start: {
            offset: startPos,
            line: startPosDetails.line,
            column: startPosDetails.column
          },
          end: {
            offset: endPos,
            line: endPosDetails.line,
            column: endPosDetails.column
          }
        };
      }
      function peg$fail(expected2) {
        if (peg$currPos < peg$maxFailPos) {
          return;
        }
        if (peg$currPos > peg$maxFailPos) {
          peg$maxFailPos = peg$currPos;
          peg$maxFailExpected = [];
        }
        peg$maxFailExpected.push(expected2);
      }
      function peg$buildSimpleError(message, location2) {
        return new peg$SyntaxError(message, null, null, location2);
      }
      function peg$buildStructuredError(expected2, found, location2) {
        return new peg$SyntaxError(
          peg$SyntaxError.buildMessage(expected2, found),
          expected2,
          found,
          location2
        );
      }
      function peg$parsebody() {
        var s0, s1, s2;
        s0 = [];
        s1 = peg$parsecomment_only_line();
        if (s1 === peg$FAILED) {
          s1 = peg$parseitem_with_end();
          if (s1 === peg$FAILED) {
            s1 = peg$parseitem_without_end();
          }
        }
        if (s1 !== peg$FAILED) {
          while (s1 !== peg$FAILED) {
            s0.push(s1);
            s1 = peg$parsecomment_only_line();
            if (s1 === peg$FAILED) {
              s1 = peg$parseitem_with_end();
              if (s1 === peg$FAILED) {
                s1 = peg$parseitem_without_end();
              }
            }
          }
        } else {
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = [];
          s2 = peg$parsewhitespace();
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parsewhitespace();
          }
          s2 = peg$parseEOL();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f0();
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        }
        return s0;
      }
      function peg$parseitem_with_end() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8;
        s0 = peg$currPos;
        s1 = peg$parsewhitespace_or_parbreaks();
        s2 = peg$parserow_items();
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        s3 = peg$parsewhitespace_or_parbreaks();
        s4 = peg$parseitem_sep();
        if (s4 !== peg$FAILED) {
          s5 = [];
          s6 = peg$parsewhitespace();
          while (s6 !== peg$FAILED) {
            s5.push(s6);
            s6 = peg$parsewhitespace();
          }
          s6 = peg$parsetrailing_comment();
          if (s6 === peg$FAILED) {
            s6 = null;
          }
          s7 = [];
          s8 = peg$parsewhitespace();
          while (s8 !== peg$FAILED) {
            s7.push(s8);
            s8 = peg$parsewhitespace();
          }
          peg$savedPos = s0;
          s0 = peg$f1(s2, s6);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseitem_without_end() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$parsewhitespace_or_parbreaks();
        s2 = peg$parserow_items();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsetrailing_comment();
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          peg$savedPos = s0;
          s0 = peg$f2(s2, s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parserow_items() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$parseitem_part();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parseseparated_part();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parseseparated_part();
          }
          peg$savedPos = s0;
          s0 = peg$f3(s1, s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = [];
          s2 = peg$parseseparated_part();
          if (s2 !== peg$FAILED) {
            while (s2 !== peg$FAILED) {
              s1.push(s2);
              s2 = peg$parseseparated_part();
            }
          } else {
            s1 = peg$FAILED;
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f4(s1);
          }
          s0 = s1;
        }
        return s0;
      }
      function peg$parseseparated_part() {
        var s0, s1, s2, s3, s4;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parseparbreak();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parseparbreak();
        }
        s2 = peg$parseequals();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseparbreak();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parseparbreak();
          }
          s4 = peg$parseitem_part();
          if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f5(s4);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = [];
          s2 = peg$parseparbreak();
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parseparbreak();
          }
          s2 = peg$parseequals();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f6();
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        }
        return s0;
      }
      function peg$parseitem_part() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parsewhitespace();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parsewhitespace();
        }
        s2 = peg$currPos;
        s3 = [];
        s4 = peg$parsenon_whitespace_non_parbreak_token();
        if (s4 === peg$FAILED) {
          s4 = peg$currPos;
          s5 = peg$parsewhitespace();
          if (s5 === peg$FAILED) {
            s5 = peg$parseparbreak();
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$currPos;
            peg$silentFails++;
            s7 = peg$currPos;
            s8 = [];
            s9 = peg$parsewhitespace();
            if (s9 === peg$FAILED) {
              s9 = peg$parseparbreak();
            }
            while (s9 !== peg$FAILED) {
              s8.push(s9);
              s9 = peg$parsewhitespace();
              if (s9 === peg$FAILED) {
                s9 = peg$parseparbreak();
              }
            }
            s9 = peg$parsenon_whitespace_non_parbreak_token();
            if (s9 !== peg$FAILED) {
              s8 = [s8, s9];
              s7 = s8;
            } else {
              peg$currPos = s7;
              s7 = peg$FAILED;
            }
            peg$silentFails--;
            if (s7 !== peg$FAILED) {
              peg$currPos = s6;
              s6 = void 0;
            } else {
              s6 = peg$FAILED;
            }
            if (s6 !== peg$FAILED) {
              s5 = [s5, s6];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
        }
        if (s4 !== peg$FAILED) {
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parsenon_whitespace_non_parbreak_token();
            if (s4 === peg$FAILED) {
              s4 = peg$currPos;
              s5 = peg$parsewhitespace();
              if (s5 === peg$FAILED) {
                s5 = peg$parseparbreak();
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$currPos;
                peg$silentFails++;
                s7 = peg$currPos;
                s8 = [];
                s9 = peg$parsewhitespace();
                if (s9 === peg$FAILED) {
                  s9 = peg$parseparbreak();
                }
                while (s9 !== peg$FAILED) {
                  s8.push(s9);
                  s9 = peg$parsewhitespace();
                  if (s9 === peg$FAILED) {
                    s9 = peg$parseparbreak();
                  }
                }
                s9 = peg$parsenon_whitespace_non_parbreak_token();
                if (s9 !== peg$FAILED) {
                  s8 = [s8, s9];
                  s7 = s8;
                } else {
                  peg$currPos = s7;
                  s7 = peg$FAILED;
                }
                peg$silentFails--;
                if (s7 !== peg$FAILED) {
                  peg$currPos = s6;
                  s6 = void 0;
                } else {
                  s6 = peg$FAILED;
                }
                if (s6 !== peg$FAILED) {
                  s5 = [s5, s6];
                  s4 = s5;
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            }
          }
        } else {
          s3 = peg$FAILED;
        }
        if (s3 !== peg$FAILED) {
          s2 = input.substring(s2, peg$currPos);
        } else {
          s2 = s3;
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parsewhitespace();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parsewhitespace();
          }
          peg$savedPos = s0;
          s0 = peg$f7(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsetrailing_comment() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parsewhitespace();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parsewhitespace();
        }
        s2 = peg$parsesame_line_comment();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f8(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsecomment_only_line() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$parsewhitespace_or_parbreaks();
        s2 = peg$parseown_line_comment();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f9(s1, s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsetoken() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parsenon_token();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = void 0;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e0);
            }
          }
          if (s3 !== peg$FAILED) {
            s2 = [s2, s3];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          s0 = input.substring(s0, peg$currPos);
        } else {
          s0 = s1;
        }
        return s0;
      }
      function peg$parsenon_whitespace_non_parbreak_token() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parsewhitespace();
        if (s3 === peg$FAILED) {
          s3 = peg$parseparbreak();
        }
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = void 0;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseparen_block();
          if (s3 === peg$FAILED) {
            s3 = peg$parsetoken();
          }
          if (s3 !== peg$FAILED) {
            s2 = [s2, s3];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          s0 = input.substring(s0, peg$currPos);
        } else {
          s0 = s1;
        }
        return s0;
      }
      function peg$parsenon_token() {
        var s0;
        s0 = peg$parseitem_sep();
        if (s0 === peg$FAILED) {
          s0 = peg$parseequals();
          if (s0 === peg$FAILED) {
            s0 = peg$parsetrailing_comment();
            if (s0 === peg$FAILED) {
              s0 = peg$parseown_line_comment();
            }
          }
        }
        return s0;
      }
      function peg$parsewhitespace_or_parbreaks() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parsewhitespace();
        if (s2 === peg$FAILED) {
          s2 = peg$parseparbreak();
        }
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parsewhitespace();
          if (s2 === peg$FAILED) {
            s2 = peg$parseparbreak();
          }
        }
        peg$savedPos = s0;
        s1 = peg$f10(s1);
        s0 = s1;
        return s0;
      }
      function peg$parseparen_block() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8;
        s0 = peg$currPos;
        peg$savedPos = peg$currPos;
        s1 = peg$f11();
        if (s1) {
          s1 = peg$FAILED;
        } else {
          s1 = void 0;
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          s3 = peg$currPos;
          s4 = peg$parseopen_paren();
          if (s4 !== peg$FAILED) {
            s5 = [];
            s6 = peg$currPos;
            s7 = peg$currPos;
            peg$silentFails++;
            s8 = peg$parseclose_paren();
            peg$silentFails--;
            if (s8 === peg$FAILED) {
              s7 = void 0;
            } else {
              peg$currPos = s7;
              s7 = peg$FAILED;
            }
            if (s7 !== peg$FAILED) {
              if (input.length > peg$currPos) {
                s8 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s8 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e0);
                }
              }
              if (s8 !== peg$FAILED) {
                s7 = [s7, s8];
                s6 = s7;
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
            } else {
              peg$currPos = s6;
              s6 = peg$FAILED;
            }
            while (s6 !== peg$FAILED) {
              s5.push(s6);
              s6 = peg$currPos;
              s7 = peg$currPos;
              peg$silentFails++;
              s8 = peg$parseclose_paren();
              peg$silentFails--;
              if (s8 === peg$FAILED) {
                s7 = void 0;
              } else {
                peg$currPos = s7;
                s7 = peg$FAILED;
              }
              if (s7 !== peg$FAILED) {
                if (input.length > peg$currPos) {
                  s8 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s8 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e0);
                  }
                }
                if (s8 !== peg$FAILED) {
                  s7 = [s7, s8];
                  s6 = s7;
                } else {
                  peg$currPos = s6;
                  s6 = peg$FAILED;
                }
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
            }
            s6 = peg$parseclose_paren();
            if (s6 !== peg$FAILED) {
              s4 = [s4, s5, s6];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
          if (s3 !== peg$FAILED) {
            s2 = input.substring(s2, peg$currPos);
          } else {
            s2 = s3;
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsesame_line_comment() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f12(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f13(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseown_line_comment() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f14(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f15(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsewhitespace() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f16(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f17(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseparbreak() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f18(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f19(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseitem_sep() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f20(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f21(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseequals() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f22(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f23(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseopen_paren() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f24(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f25(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseclose_paren() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f26(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f27(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseEOL() {
        var s0, s1;
        s0 = peg$currPos;
        peg$silentFails++;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        peg$silentFails--;
        if (s1 === peg$FAILED) {
          s0 = void 0;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function processItem(leadCell, otherCells) {
        const cells = [leadCell || []];
        for (const x of otherCells) {
          cells.push(x.cell || []);
        }
        return { itemParts: cells };
      }
      if (!options.isWhitespace) {
        try {
          Object.assign(options, {
            isChar: (node, char) => node.type === "string" && node.content === char,
            isComma(node) {
              return node.type === "string" && node.content === ",";
            },
            isEquals(node) {
              return node.type === "string" && node.content === "=";
            },
            isParbreak(node) {
              return node.type === "parbreak";
            },
            isWhitespace(node) {
              return node.type === "whitespace";
            },
            isSameLineComment: (node) => node.type === "comment" && node.sameline,
            isOwnLineComment: (node) => node.type === "comment" && !node.sameline,
            isComment: (node) => node.type === "comment",
            allowParenGroups: true
          });
        } catch (e) {
          console.warn("Error when initializing parser", e);
        }
      }
      peg$result = peg$startRuleFunction();
      if (peg$result !== peg$FAILED && peg$currPos === input.length) {
        return peg$result;
      } else {
        if (peg$result !== peg$FAILED && peg$currPos < input.length) {
          peg$fail(peg$endExpectation());
        }
        throw peg$buildStructuredError(
          peg$maxFailExpected,
          peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
          peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
        );
      }
    }
    return {
      SyntaxError: peg$SyntaxError,
      parse: peg$parse
    };
  }()
);
var macro_substitutions_default = (
  // Generated by Peggy 2.0.1.
  //
  // https://peggyjs.org/
  function() {
    "use strict";
    function peg$subclass(child, parent) {
      function C() {
        this.constructor = child;
      }
      C.prototype = parent.prototype;
      child.prototype = new C();
    }
    function peg$SyntaxError(message, expected, found, location) {
      var self = Error.call(this, message);
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(self, peg$SyntaxError.prototype);
      }
      self.expected = expected;
      self.found = found;
      self.location = location;
      self.name = "SyntaxError";
      return self;
    }
    peg$subclass(peg$SyntaxError, Error);
    function peg$padEnd(str, targetLength, padString) {
      padString = padString || " ";
      if (str.length > targetLength) {
        return str;
      }
      targetLength -= str.length;
      padString += padString.repeat(targetLength);
      return str + padString.slice(0, targetLength);
    }
    peg$SyntaxError.prototype.format = function(sources) {
      var str = "Error: " + this.message;
      if (this.location) {
        var src = null;
        var k;
        for (k = 0; k < sources.length; k++) {
          if (sources[k].source === this.location.source) {
            src = sources[k].text.split(/\r\n|\n|\r/g);
            break;
          }
        }
        var s2 = this.location.start;
        var loc = this.location.source + ":" + s2.line + ":" + s2.column;
        if (src) {
          var e = this.location.end;
          var filler = peg$padEnd("", s2.line.toString().length, " ");
          var line = src[s2.line - 1];
          var last = s2.line === e.line ? e.column : line.length + 1;
          var hatLen = last - s2.column || 1;
          str += "\n --> " + loc + "\n" + filler + " |\n" + s2.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
        } else {
          str += "\n at " + loc;
        }
      }
      return str;
    };
    peg$SyntaxError.buildMessage = function(expected, found) {
      var DESCRIBE_EXPECTATION_FNS = {
        literal: function(expectation) {
          return '"' + literalEscape(expectation.text) + '"';
        },
        class: function(expectation) {
          var escapedParts = expectation.parts.map(function(part) {
            return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
          });
          return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
        },
        any: function() {
          return "any character";
        },
        end: function() {
          return "end of input";
        },
        other: function(expectation) {
          return expectation.description;
        }
      };
      function hex(ch) {
        return ch.charCodeAt(0).toString(16).toUpperCase();
      }
      function literalEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function classEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function describeExpectation(expectation) {
        return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
      }
      function describeExpected(expected2) {
        var descriptions = expected2.map(describeExpectation);
        var i, j;
        descriptions.sort();
        if (descriptions.length > 0) {
          for (i = 1, j = 1; i < descriptions.length; i++) {
            if (descriptions[i - 1] !== descriptions[i]) {
              descriptions[j] = descriptions[i];
              j++;
            }
          }
          descriptions.length = j;
        }
        switch (descriptions.length) {
          case 1:
            return descriptions[0];
          case 2:
            return descriptions[0] + " or " + descriptions[1];
          default:
            return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
        }
      }
      function describeFound(found2) {
        return found2 ? '"' + literalEscape(found2) + '"' : "end of input";
      }
      return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
    };
    function peg$parse(input, options) {
      options = options !== void 0 ? options : {};
      var peg$FAILED = {};
      var peg$source = options.grammarSource;
      var peg$startRuleFunctions = { body: peg$parsebody };
      var peg$startRuleFunction = peg$parsebody;
      var peg$e0 = peg$anyExpectation();
      var peg$f0 = function(e) {
        return [].concat(...e).filter((n) => !!n);
      };
      var peg$f1 = function() {
        return [];
      };
      var peg$f2 = function(tok) {
        return options.isHash(tok);
      };
      var peg$f3 = function(tok) {
        return tok;
      };
      var peg$f4 = function(tok) {
        return options.isNumber(tok);
      };
      var peg$f5 = function(tok) {
        return tok;
      };
      var peg$f6 = function() {
        return { type: "string", content: "#" };
      };
      var peg$f7 = function(num) {
        const split = options.splitNumber(num);
        return [{ type: "hash_number", number: split.number }, split.rest];
      };
      var peg$currPos = 0;
      var peg$savedPos = 0;
      var peg$posDetailsCache = [{ line: 1, column: 1 }];
      var peg$maxFailPos = 0;
      var peg$maxFailExpected = [];
      var peg$silentFails = 0;
      var peg$result;
      if ("startRule" in options) {
        if (!(options.startRule in peg$startRuleFunctions)) {
          throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
        }
        peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
      }
      function text() {
        return input.substring(peg$savedPos, peg$currPos);
      }
      function offset() {
        return peg$savedPos;
      }
      function range() {
        return {
          source: peg$source,
          start: peg$savedPos,
          end: peg$currPos
        };
      }
      function location() {
        return peg$computeLocation(peg$savedPos, peg$currPos);
      }
      function expected(description, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildStructuredError(
          [peg$otherExpectation(description)],
          input.substring(peg$savedPos, peg$currPos),
          location2
        );
      }
      function error(message, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildSimpleError(message, location2);
      }
      function peg$literalExpectation(text2, ignoreCase) {
        return { type: "literal", text: text2, ignoreCase };
      }
      function peg$classExpectation(parts, inverted, ignoreCase) {
        return { type: "class", parts, inverted, ignoreCase };
      }
      function peg$anyExpectation() {
        return { type: "any" };
      }
      function peg$endExpectation() {
        return { type: "end" };
      }
      function peg$otherExpectation(description) {
        return { type: "other", description };
      }
      function peg$computePosDetails(pos) {
        var details = peg$posDetailsCache[pos];
        var p;
        if (details) {
          return details;
        } else {
          p = pos - 1;
          while (!peg$posDetailsCache[p]) {
            p--;
          }
          details = peg$posDetailsCache[p];
          details = {
            line: details.line,
            column: details.column
          };
          while (p < pos) {
            if (input.charCodeAt(p) === 10) {
              details.line++;
              details.column = 1;
            } else {
              details.column++;
            }
            p++;
          }
          peg$posDetailsCache[pos] = details;
          return details;
        }
      }
      function peg$computeLocation(startPos, endPos) {
        var startPosDetails = peg$computePosDetails(startPos);
        var endPosDetails = peg$computePosDetails(endPos);
        return {
          source: peg$source,
          start: {
            offset: startPos,
            line: startPosDetails.line,
            column: startPosDetails.column
          },
          end: {
            offset: endPos,
            line: endPosDetails.line,
            column: endPosDetails.column
          }
        };
      }
      function peg$fail(expected2) {
        if (peg$currPos < peg$maxFailPos) {
          return;
        }
        if (peg$currPos > peg$maxFailPos) {
          peg$maxFailPos = peg$currPos;
          peg$maxFailExpected = [];
        }
        peg$maxFailExpected.push(expected2);
      }
      function peg$buildSimpleError(message, location2) {
        return new peg$SyntaxError(message, null, null, location2);
      }
      function peg$buildStructuredError(expected2, found, location2) {
        return new peg$SyntaxError(
          peg$SyntaxError.buildMessage(expected2, found),
          expected2,
          found,
          location2
        );
      }
      function peg$parsebody() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parsedouble_hash();
        if (s2 === peg$FAILED) {
          s2 = peg$parsehash_number();
          if (s2 === peg$FAILED) {
            if (input.length > peg$currPos) {
              s2 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e0);
              }
            }
          }
        }
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parsedouble_hash();
            if (s2 === peg$FAILED) {
              s2 = peg$parsehash_number();
              if (s2 === peg$FAILED) {
                if (input.length > peg$currPos) {
                  s2 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s2 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e0);
                  }
                }
              }
            }
          }
        } else {
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f0(s1);
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parseEOL();
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f1();
          }
          s0 = s1;
        }
        return s0;
      }
      function peg$parsehash() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f2(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f3(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsenumber() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f4(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f5(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsedouble_hash() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$parsehash();
        if (s1 !== peg$FAILED) {
          s2 = peg$parsehash();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f6();
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsehash_number() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$parsehash();
        if (s1 !== peg$FAILED) {
          s2 = peg$parsenumber();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f7(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseEOL() {
        var s0, s1;
        s0 = peg$currPos;
        peg$silentFails++;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        peg$silentFails--;
        if (s1 === peg$FAILED) {
          s0 = void 0;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      if (!options.isHash) {
        try {
          Object.assign(options, {
            isHash: (node) => node.type === "string" && node.content === "#",
            isNumber: (node) => node.type === "string" && 0 < +node.content.charAt(0),
            splitNumber: (node) => {
              const number = +node.content.charAt(0);
              if (node.content.length > 1) {
                return {
                  number,
                  rest: {
                    type: "string",
                    content: node.content.slice(1)
                  }
                };
              }
              return { number };
            }
          });
        } catch (e) {
          console.warn("Error when initializing parser", e);
        }
      }
      peg$result = peg$startRuleFunction();
      if (peg$result !== peg$FAILED && peg$currPos === input.length) {
        return peg$result;
      } else {
        if (peg$result !== peg$FAILED && peg$currPos < input.length) {
          peg$fail(peg$endExpectation());
        }
        throw peg$buildStructuredError(
          peg$maxFailExpected,
          peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
          peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
        );
      }
    }
    return {
      SyntaxError: peg$SyntaxError,
      parse: peg$parse
    };
  }()
);
var ligatures_default = (
  // Generated by Peggy 2.0.1.
  //
  // https://peggyjs.org/
  function() {
    "use strict";
    function peg$subclass(child, parent) {
      function C() {
        this.constructor = child;
      }
      C.prototype = parent.prototype;
      child.prototype = new C();
    }
    function peg$SyntaxError(message, expected, found, location) {
      var self = Error.call(this, message);
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(self, peg$SyntaxError.prototype);
      }
      self.expected = expected;
      self.found = found;
      self.location = location;
      self.name = "SyntaxError";
      return self;
    }
    peg$subclass(peg$SyntaxError, Error);
    function peg$padEnd(str, targetLength, padString) {
      padString = padString || " ";
      if (str.length > targetLength) {
        return str;
      }
      targetLength -= str.length;
      padString += padString.repeat(targetLength);
      return str + padString.slice(0, targetLength);
    }
    peg$SyntaxError.prototype.format = function(sources) {
      var str = "Error: " + this.message;
      if (this.location) {
        var src = null;
        var k;
        for (k = 0; k < sources.length; k++) {
          if (sources[k].source === this.location.source) {
            src = sources[k].text.split(/\r\n|\n|\r/g);
            break;
          }
        }
        var s2 = this.location.start;
        var loc = this.location.source + ":" + s2.line + ":" + s2.column;
        if (src) {
          var e = this.location.end;
          var filler = peg$padEnd("", s2.line.toString().length, " ");
          var line = src[s2.line - 1];
          var last = s2.line === e.line ? e.column : line.length + 1;
          var hatLen = last - s2.column || 1;
          str += "\n --> " + loc + "\n" + filler + " |\n" + s2.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
        } else {
          str += "\n at " + loc;
        }
      }
      return str;
    };
    peg$SyntaxError.buildMessage = function(expected, found) {
      var DESCRIBE_EXPECTATION_FNS = {
        literal: function(expectation) {
          return '"' + literalEscape(expectation.text) + '"';
        },
        class: function(expectation) {
          var escapedParts = expectation.parts.map(function(part) {
            return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
          });
          return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
        },
        any: function() {
          return "any character";
        },
        end: function() {
          return "end of input";
        },
        other: function(expectation) {
          return expectation.description;
        }
      };
      function hex(ch) {
        return ch.charCodeAt(0).toString(16).toUpperCase();
      }
      function literalEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function classEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function describeExpectation(expectation) {
        return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
      }
      function describeExpected(expected2) {
        var descriptions = expected2.map(describeExpectation);
        var i, j;
        descriptions.sort();
        if (descriptions.length > 0) {
          for (i = 1, j = 1; i < descriptions.length; i++) {
            if (descriptions[i - 1] !== descriptions[i]) {
              descriptions[j] = descriptions[i];
              j++;
            }
          }
          descriptions.length = j;
        }
        switch (descriptions.length) {
          case 1:
            return descriptions[0];
          case 2:
            return descriptions[0] + " or " + descriptions[1];
          default:
            return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
        }
      }
      function describeFound(found2) {
        return found2 ? '"' + literalEscape(found2) + '"' : "end of input";
      }
      return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
    };
    function peg$parse(input, options) {
      options = options !== void 0 ? options : {};
      var peg$FAILED = {};
      var peg$source = options.grammarSource;
      var peg$startRuleFunctions = { body: peg$parsebody };
      var peg$startRuleFunction = peg$parsebody;
      var peg$e0 = peg$anyExpectation();
      var peg$f0 = function(e) {
        return [].concat(...e).filter((n) => !!n);
      };
      var peg$f1 = function() {
        return [];
      };
      var peg$f2 = function(toks) {
        return options.isRecognized(toks);
      };
      var peg$f3 = function(toks) {
        return options.isRecognized(toks);
      };
      var peg$f4 = function(tok1, tok2) {
        const split = options.split(tok2);
        return options.isRecognized([tok1, split[0]]);
      };
      var peg$f5 = function(tok1, tok2) {
        const split = options.split(tok2);
        return [options.isRecognized([tok1, split[0]]), split[1]];
      };
      var peg$f6 = function(tok1, tok2) {
        return options.isRecognized([tok1, tok2]);
      };
      var peg$f7 = function(tok1, tok2) {
        return options.isRecognized([tok1, tok2]);
      };
      var peg$f8 = function(toks) {
        return options.isRecognized(toks);
      };
      var peg$f9 = function(toks) {
        return options.isRecognized(toks);
      };
      var peg$f10 = function(tok) {
        return options.isRecognized([tok]);
      };
      var peg$f11 = function(tok) {
        return options.isRecognized([tok]);
      };
      var peg$f12 = function(tok) {
        return options.isMacro(tok);
      };
      var peg$f13 = function(tok) {
        return tok;
      };
      var peg$f14 = function(tok) {
        return options.isWhitespace(tok);
      };
      var peg$f15 = function(tok) {
        return tok;
      };
      var peg$f16 = function(tok) {
        return options.isSplitable(tok);
      };
      var peg$f17 = function(tok) {
        return tok;
      };
      var peg$currPos = 0;
      var peg$savedPos = 0;
      var peg$posDetailsCache = [{ line: 1, column: 1 }];
      var peg$maxFailPos = 0;
      var peg$maxFailExpected = [];
      var peg$silentFails = 0;
      var peg$result;
      if ("startRule" in options) {
        if (!(options.startRule in peg$startRuleFunctions)) {
          throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
        }
        peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
      }
      function text() {
        return input.substring(peg$savedPos, peg$currPos);
      }
      function offset() {
        return peg$savedPos;
      }
      function range() {
        return {
          source: peg$source,
          start: peg$savedPos,
          end: peg$currPos
        };
      }
      function location() {
        return peg$computeLocation(peg$savedPos, peg$currPos);
      }
      function expected(description, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildStructuredError(
          [peg$otherExpectation(description)],
          input.substring(peg$savedPos, peg$currPos),
          location2
        );
      }
      function error(message, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildSimpleError(message, location2);
      }
      function peg$literalExpectation(text2, ignoreCase) {
        return { type: "literal", text: text2, ignoreCase };
      }
      function peg$classExpectation(parts, inverted, ignoreCase) {
        return { type: "class", parts, inverted, ignoreCase };
      }
      function peg$anyExpectation() {
        return { type: "any" };
      }
      function peg$endExpectation() {
        return { type: "end" };
      }
      function peg$otherExpectation(description) {
        return { type: "other", description };
      }
      function peg$computePosDetails(pos) {
        var details = peg$posDetailsCache[pos];
        var p;
        if (details) {
          return details;
        } else {
          p = pos - 1;
          while (!peg$posDetailsCache[p]) {
            p--;
          }
          details = peg$posDetailsCache[p];
          details = {
            line: details.line,
            column: details.column
          };
          while (p < pos) {
            if (input.charCodeAt(p) === 10) {
              details.line++;
              details.column = 1;
            } else {
              details.column++;
            }
            p++;
          }
          peg$posDetailsCache[pos] = details;
          return details;
        }
      }
      function peg$computeLocation(startPos, endPos) {
        var startPosDetails = peg$computePosDetails(startPos);
        var endPosDetails = peg$computePosDetails(endPos);
        return {
          source: peg$source,
          start: {
            offset: startPos,
            line: startPosDetails.line,
            column: startPosDetails.column
          },
          end: {
            offset: endPos,
            line: endPosDetails.line,
            column: endPosDetails.column
          }
        };
      }
      function peg$fail(expected2) {
        if (peg$currPos < peg$maxFailPos) {
          return;
        }
        if (peg$currPos > peg$maxFailPos) {
          peg$maxFailPos = peg$currPos;
          peg$maxFailExpected = [];
        }
        peg$maxFailExpected.push(expected2);
      }
      function peg$buildSimpleError(message, location2) {
        return new peg$SyntaxError(message, null, null, location2);
      }
      function peg$buildStructuredError(expected2, found, location2) {
        return new peg$SyntaxError(
          peg$SyntaxError.buildMessage(expected2, found),
          expected2,
          found,
          location2
        );
      }
      function peg$parsebody() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parsetriple_ligature();
        if (s2 === peg$FAILED) {
          s2 = peg$parsedouble_ligature();
          if (s2 === peg$FAILED) {
            s2 = peg$parsemono_ligature();
            if (s2 === peg$FAILED) {
              if (input.length > peg$currPos) {
                s2 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e0);
                }
              }
            }
          }
        }
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parsetriple_ligature();
            if (s2 === peg$FAILED) {
              s2 = peg$parsedouble_ligature();
              if (s2 === peg$FAILED) {
                s2 = peg$parsemono_ligature();
                if (s2 === peg$FAILED) {
                  if (input.length > peg$currPos) {
                    s2 = input.charAt(peg$currPos);
                    peg$currPos++;
                  } else {
                    s2 = peg$FAILED;
                    if (peg$silentFails === 0) {
                      peg$fail(peg$e0);
                    }
                  }
                }
              }
            }
          }
        } else {
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f0(s1);
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parseEOL();
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f1();
          }
          s0 = s1;
        }
        return s0;
      }
      function peg$parsetriple_ligature() {
        var s0, s1, s2, s3, s4;
        s0 = peg$currPos;
        s1 = peg$currPos;
        if (input.length > peg$currPos) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s2 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e0);
            }
          }
          if (s3 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e0);
              }
            }
            if (s4 !== peg$FAILED) {
              s2 = [s2, s3, s4];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f2(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f3(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsedouble_ligature() {
        var s0;
        s0 = peg$parsedouble_macro_ligature();
        if (s0 === peg$FAILED) {
          s0 = peg$parsedouble_macro_ligature_extracted();
          if (s0 === peg$FAILED) {
            s0 = peg$parsedouble_char_ligature();
          }
        }
        return s0;
      }
      function peg$parsedouble_macro_ligature_extracted() {
        var s0, s1, s2, s3, s4;
        s0 = peg$currPos;
        s1 = peg$parsemacro();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parsewhitespace();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parsewhitespace();
          }
          s3 = peg$parsesplitable();
          if (s3 !== peg$FAILED) {
            peg$savedPos = peg$currPos;
            s4 = peg$f4(s1, s3);
            if (s4) {
              s4 = void 0;
            } else {
              s4 = peg$FAILED;
            }
            if (s4 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f5(s1, s3);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsedouble_macro_ligature() {
        var s0, s1, s2, s3, s4;
        s0 = peg$currPos;
        s1 = peg$parsemacro();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parsewhitespace();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parsewhitespace();
          }
          if (input.length > peg$currPos) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e0);
            }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = peg$currPos;
            s4 = peg$f6(s1, s3);
            if (s4) {
              s4 = void 0;
            } else {
              s4 = peg$FAILED;
            }
            if (s4 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f7(s1, s3);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsedouble_char_ligature() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$currPos;
        if (input.length > peg$currPos) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s2 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e0);
            }
          }
          if (s3 !== peg$FAILED) {
            s2 = [s2, s3];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f8(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f9(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsemono_ligature() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f10(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f11(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsemacro() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f12(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f13(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsewhitespace() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f14(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f15(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsesplitable() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f16(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f17(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseEOL() {
        var s0, s1;
        s0 = peg$currPos;
        peg$silentFails++;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        peg$silentFails--;
        if (s1 === peg$FAILED) {
          s0 = void 0;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      if (!options.isWhitespace) {
        try {
          Object.assign(options, {
            isMacro: (node) => node.type === "macro",
            isWhitespace: (node) => node.type === "whitespace",
            isRecognized: (nodes) => {
              if (nodes.length == 2 && nodes[0].content === "^" && nodes[1].content === "o") {
                return { type: "string", content: "\xF4" };
              }
              return null;
            },
            isSplitable: (node) => node.type === "string" && node.content.length > 1,
            split: (node) => [
              { type: "string", content: node.content.charAt(0) },
              { type: "string", content: node.content.slice(1) }
            ]
          });
        } catch (e) {
          console.warn("Error when initializing parser", e);
        }
      }
      peg$result = peg$startRuleFunction();
      if (peg$result !== peg$FAILED && peg$currPos === input.length) {
        return peg$result;
      } else {
        if (peg$result !== peg$FAILED && peg$currPos < input.length) {
          peg$fail(peg$endExpectation());
        }
        throw peg$buildStructuredError(
          peg$maxFailExpected,
          peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
          peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
        );
      }
    }
    return {
      SyntaxError: peg$SyntaxError,
      parse: peg$parse
    };
  }()
);
var xcolor_expressions_default = (
  // Generated by Peggy 2.0.1.
  //
  // https://peggyjs.org/
  function() {
    "use strict";
    function peg$subclass(child, parent) {
      function C() {
        this.constructor = child;
      }
      C.prototype = parent.prototype;
      child.prototype = new C();
    }
    function peg$SyntaxError(message, expected, found, location) {
      var self = Error.call(this, message);
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(self, peg$SyntaxError.prototype);
      }
      self.expected = expected;
      self.found = found;
      self.location = location;
      self.name = "SyntaxError";
      return self;
    }
    peg$subclass(peg$SyntaxError, Error);
    function peg$padEnd(str, targetLength, padString) {
      padString = padString || " ";
      if (str.length > targetLength) {
        return str;
      }
      targetLength -= str.length;
      padString += padString.repeat(targetLength);
      return str + padString.slice(0, targetLength);
    }
    peg$SyntaxError.prototype.format = function(sources) {
      var str = "Error: " + this.message;
      if (this.location) {
        var src = null;
        var k;
        for (k = 0; k < sources.length; k++) {
          if (sources[k].source === this.location.source) {
            src = sources[k].text.split(/\r\n|\n|\r/g);
            break;
          }
        }
        var s2 = this.location.start;
        var loc = this.location.source + ":" + s2.line + ":" + s2.column;
        if (src) {
          var e = this.location.end;
          var filler = peg$padEnd("", s2.line.toString().length, " ");
          var line = src[s2.line - 1];
          var last = s2.line === e.line ? e.column : line.length + 1;
          var hatLen = last - s2.column || 1;
          str += "\n --> " + loc + "\n" + filler + " |\n" + s2.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
        } else {
          str += "\n at " + loc;
        }
      }
      return str;
    };
    peg$SyntaxError.buildMessage = function(expected, found) {
      var DESCRIBE_EXPECTATION_FNS = {
        literal: function(expectation) {
          return '"' + literalEscape(expectation.text) + '"';
        },
        class: function(expectation) {
          var escapedParts = expectation.parts.map(function(part) {
            return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
          });
          return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
        },
        any: function() {
          return "any character";
        },
        end: function() {
          return "end of input";
        },
        other: function(expectation) {
          return expectation.description;
        }
      };
      function hex(ch) {
        return ch.charCodeAt(0).toString(16).toUpperCase();
      }
      function literalEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function classEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function describeExpectation(expectation) {
        return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
      }
      function describeExpected(expected2) {
        var descriptions = expected2.map(describeExpectation);
        var i, j;
        descriptions.sort();
        if (descriptions.length > 0) {
          for (i = 1, j = 1; i < descriptions.length; i++) {
            if (descriptions[i - 1] !== descriptions[i]) {
              descriptions[j] = descriptions[i];
              j++;
            }
          }
          descriptions.length = j;
        }
        switch (descriptions.length) {
          case 1:
            return descriptions[0];
          case 2:
            return descriptions[0] + " or " + descriptions[1];
          default:
            return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
        }
      }
      function describeFound(found2) {
        return found2 ? '"' + literalEscape(found2) + '"' : "end of input";
      }
      return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
    };
    function peg$parse(input, options) {
      options = options !== void 0 ? options : {};
      var peg$FAILED = {};
      var peg$source = options.grammarSource;
      var peg$startRuleFunctions = { start: peg$parsestart };
      var peg$startRuleFunction = peg$parsestart;
      var peg$c0 = ";";
      var peg$c1 = ",";
      var peg$c2 = ":";
      var peg$c3 = "/";
      var peg$c4 = ">";
      var peg$c5 = "!";
      var peg$c6 = ".";
      var peg$c7 = "!![";
      var peg$c8 = "]";
      var peg$c9 = "!!";
      var peg$c10 = "+";
      var peg$c11 = "-";
      var peg$r0 = /^[a-zA-Z0-9]/;
      var peg$r1 = /^[0-9]/;
      var peg$r2 = /^[ \t\n\r]/;
      var peg$r3 = /^[0-9a-fA-F]/;
      var peg$e0 = peg$anyExpectation();
      var peg$e1 = peg$literalExpectation(";", false);
      var peg$e2 = peg$literalExpectation(",", false);
      var peg$e3 = peg$otherExpectation("model list");
      var peg$e4 = peg$literalExpectation(":", false);
      var peg$e5 = peg$literalExpectation("/", false);
      var peg$e6 = peg$otherExpectation("model");
      var peg$e7 = peg$otherExpectation("color spec list");
      var peg$e8 = peg$otherExpectation("color spec");
      var peg$e9 = peg$otherExpectation("color");
      var peg$e10 = peg$otherExpectation("function expression");
      var peg$e11 = peg$literalExpectation(">", false);
      var peg$e12 = peg$otherExpectation("function");
      var peg$e13 = peg$otherExpectation("extended expression");
      var peg$e14 = peg$otherExpectation("core model");
      var peg$e15 = peg$otherExpectation("expr");
      var peg$e16 = peg$literalExpectation("!", false);
      var peg$e17 = peg$otherExpectation("mix expr");
      var peg$e18 = peg$otherExpectation("name");
      var peg$e19 = peg$literalExpectation(".", false);
      var peg$e20 = peg$classExpectation([["a", "z"], ["A", "Z"], ["0", "9"]], false, false);
      var peg$e21 = peg$otherExpectation("postfix");
      var peg$e22 = peg$literalExpectation("!![", false);
      var peg$e23 = peg$literalExpectation("]", false);
      var peg$e24 = peg$literalExpectation("!!", false);
      var peg$e25 = peg$otherExpectation("prefix");
      var peg$e26 = peg$otherExpectation("plus");
      var peg$e27 = peg$literalExpectation("+", false);
      var peg$e28 = peg$otherExpectation("minus");
      var peg$e29 = peg$literalExpectation("-", false);
      var peg$e30 = peg$otherExpectation("num");
      var peg$e31 = peg$classExpectation([["0", "9"]], false, false);
      var peg$e32 = peg$otherExpectation("positive float");
      var peg$e33 = peg$otherExpectation("divisor");
      var peg$e34 = peg$otherExpectation("int");
      var peg$e35 = peg$otherExpectation("whitespace");
      var peg$e36 = peg$classExpectation([" ", "	", "\n", "\r"], false, false);
      var peg$e37 = peg$classExpectation([["0", "9"], ["a", "f"], ["A", "F"]], false, false);
      var peg$f0 = function(m) {
        return m;
      };
      var peg$f1 = function(m) {
        return m;
      };
      var peg$f2 = function(m) {
        return m;
      };
      var peg$f3 = function(m) {
        return m;
      };
      var peg$f4 = function(m) {
        return m;
      };
      var peg$f5 = function(a) {
        return { type: "invalid_spec", content: a };
      };
      var peg$f6 = function(f, c) {
        return c;
      };
      var peg$f7 = function(f, r) {
        return { type: "color_set", content: [f].concat(r) };
      };
      var peg$f8 = function(n, s2) {
        return { type: "color_set_item", name: n, spec_list: s2 };
      };
      var peg$f9 = function(c, m) {
        return { type: "model_list", contents: m, core_model: c };
      };
      var peg$f10 = function(m) {
        return { type: "model_list", contents: m, core_model: null };
      };
      var peg$f11 = function(m, a) {
        return a;
      };
      var peg$f12 = function(m, r) {
        return [m].concat(r);
      };
      var peg$f13 = function(s2, a) {
        return a;
      };
      var peg$f14 = function(s2, r) {
        return { type: "spec_list", content: [s2].concat(r) };
      };
      var peg$f15 = function(c) {
        return { type: "hex_spec", content: [c] };
      };
      var peg$f16 = function(c, d) {
        return d;
      };
      var peg$f17 = function(c, d) {
        return d;
      };
      var peg$f18 = function(c, r) {
        return { type: "num_spec", content: r ? [c].concat(r) : [c] };
      };
      var peg$f19 = function(c, fs) {
        return { type: "color", color: c, functions: fs };
      };
      var peg$f20 = function(f, n) {
        return n;
      };
      var peg$f21 = function(f, args) {
        return { type: "function", name: f, args };
      };
      var peg$f22 = function(core, d, e, es) {
        return {
          type: "extended_expr",
          core_model: core,
          div: d,
          expressions: [e].concat(es)
        };
      };
      var peg$f23 = function(core, e, es) {
        return {
          type: "extended_expr",
          core_model: core,
          div: null,
          expressions: [e].concat(es)
        };
      };
      var peg$f24 = function(e, d) {
        return { type: "weighted_expr", color: e, weight: d };
      };
      var peg$f25 = function(e) {
        return e;
      };
      var peg$f26 = function(p, n, e, po) {
        return {
          type: "expr",
          prefix: p,
          name: n,
          mix_expr: e,
          postfix: po
        };
      };
      var peg$f27 = function(p, n) {
        return { type: "complete_mix", mix_percent: p, name: n };
      };
      var peg$f28 = function(p) {
        return { type: "partial_mix", mix_percent: p };
      };
      var peg$f29 = function(c, p) {
        return c.concat(p || []);
      };
      var peg$f30 = function(n) {
        return { type: "postfix", num: n };
      };
      var peg$f31 = function(p) {
        return { type: "postfix", plusses: p };
      };
      var peg$f32 = function(n) {
        return parseInt(n, 10);
      };
      var peg$f33 = function(n) {
        return parseFloat(n);
      };
      var peg$f34 = function(n) {
        return n;
      };
      var peg$f35 = function(n) {
        return -n;
      };
      var peg$f36 = function(m, n) {
        return m ? -n : n;
      };
      var peg$f37 = function(h) {
        return h.toUpperCase();
      };
      var peg$currPos = 0;
      var peg$savedPos = 0;
      var peg$posDetailsCache = [{ line: 1, column: 1 }];
      var peg$maxFailPos = 0;
      var peg$maxFailExpected = [];
      var peg$silentFails = 0;
      var peg$result;
      if ("startRule" in options) {
        if (!(options.startRule in peg$startRuleFunctions)) {
          throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
        }
        peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
      }
      function text() {
        return input.substring(peg$savedPos, peg$currPos);
      }
      function offset() {
        return peg$savedPos;
      }
      function range() {
        return {
          source: peg$source,
          start: peg$savedPos,
          end: peg$currPos
        };
      }
      function location() {
        return peg$computeLocation(peg$savedPos, peg$currPos);
      }
      function expected(description, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildStructuredError(
          [peg$otherExpectation(description)],
          input.substring(peg$savedPos, peg$currPos),
          location2
        );
      }
      function error(message, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildSimpleError(message, location2);
      }
      function peg$literalExpectation(text2, ignoreCase) {
        return { type: "literal", text: text2, ignoreCase };
      }
      function peg$classExpectation(parts, inverted, ignoreCase) {
        return { type: "class", parts, inverted, ignoreCase };
      }
      function peg$anyExpectation() {
        return { type: "any" };
      }
      function peg$endExpectation() {
        return { type: "end" };
      }
      function peg$otherExpectation(description) {
        return { type: "other", description };
      }
      function peg$computePosDetails(pos) {
        var details = peg$posDetailsCache[pos];
        var p;
        if (details) {
          return details;
        } else {
          p = pos - 1;
          while (!peg$posDetailsCache[p]) {
            p--;
          }
          details = peg$posDetailsCache[p];
          details = {
            line: details.line,
            column: details.column
          };
          while (p < pos) {
            if (input.charCodeAt(p) === 10) {
              details.line++;
              details.column = 1;
            } else {
              details.column++;
            }
            p++;
          }
          peg$posDetailsCache[pos] = details;
          return details;
        }
      }
      function peg$computeLocation(startPos, endPos) {
        var startPosDetails = peg$computePosDetails(startPos);
        var endPosDetails = peg$computePosDetails(endPos);
        return {
          source: peg$source,
          start: {
            offset: startPos,
            line: startPosDetails.line,
            column: startPosDetails.column
          },
          end: {
            offset: endPos,
            line: endPosDetails.line,
            column: endPosDetails.column
          }
        };
      }
      function peg$fail(expected2) {
        if (peg$currPos < peg$maxFailPos) {
          return;
        }
        if (peg$currPos > peg$maxFailPos) {
          peg$maxFailPos = peg$currPos;
          peg$maxFailExpected = [];
        }
        peg$maxFailExpected.push(expected2);
      }
      function peg$buildSimpleError(message, location2) {
        return new peg$SyntaxError(message, null, null, location2);
      }
      function peg$buildStructuredError(expected2, found, location2) {
        return new peg$SyntaxError(
          peg$SyntaxError.buildMessage(expected2, found),
          expected2,
          found,
          location2
        );
      }
      function peg$parsestart() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$parsespec();
        if (s1 !== peg$FAILED) {
          s2 = peg$parseEOL();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f0(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parsespec_list();
          if (s1 !== peg$FAILED) {
            s2 = peg$parseEOL();
            if (s2 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f1(s1);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parsecolor();
            if (s1 !== peg$FAILED) {
              s2 = peg$parseEOL();
              if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f2(s1);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = peg$parsemodel_list();
              if (s1 !== peg$FAILED) {
                s2 = peg$parseEOL();
                if (s2 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s0 = peg$f3(s1);
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                s1 = peg$parsecolor_set_spec();
                if (s1 !== peg$FAILED) {
                  s2 = peg$parseEOL();
                  if (s2 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s0 = peg$f4(s1);
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  s1 = peg$currPos;
                  s2 = [];
                  if (input.length > peg$currPos) {
                    s3 = input.charAt(peg$currPos);
                    peg$currPos++;
                  } else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) {
                      peg$fail(peg$e0);
                    }
                  }
                  while (s3 !== peg$FAILED) {
                    s2.push(s3);
                    if (input.length > peg$currPos) {
                      s3 = input.charAt(peg$currPos);
                      peg$currPos++;
                    } else {
                      s3 = peg$FAILED;
                      if (peg$silentFails === 0) {
                        peg$fail(peg$e0);
                      }
                    }
                  }
                  s1 = input.substring(s1, peg$currPos);
                  peg$savedPos = s0;
                  s1 = peg$f5(s1);
                  s0 = s1;
                }
              }
            }
          }
        }
        return s0;
      }
      function peg$parsecolor_set_spec() {
        var s0, s1, s2, s3, s4, s5;
        s0 = peg$currPos;
        s1 = peg$parsecolor_set_item();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 59) {
            s4 = peg$c0;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e1);
            }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parsecolor_set_item();
            if (s5 !== peg$FAILED) {
              peg$savedPos = s3;
              s3 = peg$f6(s1, s5);
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 59) {
              s4 = peg$c0;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e1);
              }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parsecolor_set_item();
              if (s5 !== peg$FAILED) {
                peg$savedPos = s3;
                s3 = peg$f6(s1, s5);
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          }
          peg$savedPos = s0;
          s0 = peg$f7(s1, s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsecolor_set_item() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$parsename();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s2 = peg$c1;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e2);
            }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parsespec_list();
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f8(s1, s3);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsemodel_list() {
        var s0, s1, s2, s3;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$parsecore_model();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 58) {
            s2 = peg$c2;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e4);
            }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parsemodel_list_tail();
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f9(s1, s3);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parsemodel_list_tail();
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f10(s1);
          }
          s0 = s1;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        return s0;
      }
      function peg$parsemodel_list_tail() {
        var s0, s1, s2, s3, s4, s5;
        s0 = peg$currPos;
        s1 = peg$parsemodel();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 47) {
            s4 = peg$c3;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e5);
            }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parsemodel();
            if (s5 !== peg$FAILED) {
              peg$savedPos = s3;
              s3 = peg$f11(s1, s5);
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 47) {
              s4 = peg$c3;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e5);
              }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parsemodel();
              if (s5 !== peg$FAILED) {
                peg$savedPos = s3;
                s3 = peg$f11(s1, s5);
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          }
          peg$savedPos = s0;
          s0 = peg$f12(s1, s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsemodel() {
        var s0, s1;
        peg$silentFails++;
        s0 = peg$parsecore_model();
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e6);
          }
        }
        return s0;
      }
      function peg$parsespec_list() {
        var s0, s1, s2, s3, s4, s5;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$parsespec();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 47) {
            s4 = peg$c3;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e5);
            }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parsespec();
            if (s5 !== peg$FAILED) {
              peg$savedPos = s3;
              s3 = peg$f13(s1, s5);
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 47) {
              s4 = peg$c3;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e5);
              }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parsespec();
              if (s5 !== peg$FAILED) {
                peg$savedPos = s3;
                s3 = peg$f13(s1, s5);
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          }
          peg$savedPos = s0;
          s0 = peg$f14(s1, s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e7);
          }
        }
        return s0;
      }
      function peg$parsespec() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = peg$currPos;
        s3 = peg$parsehex();
        if (s3 !== peg$FAILED) {
          s4 = peg$parsehex();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsehex();
            if (s5 !== peg$FAILED) {
              s6 = peg$parsehex();
              if (s6 !== peg$FAILED) {
                s7 = peg$parsehex();
                if (s7 !== peg$FAILED) {
                  s8 = peg$parsehex();
                  if (s8 !== peg$FAILED) {
                    s3 = [s3, s4, s5, s6, s7, s8];
                    s2 = s3;
                  } else {
                    peg$currPos = s2;
                    s2 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s2;
                  s2 = peg$FAILED;
                }
              } else {
                peg$currPos = s2;
                s2 = peg$FAILED;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          s1 = input.substring(s1, peg$currPos);
        } else {
          s1 = s2;
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f15(s1);
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parsedec();
          if (s1 !== peg$FAILED) {
            s2 = [];
            s3 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 44) {
              s4 = peg$c1;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e2);
              }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parsedec();
              if (s5 !== peg$FAILED) {
                peg$savedPos = s3;
                s3 = peg$f16(s1, s5);
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
            if (s3 !== peg$FAILED) {
              while (s3 !== peg$FAILED) {
                s2.push(s3);
                s3 = peg$currPos;
                if (input.charCodeAt(peg$currPos) === 44) {
                  s4 = peg$c1;
                  peg$currPos++;
                } else {
                  s4 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e2);
                  }
                }
                if (s4 !== peg$FAILED) {
                  s5 = peg$parsedec();
                  if (s5 !== peg$FAILED) {
                    peg$savedPos = s3;
                    s3 = peg$f16(s1, s5);
                  } else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              }
            } else {
              s2 = peg$FAILED;
            }
            if (s2 === peg$FAILED) {
              s2 = [];
              s3 = peg$currPos;
              s4 = peg$parsesp();
              if (s4 !== peg$FAILED) {
                s5 = peg$parsedec();
                if (s5 !== peg$FAILED) {
                  peg$savedPos = s3;
                  s3 = peg$f17(s1, s5);
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
              if (s3 !== peg$FAILED) {
                while (s3 !== peg$FAILED) {
                  s2.push(s3);
                  s3 = peg$currPos;
                  s4 = peg$parsesp();
                  if (s4 !== peg$FAILED) {
                    s5 = peg$parsedec();
                    if (s5 !== peg$FAILED) {
                      peg$savedPos = s3;
                      s3 = peg$f17(s1, s5);
                    } else {
                      peg$currPos = s3;
                      s3 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                  }
                }
              } else {
                s2 = peg$FAILED;
              }
            }
            if (s2 === peg$FAILED) {
              s2 = null;
            }
            peg$savedPos = s0;
            s0 = peg$f18(s1, s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e8);
          }
        }
        return s0;
      }
      function peg$parsecolor() {
        var s0, s1, s2, s3;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$parsecolor_expr();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parsefunc_expr();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parsefunc_expr();
          }
          peg$savedPos = s0;
          s0 = peg$f19(s1, s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e9);
          }
        }
        return s0;
      }
      function peg$parsecolor_expr() {
        var s0;
        s0 = peg$parseext_expr();
        if (s0 === peg$FAILED) {
          s0 = peg$parseexpr();
          if (s0 === peg$FAILED) {
            s0 = peg$parsename();
          }
        }
        return s0;
      }
      function peg$parsefunc_expr() {
        var s0, s1, s2, s3, s4, s5, s6;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 62) {
          s1 = peg$c4;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e11);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsefunction();
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 44) {
              s5 = peg$c1;
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e2);
              }
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parseint();
              if (s6 !== peg$FAILED) {
                peg$savedPos = s4;
                s4 = peg$f20(s2, s6);
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$currPos;
              if (input.charCodeAt(peg$currPos) === 44) {
                s5 = peg$c1;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e2);
                }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parseint();
                if (s6 !== peg$FAILED) {
                  peg$savedPos = s4;
                  s4 = peg$f20(s2, s6);
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            }
            peg$savedPos = s0;
            s0 = peg$f21(s2, s3);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e10);
          }
        }
        return s0;
      }
      function peg$parsefunction() {
        var s0, s1;
        peg$silentFails++;
        s0 = peg$parsename();
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e12);
          }
        }
        return s0;
      }
      function peg$parseext_expr() {
        var s0, s1, s2, s3, s4, s5, s6, s7;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$parsecore_model();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s2 = peg$c1;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e2);
            }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parsediv();
            if (s3 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 58) {
                s4 = peg$c2;
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e4);
                }
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parseweighted_expr();
                if (s5 !== peg$FAILED) {
                  s6 = [];
                  s7 = peg$parseadditional_weighted_expr();
                  while (s7 !== peg$FAILED) {
                    s6.push(s7);
                    s7 = peg$parseadditional_weighted_expr();
                  }
                  peg$savedPos = s0;
                  s0 = peg$f22(s1, s3, s5, s6);
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parsecore_model();
          if (s1 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 58) {
              s2 = peg$c2;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e4);
              }
            }
            if (s2 !== peg$FAILED) {
              s3 = peg$parseweighted_expr();
              if (s3 !== peg$FAILED) {
                s4 = [];
                s5 = peg$parseadditional_weighted_expr();
                while (s5 !== peg$FAILED) {
                  s4.push(s5);
                  s5 = peg$parseadditional_weighted_expr();
                }
                peg$savedPos = s0;
                s0 = peg$f23(s1, s3, s4);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e13);
          }
        }
        return s0;
      }
      function peg$parseweighted_expr() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$parseexpr();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s2 = peg$c1;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e2);
            }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parsedec();
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f24(s1, s3);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseadditional_weighted_expr() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 59) {
          s1 = peg$c0;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e1);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseweighted_expr();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f25(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsecore_model() {
        var s0, s1;
        peg$silentFails++;
        s0 = peg$parsename();
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e14);
          }
        }
        return s0;
      }
      function peg$parseexpr() {
        var s0, s1, s2, s3, s4;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$parseprefix();
        s2 = peg$parsename();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsemix_expr();
          s4 = peg$parsepostfix();
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          peg$savedPos = s0;
          s0 = peg$f26(s1, s2, s3, s4);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e15);
          }
        }
        return s0;
      }
      function peg$parsecomplete_mix() {
        var s0, s1, s2, s3, s4;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 33) {
          s1 = peg$c5;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e16);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsepct();
          if (s2 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 33) {
              s3 = peg$c5;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e16);
              }
            }
            if (s3 !== peg$FAILED) {
              s4 = peg$parsename();
              if (s4 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f27(s2, s4);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsepartial_mix() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 33) {
          s1 = peg$c5;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e16);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsepct();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f28(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsemix_expr() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parsecomplete_mix();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parsecomplete_mix();
        }
        s2 = peg$parsepartial_mix();
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        peg$savedPos = s0;
        s0 = peg$f29(s1, s2);
        peg$silentFails--;
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e17);
        }
        return s0;
      }
      function peg$parsename() {
        var s0, s1, s2;
        peg$silentFails++;
        if (input.charCodeAt(peg$currPos) === 46) {
          s0 = peg$c6;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e19);
          }
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = [];
          if (peg$r0.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e20);
            }
          }
          if (s2 !== peg$FAILED) {
            while (s2 !== peg$FAILED) {
              s1.push(s2);
              if (peg$r0.test(input.charAt(peg$currPos))) {
                s2 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e20);
                }
              }
            }
          } else {
            s1 = peg$FAILED;
          }
          if (s1 !== peg$FAILED) {
            s0 = input.substring(s0, peg$currPos);
          } else {
            s0 = s1;
          }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e18);
          }
        }
        return s0;
      }
      function peg$parsepostfix() {
        var s0, s1, s2, s3, s4;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 3) === peg$c7) {
          s1 = peg$c7;
          peg$currPos += 3;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e22);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsenum();
          if (s2 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 93) {
              s3 = peg$c8;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e23);
              }
            }
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f30(s2);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 2) === peg$c9) {
            s1 = peg$c9;
            peg$currPos += 2;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e24);
            }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$currPos;
            s3 = [];
            s4 = peg$parseplus();
            if (s4 !== peg$FAILED) {
              while (s4 !== peg$FAILED) {
                s3.push(s4);
                s4 = peg$parseplus();
              }
            } else {
              s3 = peg$FAILED;
            }
            if (s3 !== peg$FAILED) {
              s2 = input.substring(s2, peg$currPos);
            } else {
              s2 = s3;
            }
            if (s2 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f31(s2);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e21);
          }
        }
        return s0;
      }
      function peg$parseprefix() {
        var s0, s1;
        peg$silentFails++;
        s0 = peg$parseminus();
        if (s0 === peg$FAILED) {
          s0 = null;
        }
        peg$silentFails--;
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e25);
        }
        return s0;
      }
      function peg$parseplus() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = [];
        if (input.charCodeAt(peg$currPos) === 43) {
          s2 = peg$c10;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e27);
          }
        }
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            if (input.charCodeAt(peg$currPos) === 43) {
              s2 = peg$c10;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e27);
              }
            }
          }
        } else {
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          s0 = input.substring(s0, peg$currPos);
        } else {
          s0 = s1;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e26);
          }
        }
        return s0;
      }
      function peg$parseminus() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = [];
        if (input.charCodeAt(peg$currPos) === 45) {
          s2 = peg$c11;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e29);
          }
        }
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            if (input.charCodeAt(peg$currPos) === 45) {
              s2 = peg$c11;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e29);
              }
            }
          }
        } else {
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          s0 = input.substring(s0, peg$currPos);
        } else {
          s0 = s1;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e28);
          }
        }
        return s0;
      }
      function peg$parsenum() {
        var s0, s1, s2, s3;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = [];
        if (peg$r1.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e31);
          }
        }
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            if (peg$r1.test(input.charAt(peg$currPos))) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e31);
              }
            }
          }
        } else {
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          s1 = input.substring(s1, peg$currPos);
        } else {
          s1 = s2;
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f32(s1);
        }
        s0 = s1;
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e30);
          }
        }
        return s0;
      }
      function peg$parsepct() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = peg$currPos;
        s3 = peg$currPos;
        s4 = [];
        if (peg$r1.test(input.charAt(peg$currPos))) {
          s5 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e31);
          }
        }
        if (s5 !== peg$FAILED) {
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            if (peg$r1.test(input.charAt(peg$currPos))) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e31);
              }
            }
          }
        } else {
          s4 = peg$FAILED;
        }
        if (s4 !== peg$FAILED) {
          s3 = input.substring(s3, peg$currPos);
        } else {
          s3 = s4;
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$currPos;
          s5 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 46) {
            s6 = peg$c6;
            peg$currPos++;
          } else {
            s6 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e19);
            }
          }
          if (s6 !== peg$FAILED) {
            s7 = peg$currPos;
            s8 = [];
            if (peg$r1.test(input.charAt(peg$currPos))) {
              s9 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s9 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e31);
              }
            }
            while (s9 !== peg$FAILED) {
              s8.push(s9);
              if (peg$r1.test(input.charAt(peg$currPos))) {
                s9 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s9 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e31);
                }
              }
            }
            s7 = input.substring(s7, peg$currPos);
            s6 = [s6, s7];
            s5 = s6;
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          if (s5 === peg$FAILED) {
            s5 = null;
          }
          s4 = input.substring(s4, peg$currPos);
          s3 = [s3, s4];
          s2 = s3;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          s1 = input.substring(s1, peg$currPos);
        } else {
          s1 = s2;
        }
        if (s1 === peg$FAILED) {
          s1 = peg$currPos;
          s2 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 46) {
            s3 = peg$c6;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e19);
            }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$currPos;
            s5 = [];
            if (peg$r1.test(input.charAt(peg$currPos))) {
              s6 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e31);
              }
            }
            if (s6 !== peg$FAILED) {
              while (s6 !== peg$FAILED) {
                s5.push(s6);
                if (peg$r1.test(input.charAt(peg$currPos))) {
                  s6 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e31);
                  }
                }
              }
            } else {
              s5 = peg$FAILED;
            }
            if (s5 !== peg$FAILED) {
              s4 = input.substring(s4, peg$currPos);
            } else {
              s4 = s5;
            }
            if (s4 !== peg$FAILED) {
              s3 = [s3, s4];
              s2 = s3;
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s1 = input.substring(s1, peg$currPos);
          } else {
            s1 = s2;
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f33(s1);
        }
        s0 = s1;
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e32);
          }
        }
        return s0;
      }
      function peg$parsediv() {
        var s0, s1;
        peg$silentFails++;
        s0 = peg$parsepct();
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e33);
          }
        }
        return s0;
      }
      function peg$parsedec() {
        var s0, s1, s2;
        s0 = peg$parsepct();
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 43) {
            s1 = peg$c10;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e27);
            }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parsepct();
            if (s2 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f34(s2);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 45) {
              s1 = peg$c11;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e29);
              }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parsepct();
              if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f35(s2);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          }
        }
        return s0;
      }
      function peg$parseint() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$parseminus();
        if (s1 === peg$FAILED) {
          s1 = null;
        }
        s2 = peg$parsenum();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f36(s1, s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e34);
          }
        }
        return s0;
      }
      function peg$parse_() {
        var s0, s1;
        peg$silentFails++;
        s0 = [];
        if (peg$r2.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e36);
          }
        }
        while (s1 !== peg$FAILED) {
          s0.push(s1);
          if (peg$r2.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e36);
            }
          }
        }
        peg$silentFails--;
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e35);
        }
        return s0;
      }
      function peg$parsesp() {
        var s0, s1;
        s0 = [];
        if (peg$r2.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e36);
          }
        }
        if (s1 !== peg$FAILED) {
          while (s1 !== peg$FAILED) {
            s0.push(s1);
            if (peg$r2.test(input.charAt(peg$currPos))) {
              s1 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e36);
              }
            }
          }
        } else {
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsehex() {
        var s0, s1;
        s0 = peg$currPos;
        if (peg$r3.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e37);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f37(s1);
        }
        s0 = s1;
        return s0;
      }
      function peg$parseEOL() {
        var s0, s1;
        s0 = peg$currPos;
        peg$silentFails++;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        peg$silentFails--;
        if (s1 === peg$FAILED) {
          s0 = void 0;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      peg$result = peg$startRuleFunction();
      if (peg$result !== peg$FAILED && peg$currPos === input.length) {
        return peg$result;
      } else {
        if (peg$result !== peg$FAILED && peg$currPos < input.length) {
          peg$fail(peg$endExpectation());
        }
        throw peg$buildStructuredError(
          peg$maxFailExpected,
          peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
          peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
        );
      }
    }
    return {
      SyntaxError: peg$SyntaxError,
      parse: peg$parse
    };
  }()
);
var tabular_spec_default = (
  // Generated by Peggy 2.0.1.
  //
  // https://peggyjs.org/
  function() {
    "use strict";
    function peg$subclass(child, parent) {
      function C() {
        this.constructor = child;
      }
      C.prototype = parent.prototype;
      child.prototype = new C();
    }
    function peg$SyntaxError(message, expected, found, location) {
      var self = Error.call(this, message);
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(self, peg$SyntaxError.prototype);
      }
      self.expected = expected;
      self.found = found;
      self.location = location;
      self.name = "SyntaxError";
      return self;
    }
    peg$subclass(peg$SyntaxError, Error);
    function peg$padEnd(str, targetLength, padString) {
      padString = padString || " ";
      if (str.length > targetLength) {
        return str;
      }
      targetLength -= str.length;
      padString += padString.repeat(targetLength);
      return str + padString.slice(0, targetLength);
    }
    peg$SyntaxError.prototype.format = function(sources) {
      var str = "Error: " + this.message;
      if (this.location) {
        var src = null;
        var k;
        for (k = 0; k < sources.length; k++) {
          if (sources[k].source === this.location.source) {
            src = sources[k].text.split(/\r\n|\n|\r/g);
            break;
          }
        }
        var s2 = this.location.start;
        var loc = this.location.source + ":" + s2.line + ":" + s2.column;
        if (src) {
          var e = this.location.end;
          var filler = peg$padEnd("", s2.line.toString().length, " ");
          var line = src[s2.line - 1];
          var last = s2.line === e.line ? e.column : line.length + 1;
          var hatLen = last - s2.column || 1;
          str += "\n --> " + loc + "\n" + filler + " |\n" + s2.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
        } else {
          str += "\n at " + loc;
        }
      }
      return str;
    };
    peg$SyntaxError.buildMessage = function(expected, found) {
      var DESCRIBE_EXPECTATION_FNS = {
        literal: function(expectation) {
          return '"' + literalEscape(expectation.text) + '"';
        },
        class: function(expectation) {
          var escapedParts = expectation.parts.map(function(part) {
            return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
          });
          return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
        },
        any: function() {
          return "any character";
        },
        end: function() {
          return "end of input";
        },
        other: function(expectation) {
          return expectation.description;
        }
      };
      function hex(ch) {
        return ch.charCodeAt(0).toString(16).toUpperCase();
      }
      function literalEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function classEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function describeExpectation(expectation) {
        return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
      }
      function describeExpected(expected2) {
        var descriptions = expected2.map(describeExpectation);
        var i, j;
        descriptions.sort();
        if (descriptions.length > 0) {
          for (i = 1, j = 1; i < descriptions.length; i++) {
            if (descriptions[i - 1] !== descriptions[i]) {
              descriptions[j] = descriptions[i];
              j++;
            }
          }
          descriptions.length = j;
        }
        switch (descriptions.length) {
          case 1:
            return descriptions[0];
          case 2:
            return descriptions[0] + " or " + descriptions[1];
          default:
            return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
        }
      }
      function describeFound(found2) {
        return found2 ? '"' + literalEscape(found2) + '"' : "end of input";
      }
      return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
    };
    function peg$parse(input, options) {
      options = options !== void 0 ? options : {};
      var peg$FAILED = {};
      var peg$source = options.grammarSource;
      var peg$startRuleFunctions = { body: peg$parsebody };
      var peg$startRuleFunction = peg$parsebody;
      var peg$e0 = peg$otherExpectation("decl_start");
      var peg$e1 = peg$otherExpectation("decl_end");
      var peg$e2 = peg$otherExpectation("vert");
      var peg$e3 = peg$anyExpectation();
      var peg$e4 = peg$otherExpectation("l");
      var peg$e5 = peg$otherExpectation("r");
      var peg$e6 = peg$otherExpectation("c");
      var peg$e7 = peg$otherExpectation("p");
      var peg$e8 = peg$otherExpectation("m");
      var peg$e9 = peg$otherExpectation("b");
      var peg$e10 = peg$otherExpectation("w");
      var peg$e11 = peg$otherExpectation("W");
      var peg$e12 = peg$otherExpectation("X");
      var peg$e13 = peg$otherExpectation("!");
      var peg$e14 = peg$otherExpectation("@");
      var peg$e15 = peg$otherExpectation("<");
      var peg$e16 = peg$otherExpectation(">");
      var peg$e17 = peg$otherExpectation("group");
      var peg$e18 = peg$otherExpectation("whitespace");
      var peg$f0 = function(c) {
        return c;
      };
      var peg$f1 = function(cols) {
        return cols;
      };
      var peg$f2 = function() {
        return [];
      };
      var peg$f3 = function(divs1, start, a, end, divs2) {
        return {
          type: "column",
          pre_dividers: divs1,
          post_dividers: divs2,
          before_start_code: start,
          before_end_code: end,
          alignment: a
        };
      };
      var peg$f4 = function() {
        return {
          type: "vert_divider"
        };
      };
      var peg$f5 = function(b, g) {
        return {
          type: "bang_divider",
          content: g[0].content
        };
      };
      var peg$f6 = function(g) {
        return {
          type: "at_divider",
          content: g[0].content
        };
      };
      var peg$f7 = function(div) {
        return div;
      };
      var peg$f8 = function(g) {
        return { type: "decl_code", code: g[0].content };
      };
      var peg$f9 = function(g) {
        return { type: "decl_code", code: g[0].content };
      };
      var peg$f10 = function() {
        return { type: "alignment", alignment: "left" };
      };
      var peg$f11 = function() {
        return { type: "alignment", alignment: "center" };
      };
      var peg$f12 = function() {
        return { type: "alignment", alignment: "right" };
      };
      var peg$f13 = function() {
        return { type: "alignment", alignment: "X" };
      };
      var peg$f14 = function() {
        return "top";
      };
      var peg$f15 = function() {
        return "default";
      };
      var peg$f16 = function() {
        return "bottom";
      };
      var peg$f17 = function(a, g) {
        return {
          type: "alignment",
          alignment: "parbox",
          baseline: a,
          size: g[0].content
        };
      };
      var peg$f18 = function(g1, g2) {
        return {
          type: "alignment",
          alignment: "parbox",
          baseline: g1[0].content,
          size: g2[0].content
        };
      };
      var peg$f19 = function(tok) {
        return options.matchChar(tok, "|");
      };
      var peg$f20 = function(tok) {
        return options.matchChar(tok, "l");
      };
      var peg$f21 = function(tok) {
        return options.matchChar(tok, "r");
      };
      var peg$f22 = function(tok) {
        return options.matchChar(tok, "c");
      };
      var peg$f23 = function(tok) {
        return options.matchChar(tok, "p");
      };
      var peg$f24 = function(tok) {
        return options.matchChar(tok, "m");
      };
      var peg$f25 = function(tok) {
        return options.matchChar(tok, "b");
      };
      var peg$f26 = function(tok) {
        return options.matchChar(tok, "w");
      };
      var peg$f27 = function(tok) {
        return options.matchChar(tok, "W");
      };
      var peg$f28 = function(tok) {
        return options.matchChar(tok, "X");
      };
      var peg$f29 = function(tok) {
        return options.matchChar(tok, "!");
      };
      var peg$f30 = function(tok) {
        return options.matchChar(tok, "@");
      };
      var peg$f31 = function(tok) {
        return options.matchChar(tok, "<");
      };
      var peg$f32 = function(tok) {
        return options.matchChar(tok, ">");
      };
      var peg$f33 = function(tok) {
        return options.isGroup(tok);
      };
      var peg$f34 = function(tok) {
        return options.isWhitespace(tok);
      };
      var peg$currPos = 0;
      var peg$savedPos = 0;
      var peg$posDetailsCache = [{ line: 1, column: 1 }];
      var peg$maxFailPos = 0;
      var peg$maxFailExpected = [];
      var peg$silentFails = 0;
      var peg$result;
      if ("startRule" in options) {
        if (!(options.startRule in peg$startRuleFunctions)) {
          throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
        }
        peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
      }
      function text() {
        return input.substring(peg$savedPos, peg$currPos);
      }
      function offset() {
        return peg$savedPos;
      }
      function range() {
        return {
          source: peg$source,
          start: peg$savedPos,
          end: peg$currPos
        };
      }
      function location() {
        return peg$computeLocation(peg$savedPos, peg$currPos);
      }
      function expected(description, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildStructuredError(
          [peg$otherExpectation(description)],
          input.substring(peg$savedPos, peg$currPos),
          location2
        );
      }
      function error(message, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildSimpleError(message, location2);
      }
      function peg$literalExpectation(text2, ignoreCase) {
        return { type: "literal", text: text2, ignoreCase };
      }
      function peg$classExpectation(parts, inverted, ignoreCase) {
        return { type: "class", parts, inverted, ignoreCase };
      }
      function peg$anyExpectation() {
        return { type: "any" };
      }
      function peg$endExpectation() {
        return { type: "end" };
      }
      function peg$otherExpectation(description) {
        return { type: "other", description };
      }
      function peg$computePosDetails(pos) {
        var details = peg$posDetailsCache[pos];
        var p;
        if (details) {
          return details;
        } else {
          p = pos - 1;
          while (!peg$posDetailsCache[p]) {
            p--;
          }
          details = peg$posDetailsCache[p];
          details = {
            line: details.line,
            column: details.column
          };
          while (p < pos) {
            if (input.charCodeAt(p) === 10) {
              details.line++;
              details.column = 1;
            } else {
              details.column++;
            }
            p++;
          }
          peg$posDetailsCache[pos] = details;
          return details;
        }
      }
      function peg$computeLocation(startPos, endPos) {
        var startPosDetails = peg$computePosDetails(startPos);
        var endPosDetails = peg$computePosDetails(endPos);
        return {
          source: peg$source,
          start: {
            offset: startPos,
            line: startPosDetails.line,
            column: startPosDetails.column
          },
          end: {
            offset: endPos,
            line: endPosDetails.line,
            column: endPosDetails.column
          }
        };
      }
      function peg$fail(expected2) {
        if (peg$currPos < peg$maxFailPos) {
          return;
        }
        if (peg$currPos > peg$maxFailPos) {
          peg$maxFailPos = peg$currPos;
          peg$maxFailExpected = [];
        }
        peg$maxFailExpected.push(expected2);
      }
      function peg$buildSimpleError(message, location2) {
        return new peg$SyntaxError(message, null, null, location2);
      }
      function peg$buildStructuredError(expected2, found, location2) {
        return new peg$SyntaxError(
          peg$SyntaxError.buildMessage(expected2, found),
          expected2,
          found,
          location2
        );
      }
      function peg$parsebody() {
        var s0, s1, s2, s3, s4, s5;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$currPos;
        s3 = peg$parsecolumn();
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$parse_();
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$parse_();
          }
          peg$savedPos = s2;
          s2 = peg$f0(s3);
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$currPos;
            s3 = peg$parsecolumn();
            if (s3 !== peg$FAILED) {
              s4 = [];
              s5 = peg$parse_();
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = peg$parse_();
              }
              peg$savedPos = s2;
              s2 = peg$f0(s3);
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          }
        } else {
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f1(s1);
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parseEOL();
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f2();
          }
          s0 = s1;
        }
        return s0;
      }
      function peg$parsecolumn() {
        var s0, s1, s2, s3, s4, s5, s6;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parsecolumn_divider();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parsecolumn_divider();
        }
        s2 = peg$parsedecl_start();
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        s3 = peg$parsealignment();
        if (s3 !== peg$FAILED) {
          s4 = peg$parsedecl_end();
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          s5 = [];
          s6 = peg$parsecolumn_divider();
          while (s6 !== peg$FAILED) {
            s5.push(s6);
            s6 = peg$parsecolumn_divider();
          }
          peg$savedPos = s0;
          s0 = peg$f3(s1, s2, s3, s4, s5);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsecolumn_divider() {
        var s0, s1, s2, s3, s4;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_();
        }
        s2 = peg$currPos;
        s3 = peg$parsevert();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s2;
          s3 = peg$f4();
        }
        s2 = s3;
        if (s2 === peg$FAILED) {
          s2 = peg$currPos;
          s3 = peg$parsebang();
          if (s3 !== peg$FAILED) {
            s4 = peg$parsegroup();
            if (s4 !== peg$FAILED) {
              peg$savedPos = s2;
              s2 = peg$f5(s3, s4);
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
          if (s2 === peg$FAILED) {
            s2 = peg$currPos;
            s3 = peg$parseat();
            if (s3 !== peg$FAILED) {
              s4 = peg$parsegroup();
              if (s4 !== peg$FAILED) {
                peg$savedPos = s2;
                s2 = peg$f6(s4);
              } else {
                peg$currPos = s2;
                s2 = peg$FAILED;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parse_();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parse_();
          }
          peg$savedPos = s0;
          s0 = peg$f7(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsedecl_start() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$parsegreater();
        if (s1 !== peg$FAILED) {
          s2 = peg$parsegroup();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f8(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        return s0;
      }
      function peg$parsedecl_end() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$parseless();
        if (s1 !== peg$FAILED) {
          s2 = peg$parsegroup();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f9(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e1);
          }
        }
        return s0;
      }
      function peg$parsealignment() {
        var s0, s1, s2, s3, s4, s5;
        s0 = peg$currPos;
        s1 = peg$parsel();
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f10();
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parsec();
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f11();
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parser();
            if (s1 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$f12();
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = peg$parseX();
              if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$f13();
              }
              s0 = s1;
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                s1 = peg$currPos;
                s2 = peg$parsep();
                if (s2 !== peg$FAILED) {
                  peg$savedPos = s1;
                  s2 = peg$f14();
                }
                s1 = s2;
                if (s1 === peg$FAILED) {
                  s1 = peg$currPos;
                  s2 = peg$parsem();
                  if (s2 !== peg$FAILED) {
                    peg$savedPos = s1;
                    s2 = peg$f15();
                  }
                  s1 = s2;
                  if (s1 === peg$FAILED) {
                    s1 = peg$currPos;
                    s2 = peg$parseb();
                    if (s2 !== peg$FAILED) {
                      peg$savedPos = s1;
                      s2 = peg$f16();
                    }
                    s1 = s2;
                  }
                }
                if (s1 !== peg$FAILED) {
                  s2 = [];
                  s3 = peg$parse_();
                  while (s3 !== peg$FAILED) {
                    s2.push(s3);
                    s3 = peg$parse_();
                  }
                  s3 = peg$parsegroup();
                  if (s3 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s0 = peg$f17(s1, s3);
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  s1 = peg$parsew();
                  if (s1 === peg$FAILED) {
                    s1 = peg$parseW();
                  }
                  if (s1 !== peg$FAILED) {
                    s2 = [];
                    s3 = peg$parse_();
                    while (s3 !== peg$FAILED) {
                      s2.push(s3);
                      s3 = peg$parse_();
                    }
                    s3 = peg$parsegroup();
                    if (s3 !== peg$FAILED) {
                      s4 = [];
                      s5 = peg$parse_();
                      while (s5 !== peg$FAILED) {
                        s4.push(s5);
                        s5 = peg$parse_();
                      }
                      s5 = peg$parsegroup();
                      if (s5 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s0 = peg$f18(s3, s5);
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                }
              }
            }
          }
        }
        return s0;
      }
      function peg$parsevert() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f19(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e2);
          }
        }
        return s0;
      }
      function peg$parsel() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f20(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e4);
          }
        }
        return s0;
      }
      function peg$parser() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f21(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e5);
          }
        }
        return s0;
      }
      function peg$parsec() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f22(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e6);
          }
        }
        return s0;
      }
      function peg$parsep() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f23(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e7);
          }
        }
        return s0;
      }
      function peg$parsem() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f24(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e8);
          }
        }
        return s0;
      }
      function peg$parseb() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f25(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e9);
          }
        }
        return s0;
      }
      function peg$parsew() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f26(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e10);
          }
        }
        return s0;
      }
      function peg$parseW() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f27(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e11);
          }
        }
        return s0;
      }
      function peg$parseX() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f28(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e12);
          }
        }
        return s0;
      }
      function peg$parsebang() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f29(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e13);
          }
        }
        return s0;
      }
      function peg$parseat() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f30(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e14);
          }
        }
        return s0;
      }
      function peg$parseless() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f31(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e15);
          }
        }
        return s0;
      }
      function peg$parsegreater() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f32(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e16);
          }
        }
        return s0;
      }
      function peg$parsegroup() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f33(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e17);
          }
        }
        return s0;
      }
      function peg$parse_() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f34(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e18);
          }
        }
        return s0;
      }
      function peg$parseEOL() {
        var s0, s1;
        s0 = peg$currPos;
        peg$silentFails++;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        peg$silentFails--;
        if (s1 === peg$FAILED) {
          s0 = void 0;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      if (!options.isHash) {
        try {
          Object.assign(options, {
            matchChar: (node, char) => node.type === "string" && node.content === char,
            isGroup: (node) => node.type === "group",
            isWhitespace: (node) => node.type === "whitespace"
          });
        } catch (e) {
          console.warn("Error when initializing parser", e);
        }
      }
      peg$result = peg$startRuleFunction();
      if (peg$result !== peg$FAILED && peg$currPos === input.length) {
        return peg$result;
      } else {
        if (peg$result !== peg$FAILED && peg$currPos < input.length) {
          peg$fail(peg$endExpectation());
        }
        throw peg$buildStructuredError(
          peg$maxFailExpected,
          peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
          peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
        );
      }
    }
    return {
      SyntaxError: peg$SyntaxError,
      parse: peg$parse
    };
  }()
);
var systeme_environment_default = (
  // Generated by Peggy 2.0.1.
  //
  // https://peggyjs.org/
  function() {
    "use strict";
    function peg$subclass(child, parent) {
      function C() {
        this.constructor = child;
      }
      C.prototype = parent.prototype;
      child.prototype = new C();
    }
    function peg$SyntaxError(message, expected, found, location) {
      var self = Error.call(this, message);
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(self, peg$SyntaxError.prototype);
      }
      self.expected = expected;
      self.found = found;
      self.location = location;
      self.name = "SyntaxError";
      return self;
    }
    peg$subclass(peg$SyntaxError, Error);
    function peg$padEnd(str, targetLength, padString) {
      padString = padString || " ";
      if (str.length > targetLength) {
        return str;
      }
      targetLength -= str.length;
      padString += padString.repeat(targetLength);
      return str + padString.slice(0, targetLength);
    }
    peg$SyntaxError.prototype.format = function(sources) {
      var str = "Error: " + this.message;
      if (this.location) {
        var src = null;
        var k;
        for (k = 0; k < sources.length; k++) {
          if (sources[k].source === this.location.source) {
            src = sources[k].text.split(/\r\n|\n|\r/g);
            break;
          }
        }
        var s2 = this.location.start;
        var loc = this.location.source + ":" + s2.line + ":" + s2.column;
        if (src) {
          var e = this.location.end;
          var filler = peg$padEnd("", s2.line.toString().length, " ");
          var line = src[s2.line - 1];
          var last = s2.line === e.line ? e.column : line.length + 1;
          var hatLen = last - s2.column || 1;
          str += "\n --> " + loc + "\n" + filler + " |\n" + s2.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
        } else {
          str += "\n at " + loc;
        }
      }
      return str;
    };
    peg$SyntaxError.buildMessage = function(expected, found) {
      var DESCRIBE_EXPECTATION_FNS = {
        literal: function(expectation) {
          return '"' + literalEscape(expectation.text) + '"';
        },
        class: function(expectation) {
          var escapedParts = expectation.parts.map(function(part) {
            return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
          });
          return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
        },
        any: function() {
          return "any character";
        },
        end: function() {
          return "end of input";
        },
        other: function(expectation) {
          return expectation.description;
        }
      };
      function hex(ch) {
        return ch.charCodeAt(0).toString(16).toUpperCase();
      }
      function literalEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function classEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function describeExpectation(expectation) {
        return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
      }
      function describeExpected(expected2) {
        var descriptions = expected2.map(describeExpectation);
        var i, j;
        descriptions.sort();
        if (descriptions.length > 0) {
          for (i = 1, j = 1; i < descriptions.length; i++) {
            if (descriptions[i - 1] !== descriptions[i]) {
              descriptions[j] = descriptions[i];
              j++;
            }
          }
          descriptions.length = j;
        }
        switch (descriptions.length) {
          case 1:
            return descriptions[0];
          case 2:
            return descriptions[0] + " or " + descriptions[1];
          default:
            return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
        }
      }
      function describeFound(found2) {
        return found2 ? '"' + literalEscape(found2) + '"' : "end of input";
      }
      return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
    };
    function peg$parse(input, options) {
      options = options !== void 0 ? options : {};
      var peg$FAILED = {};
      var peg$source = options.grammarSource;
      var peg$startRuleFunctions = { body: peg$parsebody };
      var peg$startRuleFunction = peg$parsebody;
      var peg$e0 = peg$otherExpectation("partial item");
      var peg$e1 = peg$otherExpectation("item");
      var peg$e2 = peg$anyExpectation();
      var peg$e3 = peg$otherExpectation("equation");
      var peg$e4 = peg$otherExpectation("trailing comment");
      var peg$e5 = peg$otherExpectation("comment only line");
      var peg$e6 = peg$otherExpectation("non-var token");
      var peg$e7 = peg$otherExpectation("token");
      var peg$e8 = peg$otherExpectation("same line comment");
      var peg$e9 = peg$otherExpectation("own line comment");
      var peg$e10 = peg$otherExpectation(",");
      var peg$e11 = peg$otherExpectation("@");
      var peg$e12 = peg$otherExpectation("variable token");
      var peg$e13 = peg$otherExpectation("+/-");
      var peg$e14 = peg$otherExpectation("=");
      var peg$f0 = function(a, b) {
        return a.concat(b ? b : []);
      };
      var peg$f1 = function() {
        return [];
      };
      var peg$f2 = function(a, b, c) {
        return a.concat(b, c);
      };
      var peg$f3 = function(op, a, b, c) {
        return { type: "item", op, variable: b, content: a.concat(b, c) };
      };
      var peg$f4 = function(op, a) {
        return { type: "item", op, variable: null, content: a };
      };
      var peg$f5 = function(line, sep, comment2) {
        return { ...line, sep: [].concat(sep), trailingComment: comment2 };
      };
      var peg$f6 = function(line, comment2) {
        return { ...line, trailingComment: comment2 };
      };
      var peg$f7 = function(eq, ann) {
        return {
          type: "line",
          equation: eq,
          annotation: ann,
          sep: null
        };
      };
      var peg$f8 = function(at, ann) {
        return at ? { type: "annotation", marker: at, content: ann } : null;
      };
      var peg$f9 = function(left, eq, right) {
        return { type: "equation", left, right, equals: eq };
      };
      var peg$f10 = function(x) {
        return x;
      };
      var peg$f11 = function(x) {
        return {
          type: "line",
          trailingComment: x
        };
      };
      var peg$f12 = function(v, s2) {
        return [v].concat(s2 ? s2 : []);
      };
      var peg$f13 = function(t) {
        return t;
      };
      var peg$f14 = function(x) {
        return x;
      };
      var peg$f15 = function(x) {
        return x;
      };
      var peg$f16 = function(tok) {
        return options.isSameLineComment(tok);
      };
      var peg$f17 = function(tok) {
        return tok;
      };
      var peg$f18 = function(tok) {
        return options.isOwnLineComment(tok);
      };
      var peg$f19 = function(tok) {
        return tok;
      };
      var peg$f20 = function(tok) {
        return options.isWhitespace(tok);
      };
      var peg$f21 = function(tok) {
        return tok;
      };
      var peg$f22 = function(tok) {
        return options.isSep(tok);
      };
      var peg$f23 = function(tok) {
        return tok;
      };
      var peg$f24 = function(tok) {
        return options.isAt(tok);
      };
      var peg$f25 = function(tok) {
        return tok;
      };
      var peg$f26 = function(tok) {
        return options.isVar(tok);
      };
      var peg$f27 = function(tok) {
        return tok;
      };
      var peg$f28 = function(tok) {
        return options.isOperation(tok);
      };
      var peg$f29 = function(tok) {
        return tok;
      };
      var peg$f30 = function(tok) {
        return options.isEquals(tok);
      };
      var peg$f31 = function(tok) {
        return tok;
      };
      var peg$f32 = function(tok) {
        return options.isSubscript(tok);
      };
      var peg$f33 = function(tok) {
        return tok;
      };
      var peg$currPos = 0;
      var peg$savedPos = 0;
      var peg$posDetailsCache = [{ line: 1, column: 1 }];
      var peg$maxFailPos = 0;
      var peg$maxFailExpected = [];
      var peg$silentFails = 0;
      var peg$result;
      if ("startRule" in options) {
        if (!(options.startRule in peg$startRuleFunctions)) {
          throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
        }
        peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
      }
      function text() {
        return input.substring(peg$savedPos, peg$currPos);
      }
      function offset() {
        return peg$savedPos;
      }
      function range() {
        return {
          source: peg$source,
          start: peg$savedPos,
          end: peg$currPos
        };
      }
      function location() {
        return peg$computeLocation(peg$savedPos, peg$currPos);
      }
      function expected(description, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildStructuredError(
          [peg$otherExpectation(description)],
          input.substring(peg$savedPos, peg$currPos),
          location2
        );
      }
      function error(message, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildSimpleError(message, location2);
      }
      function peg$literalExpectation(text2, ignoreCase) {
        return { type: "literal", text: text2, ignoreCase };
      }
      function peg$classExpectation(parts, inverted, ignoreCase) {
        return { type: "class", parts, inverted, ignoreCase };
      }
      function peg$anyExpectation() {
        return { type: "any" };
      }
      function peg$endExpectation() {
        return { type: "end" };
      }
      function peg$otherExpectation(description) {
        return { type: "other", description };
      }
      function peg$computePosDetails(pos) {
        var details = peg$posDetailsCache[pos];
        var p;
        if (details) {
          return details;
        } else {
          p = pos - 1;
          while (!peg$posDetailsCache[p]) {
            p--;
          }
          details = peg$posDetailsCache[p];
          details = {
            line: details.line,
            column: details.column
          };
          while (p < pos) {
            if (input.charCodeAt(p) === 10) {
              details.line++;
              details.column = 1;
            } else {
              details.column++;
            }
            p++;
          }
          peg$posDetailsCache[pos] = details;
          return details;
        }
      }
      function peg$computeLocation(startPos, endPos) {
        var startPosDetails = peg$computePosDetails(startPos);
        var endPosDetails = peg$computePosDetails(endPos);
        return {
          source: peg$source,
          start: {
            offset: startPos,
            line: startPosDetails.line,
            column: startPosDetails.column
          },
          end: {
            offset: endPos,
            line: endPosDetails.line,
            column: endPosDetails.column
          }
        };
      }
      function peg$fail(expected2) {
        if (peg$currPos < peg$maxFailPos) {
          return;
        }
        if (peg$currPos > peg$maxFailPos) {
          peg$maxFailPos = peg$currPos;
          peg$maxFailExpected = [];
        }
        peg$maxFailExpected.push(expected2);
      }
      function peg$buildSimpleError(message, location2) {
        return new peg$SyntaxError(message, null, null, location2);
      }
      function peg$buildStructuredError(expected2, found, location2) {
        return new peg$SyntaxError(
          peg$SyntaxError.buildMessage(expected2, found),
          expected2,
          found,
          location2
        );
      }
      function peg$parsebody() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parsecomment_only_line();
        if (s2 === peg$FAILED) {
          s2 = peg$parseline_with_sep();
          if (s2 === peg$FAILED) {
            s2 = peg$parsepartial_line_with_comment();
          }
        }
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parsecomment_only_line();
          if (s2 === peg$FAILED) {
            s2 = peg$parseline_with_sep();
            if (s2 === peg$FAILED) {
              s2 = peg$parsepartial_line_with_comment();
            }
          }
        }
        s2 = peg$parseline_without_sep();
        if (s2 === peg$FAILED) {
          s2 = peg$parseEOL();
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f0(s1, s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parseEOL();
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f1();
          }
          s0 = s1;
        }
        return s0;
      }
      function peg$parsepartial_item() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_();
        }
        s2 = [];
        s3 = peg$parsenon_var_token();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsenon_var_token();
        }
        s3 = [];
        s4 = peg$parse_();
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$parse_();
        }
        s4 = peg$parsevar();
        if (s4 !== peg$FAILED) {
          s5 = [];
          s6 = peg$parse_();
          while (s6 !== peg$FAILED) {
            s5.push(s6);
            s6 = peg$parse_();
          }
          s6 = [];
          s7 = peg$parsetoken();
          while (s7 !== peg$FAILED) {
            s6.push(s7);
            s7 = peg$parsetoken();
          }
          s7 = [];
          s8 = peg$parse_();
          while (s8 !== peg$FAILED) {
            s7.push(s8);
            s8 = peg$parse_();
          }
          peg$savedPos = s0;
          s0 = peg$f2(s2, s4, s6);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        return s0;
      }
      function peg$parseitem() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$parseoperation();
        if (s1 === peg$FAILED) {
          s1 = null;
        }
        s2 = [];
        s3 = peg$parse_();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parse_();
        }
        s3 = [];
        s4 = peg$parsenon_var_token();
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$parsenon_var_token();
        }
        s4 = [];
        s5 = peg$parse_();
        while (s5 !== peg$FAILED) {
          s4.push(s5);
          s5 = peg$parse_();
        }
        s5 = peg$parsevar();
        if (s5 !== peg$FAILED) {
          s6 = [];
          s7 = peg$parse_();
          while (s7 !== peg$FAILED) {
            s6.push(s7);
            s7 = peg$parse_();
          }
          s7 = [];
          s8 = peg$parsetoken();
          while (s8 !== peg$FAILED) {
            s7.push(s8);
            s8 = peg$parsetoken();
          }
          s8 = [];
          s9 = peg$parse_();
          while (s9 !== peg$FAILED) {
            s8.push(s9);
            s9 = peg$parse_();
          }
          peg$savedPos = s0;
          s0 = peg$f3(s1, s3, s5, s7);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parseoperation();
          if (s1 === peg$FAILED) {
            s1 = null;
          }
          s2 = [];
          s3 = peg$parse_();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parse_();
          }
          s3 = [];
          s4 = peg$parsenon_var_token();
          if (s4 !== peg$FAILED) {
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parsenon_var_token();
            }
          } else {
            s3 = peg$FAILED;
          }
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = peg$parse_();
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$parse_();
            }
            peg$savedPos = s0;
            s0 = peg$f4(s1, s3);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e1);
          }
        }
        return s0;
      }
      function peg$parseline_with_sep() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$parseline_without_sep();
        if (s1 !== peg$FAILED) {
          s2 = peg$parsesep();
          if (s2 !== peg$FAILED) {
            s3 = peg$parsetrailing_comment();
            if (s3 === peg$FAILED) {
              s3 = null;
            }
            peg$savedPos = s0;
            s0 = peg$f5(s1, s2, s3);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsepartial_line_with_comment() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$parseline_without_sep();
        if (s1 !== peg$FAILED) {
          s2 = peg$parsetrailing_comment();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f6(s1, s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseline_without_sep() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        if (input.length > peg$currPos) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e2);
          }
        }
        peg$silentFails--;
        if (s2 !== peg$FAILED) {
          peg$currPos = s1;
          s1 = void 0;
        } else {
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseequation();
          s3 = peg$parseannotation();
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          peg$savedPos = s0;
          s0 = peg$f7(s2, s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseannotation() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$parseat();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parsenon_sep_token();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parsenon_sep_token();
          }
          peg$savedPos = s0;
          s0 = peg$f8(s1, s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseequation() {
        var s0, s1, s2, s3, s4;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parseitem();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parseitem();
        }
        s2 = peg$parseequals();
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        s3 = [];
        s4 = peg$parsetoken();
        if (s4 === peg$FAILED) {
          s4 = peg$parseoperation();
        }
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$parsetoken();
          if (s4 === peg$FAILED) {
            s4 = peg$parseoperation();
          }
        }
        peg$savedPos = s0;
        s0 = peg$f9(s1, s2, s3);
        peg$silentFails--;
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e3);
        }
        return s0;
      }
      function peg$parsetrailing_comment() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_();
        }
        s2 = peg$parsesame_line_comment();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f10(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e4);
          }
        }
        return s0;
      }
      function peg$parsecomment_only_line() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_();
        }
        s2 = peg$parseown_line_comment();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f11(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e5);
          }
        }
        return s0;
      }
      function peg$parsevar() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$parsevar_token();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parse_();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parse_();
          }
          s3 = peg$parsesubscript();
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          peg$savedPos = s0;
          s0 = peg$f12(s1, s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsenon_var_token() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        s2 = peg$parsevar();
        peg$silentFails--;
        if (s2 === peg$FAILED) {
          s1 = void 0;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsetoken();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f13(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e6);
          }
        }
        return s0;
      }
      function peg$parsenon_sep_token() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        s2 = peg$parsesep();
        if (s2 === peg$FAILED) {
          s2 = peg$parsetrailing_comment();
          if (s2 === peg$FAILED) {
            s2 = peg$parseown_line_comment();
          }
        }
        peg$silentFails--;
        if (s2 === peg$FAILED) {
          s1 = void 0;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e2);
            }
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f14(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsetoken() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        s2 = peg$parsesep();
        if (s2 === peg$FAILED) {
          s2 = peg$parseat();
          if (s2 === peg$FAILED) {
            s2 = peg$parseoperation();
            if (s2 === peg$FAILED) {
              s2 = peg$parseequals();
              if (s2 === peg$FAILED) {
                s2 = peg$parsetrailing_comment();
                if (s2 === peg$FAILED) {
                  s2 = peg$parseown_line_comment();
                }
              }
            }
          }
        }
        peg$silentFails--;
        if (s2 === peg$FAILED) {
          s1 = void 0;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e2);
            }
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f15(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e7);
          }
        }
        return s0;
      }
      function peg$parsesame_line_comment() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e2);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f16(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f17(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e8);
          }
        }
        return s0;
      }
      function peg$parseown_line_comment() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e2);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f18(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f19(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e9);
          }
        }
        return s0;
      }
      function peg$parse_() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e2);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f20(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f21(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsesep() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e2);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f22(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f23(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e10);
          }
        }
        return s0;
      }
      function peg$parseat() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e2);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f24(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f25(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e11);
          }
        }
        return s0;
      }
      function peg$parsevar_token() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e2);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f26(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f27(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e12);
          }
        }
        return s0;
      }
      function peg$parseoperation() {
        var s0, s1, s2, s3, s4;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_();
        }
        if (input.length > peg$currPos) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e2);
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parse_();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parse_();
          }
          peg$savedPos = peg$currPos;
          s4 = peg$f28(s2);
          if (s4) {
            s4 = void 0;
          } else {
            s4 = peg$FAILED;
          }
          if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f29(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e13);
          }
        }
        return s0;
      }
      function peg$parseequals() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e2);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f30(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f31(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e14);
          }
        }
        return s0;
      }
      function peg$parsesubscript() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e2);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f32(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f33(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseEOL() {
        var s0, s1;
        s0 = peg$currPos;
        peg$silentFails++;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e2);
          }
        }
        peg$silentFails--;
        if (s1 === peg$FAILED) {
          s0 = void 0;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      if (!options.isWhitespace) {
        try {
          Object.assign(options, {
            isSep: (node) => node.type === "string" && node.content === ",",
            isVar: (node) => node.type === "string" && node.content.match(/[a-zA-Z]/),
            isOperation: (node) => node.type === "string" && node.content.match(/[+-]/),
            isEquals: (node) => node.type === "string" && node.content === "=",
            isAt: (node) => node.type === "string" && node.content === "@",
            isSubscript: (node) => node.content === "_",
            isWhitespace: (node) => node.type === "whitespace",
            isSameLineComment: (node) => node.type === "comment" && node.sameline,
            isOwnLineComment: (node) => node.type === "comment" && !node.sameline
          });
        } catch (e) {
          console.warn("Error when initializing parser", e);
        }
      }
      peg$result = peg$startRuleFunction();
      if (peg$result !== peg$FAILED && peg$currPos === input.length) {
        return peg$result;
      } else {
        if (peg$result !== peg$FAILED && peg$currPos < input.length) {
          peg$fail(peg$endExpectation());
        }
        throw peg$buildStructuredError(
          peg$maxFailExpected,
          peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
          peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
        );
      }
    }
    return {
      SyntaxError: peg$SyntaxError,
      parse: peg$parse
    };
  }()
);
var tex_glue_default = (
  // Generated by Peggy 2.0.1.
  //
  // https://peggyjs.org/
  function() {
    "use strict";
    function peg$subclass(child, parent) {
      function C() {
        this.constructor = child;
      }
      C.prototype = parent.prototype;
      child.prototype = new C();
    }
    function peg$SyntaxError(message, expected, found, location) {
      var self = Error.call(this, message);
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(self, peg$SyntaxError.prototype);
      }
      self.expected = expected;
      self.found = found;
      self.location = location;
      self.name = "SyntaxError";
      return self;
    }
    peg$subclass(peg$SyntaxError, Error);
    function peg$padEnd(str, targetLength, padString) {
      padString = padString || " ";
      if (str.length > targetLength) {
        return str;
      }
      targetLength -= str.length;
      padString += padString.repeat(targetLength);
      return str + padString.slice(0, targetLength);
    }
    peg$SyntaxError.prototype.format = function(sources) {
      var str = "Error: " + this.message;
      if (this.location) {
        var src = null;
        var k;
        for (k = 0; k < sources.length; k++) {
          if (sources[k].source === this.location.source) {
            src = sources[k].text.split(/\r\n|\n|\r/g);
            break;
          }
        }
        var s2 = this.location.start;
        var loc = this.location.source + ":" + s2.line + ":" + s2.column;
        if (src) {
          var e = this.location.end;
          var filler = peg$padEnd("", s2.line.toString().length, " ");
          var line = src[s2.line - 1];
          var last = s2.line === e.line ? e.column : line.length + 1;
          var hatLen = last - s2.column || 1;
          str += "\n --> " + loc + "\n" + filler + " |\n" + s2.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
        } else {
          str += "\n at " + loc;
        }
      }
      return str;
    };
    peg$SyntaxError.buildMessage = function(expected, found) {
      var DESCRIBE_EXPECTATION_FNS = {
        literal: function(expectation) {
          return '"' + literalEscape(expectation.text) + '"';
        },
        class: function(expectation) {
          var escapedParts = expectation.parts.map(function(part) {
            return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
          });
          return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
        },
        any: function() {
          return "any character";
        },
        end: function() {
          return "end of input";
        },
        other: function(expectation) {
          return expectation.description;
        }
      };
      function hex(ch) {
        return ch.charCodeAt(0).toString(16).toUpperCase();
      }
      function literalEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function classEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function describeExpectation(expectation) {
        return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
      }
      function describeExpected(expected2) {
        var descriptions = expected2.map(describeExpectation);
        var i, j;
        descriptions.sort();
        if (descriptions.length > 0) {
          for (i = 1, j = 1; i < descriptions.length; i++) {
            if (descriptions[i - 1] !== descriptions[i]) {
              descriptions[j] = descriptions[i];
              j++;
            }
          }
          descriptions.length = j;
        }
        switch (descriptions.length) {
          case 1:
            return descriptions[0];
          case 2:
            return descriptions[0] + " or " + descriptions[1];
          default:
            return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
        }
      }
      function describeFound(found2) {
        return found2 ? '"' + literalEscape(found2) + '"' : "end of input";
      }
      return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
    };
    function peg$parse(input, options) {
      options = options !== void 0 ? options : {};
      var peg$FAILED = {};
      var peg$source = options.grammarSource;
      var peg$startRuleFunctions = { root: peg$parseroot };
      var peg$startRuleFunction = peg$parseroot;
      var peg$c0 = "plus";
      var peg$c1 = "minus";
      var peg$c2 = "pt";
      var peg$c3 = "mm";
      var peg$c4 = "cm";
      var peg$c5 = "in";
      var peg$c6 = "ex";
      var peg$c7 = "em";
      var peg$c8 = "bp";
      var peg$c9 = "pc";
      var peg$c10 = "dd";
      var peg$c11 = "cc";
      var peg$c12 = "nd";
      var peg$c13 = "nc";
      var peg$c14 = "sp";
      var peg$c15 = "filll";
      var peg$c16 = "fill";
      var peg$c17 = "fil";
      var peg$c18 = ".";
      var peg$c19 = "+";
      var peg$c20 = "-";
      var peg$r0 = /^[0-9]/;
      var peg$e0 = peg$anyExpectation();
      var peg$e1 = peg$literalExpectation("plus", false);
      var peg$e2 = peg$literalExpectation("minus", false);
      var peg$e3 = peg$literalExpectation("pt", false);
      var peg$e4 = peg$literalExpectation("mm", false);
      var peg$e5 = peg$literalExpectation("cm", false);
      var peg$e6 = peg$literalExpectation("in", false);
      var peg$e7 = peg$literalExpectation("ex", false);
      var peg$e8 = peg$literalExpectation("em", false);
      var peg$e9 = peg$literalExpectation("bp", false);
      var peg$e10 = peg$literalExpectation("pc", false);
      var peg$e11 = peg$literalExpectation("dd", false);
      var peg$e12 = peg$literalExpectation("cc", false);
      var peg$e13 = peg$literalExpectation("nd", false);
      var peg$e14 = peg$literalExpectation("nc", false);
      var peg$e15 = peg$literalExpectation("sp", false);
      var peg$e16 = peg$literalExpectation("filll", false);
      var peg$e17 = peg$literalExpectation("fill", false);
      var peg$e18 = peg$literalExpectation("fil", false);
      var peg$e19 = peg$otherExpectation("number");
      var peg$e20 = peg$classExpectation([["0", "9"]], false, false);
      var peg$e21 = peg$literalExpectation(".", false);
      var peg$e22 = peg$literalExpectation("+", false);
      var peg$e23 = peg$literalExpectation("-", false);
      var peg$f0 = function(b, st, sh) {
        return {
          type: "glue",
          fixed: b,
          stretchable: st,
          shrinkable: sh,
          position: location()
        };
      };
      var peg$f1 = function(glue) {
        return glue;
      };
      var peg$f2 = function(n, u) {
        return { type: "dim", value: n, unit: u };
      };
      var peg$f3 = function(n, u) {
        return { type: "dim", value: n, unit: u };
      };
      var peg$f4 = function(n, u) {
        return { type: "dim", value: n, unit: u };
      };
      var peg$f5 = function(n) {
        return parseFloat(n);
      };
      var peg$currPos = 0;
      var peg$savedPos = 0;
      var peg$posDetailsCache = [{ line: 1, column: 1 }];
      var peg$maxFailPos = 0;
      var peg$maxFailExpected = [];
      var peg$silentFails = 0;
      var peg$result;
      if ("startRule" in options) {
        if (!(options.startRule in peg$startRuleFunctions)) {
          throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
        }
        peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
      }
      function text() {
        return input.substring(peg$savedPos, peg$currPos);
      }
      function offset() {
        return peg$savedPos;
      }
      function range() {
        return {
          source: peg$source,
          start: peg$savedPos,
          end: peg$currPos
        };
      }
      function location() {
        return peg$computeLocation(peg$savedPos, peg$currPos);
      }
      function expected(description, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildStructuredError(
          [peg$otherExpectation(description)],
          input.substring(peg$savedPos, peg$currPos),
          location2
        );
      }
      function error(message, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildSimpleError(message, location2);
      }
      function peg$literalExpectation(text2, ignoreCase) {
        return { type: "literal", text: text2, ignoreCase };
      }
      function peg$classExpectation(parts, inverted, ignoreCase) {
        return { type: "class", parts, inverted, ignoreCase };
      }
      function peg$anyExpectation() {
        return { type: "any" };
      }
      function peg$endExpectation() {
        return { type: "end" };
      }
      function peg$otherExpectation(description) {
        return { type: "other", description };
      }
      function peg$computePosDetails(pos) {
        var details = peg$posDetailsCache[pos];
        var p;
        if (details) {
          return details;
        } else {
          p = pos - 1;
          while (!peg$posDetailsCache[p]) {
            p--;
          }
          details = peg$posDetailsCache[p];
          details = {
            line: details.line,
            column: details.column
          };
          while (p < pos) {
            if (input.charCodeAt(p) === 10) {
              details.line++;
              details.column = 1;
            } else {
              details.column++;
            }
            p++;
          }
          peg$posDetailsCache[pos] = details;
          return details;
        }
      }
      function peg$computeLocation(startPos, endPos) {
        var startPosDetails = peg$computePosDetails(startPos);
        var endPosDetails = peg$computePosDetails(endPos);
        return {
          source: peg$source,
          start: {
            offset: startPos,
            line: startPosDetails.line,
            column: startPosDetails.column
          },
          end: {
            offset: endPos,
            line: endPosDetails.line,
            column: endPosDetails.column
          }
        };
      }
      function peg$fail(expected2) {
        if (peg$currPos < peg$maxFailPos) {
          return;
        }
        if (peg$currPos > peg$maxFailPos) {
          peg$maxFailPos = peg$currPos;
          peg$maxFailExpected = [];
        }
        peg$maxFailExpected.push(expected2);
      }
      function peg$buildSimpleError(message, location2) {
        return new peg$SyntaxError(message, null, null, location2);
      }
      function peg$buildStructuredError(expected2, found, location2) {
        return new peg$SyntaxError(
          peg$SyntaxError.buildMessage(expected2, found),
          expected2,
          found,
          location2
        );
      }
      function peg$parseroot() {
        var s0, s1, s2, s3, s4;
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = peg$parsebase();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsestretchable();
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          s4 = peg$parseshrinkable();
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          peg$savedPos = s1;
          s1 = peg$f0(s2, s3, s4);
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          if (input.length > peg$currPos) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e0);
            }
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            if (input.length > peg$currPos) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e0);
              }
            }
          }
          peg$savedPos = s0;
          s0 = peg$f1(s1);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsebase() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$parsenumber();
        if (s1 !== peg$FAILED) {
          s2 = peg$parseunit();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f2(s1, s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsestretchable() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 4) === peg$c0) {
          s1 = peg$c0;
          peg$currPos += 4;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e1);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsenumber();
          if (s2 !== peg$FAILED) {
            s3 = peg$parserubber_unit();
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f3(s2, s3);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseshrinkable() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 5) === peg$c1) {
          s1 = peg$c1;
          peg$currPos += 5;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e2);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsenumber();
          if (s2 !== peg$FAILED) {
            s3 = peg$parserubber_unit();
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f4(s2, s3);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseunit() {
        var s0;
        if (input.substr(peg$currPos, 2) === peg$c2) {
          s0 = peg$c2;
          peg$currPos += 2;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c3) {
            s0 = peg$c3;
            peg$currPos += 2;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e4);
            }
          }
          if (s0 === peg$FAILED) {
            if (input.substr(peg$currPos, 2) === peg$c4) {
              s0 = peg$c4;
              peg$currPos += 2;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e5);
              }
            }
            if (s0 === peg$FAILED) {
              if (input.substr(peg$currPos, 2) === peg$c5) {
                s0 = peg$c5;
                peg$currPos += 2;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e6);
                }
              }
              if (s0 === peg$FAILED) {
                if (input.substr(peg$currPos, 2) === peg$c6) {
                  s0 = peg$c6;
                  peg$currPos += 2;
                } else {
                  s0 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e7);
                  }
                }
                if (s0 === peg$FAILED) {
                  if (input.substr(peg$currPos, 2) === peg$c7) {
                    s0 = peg$c7;
                    peg$currPos += 2;
                  } else {
                    s0 = peg$FAILED;
                    if (peg$silentFails === 0) {
                      peg$fail(peg$e8);
                    }
                  }
                  if (s0 === peg$FAILED) {
                    if (input.substr(peg$currPos, 2) === peg$c8) {
                      s0 = peg$c8;
                      peg$currPos += 2;
                    } else {
                      s0 = peg$FAILED;
                      if (peg$silentFails === 0) {
                        peg$fail(peg$e9);
                      }
                    }
                    if (s0 === peg$FAILED) {
                      if (input.substr(peg$currPos, 2) === peg$c9) {
                        s0 = peg$c9;
                        peg$currPos += 2;
                      } else {
                        s0 = peg$FAILED;
                        if (peg$silentFails === 0) {
                          peg$fail(peg$e10);
                        }
                      }
                      if (s0 === peg$FAILED) {
                        if (input.substr(peg$currPos, 2) === peg$c10) {
                          s0 = peg$c10;
                          peg$currPos += 2;
                        } else {
                          s0 = peg$FAILED;
                          if (peg$silentFails === 0) {
                            peg$fail(peg$e11);
                          }
                        }
                        if (s0 === peg$FAILED) {
                          if (input.substr(peg$currPos, 2) === peg$c11) {
                            s0 = peg$c11;
                            peg$currPos += 2;
                          } else {
                            s0 = peg$FAILED;
                            if (peg$silentFails === 0) {
                              peg$fail(peg$e12);
                            }
                          }
                          if (s0 === peg$FAILED) {
                            if (input.substr(peg$currPos, 2) === peg$c12) {
                              s0 = peg$c12;
                              peg$currPos += 2;
                            } else {
                              s0 = peg$FAILED;
                              if (peg$silentFails === 0) {
                                peg$fail(peg$e13);
                              }
                            }
                            if (s0 === peg$FAILED) {
                              if (input.substr(peg$currPos, 2) === peg$c13) {
                                s0 = peg$c13;
                                peg$currPos += 2;
                              } else {
                                s0 = peg$FAILED;
                                if (peg$silentFails === 0) {
                                  peg$fail(peg$e14);
                                }
                              }
                              if (s0 === peg$FAILED) {
                                if (input.substr(peg$currPos, 2) === peg$c14) {
                                  s0 = peg$c14;
                                  peg$currPos += 2;
                                } else {
                                  s0 = peg$FAILED;
                                  if (peg$silentFails === 0) {
                                    peg$fail(peg$e15);
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return s0;
      }
      function peg$parserubber_unit() {
        var s0;
        s0 = peg$parseunit();
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 5) === peg$c15) {
            s0 = peg$c15;
            peg$currPos += 5;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e16);
            }
          }
          if (s0 === peg$FAILED) {
            if (input.substr(peg$currPos, 4) === peg$c16) {
              s0 = peg$c16;
              peg$currPos += 4;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e17);
              }
            }
            if (s0 === peg$FAILED) {
              if (input.substr(peg$currPos, 3) === peg$c17) {
                s0 = peg$c17;
                peg$currPos += 3;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e18);
                }
              }
            }
          }
        }
        return s0;
      }
      function peg$parsenumber() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = peg$currPos;
        s3 = peg$parsesign();
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        s4 = peg$currPos;
        s5 = [];
        if (peg$r0.test(input.charAt(peg$currPos))) {
          s6 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s6 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e20);
          }
        }
        while (s6 !== peg$FAILED) {
          s5.push(s6);
          if (peg$r0.test(input.charAt(peg$currPos))) {
            s6 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s6 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e20);
            }
          }
        }
        if (input.charCodeAt(peg$currPos) === 46) {
          s6 = peg$c18;
          peg$currPos++;
        } else {
          s6 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e21);
          }
        }
        if (s6 !== peg$FAILED) {
          s7 = [];
          if (peg$r0.test(input.charAt(peg$currPos))) {
            s8 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s8 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e20);
            }
          }
          if (s8 !== peg$FAILED) {
            while (s8 !== peg$FAILED) {
              s7.push(s8);
              if (peg$r0.test(input.charAt(peg$currPos))) {
                s8 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s8 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e20);
                }
              }
            }
          } else {
            s7 = peg$FAILED;
          }
          if (s7 !== peg$FAILED) {
            s5 = [s5, s6, s7];
            s4 = s5;
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        if (s4 === peg$FAILED) {
          s4 = [];
          if (peg$r0.test(input.charAt(peg$currPos))) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e20);
            }
          }
          if (s5 !== peg$FAILED) {
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              if (peg$r0.test(input.charAt(peg$currPos))) {
                s5 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e20);
                }
              }
            }
          } else {
            s4 = peg$FAILED;
          }
        }
        if (s4 !== peg$FAILED) {
          s3 = [s3, s4];
          s2 = s3;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          s1 = input.substring(s1, peg$currPos);
        } else {
          s1 = s2;
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f5(s1);
        }
        s0 = s1;
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e19);
          }
        }
        return s0;
      }
      function peg$parsesign() {
        var s0;
        if (input.charCodeAt(peg$currPos) === 43) {
          s0 = peg$c19;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e22);
          }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 45) {
            s0 = peg$c20;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e23);
            }
          }
        }
        return s0;
      }
      function peg$parseEOL() {
        var s0, s1;
        s0 = peg$currPos;
        peg$silentFails++;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        peg$silentFails--;
        if (s1 === peg$FAILED) {
          s0 = void 0;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      peg$result = peg$startRuleFunction();
      if (peg$result !== peg$FAILED && peg$currPos === input.length) {
        return peg$result;
      } else {
        if (peg$result !== peg$FAILED && peg$currPos < input.length) {
          peg$fail(peg$endExpectation());
        }
        throw peg$buildStructuredError(
          peg$maxFailExpected,
          peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
          peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
        );
      }
    }
    return {
      SyntaxError: peg$SyntaxError,
      parse: peg$parse
    };
  }()
);
var tikz_default = (
  // Generated by Peggy 2.0.1.
  //
  // https://peggyjs.org/
  function() {
    "use strict";
    function peg$subclass(child, parent) {
      function C() {
        this.constructor = child;
      }
      C.prototype = parent.prototype;
      child.prototype = new C();
    }
    function peg$SyntaxError(message, expected, found, location) {
      var self = Error.call(this, message);
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(self, peg$SyntaxError.prototype);
      }
      self.expected = expected;
      self.found = found;
      self.location = location;
      self.name = "SyntaxError";
      return self;
    }
    peg$subclass(peg$SyntaxError, Error);
    function peg$padEnd(str, targetLength, padString) {
      padString = padString || " ";
      if (str.length > targetLength) {
        return str;
      }
      targetLength -= str.length;
      padString += padString.repeat(targetLength);
      return str + padString.slice(0, targetLength);
    }
    peg$SyntaxError.prototype.format = function(sources) {
      var str = "Error: " + this.message;
      if (this.location) {
        var src = null;
        var k;
        for (k = 0; k < sources.length; k++) {
          if (sources[k].source === this.location.source) {
            src = sources[k].text.split(/\r\n|\n|\r/g);
            break;
          }
        }
        var s2 = this.location.start;
        var loc = this.location.source + ":" + s2.line + ":" + s2.column;
        if (src) {
          var e = this.location.end;
          var filler = peg$padEnd("", s2.line.toString().length, " ");
          var line = src[s2.line - 1];
          var last = s2.line === e.line ? e.column : line.length + 1;
          var hatLen = last - s2.column || 1;
          str += "\n --> " + loc + "\n" + filler + " |\n" + s2.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
        } else {
          str += "\n at " + loc;
        }
      }
      return str;
    };
    peg$SyntaxError.buildMessage = function(expected, found) {
      var DESCRIBE_EXPECTATION_FNS = {
        literal: function(expectation) {
          return '"' + literalEscape(expectation.text) + '"';
        },
        class: function(expectation) {
          var escapedParts = expectation.parts.map(function(part) {
            return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
          });
          return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
        },
        any: function() {
          return "any character";
        },
        end: function() {
          return "end of input";
        },
        other: function(expectation) {
          return expectation.description;
        }
      };
      function hex(ch) {
        return ch.charCodeAt(0).toString(16).toUpperCase();
      }
      function literalEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function classEscape(s2) {
        return s2.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
          return "\\x0" + hex(ch);
        }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
          return "\\x" + hex(ch);
        });
      }
      function describeExpectation(expectation) {
        return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
      }
      function describeExpected(expected2) {
        var descriptions = expected2.map(describeExpectation);
        var i, j;
        descriptions.sort();
        if (descriptions.length > 0) {
          for (i = 1, j = 1; i < descriptions.length; i++) {
            if (descriptions[i - 1] !== descriptions[i]) {
              descriptions[j] = descriptions[i];
              j++;
            }
          }
          descriptions.length = j;
        }
        switch (descriptions.length) {
          case 1:
            return descriptions[0];
          case 2:
            return descriptions[0] + " or " + descriptions[1];
          default:
            return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
        }
      }
      function describeFound(found2) {
        return found2 ? '"' + literalEscape(found2) + '"' : "end of input";
      }
      return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
    };
    function peg$parse(input, options) {
      options = options !== void 0 ? options : {};
      var peg$FAILED = {};
      var peg$source = options.grammarSource;
      var peg$startRuleFunctions = { path_spec: peg$parsepath_spec, foreach_body: peg$parseforeach_body };
      var peg$startRuleFunction = peg$parsepath_spec;
      var peg$e0 = peg$anyExpectation();
      var peg$e1 = peg$otherExpectation("same line comment");
      var peg$e2 = peg$otherExpectation("own line comment");
      var peg$e3 = peg$otherExpectation("comment");
      var peg$e4 = peg$otherExpectation("floating comment");
      var peg$e5 = peg$otherExpectation("operation");
      var peg$e6 = peg$otherExpectation("=");
      var peg$f0 = function(v) {
        return v;
      };
      var peg$f1 = function(ops) {
        return { type: "path_spec", content: ops };
      };
      var peg$f2 = function(c1, op, comment2) {
        return { op, comment: comment2 };
      };
      var peg$f3 = function(c1, ops, c2, body) {
        const comments = [c1, ...ops.map((x) => x.comment), c2].filter(
          (x) => x
        );
        const attribute = ops.map((x) => x.op.content.content).join(" ");
        return {
          type: "animation",
          comments,
          attribute,
          content: body.content
        };
      };
      var peg$f4 = function(start, b) {
        return { ...b, start, type: "foreach" };
      };
      var peg$f5 = function(c1, variables, options2, c2, c3, list, c4, command) {
        const comments = [c1, c2, c3, c4].filter((x) => x);
        return {
          type: "foreach_body",
          variables,
          options: options2 && options2.content,
          list,
          command,
          comments
        };
      };
      var peg$f6 = function(c1, options2, c2, body) {
        const comments = [c1, c2].filter((x) => x);
        return {
          type: "svg_operation",
          options: options2 && options2.content,
          content: body,
          comments
        };
      };
      var peg$f7 = function(c1, c2, coord, c3, c4, x) {
        return { coord: x, comment: c4 };
      };
      var peg$f8 = function(c1, c2, coord, c3, a, c5) {
        const comments = [c1, c2, c3, a && a.comment, c5].filter((x) => x);
        return {
          type: "curve_to",
          controls: a ? [coord, a.coord] : [coord],
          comments
        };
      };
      var peg$f9 = function() {
        return { type: "line_to", command: "|-" };
      };
      var peg$f10 = function() {
        return { type: "line_to", command: "-|" };
      };
      var peg$f11 = function() {
        return { type: "line_to", command: "--" };
      };
      var peg$f12 = function(prefix, content) {
        return { type: "coordinate", content, prefix };
      };
      var peg$f13 = function(content) {
        return { type: "square_brace_group", content };
      };
      var peg$f14 = function(v) {
        return { type: "unknown", content: v };
      };
      var peg$f15 = function(tok) {
        return options.isSameLineComment(tok);
      };
      var peg$f16 = function(tok) {
        return tok;
      };
      var peg$f17 = function(tok) {
        return options.isOwnLineComment(tok);
      };
      var peg$f18 = function(tok) {
        return tok;
      };
      var peg$f19 = function(tok) {
        return options.isComment(tok);
      };
      var peg$f20 = function(tok) {
        return tok;
      };
      var peg$f21 = function(tok) {
        return options.isWhitespace(tok);
      };
      var peg$f22 = function(tok) {
        return tok;
      };
      var peg$f23 = function(c) {
        return c;
      };
      var peg$f24 = function(tok) {
        return options.isOperation(tok);
      };
      var peg$f25 = function(tok) {
        return { type: "operation", content: tok };
      };
      var peg$f26 = function(tok) {
        return options.isChar(tok, "=");
      };
      var peg$f27 = function(tok) {
        return tok;
      };
      var peg$f28 = function(tok) {
        return options.isChar(tok, "[");
      };
      var peg$f29 = function(tok) {
        return tok;
      };
      var peg$f30 = function(tok) {
        return options.isChar(tok, "]");
      };
      var peg$f31 = function(tok) {
        return tok;
      };
      var peg$f32 = function(tok) {
        return options.isChar(tok, "(");
      };
      var peg$f33 = function(tok) {
        return tok;
      };
      var peg$f34 = function(tok) {
        return options.isChar(tok, ")");
      };
      var peg$f35 = function(tok) {
        return tok;
      };
      var peg$f36 = function(tok) {
        return options.isChar(tok, "+");
      };
      var peg$f37 = function(tok) {
        return tok;
      };
      var peg$f38 = function(tok) {
        return options.isChar(tok, "-");
      };
      var peg$f39 = function(tok) {
        return tok;
      };
      var peg$f40 = function(tok) {
        return options.isChar(tok, "|");
      };
      var peg$f41 = function(tok) {
        return tok;
      };
      var peg$f42 = function(tok) {
        return options.isChar(tok, ".");
      };
      var peg$f43 = function(tok) {
        return tok;
      };
      var peg$f44 = function(tok) {
        return options.isChar(tok, "controls");
      };
      var peg$f45 = function(tok) {
        return tok;
      };
      var peg$f46 = function(tok) {
        return options.isChar(tok, "and");
      };
      var peg$f47 = function(tok) {
        return tok;
      };
      var peg$f48 = function(tok) {
        return options.isChar(tok, "svg");
      };
      var peg$f49 = function(tok) {
        return tok;
      };
      var peg$f50 = function(tok) {
        return options.isGroup(tok);
      };
      var peg$f51 = function(tok) {
        return tok;
      };
      var peg$f52 = function(tok) {
        return options.isAnyMacro(tok);
      };
      var peg$f53 = function(tok) {
        return tok;
      };
      var peg$f54 = function(tok) {
        return options.isChar(tok, "foreach");
      };
      var peg$f55 = function(tok) {
        return tok;
      };
      var peg$f56 = function(tok) {
        return options.isMacro(tok, "foreach");
      };
      var peg$f57 = function(tok) {
        return tok;
      };
      var peg$f58 = function(tok) {
        return options.isChar(tok, "in");
      };
      var peg$f59 = function(tok) {
        return tok;
      };
      var peg$f60 = function(tok) {
        return options.isChar(tok, ":");
      };
      var peg$f61 = function(tok) {
        return tok;
      };
      var peg$currPos = 0;
      var peg$savedPos = 0;
      var peg$posDetailsCache = [{ line: 1, column: 1 }];
      var peg$maxFailPos = 0;
      var peg$maxFailExpected = [];
      var peg$silentFails = 0;
      var peg$result;
      if ("startRule" in options) {
        if (!(options.startRule in peg$startRuleFunctions)) {
          throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
        }
        peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
      }
      function text() {
        return input.substring(peg$savedPos, peg$currPos);
      }
      function offset() {
        return peg$savedPos;
      }
      function range() {
        return {
          source: peg$source,
          start: peg$savedPos,
          end: peg$currPos
        };
      }
      function location() {
        return peg$computeLocation(peg$savedPos, peg$currPos);
      }
      function expected(description, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildStructuredError(
          [peg$otherExpectation(description)],
          input.substring(peg$savedPos, peg$currPos),
          location2
        );
      }
      function error(message, location2) {
        location2 = location2 !== void 0 ? location2 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildSimpleError(message, location2);
      }
      function peg$literalExpectation(text2, ignoreCase) {
        return { type: "literal", text: text2, ignoreCase };
      }
      function peg$classExpectation(parts, inverted, ignoreCase) {
        return { type: "class", parts, inverted, ignoreCase };
      }
      function peg$anyExpectation() {
        return { type: "any" };
      }
      function peg$endExpectation() {
        return { type: "end" };
      }
      function peg$otherExpectation(description) {
        return { type: "other", description };
      }
      function peg$computePosDetails(pos) {
        var details = peg$posDetailsCache[pos];
        var p;
        if (details) {
          return details;
        } else {
          p = pos - 1;
          while (!peg$posDetailsCache[p]) {
            p--;
          }
          details = peg$posDetailsCache[p];
          details = {
            line: details.line,
            column: details.column
          };
          while (p < pos) {
            if (input.charCodeAt(p) === 10) {
              details.line++;
              details.column = 1;
            } else {
              details.column++;
            }
            p++;
          }
          peg$posDetailsCache[pos] = details;
          return details;
        }
      }
      function peg$computeLocation(startPos, endPos) {
        var startPosDetails = peg$computePosDetails(startPos);
        var endPosDetails = peg$computePosDetails(endPos);
        return {
          source: peg$source,
          start: {
            offset: startPos,
            line: startPosDetails.line,
            column: startPosDetails.column
          },
          end: {
            offset: endPos,
            line: endPosDetails.line,
            column: endPosDetails.column
          }
        };
      }
      function peg$fail(expected2) {
        if (peg$currPos < peg$maxFailPos) {
          return;
        }
        if (peg$currPos > peg$maxFailPos) {
          peg$maxFailPos = peg$currPos;
          peg$maxFailExpected = [];
        }
        peg$maxFailExpected.push(expected2);
      }
      function peg$buildSimpleError(message, location2) {
        return new peg$SyntaxError(message, null, null, location2);
      }
      function peg$buildStructuredError(expected2, found, location2) {
        return new peg$SyntaxError(
          peg$SyntaxError.buildMessage(expected2, found),
          expected2,
          found,
          location2
        );
      }
      function peg$parsepath_spec() {
        var s0, s1, s2, s3, s4, s5;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$currPos;
        s3 = peg$parsesquare_brace_group();
        if (s3 === peg$FAILED) {
          s3 = peg$parsecoordinate();
          if (s3 === peg$FAILED) {
            s3 = peg$parsecurve_to();
            if (s3 === peg$FAILED) {
              s3 = peg$parseline_to();
              if (s3 === peg$FAILED) {
                s3 = peg$parsesvg();
                if (s3 === peg$FAILED) {
                  s3 = peg$parseforeach();
                  if (s3 === peg$FAILED) {
                    s3 = peg$parseoperation();
                    if (s3 === peg$FAILED) {
                      s3 = peg$parsecomment();
                      if (s3 === peg$FAILED) {
                        s3 = peg$parseanimation();
                        if (s3 === peg$FAILED) {
                          s3 = peg$parseunknown();
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$parse_();
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$parse_();
          }
          peg$savedPos = s2;
          s2 = peg$f0(s3);
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$currPos;
            s3 = peg$parsesquare_brace_group();
            if (s3 === peg$FAILED) {
              s3 = peg$parsecoordinate();
              if (s3 === peg$FAILED) {
                s3 = peg$parsecurve_to();
                if (s3 === peg$FAILED) {
                  s3 = peg$parseline_to();
                  if (s3 === peg$FAILED) {
                    s3 = peg$parsesvg();
                    if (s3 === peg$FAILED) {
                      s3 = peg$parseforeach();
                      if (s3 === peg$FAILED) {
                        s3 = peg$parseoperation();
                        if (s3 === peg$FAILED) {
                          s3 = peg$parsecomment();
                          if (s3 === peg$FAILED) {
                            s3 = peg$parseanimation();
                            if (s3 === peg$FAILED) {
                              s3 = peg$parseunknown();
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            if (s3 !== peg$FAILED) {
              s4 = [];
              s5 = peg$parse_();
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = peg$parse_();
              }
              peg$savedPos = s2;
              s2 = peg$f0(s3);
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          }
        } else {
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f1(s1);
        }
        s0 = s1;
        return s0;
      }
      function peg$parseanimation() {
        var s0, s1, s2, s3, s4, s5, s6;
        s0 = peg$currPos;
        s1 = peg$parsecolon();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_comment_();
          s3 = [];
          s4 = peg$currPos;
          s5 = peg$parseoperation();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_comment_();
            peg$savedPos = s4;
            s4 = peg$f2(s2, s5, s6);
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 !== peg$FAILED) {
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$currPos;
              s5 = peg$parseoperation();
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_comment_();
                peg$savedPos = s4;
                s4 = peg$f2(s2, s5, s6);
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            }
          } else {
            s3 = peg$FAILED;
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseequals();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_comment_();
              s6 = peg$parsegroup();
              if (s6 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f3(s2, s3, s5, s6);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseforeach() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$parseforeach_keyword();
        if (s1 === peg$FAILED) {
          s1 = peg$parseforeach_macro();
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseforeach_body();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f4(s1, s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseforeach_body() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;
        s0 = peg$currPos;
        s1 = peg$parse_comment_();
        s2 = peg$currPos;
        s3 = [];
        s4 = peg$currPos;
        s5 = peg$currPos;
        peg$silentFails++;
        s6 = peg$parsein_keyword();
        if (s6 === peg$FAILED) {
          s6 = peg$parsesquare_brace_group();
        }
        peg$silentFails--;
        if (s6 === peg$FAILED) {
          s5 = void 0;
        } else {
          peg$currPos = s5;
          s5 = peg$FAILED;
        }
        if (s5 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s6 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s6 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e0);
            }
          }
          if (s6 !== peg$FAILED) {
            s5 = [s5, s6];
            s4 = s5;
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$currPos;
          s5 = peg$currPos;
          peg$silentFails++;
          s6 = peg$parsein_keyword();
          if (s6 === peg$FAILED) {
            s6 = peg$parsesquare_brace_group();
          }
          peg$silentFails--;
          if (s6 === peg$FAILED) {
            s5 = void 0;
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          if (s5 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s6 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e0);
              }
            }
            if (s6 !== peg$FAILED) {
              s5 = [s5, s6];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
        }
        s2 = input.substring(s2, peg$currPos);
        s3 = peg$parsesquare_brace_group();
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        s4 = peg$parse_comment_();
        s5 = peg$parsein_keyword();
        if (s5 !== peg$FAILED) {
          s6 = peg$parse_comment_();
          s7 = peg$parsegroup();
          if (s7 === peg$FAILED) {
            s7 = peg$parsemacro();
          }
          if (s7 !== peg$FAILED) {
            s8 = peg$parse_comment_();
            s9 = peg$parseforeach();
            if (s9 === peg$FAILED) {
              s9 = peg$parsegroup();
              if (s9 === peg$FAILED) {
                s9 = peg$parsemacro();
              }
            }
            if (s9 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f5(s1, s2, s3, s4, s6, s7, s8, s9);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsesvg() {
        var s0, s1, s2, s3, s4, s5;
        s0 = peg$currPos;
        s1 = peg$parsesvg_keyword();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_comment_();
          s3 = peg$parsesquare_brace_group();
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          s4 = peg$parse_comment_();
          s5 = peg$parsegroup();
          if (s5 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f6(s2, s3, s4, s5);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsecurve_to() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;
        s0 = peg$currPos;
        s1 = peg$parsedotdot();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_comment_();
          s3 = peg$parsecontrols_keyword();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_comment_();
            s5 = peg$parsecoordinate();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_comment_();
              s7 = peg$currPos;
              s8 = peg$parseand_keyword();
              if (s8 !== peg$FAILED) {
                s9 = peg$parse_comment_();
                s10 = peg$parsecoordinate();
                if (s10 !== peg$FAILED) {
                  peg$savedPos = s7;
                  s7 = peg$f7(s2, s4, s5, s6, s9, s10);
                } else {
                  peg$currPos = s7;
                  s7 = peg$FAILED;
                }
              } else {
                peg$currPos = s7;
                s7 = peg$FAILED;
              }
              if (s7 === peg$FAILED) {
                s7 = null;
              }
              s8 = peg$parse_comment_();
              s9 = peg$parsedotdot();
              if (s9 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f8(s2, s4, s5, s6, s7, s8);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseline_to() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$parsepipe();
        if (s1 !== peg$FAILED) {
          s2 = peg$parseminus();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f9();
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parseminus();
          if (s1 !== peg$FAILED) {
            s2 = peg$parsepipe();
            if (s2 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f10();
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parseminus();
            if (s1 !== peg$FAILED) {
              s2 = peg$parseminus();
              if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f11();
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          }
        }
        return s0;
      }
      function peg$parsecoordinate() {
        var s0, s1, s2, s3, s4, s5, s6, s7;
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = peg$currPos;
        s3 = peg$parseplus();
        if (s3 !== peg$FAILED) {
          s4 = peg$parseplus();
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          s3 = [s3, s4];
          s2 = s3;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        s1 = input.substring(s1, peg$currPos);
        s2 = peg$parseopen_paren();
        if (s2 !== peg$FAILED) {
          s3 = peg$currPos;
          s4 = [];
          s5 = peg$currPos;
          s6 = peg$currPos;
          peg$silentFails++;
          s7 = peg$parseclose_paren();
          peg$silentFails--;
          if (s7 === peg$FAILED) {
            s6 = void 0;
          } else {
            peg$currPos = s6;
            s6 = peg$FAILED;
          }
          if (s6 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s7 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s7 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e0);
              }
            }
            if (s7 !== peg$FAILED) {
              s6 = [s6, s7];
              s5 = s6;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$currPos;
            s6 = peg$currPos;
            peg$silentFails++;
            s7 = peg$parseclose_paren();
            peg$silentFails--;
            if (s7 === peg$FAILED) {
              s6 = void 0;
            } else {
              peg$currPos = s6;
              s6 = peg$FAILED;
            }
            if (s6 !== peg$FAILED) {
              if (input.length > peg$currPos) {
                s7 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s7 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e0);
                }
              }
              if (s7 !== peg$FAILED) {
                s6 = [s6, s7];
                s5 = s6;
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          }
          s3 = input.substring(s3, peg$currPos);
          s4 = peg$parseclose_paren();
          if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f12(s1, s3);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsesquare_brace_group() {
        var s0, s1, s2, s3, s4, s5, s6;
        s0 = peg$currPos;
        s1 = peg$parseopen_square_brace();
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          s3 = [];
          s4 = peg$currPos;
          s5 = peg$currPos;
          peg$silentFails++;
          s6 = peg$parseclose_square_brace();
          peg$silentFails--;
          if (s6 === peg$FAILED) {
            s5 = void 0;
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          if (s5 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s6 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e0);
              }
            }
            if (s6 !== peg$FAILED) {
              s5 = [s5, s6];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$currPos;
            s5 = peg$currPos;
            peg$silentFails++;
            s6 = peg$parseclose_square_brace();
            peg$silentFails--;
            if (s6 === peg$FAILED) {
              s5 = void 0;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
            if (s5 !== peg$FAILED) {
              if (input.length > peg$currPos) {
                s6 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e0);
                }
              }
              if (s6 !== peg$FAILED) {
                s5 = [s5, s6];
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          }
          s2 = input.substring(s2, peg$currPos);
          s3 = peg$parseclose_square_brace();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f13(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsedotdot() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = peg$parsedot();
        if (s1 !== peg$FAILED) {
          s2 = peg$parsedot();
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseunknown() {
        var s0, s1;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f14(s1);
        }
        s0 = s1;
        return s0;
      }
      function peg$parsesame_line_comment() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f15(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f16(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e1);
          }
        }
        return s0;
      }
      function peg$parseown_line_comment() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f17(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f18(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e2);
          }
        }
        return s0;
      }
      function peg$parsecomment() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f19(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f20(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
        return s0;
      }
      function peg$parse_() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f21(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f22(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parse_comment_() {
        var s0, s1, s2, s3, s4;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_();
        }
        s2 = peg$parsecomment();
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        s3 = [];
        s4 = peg$parse_();
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$parse_();
        }
        peg$savedPos = s0;
        s0 = peg$f23(s2);
        peg$silentFails--;
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e4);
        }
        return s0;
      }
      function peg$parseoperation() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f24(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f25(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e5);
          }
        }
        return s0;
      }
      function peg$parseequals() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f26(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f27(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e6);
          }
        }
        return s0;
      }
      function peg$parseopen_square_brace() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f28(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f29(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseclose_square_brace() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f30(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f31(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseopen_paren() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f32(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f33(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseclose_paren() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f34(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f35(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseplus() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f36(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f37(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseminus() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f38(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f39(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsepipe() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f40(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f41(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsedot() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f42(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f43(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsecontrols_keyword() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f44(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f45(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseand_keyword() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f46(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f47(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsesvg_keyword() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f48(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f49(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsegroup() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f50(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f51(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsemacro() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f52(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f53(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseforeach_keyword() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f54(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f55(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseforeach_macro() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f56(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f57(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsein_keyword() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f58(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f59(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parsecolon() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = peg$currPos;
          s2 = peg$f60(s1);
          if (s2) {
            s2 = void 0;
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f61(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      function peg$parseEOL() {
        var s0, s1;
        s0 = peg$currPos;
        peg$silentFails++;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        peg$silentFails--;
        if (s1 === peg$FAILED) {
          s0 = void 0;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        return s0;
      }
      if (!options.isWhitespace) {
        try {
          Object.assign(options, {
            isChar: (node, char) => node.type === "string" && node.content === char,
            isOperation: (node) => node.type === "string" && node.content.match(/[a-zA-Z]/),
            isWhitespace: (node) => node.type === "whitespace" || node.type === "parbreak",
            isSameLineComment: (node) => node.type === "comment" && node.sameline,
            isOwnLineComment: (node) => node.type === "comment" && !node.sameline,
            isComment: (node) => node.type === "comment",
            isGroup: (node) => node.type === "group",
            isMacro: (node, name) => node.type === "macro" && node.content === name,
            isAnyMacro: (node) => node.type === "macro"
          });
        } catch (e) {
          console.warn("Error when initializing parser", e);
        }
      }
      peg$result = peg$startRuleFunction();
      if (peg$result !== peg$FAILED && peg$currPos === input.length) {
        return peg$result;
      } else {
        if (peg$result !== peg$FAILED && peg$currPos < input.length) {
          peg$fail(peg$endExpectation());
        }
        throw peg$buildStructuredError(
          peg$maxFailExpected,
          peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
          peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
        );
      }
    }
    return {
      SyntaxError: peg$SyntaxError,
      parse: peg$parse
    };
  }()
);
var ArgSpecPegParser = xparse_argspec_default;

// ../unified-latex-util-argspec/dist/index.js
var parseCache = {};
function parse(str = "") {
  parseCache[str] = parseCache[str] || ArgSpecPegParser.parse(str);
  return parseCache[str];
}

// ../unified-latex-builder/dist/index.js
var BRACES_MAP = {
  "*": { openMark: "", closeMark: "" },
  "{": { openMark: "{", closeMark: "}" },
  "[": { openMark: "[", closeMark: "]" },
  "(": { openMark: "(", closeMark: ")" },
  "<": { openMark: "<", closeMark: ">" }
};
var CLOSE_BRACES = new Set(
  Object.values(BRACES_MAP).map((x) => x.closeMark).filter((x) => x)
);
function bracesToOpenAndCloseMarks(braces) {
  const ret = [];
  for (const char of braces.split("")) {
    if (CLOSE_BRACES.has(char)) {
      continue;
    }
    const braces2 = BRACES_MAP[char];
    if (braces2 == null) {
      throw new Error(`Unknown open/close mark type "${char}"`);
    }
    braces2;
    ret.push(braces2);
  }
  return ret;
}
function arg(args2, special) {
  if (args2 == null) {
    return { type: "argument", content: [], openMark: "", closeMark: "" };
  }
  if (typeof args2 === "string") {
    args2 = s(args2);
  }
  if (!Array.isArray(args2) && args2.type === "argument") {
    return args2;
  }
  let openMark = (special == null ? void 0 : special.openMark) ?? "{";
  let closeMark = (special == null ? void 0 : special.closeMark) ?? "}";
  if (special == null ? void 0 : special.braces) {
    const braces = bracesToOpenAndCloseMarks(special.braces);
    if (braces[0]) {
      openMark = braces[0].openMark;
      closeMark = braces[0].closeMark;
    }
  }
  if (!Array.isArray(args2)) {
    args2 = [args2];
  }
  return { type: "argument", content: args2, openMark, closeMark };
}
function s(value) {
  if (typeof value === "string") {
    return { type: "string", content: value };
  }
  return value;
}

// ../unified-latex-util-scan/dist/index.js
var import_trie_prefix_tree = __toESM(require_dist(), 1);
function scan(nodes, token, options) {
  const { startIndex, onlySkipWhitespaceAndComments, allowSubstringMatches } = options || {};
  if (typeof token === "string") {
    token = { type: "string", content: token };
  }
  for (let i = startIndex || 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type === token.type) {
      switch (node.type) {
        case "comment":
        case "displaymath":
        case "inlinemath":
        case "root":
        case "parbreak":
        case "whitespace":
        case "verb":
        case "verbatim":
        case "group":
          return i;
        case "macro":
          if (node.content === token.content) {
            return i;
          }
          break;
        case "environment":
        case "mathenv":
          if (printRaw(node.env) === printRaw(token.env)) {
            return i;
          }
          break;
        case "string":
          if (node.content === token.content) {
            return i;
          }
          if (allowSubstringMatches && node.content.indexOf(token.content) >= 0) {
            return i;
          }
          break;
      }
    }
    if (onlySkipWhitespaceAndComments && !match.whitespace(node) && !match.comment(node)) {
      return null;
    }
  }
  return null;
}

// libs/gobble-single-argument.ts
function gobbleSingleArgument(nodes, argSpec, startPos = 0) {
  if (typeof argSpec === "string" || !argSpec.type) {
    throw new Error(
      `argSpec must be an already-parsed argument specification, not "${JSON.stringify(
        argSpec
      )}"`
    );
  }
  let argument2 = null;
  let currPos = startPos;
  const gobbleWhitespace = argSpec.noLeadingWhitespace ? () => {
  } : () => {
    while (currPos < nodes.length) {
      if (!match.whitespace(nodes[currPos])) {
        break;
      }
      currPos++;
    }
  };
  const openMark = argSpec.openBrace || "";
  const closeMark = argSpec.closeBrace || "";
  const acceptGroup = (argSpec.type === "mandatory" || argSpec.type === "optional") && openMark === "{" && closeMark === "}";
  function findBracePositions() {
    let openMarkPos = null;
    if (openMark) {
      openMarkPos = nodes.findIndex(
        (node, i) => i >= currPos && match.string(node, openMark)
      );
      if (openMarkPos < currPos) {
        openMarkPos = null;
      }
    }
    let closeMarkPos = null;
    if (openMarkPos != null) {
      closeMarkPos = nodes.findIndex(
        (node, i) => i >= openMarkPos + 1 && match.string(node, closeMark)
      );
      if (closeMarkPos < openMarkPos + 1) {
        closeMarkPos = null;
      }
    }
    return [openMarkPos, closeMarkPos];
  }
  gobbleWhitespace();
  const currNode = nodes[currPos];
  if (currNode == null || match.comment(currNode) || match.parbreak(currNode)) {
    return { argument: argument2, nodesRemoved: 0 };
  }
  switch (argSpec.type) {
    case "mandatory":
      if (acceptGroup) {
        let content = [currNode];
        if (match.group(currNode)) {
          content = currNode.content;
        }
        argument2 = arg(content, {
          openMark,
          closeMark
        });
        currPos++;
        break;
      }
    case "optional":
      if (acceptGroup && match.group(currNode)) {
        argument2 = arg(currNode.content, {
          openMark,
          closeMark
        });
        currPos++;
        break;
      }
      if (match.string(currNode, openMark)) {
        const [openMarkPos, closeMarkPos] = findBracePositions();
        if (openMarkPos != null && closeMarkPos != null) {
          argument2 = arg(nodes.slice(openMarkPos + 1, closeMarkPos), {
            openMark,
            closeMark
          });
          currPos = closeMarkPos + 1;
          break;
        }
      }
      break;
    case "optionalStar":
    case "optionalToken":
      if (match.string(
        currNode,
        argSpec.type === "optionalStar" ? "*" : argSpec.token
      )) {
        argument2 = arg([currNode], { openMark: "", closeMark: "" });
        currPos++;
        break;
      }
      break;
    case "until": {
      if (argSpec.stopTokens.length > 1) {
        console.warn(
          `"until" matches with multi-token stop conditions are not yet implemented`
        );
        break;
      }
      const rawToken = argSpec.stopTokens[0];
      const stopToken = rawToken === " " ? { type: "whitespace" } : { type: "string", content: argSpec.stopTokens[0] };
      let matchPos = scan(nodes, stopToken, {
        startIndex: startPos,
        allowSubstringMatches: true
      });
      if (matchPos != null && partialStringMatch(nodes[matchPos], stopToken)) {
        console.warn(
          `"until" arguments that stop at non-punctuation symbols is not yet implemented`
        );
        break;
      }
      if (matchPos == null) {
        break;
      }
      argument2 = arg(nodes.slice(startPos, matchPos), {
        openMark: "",
        closeMark: rawToken
      });
      currPos = matchPos;
      if (currPos < nodes.length) {
        currPos++;
      }
      break;
    }
    default:
      console.warn(
        `Don't know how to find an argument of argspec type "${argSpec.type}"`
      );
  }
  const nodesRemoved = argument2 ? currPos - startPos : 0;
  nodes.splice(startPos, nodesRemoved);
  return { argument: argument2, nodesRemoved };
}
function partialStringMatch(node, token) {
  return match.anyString(node) && match.anyString(token) && node.content.length > token.content.length;
}

// libs/gobble-arguments.ts
function gobbleArguments(nodes, argSpec, startPos = 0) {
  if (typeof argSpec === "function") {
    return argSpec(nodes, startPos);
  }
  if (typeof argSpec === "string") {
    argSpec = parse(argSpec);
  }
  const args = [];
  let nodesRemoved = 0;
  for (const spec of argSpec) {
    const { argument: argument2, nodesRemoved: removed } = gobbleSingleArgument(
      nodes,
      spec,
      startPos
    );
    if (argument2) {
      args.push(argument2);
      nodesRemoved += removed;
    } else {
      args.push(arg([], { openMark: "", closeMark: "" }));
    }
  }
  return { args, nodesRemoved };
}

// ../unified-latex-util-visit/dist/index.js
function listMathChildren(node) {
  const NULL_RETURN = { enter: [], leave: [] };
  if (Array.isArray(node)) {
    return NULL_RETURN;
  }
  if (match.math(node)) {
    return { enter: ["content"], leave: [] };
  }
  const renderInfo = node._renderInfo || {};
  if (renderInfo.inMathMode == null) {
    return NULL_RETURN;
  }
  if (match.macro(node)) {
    if (renderInfo.inMathMode === true) {
      return { enter: ["args"], leave: [] };
    } else if (renderInfo.inMathMode === false) {
      return { enter: [], leave: ["args"] };
    }
  }
  if (match.environment(node)) {
    if (renderInfo.inMathMode === true) {
      return { enter: ["content"], leave: [] };
    } else {
      return { enter: [], leave: ["content"] };
    }
  }
  return NULL_RETURN;
}
var CONTINUE = Symbol("continue");
var SKIP = Symbol("skip");
var EXIT = Symbol("exit");
var DEFAULT_CONTEXT = {
  inMathMode: false,
  hasMathModeAncestor: false
};
function visit(tree, visitor, options) {
  const {
    startingContext = DEFAULT_CONTEXT,
    test = () => true,
    includeArrays = false
  } = options || {};
  let enter;
  let leave;
  if (typeof visitor === "function") {
    enter = visitor;
  } else if (visitor && typeof visitor === "object") {
    enter = visitor.enter;
    leave = visitor.leave;
  }
  walk(tree, {
    key: void 0,
    index: void 0,
    parents: [],
    containingArray: void 0,
    context: { ...startingContext }
  });
  function walk(node, { key, index, parents, context, containingArray }) {
    const nodePassesTest = includeArrays ? test(node, { key, index, parents, context, containingArray }) : !Array.isArray(node) && test(node, { key, index, parents, context, containingArray });
    const result = enter && nodePassesTest ? toResult(
      enter(node, {
        key,
        index,
        parents,
        context,
        containingArray
      })
    ) : [CONTINUE];
    if (result[0] === EXIT) {
      return result;
    }
    if (result[0] === SKIP) {
      return leave && nodePassesTest ? toResult(
        leave(node, {
          key,
          index,
          parents,
          context,
          containingArray
        })
      ) : result;
    }
    if (Array.isArray(node)) {
      for (let index2 = 0; index2 > -1 && index2 < node.length; index2++) {
        const item = node[index2];
        const result2 = walk(item, {
          key,
          index: index2,
          parents,
          context,
          containingArray: node
        });
        if (result2[0] === EXIT) {
          return result2;
        }
        if (typeof result2[1] === "number") {
          index2 = result2[1] - 1;
        }
      }
    } else {
      let childProps = ["content", "args"];
      switch (node.type) {
        case "macro":
          childProps = ["args"];
          break;
        case "comment":
        case "string":
        case "verb":
        case "verbatim":
          childProps = [];
          break;
        default:
          break;
      }
      const mathModeProps = listMathChildren(node);
      for (const key2 of childProps) {
        const value = node[key2];
        const grandparents = [node].concat(parents);
        if (value == null) {
          continue;
        }
        const newContext = { ...context };
        if (mathModeProps.enter.includes(key2)) {
          newContext.inMathMode = true;
          newContext.hasMathModeAncestor = true;
        } else if (mathModeProps.leave.includes(key2)) {
          newContext.inMathMode = false;
        }
        const result2 = walk(value, {
          key: key2,
          index: void 0,
          parents: grandparents,
          context: newContext,
          containingArray: void 0
        });
        if (result2[0] === EXIT) {
          return result2;
        }
      }
    }
    return leave && nodePassesTest ? toResult(
      leave(node, {
        key,
        index,
        parents,
        context,
        containingArray
      })
    ) : result;
  }
}
function toResult(value) {
  if (value == null) {
    return [CONTINUE];
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "number") {
    return [CONTINUE, value];
  }
  return [value];
}

// ../unified-latex-util-render-info/dist/index.js
function updateRenderInfo(node, renderInfo) {
  if (renderInfo != null) {
    node._renderInfo = { ...node._renderInfo || {}, ...renderInfo };
  }
  return node;
}

// libs/attach-arguments.ts
function attachMacroArgsInArray(nodes, macros) {
  let currIndex;
  const isRelevantMacro = match.createMacroMatcher(macros);
  function gobbleUntilMacro() {
    while (currIndex >= 0 && !isRelevantMacro(nodes[currIndex])) {
      currIndex--;
    }
  }
  currIndex = nodes.length - 1;
  while (currIndex >= 0) {
    gobbleUntilMacro();
    if (currIndex < 0) {
      return;
    }
    const macroIndex = currIndex;
    const macro2 = nodes[macroIndex];
    const macroName = macro2.content;
    const macroInfo = macros[macroName];
    updateRenderInfo(macro2, macroInfo.renderInfo);
    const signatureOrParser = macroInfo.argumentParser || macroInfo.signature;
    if (signatureOrParser == null) {
      currIndex--;
      continue;
    }
    if (macro2.args != null) {
      currIndex = macroIndex - 1;
      continue;
    }
    currIndex++;
    const { args } = gobbleArguments(nodes, signatureOrParser, currIndex);
    macro2.args = args;
    currIndex = macroIndex - 1;
  }
}
function attachMacroArgs(tree, macros) {
  visit(
    tree,
    (nodes) => {
      attachMacroArgsInArray(nodes, macros);
    },
    { includeArrays: true, test: Array.isArray }
  );
}

// libs/unified-latex-attach-macro-arguments.ts
var unifiedLatexAttachMacroArguments = function unifiedLatexAttachMacroArguments2(options) {
  return (tree) => {
    const { macros = {} } = options || {};
    if (Object.keys(macros).length === 0) {
      console.warn(
        "Attempting to attach macro arguments but no macros are specified."
      );
    }
    visit(
      tree,
      (nodes) => {
        attachMacroArgsInArray(nodes, macros);
      },
      { includeArrays: true, test: Array.isArray }
    );
  };
};

// libs/get-args-content.ts
function getArgsContent(node) {
  if (!Array.isArray(node.args)) {
    return [];
  }
  return node.args.map((arg2) => {
    if (arg2.openMark === "" && arg2.content.length === 0) {
      return null;
    }
    return arg2.content;
  });
}
function getNamedArgsContent(node, namedArgumentsFallback = []) {
  var _a;
  const names = ((_a = node._renderInfo) == null ? void 0 : _a.namedArguments) || namedArgumentsFallback;
  if (!Array.isArray(node.args) || !Array.isArray(names) || names.length === 0) {
    return {};
  }
  const ret = {};
  node.args.forEach((arg2, i) => {
    const name = names[i];
    if (name == null) {
      return;
    }
    let val = arg2.content;
    if (arg2.openMark === "" && arg2.content.length === 0) {
      val = null;
    }
    ret[name] = val;
  });
  return ret;
}
//# sourceMappingURL=index.cjs.map
