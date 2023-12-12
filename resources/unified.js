"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
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

  // ../node_modules/is-buffer/index.js
  var require_is_buffer = __commonJS({
    "../node_modules/is-buffer/index.js"(exports, module) {
      module.exports = function isBuffer2(obj) {
        return obj != null && obj.constructor != null && typeof obj.constructor.isBuffer === "function" && obj.constructor.isBuffer(obj);
      };
    }
  });

  // ../node_modules/extend/index.js
  var require_extend = __commonJS({
    "../node_modules/extend/index.js"(exports, module) {
      "use strict";
      var hasOwn = Object.prototype.hasOwnProperty;
      var toStr = Object.prototype.toString;
      var defineProperty = Object.defineProperty;
      var gOPD = Object.getOwnPropertyDescriptor;
      var isArray = function isArray2(arr) {
        if (typeof Array.isArray === "function") {
          return Array.isArray(arr);
        }
        return toStr.call(arr) === "[object Array]";
      };
      var isPlainObject2 = function isPlainObject3(obj) {
        if (!obj || toStr.call(obj) !== "[object Object]") {
          return false;
        }
        var hasOwnConstructor = hasOwn.call(obj, "constructor");
        var hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, "isPrototypeOf");
        if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
          return false;
        }
        var key;
        for (key in obj) {
        }
        return typeof key === "undefined" || hasOwn.call(obj, key);
      };
      var setProperty = function setProperty2(target, options) {
        if (defineProperty && options.name === "__proto__") {
          defineProperty(target, options.name, {
            enumerable: true,
            configurable: true,
            value: options.newValue,
            writable: true
          });
        } else {
          target[options.name] = options.newValue;
        }
      };
      var getProperty = function getProperty2(obj, name) {
        if (name === "__proto__") {
          if (!hasOwn.call(obj, name)) {
            return void 0;
          } else if (gOPD) {
            return gOPD(obj, name).value;
          }
        }
        return obj[name];
      };
      module.exports = function extend2() {
        var options, name, src, copy, copyIsArray, clone2;
        var target = arguments[0];
        var i = 1;
        var length = arguments.length;
        var deep = false;
        if (typeof target === "boolean") {
          deep = target;
          target = arguments[1] || {};
          i = 2;
        }
        if (target == null || typeof target !== "object" && typeof target !== "function") {
          target = {};
        }
        for (; i < length; ++i) {
          options = arguments[i];
          if (options != null) {
            for (name in options) {
              src = getProperty(target, name);
              copy = getProperty(options, name);
              if (target !== copy) {
                if (deep && copy && (isPlainObject2(copy) || (copyIsArray = isArray(copy)))) {
                  if (copyIsArray) {
                    copyIsArray = false;
                    clone2 = src && isArray(src) ? src : [];
                  } else {
                    clone2 = src && isPlainObject2(src) ? src : {};
                  }
                  setProperty(target, { name, newValue: extend2(deep, clone2, copy) });
                } else if (typeof copy !== "undefined") {
                  setProperty(target, { name, newValue: copy });
                }
              }
            }
          }
        }
        return target;
      };
    }
  });

  // ../node_modules/trie-prefix-tree/dist/config.js
  var require_config = __commonJS({
    "../node_modules/trie-prefix-tree/dist/config.js"(exports, module) {
      "use strict";
      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.default = {
        END_WORD: "$",
        END_WORD_REPLACER: "9a219a89-91cd-42e2-abd5-eb113af08ca8",
        PERMS_MIN_LEN: 2
      };
      module.exports = exports["default"];
    }
  });

  // ../node_modules/trie-prefix-tree/dist/append.js
  var require_append = __commonJS({
    "../node_modules/trie-prefix-tree/dist/append.js"(exports, module) {
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
      function append(trie, letter, index2, array) {
        var isEndWordLetter = letter === _config2.default.END_WORD;
        var isLastLetter = index2 === array.length - 1;
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
      module.exports = exports["default"];
    }
  });

  // ../node_modules/trie-prefix-tree/dist/create.js
  var require_create = __commonJS({
    "../node_modules/trie-prefix-tree/dist/create.js"(exports, module) {
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
      module.exports = exports["default"];
    }
  });

  // ../node_modules/trie-prefix-tree/dist/utils.js
  var require_utils = __commonJS({
    "../node_modules/trie-prefix-tree/dist/utils.js"(exports, module) {
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
      module.exports = exports["default"];
    }
  });

  // ../node_modules/trie-prefix-tree/dist/checkPrefix.js
  var require_checkPrefix = __commonJS({
    "../node_modules/trie-prefix-tree/dist/checkPrefix.js"(exports, module) {
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
        var prefixFound = input.every(function(letter, index2) {
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
      module.exports = exports["default"];
    }
  });

  // ../node_modules/trie-prefix-tree/dist/recursePrefix.js
  var require_recursePrefix = __commonJS({
    "../node_modules/trie-prefix-tree/dist/recursePrefix.js"(exports, module) {
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
      module.exports = exports["default"];
    }
  });

  // ../node_modules/trie-prefix-tree/dist/recurseRandomWord.js
  var require_recurseRandomWord = __commonJS({
    "../node_modules/trie-prefix-tree/dist/recurseRandomWord.js"(exports, module) {
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
      module.exports = exports["default"];
    }
  });

  // ../node_modules/trie-prefix-tree/dist/permutations.js
  var require_permutations = __commonJS({
    "../node_modules/trie-prefix-tree/dist/permutations.js"(exports, module) {
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
      module.exports = exports["default"];
    }
  });

  // ../node_modules/trie-prefix-tree/dist/index.js
  var require_dist = __commonJS({
    "../node_modules/trie-prefix-tree/dist/index.js"(exports, module) {
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
      module.exports = exports["default"];
    }
  });

  // ../node_modules/color-name/index.js
  var require_color_name = __commonJS({
    "../node_modules/color-name/index.js"(exports, module) {
      "use strict";
      module.exports = {
        "aliceblue": [240, 248, 255],
        "antiquewhite": [250, 235, 215],
        "aqua": [0, 255, 255],
        "aquamarine": [127, 255, 212],
        "azure": [240, 255, 255],
        "beige": [245, 245, 220],
        "bisque": [255, 228, 196],
        "black": [0, 0, 0],
        "blanchedalmond": [255, 235, 205],
        "blue": [0, 0, 255],
        "blueviolet": [138, 43, 226],
        "brown": [165, 42, 42],
        "burlywood": [222, 184, 135],
        "cadetblue": [95, 158, 160],
        "chartreuse": [127, 255, 0],
        "chocolate": [210, 105, 30],
        "coral": [255, 127, 80],
        "cornflowerblue": [100, 149, 237],
        "cornsilk": [255, 248, 220],
        "crimson": [220, 20, 60],
        "cyan": [0, 255, 255],
        "darkblue": [0, 0, 139],
        "darkcyan": [0, 139, 139],
        "darkgoldenrod": [184, 134, 11],
        "darkgray": [169, 169, 169],
        "darkgreen": [0, 100, 0],
        "darkgrey": [169, 169, 169],
        "darkkhaki": [189, 183, 107],
        "darkmagenta": [139, 0, 139],
        "darkolivegreen": [85, 107, 47],
        "darkorange": [255, 140, 0],
        "darkorchid": [153, 50, 204],
        "darkred": [139, 0, 0],
        "darksalmon": [233, 150, 122],
        "darkseagreen": [143, 188, 143],
        "darkslateblue": [72, 61, 139],
        "darkslategray": [47, 79, 79],
        "darkslategrey": [47, 79, 79],
        "darkturquoise": [0, 206, 209],
        "darkviolet": [148, 0, 211],
        "deeppink": [255, 20, 147],
        "deepskyblue": [0, 191, 255],
        "dimgray": [105, 105, 105],
        "dimgrey": [105, 105, 105],
        "dodgerblue": [30, 144, 255],
        "firebrick": [178, 34, 34],
        "floralwhite": [255, 250, 240],
        "forestgreen": [34, 139, 34],
        "fuchsia": [255, 0, 255],
        "gainsboro": [220, 220, 220],
        "ghostwhite": [248, 248, 255],
        "gold": [255, 215, 0],
        "goldenrod": [218, 165, 32],
        "gray": [128, 128, 128],
        "green": [0, 128, 0],
        "greenyellow": [173, 255, 47],
        "grey": [128, 128, 128],
        "honeydew": [240, 255, 240],
        "hotpink": [255, 105, 180],
        "indianred": [205, 92, 92],
        "indigo": [75, 0, 130],
        "ivory": [255, 255, 240],
        "khaki": [240, 230, 140],
        "lavender": [230, 230, 250],
        "lavenderblush": [255, 240, 245],
        "lawngreen": [124, 252, 0],
        "lemonchiffon": [255, 250, 205],
        "lightblue": [173, 216, 230],
        "lightcoral": [240, 128, 128],
        "lightcyan": [224, 255, 255],
        "lightgoldenrodyellow": [250, 250, 210],
        "lightgray": [211, 211, 211],
        "lightgreen": [144, 238, 144],
        "lightgrey": [211, 211, 211],
        "lightpink": [255, 182, 193],
        "lightsalmon": [255, 160, 122],
        "lightseagreen": [32, 178, 170],
        "lightskyblue": [135, 206, 250],
        "lightslategray": [119, 136, 153],
        "lightslategrey": [119, 136, 153],
        "lightsteelblue": [176, 196, 222],
        "lightyellow": [255, 255, 224],
        "lime": [0, 255, 0],
        "limegreen": [50, 205, 50],
        "linen": [250, 240, 230],
        "magenta": [255, 0, 255],
        "maroon": [128, 0, 0],
        "mediumaquamarine": [102, 205, 170],
        "mediumblue": [0, 0, 205],
        "mediumorchid": [186, 85, 211],
        "mediumpurple": [147, 112, 219],
        "mediumseagreen": [60, 179, 113],
        "mediumslateblue": [123, 104, 238],
        "mediumspringgreen": [0, 250, 154],
        "mediumturquoise": [72, 209, 204],
        "mediumvioletred": [199, 21, 133],
        "midnightblue": [25, 25, 112],
        "mintcream": [245, 255, 250],
        "mistyrose": [255, 228, 225],
        "moccasin": [255, 228, 181],
        "navajowhite": [255, 222, 173],
        "navy": [0, 0, 128],
        "oldlace": [253, 245, 230],
        "olive": [128, 128, 0],
        "olivedrab": [107, 142, 35],
        "orange": [255, 165, 0],
        "orangered": [255, 69, 0],
        "orchid": [218, 112, 214],
        "palegoldenrod": [238, 232, 170],
        "palegreen": [152, 251, 152],
        "paleturquoise": [175, 238, 238],
        "palevioletred": [219, 112, 147],
        "papayawhip": [255, 239, 213],
        "peachpuff": [255, 218, 185],
        "peru": [205, 133, 63],
        "pink": [255, 192, 203],
        "plum": [221, 160, 221],
        "powderblue": [176, 224, 230],
        "purple": [128, 0, 128],
        "rebeccapurple": [102, 51, 153],
        "red": [255, 0, 0],
        "rosybrown": [188, 143, 143],
        "royalblue": [65, 105, 225],
        "saddlebrown": [139, 69, 19],
        "salmon": [250, 128, 114],
        "sandybrown": [244, 164, 96],
        "seagreen": [46, 139, 87],
        "seashell": [255, 245, 238],
        "sienna": [160, 82, 45],
        "silver": [192, 192, 192],
        "skyblue": [135, 206, 235],
        "slateblue": [106, 90, 205],
        "slategray": [112, 128, 144],
        "slategrey": [112, 128, 144],
        "snow": [255, 250, 250],
        "springgreen": [0, 255, 127],
        "steelblue": [70, 130, 180],
        "tan": [210, 180, 140],
        "teal": [0, 128, 128],
        "thistle": [216, 191, 216],
        "tomato": [255, 99, 71],
        "turquoise": [64, 224, 208],
        "violet": [238, 130, 238],
        "wheat": [245, 222, 179],
        "white": [255, 255, 255],
        "whitesmoke": [245, 245, 245],
        "yellow": [255, 255, 0],
        "yellowgreen": [154, 205, 50]
      };
    }
  });

  // ../node_modules/is-arrayish/index.js
  var require_is_arrayish = __commonJS({
    "../node_modules/is-arrayish/index.js"(exports, module) {
      module.exports = function isArrayish(obj) {
        if (!obj || typeof obj === "string") {
          return false;
        }
        return obj instanceof Array || Array.isArray(obj) || obj.length >= 0 && (obj.splice instanceof Function || Object.getOwnPropertyDescriptor(obj, obj.length - 1) && obj.constructor.name !== "String");
      };
    }
  });

  // ../node_modules/simple-swizzle/index.js
  var require_simple_swizzle = __commonJS({
    "../node_modules/simple-swizzle/index.js"(exports, module) {
      "use strict";
      var isArrayish = require_is_arrayish();
      var concat = Array.prototype.concat;
      var slice = Array.prototype.slice;
      var swizzle = module.exports = function swizzle2(args) {
        var results = [];
        for (var i = 0, len = args.length; i < len; i++) {
          var arg2 = args[i];
          if (isArrayish(arg2)) {
            results = concat.call(results, slice.call(arg2));
          } else {
            results.push(arg2);
          }
        }
        return results;
      };
      swizzle.wrap = function(fn) {
        return function() {
          return fn(swizzle(arguments));
        };
      };
    }
  });

  // ../node_modules/color-string/index.js
  var require_color_string = __commonJS({
    "../node_modules/color-string/index.js"(exports, module) {
      var colorNames = require_color_name();
      var swizzle = require_simple_swizzle();
      var hasOwnProperty = Object.hasOwnProperty;
      var reverseNames = /* @__PURE__ */ Object.create(null);
      for (name in colorNames) {
        if (hasOwnProperty.call(colorNames, name)) {
          reverseNames[colorNames[name]] = name;
        }
      }
      var name;
      var cs = module.exports = {
        to: {},
        get: {}
      };
      cs.get = function(string2) {
        var prefix = string2.substring(0, 3).toLowerCase();
        var val;
        var model;
        switch (prefix) {
          case "hsl":
            val = cs.get.hsl(string2);
            model = "hsl";
            break;
          case "hwb":
            val = cs.get.hwb(string2);
            model = "hwb";
            break;
          default:
            val = cs.get.rgb(string2);
            model = "rgb";
            break;
        }
        if (!val) {
          return null;
        }
        return { model, value: val };
      };
      cs.get.rgb = function(string2) {
        if (!string2) {
          return null;
        }
        var abbr = /^#([a-f0-9]{3,4})$/i;
        var hex = /^#([a-f0-9]{6})([a-f0-9]{2})?$/i;
        var rgba = /^rgba?\(\s*([+-]?\d+)(?=[\s,])\s*(?:,\s*)?([+-]?\d+)(?=[\s,])\s*(?:,\s*)?([+-]?\d+)\s*(?:[,|\/]\s*([+-]?[\d\.]+)(%?)\s*)?\)$/;
        var per = /^rgba?\(\s*([+-]?[\d\.]+)\%\s*,?\s*([+-]?[\d\.]+)\%\s*,?\s*([+-]?[\d\.]+)\%\s*(?:[,|\/]\s*([+-]?[\d\.]+)(%?)\s*)?\)$/;
        var keyword = /^(\w+)$/;
        var rgb = [0, 0, 0, 1];
        var match2;
        var i;
        var hexAlpha;
        if (match2 = string2.match(hex)) {
          hexAlpha = match2[2];
          match2 = match2[1];
          for (i = 0; i < 3; i++) {
            var i2 = i * 2;
            rgb[i] = parseInt(match2.slice(i2, i2 + 2), 16);
          }
          if (hexAlpha) {
            rgb[3] = parseInt(hexAlpha, 16) / 255;
          }
        } else if (match2 = string2.match(abbr)) {
          match2 = match2[1];
          hexAlpha = match2[3];
          for (i = 0; i < 3; i++) {
            rgb[i] = parseInt(match2[i] + match2[i], 16);
          }
          if (hexAlpha) {
            rgb[3] = parseInt(hexAlpha + hexAlpha, 16) / 255;
          }
        } else if (match2 = string2.match(rgba)) {
          for (i = 0; i < 3; i++) {
            rgb[i] = parseInt(match2[i + 1], 0);
          }
          if (match2[4]) {
            if (match2[5]) {
              rgb[3] = parseFloat(match2[4]) * 0.01;
            } else {
              rgb[3] = parseFloat(match2[4]);
            }
          }
        } else if (match2 = string2.match(per)) {
          for (i = 0; i < 3; i++) {
            rgb[i] = Math.round(parseFloat(match2[i + 1]) * 2.55);
          }
          if (match2[4]) {
            if (match2[5]) {
              rgb[3] = parseFloat(match2[4]) * 0.01;
            } else {
              rgb[3] = parseFloat(match2[4]);
            }
          }
        } else if (match2 = string2.match(keyword)) {
          if (match2[1] === "transparent") {
            return [0, 0, 0, 0];
          }
          if (!hasOwnProperty.call(colorNames, match2[1])) {
            return null;
          }
          rgb = colorNames[match2[1]];
          rgb[3] = 1;
          return rgb;
        } else {
          return null;
        }
        for (i = 0; i < 3; i++) {
          rgb[i] = clamp(rgb[i], 0, 255);
        }
        rgb[3] = clamp(rgb[3], 0, 1);
        return rgb;
      };
      cs.get.hsl = function(string2) {
        if (!string2) {
          return null;
        }
        var hsl = /^hsla?\(\s*([+-]?(?:\d{0,3}\.)?\d+)(?:deg)?\s*,?\s*([+-]?[\d\.]+)%\s*,?\s*([+-]?[\d\.]+)%\s*(?:[,|\/]\s*([+-]?(?=\.\d|\d)(?:0|[1-9]\d*)?(?:\.\d*)?(?:[eE][+-]?\d+)?)\s*)?\)$/;
        var match2 = string2.match(hsl);
        if (match2) {
          var alpha = parseFloat(match2[4]);
          var h = (parseFloat(match2[1]) % 360 + 360) % 360;
          var s2 = clamp(parseFloat(match2[2]), 0, 100);
          var l = clamp(parseFloat(match2[3]), 0, 100);
          var a = clamp(isNaN(alpha) ? 1 : alpha, 0, 1);
          return [h, s2, l, a];
        }
        return null;
      };
      cs.get.hwb = function(string2) {
        if (!string2) {
          return null;
        }
        var hwb = /^hwb\(\s*([+-]?\d{0,3}(?:\.\d+)?)(?:deg)?\s*,\s*([+-]?[\d\.]+)%\s*,\s*([+-]?[\d\.]+)%\s*(?:,\s*([+-]?(?=\.\d|\d)(?:0|[1-9]\d*)?(?:\.\d*)?(?:[eE][+-]?\d+)?)\s*)?\)$/;
        var match2 = string2.match(hwb);
        if (match2) {
          var alpha = parseFloat(match2[4]);
          var h = (parseFloat(match2[1]) % 360 + 360) % 360;
          var w = clamp(parseFloat(match2[2]), 0, 100);
          var b = clamp(parseFloat(match2[3]), 0, 100);
          var a = clamp(isNaN(alpha) ? 1 : alpha, 0, 1);
          return [h, w, b, a];
        }
        return null;
      };
      cs.to.hex = function() {
        var rgba = swizzle(arguments);
        return "#" + hexDouble(rgba[0]) + hexDouble(rgba[1]) + hexDouble(rgba[2]) + (rgba[3] < 1 ? hexDouble(Math.round(rgba[3] * 255)) : "");
      };
      cs.to.rgb = function() {
        var rgba = swizzle(arguments);
        return rgba.length < 4 || rgba[3] === 1 ? "rgb(" + Math.round(rgba[0]) + ", " + Math.round(rgba[1]) + ", " + Math.round(rgba[2]) + ")" : "rgba(" + Math.round(rgba[0]) + ", " + Math.round(rgba[1]) + ", " + Math.round(rgba[2]) + ", " + rgba[3] + ")";
      };
      cs.to.rgb.percent = function() {
        var rgba = swizzle(arguments);
        var r = Math.round(rgba[0] / 255 * 100);
        var g = Math.round(rgba[1] / 255 * 100);
        var b = Math.round(rgba[2] / 255 * 100);
        return rgba.length < 4 || rgba[3] === 1 ? "rgb(" + r + "%, " + g + "%, " + b + "%)" : "rgba(" + r + "%, " + g + "%, " + b + "%, " + rgba[3] + ")";
      };
      cs.to.hsl = function() {
        var hsla = swizzle(arguments);
        return hsla.length < 4 || hsla[3] === 1 ? "hsl(" + hsla[0] + ", " + hsla[1] + "%, " + hsla[2] + "%)" : "hsla(" + hsla[0] + ", " + hsla[1] + "%, " + hsla[2] + "%, " + hsla[3] + ")";
      };
      cs.to.hwb = function() {
        var hwba = swizzle(arguments);
        var a = "";
        if (hwba.length >= 4 && hwba[3] !== 1) {
          a = ", " + hwba[3];
        }
        return "hwb(" + hwba[0] + ", " + hwba[1] + "%, " + hwba[2] + "%" + a + ")";
      };
      cs.to.keyword = function(rgb) {
        return reverseNames[rgb.slice(0, 3)];
      };
      function clamp(num, min, max) {
        return Math.min(Math.max(min, num), max);
      }
      function hexDouble(num) {
        var str = Math.round(num).toString(16).toUpperCase();
        return str.length < 2 ? "0" + str : str;
      }
    }
  });

  // ../node_modules/color/node_modules/color-name/index.js
  var require_color_name2 = __commonJS({
    "../node_modules/color/node_modules/color-name/index.js"(exports, module) {
      "use strict";
      module.exports = {
        "aliceblue": [240, 248, 255],
        "antiquewhite": [250, 235, 215],
        "aqua": [0, 255, 255],
        "aquamarine": [127, 255, 212],
        "azure": [240, 255, 255],
        "beige": [245, 245, 220],
        "bisque": [255, 228, 196],
        "black": [0, 0, 0],
        "blanchedalmond": [255, 235, 205],
        "blue": [0, 0, 255],
        "blueviolet": [138, 43, 226],
        "brown": [165, 42, 42],
        "burlywood": [222, 184, 135],
        "cadetblue": [95, 158, 160],
        "chartreuse": [127, 255, 0],
        "chocolate": [210, 105, 30],
        "coral": [255, 127, 80],
        "cornflowerblue": [100, 149, 237],
        "cornsilk": [255, 248, 220],
        "crimson": [220, 20, 60],
        "cyan": [0, 255, 255],
        "darkblue": [0, 0, 139],
        "darkcyan": [0, 139, 139],
        "darkgoldenrod": [184, 134, 11],
        "darkgray": [169, 169, 169],
        "darkgreen": [0, 100, 0],
        "darkgrey": [169, 169, 169],
        "darkkhaki": [189, 183, 107],
        "darkmagenta": [139, 0, 139],
        "darkolivegreen": [85, 107, 47],
        "darkorange": [255, 140, 0],
        "darkorchid": [153, 50, 204],
        "darkred": [139, 0, 0],
        "darksalmon": [233, 150, 122],
        "darkseagreen": [143, 188, 143],
        "darkslateblue": [72, 61, 139],
        "darkslategray": [47, 79, 79],
        "darkslategrey": [47, 79, 79],
        "darkturquoise": [0, 206, 209],
        "darkviolet": [148, 0, 211],
        "deeppink": [255, 20, 147],
        "deepskyblue": [0, 191, 255],
        "dimgray": [105, 105, 105],
        "dimgrey": [105, 105, 105],
        "dodgerblue": [30, 144, 255],
        "firebrick": [178, 34, 34],
        "floralwhite": [255, 250, 240],
        "forestgreen": [34, 139, 34],
        "fuchsia": [255, 0, 255],
        "gainsboro": [220, 220, 220],
        "ghostwhite": [248, 248, 255],
        "gold": [255, 215, 0],
        "goldenrod": [218, 165, 32],
        "gray": [128, 128, 128],
        "green": [0, 128, 0],
        "greenyellow": [173, 255, 47],
        "grey": [128, 128, 128],
        "honeydew": [240, 255, 240],
        "hotpink": [255, 105, 180],
        "indianred": [205, 92, 92],
        "indigo": [75, 0, 130],
        "ivory": [255, 255, 240],
        "khaki": [240, 230, 140],
        "lavender": [230, 230, 250],
        "lavenderblush": [255, 240, 245],
        "lawngreen": [124, 252, 0],
        "lemonchiffon": [255, 250, 205],
        "lightblue": [173, 216, 230],
        "lightcoral": [240, 128, 128],
        "lightcyan": [224, 255, 255],
        "lightgoldenrodyellow": [250, 250, 210],
        "lightgray": [211, 211, 211],
        "lightgreen": [144, 238, 144],
        "lightgrey": [211, 211, 211],
        "lightpink": [255, 182, 193],
        "lightsalmon": [255, 160, 122],
        "lightseagreen": [32, 178, 170],
        "lightskyblue": [135, 206, 250],
        "lightslategray": [119, 136, 153],
        "lightslategrey": [119, 136, 153],
        "lightsteelblue": [176, 196, 222],
        "lightyellow": [255, 255, 224],
        "lime": [0, 255, 0],
        "limegreen": [50, 205, 50],
        "linen": [250, 240, 230],
        "magenta": [255, 0, 255],
        "maroon": [128, 0, 0],
        "mediumaquamarine": [102, 205, 170],
        "mediumblue": [0, 0, 205],
        "mediumorchid": [186, 85, 211],
        "mediumpurple": [147, 112, 219],
        "mediumseagreen": [60, 179, 113],
        "mediumslateblue": [123, 104, 238],
        "mediumspringgreen": [0, 250, 154],
        "mediumturquoise": [72, 209, 204],
        "mediumvioletred": [199, 21, 133],
        "midnightblue": [25, 25, 112],
        "mintcream": [245, 255, 250],
        "mistyrose": [255, 228, 225],
        "moccasin": [255, 228, 181],
        "navajowhite": [255, 222, 173],
        "navy": [0, 0, 128],
        "oldlace": [253, 245, 230],
        "olive": [128, 128, 0],
        "olivedrab": [107, 142, 35],
        "orange": [255, 165, 0],
        "orangered": [255, 69, 0],
        "orchid": [218, 112, 214],
        "palegoldenrod": [238, 232, 170],
        "palegreen": [152, 251, 152],
        "paleturquoise": [175, 238, 238],
        "palevioletred": [219, 112, 147],
        "papayawhip": [255, 239, 213],
        "peachpuff": [255, 218, 185],
        "peru": [205, 133, 63],
        "pink": [255, 192, 203],
        "plum": [221, 160, 221],
        "powderblue": [176, 224, 230],
        "purple": [128, 0, 128],
        "rebeccapurple": [102, 51, 153],
        "red": [255, 0, 0],
        "rosybrown": [188, 143, 143],
        "royalblue": [65, 105, 225],
        "saddlebrown": [139, 69, 19],
        "salmon": [250, 128, 114],
        "sandybrown": [244, 164, 96],
        "seagreen": [46, 139, 87],
        "seashell": [255, 245, 238],
        "sienna": [160, 82, 45],
        "silver": [192, 192, 192],
        "skyblue": [135, 206, 235],
        "slateblue": [106, 90, 205],
        "slategray": [112, 128, 144],
        "slategrey": [112, 128, 144],
        "snow": [255, 250, 250],
        "springgreen": [0, 255, 127],
        "steelblue": [70, 130, 180],
        "tan": [210, 180, 140],
        "teal": [0, 128, 128],
        "thistle": [216, 191, 216],
        "tomato": [255, 99, 71],
        "turquoise": [64, 224, 208],
        "violet": [238, 130, 238],
        "wheat": [245, 222, 179],
        "white": [255, 255, 255],
        "whitesmoke": [245, 245, 245],
        "yellow": [255, 255, 0],
        "yellowgreen": [154, 205, 50]
      };
    }
  });

  // ../node_modules/color/node_modules/color-convert/conversions.js
  var require_conversions = __commonJS({
    "../node_modules/color/node_modules/color-convert/conversions.js"(exports, module) {
      var cssKeywords = require_color_name2();
      var reverseKeywords = {};
      for (const key of Object.keys(cssKeywords)) {
        reverseKeywords[cssKeywords[key]] = key;
      }
      var convert = {
        rgb: { channels: 3, labels: "rgb" },
        hsl: { channels: 3, labels: "hsl" },
        hsv: { channels: 3, labels: "hsv" },
        hwb: { channels: 3, labels: "hwb" },
        cmyk: { channels: 4, labels: "cmyk" },
        xyz: { channels: 3, labels: "xyz" },
        lab: { channels: 3, labels: "lab" },
        lch: { channels: 3, labels: "lch" },
        hex: { channels: 1, labels: ["hex"] },
        keyword: { channels: 1, labels: ["keyword"] },
        ansi16: { channels: 1, labels: ["ansi16"] },
        ansi256: { channels: 1, labels: ["ansi256"] },
        hcg: { channels: 3, labels: ["h", "c", "g"] },
        apple: { channels: 3, labels: ["r16", "g16", "b16"] },
        gray: { channels: 1, labels: ["gray"] }
      };
      module.exports = convert;
      for (const model of Object.keys(convert)) {
        if (!("channels" in convert[model])) {
          throw new Error("missing channels property: " + model);
        }
        if (!("labels" in convert[model])) {
          throw new Error("missing channel labels property: " + model);
        }
        if (convert[model].labels.length !== convert[model].channels) {
          throw new Error("channel and label counts mismatch: " + model);
        }
        const { channels, labels } = convert[model];
        delete convert[model].channels;
        delete convert[model].labels;
        Object.defineProperty(convert[model], "channels", { value: channels });
        Object.defineProperty(convert[model], "labels", { value: labels });
      }
      convert.rgb.hsl = function(rgb) {
        const r = rgb[0] / 255;
        const g = rgb[1] / 255;
        const b = rgb[2] / 255;
        const min = Math.min(r, g, b);
        const max = Math.max(r, g, b);
        const delta = max - min;
        let h;
        let s2;
        if (max === min) {
          h = 0;
        } else if (r === max) {
          h = (g - b) / delta;
        } else if (g === max) {
          h = 2 + (b - r) / delta;
        } else if (b === max) {
          h = 4 + (r - g) / delta;
        }
        h = Math.min(h * 60, 360);
        if (h < 0) {
          h += 360;
        }
        const l = (min + max) / 2;
        if (max === min) {
          s2 = 0;
        } else if (l <= 0.5) {
          s2 = delta / (max + min);
        } else {
          s2 = delta / (2 - max - min);
        }
        return [h, s2 * 100, l * 100];
      };
      convert.rgb.hsv = function(rgb) {
        let rdif;
        let gdif;
        let bdif;
        let h;
        let s2;
        const r = rgb[0] / 255;
        const g = rgb[1] / 255;
        const b = rgb[2] / 255;
        const v = Math.max(r, g, b);
        const diff = v - Math.min(r, g, b);
        const diffc = function(c) {
          return (v - c) / 6 / diff + 1 / 2;
        };
        if (diff === 0) {
          h = 0;
          s2 = 0;
        } else {
          s2 = diff / v;
          rdif = diffc(r);
          gdif = diffc(g);
          bdif = diffc(b);
          if (r === v) {
            h = bdif - gdif;
          } else if (g === v) {
            h = 1 / 3 + rdif - bdif;
          } else if (b === v) {
            h = 2 / 3 + gdif - rdif;
          }
          if (h < 0) {
            h += 1;
          } else if (h > 1) {
            h -= 1;
          }
        }
        return [
          h * 360,
          s2 * 100,
          v * 100
        ];
      };
      convert.rgb.hwb = function(rgb) {
        const r = rgb[0];
        const g = rgb[1];
        let b = rgb[2];
        const h = convert.rgb.hsl(rgb)[0];
        const w = 1 / 255 * Math.min(r, Math.min(g, b));
        b = 1 - 1 / 255 * Math.max(r, Math.max(g, b));
        return [h, w * 100, b * 100];
      };
      convert.rgb.cmyk = function(rgb) {
        const r = rgb[0] / 255;
        const g = rgb[1] / 255;
        const b = rgb[2] / 255;
        const k = Math.min(1 - r, 1 - g, 1 - b);
        const c = (1 - r - k) / (1 - k) || 0;
        const m = (1 - g - k) / (1 - k) || 0;
        const y = (1 - b - k) / (1 - k) || 0;
        return [c * 100, m * 100, y * 100, k * 100];
      };
      function comparativeDistance(x, y) {
        return (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2;
      }
      convert.rgb.keyword = function(rgb) {
        const reversed = reverseKeywords[rgb];
        if (reversed) {
          return reversed;
        }
        let currentClosestDistance = Infinity;
        let currentClosestKeyword;
        for (const keyword of Object.keys(cssKeywords)) {
          const value = cssKeywords[keyword];
          const distance = comparativeDistance(rgb, value);
          if (distance < currentClosestDistance) {
            currentClosestDistance = distance;
            currentClosestKeyword = keyword;
          }
        }
        return currentClosestKeyword;
      };
      convert.keyword.rgb = function(keyword) {
        return cssKeywords[keyword];
      };
      convert.rgb.xyz = function(rgb) {
        let r = rgb[0] / 255;
        let g = rgb[1] / 255;
        let b = rgb[2] / 255;
        r = r > 0.04045 ? ((r + 0.055) / 1.055) ** 2.4 : r / 12.92;
        g = g > 0.04045 ? ((g + 0.055) / 1.055) ** 2.4 : g / 12.92;
        b = b > 0.04045 ? ((b + 0.055) / 1.055) ** 2.4 : b / 12.92;
        const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
        const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
        const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
        return [x * 100, y * 100, z * 100];
      };
      convert.rgb.lab = function(rgb) {
        const xyz = convert.rgb.xyz(rgb);
        let x = xyz[0];
        let y = xyz[1];
        let z = xyz[2];
        x /= 95.047;
        y /= 100;
        z /= 108.883;
        x = x > 8856e-6 ? x ** (1 / 3) : 7.787 * x + 16 / 116;
        y = y > 8856e-6 ? y ** (1 / 3) : 7.787 * y + 16 / 116;
        z = z > 8856e-6 ? z ** (1 / 3) : 7.787 * z + 16 / 116;
        const l = 116 * y - 16;
        const a = 500 * (x - y);
        const b = 200 * (y - z);
        return [l, a, b];
      };
      convert.hsl.rgb = function(hsl) {
        const h = hsl[0] / 360;
        const s2 = hsl[1] / 100;
        const l = hsl[2] / 100;
        let t2;
        let t3;
        let val;
        if (s2 === 0) {
          val = l * 255;
          return [val, val, val];
        }
        if (l < 0.5) {
          t2 = l * (1 + s2);
        } else {
          t2 = l + s2 - l * s2;
        }
        const t1 = 2 * l - t2;
        const rgb = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
          t3 = h + 1 / 3 * -(i - 1);
          if (t3 < 0) {
            t3++;
          }
          if (t3 > 1) {
            t3--;
          }
          if (6 * t3 < 1) {
            val = t1 + (t2 - t1) * 6 * t3;
          } else if (2 * t3 < 1) {
            val = t2;
          } else if (3 * t3 < 2) {
            val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
          } else {
            val = t1;
          }
          rgb[i] = val * 255;
        }
        return rgb;
      };
      convert.hsl.hsv = function(hsl) {
        const h = hsl[0];
        let s2 = hsl[1] / 100;
        let l = hsl[2] / 100;
        let smin = s2;
        const lmin = Math.max(l, 0.01);
        l *= 2;
        s2 *= l <= 1 ? l : 2 - l;
        smin *= lmin <= 1 ? lmin : 2 - lmin;
        const v = (l + s2) / 2;
        const sv = l === 0 ? 2 * smin / (lmin + smin) : 2 * s2 / (l + s2);
        return [h, sv * 100, v * 100];
      };
      convert.hsv.rgb = function(hsv) {
        const h = hsv[0] / 60;
        const s2 = hsv[1] / 100;
        let v = hsv[2] / 100;
        const hi = Math.floor(h) % 6;
        const f = h - Math.floor(h);
        const p = 255 * v * (1 - s2);
        const q = 255 * v * (1 - s2 * f);
        const t = 255 * v * (1 - s2 * (1 - f));
        v *= 255;
        switch (hi) {
          case 0:
            return [v, t, p];
          case 1:
            return [q, v, p];
          case 2:
            return [p, v, t];
          case 3:
            return [p, q, v];
          case 4:
            return [t, p, v];
          case 5:
            return [v, p, q];
        }
      };
      convert.hsv.hsl = function(hsv) {
        const h = hsv[0];
        const s2 = hsv[1] / 100;
        const v = hsv[2] / 100;
        const vmin = Math.max(v, 0.01);
        let sl;
        let l;
        l = (2 - s2) * v;
        const lmin = (2 - s2) * vmin;
        sl = s2 * vmin;
        sl /= lmin <= 1 ? lmin : 2 - lmin;
        sl = sl || 0;
        l /= 2;
        return [h, sl * 100, l * 100];
      };
      convert.hwb.rgb = function(hwb) {
        const h = hwb[0] / 360;
        let wh = hwb[1] / 100;
        let bl = hwb[2] / 100;
        const ratio = wh + bl;
        let f;
        if (ratio > 1) {
          wh /= ratio;
          bl /= ratio;
        }
        const i = Math.floor(6 * h);
        const v = 1 - bl;
        f = 6 * h - i;
        if ((i & 1) !== 0) {
          f = 1 - f;
        }
        const n = wh + f * (v - wh);
        let r;
        let g;
        let b;
        switch (i) {
          default:
          case 6:
          case 0:
            r = v;
            g = n;
            b = wh;
            break;
          case 1:
            r = n;
            g = v;
            b = wh;
            break;
          case 2:
            r = wh;
            g = v;
            b = n;
            break;
          case 3:
            r = wh;
            g = n;
            b = v;
            break;
          case 4:
            r = n;
            g = wh;
            b = v;
            break;
          case 5:
            r = v;
            g = wh;
            b = n;
            break;
        }
        return [r * 255, g * 255, b * 255];
      };
      convert.cmyk.rgb = function(cmyk) {
        const c = cmyk[0] / 100;
        const m = cmyk[1] / 100;
        const y = cmyk[2] / 100;
        const k = cmyk[3] / 100;
        const r = 1 - Math.min(1, c * (1 - k) + k);
        const g = 1 - Math.min(1, m * (1 - k) + k);
        const b = 1 - Math.min(1, y * (1 - k) + k);
        return [r * 255, g * 255, b * 255];
      };
      convert.xyz.rgb = function(xyz) {
        const x = xyz[0] / 100;
        const y = xyz[1] / 100;
        const z = xyz[2] / 100;
        let r;
        let g;
        let b;
        r = x * 3.2406 + y * -1.5372 + z * -0.4986;
        g = x * -0.9689 + y * 1.8758 + z * 0.0415;
        b = x * 0.0557 + y * -0.204 + z * 1.057;
        r = r > 31308e-7 ? 1.055 * r ** (1 / 2.4) - 0.055 : r * 12.92;
        g = g > 31308e-7 ? 1.055 * g ** (1 / 2.4) - 0.055 : g * 12.92;
        b = b > 31308e-7 ? 1.055 * b ** (1 / 2.4) - 0.055 : b * 12.92;
        r = Math.min(Math.max(0, r), 1);
        g = Math.min(Math.max(0, g), 1);
        b = Math.min(Math.max(0, b), 1);
        return [r * 255, g * 255, b * 255];
      };
      convert.xyz.lab = function(xyz) {
        let x = xyz[0];
        let y = xyz[1];
        let z = xyz[2];
        x /= 95.047;
        y /= 100;
        z /= 108.883;
        x = x > 8856e-6 ? x ** (1 / 3) : 7.787 * x + 16 / 116;
        y = y > 8856e-6 ? y ** (1 / 3) : 7.787 * y + 16 / 116;
        z = z > 8856e-6 ? z ** (1 / 3) : 7.787 * z + 16 / 116;
        const l = 116 * y - 16;
        const a = 500 * (x - y);
        const b = 200 * (y - z);
        return [l, a, b];
      };
      convert.lab.xyz = function(lab) {
        const l = lab[0];
        const a = lab[1];
        const b = lab[2];
        let x;
        let y;
        let z;
        y = (l + 16) / 116;
        x = a / 500 + y;
        z = y - b / 200;
        const y2 = y ** 3;
        const x2 = x ** 3;
        const z2 = z ** 3;
        y = y2 > 8856e-6 ? y2 : (y - 16 / 116) / 7.787;
        x = x2 > 8856e-6 ? x2 : (x - 16 / 116) / 7.787;
        z = z2 > 8856e-6 ? z2 : (z - 16 / 116) / 7.787;
        x *= 95.047;
        y *= 100;
        z *= 108.883;
        return [x, y, z];
      };
      convert.lab.lch = function(lab) {
        const l = lab[0];
        const a = lab[1];
        const b = lab[2];
        let h;
        const hr = Math.atan2(b, a);
        h = hr * 360 / 2 / Math.PI;
        if (h < 0) {
          h += 360;
        }
        const c = Math.sqrt(a * a + b * b);
        return [l, c, h];
      };
      convert.lch.lab = function(lch) {
        const l = lch[0];
        const c = lch[1];
        const h = lch[2];
        const hr = h / 360 * 2 * Math.PI;
        const a = c * Math.cos(hr);
        const b = c * Math.sin(hr);
        return [l, a, b];
      };
      convert.rgb.ansi16 = function(args, saturation = null) {
        const [r, g, b] = args;
        let value = saturation === null ? convert.rgb.hsv(args)[2] : saturation;
        value = Math.round(value / 50);
        if (value === 0) {
          return 30;
        }
        let ansi = 30 + (Math.round(b / 255) << 2 | Math.round(g / 255) << 1 | Math.round(r / 255));
        if (value === 2) {
          ansi += 60;
        }
        return ansi;
      };
      convert.hsv.ansi16 = function(args) {
        return convert.rgb.ansi16(convert.hsv.rgb(args), args[2]);
      };
      convert.rgb.ansi256 = function(args) {
        const r = args[0];
        const g = args[1];
        const b = args[2];
        if (r === g && g === b) {
          if (r < 8) {
            return 16;
          }
          if (r > 248) {
            return 231;
          }
          return Math.round((r - 8) / 247 * 24) + 232;
        }
        const ansi = 16 + 36 * Math.round(r / 255 * 5) + 6 * Math.round(g / 255 * 5) + Math.round(b / 255 * 5);
        return ansi;
      };
      convert.ansi16.rgb = function(args) {
        let color = args % 10;
        if (color === 0 || color === 7) {
          if (args > 50) {
            color += 3.5;
          }
          color = color / 10.5 * 255;
          return [color, color, color];
        }
        const mult = (~~(args > 50) + 1) * 0.5;
        const r = (color & 1) * mult * 255;
        const g = (color >> 1 & 1) * mult * 255;
        const b = (color >> 2 & 1) * mult * 255;
        return [r, g, b];
      };
      convert.ansi256.rgb = function(args) {
        if (args >= 232) {
          const c = (args - 232) * 10 + 8;
          return [c, c, c];
        }
        args -= 16;
        let rem;
        const r = Math.floor(args / 36) / 5 * 255;
        const g = Math.floor((rem = args % 36) / 6) / 5 * 255;
        const b = rem % 6 / 5 * 255;
        return [r, g, b];
      };
      convert.rgb.hex = function(args) {
        const integer = ((Math.round(args[0]) & 255) << 16) + ((Math.round(args[1]) & 255) << 8) + (Math.round(args[2]) & 255);
        const string2 = integer.toString(16).toUpperCase();
        return "000000".substring(string2.length) + string2;
      };
      convert.hex.rgb = function(args) {
        const match2 = args.toString(16).match(/[a-f0-9]{6}|[a-f0-9]{3}/i);
        if (!match2) {
          return [0, 0, 0];
        }
        let colorString = match2[0];
        if (match2[0].length === 3) {
          colorString = colorString.split("").map((char) => {
            return char + char;
          }).join("");
        }
        const integer = parseInt(colorString, 16);
        const r = integer >> 16 & 255;
        const g = integer >> 8 & 255;
        const b = integer & 255;
        return [r, g, b];
      };
      convert.rgb.hcg = function(rgb) {
        const r = rgb[0] / 255;
        const g = rgb[1] / 255;
        const b = rgb[2] / 255;
        const max = Math.max(Math.max(r, g), b);
        const min = Math.min(Math.min(r, g), b);
        const chroma = max - min;
        let grayscale;
        let hue;
        if (chroma < 1) {
          grayscale = min / (1 - chroma);
        } else {
          grayscale = 0;
        }
        if (chroma <= 0) {
          hue = 0;
        } else if (max === r) {
          hue = (g - b) / chroma % 6;
        } else if (max === g) {
          hue = 2 + (b - r) / chroma;
        } else {
          hue = 4 + (r - g) / chroma;
        }
        hue /= 6;
        hue %= 1;
        return [hue * 360, chroma * 100, grayscale * 100];
      };
      convert.hsl.hcg = function(hsl) {
        const s2 = hsl[1] / 100;
        const l = hsl[2] / 100;
        const c = l < 0.5 ? 2 * s2 * l : 2 * s2 * (1 - l);
        let f = 0;
        if (c < 1) {
          f = (l - 0.5 * c) / (1 - c);
        }
        return [hsl[0], c * 100, f * 100];
      };
      convert.hsv.hcg = function(hsv) {
        const s2 = hsv[1] / 100;
        const v = hsv[2] / 100;
        const c = s2 * v;
        let f = 0;
        if (c < 1) {
          f = (v - c) / (1 - c);
        }
        return [hsv[0], c * 100, f * 100];
      };
      convert.hcg.rgb = function(hcg) {
        const h = hcg[0] / 360;
        const c = hcg[1] / 100;
        const g = hcg[2] / 100;
        if (c === 0) {
          return [g * 255, g * 255, g * 255];
        }
        const pure = [0, 0, 0];
        const hi = h % 1 * 6;
        const v = hi % 1;
        const w = 1 - v;
        let mg = 0;
        switch (Math.floor(hi)) {
          case 0:
            pure[0] = 1;
            pure[1] = v;
            pure[2] = 0;
            break;
          case 1:
            pure[0] = w;
            pure[1] = 1;
            pure[2] = 0;
            break;
          case 2:
            pure[0] = 0;
            pure[1] = 1;
            pure[2] = v;
            break;
          case 3:
            pure[0] = 0;
            pure[1] = w;
            pure[2] = 1;
            break;
          case 4:
            pure[0] = v;
            pure[1] = 0;
            pure[2] = 1;
            break;
          default:
            pure[0] = 1;
            pure[1] = 0;
            pure[2] = w;
        }
        mg = (1 - c) * g;
        return [
          (c * pure[0] + mg) * 255,
          (c * pure[1] + mg) * 255,
          (c * pure[2] + mg) * 255
        ];
      };
      convert.hcg.hsv = function(hcg) {
        const c = hcg[1] / 100;
        const g = hcg[2] / 100;
        const v = c + g * (1 - c);
        let f = 0;
        if (v > 0) {
          f = c / v;
        }
        return [hcg[0], f * 100, v * 100];
      };
      convert.hcg.hsl = function(hcg) {
        const c = hcg[1] / 100;
        const g = hcg[2] / 100;
        const l = g * (1 - c) + 0.5 * c;
        let s2 = 0;
        if (l > 0 && l < 0.5) {
          s2 = c / (2 * l);
        } else if (l >= 0.5 && l < 1) {
          s2 = c / (2 * (1 - l));
        }
        return [hcg[0], s2 * 100, l * 100];
      };
      convert.hcg.hwb = function(hcg) {
        const c = hcg[1] / 100;
        const g = hcg[2] / 100;
        const v = c + g * (1 - c);
        return [hcg[0], (v - c) * 100, (1 - v) * 100];
      };
      convert.hwb.hcg = function(hwb) {
        const w = hwb[1] / 100;
        const b = hwb[2] / 100;
        const v = 1 - b;
        const c = v - w;
        let g = 0;
        if (c < 1) {
          g = (v - c) / (1 - c);
        }
        return [hwb[0], c * 100, g * 100];
      };
      convert.apple.rgb = function(apple) {
        return [apple[0] / 65535 * 255, apple[1] / 65535 * 255, apple[2] / 65535 * 255];
      };
      convert.rgb.apple = function(rgb) {
        return [rgb[0] / 255 * 65535, rgb[1] / 255 * 65535, rgb[2] / 255 * 65535];
      };
      convert.gray.rgb = function(args) {
        return [args[0] / 100 * 255, args[0] / 100 * 255, args[0] / 100 * 255];
      };
      convert.gray.hsl = function(args) {
        return [0, 0, args[0]];
      };
      convert.gray.hsv = convert.gray.hsl;
      convert.gray.hwb = function(gray) {
        return [0, 100, gray[0]];
      };
      convert.gray.cmyk = function(gray) {
        return [0, 0, 0, gray[0]];
      };
      convert.gray.lab = function(gray) {
        return [gray[0], 0, 0];
      };
      convert.gray.hex = function(gray) {
        const val = Math.round(gray[0] / 100 * 255) & 255;
        const integer = (val << 16) + (val << 8) + val;
        const string2 = integer.toString(16).toUpperCase();
        return "000000".substring(string2.length) + string2;
      };
      convert.rgb.gray = function(rgb) {
        const val = (rgb[0] + rgb[1] + rgb[2]) / 3;
        return [val / 255 * 100];
      };
    }
  });

  // ../node_modules/color/node_modules/color-convert/route.js
  var require_route = __commonJS({
    "../node_modules/color/node_modules/color-convert/route.js"(exports, module) {
      var conversions = require_conversions();
      function buildGraph() {
        const graph = {};
        const models = Object.keys(conversions);
        for (let len = models.length, i = 0; i < len; i++) {
          graph[models[i]] = {
            // http://jsperf.com/1-vs-infinity
            // micro-opt, but this is simple.
            distance: -1,
            parent: null
          };
        }
        return graph;
      }
      function deriveBFS(fromModel) {
        const graph = buildGraph();
        const queue = [fromModel];
        graph[fromModel].distance = 0;
        while (queue.length) {
          const current = queue.pop();
          const adjacents = Object.keys(conversions[current]);
          for (let len = adjacents.length, i = 0; i < len; i++) {
            const adjacent = adjacents[i];
            const node = graph[adjacent];
            if (node.distance === -1) {
              node.distance = graph[current].distance + 1;
              node.parent = current;
              queue.unshift(adjacent);
            }
          }
        }
        return graph;
      }
      function link(from, to) {
        return function(args) {
          return to(from(args));
        };
      }
      function wrapConversion(toModel, graph) {
        const path2 = [graph[toModel].parent, toModel];
        let fn = conversions[graph[toModel].parent][toModel];
        let cur = graph[toModel].parent;
        while (graph[cur].parent) {
          path2.unshift(graph[cur].parent);
          fn = link(conversions[graph[cur].parent][cur], fn);
          cur = graph[cur].parent;
        }
        fn.conversion = path2;
        return fn;
      }
      module.exports = function(fromModel) {
        const graph = deriveBFS(fromModel);
        const conversion = {};
        const models = Object.keys(graph);
        for (let len = models.length, i = 0; i < len; i++) {
          const toModel = models[i];
          const node = graph[toModel];
          if (node.parent === null) {
            continue;
          }
          conversion[toModel] = wrapConversion(toModel, graph);
        }
        return conversion;
      };
    }
  });

  // ../node_modules/color/node_modules/color-convert/index.js
  var require_color_convert = __commonJS({
    "../node_modules/color/node_modules/color-convert/index.js"(exports, module) {
      var conversions = require_conversions();
      var route = require_route();
      var convert = {};
      var models = Object.keys(conversions);
      function wrapRaw(fn) {
        const wrappedFn = function(...args) {
          const arg0 = args[0];
          if (arg0 === void 0 || arg0 === null) {
            return arg0;
          }
          if (arg0.length > 1) {
            args = arg0;
          }
          return fn(args);
        };
        if ("conversion" in fn) {
          wrappedFn.conversion = fn.conversion;
        }
        return wrappedFn;
      }
      function wrapRounded(fn) {
        const wrappedFn = function(...args) {
          const arg0 = args[0];
          if (arg0 === void 0 || arg0 === null) {
            return arg0;
          }
          if (arg0.length > 1) {
            args = arg0;
          }
          const result = fn(args);
          if (typeof result === "object") {
            for (let len = result.length, i = 0; i < len; i++) {
              result[i] = Math.round(result[i]);
            }
          }
          return result;
        };
        if ("conversion" in fn) {
          wrappedFn.conversion = fn.conversion;
        }
        return wrappedFn;
      }
      models.forEach((fromModel) => {
        convert[fromModel] = {};
        Object.defineProperty(convert[fromModel], "channels", { value: conversions[fromModel].channels });
        Object.defineProperty(convert[fromModel], "labels", { value: conversions[fromModel].labels });
        const routes = route(fromModel);
        const routeModels = Object.keys(routes);
        routeModels.forEach((toModel) => {
          const fn = routes[toModel];
          convert[fromModel][toModel] = wrapRounded(fn);
          convert[fromModel][toModel].raw = wrapRaw(fn);
        });
      });
      module.exports = convert;
    }
  });

  // ../node_modules/color/index.js
  var require_color = __commonJS({
    "../node_modules/color/index.js"(exports, module) {
      var colorString = require_color_string();
      var convert = require_color_convert();
      var skippedModels = [
        // To be honest, I don't really feel like keyword belongs in color convert, but eh.
        "keyword",
        // Gray conflicts with some method names, and has its own method defined.
        "gray",
        // Shouldn't really be in color-convert either...
        "hex"
      ];
      var hashedModelKeys = {};
      for (const model of Object.keys(convert)) {
        hashedModelKeys[[...convert[model].labels].sort().join("")] = model;
      }
      var limiters = {};
      function Color3(object, model) {
        if (!(this instanceof Color3)) {
          return new Color3(object, model);
        }
        if (model && model in skippedModels) {
          model = null;
        }
        if (model && !(model in convert)) {
          throw new Error("Unknown model: " + model);
        }
        let i;
        let channels;
        if (object == null) {
          this.model = "rgb";
          this.color = [0, 0, 0];
          this.valpha = 1;
        } else if (object instanceof Color3) {
          this.model = object.model;
          this.color = [...object.color];
          this.valpha = object.valpha;
        } else if (typeof object === "string") {
          const result = colorString.get(object);
          if (result === null) {
            throw new Error("Unable to parse color from string: " + object);
          }
          this.model = result.model;
          channels = convert[this.model].channels;
          this.color = result.value.slice(0, channels);
          this.valpha = typeof result.value[channels] === "number" ? result.value[channels] : 1;
        } else if (object.length > 0) {
          this.model = model || "rgb";
          channels = convert[this.model].channels;
          const newArray = Array.prototype.slice.call(object, 0, channels);
          this.color = zeroArray(newArray, channels);
          this.valpha = typeof object[channels] === "number" ? object[channels] : 1;
        } else if (typeof object === "number") {
          this.model = "rgb";
          this.color = [
            object >> 16 & 255,
            object >> 8 & 255,
            object & 255
          ];
          this.valpha = 1;
        } else {
          this.valpha = 1;
          const keys2 = Object.keys(object);
          if ("alpha" in object) {
            keys2.splice(keys2.indexOf("alpha"), 1);
            this.valpha = typeof object.alpha === "number" ? object.alpha : 0;
          }
          const hashedKeys = keys2.sort().join("");
          if (!(hashedKeys in hashedModelKeys)) {
            throw new Error("Unable to parse color from object: " + JSON.stringify(object));
          }
          this.model = hashedModelKeys[hashedKeys];
          const { labels } = convert[this.model];
          const color = [];
          for (i = 0; i < labels.length; i++) {
            color.push(object[labels[i]]);
          }
          this.color = zeroArray(color);
        }
        if (limiters[this.model]) {
          channels = convert[this.model].channels;
          for (i = 0; i < channels; i++) {
            const limit = limiters[this.model][i];
            if (limit) {
              this.color[i] = limit(this.color[i]);
            }
          }
        }
        this.valpha = Math.max(0, Math.min(1, this.valpha));
        if (Object.freeze) {
          Object.freeze(this);
        }
      }
      Color3.prototype = {
        toString() {
          return this.string();
        },
        toJSON() {
          return this[this.model]();
        },
        string(places) {
          let self = this.model in colorString.to ? this : this.rgb();
          self = self.round(typeof places === "number" ? places : 1);
          const args = self.valpha === 1 ? self.color : [...self.color, this.valpha];
          return colorString.to[self.model](args);
        },
        percentString(places) {
          const self = this.rgb().round(typeof places === "number" ? places : 1);
          const args = self.valpha === 1 ? self.color : [...self.color, this.valpha];
          return colorString.to.rgb.percent(args);
        },
        array() {
          return this.valpha === 1 ? [...this.color] : [...this.color, this.valpha];
        },
        object() {
          const result = {};
          const { channels } = convert[this.model];
          const { labels } = convert[this.model];
          for (let i = 0; i < channels; i++) {
            result[labels[i]] = this.color[i];
          }
          if (this.valpha !== 1) {
            result.alpha = this.valpha;
          }
          return result;
        },
        unitArray() {
          const rgb = this.rgb().color;
          rgb[0] /= 255;
          rgb[1] /= 255;
          rgb[2] /= 255;
          if (this.valpha !== 1) {
            rgb.push(this.valpha);
          }
          return rgb;
        },
        unitObject() {
          const rgb = this.rgb().object();
          rgb.r /= 255;
          rgb.g /= 255;
          rgb.b /= 255;
          if (this.valpha !== 1) {
            rgb.alpha = this.valpha;
          }
          return rgb;
        },
        round(places) {
          places = Math.max(places || 0, 0);
          return new Color3([...this.color.map(roundToPlace(places)), this.valpha], this.model);
        },
        alpha(value) {
          if (value !== void 0) {
            return new Color3([...this.color, Math.max(0, Math.min(1, value))], this.model);
          }
          return this.valpha;
        },
        // Rgb
        red: getset("rgb", 0, maxfn(255)),
        green: getset("rgb", 1, maxfn(255)),
        blue: getset("rgb", 2, maxfn(255)),
        hue: getset(["hsl", "hsv", "hsl", "hwb", "hcg"], 0, (value) => (value % 360 + 360) % 360),
        saturationl: getset("hsl", 1, maxfn(100)),
        lightness: getset("hsl", 2, maxfn(100)),
        saturationv: getset("hsv", 1, maxfn(100)),
        value: getset("hsv", 2, maxfn(100)),
        chroma: getset("hcg", 1, maxfn(100)),
        gray: getset("hcg", 2, maxfn(100)),
        white: getset("hwb", 1, maxfn(100)),
        wblack: getset("hwb", 2, maxfn(100)),
        cyan: getset("cmyk", 0, maxfn(100)),
        magenta: getset("cmyk", 1, maxfn(100)),
        yellow: getset("cmyk", 2, maxfn(100)),
        black: getset("cmyk", 3, maxfn(100)),
        x: getset("xyz", 0, maxfn(95.047)),
        y: getset("xyz", 1, maxfn(100)),
        z: getset("xyz", 2, maxfn(108.833)),
        l: getset("lab", 0, maxfn(100)),
        a: getset("lab", 1),
        b: getset("lab", 2),
        keyword(value) {
          if (value !== void 0) {
            return new Color3(value);
          }
          return convert[this.model].keyword(this.color);
        },
        hex(value) {
          if (value !== void 0) {
            return new Color3(value);
          }
          return colorString.to.hex(this.rgb().round().color);
        },
        hexa(value) {
          if (value !== void 0) {
            return new Color3(value);
          }
          const rgbArray = this.rgb().round().color;
          let alphaHex = Math.round(this.valpha * 255).toString(16).toUpperCase();
          if (alphaHex.length === 1) {
            alphaHex = "0" + alphaHex;
          }
          return colorString.to.hex(rgbArray) + alphaHex;
        },
        rgbNumber() {
          const rgb = this.rgb().color;
          return (rgb[0] & 255) << 16 | (rgb[1] & 255) << 8 | rgb[2] & 255;
        },
        luminosity() {
          const rgb = this.rgb().color;
          const lum = [];
          for (const [i, element] of rgb.entries()) {
            const chan = element / 255;
            lum[i] = chan <= 0.04045 ? chan / 12.92 : ((chan + 0.055) / 1.055) ** 2.4;
          }
          return 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
        },
        contrast(color2) {
          const lum1 = this.luminosity();
          const lum2 = color2.luminosity();
          if (lum1 > lum2) {
            return (lum1 + 0.05) / (lum2 + 0.05);
          }
          return (lum2 + 0.05) / (lum1 + 0.05);
        },
        level(color2) {
          const contrastRatio = this.contrast(color2);
          if (contrastRatio >= 7) {
            return "AAA";
          }
          return contrastRatio >= 4.5 ? "AA" : "";
        },
        isDark() {
          const rgb = this.rgb().color;
          const yiq = (rgb[0] * 2126 + rgb[1] * 7152 + rgb[2] * 722) / 1e4;
          return yiq < 128;
        },
        isLight() {
          return !this.isDark();
        },
        negate() {
          const rgb = this.rgb();
          for (let i = 0; i < 3; i++) {
            rgb.color[i] = 255 - rgb.color[i];
          }
          return rgb;
        },
        lighten(ratio) {
          const hsl = this.hsl();
          hsl.color[2] += hsl.color[2] * ratio;
          return hsl;
        },
        darken(ratio) {
          const hsl = this.hsl();
          hsl.color[2] -= hsl.color[2] * ratio;
          return hsl;
        },
        saturate(ratio) {
          const hsl = this.hsl();
          hsl.color[1] += hsl.color[1] * ratio;
          return hsl;
        },
        desaturate(ratio) {
          const hsl = this.hsl();
          hsl.color[1] -= hsl.color[1] * ratio;
          return hsl;
        },
        whiten(ratio) {
          const hwb = this.hwb();
          hwb.color[1] += hwb.color[1] * ratio;
          return hwb;
        },
        blacken(ratio) {
          const hwb = this.hwb();
          hwb.color[2] += hwb.color[2] * ratio;
          return hwb;
        },
        grayscale() {
          const rgb = this.rgb().color;
          const value = rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11;
          return Color3.rgb(value, value, value);
        },
        fade(ratio) {
          return this.alpha(this.valpha - this.valpha * ratio);
        },
        opaquer(ratio) {
          return this.alpha(this.valpha + this.valpha * ratio);
        },
        rotate(degrees) {
          const hsl = this.hsl();
          let hue = hsl.color[0];
          hue = (hue + degrees) % 360;
          hue = hue < 0 ? 360 + hue : hue;
          hsl.color[0] = hue;
          return hsl;
        },
        mix(mixinColor, weight) {
          if (!mixinColor || !mixinColor.rgb) {
            throw new Error('Argument to "mix" was not a Color instance, but rather an instance of ' + typeof mixinColor);
          }
          const color1 = mixinColor.rgb();
          const color2 = this.rgb();
          const p = weight === void 0 ? 0.5 : weight;
          const w = 2 * p - 1;
          const a = color1.alpha() - color2.alpha();
          const w1 = ((w * a === -1 ? w : (w + a) / (1 + w * a)) + 1) / 2;
          const w2 = 1 - w1;
          return Color3.rgb(
            w1 * color1.red() + w2 * color2.red(),
            w1 * color1.green() + w2 * color2.green(),
            w1 * color1.blue() + w2 * color2.blue(),
            color1.alpha() * p + color2.alpha() * (1 - p)
          );
        }
      };
      for (const model of Object.keys(convert)) {
        if (skippedModels.includes(model)) {
          continue;
        }
        const { channels } = convert[model];
        Color3.prototype[model] = function(...args) {
          if (this.model === model) {
            return new Color3(this);
          }
          if (args.length > 0) {
            return new Color3(args, model);
          }
          return new Color3([...assertArray(convert[this.model][model].raw(this.color)), this.valpha], model);
        };
        Color3[model] = function(...args) {
          let color = args[0];
          if (typeof color === "number") {
            color = zeroArray(args, channels);
          }
          return new Color3(color, model);
        };
      }
      function roundTo(number, places) {
        return Number(number.toFixed(places));
      }
      function roundToPlace(places) {
        return function(number) {
          return roundTo(number, places);
        };
      }
      function getset(model, channel, modifier) {
        model = Array.isArray(model) ? model : [model];
        for (const m of model) {
          (limiters[m] || (limiters[m] = []))[channel] = modifier;
        }
        model = model[0];
        return function(value) {
          let result;
          if (value !== void 0) {
            if (modifier) {
              value = modifier(value);
            }
            result = this[model]();
            result.color[channel] = value;
            return result;
          }
          result = this[model]().color[channel];
          if (modifier) {
            result = modifier(result);
          }
          return result;
        };
      }
      function maxfn(max) {
        return function(v) {
          return Math.max(0, Math.min(max, v));
        };
      }
      function assertArray(value) {
        return Array.isArray(value) ? value : [value];
      }
      function zeroArray(array, length) {
        for (let i = 0; i < length; i++) {
          if (typeof array[i] !== "number") {
            array[i] = 0;
          }
        }
        return array;
      }
      module.exports = Color3;
    }
  });

  // ../node_modules/bail/index.js
  function bail(error) {
    if (error) {
      throw error;
    }
  }

  // ../node_modules/unified/lib/index.js
  var import_is_buffer2 = __toESM(require_is_buffer(), 1);
  var import_extend = __toESM(require_extend(), 1);

  // ../node_modules/is-plain-obj/index.js
  function isPlainObject(value) {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in value) && !(Symbol.iterator in value);
  }

  // ../node_modules/trough/index.js
  function trough() {
    const fns = [];
    const pipeline = { run, use };
    return pipeline;
    function run(...values) {
      let middlewareIndex = -1;
      const callback = values.pop();
      if (typeof callback !== "function") {
        throw new TypeError("Expected function as last argument, not " + callback);
      }
      next(null, ...values);
      function next(error, ...output) {
        const fn = fns[++middlewareIndex];
        let index2 = -1;
        if (error) {
          callback(error);
          return;
        }
        while (++index2 < values.length) {
          if (output[index2] === null || output[index2] === void 0) {
            output[index2] = values[index2];
          }
        }
        values = output;
        if (fn) {
          wrap(fn, next)(...output);
        } else {
          callback(null, ...output);
        }
      }
    }
    function use(middelware) {
      if (typeof middelware !== "function") {
        throw new TypeError(
          "Expected `middelware` to be a function, not " + middelware
        );
      }
      fns.push(middelware);
      return pipeline;
    }
  }
  function wrap(middleware, callback) {
    let called;
    return wrapped;
    function wrapped(...parameters) {
      const fnExpectsCallback = middleware.length > parameters.length;
      let result;
      if (fnExpectsCallback) {
        parameters.push(done);
      }
      try {
        result = middleware.apply(this, parameters);
      } catch (error) {
        const exception = (
          /** @type {Error} */
          error
        );
        if (fnExpectsCallback && called) {
          throw exception;
        }
        return done(exception);
      }
      if (!fnExpectsCallback) {
        if (result instanceof Promise) {
          result.then(then, done);
        } else if (result instanceof Error) {
          done(result);
        } else {
          then(result);
        }
      }
    }
    function done(error, ...output) {
      if (!called) {
        called = true;
        callback(error, ...output);
      }
    }
    function then(value) {
      done(null, value);
    }
  }

  // ../node_modules/vfile/lib/index.js
  var import_is_buffer = __toESM(require_is_buffer(), 1);

  // ../node_modules/unist-util-stringify-position/lib/index.js
  function stringifyPosition(value) {
    if (!value || typeof value !== "object") {
      return "";
    }
    if ("position" in value || "type" in value) {
      return position(value.position);
    }
    if ("start" in value || "end" in value) {
      return position(value);
    }
    if ("line" in value || "column" in value) {
      return point(value);
    }
    return "";
  }
  function point(point2) {
    return index(point2 && point2.line) + ":" + index(point2 && point2.column);
  }
  function position(pos) {
    return point(pos && pos.start) + "-" + point(pos && pos.end);
  }
  function index(value) {
    return value && typeof value === "number" ? value : 1;
  }

  // ../node_modules/vfile-message/lib/index.js
  var VFileMessage = class extends Error {
    /**
     * Create a message for `reason` at `place` from `origin`.
     *
     * When an error is passed in as `reason`, the `stack` is copied.
     *
     * @param {string | Error | VFileMessage} reason
     *   Reason for message, uses the stack and message of the error if given.
     *
     *   > 👉 **Note**: you should use markdown.
     * @param {Node | NodeLike | Position | Point | null | undefined} [place]
     *   Place in file where the message occurred.
     * @param {string | null | undefined} [origin]
     *   Place in code where the message originates (example:
     *   `'my-package:my-rule'` or `'my-rule'`).
     * @returns
     *   Instance of `VFileMessage`.
     */
    // To do: next major: expose `undefined` everywhere instead of `null`.
    constructor(reason, place, origin) {
      const parts = [null, null];
      let position2 = {
        // @ts-expect-error: we always follows the structure of `position`.
        start: { line: null, column: null },
        // @ts-expect-error: "
        end: { line: null, column: null }
      };
      super();
      if (typeof place === "string") {
        origin = place;
        place = void 0;
      }
      if (typeof origin === "string") {
        const index2 = origin.indexOf(":");
        if (index2 === -1) {
          parts[1] = origin;
        } else {
          parts[0] = origin.slice(0, index2);
          parts[1] = origin.slice(index2 + 1);
        }
      }
      if (place) {
        if ("type" in place || "position" in place) {
          if (place.position) {
            position2 = place.position;
          }
        } else if ("start" in place || "end" in place) {
          position2 = place;
        } else if ("line" in place || "column" in place) {
          position2.start = place;
        }
      }
      this.name = stringifyPosition(place) || "1:1";
      this.message = typeof reason === "object" ? reason.message : reason;
      this.stack = "";
      if (typeof reason === "object" && reason.stack) {
        this.stack = reason.stack;
      }
      this.reason = this.message;
      this.fatal;
      this.line = position2.start.line;
      this.column = position2.start.column;
      this.position = position2;
      this.source = parts[0];
      this.ruleId = parts[1];
      this.file;
      this.actual;
      this.expected;
      this.url;
      this.note;
    }
  };
  VFileMessage.prototype.file = "";
  VFileMessage.prototype.name = "";
  VFileMessage.prototype.reason = "";
  VFileMessage.prototype.message = "";
  VFileMessage.prototype.stack = "";
  VFileMessage.prototype.fatal = null;
  VFileMessage.prototype.column = null;
  VFileMessage.prototype.line = null;
  VFileMessage.prototype.source = null;
  VFileMessage.prototype.ruleId = null;
  VFileMessage.prototype.position = null;

  // ../node_modules/vfile/lib/minpath.browser.js
  var path = { basename, dirname, extname, join, sep: "/" };
  function basename(path2, ext) {
    if (ext !== void 0 && typeof ext !== "string") {
      throw new TypeError('"ext" argument must be a string');
    }
    assertPath(path2);
    let start = 0;
    let end = -1;
    let index2 = path2.length;
    let seenNonSlash;
    if (ext === void 0 || ext.length === 0 || ext.length > path2.length) {
      while (index2--) {
        if (path2.charCodeAt(index2) === 47) {
          if (seenNonSlash) {
            start = index2 + 1;
            break;
          }
        } else if (end < 0) {
          seenNonSlash = true;
          end = index2 + 1;
        }
      }
      return end < 0 ? "" : path2.slice(start, end);
    }
    if (ext === path2) {
      return "";
    }
    let firstNonSlashEnd = -1;
    let extIndex = ext.length - 1;
    while (index2--) {
      if (path2.charCodeAt(index2) === 47) {
        if (seenNonSlash) {
          start = index2 + 1;
          break;
        }
      } else {
        if (firstNonSlashEnd < 0) {
          seenNonSlash = true;
          firstNonSlashEnd = index2 + 1;
        }
        if (extIndex > -1) {
          if (path2.charCodeAt(index2) === ext.charCodeAt(extIndex--)) {
            if (extIndex < 0) {
              end = index2;
            }
          } else {
            extIndex = -1;
            end = firstNonSlashEnd;
          }
        }
      }
    }
    if (start === end) {
      end = firstNonSlashEnd;
    } else if (end < 0) {
      end = path2.length;
    }
    return path2.slice(start, end);
  }
  function dirname(path2) {
    assertPath(path2);
    if (path2.length === 0) {
      return ".";
    }
    let end = -1;
    let index2 = path2.length;
    let unmatchedSlash;
    while (--index2) {
      if (path2.charCodeAt(index2) === 47) {
        if (unmatchedSlash) {
          end = index2;
          break;
        }
      } else if (!unmatchedSlash) {
        unmatchedSlash = true;
      }
    }
    return end < 0 ? path2.charCodeAt(0) === 47 ? "/" : "." : end === 1 && path2.charCodeAt(0) === 47 ? "//" : path2.slice(0, end);
  }
  function extname(path2) {
    assertPath(path2);
    let index2 = path2.length;
    let end = -1;
    let startPart = 0;
    let startDot = -1;
    let preDotState = 0;
    let unmatchedSlash;
    while (index2--) {
      const code = path2.charCodeAt(index2);
      if (code === 47) {
        if (unmatchedSlash) {
          startPart = index2 + 1;
          break;
        }
        continue;
      }
      if (end < 0) {
        unmatchedSlash = true;
        end = index2 + 1;
      }
      if (code === 46) {
        if (startDot < 0) {
          startDot = index2;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot > -1) {
        preDotState = -1;
      }
    }
    if (startDot < 0 || end < 0 || // We saw a non-dot character immediately before the dot.
    preDotState === 0 || // The (right-most) trimmed path component is exactly `..`.
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return "";
    }
    return path2.slice(startDot, end);
  }
  function join(...segments) {
    let index2 = -1;
    let joined;
    while (++index2 < segments.length) {
      assertPath(segments[index2]);
      if (segments[index2]) {
        joined = joined === void 0 ? segments[index2] : joined + "/" + segments[index2];
      }
    }
    return joined === void 0 ? "." : normalize(joined);
  }
  function normalize(path2) {
    assertPath(path2);
    const absolute = path2.charCodeAt(0) === 47;
    let value = normalizeString(path2, !absolute);
    if (value.length === 0 && !absolute) {
      value = ".";
    }
    if (value.length > 0 && path2.charCodeAt(path2.length - 1) === 47) {
      value += "/";
    }
    return absolute ? "/" + value : value;
  }
  function normalizeString(path2, allowAboveRoot) {
    let result = "";
    let lastSegmentLength = 0;
    let lastSlash = -1;
    let dots = 0;
    let index2 = -1;
    let code;
    let lastSlashIndex;
    while (++index2 <= path2.length) {
      if (index2 < path2.length) {
        code = path2.charCodeAt(index2);
      } else if (code === 47) {
        break;
      } else {
        code = 47;
      }
      if (code === 47) {
        if (lastSlash === index2 - 1 || dots === 1) {
        } else if (lastSlash !== index2 - 1 && dots === 2) {
          if (result.length < 2 || lastSegmentLength !== 2 || result.charCodeAt(result.length - 1) !== 46 || result.charCodeAt(result.length - 2) !== 46) {
            if (result.length > 2) {
              lastSlashIndex = result.lastIndexOf("/");
              if (lastSlashIndex !== result.length - 1) {
                if (lastSlashIndex < 0) {
                  result = "";
                  lastSegmentLength = 0;
                } else {
                  result = result.slice(0, lastSlashIndex);
                  lastSegmentLength = result.length - 1 - result.lastIndexOf("/");
                }
                lastSlash = index2;
                dots = 0;
                continue;
              }
            } else if (result.length > 0) {
              result = "";
              lastSegmentLength = 0;
              lastSlash = index2;
              dots = 0;
              continue;
            }
          }
          if (allowAboveRoot) {
            result = result.length > 0 ? result + "/.." : "..";
            lastSegmentLength = 2;
          }
        } else {
          if (result.length > 0) {
            result += "/" + path2.slice(lastSlash + 1, index2);
          } else {
            result = path2.slice(lastSlash + 1, index2);
          }
          lastSegmentLength = index2 - lastSlash - 1;
        }
        lastSlash = index2;
        dots = 0;
      } else if (code === 46 && dots > -1) {
        dots++;
      } else {
        dots = -1;
      }
    }
    return result;
  }
  function assertPath(path2) {
    if (typeof path2 !== "string") {
      throw new TypeError(
        "Path must be a string. Received " + JSON.stringify(path2)
      );
    }
  }

  // ../node_modules/vfile/lib/minproc.browser.js
  var proc = { cwd };
  function cwd() {
    return "/";
  }

  // ../node_modules/vfile/lib/minurl.shared.js
  function isUrl(fileUrlOrPath) {
    return fileUrlOrPath !== null && typeof fileUrlOrPath === "object" && // @ts-expect-error: indexable.
    fileUrlOrPath.href && // @ts-expect-error: indexable.
    fileUrlOrPath.origin;
  }

  // ../node_modules/vfile/lib/minurl.browser.js
  function urlToPath(path2) {
    if (typeof path2 === "string") {
      path2 = new URL(path2);
    } else if (!isUrl(path2)) {
      const error = new TypeError(
        'The "path" argument must be of type string or an instance of URL. Received `' + path2 + "`"
      );
      error.code = "ERR_INVALID_ARG_TYPE";
      throw error;
    }
    if (path2.protocol !== "file:") {
      const error = new TypeError("The URL must be of scheme file");
      error.code = "ERR_INVALID_URL_SCHEME";
      throw error;
    }
    return getPathFromURLPosix(path2);
  }
  function getPathFromURLPosix(url) {
    if (url.hostname !== "") {
      const error = new TypeError(
        'File URL host must be "localhost" or empty on darwin'
      );
      error.code = "ERR_INVALID_FILE_URL_HOST";
      throw error;
    }
    const pathname = url.pathname;
    let index2 = -1;
    while (++index2 < pathname.length) {
      if (pathname.charCodeAt(index2) === 37 && pathname.charCodeAt(index2 + 1) === 50) {
        const third = pathname.charCodeAt(index2 + 2);
        if (third === 70 || third === 102) {
          const error = new TypeError(
            "File URL path must not include encoded / characters"
          );
          error.code = "ERR_INVALID_FILE_URL_PATH";
          throw error;
        }
      }
    }
    return decodeURIComponent(pathname);
  }

  // ../node_modules/vfile/lib/index.js
  var order = ["history", "path", "basename", "stem", "extname", "dirname"];
  var VFile = class {
    /**
     * Create a new virtual file.
     *
     * `options` is treated as:
     *
     * *   `string` or `Buffer` — `{value: options}`
     * *   `URL` — `{path: options}`
     * *   `VFile` — shallow copies its data over to the new file
     * *   `object` — all fields are shallow copied over to the new file
     *
     * Path related fields are set in the following order (least specific to
     * most specific): `history`, `path`, `basename`, `stem`, `extname`,
     * `dirname`.
     *
     * You cannot set `dirname` or `extname` without setting either `history`,
     * `path`, `basename`, or `stem` too.
     *
     * @param {Compatible | null | undefined} [value]
     *   File value.
     * @returns
     *   New instance.
     */
    constructor(value) {
      let options;
      if (!value) {
        options = {};
      } else if (typeof value === "string" || buffer(value)) {
        options = { value };
      } else if (isUrl(value)) {
        options = { path: value };
      } else {
        options = value;
      }
      this.data = {};
      this.messages = [];
      this.history = [];
      this.cwd = proc.cwd();
      this.value;
      this.stored;
      this.result;
      this.map;
      let index2 = -1;
      while (++index2 < order.length) {
        const prop2 = order[index2];
        if (prop2 in options && options[prop2] !== void 0 && options[prop2] !== null) {
          this[prop2] = prop2 === "history" ? [...options[prop2]] : options[prop2];
        }
      }
      let prop;
      for (prop in options) {
        if (!order.includes(prop)) {
          this[prop] = options[prop];
        }
      }
    }
    /**
     * Get the full path (example: `'~/index.min.js'`).
     *
     * @returns {string}
     */
    get path() {
      return this.history[this.history.length - 1];
    }
    /**
     * Set the full path (example: `'~/index.min.js'`).
     *
     * Cannot be nullified.
     * You can set a file URL (a `URL` object with a `file:` protocol) which will
     * be turned into a path with `url.fileURLToPath`.
     *
     * @param {string | URL} path
     */
    set path(path2) {
      if (isUrl(path2)) {
        path2 = urlToPath(path2);
      }
      assertNonEmpty(path2, "path");
      if (this.path !== path2) {
        this.history.push(path2);
      }
    }
    /**
     * Get the parent path (example: `'~'`).
     */
    get dirname() {
      return typeof this.path === "string" ? path.dirname(this.path) : void 0;
    }
    /**
     * Set the parent path (example: `'~'`).
     *
     * Cannot be set if there’s no `path` yet.
     */
    set dirname(dirname2) {
      assertPath2(this.basename, "dirname");
      this.path = path.join(dirname2 || "", this.basename);
    }
    /**
     * Get the basename (including extname) (example: `'index.min.js'`).
     */
    get basename() {
      return typeof this.path === "string" ? path.basename(this.path) : void 0;
    }
    /**
     * Set basename (including extname) (`'index.min.js'`).
     *
     * Cannot contain path separators (`'/'` on unix, macOS, and browsers, `'\'`
     * on windows).
     * Cannot be nullified (use `file.path = file.dirname` instead).
     */
    set basename(basename2) {
      assertNonEmpty(basename2, "basename");
      assertPart(basename2, "basename");
      this.path = path.join(this.dirname || "", basename2);
    }
    /**
     * Get the extname (including dot) (example: `'.js'`).
     */
    get extname() {
      return typeof this.path === "string" ? path.extname(this.path) : void 0;
    }
    /**
     * Set the extname (including dot) (example: `'.js'`).
     *
     * Cannot contain path separators (`'/'` on unix, macOS, and browsers, `'\'`
     * on windows).
     * Cannot be set if there’s no `path` yet.
     */
    set extname(extname2) {
      assertPart(extname2, "extname");
      assertPath2(this.dirname, "extname");
      if (extname2) {
        if (extname2.charCodeAt(0) !== 46) {
          throw new Error("`extname` must start with `.`");
        }
        if (extname2.includes(".", 1)) {
          throw new Error("`extname` cannot contain multiple dots");
        }
      }
      this.path = path.join(this.dirname, this.stem + (extname2 || ""));
    }
    /**
     * Get the stem (basename w/o extname) (example: `'index.min'`).
     */
    get stem() {
      return typeof this.path === "string" ? path.basename(this.path, this.extname) : void 0;
    }
    /**
     * Set the stem (basename w/o extname) (example: `'index.min'`).
     *
     * Cannot contain path separators (`'/'` on unix, macOS, and browsers, `'\'`
     * on windows).
     * Cannot be nullified (use `file.path = file.dirname` instead).
     */
    set stem(stem) {
      assertNonEmpty(stem, "stem");
      assertPart(stem, "stem");
      this.path = path.join(this.dirname || "", stem + (this.extname || ""));
    }
    /**
     * Serialize the file.
     *
     * @param {BufferEncoding | null | undefined} [encoding='utf8']
     *   Character encoding to understand `value` as when it’s a `Buffer`
     *   (default: `'utf8'`).
     * @returns {string}
     *   Serialized file.
     */
    toString(encoding) {
      return (this.value || "").toString(encoding || void 0);
    }
    /**
     * Create a warning message associated with the file.
     *
     * Its `fatal` is set to `false` and `file` is set to the current file path.
     * Its added to `file.messages`.
     *
     * @param {string | Error | VFileMessage} reason
     *   Reason for message, uses the stack and message of the error if given.
     * @param {Node | NodeLike | Position | Point | null | undefined} [place]
     *   Place in file where the message occurred.
     * @param {string | null | undefined} [origin]
     *   Place in code where the message originates (example:
     *   `'my-package:my-rule'` or `'my-rule'`).
     * @returns {VFileMessage}
     *   Message.
     */
    message(reason, place, origin) {
      const message = new VFileMessage(reason, place, origin);
      if (this.path) {
        message.name = this.path + ":" + message.name;
        message.file = this.path;
      }
      message.fatal = false;
      this.messages.push(message);
      return message;
    }
    /**
     * Create an info message associated with the file.
     *
     * Its `fatal` is set to `null` and `file` is set to the current file path.
     * Its added to `file.messages`.
     *
     * @param {string | Error | VFileMessage} reason
     *   Reason for message, uses the stack and message of the error if given.
     * @param {Node | NodeLike | Position | Point | null | undefined} [place]
     *   Place in file where the message occurred.
     * @param {string | null | undefined} [origin]
     *   Place in code where the message originates (example:
     *   `'my-package:my-rule'` or `'my-rule'`).
     * @returns {VFileMessage}
     *   Message.
     */
    info(reason, place, origin) {
      const message = this.message(reason, place, origin);
      message.fatal = null;
      return message;
    }
    /**
     * Create a fatal error associated with the file.
     *
     * Its `fatal` is set to `true` and `file` is set to the current file path.
     * Its added to `file.messages`.
     *
     * > 👉 **Note**: a fatal error means that a file is no longer processable.
     *
     * @param {string | Error | VFileMessage} reason
     *   Reason for message, uses the stack and message of the error if given.
     * @param {Node | NodeLike | Position | Point | null | undefined} [place]
     *   Place in file where the message occurred.
     * @param {string | null | undefined} [origin]
     *   Place in code where the message originates (example:
     *   `'my-package:my-rule'` or `'my-rule'`).
     * @returns {never}
     *   Message.
     * @throws {VFileMessage}
     *   Message.
     */
    fail(reason, place, origin) {
      const message = this.message(reason, place, origin);
      message.fatal = true;
      throw message;
    }
  };
  function assertPart(part, name) {
    if (part && part.includes(path.sep)) {
      throw new Error(
        "`" + name + "` cannot be a path: did not expect `" + path.sep + "`"
      );
    }
  }
  function assertNonEmpty(part, name) {
    if (!part) {
      throw new Error("`" + name + "` cannot be empty");
    }
  }
  function assertPath2(path2, name) {
    if (!path2) {
      throw new Error("Setting `" + name + "` requires `path` to be set too");
    }
  }
  function buffer(value) {
    return (0, import_is_buffer.default)(value);
  }

  // ../node_modules/unified/lib/index.js
  var unified = base().freeze();
  var own = {}.hasOwnProperty;
  function base() {
    const transformers = trough();
    const attachers = [];
    let namespace = {};
    let frozen;
    let freezeIndex = -1;
    processor.data = data;
    processor.Parser = void 0;
    processor.Compiler = void 0;
    processor.freeze = freeze;
    processor.attachers = attachers;
    processor.use = use;
    processor.parse = parse2;
    processor.stringify = stringify;
    processor.run = run;
    processor.runSync = runSync;
    processor.process = process;
    processor.processSync = processSync;
    return processor;
    function processor() {
      const destination = base();
      let index2 = -1;
      while (++index2 < attachers.length) {
        destination.use(...attachers[index2]);
      }
      destination.data((0, import_extend.default)(true, {}, namespace));
      return destination;
    }
    function data(key, value) {
      if (typeof key === "string") {
        if (arguments.length === 2) {
          assertUnfrozen("data", frozen);
          namespace[key] = value;
          return processor;
        }
        return own.call(namespace, key) && namespace[key] || null;
      }
      if (key) {
        assertUnfrozen("data", frozen);
        namespace = key;
        return processor;
      }
      return namespace;
    }
    function freeze() {
      if (frozen) {
        return processor;
      }
      while (++freezeIndex < attachers.length) {
        const [attacher, ...options] = attachers[freezeIndex];
        if (options[0] === false) {
          continue;
        }
        if (options[0] === true) {
          options[0] = void 0;
        }
        const transformer = attacher.call(processor, ...options);
        if (typeof transformer === "function") {
          transformers.use(transformer);
        }
      }
      frozen = true;
      freezeIndex = Number.POSITIVE_INFINITY;
      return processor;
    }
    function use(value, ...options) {
      let settings;
      assertUnfrozen("use", frozen);
      if (value === null || value === void 0) {
      } else if (typeof value === "function") {
        addPlugin(value, ...options);
      } else if (typeof value === "object") {
        if (Array.isArray(value)) {
          addList(value);
        } else {
          addPreset(value);
        }
      } else {
        throw new TypeError("Expected usable value, not `" + value + "`");
      }
      if (settings) {
        namespace.settings = Object.assign(namespace.settings || {}, settings);
      }
      return processor;
      function add(value2) {
        if (typeof value2 === "function") {
          addPlugin(value2);
        } else if (typeof value2 === "object") {
          if (Array.isArray(value2)) {
            const [plugin, ...options2] = value2;
            addPlugin(plugin, ...options2);
          } else {
            addPreset(value2);
          }
        } else {
          throw new TypeError("Expected usable value, not `" + value2 + "`");
        }
      }
      function addPreset(result) {
        addList(result.plugins);
        if (result.settings) {
          settings = Object.assign(settings || {}, result.settings);
        }
      }
      function addList(plugins) {
        let index2 = -1;
        if (plugins === null || plugins === void 0) {
        } else if (Array.isArray(plugins)) {
          while (++index2 < plugins.length) {
            const thing = plugins[index2];
            add(thing);
          }
        } else {
          throw new TypeError("Expected a list of plugins, not `" + plugins + "`");
        }
      }
      function addPlugin(plugin, value2) {
        let index2 = -1;
        let entry;
        while (++index2 < attachers.length) {
          if (attachers[index2][0] === plugin) {
            entry = attachers[index2];
            break;
          }
        }
        if (entry) {
          if (isPlainObject(entry[1]) && isPlainObject(value2)) {
            value2 = (0, import_extend.default)(true, entry[1], value2);
          }
          entry[1] = value2;
        } else {
          attachers.push([...arguments]);
        }
      }
    }
    function parse2(doc) {
      processor.freeze();
      const file = vfile(doc);
      const Parser = processor.Parser;
      assertParser("parse", Parser);
      if (newable(Parser, "parse")) {
        return new Parser(String(file), file).parse();
      }
      return Parser(String(file), file);
    }
    function stringify(node, doc) {
      processor.freeze();
      const file = vfile(doc);
      const Compiler = processor.Compiler;
      assertCompiler("stringify", Compiler);
      assertNode(node);
      if (newable(Compiler, "compile")) {
        return new Compiler(node, file).compile();
      }
      return Compiler(node, file);
    }
    function run(node, doc, callback) {
      assertNode(node);
      processor.freeze();
      if (!callback && typeof doc === "function") {
        callback = doc;
        doc = void 0;
      }
      if (!callback) {
        return new Promise(executor);
      }
      executor(null, callback);
      function executor(resolve, reject) {
        transformers.run(node, vfile(doc), done);
        function done(error, tree, file) {
          tree = tree || node;
          if (error) {
            reject(error);
          } else if (resolve) {
            resolve(tree);
          } else {
            callback(null, tree, file);
          }
        }
      }
    }
    function runSync(node, file) {
      let result;
      let complete;
      processor.run(node, file, done);
      assertDone("runSync", "run", complete);
      return result;
      function done(error, tree) {
        bail(error);
        result = tree;
        complete = true;
      }
    }
    function process(doc, callback) {
      processor.freeze();
      assertParser("process", processor.Parser);
      assertCompiler("process", processor.Compiler);
      if (!callback) {
        return new Promise(executor);
      }
      executor(null, callback);
      function executor(resolve, reject) {
        const file = vfile(doc);
        processor.run(processor.parse(file), file, (error, tree, file2) => {
          if (error || !tree || !file2) {
            done(error);
          } else {
            const result = processor.stringify(tree, file2);
            if (result === void 0 || result === null) {
            } else if (looksLikeAVFileValue(result)) {
              file2.value = result;
            } else {
              file2.result = result;
            }
            done(error, file2);
          }
        });
        function done(error, file2) {
          if (error || !file2) {
            reject(error);
          } else if (resolve) {
            resolve(file2);
          } else {
            callback(null, file2);
          }
        }
      }
    }
    function processSync(doc) {
      let complete;
      processor.freeze();
      assertParser("processSync", processor.Parser);
      assertCompiler("processSync", processor.Compiler);
      const file = vfile(doc);
      processor.process(file, done);
      assertDone("processSync", "process", complete);
      return file;
      function done(error) {
        complete = true;
        bail(error);
      }
    }
  }
  function newable(value, name) {
    return typeof value === "function" && // Prototypes do exist.
    // type-coverage:ignore-next-line
    value.prototype && // A function with keys in its prototype is probably a constructor.
    // Classes’ prototype methods are not enumerable, so we check if some value
    // exists in the prototype.
    // type-coverage:ignore-next-line
    (keys(value.prototype) || name in value.prototype);
  }
  function keys(value) {
    let key;
    for (key in value) {
      if (own.call(value, key)) {
        return true;
      }
    }
    return false;
  }
  function assertParser(name, value) {
    if (typeof value !== "function") {
      throw new TypeError("Cannot `" + name + "` without `Parser`");
    }
  }
  function assertCompiler(name, value) {
    if (typeof value !== "function") {
      throw new TypeError("Cannot `" + name + "` without `Compiler`");
    }
  }
  function assertUnfrozen(name, frozen) {
    if (frozen) {
      throw new Error(
        "Cannot call `" + name + "` on a frozen processor.\nCreate a new processor first, by calling it: use `processor()` instead of `processor`."
      );
    }
  }
  function assertNode(node) {
    if (!isPlainObject(node) || typeof node.type !== "string") {
      throw new TypeError("Expected node, got `" + node + "`");
    }
  }
  function assertDone(name, asyncName, complete) {
    if (!complete) {
      throw new Error(
        "`" + name + "` finished async. Use `" + asyncName + "` instead"
      );
    }
  }
  function vfile(value) {
    return looksLikeAVFile(value) ? value : new VFile(value);
  }
  function looksLikeAVFile(value) {
    return Boolean(
      value && typeof value === "object" && "message" in value && "messages" in value
    );
  }
  function looksLikeAVFileValue(value) {
    return typeof value === "string" || (0, import_is_buffer2.default)(value);
  }

  // ../node_modules/@unified-latex/unified-latex-builder/index.js
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

  // ../node_modules/@unified-latex/unified-latex-util-print-raw/index.js
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

  // ../node_modules/@unified-latex/unified-latex-util-match/index.js
  function createMacroMatcher(macros17) {
    const macrosHash = Array.isArray(macros17) ? macros17.length > 0 ? typeof macros17[0] === "string" ? Object.fromEntries(
      macros17.map((macro2) => {
        if (typeof macro2 !== "string") {
          throw new Error("Wrong branch of map function");
        }
        return [macro2, {}];
      })
    ) : Object.fromEntries(
      macros17.map((macro2) => {
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
    ) : {} : macros17;
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
  function createEnvironmentMatcher(macros17) {
    const environmentsHash = Array.isArray(macros17) ? Object.fromEntries(
      macros17.map((str) => {
        return [str, {}];
      })
    ) : macros17;
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

  // ../node_modules/@unified-latex/unified-latex-util-visit/index.js
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
    function walk(node, { key, index: index2, parents, context, containingArray }) {
      const nodePassesTest = includeArrays ? test(node, { key, index: index2, parents, context, containingArray }) : !Array.isArray(node) && test(node, { key, index: index2, parents, context, containingArray });
      const result = enter && nodePassesTest ? toResult(
        enter(node, {
          key,
          index: index2,
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
            index: index2,
            parents,
            context,
            containingArray
          })
        ) : result;
      }
      if (Array.isArray(node)) {
        for (let index22 = 0; index22 > -1 && index22 < node.length; index22++) {
          const item = node[index22];
          const result2 = walk(item, {
            key,
            index: index22,
            parents,
            context,
            containingArray: node
          });
          if (result2[0] === EXIT) {
            return result2;
          }
          if (typeof result2[1] === "number") {
            index22 = result2[1] - 1;
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
          index: index2,
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

  // ../node_modules/@unified-latex/unified-latex-util-render-info/index.js
  function updateRenderInfo(node, renderInfo) {
    if (renderInfo != null) {
      node._renderInfo = { ...node._renderInfo || {}, ...renderInfo };
    }
    return node;
  }

  // ../node_modules/@unified-latex/unified-latex-util-trim/index.js
  function trim(nodes) {
    if (!Array.isArray(nodes)) {
      console.warn("Trying to trim a non-array ast", nodes);
      return nodes;
    }
    const { trimmedStart } = trimStart(nodes);
    const { trimmedEnd } = trimEnd(nodes);
    return { trimmedStart, trimmedEnd };
  }
  function trimStart(nodes) {
    const { start } = amountOfLeadingAndTrailingWhitespace(nodes);
    nodes.splice(0, start);
    for (const leadingToken of nodes) {
      if (!match.comment(leadingToken)) {
        break;
      }
      if (leadingToken.leadingWhitespace || leadingToken.sameline) {
        leadingToken.leadingWhitespace = false;
        delete leadingToken.position;
      }
      if (start > 0 && leadingToken.sameline) {
        leadingToken.sameline = false;
        delete leadingToken.position;
      }
    }
    return { trimmedStart: start };
  }
  function trimEnd(nodes) {
    const { end } = amountOfLeadingAndTrailingWhitespace(nodes);
    nodes.splice(nodes.length - end, end);
    for (let i = nodes.length - 1; i >= 0; i--) {
      const trailingToken = nodes[i];
      if (!match.comment(trailingToken)) {
        break;
      }
      delete trailingToken.suffixParbreak;
      if (match.comment(trailingToken) && trailingToken.leadingWhitespace && !trailingToken.sameline) {
        trailingToken.leadingWhitespace = false;
        delete trailingToken.position;
      }
    }
    return { trimmedEnd: end };
  }
  function amountOfLeadingAndTrailingWhitespace(ast) {
    let start = 0;
    let end = 0;
    for (const node of ast) {
      if (match.whitespace(node) || match.parbreak(node)) {
        start++;
      } else {
        break;
      }
    }
    if (start === ast.length) {
      return { start, end: 0 };
    }
    for (let i = ast.length - 1; i >= 0; i--) {
      const node = ast[i];
      if (match.whitespace(node) || match.parbreak(node)) {
        end++;
      } else {
        break;
      }
    }
    return { start, end };
  }
  var unifiedLatexTrimEnvironmentContents = function unifiedLatexTrimEnvironmentContents2() {
    return (tree) => {
      visit(tree, (node) => {
        if (!(match.math(node) || match.anyEnvironment(node))) {
          return;
        }
        let firstNode = node.content[0];
        if (match.comment(firstNode) && firstNode.sameline) {
          firstNode.suffixParbreak = false;
          trimEnd(node.content);
          const { trimmedStart } = trimStart(node.content.slice(1));
          node.content.splice(1, trimmedStart);
        } else {
          trim(node.content);
        }
      });
    };
  };
  var unifiedLatexTrimRoot = function unifiedLatexTrimRoot2() {
    return (tree) => {
      trim(tree.content);
    };
  };

  // ../node_modules/@unified-latex/unified-latex-util-split/index.js
  function splitOnCondition(nodes, splitFunc = () => false, options) {
    if (!Array.isArray(nodes)) {
      throw new Error(`Can only split an Array, not ${nodes}`);
    }
    const { onlySplitOnFirstOccurrence = false } = options || {};
    const splitIndices = [];
    for (let i = 0; i < nodes.length; i++) {
      if (splitFunc(nodes[i])) {
        splitIndices.push(i);
        if (onlySplitOnFirstOccurrence) {
          break;
        }
      }
    }
    if (splitIndices.length === 0) {
      return { segments: [nodes], separators: [] };
    }
    let separators = splitIndices.map((i) => nodes[i]);
    let segments = splitIndices.map((splitEnd, i) => {
      const splitStart = i === 0 ? 0 : splitIndices[i - 1] + 1;
      return nodes.slice(splitStart, splitEnd);
    });
    segments.push(
      nodes.slice(splitIndices[splitIndices.length - 1] + 1, nodes.length)
    );
    return { segments, separators };
  }
  function splitOnMacro(ast, macroName) {
    if (typeof macroName === "string") {
      macroName = [macroName];
    }
    if (!Array.isArray(macroName)) {
      throw new Error("Type coercion failed");
    }
    const isSeparator = match.createMacroMatcher(macroName);
    const { segments, separators } = splitOnCondition(ast, isSeparator);
    return { segments, macros: separators };
  }

  // ../node_modules/@unified-latex/unified-latex-util-replace/index.js
  function lastSignificantNodeIndex(nodes, parbreaksAreInsignificant) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (match.whitespace(node) || match.comment(node) || parbreaksAreInsignificant && match.parbreak(node)) {
        continue;
      }
      return i;
    }
    return void 0;
  }

  // ../node_modules/@unified-latex/unified-latex-util-pegjs/index.js
  var latex_default = (
    // Generated by Peggy 3.0.2.
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
          var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s2) : s2;
          var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
          if (src) {
            var e = this.location.end;
            var filler = peg$padEnd("", offset_s.line.toString().length, " ");
            var line = src[s2.line - 1];
            var last = s2.line === e.line ? e.column : line.length + 1;
            var hatLen = last - s2.column || 1;
            str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
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
        var peg$c4 = "[";
        var peg$c5 = "]";
        var peg$c6 = "lstinline";
        var peg$c7 = "mintinline";
        var peg$c8 = "mint";
        var peg$c9 = "minted";
        var peg$c10 = "verbatim*";
        var peg$c11 = "verbatim";
        var peg$c12 = "filecontents*";
        var peg$c13 = "filecontents";
        var peg$c14 = "comment";
        var peg$c15 = "lstlisting";
        var peg$c16 = "(";
        var peg$c17 = ")";
        var peg$c18 = "begin";
        var peg$c19 = "end";
        var peg$c20 = "equation*";
        var peg$c21 = "equation";
        var peg$c22 = "align*";
        var peg$c23 = "align";
        var peg$c24 = "alignat*";
        var peg$c25 = "alignat";
        var peg$c26 = "gather*";
        var peg$c27 = "gather";
        var peg$c28 = "multline*";
        var peg$c29 = "multline";
        var peg$c30 = "flalign*";
        var peg$c31 = "flalign";
        var peg$c32 = "split";
        var peg$c33 = "math";
        var peg$c34 = "displaymath";
        var peg$c35 = "\\";
        var peg$c36 = "{";
        var peg$c37 = "}";
        var peg$c38 = "$";
        var peg$c39 = "&";
        var peg$c40 = "\r";
        var peg$c41 = "\n";
        var peg$c42 = "\r\n";
        var peg$c43 = "#";
        var peg$c44 = "^";
        var peg$c45 = "_";
        var peg$c46 = "\0";
        var peg$r0 = /^[^ \t\n\r]/;
        var peg$r1 = /^[ \t]/;
        var peg$r2 = /^[a-zA-Z]/;
        var peg$r3 = /^[0-9]/;
        var peg$r4 = /^[.,;:\-*\/()!?=+<>[\]`'"~]/;
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
        var peg$e14 = peg$literalExpectation("[", false);
        var peg$e15 = peg$literalExpectation("]", false);
        var peg$e16 = peg$classExpectation([" ", "	", "\n", "\r"], true, false);
        var peg$e17 = peg$otherExpectation("verbatim listings");
        var peg$e18 = peg$literalExpectation("lstinline", false);
        var peg$e19 = peg$otherExpectation("verbatim minted");
        var peg$e20 = peg$literalExpectation("mintinline", false);
        var peg$e21 = peg$literalExpectation("mint", false);
        var peg$e22 = peg$otherExpectation("verbatim minted environment");
        var peg$e23 = peg$literalExpectation("minted", false);
        var peg$e24 = peg$otherExpectation("verbatim environment");
        var peg$e25 = peg$literalExpectation("verbatim*", false);
        var peg$e26 = peg$literalExpectation("verbatim", false);
        var peg$e27 = peg$literalExpectation("filecontents*", false);
        var peg$e28 = peg$literalExpectation("filecontents", false);
        var peg$e29 = peg$literalExpectation("comment", false);
        var peg$e30 = peg$literalExpectation("lstlisting", false);
        var peg$e31 = peg$otherExpectation("macro");
        var peg$e32 = peg$otherExpectation("group");
        var peg$e33 = peg$otherExpectation("environment");
        var peg$e34 = peg$otherExpectation("math environment");
        var peg$e35 = peg$otherExpectation("math group");
        var peg$e36 = peg$literalExpectation("(", false);
        var peg$e37 = peg$literalExpectation(")", false);
        var peg$e38 = peg$literalExpectation("begin", false);
        var peg$e39 = peg$literalExpectation("end", false);
        var peg$e40 = peg$literalExpectation("equation*", false);
        var peg$e41 = peg$literalExpectation("equation", false);
        var peg$e42 = peg$literalExpectation("align*", false);
        var peg$e43 = peg$literalExpectation("align", false);
        var peg$e44 = peg$literalExpectation("alignat*", false);
        var peg$e45 = peg$literalExpectation("alignat", false);
        var peg$e46 = peg$literalExpectation("gather*", false);
        var peg$e47 = peg$literalExpectation("gather", false);
        var peg$e48 = peg$literalExpectation("multline*", false);
        var peg$e49 = peg$literalExpectation("multline", false);
        var peg$e50 = peg$literalExpectation("flalign*", false);
        var peg$e51 = peg$literalExpectation("flalign", false);
        var peg$e52 = peg$literalExpectation("split", false);
        var peg$e53 = peg$literalExpectation("math", false);
        var peg$e54 = peg$literalExpectation("displaymath", false);
        var peg$e55 = peg$otherExpectation("escape");
        var peg$e56 = peg$literalExpectation("\\", false);
        var peg$e57 = peg$literalExpectation("{", false);
        var peg$e58 = peg$literalExpectation("}", false);
        var peg$e59 = peg$literalExpectation("$", false);
        var peg$e60 = peg$literalExpectation("&", false);
        var peg$e61 = peg$otherExpectation("newline");
        var peg$e62 = peg$literalExpectation("\r", false);
        var peg$e63 = peg$literalExpectation("\n", false);
        var peg$e64 = peg$literalExpectation("\r\n", false);
        var peg$e65 = peg$literalExpectation("#", false);
        var peg$e66 = peg$literalExpectation("^", false);
        var peg$e67 = peg$literalExpectation("_", false);
        var peg$e68 = peg$literalExpectation("\0", false);
        var peg$e69 = peg$classExpectation([" ", "	"], false, false);
        var peg$e70 = peg$otherExpectation("letter");
        var peg$e71 = peg$classExpectation([["a", "z"], ["A", "Z"]], false, false);
        var peg$e72 = peg$otherExpectation("digit");
        var peg$e73 = peg$classExpectation([["0", "9"]], false, false);
        var peg$e74 = peg$otherExpectation("punctuation");
        var peg$e75 = peg$classExpectation([".", ",", ";", ":", "-", "*", "/", "(", ")", "!", "?", "=", "+", "<", ">", "[", "]", "`", "'", '"', "~"], false, false);
        var peg$e76 = peg$otherExpectation("full comment");
        var peg$e77 = peg$otherExpectation("comment");
        var peg$f0 = function(content) {
          return createNode("root", { content: content.flatMap((x) => x) });
        };
        var peg$f1 = function(t) {
          return t;
        };
        var peg$f2 = function(eq) {
          return createNode("inlinemath", { content: eq.flatMap((x) => x) });
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
          return createNode("displaymath", { content: x.flatMap((x2) => x2) });
        };
        var peg$f22 = function(x) {
          return x;
        };
        var peg$f23 = function(x) {
          return createNode("inlinemath", { content: x.flatMap((x2) => x2) });
        };
        var peg$f24 = function(x) {
          return x;
        };
        var peg$f25 = function(x) {
          return createNode("displaymath", { content: x.flatMap((x2) => x2) });
        };
        var peg$f26 = function(end) {
          return end.type === "string" && end.content === "]";
        };
        var peg$f27 = function(x) {
          return x;
        };
        var peg$f28 = function(o) {
          return [
            createNode("string", { content: "[" }),
            ...o,
            createNode("string", { content: "]" })
          ];
        };
        var peg$f29 = function(x) {
          return x;
        };
        var peg$f30 = function(v) {
          return createNode("group", {
            content: createNode("string", { content: v.join("") })
          });
        };
        var peg$f31 = function(d, end) {
          return end == d;
        };
        var peg$f32 = function(d, x) {
          return x;
        };
        var peg$f33 = function(d, v, end) {
          return end == d;
        };
        var peg$f34 = function(d, v) {
          return [
            createNode("string", { content: d }),
            createNode("string", { content: v.join("") }),
            createNode("string", { content: d })
          ];
        };
        var peg$f35 = function(macro2, option, verbatim) {
          return [
            createNode("macro", { content: macro2 }),
            ...option || [],
            ...[].concat(verbatim)
          ];
        };
        var peg$f36 = function(macro2, option, language, verbatim) {
          return [
            createNode("macro", { content: macro2 }),
            ...option || [],
            language,
            ...[].concat(verbatim)
          ];
        };
        var peg$f37 = function(env, lang, end_env) {
          return compare_env({ content: [env] }, end_env);
        };
        var peg$f38 = function(env, lang, x) {
          return x;
        };
        var peg$f39 = function(env, lang, body) {
          return createNode("verbatim", {
            env: `${env}{${lang.content.content}}`,
            content: body.join("")
          });
        };
        var peg$f40 = function(env, end_env) {
          return compare_env({ content: [env] }, end_env);
        };
        var peg$f41 = function(env, x) {
          return x;
        };
        var peg$f42 = function(env, body) {
          return createNode("verbatim", {
            env,
            content: body.join("")
          });
        };
        var peg$f43 = function(n) {
          return n.join("");
        };
        var peg$f44 = function(n) {
          return n;
        };
        var peg$f45 = function(m) {
          return createNode("macro", { content: m });
        };
        var peg$f46 = function(c) {
          return c;
        };
        var peg$f47 = function(x) {
          return createNode("group", { content: x.flatMap((x2) => x2) });
        };
        var peg$f48 = function(g) {
          return text().slice(1, -1);
        };
        var peg$f49 = function(env, env_comment, end_env) {
          return compare_env(env, end_env);
        };
        var peg$f50 = function(env, env_comment, x) {
          return x;
        };
        var peg$f51 = function(env, env_comment, body) {
          body = body.flatMap((x) => x);
          return createNode("environment", {
            env,
            content: env_comment ? [env_comment, ...body] : body
          });
        };
        var peg$f52 = function(env, env_comment, end_env) {
          return compare_env({ content: [env] }, end_env);
        };
        var peg$f53 = function(env, env_comment, x) {
          return x;
        };
        var peg$f54 = function(env, env_comment, body) {
          body = body.flatMap((x) => x);
          return createNode("mathenv", {
            env,
            content: env_comment ? [env_comment, ...body] : body
          });
        };
        var peg$f55 = function(c) {
          return c;
        };
        var peg$f56 = function(x) {
          return createNode("group", { content: x.flatMap((x2) => x2) });
        };
        var peg$f57 = function(e) {
          return createNode("string", { content: e });
        };
        var peg$f58 = function() {
          return createNode("string", { content: "\\" });
        };
        var peg$f59 = function(s2) {
          return createNode("string", { content: s2 });
        };
        var peg$f60 = function(s2) {
          return createNode("string", { content: s2 });
        };
        var peg$f61 = function(s2) {
          return createNode("string", { content: s2 });
        };
        var peg$f62 = function(s2) {
          return createNode("string", { content: s2 });
        };
        var peg$f63 = function(s2) {
          return createNode("string", { content: s2 });
        };
        var peg$f64 = function(s2) {
          return createNode("string", { content: s2 });
        };
        var peg$f65 = function(s2) {
          return createNode("string", { content: s2 });
        };
        var peg$f66 = function() {
          return " ";
        };
        var peg$f67 = function(p) {
          return createNode("string", { content: p });
        };
        var peg$f68 = function(leading_sp, comment2) {
          return createNode("comment", {
            ...comment2,
            sameline: false,
            leadingWhitespace: leading_sp.length > 0
          });
        };
        var peg$f69 = function(spaces, x) {
          return createNode("comment", {
            ...x,
            sameline: true,
            leadingWhitespace: spaces.length > 0
          });
        };
        var peg$f70 = function(c) {
          return c;
        };
        var peg$f71 = function(c) {
          return { content: c.join(""), suffixParbreak: true };
        };
        var peg$f72 = function(c) {
          return c;
        };
        var peg$f73 = function(c) {
          return { content: c.join("") };
        };
        var peg$f74 = function() {
          var loc = location();
          return loc.start.column === 1;
        };
        var peg$currPos = 0;
        var peg$savedPos = 0;
        var peg$posDetailsCache = [{ line: 1, column: 1 }];
        var peg$maxFailPos = 0;
        var peg$maxFailExpected = [];
        var peg$silentFails = 0;
        var peg$resultsCache = {};
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
        function peg$computeLocation(startPos, endPos, offset2) {
          var startPosDetails = peg$computePosDetails(startPos);
          var endPosDetails = peg$computePosDetails(endPos);
          var res = {
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
          if (offset2 && peg$source && typeof peg$source.offset === "function") {
            res.start = peg$source.offset(res.start);
            res.end = peg$source.offset(res.end);
          }
          return res;
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
          var key = peg$currPos * 52 + 0;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsemath() {
          var s0, s1;
          var key = peg$currPos * 52 + 1;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsetoken() {
          var s0, s1, s2, s3, s4, s5;
          var key = peg$currPos * 52 + 2;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parseparbreak() {
          var s0, s1, s2, s3, s4, s5, s6, s7;
          var key = peg$currPos * 52 + 3;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsemath_token() {
          var s0, s1, s2, s3, s4;
          var key = peg$currPos * 52 + 4;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsenonchar_token() {
          var s0, s1;
          var key = peg$currPos * 52 + 5;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsewhitespace() {
          var s0, s1, s2, s3, s4, s5, s6, s7;
          var key = peg$currPos * 52 + 6;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsenumber() {
          var s0, s1, s2, s3, s4, s5;
          var key = peg$currPos * 52 + 7;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsespecial_macro() {
          var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;
          var key = peg$currPos * 52 + 8;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
            s0 = peg$parseverbatim_listings();
            if (s0 === peg$FAILED) {
              s0 = peg$parseverbatim_minted();
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
            }
          }
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e11);
            }
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsesquare_bracket_argument() {
          var s0, s1, s2, s3, s4, s5, s6, s7;
          var key = peg$currPos * 52 + 9;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 91) {
            s1 = peg$c4;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e14);
            }
          }
          if (s1 !== peg$FAILED) {
            s2 = [];
            s3 = peg$currPos;
            s4 = peg$currPos;
            peg$silentFails++;
            s5 = peg$currPos;
            s6 = peg$parsetoken();
            if (s6 !== peg$FAILED) {
              peg$savedPos = peg$currPos;
              s7 = peg$f26(s6);
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
                s3 = peg$f27(s5);
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
              s5 = peg$currPos;
              s6 = peg$parsetoken();
              if (s6 !== peg$FAILED) {
                peg$savedPos = peg$currPos;
                s7 = peg$f26(s6);
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
                  s3 = peg$f27(s5);
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            }
            if (input.charCodeAt(peg$currPos) === 93) {
              s3 = peg$c5;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e15);
              }
            }
            if (s3 !== peg$FAILED) {
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
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parseverbatim_group() {
          var s0, s1, s2, s3, s4, s5;
          var key = peg$currPos * 52 + 10;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
                s3 = peg$f29(s5);
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
                  s3 = peg$f29(s5);
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
              s0 = peg$f30(s2);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parseverbatim_delimited_by_char() {
          var s0, s1, s2, s3, s4, s5, s6, s7;
          var key = peg$currPos * 52 + 11;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          s0 = peg$currPos;
          if (peg$r0.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e16);
            }
          }
          if (s1 !== peg$FAILED) {
            s2 = [];
            s3 = peg$currPos;
            s4 = peg$currPos;
            peg$silentFails++;
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
              s7 = peg$f31(s1, s6);
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
                s3 = peg$f32(s1, s5);
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
                s7 = peg$f31(s1, s6);
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
                  s3 = peg$f32(s1, s5);
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
            if (input.length > peg$currPos) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e3);
              }
            }
            if (s4 !== peg$FAILED) {
              peg$savedPos = peg$currPos;
              s5 = peg$f33(s1, s2, s4);
              if (s5) {
                s5 = void 0;
              } else {
                s5 = peg$FAILED;
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
              peg$savedPos = s0;
              s0 = peg$f34(s1, s2);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parseverbatim_listings() {
          var s0, s1, s2, s3, s4;
          var key = peg$currPos * 52 + 12;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          peg$silentFails++;
          s0 = peg$currPos;
          s1 = peg$parseescape();
          if (s1 !== peg$FAILED) {
            if (input.substr(peg$currPos, 9) === peg$c6) {
              s2 = peg$c6;
              peg$currPos += 9;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e18);
              }
            }
            if (s2 !== peg$FAILED) {
              s3 = peg$parsesquare_bracket_argument();
              if (s3 === peg$FAILED) {
                s3 = null;
              }
              s4 = peg$parseverbatim_group();
              if (s4 === peg$FAILED) {
                s4 = peg$parseverbatim_delimited_by_char();
              }
              if (s4 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f35(s2, s3, s4);
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
              peg$fail(peg$e17);
            }
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parseverbatim_minted() {
          var s0, s1, s2, s3, s4, s5;
          var key = peg$currPos * 52 + 13;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          peg$silentFails++;
          s0 = peg$currPos;
          s1 = peg$parseescape();
          if (s1 !== peg$FAILED) {
            if (input.substr(peg$currPos, 10) === peg$c7) {
              s2 = peg$c7;
              peg$currPos += 10;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e20);
              }
            }
            if (s2 === peg$FAILED) {
              if (input.substr(peg$currPos, 4) === peg$c8) {
                s2 = peg$c8;
                peg$currPos += 4;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e21);
                }
              }
            }
            if (s2 !== peg$FAILED) {
              s3 = peg$parsesquare_bracket_argument();
              if (s3 === peg$FAILED) {
                s3 = null;
              }
              s4 = peg$parsegroup();
              if (s4 !== peg$FAILED) {
                s5 = peg$parseverbatim_group();
                if (s5 === peg$FAILED) {
                  s5 = peg$parseverbatim_delimited_by_char();
                }
                if (s5 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s0 = peg$f36(s2, s3, s4, s5);
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
              peg$fail(peg$e19);
            }
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parseverbatim_minted_environment() {
          var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12;
          var key = peg$currPos * 52 + 14;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          peg$silentFails++;
          s0 = peg$currPos;
          s1 = peg$parsebegin_env();
          if (s1 !== peg$FAILED) {
            s2 = peg$parsebegin_group();
            if (s2 !== peg$FAILED) {
              if (input.substr(peg$currPos, 6) === peg$c9) {
                s3 = peg$c9;
                peg$currPos += 6;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e23);
                }
              }
              if (s3 !== peg$FAILED) {
                s4 = peg$parseend_group();
                if (s4 !== peg$FAILED) {
                  s5 = peg$parsegroup();
                  if (s5 !== peg$FAILED) {
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
                        s12 = peg$f37(s3, s5, s11);
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
                      if (input.length > peg$currPos) {
                        s9 = input.charAt(peg$currPos);
                        peg$currPos++;
                      } else {
                        s9 = peg$FAILED;
                        if (peg$silentFails === 0) {
                          peg$fail(peg$e3);
                        }
                      }
                      if (s9 !== peg$FAILED) {
                        peg$savedPos = s7;
                        s7 = peg$f38(s3, s5, s9);
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
                          s12 = peg$f37(s3, s5, s11);
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
                        if (input.length > peg$currPos) {
                          s9 = input.charAt(peg$currPos);
                          peg$currPos++;
                        } else {
                          s9 = peg$FAILED;
                          if (peg$silentFails === 0) {
                            peg$fail(peg$e3);
                          }
                        }
                        if (s9 !== peg$FAILED) {
                          peg$savedPos = s7;
                          s7 = peg$f38(s3, s5, s9);
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
                        s9 = peg$parseverbatim_env_name();
                        if (s9 !== peg$FAILED) {
                          s10 = peg$parseend_group();
                          if (s10 !== peg$FAILED) {
                            peg$savedPos = s0;
                            s0 = peg$f39(s3, s5, s6);
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
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parseverbatim_environment() {
          var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;
          var key = peg$currPos * 52 + 15;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
                      s11 = peg$f40(s3, s10);
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
                      s6 = peg$f41(s3, s8);
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
                        s11 = peg$f40(s3, s10);
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
                        s6 = peg$f41(s3, s8);
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
                          s0 = peg$f42(s3, s5);
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
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parseverbatim_env_name() {
          var s0;
          var key = peg$currPos * 52 + 16;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          if (input.substr(peg$currPos, 9) === peg$c10) {
            s0 = peg$c10;
            peg$currPos += 9;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e25);
            }
          }
          if (s0 === peg$FAILED) {
            if (input.substr(peg$currPos, 8) === peg$c11) {
              s0 = peg$c11;
              peg$currPos += 8;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e26);
              }
            }
            if (s0 === peg$FAILED) {
              if (input.substr(peg$currPos, 13) === peg$c12) {
                s0 = peg$c12;
                peg$currPos += 13;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e27);
                }
              }
              if (s0 === peg$FAILED) {
                if (input.substr(peg$currPos, 12) === peg$c13) {
                  s0 = peg$c13;
                  peg$currPos += 12;
                } else {
                  s0 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e28);
                  }
                }
                if (s0 === peg$FAILED) {
                  if (input.substr(peg$currPos, 7) === peg$c14) {
                    s0 = peg$c14;
                    peg$currPos += 7;
                  } else {
                    s0 = peg$FAILED;
                    if (peg$silentFails === 0) {
                      peg$fail(peg$e29);
                    }
                  }
                  if (s0 === peg$FAILED) {
                    if (input.substr(peg$currPos, 10) === peg$c15) {
                      s0 = peg$c15;
                      peg$currPos += 10;
                    } else {
                      s0 = peg$FAILED;
                      if (peg$silentFails === 0) {
                        peg$fail(peg$e30);
                      }
                    }
                  }
                }
              }
            }
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsemacro() {
          var s0, s1, s2, s3, s4;
          var key = peg$currPos * 52 + 17;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
              s1 = peg$f43(s3);
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
                s1 = peg$f44(s3);
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
            s1 = peg$f45(s1);
          }
          s0 = s1;
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e31);
            }
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsegroup() {
          var s0, s1, s2, s3, s4, s5;
          var key = peg$currPos * 52 + 18;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
                s3 = peg$f46(s5);
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
                  s3 = peg$f46(s5);
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
              s0 = peg$f47(s2);
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
              peg$fail(peg$e32);
            }
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsegroup_contents_as_string() {
          var s0, s1;
          var key = peg$currPos * 52 + 19;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          s0 = peg$currPos;
          s1 = peg$parsegroup();
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f48(s1);
          }
          s0 = s1;
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parseenvironment() {
          var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;
          var key = peg$currPos * 52 + 20;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
                  s10 = peg$f49(s2, s3, s9);
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
                  s5 = peg$f50(s2, s3, s7);
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
                    s10 = peg$f49(s2, s3, s9);
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
                    s5 = peg$f50(s2, s3, s7);
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
                  s0 = peg$f51(s2, s3, s4);
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
              peg$fail(peg$e33);
            }
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsemath_environment() {
          var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12;
          var key = peg$currPos * 52 + 21;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
                      s12 = peg$f52(s3, s5, s11);
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
                      s7 = peg$f53(s3, s5, s9);
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
                        s12 = peg$f52(s3, s5, s11);
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
                        s7 = peg$f53(s3, s5, s9);
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
                          s0 = peg$f54(s3, s5, s6);
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
              peg$fail(peg$e34);
            }
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsemath_group() {
          var s0, s1, s2, s3, s4, s5;
          var key = peg$currPos * 52 + 22;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
                s3 = peg$f55(s5);
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
                  s3 = peg$f55(s5);
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
              s0 = peg$f56(s2);
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
              peg$fail(peg$e35);
            }
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsebegin_display_math() {
          var s0, s1, s2;
          var key = peg$currPos * 52 + 23;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          s0 = peg$currPos;
          s1 = peg$parseescape();
          if (s1 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 91) {
              s2 = peg$c4;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e14);
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
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parseend_display_math() {
          var s0, s1, s2;
          var key = peg$currPos * 52 + 24;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          s0 = peg$currPos;
          s1 = peg$parseescape();
          if (s1 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 93) {
              s2 = peg$c5;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e15);
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
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsebegin_inline_math() {
          var s0, s1, s2;
          var key = peg$currPos * 52 + 25;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          s0 = peg$currPos;
          s1 = peg$parseescape();
          if (s1 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 40) {
              s2 = peg$c16;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e36);
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
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parseend_inline_math() {
          var s0, s1, s2;
          var key = peg$currPos * 52 + 26;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          s0 = peg$currPos;
          s1 = peg$parseescape();
          if (s1 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 41) {
              s2 = peg$c17;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e37);
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
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsebegin_env() {
          var s0, s1, s2;
          var key = peg$currPos * 52 + 27;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          s0 = peg$currPos;
          s1 = peg$parseescape();
          if (s1 !== peg$FAILED) {
            if (input.substr(peg$currPos, 5) === peg$c18) {
              s2 = peg$c18;
              peg$currPos += 5;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e38);
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
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parseend_env() {
          var s0, s1, s2;
          var key = peg$currPos * 52 + 28;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          s0 = peg$currPos;
          s1 = peg$parseescape();
          if (s1 !== peg$FAILED) {
            if (input.substr(peg$currPos, 3) === peg$c19) {
              s2 = peg$c19;
              peg$currPos += 3;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e39);
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
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsemath_env_name() {
          var s0, s1;
          var key = peg$currPos * 52 + 29;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 9) === peg$c20) {
            s1 = peg$c20;
            peg$currPos += 9;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e40);
            }
          }
          if (s1 === peg$FAILED) {
            if (input.substr(peg$currPos, 8) === peg$c21) {
              s1 = peg$c21;
              peg$currPos += 8;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e41);
              }
            }
            if (s1 === peg$FAILED) {
              if (input.substr(peg$currPos, 6) === peg$c22) {
                s1 = peg$c22;
                peg$currPos += 6;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e42);
                }
              }
              if (s1 === peg$FAILED) {
                if (input.substr(peg$currPos, 5) === peg$c23) {
                  s1 = peg$c23;
                  peg$currPos += 5;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e43);
                  }
                }
                if (s1 === peg$FAILED) {
                  if (input.substr(peg$currPos, 8) === peg$c24) {
                    s1 = peg$c24;
                    peg$currPos += 8;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) {
                      peg$fail(peg$e44);
                    }
                  }
                  if (s1 === peg$FAILED) {
                    if (input.substr(peg$currPos, 7) === peg$c25) {
                      s1 = peg$c25;
                      peg$currPos += 7;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) {
                        peg$fail(peg$e45);
                      }
                    }
                    if (s1 === peg$FAILED) {
                      if (input.substr(peg$currPos, 7) === peg$c26) {
                        s1 = peg$c26;
                        peg$currPos += 7;
                      } else {
                        s1 = peg$FAILED;
                        if (peg$silentFails === 0) {
                          peg$fail(peg$e46);
                        }
                      }
                      if (s1 === peg$FAILED) {
                        if (input.substr(peg$currPos, 6) === peg$c27) {
                          s1 = peg$c27;
                          peg$currPos += 6;
                        } else {
                          s1 = peg$FAILED;
                          if (peg$silentFails === 0) {
                            peg$fail(peg$e47);
                          }
                        }
                        if (s1 === peg$FAILED) {
                          if (input.substr(peg$currPos, 9) === peg$c28) {
                            s1 = peg$c28;
                            peg$currPos += 9;
                          } else {
                            s1 = peg$FAILED;
                            if (peg$silentFails === 0) {
                              peg$fail(peg$e48);
                            }
                          }
                          if (s1 === peg$FAILED) {
                            if (input.substr(peg$currPos, 8) === peg$c29) {
                              s1 = peg$c29;
                              peg$currPos += 8;
                            } else {
                              s1 = peg$FAILED;
                              if (peg$silentFails === 0) {
                                peg$fail(peg$e49);
                              }
                            }
                            if (s1 === peg$FAILED) {
                              if (input.substr(peg$currPos, 8) === peg$c30) {
                                s1 = peg$c30;
                                peg$currPos += 8;
                              } else {
                                s1 = peg$FAILED;
                                if (peg$silentFails === 0) {
                                  peg$fail(peg$e50);
                                }
                              }
                              if (s1 === peg$FAILED) {
                                if (input.substr(peg$currPos, 7) === peg$c31) {
                                  s1 = peg$c31;
                                  peg$currPos += 7;
                                } else {
                                  s1 = peg$FAILED;
                                  if (peg$silentFails === 0) {
                                    peg$fail(peg$e51);
                                  }
                                }
                                if (s1 === peg$FAILED) {
                                  if (input.substr(peg$currPos, 5) === peg$c32) {
                                    s1 = peg$c32;
                                    peg$currPos += 5;
                                  } else {
                                    s1 = peg$FAILED;
                                    if (peg$silentFails === 0) {
                                      peg$fail(peg$e52);
                                    }
                                  }
                                  if (s1 === peg$FAILED) {
                                    if (input.substr(peg$currPos, 4) === peg$c33) {
                                      s1 = peg$c33;
                                      peg$currPos += 4;
                                    } else {
                                      s1 = peg$FAILED;
                                      if (peg$silentFails === 0) {
                                        peg$fail(peg$e53);
                                      }
                                    }
                                    if (s1 === peg$FAILED) {
                                      if (input.substr(peg$currPos, 11) === peg$c34) {
                                        s1 = peg$c34;
                                        peg$currPos += 11;
                                      } else {
                                        s1 = peg$FAILED;
                                        if (peg$silentFails === 0) {
                                          peg$fail(peg$e54);
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
            s1 = peg$f57(s1);
          }
          s0 = s1;
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parseescape() {
          var s0, s1;
          var key = peg$currPos * 52 + 30;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          peg$silentFails++;
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 92) {
            s1 = peg$c35;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e56);
            }
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f58();
          }
          s0 = s1;
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e55);
            }
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsebegin_group() {
          var s0, s1;
          var key = peg$currPos * 52 + 31;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 123) {
            s1 = peg$c36;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e57);
            }
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f59(s1);
          }
          s0 = s1;
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parseend_group() {
          var s0, s1;
          var key = peg$currPos * 52 + 32;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 125) {
            s1 = peg$c37;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e58);
            }
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f60(s1);
          }
          s0 = s1;
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsemath_shift() {
          var s0, s1;
          var key = peg$currPos * 52 + 33;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 36) {
            s1 = peg$c38;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e59);
            }
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f61(s1);
          }
          s0 = s1;
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsealignment_tab() {
          var s0, s1;
          var key = peg$currPos * 52 + 34;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 38) {
            s1 = peg$c39;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e60);
            }
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f62(s1);
          }
          s0 = s1;
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsenl() {
          var s0, s1, s2;
          var key = peg$currPos * 52 + 35;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          peg$silentFails++;
          s0 = peg$currPos;
          s1 = peg$currPos;
          peg$silentFails++;
          if (input.charCodeAt(peg$currPos) === 13) {
            s2 = peg$c40;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e62);
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
              s2 = peg$c41;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e63);
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
              s0 = peg$c40;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e62);
              }
            }
            if (s0 === peg$FAILED) {
              if (input.substr(peg$currPos, 2) === peg$c42) {
                s0 = peg$c42;
                peg$currPos += 2;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e64);
                }
              }
            }
          }
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e61);
            }
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsemacro_parameter() {
          var s0, s1;
          var key = peg$currPos * 52 + 36;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 35) {
            s1 = peg$c43;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e65);
            }
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f63(s1);
          }
          s0 = s1;
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsesuperscript() {
          var s0, s1;
          var key = peg$currPos * 52 + 37;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 94) {
            s1 = peg$c44;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e66);
            }
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f64(s1);
          }
          s0 = s1;
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsesubscript() {
          var s0, s1;
          var key = peg$currPos * 52 + 38;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 95) {
            s1 = peg$c45;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e67);
            }
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f65(s1);
          }
          s0 = s1;
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parseignore() {
          var s0;
          var key = peg$currPos * 52 + 39;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          if (input.charCodeAt(peg$currPos) === 0) {
            s0 = peg$c46;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e68);
            }
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsesp() {
          var s0, s1, s2;
          var key = peg$currPos * 52 + 40;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          peg$silentFails++;
          s0 = peg$currPos;
          s1 = [];
          if (peg$r1.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e69);
            }
          }
          if (s2 !== peg$FAILED) {
            while (s2 !== peg$FAILED) {
              s1.push(s2);
              if (peg$r1.test(input.charAt(peg$currPos))) {
                s2 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e69);
                }
              }
            }
          } else {
            s1 = peg$FAILED;
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f66();
          }
          s0 = s1;
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e8);
            }
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsechar() {
          var s0, s1;
          var key = peg$currPos * 52 + 41;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          peg$silentFails++;
          if (peg$r2.test(input.charAt(peg$currPos))) {
            s0 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e71);
            }
          }
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e70);
            }
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsenum() {
          var s0, s1;
          var key = peg$currPos * 52 + 42;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          peg$silentFails++;
          if (peg$r3.test(input.charAt(peg$currPos))) {
            s0 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e73);
            }
          }
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e72);
            }
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsepunctuation() {
          var s0, s1;
          var key = peg$currPos * 52 + 43;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          peg$silentFails++;
          s0 = peg$currPos;
          if (peg$r4.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e75);
            }
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f67(s1);
          }
          s0 = s1;
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e74);
            }
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsecomment_start() {
          var s0;
          var key = peg$currPos * 52 + 44;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          if (input.charCodeAt(peg$currPos) === 37) {
            s0 = peg$c0;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e7);
            }
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsefull_comment() {
          var s0, s1;
          var key = peg$currPos * 52 + 45;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          peg$silentFails++;
          s0 = peg$parseownline_comment();
          if (s0 === peg$FAILED) {
            s0 = peg$parsesameline_comment();
          }
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e76);
            }
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parseownline_comment() {
          var s0, s1, s2, s3;
          var key = peg$currPos * 52 + 46;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
              s0 = peg$f68(s2, s3);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsesameline_comment() {
          var s0, s1, s2;
          var key = peg$currPos * 52 + 47;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
            s0 = peg$f69(s1, s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsecomment() {
          var s0, s1, s2, s3, s4, s5, s6, s7;
          var key = peg$currPos * 52 + 48;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
                s3 = peg$f70(s5);
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
                  s3 = peg$f70(s5);
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
              s0 = peg$f71(s2);
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
                  s3 = peg$f72(s5);
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
                    s3 = peg$f72(s5);
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
                s0 = peg$f73(s2);
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
              peg$fail(peg$e77);
            }
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parseleading_sp() {
          var s0, s1, s2, s3, s4;
          var key = peg$currPos * 52 + 49;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parsestart_of_line() {
          var s0;
          var key = peg$currPos * 52 + 50;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
          peg$savedPos = peg$currPos;
          s0 = peg$f74();
          if (s0) {
            s0 = void 0;
          } else {
            s0 = peg$FAILED;
          }
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
          return s0;
        }
        function peg$parseEOF() {
          var s0, s1;
          var key = peg$currPos * 52 + 51;
          var cached = peg$resultsCache[key];
          if (cached) {
            peg$currPos = cached.nextPos;
            return cached.result;
          }
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
          peg$resultsCache[key] = { nextPos: peg$currPos, result: s0 };
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
    // Generated by Peggy 3.0.2.
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
          var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s2) : s2;
          var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
          if (src) {
            var e = this.location.end;
            var filler = peg$padEnd("", offset_s.line.toString().length, " ");
            var line = src[s2.line - 1];
            var last = s2.line === e.line ? e.column : line.length + 1;
            var hatLen = last - s2.column || 1;
            str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
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
        function peg$computeLocation(startPos, endPos, offset2) {
          var startPosDetails = peg$computePosDetails(startPos);
          var endPosDetails = peg$computePosDetails(endPos);
          var res = {
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
          if (offset2 && peg$source && typeof peg$source.offset === "function") {
            res.start = peg$source.offset(res.start);
            res.end = peg$source.offset(res.end);
          }
          return res;
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
    // Generated by Peggy 3.0.2.
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
          var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s2) : s2;
          var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
          if (src) {
            var e = this.location.end;
            var filler = peg$padEnd("", offset_s.line.toString().length, " ");
            var line = src[s2.line - 1];
            var last = s2.line === e.line ? e.column : line.length + 1;
            var hatLen = last - s2.column || 1;
            str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
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
            embellishmentTokens: args.content.map(groupContent).flat()
          });
        };
        var peg$f12 = function(args, g) {
          return createNode("embellishment", {
            embellishmentTokens: args.content.map(groupContent).flat(),
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
        function peg$computeLocation(startPos, endPos, offset2) {
          var startPosDetails = peg$computePosDetails(startPos);
          var endPosDetails = peg$computePosDetails(endPos);
          var res = {
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
          if (offset2 && peg$source && typeof peg$source.offset === "function") {
            res.start = peg$source.offset(res.start);
            res.end = peg$source.offset(res.end);
          }
          return res;
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
        function groupContent(node) {
          if (node.type === "group") {
            return node.content.map(groupContent).flat();
          }
          return node;
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
    // Generated by Peggy 3.0.2.
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
          var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s2) : s2;
          var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
          if (src) {
            var e = this.location.end;
            var filler = peg$padEnd("", offset_s.line.toString().length, " ");
            var line = src[s2.line - 1];
            var last = s2.line === e.line ? e.column : line.length + 1;
            var hatLen = last - s2.column || 1;
            str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
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
        function peg$computeLocation(startPos, endPos, offset2) {
          var startPosDetails = peg$computePosDetails(startPos);
          var endPosDetails = peg$computePosDetails(endPos);
          var res = {
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
          if (offset2 && peg$source && typeof peg$source.offset === "function") {
            res.start = peg$source.offset(res.start);
            res.end = peg$source.offset(res.end);
          }
          return res;
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
    // Generated by Peggy 3.0.2.
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
          var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s2) : s2;
          var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
          if (src) {
            var e = this.location.end;
            var filler = peg$padEnd("", offset_s.line.toString().length, " ");
            var line = src[s2.line - 1];
            var last = s2.line === e.line ? e.column : line.length + 1;
            var hatLen = last - s2.column || 1;
            str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
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
        function peg$computeLocation(startPos, endPos, offset2) {
          var startPosDetails = peg$computePosDetails(startPos);
          var endPosDetails = peg$computePosDetails(endPos);
          var res = {
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
          if (offset2 && peg$source && typeof peg$source.offset === "function") {
            res.start = peg$source.offset(res.start);
            res.end = peg$source.offset(res.end);
          }
          return res;
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
    // Generated by Peggy 3.0.2.
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
          var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s2) : s2;
          var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
          if (src) {
            var e = this.location.end;
            var filler = peg$padEnd("", offset_s.line.toString().length, " ");
            var line = src[s2.line - 1];
            var last = s2.line === e.line ? e.column : line.length + 1;
            var hatLen = last - s2.column || 1;
            str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
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
        function peg$computeLocation(startPos, endPos, offset2) {
          var startPosDetails = peg$computePosDetails(startPos);
          var endPosDetails = peg$computePosDetails(endPos);
          var res = {
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
          if (offset2 && peg$source && typeof peg$source.offset === "function") {
            res.start = peg$source.offset(res.start);
            res.end = peg$source.offset(res.end);
          }
          return res;
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
    // Generated by Peggy 3.0.2.
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
          var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s2) : s2;
          var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
          if (src) {
            var e = this.location.end;
            var filler = peg$padEnd("", offset_s.line.toString().length, " ");
            var line = src[s2.line - 1];
            var last = s2.line === e.line ? e.column : line.length + 1;
            var hatLen = last - s2.column || 1;
            str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
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
        function peg$computeLocation(startPos, endPos, offset2) {
          var startPosDetails = peg$computePosDetails(startPos);
          var endPosDetails = peg$computePosDetails(endPos);
          var res = {
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
          if (offset2 && peg$source && typeof peg$source.offset === "function") {
            res.start = peg$source.offset(res.start);
            res.end = peg$source.offset(res.end);
          }
          return res;
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
    // Generated by Peggy 3.0.2.
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
          var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s2) : s2;
          var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
          if (src) {
            var e = this.location.end;
            var filler = peg$padEnd("", offset_s.line.toString().length, " ");
            var line = src[s2.line - 1];
            var last = s2.line === e.line ? e.column : line.length + 1;
            var hatLen = last - s2.column || 1;
            str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
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
        function peg$computeLocation(startPos, endPos, offset2) {
          var startPosDetails = peg$computePosDetails(startPos);
          var endPosDetails = peg$computePosDetails(endPos);
          var res = {
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
          if (offset2 && peg$source && typeof peg$source.offset === "function") {
            res.start = peg$source.offset(res.start);
            res.end = peg$source.offset(res.end);
          }
          return res;
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
    // Generated by Peggy 3.0.2.
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
          var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s2) : s2;
          var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
          if (src) {
            var e = this.location.end;
            var filler = peg$padEnd("", offset_s.line.toString().length, " ");
            var line = src[s2.line - 1];
            var last = s2.line === e.line ? e.column : line.length + 1;
            var hatLen = last - s2.column || 1;
            str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
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
        function peg$computeLocation(startPos, endPos, offset2) {
          var startPosDetails = peg$computePosDetails(startPos);
          var endPosDetails = peg$computePosDetails(endPos);
          var res = {
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
          if (offset2 && peg$source && typeof peg$source.offset === "function") {
            res.start = peg$source.offset(res.start);
            res.end = peg$source.offset(res.end);
          }
          return res;
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
    // Generated by Peggy 3.0.2.
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
          var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s2) : s2;
          var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
          if (src) {
            var e = this.location.end;
            var filler = peg$padEnd("", offset_s.line.toString().length, " ");
            var line = src[s2.line - 1];
            var last = s2.line === e.line ? e.column : line.length + 1;
            var hatLen = last - s2.column || 1;
            str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
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
        function peg$computeLocation(startPos, endPos, offset2) {
          var startPosDetails = peg$computePosDetails(startPos);
          var endPosDetails = peg$computePosDetails(endPos);
          var res = {
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
          if (offset2 && peg$source && typeof peg$source.offset === "function") {
            res.start = peg$source.offset(res.start);
            res.end = peg$source.offset(res.end);
          }
          return res;
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
    // Generated by Peggy 3.0.2.
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
          var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s2) : s2;
          var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
          if (src) {
            var e = this.location.end;
            var filler = peg$padEnd("", offset_s.line.toString().length, " ");
            var line = src[s2.line - 1];
            var last = s2.line === e.line ? e.column : line.length + 1;
            var hatLen = last - s2.column || 1;
            str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s2.column - 1, " ") + peg$padEnd("", hatLen, "^");
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
        function peg$computeLocation(startPos, endPos, offset2) {
          var startPosDetails = peg$computePosDetails(startPos);
          var endPosDetails = peg$computePosDetails(endPos);
          var res = {
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
          if (offset2 && peg$source && typeof peg$source.offset === "function") {
            res.start = peg$source.offset(res.start);
            res.end = peg$source.offset(res.end);
          }
          return res;
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
  var LatexPegParser = latex_default;
  var ArgSpecPegParser = xparse_argspec_default;

  // ../node_modules/@unified-latex/unified-latex-util-argspec/index.js
  var parseCache = {};
  function parse(str = "") {
    parseCache[str] = parseCache[str] || ArgSpecPegParser.parse(str);
    return parseCache[str];
  }

  // ../node_modules/@unified-latex/unified-latex-util-scan/index.js
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

  // ../node_modules/@unified-latex/unified-latex-util-arguments/index.js
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
  function attachMacroArgsInArray(nodes, macros17) {
    let currIndex;
    const isRelevantMacro = match.createMacroMatcher(macros17);
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
      const macroInfo2 = macros17[macroName];
      updateRenderInfo(macro2, macroInfo2.renderInfo);
      const signatureOrParser = macroInfo2.argumentParser || macroInfo2.signature;
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
  function attachMacroArgs(tree, macros17) {
    visit(
      tree,
      (nodes) => {
        attachMacroArgsInArray(nodes, macros17);
      },
      { includeArrays: true, test: Array.isArray }
    );
  }

  // ../node_modules/@unified-latex/unified-latex-ctan/index.js
  var import_color = __toESM(require_color(), 1);
  var import_color2 = __toESM(require_color(), 1);
  var macros = {
    cref: { signature: "s m" },
    Cref: { signature: "s m" },
    crefrange: { signature: "s m m" },
    Crefrange: { signature: "s m m" },
    cpageref: { signature: "s m" },
    Cpageref: { signature: "s m" },
    ref: { signature: "m" },
    pageref: { signature: "m" },
    namecref: { signature: "m" },
    nameCref: { signature: "m" },
    lcnamecref: { signature: "m" },
    namecrefs: { signature: "m" },
    nameCrefs: { signature: "m" },
    lcnamecrefs: { signature: "m" },
    labelcref: { signature: "m" },
    labelcpageref: { signature: "m" },
    crefalias: { signature: "m m" },
    crefname: { signature: "m m m" },
    // XXX there are many more obscure commands to add here
    // https://ctan.org/pkg/cleveref
    crefdefaultlabelformat: { signature: "m" },
    crefrangeconjunction: { signature: "m" }
  };
  var environments = {};
  function cleanEnumerateBody(ast, itemName = "item") {
    let { segments, macros: macros17 } = splitOnMacro(ast, itemName);
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (i === 0) {
        trimEnd(segment);
      } else {
        trim(segment);
      }
      if (segment.length > 0 && i > 0) {
        segment.unshift({ type: "whitespace" });
      }
    }
    let insertParbreakBefore = /* @__PURE__ */ new WeakSet();
    let body = macros17.flatMap((node, i) => {
      var _a;
      const segment = segments[i + 1];
      const trailingComments = popTrailingComments(segment);
      node.args = node.args || [];
      node.args.push(arg(segment, { openMark: "", closeMark: "" }));
      updateRenderInfo(node, { inParMode: true });
      if (i > 0 || ((_a = segments[0]) == null ? void 0 : _a.length) > 0) {
        insertParbreakBefore.add(node);
      }
      return [node, ...trailingComments];
    });
    body = body.flatMap(
      (node) => insertParbreakBefore.has(node) ? [{ type: "parbreak" }, node] : node
    );
    body.unshift(...segments[0]);
    for (let i = 0; i < body.length - 1; i++) {
      const node = body[i];
      const nextNode = body[i + 1];
      if (!match.parbreak(nextNode)) {
        continue;
      }
      if (match.comment(node)) {
        node.suffixParbreak = true;
      }
      if (match.macro(node) && node.args && node.args[node.args.length - 1].closeMark === "") {
        const args = node.args[node.args.length - 1].content;
        const lastArg = args[args.length - 1];
        if (match.comment(lastArg)) {
          lastArg.suffixParbreak = true;
        }
      }
    }
    return body;
  }
  function popTrailingComments(nodes) {
    let lastNodeIndex = lastSignificantNodeIndex(nodes, true);
    if (lastNodeIndex === nodes.length - 1 || lastNodeIndex == null && nodes.length === 0) {
      return [];
    }
    if (lastNodeIndex == null) {
      lastNodeIndex = -1;
    }
    return nodes.splice(lastNodeIndex + 1);
  }
  var macros2 = {
    answerline: { signature: "o" },
    fillin: { signature: "o o" },
    fullwidth: { signature: "m" },
    fillwidthlines: { signature: "m" },
    fillwidthdottedlines: { signature: "m" },
    fillwidthgrid: { signature: "m" },
    makeemptybox: { signature: "m" },
    CorrectChoiceEmphasis: {
      signature: "m",
      renderInfo: { breakAround: true }
    },
    SolutionEmphasis: { signature: "m", renderInfo: { breakAround: true } },
    uplevel: { signature: "m", renderInfo: { breakAround: true } },
    checkboxchar: { signature: "m", renderInfo: { breakAround: true } },
    checkedchar: { signature: "m", renderInfo: { breakAround: true } },
    pointname: { signature: "m", renderInfo: { breakAround: true } },
    marginpointname: { signature: "m", renderInfo: { breakAround: true } },
    extrawidth: { signature: "m", renderInfo: { breakAround: true } },
    pointformat: { signature: "m", renderInfo: { breakAround: true } },
    bonuspointformat: { signature: "m", renderInfo: { breakAround: true } },
    totalformat: { signature: "m", renderInfo: { breakAround: true } },
    qformat: { signature: "m", renderInfo: { breakAround: true } },
    titledquestion: { signature: "m o", renderInfo: { breakAround: true } },
    pointpoints: { signature: "m m", renderInfo: { breakAround: true } },
    bonuspointpoints: { signature: "m m", renderInfo: { breakAround: true } }
  };
  var environments2 = {
    choices: {
      signature: "o",
      processContent: (nodes) => cleanEnumerateBody(nodes, "choice")
    },
    checkboxes: {
      signature: "o",
      processContent: (nodes) => cleanEnumerateBody(nodes, "choice")
    },
    oneparchoices: {
      signature: "o",
      processContent: (nodes) => cleanEnumerateBody(nodes, "choice")
    },
    oneparcheckboxes: {
      signature: "o",
      processContent: (nodes) => cleanEnumerateBody(nodes, "choice")
    },
    parts: {
      signature: "o",
      processContent: (nodes) => cleanEnumerateBody(nodes, "part")
    },
    subparts: {
      signature: "o",
      processContent: (nodes) => cleanEnumerateBody(nodes, "subpart")
    },
    subsubparts: {
      signature: "o",
      processContent: (nodes) => cleanEnumerateBody(nodes, "subsubpart")
    },
    questions: {
      signature: "o",
      processContent: (nodes) => cleanEnumerateBody(nodes, "question")
    }
  };
  var macros3 = {
    geometry: {
      signature: "m",
      renderInfo: { breakAround: true, pgfkeysArgs: true }
    }
  };
  var environments3 = {};
  var macros4 = {
    hypersetup: {
      signature: "m",
      renderInfo: { breakAround: true, pgfkeysArgs: true }
    },
    href: { signature: "o m m" },
    url: { signature: "m" },
    nolinkurl: { signature: "m" },
    hyperbaseurl: { signature: "m" },
    hyperimage: { signature: "m m" },
    hyperdef: { signature: "m m m" },
    hyperref: { signature: "o m" },
    hyperlink: { signature: "m m" },
    hypertarget: { signature: "m m" },
    autoref: { signature: "s m" },
    pageref: { signature: "s m" },
    autopageref: { signature: "s m" },
    pdfstringdef: { signature: "m m" },
    pdfbookmark: { signature: "o m m" },
    currentpdfbookmark: { signature: "m m" },
    subpdfbookmark: { signature: "m m" },
    belowpdfbookmark: { signature: "m m" },
    texorpdfstring: { signature: "m m" },
    thispdfpagelabel: { signature: "m" },
    hypercalcbp: { signature: "m" }
  };
  var environments4 = {};
  var macros5 = {
    // Special
    "\\": { signature: "!s !o" },
    _: { signature: "m", escapeToken: "" },
    "^": { signature: "m", escapeToken: "" },
    // \newcommand arg signature from https://www.texdev.net/2020/08/19/the-good-the-bad-and-the-ugly-creating-document-commands
    // List can be found in latex2e.pdf "An unofficial reference manual"
    newcommand: {
      signature: "s +m o +o +m",
      renderInfo: {
        breakAround: true,
        namedArguments: ["starred", "name", "numArgs", "default", "body"]
      }
    },
    renewcommand: {
      signature: "s +m o +o +m",
      renderInfo: {
        breakAround: true,
        namedArguments: ["starred", "name", "numArgs", "default", "body"]
      }
    },
    providecommand: {
      signature: "s +m o +o +m",
      renderInfo: { breakAround: true }
    },
    // Counters
    newcounter: {
      signature: "m o",
      renderInfo: { breakAround: true }
    },
    usecounter: {
      signature: "m"
    },
    setcounter: {
      signature: "m m",
      renderInfo: { breakAround: true }
    },
    addtocounter: {
      signature: "m m",
      renderInfo: { breakAround: true }
    },
    stepcounter: {
      signature: "m",
      renderInfo: { breakAround: true }
    },
    refstepcounter: {
      signature: "m",
      renderInfo: { breakAround: true }
    },
    // Lengths
    newlength: {
      signature: "m",
      renderInfo: { breakAround: true }
    },
    addtolength: {
      signature: "m m",
      renderInfo: { breakAround: true }
    },
    settodepth: {
      signature: "m m",
      renderInfo: { breakAround: true }
    },
    settoheight: {
      signature: "m m",
      renderInfo: { breakAround: true }
    },
    settowidth: {
      signature: "m m",
      renderInfo: { breakAround: true }
    },
    // Spaces
    stretch: { signature: "m" },
    hspace: { signature: "s m" },
    vspace: { signature: "s m", renderInfo: { breakAround: true } },
    vfill: { renderInfo: { breakAround: true } },
    indent: { renderInfo: { breakAround: true } },
    phantom: { signature: "m" },
    vphantom: { signature: "m" },
    hphantom: { signature: "m" },
    noindent: { renderInfo: { breakAround: true } },
    smallskip: { renderInfo: { breakAround: true } },
    medskip: { renderInfo: { breakAround: true } },
    bigskip: { renderInfo: { breakAround: true } },
    smallbreak: { renderInfo: { breakAround: true } },
    medbreak: { renderInfo: { breakAround: true } },
    bigbreak: { renderInfo: { breakAround: true } },
    newline: { renderInfo: { breakAround: true } },
    linebreak: { signature: "o", renderInfo: { breakAround: true } },
    nolinebreak: { signature: "o", renderInfo: { breakAround: true } },
    clearpage: { renderInfo: { breakAround: true } },
    cleardoublepage: { renderInfo: { breakAround: true } },
    newpage: { renderInfo: { breakAround: true } },
    enlargethispage: { signature: "s", renderInfo: { breakAround: true } },
    pagebreak: { signature: "o", renderInfo: { breakAround: true } },
    nopagebreak: { signature: "o", renderInfo: { breakAround: true } },
    // Boxes
    newsavebox: {
      signature: "m",
      renderInfo: { breakAround: true }
    },
    sbox: {
      signature: "m m",
      renderInfo: { breakAround: true }
    },
    savebox: {
      signature: "m o o m",
      renderInfo: { breakAround: true }
    },
    mbox: { signature: "m" },
    makebox: { signature: "d() o o m", renderInfo: { breakAround: true } },
    fbox: { signature: "m" },
    framebox: { signature: "o o m", renderInfo: { breakAround: true } },
    frame: { signature: "m", renderInfo: { breakAround: true } },
    parbox: { signature: "o o o m m", renderInfo: { breakAround: true } },
    raisebox: { signature: "m o o m" },
    marginpar: { signature: "o m", renderInfo: { breakAround: true } },
    colorbox: { signature: "o m m", renderInfo: { breakAround: true } },
    fcolorbox: { signature: "o m m", renderInfo: { breakAround: true } },
    rotatebox: { signature: "o m m" },
    scalebox: { signature: "m o m" },
    reflectbox: { signature: "m" },
    resizebox: { signature: "s m m m" },
    // Define environments
    newenvironment: {
      signature: "s m o o m m",
      renderInfo: { breakAround: true }
    },
    renewenvironment: {
      signature: "s m o o m m",
      renderInfo: { breakAround: true }
    },
    newtheorem: {
      signature: "s m o m o",
      renderInfo: { breakAround: true }
    },
    newfont: {
      signature: "m m",
      renderInfo: { breakAround: true }
    },
    // Counters
    alph: { signature: "m" },
    Alph: { signature: "m" },
    arabic: { signature: "m" },
    roman: { signature: "m" },
    Roman: { signature: "m" },
    fnsymbol: { signature: "m" },
    // Other
    documentclass: {
      signature: "o m",
      renderInfo: { breakAround: true, pgfkeysArgs: true }
    },
    usepackage: {
      signature: "o m",
      renderInfo: { breakAround: true, pgfkeysArgs: true }
    },
    item: {
      signature: "o",
      renderInfo: { hangingIndent: true, namedArguments: ["label"] }
    },
    value: { signature: "m" },
    centering: { renderInfo: { breakAround: true } },
    input: { signature: "m", renderInfo: { breakAround: true } },
    include: { signature: "m", renderInfo: { breakAround: true } },
    includeonly: {
      signature: "m",
      renderInfo: { breakAround: true, pgfkeysArgs: true }
    },
    discretionary: { signature: "m m m" },
    hyphenation: { signature: "m m m" },
    footnote: { signature: "o m", renderInfo: { inParMode: true } },
    footnotemark: { signature: "o" },
    footnotetext: { signature: "o m", renderInfo: { inParMode: true } },
    caption: {
      signature: "o m",
      renderInfo: { inParMode: true, breakAround: true }
    },
    // Math Commands
    sqrt: { signature: "o m", renderInfo: { inMathMode: true } },
    frac: { signature: "m m", renderInfo: { inMathMode: true } },
    stackrel: { signature: "m m" },
    ensuremath: { signature: "m", renderInfo: { inMathMode: true } },
    // Layout commands
    abstract: {
      signature: "m",
      renderInfo: { breakAround: true, inParMode: true }
    },
    maketitle: { renderInfo: { breakAround: true } },
    doublespacing: { renderInfo: { breakAround: true } },
    singlespacing: { renderInfo: { breakAround: true } },
    author: {
      signature: "m",
      renderInfo: { breakAround: true, inParMode: true }
    },
    date: { signature: "o m", renderInfo: { breakAround: true } },
    thanks: {
      signature: "m",
      renderInfo: { breakAround: true, inParMode: true }
    },
    // amsart document class adds an optional argument
    title: {
      signature: "o m",
      renderInfo: { breakAround: true, inParMode: true }
    },
    pagenumbering: { signature: "m", renderInfo: { breakAround: true } },
    pagestyle: { signature: "m", renderInfo: { breakAround: true } },
    thispagestyle: { signature: "m", renderInfo: { breakAround: true } },
    // Colors
    definecolor: { signature: "m m m", renderInfo: { breakAround: true } },
    pagecolor: { signature: "o m", renderInfo: { breakAround: true } },
    nopagecolor: { renderInfo: { breakAround: true } },
    multicolumn: { signature: "m m m" },
    // Graphics
    includegraphics: {
      signature: "s o o m",
      renderInfo: { breakAround: true, pgfkeysArgs: true }
    },
    rule: { signature: "o m m" },
    // Sectioning
    part: {
      signature: "s o m",
      renderInfo: {
        breakAround: true,
        inParMode: true,
        namedArguments: ["starred", "tocTitle", "title"]
      }
    },
    chapter: {
      signature: "s o m",
      renderInfo: {
        breakAround: true,
        inParMode: true,
        namedArguments: ["starred", "tocTitle", "title"]
      }
    },
    section: {
      signature: "s o m",
      renderInfo: {
        breakAround: true,
        inParMode: true,
        namedArguments: ["starred", "tocTitle", "title"]
      }
    },
    subsection: {
      signature: "s o m",
      renderInfo: {
        breakAround: true,
        inParMode: true,
        namedArguments: ["starred", "tocTitle", "title"]
      }
    },
    subsubsection: {
      signature: "s o m",
      renderInfo: {
        breakAround: true,
        inParMode: true,
        namedArguments: ["starred", "tocTitle", "title"]
      }
    },
    paragraph: {
      signature: "s o m",
      renderInfo: {
        breakAround: true,
        inParMode: true,
        namedArguments: ["starred", "tocTitle", "title"]
      }
    },
    subparagraph: {
      signature: "s o m",
      renderInfo: {
        breakAround: true,
        inParMode: true,
        namedArguments: ["starred", "tocTitle", "title"]
      }
    },
    appendix: { renderInfo: { breakAround: true, inParMode: true } },
    frontmatter: { renderInfo: { breakAround: true, inParMode: true } },
    mainmatter: { renderInfo: { breakAround: true, inParMode: true } },
    backmatter: { renderInfo: { breakAround: true, inParMode: true } },
    // Citing and references
    bibitem: { signature: "o m", renderInfo: { hangingIndent: true } },
    cite: { signature: "o m" },
    // Fonts
    textrm: { signature: "m", renderInfo: { inParMode: true } },
    textit: { signature: "m", renderInfo: { inParMode: true } },
    textmd: { signature: "m", renderInfo: { inParMode: true } },
    textbf: { signature: "m", renderInfo: { inParMode: true } },
    textup: { signature: "m", renderInfo: { inParMode: true } },
    textsl: { signature: "m", renderInfo: { inParMode: true } },
    textsf: { signature: "m", renderInfo: { inParMode: true } },
    textsc: { signature: "m", renderInfo: { inParMode: true } },
    texttt: { signature: "m", renderInfo: { inParMode: true } },
    emph: { signature: "m", renderInfo: { inParMode: true } },
    textnormal: { signature: "m", renderInfo: { inParMode: true } },
    uppercase: { signature: "m", renderInfo: { inParMode: true } },
    mathbf: { signature: "m" },
    mathsf: { signature: "m" },
    mathtt: { signature: "m" },
    mathit: { signature: "m" },
    mathnormal: { signature: "m" },
    mathcal: { signature: "m" },
    mathrm: { signature: "m" },
    // Other
    setlength: { signature: "m m", renderInfo: { breakAround: true } },
    ref: { signature: "s m" },
    label: { signature: "o m" },
    // cleveref changes \label to have this signature
    printbibliography: { renderInfo: { breakAround: true } },
    addtocontents: { signature: "m m", renderInfo: { breakAround: true } },
    addcontentsline: { signature: "m m m", renderInfo: { breakAround: true } },
    contentsline: { signature: "m m m", renderInfo: { breakAround: true } },
    bibliography: { signature: "m", renderInfo: { breakAround: true } },
    bibliographystyle: { signature: "m", renderInfo: { breakAround: true } }
  };
  var environments5 = {
    document: {
      processContent: (nodes) => {
        trim(nodes);
        return nodes;
      }
    },
    array: { signature: "o m", renderInfo: { alignContent: true } },
    description: { signature: "o", processContent: cleanEnumerateBody },
    enumerate: {
      signature: "o",
      processContent: cleanEnumerateBody,
      renderInfo: { pgfkeysArgs: true }
    },
    itemize: { signature: "o", processContent: cleanEnumerateBody },
    trivlist: { signature: "o", processContent: cleanEnumerateBody },
    list: { signature: "m m", processContent: cleanEnumerateBody },
    figure: { signature: "o" },
    "figure*": { signature: "o" },
    filecontents: { signature: "o m" },
    "filecontents*": { signature: "o m" },
    minipage: { signature: "o o o m" },
    picture: { signature: "r() d()" },
    tabbing: { renderInfo: { alignContent: true } },
    table: { signature: "o" },
    tabular: { signature: "o m", renderInfo: { alignContent: true } },
    "tabular*": { signature: "m o m", renderInfo: { alignContent: true } },
    thebibliography: {
      signature: "m",
      processContent: (nodes) => cleanEnumerateBody(nodes, "bibitem")
    },
    // Math
    math: { renderInfo: { inMathMode: true } }
  };
  var argSpecM = parse("m")[0];
  var argSpecO = parse("o")[0];
  var argSpecRDelim = {};
  var argumentParser = (nodes, startPos) => {
    const { argument: optionalArg, nodesRemoved: optionalArgNodesRemoved } = gobbleSingleArgument(nodes, argSpecO, startPos);
    let codeArg = null;
    let codeArgNodesRemoved = 0;
    const nextNode = nodes[startPos];
    if (match.group(nextNode)) {
      const mandatoryArg = gobbleSingleArgument(nodes, argSpecM, startPos);
      codeArg = mandatoryArg.argument;
      codeArgNodesRemoved = mandatoryArg.nodesRemoved;
    } else if (match.string(nextNode) && nextNode.content.length === 1) {
      const delim = nextNode.content;
      argSpecRDelim[delim] = argSpecRDelim[delim] || parse(`r${delim}${delim}`)[0];
      const delimArg = gobbleSingleArgument(
        nodes,
        argSpecRDelim[delim],
        startPos
      );
      codeArg = delimArg.argument;
      codeArgNodesRemoved = delimArg.nodesRemoved;
    }
    return {
      args: [optionalArg || arg(null), codeArg || arg(null)],
      nodesRemoved: optionalArgNodesRemoved + codeArgNodesRemoved
    };
  };
  var macros6 = {
    lstset: { signature: "m" },
    lstinline: { argumentParser },
    lstinputlisting: { signature: "o m" },
    lstdefinestyle: { signature: "m m" },
    lstnewenvironment: { signature: "m o o m m" },
    lstMakeShortInline: { signature: "o m" },
    lstDeleteShortInline: { signature: "m" },
    lstdefineformat: { signature: "m m" },
    lstdefinelanguage: { signature: "o m o m o" },
    lstalias: { signature: "o m o m" },
    lstloadlanguages: { signature: "m" }
  };
  var environments6 = {};
  var macros7 = {
    see: { signature: "m m" },
    seealso: { signature: "m m" },
    seename: { signature: "m" },
    alsoname: { signature: "m" },
    index: { signature: "m" }
  };
  var environments7 = {};
  var macros8 = {
    mathtoolsset: {
      signature: "m",
      renderInfo: { breakAround: true, pgfkeysArgs: true }
    },
    mathllap: {
      signature: "o m"
    },
    mathrlap: {
      signature: "o m"
    },
    mathclap: {
      signature: "o m"
    },
    clap: {
      signature: "m"
    },
    mathmbox: {
      signature: "m"
    },
    mathmakebox: {
      signature: "o o m"
    },
    cramped: {
      signature: "o m"
    },
    crampedllap: {
      signature: "o m"
    },
    crampedrlap: {
      signature: "o m"
    },
    crampedclap: {
      signature: "o m"
    },
    crampedsubstack: {
      signature: "o m"
    },
    smashoperator: {
      signature: "o m"
    },
    newtagform: {
      signature: "m o m m"
    },
    renewtagform: {
      signature: "m o m m"
    },
    usetagform: {
      signature: "m"
    },
    xleftrightarrow: { signature: "o m" },
    xLeftarrow: { signature: "o m" },
    xhookleftarrow: { signature: "o m" },
    xmapsto: { signature: "o m" },
    xRightarrow: { signature: "o m" },
    xLeftrightarrow: { signature: "o m" },
    xhookrightarrow: { signature: "o m" },
    underbracket: { signature: "o o m" },
    overbracket: { signature: "o o m" },
    underbrace: { signature: "m" },
    overbrace: { signature: "m" },
    shoveleft: { signature: "o m" },
    shoveright: { signature: "o m" },
    ArrowBetweenLines: { signature: "s o" },
    vdotswithin: { signature: "m" },
    shortdotswithin: { signature: "s m" },
    DeclarePairedDelimiter: {
      signature: "m m m",
      renderInfo: { breakAround: true }
    },
    DeclarePairedDelimiterX: {
      signature: "m o m m m",
      renderInfo: { breakAround: true }
    },
    DeclarePairedDelimiterXPP: {
      signature: "m o m m m m m",
      renderInfo: { breakAround: true }
    },
    prescript: { signature: "m m m" },
    DeclareMathSizes: { signature: "m m m m" },
    newgathered: { signature: "m m m m" },
    renewgathered: { signature: "m m m m" },
    splitfrac: { signature: "m m" },
    splitdfrac: { signature: "m m" },
    xmathstrut: { signature: "o m" },
    // amsthm
    newtheorem: { signature: "s m o m o", renderInfo: { breakAround: true } },
    theoremstyle: { signature: "m", renderInfo: { breakAround: true } },
    newtheoremstyle: {
      signature: "m m m m m m m m m",
      renderInfo: { breakAround: true }
    },
    // amsmath
    text: { signature: "m", renderInfo: { inMathMode: false } },
    // amsfonts
    mathbb: { signature: "m" },
    mathscr: { signature: "m" },
    mathfrak: { signature: "m" },
    frak: { signature: "m" },
    Bdd: { signature: "m" },
    bold: { signature: "m" },
    // amsopn
    operatorname: { signature: "s m" },
    DeclareMathOperator: {
      signature: "s m m",
      renderInfo: { breakAround: true }
    }
  };
  var environments8 = {
    crampedsubarray: {
      signature: "m",
      renderInfo: { alignContent: true, inMathMode: true }
    },
    matrix: { renderInfo: { alignContent: true, inMathMode: true } },
    bmatrix: { renderInfo: { alignContent: true, inMathMode: true } },
    pmatrix: { renderInfo: { alignContent: true, inMathMode: true } },
    vmatrix: { renderInfo: { alignContent: true, inMathMode: true } },
    Bmatrix: { renderInfo: { alignContent: true, inMathMode: true } },
    Vmatrix: { renderInfo: { alignContent: true, inMathMode: true } },
    smallmatrix: { renderInfo: { alignContent: true, inMathMode: true } },
    psmallmatrix: { renderInfo: { alignContent: true, inMathMode: true } },
    vsmallmatrix: { renderInfo: { alignContent: true, inMathMode: true } },
    bsmallmatrix: { renderInfo: { alignContent: true, inMathMode: true } },
    Bsmallmatrix: { renderInfo: { alignContent: true, inMathMode: true } },
    Vsmallmatrix: { renderInfo: { alignContent: true, inMathMode: true } },
    "matrix*": {
      signature: "o",
      renderInfo: { alignContent: true, inMathMode: true }
    },
    "bmatrix*": {
      signature: "o",
      renderInfo: { alignContent: true, inMathMode: true }
    },
    "pmatrix*": {
      signature: "o",
      renderInfo: { alignContent: true, inMathMode: true }
    },
    "vmatrix*": {
      signature: "o",
      renderInfo: { alignContent: true, inMathMode: true }
    },
    "Bmatrix*": {
      signature: "o",
      renderInfo: { alignContent: true, inMathMode: true }
    },
    "Vmatrix*": {
      signature: "o",
      renderInfo: { alignContent: true, inMathMode: true }
    },
    "smallmatrix*": {
      signature: "o",
      renderInfo: { alignContent: true, inMathMode: true }
    },
    "psmallmatrix*": {
      signature: "o",
      renderInfo: { alignContent: true, inMathMode: true }
    },
    "bsmallmatrix*": {
      signature: "o",
      renderInfo: { alignContent: true, inMathMode: true }
    },
    "vsmallmatrix*": {
      signature: "o",
      renderInfo: { alignContent: true, inMathMode: true }
    },
    "Bsmallmatrix*": {
      signature: "o",
      renderInfo: { alignContent: true, inMathMode: true }
    },
    "Vsmallmatrix*": {
      signature: "o",
      renderInfo: { alignContent: true, inMathMode: true }
    },
    multilined: { signature: "o o", renderInfo: { inMathMode: true } },
    cases: { renderInfo: { alignContent: true, inMathMode: true } },
    "cases*": { renderInfo: { alignContent: true, inMathMode: true } },
    dcases: { renderInfo: { alignContent: true, inMathMode: true } },
    "dcases*": { renderInfo: { alignContent: true, inMathMode: true } },
    rcases: { renderInfo: { alignContent: true, inMathMode: true } },
    "rcases*": { renderInfo: { alignContent: true, inMathMode: true } },
    drcases: { renderInfo: { alignContent: true, inMathMode: true } },
    "drcases*": { renderInfo: { alignContent: true, inMathMode: true } },
    spreadlines: { signature: "m", renderInfo: { inMathMode: true } },
    lgathered: { signature: "o", renderInfo: { inMathMode: true } },
    rgathered: { signature: "o", renderInfo: { inMathMode: true } },
    // amsmath
    "align*": { renderInfo: { inMathMode: true, alignContent: true } },
    align: { renderInfo: { inMathMode: true, alignContent: true } },
    aligned: { renderInfo: { inMathMode: true, alignContent: true } },
    "alignat*": { renderInfo: { inMathMode: true, alignContent: true } },
    alignat: { renderInfo: { inMathMode: true, alignContent: true } },
    "equation*": { renderInfo: { inMathMode: true } },
    equation: { renderInfo: { inMathMode: true } },
    "gather*": { renderInfo: { inMathMode: true } },
    gather: { renderInfo: { inMathMode: true } },
    "multline*": { renderInfo: { inMathMode: true } },
    multline: { renderInfo: { inMathMode: true } },
    "flalign*": { renderInfo: { inMathMode: true, alignContent: true } },
    flalign: { renderInfo: { inMathMode: true, alignContent: true } },
    split: { renderInfo: { inMathMode: true } },
    // Math environments
    displaymath: { renderInfo: { inMathMode: true } },
    // Typical amsthm environments
    theorem: { signature: "o" },
    lemma: { signature: "o" },
    definition: { signature: "o" },
    proposition: { signature: "o" },
    corollary: { signature: "o" },
    remark: { signature: "!o" },
    example: { signature: "!o" },
    proof: { signature: "o" }
  };
  var argSpecM2 = parse("m")[0];
  var argSpecO2 = parse("o")[0];
  var argSpecRDelim2 = {};
  var argumentParser2 = (nodes, startPos) => {
    const { argument: optionalArg, nodesRemoved: optionalArgNodesRemoved } = gobbleSingleArgument(nodes, argSpecO2, startPos);
    const { argument: languageArg, nodesRemoved: languageArgNodesRemoved } = gobbleSingleArgument(nodes, argSpecM2, startPos);
    let codeArg = null;
    let codeArgNodesRemoved = 0;
    const nextNode = nodes[startPos];
    if (match.group(nextNode)) {
      const mandatoryArg = gobbleSingleArgument(nodes, argSpecM2, startPos);
      codeArg = mandatoryArg.argument;
      codeArgNodesRemoved = mandatoryArg.nodesRemoved;
    } else if (match.string(nextNode) && nextNode.content.length === 1) {
      const delim = nextNode.content;
      argSpecRDelim2[delim] = argSpecRDelim2[delim] || parse(`r${delim}${delim}`)[0];
      const delimArg = gobbleSingleArgument(
        nodes,
        argSpecRDelim2[delim],
        startPos
      );
      codeArg = delimArg.argument;
      codeArgNodesRemoved = delimArg.nodesRemoved;
    }
    return {
      args: [
        optionalArg || arg(null),
        languageArg || arg(null),
        codeArg || arg(null)
      ],
      nodesRemoved: optionalArgNodesRemoved + languageArgNodesRemoved + codeArgNodesRemoved
    };
  };
  var macros9 = {
    mint: { argumentParser: argumentParser2 },
    mintinline: { argumentParser: argumentParser2 },
    inputminted: { argumentParser: argumentParser2 },
    usemintedstyle: { signature: "m" },
    setminted: { signature: "o m" },
    setmintedinline: { signature: "o m" },
    newmint: { signature: "o m m" },
    newminted: { signature: "o m m" },
    newmintinline: { signature: "o m m" },
    newmintedfile: { signature: "o m m" }
  };
  var environments9 = {};
  var macros10 = {
    NiceMatrixOptions: {
      signature: "m",
      renderInfo: { pgfkeysArgs: true, breakAround: true }
    }
  };
  var environments10 = {
    NiceTabular: {
      signature: "o m !o",
      renderInfo: { pgfkeysArgs: true, alignContent: true }
    },
    NiceMatrixBlock: {
      signature: "!o",
      renderInfo: { pgfkeysArgs: true, alignContent: true }
    },
    NiceArrayWithDelims: {
      signature: "m m o m !o",
      renderInfo: { pgfkeysArgs: true, alignContent: true }
    },
    NiceArray: {
      signature: "o m !o",
      renderInfo: { pgfkeysArgs: true, alignContent: true }
    },
    pNiceArray: {
      signature: "o m !o",
      renderInfo: { pgfkeysArgs: true, alignContent: true }
    },
    bNiceArray: {
      signature: "o m !o",
      renderInfo: { pgfkeysArgs: true, alignContent: true }
    },
    BNiceArray: {
      signature: "o m !o",
      renderInfo: { pgfkeysArgs: true, alignContent: true }
    },
    vNiceArray: {
      signature: "o m !o",
      renderInfo: { pgfkeysArgs: true, alignContent: true }
    },
    VNiceArray: {
      signature: "o m !o",
      renderInfo: { pgfkeysArgs: true, alignContent: true }
    },
    NiceMatrix: {
      signature: "!o",
      renderInfo: { pgfkeysArgs: true, alignContent: true }
    },
    pNiceMatrix: {
      signature: "!o",
      renderInfo: { pgfkeysArgs: true, alignContent: true }
    },
    bNiceMatrix: {
      signature: "!o",
      renderInfo: { pgfkeysArgs: true, alignContent: true }
    },
    BNiceMatrix: {
      signature: "!o",
      renderInfo: { pgfkeysArgs: true, alignContent: true }
    },
    vNiceMatrix: {
      signature: "!o",
      renderInfo: { pgfkeysArgs: true, alignContent: true }
    },
    VNiceMatrix: {
      signature: "!o",
      renderInfo: { pgfkeysArgs: true, alignContent: true }
    }
  };
  var macros11 = {
    systeme: {
      signature: "s o o m",
      renderInfo: { inMathMode: true }
    },
    sysdelim: {
      signature: "m m"
    },
    syseqsep: { signature: "m" },
    sysalign: { signature: "m" },
    syssignspace: { signature: "m" },
    syseqspace: { signature: "m" },
    syslineskipcoeff: { signature: "m" },
    syseqivsign: { signature: "m" },
    sysaddeqsign: { signature: "m" },
    sysremoveeqsign: { signature: "m" },
    sysextracolonsign: { signature: "m" },
    syscodeextracol: { signature: "m" },
    sysautonum: { signature: "m" },
    syssubstitute: { signature: "m" }
  };
  var environments11 = {};
  (function() {
    if (typeof globalThis === "object")
      return;
    Object.defineProperty(Object.prototype, "__magic__", {
      get: function() {
        return this;
      },
      configurable: true
      // This makes it possible to `delete` the getter later.
    });
    __magic__.globalThis = __magic__;
    delete Object.prototype.__magic__;
  })();
  var clone = typeof globalThis.structuredClone === "function" ? globalThis.structuredClone : (obj) => JSON.parse(JSON.stringify(obj));
  var OPTIONAL_ARGUMENT_ARG_SPEC = parse("o")[0];
  function blankArg() {
    return arg([], { openMark: "", closeMark: "" });
  }
  var tikzCommandArgumentParser = (nodes, startPos) => {
    const origStartPos = startPos;
    let pos = startPos;
    let nodesRemoved = 0;
    const cursorPosAfterAnimations = eatAllAnimationSpecs(nodes, pos);
    let animationArg = blankArg();
    if (cursorPosAfterAnimations !== pos) {
      const argContent = nodes.splice(pos, cursorPosAfterAnimations - pos);
      trim(argContent);
      animationArg = arg(argContent, {
        openMark: " ",
        closeMark: " "
      });
    }
    nodesRemoved += cursorPosAfterAnimations - pos;
    const {
      argument: _optionalArgument,
      nodesRemoved: optionalArgumentNodesRemoved
    } = gobbleSingleArgument(nodes, OPTIONAL_ARGUMENT_ARG_SPEC, pos);
    nodesRemoved += optionalArgumentNodesRemoved;
    const optionalArg = _optionalArgument || blankArg();
    while (match.whitespace(nodes[pos])) {
      pos++;
    }
    const firstNode = nodes[pos];
    if (!firstNode) {
      return {
        args: [animationArg, optionalArg, blankArg()],
        nodesRemoved: 0
      };
    }
    if (match.group(firstNode)) {
      const args = [animationArg, optionalArg, arg(firstNode.content)];
      nodes.splice(origStartPos, pos - origStartPos + 1);
      return { args, nodesRemoved: pos - origStartPos + 1 + nodesRemoved };
    }
    const semicolonPosition = scan(nodes, ";", { startIndex: pos });
    if (semicolonPosition != null) {
      const argNodes = nodes.splice(
        origStartPos,
        semicolonPosition - origStartPos + 1
      );
      trim(argNodes);
      const args = [animationArg, optionalArg, arg(argNodes)];
      return {
        args,
        nodesRemoved: origStartPos - semicolonPosition + 1 + nodesRemoved
      };
    }
    return {
      args: [animationArg, optionalArg, blankArg()],
      nodesRemoved: 0
    };
  };
  function eatAllAnimationSpecs(nodes, startPos) {
    const colonPos = scan(nodes, ":", {
      startIndex: startPos,
      allowSubstringMatches: true,
      onlySkipWhitespaceAndComments: true
    });
    if (!colonPos) {
      return startPos;
    }
    let lastMatchPos = startPos;
    let i = colonPos + 1;
    for (; i < nodes.length; i++) {
      const node = nodes[i];
      if (match.string(node, "[")) {
        break;
      }
      if (match.string(node, "=")) {
        i++;
        while (match.whitespace(nodes[i]) || match.comment(nodes[i])) {
          i++;
        }
        if (!match.group(nodes[i])) {
          break;
        }
        lastMatchPos = i + 1;
        const colonPos2 = scan(nodes, ":", {
          startIndex: lastMatchPos,
          allowSubstringMatches: true,
          onlySkipWhitespaceAndComments: true
        });
        if (colonPos2 == null) {
          break;
        }
        i = colonPos2 + 1;
      }
    }
    return lastMatchPos;
  }
  var macros12 = {
    pgfkeys: {
      signature: "m",
      renderInfo: { breakAround: true, pgfkeysArgs: true }
    },
    tikzoption: {
      signature: "m",
      renderInfo: { breakAround: true, pgfkeysArgs: true }
    },
    tikzstyle: {
      signature: "m",
      renderInfo: { breakAround: true, pgfkeysArgs: true }
    },
    usetikzlibrary: {
      signature: "m",
      renderInfo: { breakAround: true, pgfkeysArgs: true }
    },
    usepgfmodule: { signature: "m", renderInfo: { pgfkeysArgs: true } },
    usepgflibrary: { signature: "m", renderInfo: { pgfkeysArgs: true } },
    pgfplotsset: {
      signature: "m",
      renderInfo: { breakAround: true, pgfkeysArgs: true }
    },
    pgfplotstabletypeset: {
      signature: "o m",
      renderInfo: { breakAround: true, pgfkeysArgs: true }
    },
    tikz: {
      signature: "o o m",
      argumentParser: tikzCommandArgumentParser,
      renderInfo: { namedArguments: ["animation", "options", "command"] }
    }
  };
  var environments12 = {
    tikzpicture: {
      signature: "o",
      renderInfo: { pgfkeysArgs: true, tikzEnvironment: true },
      processContent: processTikzEnvironmentContent
    },
    axis: {
      signature: "o",
      renderInfo: { pgfkeysArgs: true, tikzEnvironment: true },
      processContent: processTikzEnvironmentContent
    },
    scope: {
      signature: "o",
      renderInfo: { pgfkeysArgs: true, tikzEnvironment: true },
      processContent: processTikzEnvironmentContent
    },
    pgfonlayer: {
      signature: "m",
      renderInfo: { tikzEnvironment: true },
      processContent: processTikzEnvironmentContent
    },
    pgflowlevelscope: {
      signature: "m",
      renderInfo: { tikzEnvironment: true },
      processContent: processTikzEnvironmentContent
    },
    pgfviewboxscope: {
      signature: "m m m m m",
      renderInfo: { tikzEnvironment: true },
      processContent: processTikzEnvironmentContent
    },
    pgftransparencygroup: {
      signature: "o",
      renderInfo: { pgfkeysArgs: true, tikzEnvironment: true },
      processContent: processTikzEnvironmentContent
    },
    behindforegroundpath: {
      signature: "m",
      processContent: processTikzEnvironmentContent
    },
    pgfmetadecoration: {
      signature: "m",
      processContent: processTikzEnvironmentContent
    },
    colormixin: { signature: "m", renderInfo: { pgfkeysArgs: true } }
  };
  function processTikzEnvironmentContent(nodes) {
    attachMacroArgsInArray(nodes, conditionalMacros);
    return nodes;
  }
  var conditionalMacros = {
    pgfextra: { signature: "m" },
    beginpgfgraphicnamed: { signature: "m" },
    pgfrealjobname: { signature: "m" },
    pgfplotstreampoint: { signature: "m" },
    pgfplotstreampointoutlier: { signature: "m" },
    pgfplotstreamspecial: { signature: "m" },
    pgfplotxyfile: { signature: "m" },
    pgfplotxyzfile: { signature: "m" },
    pgfplotfunction: { signature: "mmm" },
    pgfplotgnuplot: { signature: "o m" },
    pgfplothandlerrecord: { signature: "m" },
    pgfdeclareplothandler: { signature: "m m m" },
    pgfdeclarelayer: { signature: "m" },
    pgfsetlayers: { signature: "m", renderInfo: { pgfkeysArgs: true } },
    pgfonlayer: { signature: "m" },
    startpgfonlayer: { signature: "m" },
    pgfdeclarehorizontalshading: { signature: "o m m m " },
    pgfdeclareradialshading: { signature: "o m m m" },
    pgfdeclarefunctionalshading: { signature: "o m m m m m" },
    pgfshadecolortorgb: { signature: "m m" },
    pgfshadecolortocmyk: { signature: "m m" },
    pgfshadecolortogray: { signature: "m m" },
    pgfuseshading: { signature: "m" },
    pgfshadepath: { signature: "m m" },
    pgfsetadditionalshadetransform: { signature: "m" },
    pgfsetstrokeopacity: { signature: "m" },
    pgfsetfillopacity: { signature: "m" },
    pgfsetblendmode: { signature: "m" },
    pgfdeclarefading: { signature: "m m" },
    pgfsetfading: { signature: "m m" },
    pgfsetfadingforcurrentpath: { signature: "m m" },
    pgfsetfadingforcurrentpathstroked: { signature: "m m" },
    pgfanimateattribute: { signature: "m m" },
    pgfsnapshot: { signature: "m" },
    pgfqpoint: { signature: "m m" },
    pgfqpointxy: { signature: "m m" },
    pgfqpointxyz: { signature: "m m m" },
    pgfqpointscale: { signature: "m m" },
    pgfpathqmoveto: { signature: "m m" },
    pgfpathqlineto: { signature: "m m" },
    pgfpathqcurveto: { signature: "m m m m m m" },
    pgfpathqcircle: { signature: "m" },
    pgfqbox: { signature: "m" },
    pgfqboxsynced: { signature: "m" },
    pgfaliasimage: { signature: "m m" },
    pgfuseimage: { signature: "m" },
    pgfimage: { signature: "o m", renderInfo: { pgfkeysArgs: true } },
    pgfdeclaremask: { signature: "o m m", renderInfo: { pgfkeysArgs: true } },
    pgfdeclarepatternformonly: { signature: "o m m m m m" },
    pgfdeclarepatterninherentlycolored: { signature: "o m m m m m" },
    pgfsetfillpattern: { signature: "m m" },
    // Coordinate canvas and nonlinear transformations
    pgftransformshift: { signature: "m" },
    pgftransformxshift: { signature: "m" },
    pgftransformyshift: { signature: "m" },
    pgftransformscale: { signature: "m" },
    pgftransformxscale: { signature: "m" },
    pgftransformyscale: { signature: "m" },
    pgftransformxslant: { signature: "m" },
    pgftransformyslant: { signature: "m" },
    pgftransformrotate: { signature: "m" },
    pgftransformtriangle: { signature: "m m m" },
    pgftransformcm: { signature: "m m m m m" },
    pgftransformarrow: { signature: "m m" },
    pgftransformlineattime: { signature: "m m m" },
    pgftransformcurveattime: { signature: "m m m m m" },
    pgftransformarcaxesattime: { signature: "m m m m m m" },
    pgfgettransform: { signature: "m" },
    pgfsettransform: { signature: "m" },
    pgfgettransformentries: { signature: "m m m m m m" },
    pgfsettransformentries: { signature: "m m m m m m" },
    pgfpointtransformed: { signature: "m" },
    pgflowlevel: { signature: "m" },
    pgflowlevelobj: { signature: "m m" },
    pgflowlevelscope: { signature: "m" },
    startpgflowlevelscope: { signature: "m" },
    pgfviewboxscope: { signature: "m m m m m" },
    startpgfviewboxscope: { signature: "m m m m m" },
    pgftransformnonlinear: { signature: "m" },
    pgfpointtransformednonlinear: { signature: "m" },
    pgfsetcurvilinearbeziercurve: { signature: "m m m m" },
    pgfcurvilineardistancetotime: { signature: "m" },
    pgfpointcurvilinearbezierorthogonal: { signature: "m m" },
    pgfpointcurvilinearbezierpolar: { signature: "m m" },
    // Matrices
    pgfmatrix: { signature: "m m m m m m m" },
    pgfsetmatrixcolumnsep: { signature: "m" },
    pgfmatrixnextcell: { signature: "o" },
    pgfsetmatrixrowsep: { signature: "m" },
    pgfmatrixendrow: { signature: "o" },
    // Nodes and shapes
    pgfnode: { signature: "m m m m m" },
    pgfmultipartnode: { signature: "m m m m" },
    pgfcoordinate: { signature: "m m" },
    pgfnodealias: { signature: "m m" },
    pgfnoderename: { signature: "m m" },
    pgfpositionnodelater: { signature: "m" },
    pgfpositionnodenow: { signature: "m" },
    pgfnodepostsetupcode: { signature: "m m" },
    pgfpointanchor: { signature: "m m" },
    pgfpointshapeborder: { signature: "m m" },
    pgfdeclareshape: { signature: "m m" },
    saveddimen: { signature: "m m" },
    savedmacro: { signature: " m" },
    anchor: { signature: "m m" },
    deferredanchor: { signature: "m m" },
    anchorborder: { signature: "m" },
    backgroundpath: { signature: "m" },
    foregroundpath: { signature: "m" },
    behindbackgroundpath: { signature: "m" },
    beforebackgroundpath: { signature: "m" },
    beforeforegroundpath: { signature: "m" },
    behindforegroundpath: { signature: "m" },
    // Arrows
    pgfdeclarearrow: { signature: "m" },
    pgfarrowssettipend: { signature: "m" },
    pgfarrowssetbackend: { signature: "m" },
    pgfarrowssetlineend: { signature: "m" },
    pgfarrowssetvisualbackend: { signature: "m" },
    pgfarrowssetvisualtipend: { signature: "m" },
    pgfarrowshullpoint: { signature: "m m" },
    pgfarrowsupperhullpoint: { signature: "m m" },
    pgfarrowssave: { signature: "m" },
    pgfarrowssavethe: { signature: "m" },
    pgfarrowsaddtooptions: { signature: "m" },
    pgfarrowsaddtolateoptions: { signature: "m" },
    pgfarrowsaddtolengthscalelist: { signature: "m" },
    pgfarrowsaddtowidthscalelist: { signature: "m" },
    pgfarrowsthreeparameters: { signature: "m" },
    pgfarrowslinewidthdependent: { signature: "m m m" },
    pgfarrowslengthdependent: { signature: "m" },
    // Path
    pgfusepath: { signature: "m" },
    pgfsetlinewidth: { signature: "m" },
    pgfsetmiterlimit: { signature: "m" },
    pgfsetdash: { signature: "m m" },
    pgfsetstrokecolor: { signature: "m" },
    pgfsetcolor: { signature: "m" },
    pgfsetinnerlinewidth: { signature: "m" },
    pgfsetinnerstrokecolor: { signature: "m" },
    pgfsetarrowsstart: { signature: "m" },
    pgfsetarrowsend: { signature: "m" },
    pgfsetarrows: { signature: "m" },
    pgfsetshortenstart: { signature: "m" },
    pgfsetshortenend: { signature: "m" },
    pgfsetfillcolor: { signature: "m" },
    // Decorations
    pgfdeclaredecoration: { signature: "m m m" },
    state: { signature: "m o m" },
    pgfdecoratepath: { signature: "m m" },
    startpgfdecoration: { signature: "m" },
    pgfdecoration: { signature: "m" },
    pgfdecoratecurrentpath: { signature: "m" },
    pgfsetdecorationsegmenttransformation: { signature: "m" },
    pgfdeclaremetadecorate: { signature: "m m m" },
    pgfmetadecoration: { signature: "m" },
    startpgfmetadecoration: { signature: "m" },
    // Constructing paths
    pgfpathmoveto: { signature: "m" },
    pgfpathlineto: { signature: "m" },
    pgfpathcurveto: { signature: "m m m" },
    pgfpathquadraticcurveto: { signature: "m m" },
    pgfpathcurvebetweentime: { signature: "m m m m m m" },
    pgfpathcurvebetweentimecontinue: { signature: "m m m m m m" },
    pgfpatharc: { signature: "m m m" },
    pgfpatharcaxes: { signature: "m m m m" },
    pgfpatharcto: { signature: "m m m m m m" },
    pgfpatharctoprecomputed: { signature: "m m m m m m m m" },
    pgfpathellipse: { signature: "m m m" },
    pgfpathcircle: { signature: "m m" },
    pgfpathrectangle: { signature: "m m" },
    pgfpathrectanglecorners: { signature: "m m" },
    pgfpathgrid: { signature: " o m m" },
    pgfpathparabola: { signature: "m m" },
    pgfpathsine: { signature: "m" },
    pgfpathcosine: { signature: "m" },
    pgfsetcornersarced: { signature: "m" },
    "pgf@protocolsizes": { signature: "m m" },
    // Specifying coordinates
    pgfpoint: { signature: "m m" },
    pgfpointpolar: { signature: "m m m" },
    pgfpointxy: { signature: "m m" },
    pgfsetxvec: { signature: "m" },
    pgfsetyvec: { signature: "m" },
    pgfpointpolarxy: { signature: "m m" },
    pgfpointxyz: { signature: "m m m" },
    pgfsetzvec: { signature: "m" },
    pgfpointcylindrical: { signature: "m m m" },
    pgfpointspherical: { signature: "m m m" },
    pgfpointadd: { signature: "m m" },
    pgfpointscale: { signature: "m m" },
    pgfpointdiff: { signature: "m m" },
    pgfpointnormalised: { signature: "m" },
    pgfpointlineattime: { signature: "m m m" },
    pgfpointlineatdistance: { signature: "m m m" },
    pgfpointarcaxesattime: { signature: "m m m m m m" },
    pgfpointcurveattime: { signature: "m m m m m" },
    pgfpointborderrectangle: { signature: "m m" },
    pgfpointborderellipse: { signature: "m m" },
    pgfpointintersectionoflines: { signature: "m m m m" },
    pgfpointintersectionofcircles: { signature: "m m m m m" },
    pgfintersectionofpaths: { signature: "m m" },
    pgfpointintersectionsolution: { signature: "m" },
    pgfextractx: { signature: "m m" },
    pgfextracty: { signature: "m m" },
    pgfgetlastxy: { signature: "m m" },
    "pgf@process": { signature: "m" },
    // Heirarchical structres ...
    pgfsetbaseline: { signature: "m" },
    pgfsetbaselinepointnow: { signature: "m" },
    pgfsetbaselinepointlater: { signature: "m" },
    pgftext: { signature: "o m", renderInfo: { pgfkeysArgs: true } },
    pgfuseid: { signature: "m" },
    pgfusetype: { signature: "m" },
    pgfidrefnextuse: { signature: "m m" },
    pgfidrefprevuse: { signature: "m m" },
    pgfaliasid: { signature: "m m" },
    pgfgaliasid: { signature: "m m" },
    pgfifidreferenced: { signature: "m m m" },
    pgfrdfabout: { signature: "m" },
    pgfrdfcontent: { signature: "m" },
    pgfrdfdatatype: { signature: "m" },
    pgfrdfhref: { signature: "m" },
    pgfrdfprefix: { signature: "m" },
    pgfrdfproperty: { signature: "m" },
    pgfrdfrel: { signature: "m" },
    pgfrdfresource: { signature: "m" },
    pgfrdfrev: { signature: "m" },
    pgfrdfsrc: { signature: "m" },
    pgfrdftypeof: { signature: "m" },
    pgfrdfvocab: { signature: "m" },
    pgferror: { signature: "m" },
    pgfwarning: { signature: "m" },
    path: {
      signature: "u;",
      renderInfo: { breakAround: true, tikzPathCommand: true }
    },
    draw: {
      signature: "u;",
      renderInfo: { breakAround: true, tikzPathCommand: true }
    },
    fill: {
      signature: "u;",
      renderInfo: { breakAround: true, tikzPathCommand: true }
    },
    filldraw: {
      signature: "u;",
      renderInfo: { breakAround: true, tikzPathCommand: true }
    },
    pattern: {
      signature: "u;",
      renderInfo: { breakAround: true, tikzPathCommand: true }
    },
    shade: {
      signature: "u;",
      renderInfo: { breakAround: true, tikzPathCommand: true }
    },
    clip: {
      signature: "u;",
      renderInfo: { breakAround: true, tikzPathCommand: true }
    },
    useasboundingbox: {
      signature: "u;",
      renderInfo: { breakAround: true, tikzPathCommand: true }
    },
    node: {
      signature: "u;",
      renderInfo: { breakAround: true, tikzPathCommand: true }
    },
    coordinate: {
      signature: "u;",
      renderInfo: { breakAround: true, tikzPathCommand: true }
    },
    graph: {
      signature: "u;",
      renderInfo: { breakAround: true, tikzPathCommand: true }
    },
    scoped: {
      signature: "o o m",
      argumentParser: tikzCommandArgumentParser,
      renderInfo: {
        namedArguments: ["animation", "options", "command"],
        breakAround: true
      }
    }
  };
  function createMatchers2() {
    return {
      isChar: match.string,
      isTerminal: (node) => match.string(node, ";"),
      isOperation: (node) => match.anyString(node) && node.content.match(/[a-zA-Z]/),
      isWhitespace: (node) => match.whitespace(node) || match.parbreak(node),
      isComment: match.comment,
      isGroup: match.group,
      isMacro: match.macro,
      isAnyMacro: match.anyMacro
    };
  }
  var matchers = createMatchers2();
  var macros13 = {
    substitutecolormodel: {
      signature: "m m",
      renderInfo: { breakAround: true }
    },
    selectcolormodel: {
      signature: "m",
      renderInfo: { breakAround: true }
    },
    definecolor: {
      signature: "o m m m",
      renderInfo: { breakAround: true }
    },
    providecolor: {
      signature: "o m m m",
      renderInfo: { breakAround: true }
    },
    colorlet: {
      signature: "o m o m",
      renderInfo: { breakAround: true }
    },
    definecolorset: {
      signature: "o m m m",
      renderInfo: { breakAround: true }
    },
    providecolorset: {
      signature: "o m m m m",
      renderInfo: { breakAround: true }
    },
    preparecolor: {
      signature: "o m m m",
      renderInfo: { breakAround: true }
    },
    preparecolorset: {
      signature: "o m m m m",
      renderInfo: { breakAround: true }
    },
    DefineNamedColor: {
      signature: "m m m m",
      renderInfo: { breakAround: true }
    },
    definecolors: {
      signature: "m",
      renderInfo: { breakAround: true }
    },
    providecolors: {
      signature: "m",
      renderInfo: { breakAround: true }
    },
    color: { signature: "o m", renderInfo: { breakAround: true } },
    textcolor: { signature: "o m m", renderInfo: { inParMode: true } },
    pagecolor: { signature: "o m" },
    colorbox: { signature: "o m m" },
    fcolorbox: { signature: "o m o m m" },
    boxframe: { signature: "o m" },
    testcolor: { signature: "o m" },
    blendcolors: { signature: "s m" },
    maskcolors: { signature: "o m" },
    definecolorseries: {
      signature: "m m m o m o m",
      renderInfo: { breakAround: true }
    },
    resetcolorseries: {
      signature: "o m",
      renderInfo: { breakAround: true }
    },
    rowcolors: { signature: "s o m m m" },
    extractcolorspec: { signature: "m m" },
    extractcolorspecs: { signature: "m m m" },
    convertcolorspec: { signature: "m m m m" }
  };
  var environments13 = {
    testcolors: { signature: "o", renderInfo: { pgfkeysArgs: true } }
  };
  var fromRgb = ([r, g, b]) => (0, import_color2.default)([r * 255, g * 255, b * 255], "rgb");
  var DVI_PS_NAMES = {
    Apricot: (0, import_color2.default)("#FBB982"),
    Aquamarine: (0, import_color2.default)("#00B5BE"),
    Bittersweet: (0, import_color2.default)("#C04F17"),
    Black: (0, import_color2.default)("#221E1F"),
    Blue: (0, import_color2.default)("#2D2F92"),
    BlueGreen: (0, import_color2.default)("#00B3B8"),
    BlueViolet: (0, import_color2.default)("#473992"),
    BrickRed: (0, import_color2.default)("#B6321C"),
    Brown: (0, import_color2.default)("#792500"),
    BurntOrange: (0, import_color2.default)("#F7921D"),
    CadetBlue: (0, import_color2.default)("#74729A"),
    CarnationPink: (0, import_color2.default)("#F282B4"),
    Cerulean: (0, import_color2.default)("#00A2E3"),
    CornflowerBlue: (0, import_color2.default)("#41B0E4"),
    Cyan: (0, import_color2.default)("#00AEEF"),
    Dandelion: (0, import_color2.default)("#FDBC42"),
    DarkOrchid: (0, import_color2.default)("#A4538A"),
    Emerald: (0, import_color2.default)("#00A99D"),
    ForestGreen: (0, import_color2.default)("#009B55"),
    Fuchsia: (0, import_color2.default)("#8C368C"),
    Goldenrod: (0, import_color2.default)("#FFDF42"),
    Gray: (0, import_color2.default)("#949698"),
    Green: (0, import_color2.default)("#00A64F"),
    GreenYellow: (0, import_color2.default)("#DFE674"),
    JungleGreen: (0, import_color2.default)("#00A99A"),
    Lavender: (0, import_color2.default)("#F49EC4"),
    LimeGreen: (0, import_color2.default)("#8DC73E"),
    Magenta: (0, import_color2.default)("#EC008C"),
    Mahogany: (0, import_color2.default)("#A9341F"),
    Maroon: (0, import_color2.default)("#AF3235"),
    Melon: (0, import_color2.default)("#F89E7B"),
    MidnightBlue: (0, import_color2.default)("#006795"),
    Mulberry: (0, import_color2.default)("#A93C93"),
    NavyBlue: (0, import_color2.default)("#006EB8"),
    OliveGreen: (0, import_color2.default)("#3C8031"),
    Orange: (0, import_color2.default)("#F58137"),
    OrangeRed: (0, import_color2.default)("#ED135A"),
    Orchid: (0, import_color2.default)("#AF72B0"),
    Peach: (0, import_color2.default)("#F7965A"),
    Periwinkle: (0, import_color2.default)("#7977B8"),
    PineGreen: (0, import_color2.default)("#008B72"),
    Plum: (0, import_color2.default)("#92268F"),
    ProcessBlue: (0, import_color2.default)("#00B0F0"),
    Purple: (0, import_color2.default)("#99479B"),
    RawSienna: (0, import_color2.default)("#974006"),
    Red: (0, import_color2.default)("#ED1B23"),
    RedOrange: (0, import_color2.default)("#F26035"),
    RedViolet: (0, import_color2.default)("#A1246B"),
    Rhodamine: (0, import_color2.default)("#EF559F"),
    RoyalBlue: (0, import_color2.default)("#0071BC"),
    RoyalPurple: (0, import_color2.default)("#613F99"),
    RubineRed: (0, import_color2.default)("#ED017D"),
    Salmon: (0, import_color2.default)("#F69289"),
    SeaGreen: (0, import_color2.default)("#3FBC9D"),
    Sepia: (0, import_color2.default)("#671800"),
    SkyBlue: (0, import_color2.default)("#46C5DD"),
    SpringGreen: (0, import_color2.default)("#C6DC67"),
    Tan: (0, import_color2.default)("#DA9D76"),
    TealBlue: (0, import_color2.default)("#00AEB3"),
    Thistle: (0, import_color2.default)("#D883B7"),
    Turquoise: (0, import_color2.default)("#00B4CE"),
    Violet: (0, import_color2.default)("#58429B"),
    VioletRed: (0, import_color2.default)("#EF58A0"),
    White: (0, import_color2.default)("#FFFFFF"),
    WildStrawberry: (0, import_color2.default)("#EE2967"),
    Yellow: (0, import_color2.default)("#FFF200"),
    YellowGreen: (0, import_color2.default)("#98CC70"),
    YellowOrange: (0, import_color2.default)("#FAA21A")
  };
  var SVG_NAMES = {
    AliceBlue: fromRgb([0.94, 0.972, 1]),
    AntiqueWhite: fromRgb([0.98, 0.92, 0.844]),
    Aqua: fromRgb([0, 1, 1]),
    Aquamarine: fromRgb([0.498, 1, 0.83]),
    Azure: fromRgb([0.94, 1, 1]),
    Beige: fromRgb([0.96, 0.96, 0.864]),
    Bisque: fromRgb([1, 0.894, 0.77]),
    Black: fromRgb([0, 0, 0]),
    BlanchedAlmond: fromRgb([1, 0.92, 0.804]),
    Blue: fromRgb([0, 0, 1]),
    BlueViolet: fromRgb([0.54, 0.17, 0.888]),
    Brown: fromRgb([0.648, 0.165, 0.165]),
    BurlyWood: fromRgb([0.87, 0.72, 0.53]),
    CadetBlue: fromRgb([0.372, 0.62, 0.628]),
    Chartreuse: fromRgb([0.498, 1, 0]),
    Chocolate: fromRgb([0.824, 0.41, 0.116]),
    Coral: fromRgb([1, 0.498, 0.312]),
    CornflowerBlue: fromRgb([0.392, 0.585, 0.93]),
    Cornsilk: fromRgb([1, 0.972, 0.864]),
    Crimson: fromRgb([0.864, 0.08, 0.235]),
    Cyan: fromRgb([0, 1, 1]),
    DarkBlue: fromRgb([0, 0, 0.545]),
    DarkCyan: fromRgb([0, 0.545, 0.545]),
    DarkGoldenrod: fromRgb([0.72, 0.525, 0.044]),
    DarkGray: fromRgb([0.664, 0.664, 0.664]),
    DarkGreen: fromRgb([0, 0.392, 0]),
    DarkGrey: fromRgb([0.664, 0.664, 0.664]),
    DarkKhaki: fromRgb([0.74, 0.716, 0.42]),
    DarkMagenta: fromRgb([0.545, 0, 0.545]),
    DarkOliveGreen: fromRgb([0.332, 0.42, 0.185]),
    DarkOrange: fromRgb([1, 0.55, 0]),
    DarkOrchid: fromRgb([0.6, 0.196, 0.8]),
    DarkRed: fromRgb([0.545, 0, 0]),
    DarkSalmon: fromRgb([0.912, 0.59, 0.48]),
    DarkSeaGreen: fromRgb([0.56, 0.736, 0.56]),
    DarkSlateBlue: fromRgb([0.284, 0.24, 0.545]),
    DarkSlateGray: fromRgb([0.185, 0.31, 0.31]),
    DarkSlateGrey: fromRgb([0.185, 0.31, 0.31]),
    DarkTurquoise: fromRgb([0, 0.808, 0.82]),
    DarkViolet: fromRgb([0.58, 0, 0.828]),
    DeepPink: fromRgb([1, 0.08, 0.576]),
    DeepSkyBlue: fromRgb([0, 0.75, 1]),
    DimGray: fromRgb([0.41, 0.41, 0.41]),
    DimGrey: fromRgb([0.41, 0.41, 0.41]),
    DodgerBlue: fromRgb([0.116, 0.565, 1]),
    FireBrick: fromRgb([0.698, 0.132, 0.132]),
    FloralWhite: fromRgb([1, 0.98, 0.94]),
    ForestGreen: fromRgb([0.132, 0.545, 0.132]),
    Fuchsia: fromRgb([1, 0, 1]),
    Gainsboro: fromRgb([0.864, 0.864, 0.864]),
    GhostWhite: fromRgb([0.972, 0.972, 1]),
    Gold: fromRgb([1, 0.844, 0]),
    Goldenrod: fromRgb([0.855, 0.648, 0.125]),
    Gray: fromRgb([0.5, 0.5, 0.5]),
    Green: fromRgb([0, 0.5, 0]),
    GreenYellow: fromRgb([0.68, 1, 0.185]),
    Grey: fromRgb([0.5, 0.5, 0.5]),
    Honeydew: fromRgb([0.94, 1, 0.94]),
    HotPink: fromRgb([1, 0.41, 0.705]),
    IndianRed: fromRgb([0.804, 0.36, 0.36]),
    Indigo: fromRgb([0.294, 0, 0.51]),
    Ivory: fromRgb([1, 1, 0.94]),
    Khaki: fromRgb([0.94, 0.9, 0.55]),
    Lavender: fromRgb([0.9, 0.9, 0.98]),
    LavenderBlush: fromRgb([1, 0.94, 0.96]),
    LawnGreen: fromRgb([0.488, 0.99, 0]),
    LemonChiffon: fromRgb([1, 0.98, 0.804]),
    LightBlue: fromRgb([0.68, 0.848, 0.9]),
    LightCoral: fromRgb([0.94, 0.5, 0.5]),
    LightCyan: fromRgb([0.88, 1, 1]),
    LightGoldenrod: fromRgb([0.933, 0.867, 0.51]),
    LightGoldenrodYellow: fromRgb([0.98, 0.98, 0.824]),
    LightGray: fromRgb([0.828, 0.828, 0.828]),
    LightGreen: fromRgb([0.565, 0.932, 0.565]),
    LightGrey: fromRgb([0.828, 0.828, 0.828]),
    LightPink: fromRgb([1, 0.712, 0.756]),
    LightSalmon: fromRgb([1, 0.628, 0.48]),
    LightSeaGreen: fromRgb([0.125, 0.698, 0.668]),
    LightSkyBlue: fromRgb([0.53, 0.808, 0.98]),
    LightSlateBlue: fromRgb([0.518, 0.44, 1]),
    LightSlateGray: fromRgb([0.468, 0.532, 0.6]),
    LightSlateGrey: fromRgb([0.468, 0.532, 0.6]),
    LightSteelBlue: fromRgb([0.69, 0.77, 0.87]),
    LightYellow: fromRgb([1, 1, 0.88]),
    Lime: fromRgb([0, 1, 0]),
    LimeGreen: fromRgb([0.196, 0.804, 0.196]),
    Linen: fromRgb([0.98, 0.94, 0.9]),
    Magenta: fromRgb([1, 0, 1]),
    Maroon: fromRgb([0.5, 0, 0]),
    MediumAquamarine: fromRgb([0.4, 0.804, 0.668]),
    MediumBlue: fromRgb([0, 0, 0.804]),
    MediumOrchid: fromRgb([0.73, 0.332, 0.828]),
    MediumPurple: fromRgb([0.576, 0.44, 0.86]),
    MediumSeaGreen: fromRgb([0.235, 0.7, 0.444]),
    MediumSlateBlue: fromRgb([0.484, 0.408, 0.932]),
    MediumSpringGreen: fromRgb([0, 0.98, 0.604]),
    MediumTurquoise: fromRgb([0.284, 0.82, 0.8]),
    MediumVioletRed: fromRgb([0.78, 0.084, 0.52]),
    MidnightBlue: fromRgb([0.098, 0.098, 0.44]),
    MintCream: fromRgb([0.96, 1, 0.98]),
    MistyRose: fromRgb([1, 0.894, 0.884]),
    Moccasin: fromRgb([1, 0.894, 0.71]),
    NavajoWhite: fromRgb([1, 0.87, 0.68]),
    Navy: fromRgb([0, 0, 0.5]),
    NavyBlue: fromRgb([0, 0, 0.5]),
    OldLace: fromRgb([0.992, 0.96, 0.9]),
    Olive: fromRgb([0.5, 0.5, 0]),
    OliveDrab: fromRgb([0.42, 0.556, 0.136]),
    Orange: fromRgb([1, 0.648, 0]),
    OrangeRed: fromRgb([1, 0.27, 0]),
    Orchid: fromRgb([0.855, 0.44, 0.84]),
    PaleGoldenrod: fromRgb([0.932, 0.91, 0.668]),
    PaleGreen: fromRgb([0.596, 0.985, 0.596]),
    PaleTurquoise: fromRgb([0.688, 0.932, 0.932]),
    PaleVioletRed: fromRgb([0.86, 0.44, 0.576]),
    PapayaWhip: fromRgb([1, 0.936, 0.835]),
    PeachPuff: fromRgb([1, 0.855, 0.725]),
    Peru: fromRgb([0.804, 0.52, 0.248]),
    Pink: fromRgb([1, 0.752, 0.796]),
    Plum: fromRgb([0.868, 0.628, 0.868]),
    PowderBlue: fromRgb([0.69, 0.88, 0.9]),
    Purple: fromRgb([0.5, 0, 0.5]),
    Red: fromRgb([1, 0, 0]),
    RosyBrown: fromRgb([0.736, 0.56, 0.56]),
    RoyalBlue: fromRgb([0.255, 0.41, 0.884]),
    SaddleBrown: fromRgb([0.545, 0.27, 0.075]),
    Salmon: fromRgb([0.98, 0.5, 0.448]),
    SandyBrown: fromRgb([0.956, 0.644, 0.376]),
    SeaGreen: fromRgb([0.18, 0.545, 0.34]),
    Seashell: fromRgb([1, 0.96, 0.932]),
    Sienna: fromRgb([0.628, 0.32, 0.176]),
    Silver: fromRgb([0.752, 0.752, 0.752]),
    SkyBlue: fromRgb([0.53, 0.808, 0.92]),
    SlateBlue: fromRgb([0.415, 0.352, 0.804]),
    SlateGray: fromRgb([0.44, 0.5, 0.565]),
    SlateGrey: fromRgb([0.44, 0.5, 0.565]),
    Snow: fromRgb([1, 0.98, 0.98]),
    SpringGreen: fromRgb([0, 1, 0.498]),
    SteelBlue: fromRgb([0.275, 0.51, 0.705]),
    Tan: fromRgb([0.824, 0.705, 0.55]),
    Teal: fromRgb([0, 0.5, 0.5]),
    Thistle: fromRgb([0.848, 0.75, 0.848]),
    Tomato: fromRgb([1, 0.39, 0.28]),
    Turquoise: fromRgb([0.25, 0.88, 0.815]),
    Violet: fromRgb([0.932, 0.51, 0.932]),
    VioletRed: fromRgb([0.816, 0.125, 0.565]),
    Wheat: fromRgb([0.96, 0.87, 0.7]),
    White: fromRgb([1, 1, 1]),
    WhiteSmoke: fromRgb([0.96, 0.96, 0.96]),
    Yellow: fromRgb([1, 1, 0]),
    YellowGreen: fromRgb([0.604, 0.804, 0.196])
  };
  var X11_NAMES = {
    AntiqueWhite1: fromRgb([1, 0.936, 0.86]),
    AntiqueWhite2: fromRgb([0.932, 0.875, 0.8]),
    AntiqueWhite3: fromRgb([0.804, 0.752, 0.69]),
    AntiqueWhite4: fromRgb([0.545, 0.512, 0.47]),
    Aquamarine1: fromRgb([0.498, 1, 0.83]),
    Aquamarine2: fromRgb([0.464, 0.932, 0.776]),
    Aquamarine3: fromRgb([0.4, 0.804, 0.668]),
    Aquamarine4: fromRgb([0.27, 0.545, 0.455]),
    Azure1: fromRgb([0.94, 1, 1]),
    Azure2: fromRgb([0.88, 0.932, 0.932]),
    Azure3: fromRgb([0.756, 0.804, 0.804]),
    Azure4: fromRgb([0.512, 0.545, 0.545]),
    Bisque1: fromRgb([1, 0.894, 0.77]),
    Bisque2: fromRgb([0.932, 0.835, 0.716]),
    Bisque3: fromRgb([0.804, 0.716, 0.62]),
    Bisque4: fromRgb([0.545, 0.49, 0.42]),
    Blue1: fromRgb([0, 0, 1]),
    Blue2: fromRgb([0, 0, 0.932]),
    Blue3: fromRgb([0, 0, 0.804]),
    Blue4: fromRgb([0, 0, 0.545]),
    Brown1: fromRgb([1, 0.25, 0.25]),
    Brown2: fromRgb([0.932, 0.23, 0.23]),
    Brown3: fromRgb([0.804, 0.2, 0.2]),
    Brown4: fromRgb([0.545, 0.136, 0.136]),
    Burlywood1: fromRgb([1, 0.828, 0.608]),
    Burlywood2: fromRgb([0.932, 0.772, 0.57]),
    Burlywood3: fromRgb([0.804, 0.668, 0.49]),
    Burlywood4: fromRgb([0.545, 0.45, 0.332]),
    CadetBlue1: fromRgb([0.596, 0.96, 1]),
    CadetBlue2: fromRgb([0.556, 0.898, 0.932]),
    CadetBlue3: fromRgb([0.48, 0.772, 0.804]),
    CadetBlue4: fromRgb([0.325, 0.525, 0.545]),
    Chartreuse1: fromRgb([0.498, 1, 0]),
    Chartreuse2: fromRgb([0.464, 0.932, 0]),
    Chartreuse3: fromRgb([0.4, 0.804, 0]),
    Chartreuse4: fromRgb([0.27, 0.545, 0]),
    Chocolate1: fromRgb([1, 0.498, 0.14]),
    Chocolate2: fromRgb([0.932, 0.464, 0.13]),
    Chocolate3: fromRgb([0.804, 0.4, 0.112]),
    Chocolate4: fromRgb([0.545, 0.27, 0.075]),
    Coral1: fromRgb([1, 0.448, 0.336]),
    Coral2: fromRgb([0.932, 0.415, 0.312]),
    Coral3: fromRgb([0.804, 0.356, 0.27]),
    Coral4: fromRgb([0.545, 0.244, 0.185]),
    Cornsilk1: fromRgb([1, 0.972, 0.864]),
    Cornsilk2: fromRgb([0.932, 0.91, 0.804]),
    Cornsilk3: fromRgb([0.804, 0.785, 0.694]),
    Cornsilk4: fromRgb([0.545, 0.532, 0.47]),
    Cyan1: fromRgb([0, 1, 1]),
    Cyan2: fromRgb([0, 0.932, 0.932]),
    Cyan3: fromRgb([0, 0.804, 0.804]),
    Cyan4: fromRgb([0, 0.545, 0.545]),
    DarkGoldenrod1: fromRgb([1, 0.725, 0.06]),
    DarkGoldenrod2: fromRgb([0.932, 0.68, 0.055]),
    DarkGoldenrod3: fromRgb([0.804, 0.585, 0.048]),
    DarkGoldenrod4: fromRgb([0.545, 0.396, 0.03]),
    DarkOliveGreen1: fromRgb([0.792, 1, 0.44]),
    DarkOliveGreen2: fromRgb([0.736, 0.932, 0.408]),
    DarkOliveGreen3: fromRgb([0.635, 0.804, 0.352]),
    DarkOliveGreen4: fromRgb([0.43, 0.545, 0.24]),
    DarkOrange1: fromRgb([1, 0.498, 0]),
    DarkOrange2: fromRgb([0.932, 0.464, 0]),
    DarkOrange3: fromRgb([0.804, 0.4, 0]),
    DarkOrange4: fromRgb([0.545, 0.27, 0]),
    DarkOrchid1: fromRgb([0.75, 0.244, 1]),
    DarkOrchid2: fromRgb([0.698, 0.228, 0.932]),
    DarkOrchid3: fromRgb([0.604, 0.196, 0.804]),
    DarkOrchid4: fromRgb([0.408, 0.132, 0.545]),
    DarkSeaGreen1: fromRgb([0.756, 1, 0.756]),
    DarkSeaGreen2: fromRgb([0.705, 0.932, 0.705]),
    DarkSeaGreen3: fromRgb([0.608, 0.804, 0.608]),
    DarkSeaGreen4: fromRgb([0.41, 0.545, 0.41]),
    DarkSlateGray1: fromRgb([0.592, 1, 1]),
    DarkSlateGray2: fromRgb([0.552, 0.932, 0.932]),
    DarkSlateGray3: fromRgb([0.475, 0.804, 0.804]),
    DarkSlateGray4: fromRgb([0.32, 0.545, 0.545]),
    DeepPink1: fromRgb([1, 0.08, 0.576]),
    DeepPink2: fromRgb([0.932, 0.07, 0.536]),
    DeepPink3: fromRgb([0.804, 0.064, 0.464]),
    DeepPink4: fromRgb([0.545, 0.04, 0.312]),
    DeepSkyBlue1: fromRgb([0, 0.75, 1]),
    DeepSkyBlue2: fromRgb([0, 0.698, 0.932]),
    DeepSkyBlue3: fromRgb([0, 0.604, 0.804]),
    DeepSkyBlue4: fromRgb([0, 0.408, 0.545]),
    DodgerBlue1: fromRgb([0.116, 0.565, 1]),
    DodgerBlue2: fromRgb([0.11, 0.525, 0.932]),
    DodgerBlue3: fromRgb([0.094, 0.455, 0.804]),
    DodgerBlue4: fromRgb([0.064, 0.305, 0.545]),
    Firebrick1: fromRgb([1, 0.19, 0.19]),
    Firebrick2: fromRgb([0.932, 0.172, 0.172]),
    Firebrick3: fromRgb([0.804, 0.15, 0.15]),
    Firebrick4: fromRgb([0.545, 0.1, 0.1]),
    Gold1: fromRgb([1, 0.844, 0]),
    Gold2: fromRgb([0.932, 0.79, 0]),
    Gold3: fromRgb([0.804, 0.68, 0]),
    Gold4: fromRgb([0.545, 0.46, 0]),
    Goldenrod1: fromRgb([1, 0.756, 0.145]),
    Goldenrod2: fromRgb([0.932, 0.705, 0.132]),
    Goldenrod3: fromRgb([0.804, 0.608, 0.112]),
    Goldenrod4: fromRgb([0.545, 0.41, 0.08]),
    Green1: fromRgb([0, 1, 0]),
    Green2: fromRgb([0, 0.932, 0]),
    Green3: fromRgb([0, 0.804, 0]),
    Green4: fromRgb([0, 0.545, 0]),
    Honeydew1: fromRgb([0.94, 1, 0.94]),
    Honeydew2: fromRgb([0.88, 0.932, 0.88]),
    Honeydew3: fromRgb([0.756, 0.804, 0.756]),
    Honeydew4: fromRgb([0.512, 0.545, 0.512]),
    HotPink1: fromRgb([1, 0.43, 0.705]),
    HotPink2: fromRgb([0.932, 0.415, 0.655]),
    HotPink3: fromRgb([0.804, 0.376, 0.565]),
    HotPink4: fromRgb([0.545, 0.228, 0.385]),
    IndianRed1: fromRgb([1, 0.415, 0.415]),
    IndianRed2: fromRgb([0.932, 0.39, 0.39]),
    IndianRed3: fromRgb([0.804, 0.332, 0.332]),
    IndianRed4: fromRgb([0.545, 0.228, 0.228]),
    Ivory1: fromRgb([1, 1, 0.94]),
    Ivory2: fromRgb([0.932, 0.932, 0.88]),
    Ivory3: fromRgb([0.804, 0.804, 0.756]),
    Ivory4: fromRgb([0.545, 0.545, 0.512]),
    Khaki1: fromRgb([1, 0.965, 0.56]),
    Khaki2: fromRgb([0.932, 0.9, 0.52]),
    Khaki3: fromRgb([0.804, 0.776, 0.45]),
    Khaki4: fromRgb([0.545, 0.525, 0.305]),
    LavenderBlush1: fromRgb([1, 0.94, 0.96]),
    LavenderBlush2: fromRgb([0.932, 0.88, 0.898]),
    LavenderBlush3: fromRgb([0.804, 0.756, 0.772]),
    LavenderBlush4: fromRgb([0.545, 0.512, 0.525]),
    LemonChiffon1: fromRgb([1, 0.98, 0.804]),
    LemonChiffon2: fromRgb([0.932, 0.912, 0.75]),
    LemonChiffon3: fromRgb([0.804, 0.79, 0.648]),
    LemonChiffon4: fromRgb([0.545, 0.536, 0.44]),
    LightBlue1: fromRgb([0.75, 0.936, 1]),
    LightBlue2: fromRgb([0.698, 0.875, 0.932]),
    LightBlue3: fromRgb([0.604, 0.752, 0.804]),
    LightBlue4: fromRgb([0.408, 0.512, 0.545]),
    LightCyan1: fromRgb([0.88, 1, 1]),
    LightCyan2: fromRgb([0.82, 0.932, 0.932]),
    LightCyan3: fromRgb([0.705, 0.804, 0.804]),
    LightCyan4: fromRgb([0.48, 0.545, 0.545]),
    LightGoldenrod1: fromRgb([1, 0.925, 0.545]),
    LightGoldenrod2: fromRgb([0.932, 0.864, 0.51]),
    LightGoldenrod3: fromRgb([0.804, 0.745, 0.44]),
    LightGoldenrod4: fromRgb([0.545, 0.505, 0.298]),
    LightPink1: fromRgb([1, 0.684, 0.725]),
    LightPink2: fromRgb([0.932, 0.635, 0.68]),
    LightPink3: fromRgb([0.804, 0.55, 0.585]),
    LightPink4: fromRgb([0.545, 0.372, 0.396]),
    LightSalmon1: fromRgb([1, 0.628, 0.48]),
    LightSalmon2: fromRgb([0.932, 0.585, 0.448]),
    LightSalmon3: fromRgb([0.804, 0.505, 0.385]),
    LightSalmon4: fromRgb([0.545, 0.34, 0.26]),
    LightSkyBlue1: fromRgb([0.69, 0.888, 1]),
    LightSkyBlue2: fromRgb([0.644, 0.828, 0.932]),
    LightSkyBlue3: fromRgb([0.552, 0.712, 0.804]),
    LightSkyBlue4: fromRgb([0.376, 0.484, 0.545]),
    LightSteelBlue1: fromRgb([0.792, 0.884, 1]),
    LightSteelBlue2: fromRgb([0.736, 0.824, 0.932]),
    LightSteelBlue3: fromRgb([0.635, 0.71, 0.804]),
    LightSteelBlue4: fromRgb([0.43, 0.484, 0.545]),
    LightYellow1: fromRgb([1, 1, 0.88]),
    LightYellow2: fromRgb([0.932, 0.932, 0.82]),
    LightYellow3: fromRgb([0.804, 0.804, 0.705]),
    LightYellow4: fromRgb([0.545, 0.545, 0.48]),
    Magenta1: fromRgb([1, 0, 1]),
    Magenta2: fromRgb([0.932, 0, 0.932]),
    Magenta3: fromRgb([0.804, 0, 0.804]),
    Magenta4: fromRgb([0.545, 0, 0.545]),
    Maroon1: fromRgb([1, 0.204, 0.7]),
    Maroon2: fromRgb([0.932, 0.19, 0.655]),
    Maroon3: fromRgb([0.804, 0.16, 0.565]),
    Maroon4: fromRgb([0.545, 0.11, 0.385]),
    MediumOrchid1: fromRgb([0.88, 0.4, 1]),
    MediumOrchid2: fromRgb([0.82, 0.372, 0.932]),
    MediumOrchid3: fromRgb([0.705, 0.32, 0.804]),
    MediumOrchid4: fromRgb([0.48, 0.215, 0.545]),
    MediumPurple1: fromRgb([0.67, 0.51, 1]),
    MediumPurple2: fromRgb([0.624, 0.475, 0.932]),
    MediumPurple3: fromRgb([0.536, 0.408, 0.804]),
    MediumPurple4: fromRgb([0.365, 0.28, 0.545]),
    MistyRose1: fromRgb([1, 0.894, 0.884]),
    MistyRose2: fromRgb([0.932, 0.835, 0.824]),
    MistyRose3: fromRgb([0.804, 0.716, 0.71]),
    MistyRose4: fromRgb([0.545, 0.49, 0.484]),
    NavajoWhite1: fromRgb([1, 0.87, 0.68]),
    NavajoWhite2: fromRgb([0.932, 0.81, 0.63]),
    NavajoWhite3: fromRgb([0.804, 0.7, 0.545]),
    NavajoWhite4: fromRgb([0.545, 0.475, 0.37]),
    OliveDrab1: fromRgb([0.752, 1, 0.244]),
    OliveDrab2: fromRgb([0.7, 0.932, 0.228]),
    OliveDrab3: fromRgb([0.604, 0.804, 0.196]),
    OliveDrab4: fromRgb([0.41, 0.545, 0.132]),
    Orange1: fromRgb([1, 0.648, 0]),
    Orange2: fromRgb([0.932, 0.604, 0]),
    Orange3: fromRgb([0.804, 0.52, 0]),
    Orange4: fromRgb([0.545, 0.352, 0]),
    OrangeRed1: fromRgb([1, 0.27, 0]),
    OrangeRed2: fromRgb([0.932, 0.25, 0]),
    OrangeRed3: fromRgb([0.804, 0.215, 0]),
    OrangeRed4: fromRgb([0.545, 0.145, 0]),
    Orchid1: fromRgb([1, 0.512, 0.98]),
    Orchid2: fromRgb([0.932, 0.48, 0.912]),
    Orchid3: fromRgb([0.804, 0.41, 0.79]),
    Orchid4: fromRgb([0.545, 0.28, 0.536]),
    PaleGreen1: fromRgb([0.604, 1, 0.604]),
    PaleGreen2: fromRgb([0.565, 0.932, 0.565]),
    PaleGreen3: fromRgb([0.488, 0.804, 0.488]),
    PaleGreen4: fromRgb([0.33, 0.545, 0.33]),
    PaleTurquoise1: fromRgb([0.732, 1, 1]),
    PaleTurquoise2: fromRgb([0.684, 0.932, 0.932]),
    PaleTurquoise3: fromRgb([0.59, 0.804, 0.804]),
    PaleTurquoise4: fromRgb([0.4, 0.545, 0.545]),
    PaleVioletRed1: fromRgb([1, 0.51, 0.67]),
    PaleVioletRed2: fromRgb([0.932, 0.475, 0.624]),
    PaleVioletRed3: fromRgb([0.804, 0.408, 0.536]),
    PaleVioletRed4: fromRgb([0.545, 0.28, 0.365]),
    PeachPuff1: fromRgb([1, 0.855, 0.725]),
    PeachPuff2: fromRgb([0.932, 0.796, 0.68]),
    PeachPuff3: fromRgb([0.804, 0.688, 0.585]),
    PeachPuff4: fromRgb([0.545, 0.468, 0.396]),
    Pink1: fromRgb([1, 0.71, 0.772]),
    Pink2: fromRgb([0.932, 0.664, 0.72]),
    Pink3: fromRgb([0.804, 0.57, 0.62]),
    Pink4: fromRgb([0.545, 0.39, 0.424]),
    Plum1: fromRgb([1, 0.732, 1]),
    Plum2: fromRgb([0.932, 0.684, 0.932]),
    Plum3: fromRgb([0.804, 0.59, 0.804]),
    Plum4: fromRgb([0.545, 0.4, 0.545]),
    Purple1: fromRgb([0.608, 0.19, 1]),
    Purple2: fromRgb([0.57, 0.172, 0.932]),
    Purple3: fromRgb([0.49, 0.15, 0.804]),
    Purple4: fromRgb([0.332, 0.1, 0.545]),
    Red1: fromRgb([1, 0, 0]),
    Red2: fromRgb([0.932, 0, 0]),
    Red3: fromRgb([0.804, 0, 0]),
    Red4: fromRgb([0.545, 0, 0]),
    RosyBrown1: fromRgb([1, 0.756, 0.756]),
    RosyBrown2: fromRgb([0.932, 0.705, 0.705]),
    RosyBrown3: fromRgb([0.804, 0.608, 0.608]),
    RosyBrown4: fromRgb([0.545, 0.41, 0.41]),
    RoyalBlue1: fromRgb([0.284, 0.464, 1]),
    RoyalBlue2: fromRgb([0.264, 0.43, 0.932]),
    RoyalBlue3: fromRgb([0.228, 0.372, 0.804]),
    RoyalBlue4: fromRgb([0.152, 0.25, 0.545]),
    Salmon1: fromRgb([1, 0.55, 0.41]),
    Salmon2: fromRgb([0.932, 0.51, 0.385]),
    Salmon3: fromRgb([0.804, 0.44, 0.33]),
    Salmon4: fromRgb([0.545, 0.298, 0.224]),
    SeaGreen1: fromRgb([0.33, 1, 0.624]),
    SeaGreen2: fromRgb([0.305, 0.932, 0.58]),
    SeaGreen3: fromRgb([0.264, 0.804, 0.5]),
    SeaGreen4: fromRgb([0.18, 0.545, 0.34]),
    Seashell1: fromRgb([1, 0.96, 0.932]),
    Seashell2: fromRgb([0.932, 0.898, 0.87]),
    Seashell3: fromRgb([0.804, 0.772, 0.75]),
    Seashell4: fromRgb([0.545, 0.525, 0.51]),
    Sienna1: fromRgb([1, 0.51, 0.28]),
    Sienna2: fromRgb([0.932, 0.475, 0.26]),
    Sienna3: fromRgb([0.804, 0.408, 0.224]),
    Sienna4: fromRgb([0.545, 0.28, 0.15]),
    SkyBlue1: fromRgb([0.53, 0.808, 1]),
    SkyBlue2: fromRgb([0.494, 0.752, 0.932]),
    SkyBlue3: fromRgb([0.424, 0.65, 0.804]),
    SkyBlue4: fromRgb([0.29, 0.44, 0.545]),
    SlateBlue1: fromRgb([0.512, 0.435, 1]),
    SlateBlue2: fromRgb([0.48, 0.404, 0.932]),
    SlateBlue3: fromRgb([0.41, 0.35, 0.804]),
    SlateBlue4: fromRgb([0.28, 0.235, 0.545]),
    SlateGray1: fromRgb([0.776, 0.888, 1]),
    SlateGray2: fromRgb([0.725, 0.828, 0.932]),
    SlateGray3: fromRgb([0.624, 0.712, 0.804]),
    SlateGray4: fromRgb([0.424, 0.484, 0.545]),
    Snow1: fromRgb([1, 0.98, 0.98]),
    Snow2: fromRgb([0.932, 0.912, 0.912]),
    Snow3: fromRgb([0.804, 0.79, 0.79]),
    Snow4: fromRgb([0.545, 0.536, 0.536]),
    SpringGreen1: fromRgb([0, 1, 0.498]),
    SpringGreen2: fromRgb([0, 0.932, 0.464]),
    SpringGreen3: fromRgb([0, 0.804, 0.4]),
    SpringGreen4: fromRgb([0, 0.545, 0.27]),
    SteelBlue1: fromRgb([0.39, 0.72, 1]),
    SteelBlue2: fromRgb([0.36, 0.675, 0.932]),
    SteelBlue3: fromRgb([0.31, 0.58, 0.804]),
    SteelBlue4: fromRgb([0.21, 0.392, 0.545]),
    Tan1: fromRgb([1, 0.648, 0.31]),
    Tan2: fromRgb([0.932, 0.604, 0.288]),
    Tan3: fromRgb([0.804, 0.52, 0.248]),
    Tan4: fromRgb([0.545, 0.352, 0.17]),
    Thistle1: fromRgb([1, 0.884, 1]),
    Thistle2: fromRgb([0.932, 0.824, 0.932]),
    Thistle3: fromRgb([0.804, 0.71, 0.804]),
    Thistle4: fromRgb([0.545, 0.484, 0.545]),
    Tomato1: fromRgb([1, 0.39, 0.28]),
    Tomato2: fromRgb([0.932, 0.36, 0.26]),
    Tomato3: fromRgb([0.804, 0.31, 0.224]),
    Tomato4: fromRgb([0.545, 0.21, 0.15]),
    Turquoise1: fromRgb([0, 0.96, 1]),
    Turquoise2: fromRgb([0, 0.898, 0.932]),
    Turquoise3: fromRgb([0, 0.772, 0.804]),
    Turquoise4: fromRgb([0, 0.525, 0.545]),
    VioletRed1: fromRgb([1, 0.244, 0.59]),
    VioletRed2: fromRgb([0.932, 0.228, 0.55]),
    VioletRed3: fromRgb([0.804, 0.196, 0.47]),
    VioletRed4: fromRgb([0.545, 0.132, 0.32]),
    Wheat1: fromRgb([1, 0.905, 0.73]),
    Wheat2: fromRgb([0.932, 0.848, 0.684]),
    Wheat3: fromRgb([0.804, 0.73, 0.59]),
    Wheat4: fromRgb([0.545, 0.494, 0.4]),
    Yellow1: fromRgb([1, 1, 0]),
    Yellow2: fromRgb([0.932, 0.932, 0]),
    Yellow3: fromRgb([0.804, 0.804, 0]),
    Yellow4: fromRgb([0.545, 0.545, 0]),
    Gray0: fromRgb([0.745, 0.745, 0.745]),
    Green0: fromRgb([0, 1, 0]),
    Grey0: fromRgb([0.745, 0.745, 0.745]),
    Maroon0: fromRgb([0.69, 0.19, 0.376]),
    Purple0: fromRgb([0.628, 0.125, 0.94])
  };
  var XColorCoreModelToColor = {
    rgb: ([r, g, b]) => (0, import_color.default)([r * 255, g * 255, b * 255], "rgb"),
    cmy: ([c, m, y]) => XColorCoreModelToColor.rgb([1 - c, 1 - m, 1 - y]),
    cmyk: ([c, m, y, k]) => (0, import_color.default)([c * 255, m * 255, y * 255, k * 100], "cmyk"),
    hsb: ([h, s2, b]) => (0, import_color.default)([h * 360, s2 * 100, b * 100], "hsv"),
    gray: ([v]) => (0, import_color.default)([v * 255, v * 255, v * 255], "rgb")
  };
  var XColorModelToColor = {
    wave: ([lambda]) => {
      const gamma = 0.8;
      let baseRgb = [0, 0, 0];
      if (380 <= lambda && lambda < 440) {
        baseRgb = [(440 - lambda) / (440 - 380), 0, 1];
      }
      if (440 <= lambda && lambda < 490) {
        baseRgb = [0, (lambda - 440) / (490 - 440), 1];
      }
      if (490 <= lambda && lambda < 510) {
        baseRgb = [0, 1, (510 - lambda) / (510 - 490)];
      }
      if (510 <= lambda && lambda < 580) {
        baseRgb = [(lambda - 510) / (580 - 510), 1, 0];
      }
      if (580 <= lambda && lambda < 6450) {
        baseRgb = [1, (645 - lambda) / (645 - 580), 0];
      }
      if (645 <= lambda && lambda <= 780) {
        baseRgb = [1, 0, 0];
      }
      let f = 1;
      if (380 <= lambda && 420 < lambda) {
        f = 0.3 + 0.7 * (lambda - 380) / (420 - 380);
      }
      if (700 < lambda && lambda <= 780) {
        f = 0.3 + 0.7 * (780 - lambda) / (780 - 700);
      }
      const rgb = [
        Math.pow(baseRgb[0] * f, gamma),
        Math.pow(baseRgb[1] * f, gamma),
        Math.pow(baseRgb[2] * f, gamma)
      ];
      return (0, import_color.default)([rgb[0] * 255, rgb[1] * 255, rgb[2] * 255], "rgb");
    },
    Hsb: ([h, s2, b]) => XColorCoreModelToColor.hsb([h / 360, s2, b]),
    HSB: ([h, s2, b]) => XColorCoreModelToColor.hsb([h / 240, s2 / 240, b / 240]),
    HTML: ([v]) => v.startsWith("#") ? (0, import_color.default)(v) : (0, import_color.default)(`#${v}`),
    RGB: ([r, g, b]) => (0, import_color.default)([r, g, b], "rgb"),
    Gray: ([v]) => XColorCoreModelToColor.gray([v / 15]),
    ...XColorCoreModelToColor
  };
  var PREDEFINED_XCOLOR_COLORS = {
    // Core colors
    red: XColorCoreModelToColor.rgb([1, 0, 0]),
    green: XColorCoreModelToColor.rgb([0, 1, 0]),
    blue: XColorCoreModelToColor.rgb([0, 0, 1]),
    brown: XColorCoreModelToColor.rgb([0.75, 0.5, 0.25]),
    lime: XColorCoreModelToColor.rgb([0.75, 1, 0]),
    orange: XColorCoreModelToColor.rgb([1, 0.5, 0]),
    pink: XColorCoreModelToColor.rgb([1, 0.75, 0.75]),
    purple: XColorCoreModelToColor.rgb([0.75, 0, 0.25]),
    teal: XColorCoreModelToColor.rgb([0, 0.5, 0.5]),
    violet: XColorCoreModelToColor.rgb([0.5, 0, 0.5]),
    cyan: XColorCoreModelToColor.rgb([0, 1, 1]),
    magenta: XColorCoreModelToColor.rgb([1, 0, 1]),
    yellow: XColorCoreModelToColor.rgb([1, 1, 0]),
    olive: XColorCoreModelToColor.rgb([0.5, 0.5, 0]),
    black: XColorCoreModelToColor.rgb([0, 0, 0]),
    darkgray: XColorCoreModelToColor.rgb([0.25, 0.25, 0.25]),
    gray: XColorCoreModelToColor.rgb([0.5, 0.5, 0.5]),
    lightgray: XColorCoreModelToColor.rgb([0.75, 0.75, 0.75]),
    white: XColorCoreModelToColor.rgb([1, 1, 1]),
    ...DVI_PS_NAMES,
    ...SVG_NAMES,
    ...X11_NAMES
  };
  var macros14 = {
    NewDocumentCommand: {
      signature: "m m m",
      renderInfo: { breakAround: true }
    },
    RenewDocumentCommand: {
      signature: "m m m",
      renderInfo: { breakAround: true }
    },
    ProvideDocumentCommand: {
      signature: "m m m",
      renderInfo: { breakAround: true }
    },
    DeclareDocumentCommand: {
      signature: "m m m",
      renderInfo: { breakAround: true }
    },
    NewDocumentEnvironment: {
      signature: "m m m m",
      renderInfo: { breakAround: true }
    },
    RenewDocumentEnvironment: {
      signature: "m m m m",
      renderInfo: { breakAround: true }
    },
    ProvideDocumentEnvironment: {
      signature: "m m m m",
      renderInfo: { breakAround: true }
    },
    DeclareDocumentEnvironment: {
      signature: "m m m m",
      renderInfo: { breakAround: true }
    },
    NewExpandableDocumentCommand: {
      signature: "m m m",
      renderInfo: { breakAround: true }
    },
    RenewExpandableDocumentCommand: {
      signature: "m m m",
      renderInfo: { breakAround: true }
    },
    ProvideExpandableDocumentCommand: {
      signature: "m m m",
      renderInfo: { breakAround: true }
    },
    DeclareExpandableDocumentCommand: {
      signature: "m m m",
      renderInfo: { breakAround: true }
    },
    RequirePackage: {
      signature: "o m",
      renderInfo: { pgfkeysArgs: true, breakAround: true }
    },
    DeclareOption: { signature: "m m", renderInfo: { breakAround: true } }
  };
  var environments14 = {};
  var macros15 = {
    mode: { signature: "s d<> d{}", renderInfo: { breakAround: true } },
    insertnavigation: { signature: "m", renderInfo: { breakAround: true } },
    insertsectionnavigation: {
      signature: "m",
      renderInfo: { breakAround: true }
    },
    insertsectionnavigationhorizontal: {
      signature: "m m m",
      renderInfo: { breakAround: true }
    },
    insertauthor: { signature: "o", renderInfo: { breakAround: true } },
    insertshortauthor: { signature: "o", renderInfo: { breakAround: true } },
    insertshortdate: { signature: "o", renderInfo: { breakAround: true } },
    insertshortinstitute: { signature: "o", renderInfo: { breakAround: true } },
    insertshortpart: { signature: "o", renderInfo: { breakAround: true } },
    insertshorttitle: { signature: "o", renderInfo: { breakAround: true } },
    insertsubsectionnavigation: {
      signature: "m",
      renderInfo: { breakAround: true }
    },
    insertsubsectionnavigationhorizontal: {
      signature: "m m m",
      renderInfo: { breakAround: true }
    },
    insertverticalnavigation: {
      signature: "m",
      renderInfo: { breakAround: true }
    },
    usebeamercolor: { signature: "s m", renderInfo: { breakAround: true } },
    usebeamertemplate: { signature: "s m", renderInfo: { breakAround: true } },
    setbeamercolor: {
      signature: "m m",
      renderInfo: { breakAround: true, pgfkeysArgs: true }
    },
    setbeamersize: {
      signature: "m o o",
      renderInfo: { breakAround: true, pgfkeysArgs: true }
    },
    setbeamertemplate: {
      signature: "m o o d{}",
      renderInfo: { breakAround: true, pgfkeysArgs: true }
    },
    newcommand: {
      signature: "s d<> +m o +o +m",
      renderInfo: {
        breakAround: true,
        namedArguments: [
          "starred",
          null,
          "name",
          "numArgs",
          "default",
          "body"
        ]
      }
    },
    renewcommand: {
      signature: "s d<> +m o +o +m",
      renderInfo: {
        breakAround: true,
        namedArguments: [
          "starred",
          null,
          "name",
          "numArgs",
          "default",
          "body"
        ]
      }
    },
    newenvironment: {
      signature: "s d<> m o o m m",
      renderInfo: { breakAround: true }
    },
    renewenvironment: {
      signature: "s d<> m o o m m",
      renderInfo: { breakAround: true }
    },
    resetcounteronoverlays: {
      signature: "m",
      renderInfo: { breakAround: true }
    },
    resetcountonoverlays: { signature: "m", renderInfo: { breakAround: true } },
    logo: { signature: "m", renderInfo: { breakAround: true } },
    frametitle: { signature: "d<> o m", renderInfo: { breakAround: true } },
    framesubtitle: { signature: "d<> m", renderInfo: { breakAround: true } },
    pause: { signature: "o" },
    onslide: { signature: "t+ t* d<> d{}" },
    only: { signature: "d<> m d<>" },
    uncover: { signature: "d<> m" },
    visible: { signature: "d<> m" },
    invisible: { signature: "d<> m" },
    alt: { signature: "d<> m m d<>" },
    temporal: { signature: "r<> m m m" },
    item: {
      signature: "d<> o d<>",
      renderInfo: {
        hangingIndent: true,
        namedArguments: [null, "label", null]
      }
    },
    label: { signature: "d<> o m" },
    // cleveref adds an optional argument to label; this gives maximum compatibility.
    action: { signature: "d<> m" },
    beamerdefaultoverlayspecification: { signature: "m" },
    titlegraphic: { signature: "m", renderInfo: { breakAround: true } },
    subject: { signature: "m", renderInfo: { breakAround: true } },
    keywords: { signature: "m", renderInfo: { breakAround: true } },
    lecture: { signature: "o m m", renderInfo: { breakAround: true } },
    partpage: { renderInfo: { breakAround: true } },
    sectionpage: { renderInfo: { breakAround: true } },
    subsectionpage: { renderInfo: { breakAround: true } },
    AtBeginLecture: { signature: "m", renderInfo: { breakAround: true } },
    AtBeginPart: { signature: "m", renderInfo: { breakAround: true } },
    tableofcontents: {
      signature: "o",
      renderInfo: { breakAround: true, pgfkeysArgs: true }
    },
    againframe: { signature: "d<> o o m", renderInfo: { breakAround: true } },
    framezoom: {
      signature: "r<> r<> o r() r()",
      renderInfo: { breakAround: true }
    },
    column: { signature: "d<> o m", renderInfo: { breakAround: true } },
    animate: { signature: "r<>", renderInfo: { breakAround: true } },
    animatevalue: { signature: "r<> m m m", renderInfo: { breakAround: true } },
    sound: {
      signature: "o m m",
      renderInfo: { breakAround: true, pgfkeysArgs: true }
    },
    hyperlinksound: {
      signature: "o m m",
      renderInfo: { breakAround: true, pgfkeysArgs: true }
    },
    hyperlinkmute: { signature: "m", renderInfo: { breakAround: true } },
    // These signatures conflict with the default signatures.
    // Care must be taken when processing an AST.
    section: {
      signature: "s d<> o m",
      renderInfo: {
        breakAround: true,
        namedArguments: ["starred", null, "tocTitle", "title"]
      }
    },
    subsection: {
      signature: "s d<> o m",
      renderInfo: {
        breakAround: true,
        namedArguments: ["starred", null, "tocTitle", "title"]
      }
    },
    subsubsection: {
      signature: "s d<> o m",
      renderInfo: {
        breakAround: true,
        namedArguments: ["starred", null, "tocTitle", "title"]
      }
    },
    part: {
      signature: "s d<> o m",
      renderInfo: {
        breakAround: true,
        namedArguments: ["starred", null, "tocTitle", "title"]
      }
    },
    bibitem: {
      signature: "s d<> o m",
      renderInfo: {
        hangingIndent: true,
        namedArguments: ["starred", null, "tocTitle", "title"]
      }
    }
  };
  var environments15 = {
    frame: {
      signature: "!d<> !o !o !d{} !d{}"
    },
    block: {
      signature: "!d<> !d{} !d<>"
    },
    alertblock: {
      signature: "!d<> !d{} !d<>"
    },
    exampleblock: {
      signature: "!d<> !d{} !d<>"
    },
    onlyenv: {
      signature: "!d<>"
    },
    altenv: {
      signature: "!d<> m m m m !d<>"
    },
    overlayarea: { signature: "m m" },
    overprint: { signature: "o" },
    actionenv: { signature: "!d<>" },
    columns: { signature: "d<> o" },
    column: { signature: "d<> o m" }
  };
  var macros16 = {
    columnbreak: { renderInfo: { breakAround: true } }
  };
  var environments16 = {
    multicols: {
      signature: "m o o"
    },
    "multicols*": {
      signature: "m o o"
    }
  };
  var macroInfo = {
    cleveref: macros,
    exam: macros2,
    geometry: macros3,
    hyperref: macros4,
    latex2e: macros5,
    listings: macros6,
    makeidx: macros7,
    mathtools: macros8,
    minted: macros9,
    nicematrix: macros10,
    systeme: macros11,
    tikz: macros12,
    xcolor: macros13,
    xparse: macros14,
    beamer: macros15,
    multicol: macros16
  };
  var environmentInfo = {
    cleveref: environments,
    exam: environments2,
    geometry: environments3,
    hyperref: environments4,
    latex2e: environments5,
    listings: environments6,
    makeidx: environments7,
    mathtools: environments8,
    minted: environments9,
    nicematrix: environments10,
    systeme: environments11,
    tikz: environments12,
    xcolor: environments13,
    xparse: environments14,
    beamer: environments15,
    multicol: environments16
  };

  // ../node_modules/@unified-latex/unified-latex-util-environments/index.js
  function processEnvironment(envNode, envInfo) {
    if (envInfo.signature && envNode.args == null) {
      const { args } = gobbleArguments(envNode.content, envInfo.signature);
      envNode.args = args;
    }
    updateRenderInfo(envNode, envInfo.renderInfo);
    if (typeof envInfo.processContent === "function") {
      envNode.content = envInfo.processContent(envNode.content);
    }
  }

  // ../node_modules/@unified-latex/unified-latex-util-catcode/index.js
  function findRegionInArray(tree, start, end) {
    const ret = [];
    let currRegion = { start: void 0, end: tree.length };
    for (let i = 0; i < tree.length; i++) {
      const node = tree[i];
      if (start(node)) {
        currRegion.start = i;
      }
      if (end(node)) {
        currRegion.end = i + 1;
        ret.push(currRegion);
        currRegion = { start: void 0, end: tree.length };
      }
    }
    if (currRegion.start != null) {
      ret.push(currRegion);
    }
    return ret;
  }
  function refineRegions(regions) {
    const _regions = [...regions];
    _regions.sort((a, b) => a.start - b.start);
    const cutPointsSet = new Set(_regions.flatMap((r) => [r.start, r.end]));
    const cutPoints = Array.from(cutPointsSet);
    cutPoints.sort((a, b) => a - b);
    const retRegions = [];
    const retRegionsContainedIn = [];
    let seekIndex = 0;
    for (let i = 0; i < cutPoints.length - 1; i++) {
      const start = cutPoints[i];
      const end = cutPoints[i + 1];
      const region = { start, end };
      const regionContainedIn = /* @__PURE__ */ new Set();
      let encounteredEndPastStart = false;
      for (let j = seekIndex; j < _regions.length; j++) {
        const superRegion = _regions[j];
        if (superRegion.end >= region.start) {
          encounteredEndPastStart = true;
        }
        if (!encounteredEndPastStart && superRegion.end < region.start) {
          seekIndex = j + 1;
          continue;
        }
        if (superRegion.start > end) {
          break;
        }
        if (superRegion.start <= region.start && superRegion.end >= region.end) {
          encounteredEndPastStart = true;
          regionContainedIn.add(superRegion);
        }
      }
      if (regionContainedIn.size > 0) {
        retRegions.push(region);
        retRegionsContainedIn.push(regionContainedIn);
      }
    }
    return { regions: retRegions, regionsContainedIn: retRegionsContainedIn };
  }
  function splitByRegions(array, regionsRecord) {
    const ret = [];
    const indices = [0, array.length];
    const reverseMap = {};
    for (const [key, records] of Object.entries(regionsRecord)) {
      indices.push(
        ...records.flatMap((r) => {
          reverseMap["" + [r.start, r.end]] = key;
          return [r.start, r.end];
        })
      );
    }
    indices.sort((a, b) => a - b);
    for (let i = 0; i < indices.length - 1; i++) {
      const start = indices[i];
      const end = indices[i + 1];
      if (start === end) {
        continue;
      }
      const regionKey = reverseMap["" + [start, end]];
      ret.push([regionKey || null, array.slice(start, end)]);
    }
    return ret;
  }
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function buildWordRegex(allowedSet) {
    const regexpStr = `^(${["\\p{L}"].concat(Array.from(allowedSet).map(escapeRegExp)).join("|")})*`;
    return new RegExp(regexpStr, "u");
  }
  function hasReparsableMacroNamesInArray(tree, allowedTokens) {
    for (let i = 0; i < tree.length; i++) {
      const macro2 = tree[i];
      const string2 = tree[i + 1];
      if (match.anyMacro(macro2) && match.anyString(string2)) {
        if (allowedTokens.has(
          macro2.content.charAt(macro2.content.length - 1)
        ) || allowedTokens.has(string2.content.charAt(0))) {
          return true;
        }
      }
    }
    return false;
  }
  function hasReparsableMacroNames(tree, allowedTokens) {
    if (typeof allowedTokens === "string") {
      allowedTokens = new Set(allowedTokens.split(""));
    }
    const _allowedTokens = allowedTokens;
    for (const v of _allowedTokens) {
      if (v.length > 1) {
        throw new Error(
          `Only single characters are allowed as \`allowedTokens\` when reparsing macro names, not \`${v}\`.`
        );
      }
    }
    let ret = false;
    visit(
      tree,
      (nodes) => {
        if (hasReparsableMacroNamesInArray(nodes, _allowedTokens)) {
          ret = true;
          return EXIT;
        }
      },
      { includeArrays: true, test: Array.isArray }
    );
    return ret;
  }
  function reparseMacroNamesInArray(tree, allowedTokens) {
    var _a, _b, _c;
    const regex = buildWordRegex(allowedTokens);
    let i = 0;
    while (i < tree.length) {
      const macro2 = tree[i];
      const string2 = tree[i + 1];
      if (match.anyMacro(macro2) && // The _^ macros in math mode should not be extended no-matter what;
      // So we check to make sure that the macro we're dealing with has the default escape token.
      (macro2.escapeToken == null || macro2.escapeToken === "\\") && match.anyString(string2) && // There are two options. Either the macro ends with the special character,
      // e.g. `\@foo` or the special character starts the next string, e.g. `\foo@`.
      (allowedTokens.has(
        macro2.content.charAt(macro2.content.length - 1)
      ) || allowedTokens.has(string2.content.charAt(0)))) {
        const match3 = string2.content.match(regex);
        const takeable = match3 ? match3[0] : "";
        if (takeable.length > 0) {
          if (takeable.length === string2.content.length) {
            macro2.content += string2.content;
            tree.splice(i + 1, 1);
            if (macro2.position && ((_a = string2.position) == null ? void 0 : _a.end)) {
              macro2.position.end = string2.position.end;
            }
          } else {
            macro2.content += takeable;
            string2.content = string2.content.slice(takeable.length);
            if ((_b = macro2.position) == null ? void 0 : _b.end) {
              macro2.position.end.offset += takeable.length;
              macro2.position.end.column += takeable.length;
            }
            if ((_c = string2.position) == null ? void 0 : _c.start) {
              string2.position.start.offset += takeable.length;
              string2.position.start.column += takeable.length;
            }
          }
        } else {
          i++;
        }
      } else {
        ++i;
      }
    }
  }
  function reparseMacroNames(tree, allowedTokens) {
    if (typeof allowedTokens === "string") {
      allowedTokens = new Set(allowedTokens.split(""));
    }
    const _allowedTokens = allowedTokens;
    for (const v of _allowedTokens) {
      if (v.length > 1) {
        throw new Error(
          `Only single characters are allowed as \`allowedTokens\` when reparsing macro names, not \`${v}\`.`
        );
      }
    }
    visit(
      tree,
      (nodes) => {
        reparseMacroNamesInArray(nodes, _allowedTokens);
      },
      { includeArrays: true, test: Array.isArray }
    );
  }
  var expl3Find = {
    start: match.createMacroMatcher(["ExplSyntaxOn"]),
    end: match.createMacroMatcher(["ExplSyntaxOff"])
  };
  var atLetterFind = {
    start: match.createMacroMatcher(["makeatletter"]),
    end: match.createMacroMatcher(["makeatother"])
  };
  function findExpl3AndAtLetterRegionsInArray(tree) {
    const expl3 = findRegionInArray(tree, expl3Find.start, expl3Find.end);
    const atLetter = findRegionInArray(
      tree,
      atLetterFind.start,
      atLetterFind.end
    );
    const regionMap = new Map([
      ...expl3.map((x) => [x, "expl"]),
      ...atLetter.map((x) => [x, "atLetter"])
    ]);
    const all = refineRegions([...expl3, ...atLetter]);
    const ret = {
      explOnly: [],
      atLetterOnly: [],
      both: []
    };
    for (let i = 0; i < all.regions.length; i++) {
      const region = all.regions[i];
      const containedIn = all.regionsContainedIn[i];
      if (containedIn.size === 2) {
        ret.both.push(region);
        continue;
      }
      for (const v of containedIn.values()) {
        if (regionMap.get(v) === "expl") {
          ret.explOnly.push(region);
        }
        if (regionMap.get(v) === "atLetter") {
          ret.atLetterOnly.push(region);
        }
      }
    }
    ret.explOnly = ret.explOnly.filter((r) => r.end - r.start > 1);
    ret.atLetterOnly = ret.atLetterOnly.filter((r) => r.end - r.start > 1);
    ret.both = ret.both.filter((r) => r.end - r.start > 1);
    return ret;
  }
  var atLetterSet = /* @__PURE__ */ new Set(["@"]);
  var explSet = /* @__PURE__ */ new Set(["_", ":"]);
  var bothSet = /* @__PURE__ */ new Set(["_", ":", "@"]);
  function reparseExpl3AndAtLetterRegions(tree) {
    visit(
      tree,
      {
        leave: (nodes) => {
          const regions = findExpl3AndAtLetterRegionsInArray(nodes);
          const totalNumRegions = regions.both.length + regions.atLetterOnly.length + regions.explOnly.length;
          if (totalNumRegions === 0) {
            return;
          }
          const splits = splitByRegions(nodes, regions);
          const processed = [];
          for (const [key, slice] of splits) {
            switch (key) {
              case null:
                processed.push(...slice);
                continue;
              case "atLetterOnly":
                reparseMacroNames(slice, atLetterSet);
                processed.push(...slice);
                continue;
              case "explOnly":
                reparseMacroNames(slice, explSet);
                processed.push(...slice);
                continue;
              case "both":
                reparseMacroNames(slice, bothSet);
                processed.push(...slice);
                continue;
              default:
                throw new Error(
                  `Unexpected case when splitting ${key}`
                );
            }
          }
          nodes.length = 0;
          nodes.push(...processed);
          return SKIP;
        }
      },
      { includeArrays: true, test: Array.isArray }
    );
  }

  // ../node_modules/@unified-latex/unified-latex-util-parse/index.js
  var unifiedLatexAstComplier = function unifiedLatexAstComplier2() {
    Object.assign(this, { Compiler: (x) => x });
  };
  function parseMinimal(str) {
    return LatexPegParser.parse(str);
  }
  function parseMathMinimal(str) {
    return LatexPegParser.parse(str, { startRule: "math" });
  }
  var unifiedLatexFromStringMinimal = function unifiedLatexFromStringMinimal2(options) {
    const parser2 = (str) => {
      if ((options == null ? void 0 : options.mode) === "math") {
        return {
          type: "root",
          content: parseMathMinimal(str),
          _renderInfo: { inMathMode: true }
        };
      }
      return parseMinimal(str);
    };
    Object.assign(this, { Parser: parser2 });
  };
  function unifiedLatexReparseMathConstructPlugin({
    mathEnvs,
    mathMacros
  }) {
    const isMathEnvironment = match.createEnvironmentMatcher(mathEnvs);
    const isMathMacro = match.createMacroMatcher(mathMacros);
    return (tree) => {
      visit(
        tree,
        (node) => {
          if (match.anyMacro(node)) {
            for (const arg2 of node.args || []) {
              if (arg2.content.length > 0 && !wasParsedInMathMode(arg2.content)) {
                arg2.content = parseMathMinimal(
                  printRaw(arg2.content)
                );
              }
            }
          }
          if (match.anyEnvironment(node)) {
            if (!wasParsedInMathMode(node.content)) {
              node.content = parseMathMinimal(printRaw(node.content));
            }
          }
        },
        {
          test: (node) => isMathEnvironment(node) || isMathMacro(node)
        }
      );
    };
  }
  function wasParsedInMathMode(nodes) {
    return !nodes.some(
      (node) => (
        // If there are multi-char strings or ^ and _ have been parsed as strings, we know
        // that we were not parsed in math mode.
        match.anyString(node) && node.content.length > 1 || match.string(node, "^") || match.string(node, "_")
      )
    );
  }
  var unifiedLatexProcessMacrosAndEnvironmentsWithMathReparse = function unifiedLatexProcessMacrosAndEnvironmentsWithMathReparse2(options) {
    const { environments: environments17 = {}, macros: macros17 = {} } = options || {};
    const mathMacros = Object.fromEntries(
      Object.entries(macros17).filter(
        ([_, info]) => {
          var _a;
          return ((_a = info.renderInfo) == null ? void 0 : _a.inMathMode) === true;
        }
      )
    );
    const mathEnvs = Object.fromEntries(
      Object.entries(environments17).filter(
        ([_, info]) => {
          var _a;
          return ((_a = info.renderInfo) == null ? void 0 : _a.inMathMode) === true;
        }
      )
    );
    const mathReparser = unifiedLatexReparseMathConstructPlugin({
      mathEnvs: Object.keys(mathEnvs),
      mathMacros: Object.keys(mathMacros)
    });
    const isRelevantEnvironment = match.createEnvironmentMatcher(environments17);
    const isRelevantMathEnvironment = match.createEnvironmentMatcher(mathEnvs);
    return (tree) => {
      visit(
        tree,
        {
          enter: (nodes) => {
            if (!Array.isArray(nodes)) {
              return;
            }
            attachMacroArgsInArray(nodes, mathMacros);
          },
          leave: (node) => {
            if (!isRelevantMathEnvironment(node)) {
              return;
            }
            const envName = printRaw(node.env);
            const envInfo = environments17[envName];
            if (!envInfo) {
              throw new Error(
                `Could not find environment info for environment "${envName}"`
              );
            }
            processEnvironment(node, envInfo);
          }
        },
        { includeArrays: true }
      );
      mathReparser(tree);
      visit(
        tree,
        {
          enter: (nodes) => {
            if (!Array.isArray(nodes)) {
              return;
            }
            attachMacroArgsInArray(nodes, macros17);
          },
          leave: (node) => {
            if (!isRelevantEnvironment(node)) {
              return;
            }
            const envName = printRaw(node.env);
            const envInfo = environments17[envName];
            if (!envInfo) {
              throw new Error(
                `Could not find environment info for environment "${envName}"`
              );
            }
            processEnvironment(node, envInfo);
          }
        },
        { includeArrays: true }
      );
    };
  };
  var unifiedLatexProcessAtLetterAndExplMacros = function unifiedLatexProcessAtLetterAndExplMacros2(options) {
    let {
      atLetter = false,
      expl3 = false,
      autodetectExpl3AndAtLetter = false
    } = options || {};
    return (tree) => {
      reparseExpl3AndAtLetterRegions(tree);
      if (atLetter || expl3) {
        autodetectExpl3AndAtLetter = false;
      }
      if (autodetectExpl3AndAtLetter) {
        atLetter = hasReparsableMacroNames(tree, "@");
        expl3 = hasReparsableMacroNames(tree, "_");
      }
      const charSet = /* @__PURE__ */ new Set();
      if (atLetter) {
        charSet.add("@");
      }
      if (expl3) {
        charSet.add(":");
        charSet.add("_");
      }
      if (charSet.size > 0) {
        reparseMacroNames(tree, charSet);
      }
    };
  };
  var unifiedLatexFromString = function unifiedLatexFromString2(options) {
    const {
      mode = "regular",
      macros: macros17 = {},
      environments: environments17 = {},
      flags: {
        atLetter = false,
        expl3 = false,
        autodetectExpl3AndAtLetter = false
      } = {}
    } = options || {};
    const allMacroInfo = Object.assign(
      {},
      ...Object.values(macroInfo),
      macros17
    );
    const allEnvInfo = Object.assign(
      {},
      ...Object.values(environmentInfo),
      environments17
    );
    const fullParser = unified().use(unifiedLatexFromStringMinimal, { mode }).use(unifiedLatexProcessAtLetterAndExplMacros, {
      atLetter,
      expl3,
      autodetectExpl3AndAtLetter
    }).use(unifiedLatexProcessMacrosAndEnvironmentsWithMathReparse, {
      macros: allMacroInfo,
      environments: allEnvInfo
    }).use(unifiedLatexTrimEnvironmentContents).use(unifiedLatexTrimRoot).use(unifiedLatexAstComplier);
    const parser2 = (str) => {
      const file = fullParser.processSync({ value: str });
      return file.result;
    };
    Object.assign(this, { Parser: parser2 });
  };
  var parser = unified().use(unifiedLatexFromString).freeze();
  function getParser(options) {
    return options ? unified().use(unifiedLatexFromString, options).freeze() : parser;
  }

  // unified.ts
  module.exports = {
    getParser,
    attachMacroArgs
  };
})();
/*! Bundled license information:

is-buffer/index.js:
  (*!
   * Determine if an object is a Buffer
   *
   * @author   Feross Aboukhadijeh <https://feross.org>
   * @license  MIT
   *)
*/
