(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory;
  } else {
    root.atomic = factory(root);
  }
})(this, function (root) {

  'use strict';

  var exports = {};

  var parse = function (req) {
    var result;
    try {
      result = JSON.parse(req.responseText);
    } catch (e) {
      result = req.responseText;
    }
    return [result, req];
  };

  var xhr = function (type, url, data) {
    var methods = {
      success: function () {},
      error: function () {}
    };
    var XHR = root.XMLHttpRequest || ActiveXObject;
    var request = new XHR('MSXML2.XMLHTTP.3.0');
    request.open(type, url, true);
    request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    request.onreadystatechange = function () {
      if (request.readyState === 4) {
        if (request.status >= 200 && request.status < 300) {
          methods.success.apply(methods, parse(request));
        } else {
          methods.error.apply(methods, parse(request));
        }
      }
    };
    request.send(data);
    var callbacks = {
      success: function (callback) {
        methods.success = callback;
        return callbacks;
      },
      error: function (callback) {
        methods.error = callback;
        return callbacks;
      }
    };

    return callbacks;
  };

  exports['get'] = function (src) {
    return xhr('GET', src);
  };

  exports['put'] = function (url, data) {
    return xhr('PUT', url, data);
  };

  exports['post'] = function (url, data) {
    return xhr('POST', url, data);
  };

  exports['delete'] = function (url) {
    return xhr('DELETE', url);
  };

  return exports;

});

},{}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _util = require("./_util");

var getShortcutObject = _util.getShortcutObject;
var metaKey = _util.metaKey;

var noop = function noop() {};

var shortcuts = [getShortcutObject([metaKey, "D"], noop, "Delete line"), getShortcutObject([metaKey, "Z"], noop, "Undo"), getShortcutObject([metaKey, "Shift", "D"], noop, "Duplicate line"), getShortcutObject([metaKey, "Shift", "Z"], noop, "Redo"), getShortcutObject([metaKey, "/"], noop, "Comment in/out line")];
exports.shortcuts = shortcuts;

//
//getShortcutObject([metaKey, 'I', 'E'], noop, '???'),
//getShortcutObject([metaKey, 'I', 'I'], noop, '???'),
//getShortcutObject([metaKey, 'I', 'E', 'E'], noop, '???')

},{"./_util":5}],3:[function(require,module,exports){
"use strict";

var _createClass = (function () {
  function defineProperties(target, props) {
    for (var key in props) {
      var prop = props[key];prop.configurable = true;if (prop.value) prop.writable = true;
    }Object.defineProperties(target, props);
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
})();

var _classCallCheck = function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var Ace = (function () {
  function Ace() {
    _classCallCheck(this, Ace);
  }

  _createClass(Ace, {
    setDomNodeId: {
      value: function setDomNodeId(domNodeId) {
        this._domNodeId = domNodeId;
        this._init();
      }
    },
    _init: {
      value: function _init() {
        ace.require("ace/ext/language_tools");
        var editor = ace.edit(this._domNodeId);
        this._editor = editor;
        editor.getSession().setMode("ace/mode/javascript");
        editor.setOptions({
          enableBasicAutocompletion: true
        });

        editor.getSession().setTabSize(2);
        document.getElementById(this._domNodeId).style.fontSize = "12px";
        document.getElementById(this._domNodeId).style.backgroundColor = "white";
      }
    },
    setContent: {
      value: function setContent(content) {
        this._editor.selectAll();
        this._editor.insert(content);
      }
    },
    getContent: {
      value: function getContent() {
        return this._editor.getValue();
      }
    }
  });

  return Ace;
})();

module.exports = Ace;

},{}],4:[function(require,module,exports){
"use strict";

var _interopRequire = function _interopRequire(obj) {
  return obj && obj.__esModule ? obj["default"] : obj;
};

exports.xhrGet = xhrGet;
Object.defineProperty(exports, "__esModule", {
  value: true
});

var atomic = _interopRequire(require("atomic"));

var myAtomic = atomic(window);

function xhrGet(url, onError, onSuccess) {
  myAtomic.get(url).success(onSuccess).error(onError);
}

},{"atomic":1}],5:[function(require,module,exports){
"use strict";

var _interopRequire = function _interopRequire(obj) {
  return obj && obj.__esModule ? obj["default"] : obj;
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

var toPrintableKeys = require("../src/keyboard-shortcut/util").toPrintableKeys;

var Shortcut = _interopRequire(require("../src/keyboard-shortcut/shortcut"));

var isMac = navigator.platform.indexOf("Mac") === 0;

var map = {
  Meta: "⌘Command",
  Shift: "⇧Shift"
};

var format = function format(keys) {
  return toPrintableKeys(keys, map);
};

var getShortcutObject = function getShortcutObject(keys, fn, helpText) {
  var shortcut = new Shortcut(keys, fn, helpText);
  shortcut.printableKeysFormatter = format;
  return shortcut;
};

exports.getShortcutObject = getShortcutObject;
var metaKey = isMac ? "Meta" : "Control";
exports.metaKey = metaKey;

},{"../src/keyboard-shortcut/shortcut":16,"../src/keyboard-shortcut/util":17}],6:[function(require,module,exports){
"use strict";

var _interopRequire = function _interopRequire(obj) {
  return obj && obj.__esModule ? obj["default"] : obj;
};

var _createClass = (function () {
  function defineProperties(target, props) {
    for (var key in props) {
      var prop = props[key];prop.configurable = true;if (prop.value) prop.writable = true;
    }Object.defineProperties(target, props);
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
})();

var _inherits = function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) subClass.__proto__ = superClass;
};

var _classCallCheck = function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var React = _interopRequire(require("react"));

var KeyboardShortcut = _interopRequire(require("./keyboard-shortcut.js"));

var KeyboardShortcutOverlay = (function (_React$Component) {
  function KeyboardShortcutOverlay() {
    _classCallCheck(this, KeyboardShortcutOverlay);

    if (_React$Component != null) {
      _React$Component.apply(this, arguments);
    }
  }

  _inherits(KeyboardShortcutOverlay, _React$Component);

  _createClass(KeyboardShortcutOverlay, {
    render: {
      value: function render() {
        var _props = this.props;
        var shortcuts = _props.shortcuts;
        var metaKeySymbol = _props.metaKeySymbol;

        var isVisible = shortcuts.length > 0;
        var styleProps = { display: isVisible ? "block" : "none" };
        return React.createElement("div", { className: "keyboard-shortcut-overlay", style: styleProps }, shortcuts.map(function (shortcut, idx) {
          return React.createElement(KeyboardShortcut, { shortcut: shortcut, key: idx });
        }), React.createElement("div", { className: "hint" }, "Note: All keyboard shortcuts fire ", React.createElement("b", null, "when you release the ", metaKeySymbol), "  key.", React.createElement("br", null), "This allows for combinations such as  ", metaKeySymbol, "+I+E  and  ", metaKeySymbol, "+I+E+E , and way more", React.createElement("br", null), "combinations for faster working with your code."));
      }
    }
  });

  return KeyboardShortcutOverlay;
})(React.Component);

module.exports = KeyboardShortcutOverlay;

},{"./keyboard-shortcut.js":7,"react":19}],7:[function(require,module,exports){
"use strict";

var _interopRequire = function _interopRequire(obj) {
  return obj && obj.__esModule ? obj["default"] : obj;
};

var _createClass = (function () {
  function defineProperties(target, props) {
    for (var key in props) {
      var prop = props[key];prop.configurable = true;if (prop.value) prop.writable = true;
    }Object.defineProperties(target, props);
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
})();

var _inherits = function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) subClass.__proto__ = superClass;
};

var _classCallCheck = function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var React = _interopRequire(require("react"));

var KeyboardShortcut = (function (_React$Component) {
  function KeyboardShortcut() {
    _classCallCheck(this, KeyboardShortcut);

    if (_React$Component != null) {
      _React$Component.apply(this, arguments);
    }
  }

  _inherits(KeyboardShortcut, _React$Component);

  _createClass(KeyboardShortcut, {
    render: {
      value: function render() {
        var _props$shortcut = this.props.shortcut;
        var printableKeys = _props$shortcut.printableKeys;
        var helpText = _props$shortcut.helpText;

        return React.createElement("div", null, React.createElement("span", { className: "shortcut" }, printableKeys, " "), helpText);
      }
    }
  });

  return KeyboardShortcut;
})(React.Component);

module.exports = KeyboardShortcut;

},{"react":19}],8:[function(require,module,exports){
"use strict";

var _interopRequire = function _interopRequire(obj) {
  return obj && obj.__esModule ? obj["default"] : obj;
};

var _createClass = (function () {
  function defineProperties(target, props) {
    for (var key in props) {
      var prop = props[key];prop.configurable = true;if (prop.value) prop.writable = true;
    }Object.defineProperties(target, props);
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
})();

var _inherits = function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) subClass.__proto__ = superClass;
};

var _classCallCheck = function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var React = _interopRequire(require("react"));

var NavigationBar = _interopRequire(require("../components/navigation-bar.js"));

var KeyboardShortcutOverlay = _interopRequire(require("../components/keyboard-shortcut-overlay.js"));

var Main = (function (_React$Component) {
  function Main() {
    _classCallCheck(this, Main);

    if (_React$Component != null) {
      _React$Component.apply(this, arguments);
    }
  }

  _inherits(Main, _React$Component);

  _createClass(Main, {
    render: {
      value: function render() {
        var _props = this.props;
        var metaKeySymbol = _props.metaKeySymbol;
        var onSave = _props.onSave;
        var onResetCode = _props.onResetCode;
        var editorId = _props.editorId;
        var runnerId = _props.runnerId;
        var shortcuts = _props.shortcuts;

        return React.createElement("div", null, React.createElement(NavigationBar, {
          metaKeySymbol: metaKeySymbol,
          onSave: onSave,
          onResetCode: onResetCode
        }), React.createElement("div", { className: "editor-and-runner" }, React.createElement("div", { id: editorId, className: "editor" }), React.createElement("div", { id: runnerId, className: "runner" })), React.createElement(KeyboardShortcutOverlay, {
          metaKeySymbol: metaKeySymbol,
          shortcuts: shortcuts
        }));
      }
    }
  });

  return Main;
})(React.Component);

module.exports = Main;

},{"../components/keyboard-shortcut-overlay.js":6,"../components/navigation-bar.js":9,"react":19}],9:[function(require,module,exports){
"use strict";

var _interopRequire = function _interopRequire(obj) {
  return obj && obj.__esModule ? obj["default"] : obj;
};

var _createClass = (function () {
  function defineProperties(target, props) {
    for (var key in props) {
      var prop = props[key];prop.configurable = true;if (prop.value) prop.writable = true;
    }Object.defineProperties(target, props);
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
})();

var _inherits = function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) subClass.__proto__ = superClass;
};

var _classCallCheck = function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var React = _interopRequire(require("react"));

var NavigationBar = (function (_React$Component) {
  function NavigationBar() {
    _classCallCheck(this, NavigationBar);

    if (_React$Component != null) {
      _React$Component.apply(this, arguments);
    }
  }

  _inherits(NavigationBar, _React$Component);

  _createClass(NavigationBar, {
    render: {
      value: function render() {
        var _props = this.props;
        var onSave = _props.onSave;
        var metaKeySymbol = _props.metaKeySymbol;
        var onResetCode = _props.onResetCode;

        return React.createElement("header", { className: "navigation-bar" }, React.createElement("button", { className: "logo" }), React.createElement("span", { className: "tddbin" }, "TDD bin"), React.createElement("button", { className: "save", title: "Run tests (" + metaKeySymbol + "S)", onClick: onSave }, "Run tests"), React.createElement("button", { title: "Reset code", onClick: onResetCode }, "Reset code"), React.createElement("a", { href: "http://twitter.com/tddbin", className: "icon twitter", title: "Get in touch." }), React.createElement("a", { href: "http://github.com/tddbin/tddbin-frontend", className: "icon github", title: "Get (into) the code and contribute." }), React.createElement("a", { href: "https://trello.com/b/FW1gUVxe/tddbin-com", className: "icon trello", title: "Vote, add features, discuss, ..." }), React.createElement("a", { href: "http://uxebu.com", className: "icon uxebu", title: "Made by uxebu." }));
      }
    }
  });

  return NavigationBar;
})(React.Component);

module.exports = NavigationBar;

},{"react":19}],10:[function(require,module,exports){
"use strict";

var _interopRequire = function _interopRequire(obj) {
  return obj && obj.__esModule ? obj["default"] : obj;
};

var _createClass = (function () {
  function defineProperties(target, props) {
    for (var key in props) {
      var prop = props[key];prop.configurable = true;if (prop.value) prop.writable = true;
    }Object.defineProperties(target, props);
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
})();

var _classCallCheck = function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var Ace = _interopRequire(require("./_external-deps/ace.js"));

var Editor = (function () {
  function Editor(domNodeId) {
    _classCallCheck(this, Editor);

    this.ace = new Ace();
    this.ace.setDomNodeId(domNodeId);
  }

  _createClass(Editor, {
    setContent: {
      value: function setContent(content) {
        this.ace.setContent(content);
      }
    },
    getContent: {
      value: function getContent() {
        return this.ace.getContent();
      }
    }
  });

  return Editor;
})();

module.exports = Editor;

},{"./_external-deps/ace.js":3}],11:[function(require,module,exports){
"use strict";

var _interopRequire = function _interopRequire(obj) {
  return obj && obj.__esModule ? obj["default"] : obj;
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

var Main = require("./main-controller").Controller;

var _util = require("./_util");

var getShortcutObject = _util.getShortcutObject;
var metaKey = _util.metaKey;

var aceDefaultShortcuts = require("./_aceDefaultShortcuts").shortcuts;

var StartUp = _interopRequire(require("./startup"));

var xhrGet = require("./_external-deps/xhr.js").xhrGet;

var KataUrl = _interopRequire(require("./kata-url.js"));

var onSave = function onSave() {
  return main.onSave();
};

var shortcuts = aceDefaultShortcuts.concat([getShortcutObject([metaKey, "S"], onSave, "Save+Run")]);

var appDomNode = document.getElementById("tddbin");
var main = new Main(appDomNode, {
  iframeSrcUrl: "./mocha/spec-runner.html",
  shortcuts: shortcuts
});

var withSourceCode = function withSourceCode(sourceCode) {
  var onSave = function onSave() {
    return main.onSave();
  };
  main.setEditorContent(sourceCode);
  setTimeout(onSave, 1000);
};

var kataName = "es5/mocha+assert/assert-api";
var DEFAULT_KATA_URL = "http://" + "katas.tddbin.com" + "/katas/" + kataName + ".js";
exports.DEFAULT_KATA_URL = DEFAULT_KATA_URL;
var xhrGetDefaultKata = xhrGet.bind(null, DEFAULT_KATA_URL);

var startUp = new StartUp(xhrGet, xhrGetDefaultKata);

var queryString = window.location.hash.replace(/^#\?/, "");
var kataUrl = KataUrl.fromQueryString(queryString);

startUp.loadSourceCode(kataUrl, withSourceCode);

},{"./_aceDefaultShortcuts":2,"./_external-deps/xhr.js":4,"./_util":5,"./kata-url.js":12,"./main-controller":18,"./startup":20}],12:[function(require,module,exports){
"use strict";

var _createClass = (function () {
  function defineProperties(target, props) {
    for (var key in props) {
      var prop = props[key];prop.configurable = true;if (prop.value) prop.writable = true;
    }Object.defineProperties(target, props);
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
})();

var _classCallCheck = function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var KataUrl = (function () {
  function KataUrl() {
    _classCallCheck(this, KataUrl);
  }

  _createClass(KataUrl, null, {
    fromQueryString: {
      value: function fromQueryString(queryString) {
        var kataName = queryString.match(/kata=([^&]+)/);
        if (kataName && kataName.length === 2) {
          kataName = kataName[1];
          return "http://" + "katas.tddbin.com" + "/katas/" + kataName + ".js";
        }
      }
    }
  });

  return KataUrl;
})();

module.exports = KataUrl;

},{}],13:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var browserEventUtil = {

  onWindowBlur: function onWindowBlur(fn) {
    window.addEventListener("blur", fn);
  }
};
exports.browserEventUtil = browserEventUtil;

},{}],14:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var keyboardEventUtil = {

  PREVENT_DEFAULT_ACTION: "preventDefault",

  addKeyDownListener: function addKeyDownListener(fn) {
    document.addEventListener("keydown", function (evt) {
      var whatToDo = fn(getKeyNameFromEvent(evt));
      if (whatToDo === keyboardEventUtil.PREVENT_DEFAULT_ACTION) {
        evt.preventDefault();
      }
    });
  },

  addKeyUpListener: function addKeyUpListener(fn) {
    document.addEventListener("keyup", function (evt) {
      fn(getKeyNameFromEvent(evt));
    });
  }
};

exports.keyboardEventUtil = keyboardEventUtil;
var keyCodeToReadableKeyMap = {
  16: "Shift",
  17: "Control",
  18: "Alt",
  91: "Meta", // Seems not to be correct in FF, but FF supports evt.key
  117: "F6"
};

var mapKeyCodeToReadable = function mapKeyCodeToReadable(keyCode) {
  var keyCodeMap = keyCodeToReadableKeyMap;
  if (keyCode in keyCodeMap) {
    return keyCodeMap[keyCode];
  }
  return String.fromCharCode(keyCode);
};

var getKeyNameFromEvent = function getKeyNameFromEvent(evt) {
  if (evt.key) {
    // Ctrl+S in FF reports evt.key='s' (which makes sense) but we handle all just in upper case.
    if (evt.key.length === 1) {
      return evt.key.toUpperCase();
    }
    return evt.key;
  }
  return mapKeyCodeToReadable(evt.keyCode);
};

},{}],15:[function(require,module,exports){
"use strict";

var _createClass = (function () {
  function defineProperties(target, props) {
    for (var key in props) {
      var prop = props[key];prop.configurable = true;if (prop.value) prop.writable = true;
    }Object.defineProperties(target, props);
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
})();

var _classCallCheck = function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var keyboardEventUtil = require("./keyboard-event-util").keyboardEventUtil;

var browserEventUtil = require("./browser-event-util").browserEventUtil;

var ShortcutProcessor = (function () {
  function ShortcutProcessor() {
    _classCallCheck(this, ShortcutProcessor);

    this._pressedKeys = [];
    this._registeredShortcuts = [];
    keyboardEventUtil.addKeyDownListener(this._keyDown.bind(this));
    keyboardEventUtil.addKeyUpListener(this._keyUp.bind(this));
    browserEventUtil.onWindowBlur(this._fireOnShortcutEndCallback.bind(this));

    this._firstKeyOfCurrentShortcut = null;
    this._onKeyDownCallback = null;
    this._onShortcutEndCallback = null;
  }

  _createClass(ShortcutProcessor, {
    registerShortcut: {
      value: function registerShortcut(shortcut) {
        this._registeredShortcuts.push(shortcut);
      }
    },
    registerShortcuts: {
      value: function registerShortcuts(shortcuts) {
        var self = this;
        shortcuts.forEach(function (shortcut) {
          self.registerShortcut(shortcut);
        });
      }
    },
    onKeyDown: {
      value: function onKeyDown(callback) {
        this._onKeyDownCallback = callback;
      }
    },
    onShortcutEnd: {
      value: function onShortcutEnd(callback) {
        this._onShortcutEndCallback = callback;
      }
    },
    _fireOnKeyDownCallback: {
      value: function _fireOnKeyDownCallback() {
        if (this._onKeyDownCallback) {
          this._onKeyDownCallback(this._pressedKeys);
        }
      }
    },
    _fireOnShortcutEndCallback: {
      value: function _fireOnShortcutEndCallback() {
        if (this._onShortcutEndCallback) {
          this._onShortcutEndCallback();
        }
      }
    },
    _keyDown: {
      value: function _keyDown(keyName) {
        var isStartOfShortcut = this._pressedKeys.length === 0;
        if (isStartOfShortcut) {
          return this._handlePossibleShortcutStart(keyName);
        }
        return this._handleConsecutiveKey(keyName);
      }
    },
    _handlePossibleShortcutStart: {
      value: function _handlePossibleShortcutStart(keyName) {
        var isFirstKeyOfRegisteredShortcut = this._registeredShortcuts.some(function (shortcut) {
          return shortcut.isStartOfKeyCombo([keyName]);
        });
        if (isFirstKeyOfRegisteredShortcut) {
          this._pressedKeys = [keyName];
          this._firstKeyOfCurrentShortcut = keyName;
          this._fireOnKeyDownCallback();
        }
      }
    },
    _handleConsecutiveKey: {
      value: function _handleConsecutiveKey(keyName) {
        var isFirstKeyRepition = this._pressedKeys.length === 1 && this._pressedKeys[0] === keyName;
        if (isFirstKeyRepition) {
          return;
        }

        this._pressedKeys.push(keyName);
        this._fireOnKeyDownCallback();

        if (this._isRegisteredShortcut(this._pressedKeys)) {
          return keyboardEventUtil.PREVENT_DEFAULT_ACTION;
        }
      }
    },
    _keyUp: {
      value: function _keyUp(keyName) {
        if (this._isEndOfCurrentShortcut(keyName)) {
          this._processFirstMatchingShortcut(this._pressedKeys);
          this._fireOnShortcutEndCallback();
          this._pressedKeys = [];
        }
      }
    },
    _isEndOfCurrentShortcut: {
      value: function _isEndOfCurrentShortcut(keyName) {
        return keyName === this._firstKeyOfCurrentShortcut;
      }
    },
    _processFirstMatchingShortcut: {
      value: function _processFirstMatchingShortcut(pressedKeys) {
        this._registeredShortcuts.some(function (shortcut) {
          if (shortcut.isKeyCombo(pressedKeys)) {
            shortcut.fireAssignedCallback();
            return true;
          }
          return false;
        });
      }
    },
    _isRegisteredShortcut: {
      value: function _isRegisteredShortcut(pressedKeys) {
        return this._registeredShortcuts.some(function (shortcut) {
          return shortcut.isKeyCombo(pressedKeys);
        });
      }
    }
  });

  return ShortcutProcessor;
})();

module.exports = ShortcutProcessor;

},{"./browser-event-util":13,"./keyboard-event-util":14}],16:[function(require,module,exports){
"use strict";

var _createClass = (function () {
  function defineProperties(target, props) {
    for (var key in props) {
      var prop = props[key];prop.configurable = true;if (prop.value) prop.writable = true;
    }Object.defineProperties(target, props);
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
})();

var _classCallCheck = function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var Shortcut = (function () {
  function Shortcut(keys, fn, helpText) {
    _classCallCheck(this, Shortcut);

    this._keys = keys;
    this._fn = fn;
    this.helpText = helpText;
    this._printableKeysFormatter = null;
  }

  _createClass(Shortcut, {
    isStartOfKeyCombo: {
      value: function isStartOfKeyCombo(pressedKeys) {
        var shortcut = this._keys;
        return pressedKeys.every(function (key, idx) {
          return shortcut[idx] === key;
        });
      }
    },
    isKeyCombo: {
      value: function isKeyCombo(pressedKeys) {
        return pressedKeys.join("+") === this._keys.join("+");
      }
    },
    fireAssignedCallback: {
      value: function fireAssignedCallback() {
        this._fn();
      }
    },
    printableKeysFormatter: {
      set: function set(formatterFunction) {
        this._printableKeysFormatter = formatterFunction;
      }
    },
    printableKeys: {
      get: function get() {
        var format = this._printableKeysFormatter;
        var keys = this._keys;
        if (format) {
          keys = format(this._keys);
        }
        return keys.join("+");
      }
    }
  });

  return Shortcut;
})();

module.exports = Shortcut;

},{}],17:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var toPrintableKeys = function toPrintableKeys(keys, map) {
  return keys.map(function (key) {
    return map[key] || key;
  });
};
exports.toPrintableKeys = toPrintableKeys;

},{}],18:[function(require,module,exports){
"use strict";

var _interopRequire = function _interopRequire(obj) {
  return obj && obj.__esModule ? obj["default"] : obj;
};

exports.Controller = Controller;
Object.defineProperty(exports, "__esModule", {
  value: true
});

var React = _interopRequire(require("react"));

var Main = _interopRequire(require("./components/main.js"));

var TestRunner = _interopRequire(require("./test-runner/runner"));

var ShortcutProcessor = _interopRequire(require("./keyboard-shortcut/shortcut-processor"));

var Editor = _interopRequire(require("./editor"));

function Controller(domNode, config) {
  this._domNode = domNode;
  this._config = config;
  this.render();
}

Controller.prototype = {

  _component: null,

  render: function render() {
    this._editorDomNodeId = "editorId";
    this._runnerDomNodeId = "runnerId";
    this._render();
    this._editor = new Editor(this._editorDomNodeId);
    this._runner = new TestRunner(document.getElementById(this._runnerDomNodeId));
    this._runner.render(this._config.iframeSrcUrl);
    this.setEditorContent("");
    this._registerShortcuts(this._config.shortcuts);
  },

  _render: function _render() {
    var shortcuts = arguments[0] === undefined ? [] : arguments[0];

    var props = {
      metaKeySymbol: "⌘",
      editorId: this._editorDomNodeId,
      runnerId: this._runnerDomNodeId,
      onSave: this.onSave.bind(this),
      onResetCode: this._onResetCode,
      shortcuts: shortcuts
    };
    this._component = React.render(React.createElement(Main, props), this._domNode);
  },

  onSave: function onSave() {
    window.localStorage.setItem("code", this._editor.getContent());
    this.runEditorContent();
  },

  _onResetCode: function _onResetCode() {
    window.localStorage.removeItem("code");
    window.location.reload();
  },

  setEditorContent: function setEditorContent(sourceCode) {
    this._editor.setContent(sourceCode);
  },

  runEditorContent: function runEditorContent() {
    this._runner.send(this._editor.getContent());
  },

  _registerShortcuts: function _registerShortcuts(shortcuts) {
    var processor = new ShortcutProcessor();
    processor.registerShortcuts(shortcuts);
    processor.onKeyDown(this._updateOverlayView.bind(this));
    processor.onShortcutEnd(this._hideOverlayView.bind(this));
  },

  _hideOverlayView: function _hideOverlayView() {
    //this._component.props = {shortcuts: []};
    //this._component.setProps({shortcuts: []});
    this._render([]);
  },

  _updateOverlayView: function _updateOverlayView(pressedKeys) {
    var allShortcuts = this._config.shortcuts;
    var applicableShortcuts = allShortcuts.filter(function (shortcut) {
      return shortcut.isStartOfKeyCombo(pressedKeys);
    });
    this._render(applicableShortcuts);
    //this._component.props = {shortcuts: applicableShortcuts};
    //this._component.props.shortcuts = applicableShortcuts;
    //this._component.setProps({shortcuts: applicableShortcuts});
  }

};

},{"./components/main.js":8,"./editor":10,"./keyboard-shortcut/shortcut-processor":15,"./test-runner/runner":22,"react":19}],19:[function(require,module,exports){
(function (global){
"use strict";

var react = global.React;
module.exports = react;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],20:[function(require,module,exports){
"use strict";

var _createClass = (function () {
  function defineProperties(target, props) {
    for (var key in props) {
      var prop = props[key];prop.configurable = true;if (prop.value) prop.writable = true;
    }Object.defineProperties(target, props);
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
})();

var _classCallCheck = function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var StartUp = (function () {
  function StartUp(xhrGet, xhrGetDefaultKata) {
    _classCallCheck(this, StartUp);

    this.xhrGet = xhrGet;
    this.xhrGetDefaultKata = xhrGetDefaultKata;
  }

  _createClass(StartUp, {
    loadSourceCode: {
      value: function loadSourceCode(kataUrl, withSourceCode) {
        var sourceCode = localStorage.getItem("code");
        if (kataUrl) {
          this.loadKataFromUrl(kataUrl, withSourceCode);
        } else if (sourceCode) {
          withSourceCode(sourceCode);
        } else {
          this.loadDefaultKata(withSourceCode);
        }
        window.location.hash = window.location.hash.replace(/kata=([^&]+)/, "");
      }
    },
    loadDefaultKata: {
      value: function loadDefaultKata(onLoaded) {
        this.xhrGetDefaultKata(function (_, _ref) {
          var status = _ref.status;
          return onLoaded("// Default kata not found (status " + status + ")\n// Maybe try a different kata (see URL).");
        }, function (data) {
          onLoaded(data);
        });
      }
    },
    loadKataFromUrl: {
      value: function loadKataFromUrl(kataUrl, onLoaded) {
        this.xhrGet(kataUrl, function (_, _ref) {
          var status = _ref.status;
          return onLoaded("// Kata at \"" + kataUrl + "\" not found (status " + status + ")\n// Maybe try a different kata (see URL).");
        }, function (data) {
          onLoaded(data);
        });
      }
    }
  });

  return StartUp;
})();

module.exports = StartUp;

},{}],21:[function(require,module,exports){
"use strict";

var _interopRequire = function _interopRequire(obj) {
  return obj && obj.__esModule ? obj["default"] : obj;
};

var _createClass = (function () {
  function defineProperties(target, props) {
    for (var key in props) {
      var prop = props[key];prop.configurable = true;if (prop.value) prop.writable = true;
    }Object.defineProperties(target, props);
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
})();

var _inherits = function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) subClass.__proto__ = superClass;
};

var _classCallCheck = function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var React = _interopRequire(require("react"));

var Iframe = (function (_React$Component) {
  function Iframe() {
    _classCallCheck(this, Iframe);

    if (_React$Component != null) {
      _React$Component.apply(this, arguments);
    }
  }

  _inherits(Iframe, _React$Component);

  _createClass(Iframe, {
    getIframeRef: {
      value: function getIframeRef() {
        return this.refs.iframe.getDOMNode();
      }
    },
    render: {
      value: function render() {
        return React.createElement("iframe", { ref: "iframe", src: this.props.iframeSrc, width: "100%", height: "100%" });
      }
    }
  });

  return Iframe;
})(React.Component);

module.exports = Iframe;

},{"react":19}],22:[function(require,module,exports){
"use strict";

var _interopRequire = function _interopRequire(obj) {
  return obj && obj.__esModule ? obj["default"] : obj;
};

var _createClass = (function () {
  function defineProperties(target, props) {
    for (var key in props) {
      var prop = props[key];prop.configurable = true;if (prop.value) prop.writable = true;
    }Object.defineProperties(target, props);
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
})();

var _classCallCheck = function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var React = _interopRequire(require("react"));

var Iframe = _interopRequire(require("./iframe"));

var TestRunner = (function () {
  function TestRunner(domNode, eventReceiver) {
    _classCallCheck(this, TestRunner);

    this._onStats = null;
    this._domNode = domNode;
    (eventReceiver || window).addEventListener("message", this.handleDataReceived.bind(this), false);
  }

  _createClass(TestRunner, {
    render: {
      value: function render(iframeSrc) {
        var iframe = React.render(React.createElement(Iframe, { iframeSrc: iframeSrc }), this._domNode);
        this._iframeRef = iframe.getIframeRef();
      }
    },
    send: {
      value: function send(sourceCode) {
        var iframe = this._iframeRef.contentWindow;
        iframe.postMessage(sourceCode, "*");
      }
    },
    onStats: {
      value: function onStats(fn) {
        this._onStats = fn;
      }
    },
    handleDataReceived: {
      value: function handleDataReceived(data) {
        if (this._onStats) {
          var stats = data.data;
          this._onStats(stats);
        }
      }
    }
  });

  return TestRunner;
})();

module.exports = TestRunner;

},{"./iframe":21,"react":19}]},{},[11]);
