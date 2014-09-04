/* orion editor */ 
/**
 * almond 0.2.4 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("almond", function(){});

/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
 
/*global define*/

define("orion/editor/shim", [], function() { //$NON-NLS-0$

	/**
	 * Partial ECMAScript 5 shim.
	 */
	
	if (!Object.create) {
		/* This shim does not properly support the props paramenter. It only works for Deferred.js. */
		Object.create = function(proto, props) {
			function N() {}
			N.prototype = proto;
			var result = new N();
			if (props) {
				for (var p in props) {
					if (props.hasOwnProperty(p)) {
						if (props[p].hasOwnProperty("value")) { //$NON-NLS-0$
							result[p] = props[p].value;
						} else {
							result[p] = function() {
								if (arguments.length > 0) {
									return props[p].get();
								} else {
									props[p].set(arguments);
								}
							};
						}
					}
				}
			}
			return result;
		};
	}
	if (!Object.keys) {
		Object.keys = function(o) {
			var result = [];
			for (var p in o) {
				if (o.hasOwnProperty(p)) {
					result.push(p);
				}
			}
			return result;
		};
	}

	if (!Function.prototype.bind) {
		Function.prototype.bind = function (context) {
			var fn = this, fixed = Array.prototype.slice.call(arguments, 1);
			if (fixed.length) {
				return function() {
					return arguments.length	? fn.apply(context, fixed.concat(Array.prototype.slice.call(arguments))) : fn.apply(context, fixed);
				};
			}
			return function() {
				return arguments.length ? fn.apply(context, arguments) : fn.call(context);
			};
		};
	}

	
	if (!Array.isArray) {
		Array.isArray = function(obj) {
			return Object.prototype.toString.call(obj) === "[object Array]";
		};
	}
	if (!Array.prototype.indexOf) {
		Array.prototype.indexOf = function(c) {
			for (var i=0; i<this.length; i++) {
				if (this[i] === c) {
					return i;
				}
			}
			return -1;
		};
	}
	if (!Array.prototype.forEach) {
		Array.prototype.forEach = function(func) {
			for (var i=0; i<this.length; i++) {
				func(this[i], i);
			}
		};
	}
	if (!Array.prototype.map) {
		Array.prototype.map = function(func) {
			var result = new Array(this.length);
			for (var i=0; i<this.length; i++) {
				result[i] = func(this[i]);
			}
			return result;
		};
	}
	if (!Array.prototype.reduce) {
		Array.prototype.reduce = function(func, initialValue){
			var result, set = false;
			if (1 < arguments.length) {
				result = initialValue;
				set = true;
			}
			for (var i = 0; this.length > i; ++i) {
				if (set) {
					result = func(result, this[i], i, this);
				} else {
					result = this[i];
					set = true;
				}
			}
			return result;
		};
	}
	
	if (!String.prototype.trim) {
		String.prototype.trim = function(){
			return this.replace(/^\s+|\s+$/g, '');
		};
	}
	if (!String.prototype.trimLeft) {
		String.prototype.trimLeft = function(){
			return this.replace(/^\s+/g, '');
		};
	}
	if (!String.prototype.trimRight) {
		String.prototype.trimRight = function(){
			return this.replace(/\s+$/g, '');
		};
	}

	return {};
});

/**
 * @license RequireJS i18n 2.0.2 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/i18n for details
 */
/*jslint regexp: true */
/*global require: false, navigator: false, define: false */

/**
 * This plugin handles i18n! prefixed modules. It does the following:
 *
 * 1) A regular module can have a dependency on an i18n bundle, but the regular
 * module does not want to specify what locale to load. So it just specifies
 * the top-level bundle, like "i18n!nls/colors".
 *
 * This plugin will load the i18n bundle at nls/colors, see that it is a root/master
 * bundle since it does not have a locale in its name. It will then try to find
 * the best match locale available in that master bundle, then request all the
 * locale pieces for that best match locale. For instance, if the locale is "en-us",
 * then the plugin will ask for the "en-us", "en" and "root" bundles to be loaded
 * (but only if they are specified on the master bundle).
 *
 * Once all the bundles for the locale pieces load, then it mixes in all those
 * locale pieces into each other, then finally sets the context.defined value
 * for the nls/colors bundle to be that mixed in locale.
 *
 * 2) A regular module specifies a specific locale to load. For instance,
 * i18n!nls/fr-fr/colors. In this case, the plugin needs to load the master bundle
 * first, at nls/colors, then figure out what the best match locale is for fr-fr,
 * since maybe only fr or just root is defined for that locale. Once that best
 * fit is found, all of its locale pieces need to have their bundles loaded.
 *
 * Once all the bundles for the locale pieces load, then it mixes in all those
 * locale pieces into each other, then finally sets the context.defined value
 * for the nls/fr-fr/colors bundle to be that mixed in locale.
 */
(function () {
    

    //regexp for reconstructing the master bundle name from parts of the regexp match
    //nlsRegExp.exec("foo/bar/baz/nls/en-ca/foo") gives:
    //["foo/bar/baz/nls/en-ca/foo", "foo/bar/baz/nls/", "/", "/", "en-ca", "foo"]
    //nlsRegExp.exec("foo/bar/baz/nls/foo") gives:
    //["foo/bar/baz/nls/foo", "foo/bar/baz/nls/", "/", "/", "foo", ""]
    //so, if match[5] is blank, it means this is the top bundle definition.
    var nlsRegExp = /(^.*(^|\/)nls(\/|$))([^\/]*)\/?([^\/]*)/;

    //Helper function to avoid repeating code. Lots of arguments in the
    //desire to stay functional and support RequireJS contexts without having
    //to know about the RequireJS contexts.
    function addPart(locale, master, needed, toLoad, prefix, suffix) {
        if (master[locale]) {
            needed.push(locale);
            if (master[locale] === true || master[locale] === 1) {
                toLoad.push(prefix + locale + '/' + suffix);
            }
        }
    }

    function addIfExists(req, locale, toLoad, prefix, suffix) {
        var fullName = prefix + locale + '/' + suffix;
        if (require._fileExists(req.toUrl(fullName + '.js'))) {
            toLoad.push(fullName);
        }
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     * This is not robust in IE for transferring methods that match
     * Object.prototype names, but the uses of mixin here seem unlikely to
     * trigger a problem related to that.
     */
    function mixin(target, source, force) {
        var prop;
        for (prop in source) {
            if (source.hasOwnProperty(prop) && (!target.hasOwnProperty(prop) || force)) {
                target[prop] = source[prop];
            } else if (typeof source[prop] === 'object') {
                mixin(target[prop], source[prop], force);
            }
        }
    }

    define('i18n',['module'], function (module) {
        var masterConfig = module.config ? module.config() : {};

        return {
            version: '2.0.1+',
            /**
             * Called when a dependency needs to be loaded.
             */
            load: function (name, req, onLoad, config) {
                config = config || {};

                if (config.locale) {
                    masterConfig.locale = config.locale;
                }

                var masterName,
                    match = nlsRegExp.exec(name),
                    prefix = match[1],
                    locale = match[4],
                    suffix = match[5],
                    parts = locale.split("-"),
                    toLoad = [],
                    value = {},
                    i, part, current = "";

                //If match[5] is blank, it means this is the top bundle definition,
                //so it does not have to be handled. Locale-specific requests
                //will have a match[4] value but no match[5]
                if (match[5]) {
                    //locale-specific bundle
                    prefix = match[1];
                    masterName = prefix + suffix;
                } else {
                    //Top-level bundle.
                    masterName = name;
                    suffix = match[4];
                    locale = masterConfig.locale;
                    if (!locale) {
                        locale = masterConfig.locale =
                            typeof navigator === "undefined" ? "root" :
                            (navigator.language ||
                             navigator.userLanguage || "root").toLowerCase();
                    }
                    parts = locale.split("-");
                }

                if (config.isBuild) {
                    //Check for existence of all locale possible files and
                    //require them if exist.
                    toLoad.push(masterName);
                    addIfExists(req, "root", toLoad, prefix, suffix);
                    for (i = 0; i < parts.length; i++) {
                        part = parts[i];
                        current += (current ? "-" : "") + part;
                        addIfExists(req, current, toLoad, prefix, suffix);
                    }

                    req(toLoad, function () {
                        onLoad();
                    });
                } else {
                    //First, fetch the master bundle, it knows what locales are available.
                    req([masterName], function (master) {
                        //Figure out the best fit
                        var needed = [],
                            part;

                        //Always allow for root, then do the rest of the locale parts.
                        addPart("root", master, needed, toLoad, prefix, suffix);
                        for (i = 0; i < parts.length; i++) {
                            part = parts[i];
                            current += (current ? "-" : "") + part;
                            addPart(current, master, needed, toLoad, prefix, suffix);
                        }

                        //Load all the parts missing.
                        req(toLoad, function () {
                            var i, partBundle, part;
                            for (i = needed.length - 1; i > -1 && needed[i]; i--) {
                                part = needed[i];
                                partBundle = master[part];
                                if (partBundle === true || partBundle === 1) {
                                    partBundle = req(prefix + part + '/' + suffix);
                                }
                                mixin(value, partBundle);
                            }

                            //All done, notify the loader.
                            onLoad(value);
                        });
                    });
                }
            }
        };
    });
}());

/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define */
define('orion/editor/i18n',{
	load: function(name, parentRequire, onLoad, config) {
		if (parentRequire.specified && parentRequire.specified("orion/bootstrap")) { //$NON-NLS-0$
			parentRequire(["orion/i18n!" + name], function(languages) { //$NON-NLS-0$
				onLoad(languages);
			});
		} else {
			onLoad({});
		}
	}
});

/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: 
 *		Felipe Heidrich (IBM Corporation) - initial API and implementation
 *		Silenio Quarti (IBM Corporation) - initial API and implementation
 ******************************************************************************/

//NLS_CHARSET=UTF-8

/*global define*/

define('orion/editor/nls/root/messages',{
	"multipleAnnotations": "Multiple annotations:", //$NON-NLS-1$ //$NON-NLS-0$
	"line": "Line: ${0}", //$NON-NLS-1$ //$NON-NLS-0$
	"breakpoint": "Breakpoint", //$NON-NLS-1$ //$NON-NLS-0$
	"bookmark": "Bookmark", //$NON-NLS-1$ //$NON-NLS-0$
	"task": "Task", //$NON-NLS-1$ //$NON-NLS-0$
	"error": "Error", //$NON-NLS-1$ //$NON-NLS-0$
	"warning": "Warning", //$NON-NLS-1$ //$NON-NLS-0$
	"matchingSearch": "Matching Search", //$NON-NLS-1$ //$NON-NLS-0$
	"currentSearch": "Current Search", //$NON-NLS-1$ //$NON-NLS-0$
	"currentLine": "Current Line", //$NON-NLS-1$ //$NON-NLS-0$
	"matchingBracket": "Matching Bracket", //$NON-NLS-1$ //$NON-NLS-0$
	"currentBracket": "Current Bracket", //$NON-NLS-1$ //$NON-NLS-0$
	
	"lineUp": "Line Up", //$NON-NLS-1$ //$NON-NLS-0$
	"lineDown": "Line Down", //$NON-NLS-1$ //$NON-NLS-0$
	"lineStart": "Line Start", //$NON-NLS-1$ //$NON-NLS-0$
	"lineEnd": "Line End", //$NON-NLS-1$ //$NON-NLS-0$
	"charPrevious": "Previous Character", //$NON-NLS-1$ //$NON-NLS-0$
	"charNext": "Next Character", //$NON-NLS-1$ //$NON-NLS-0$
	"pageUp": "Page Up", //$NON-NLS-1$ //$NON-NLS-0$
	"pageDown": "Page Down", //$NON-NLS-1$ //$NON-NLS-0$
	"scrollPageUp": "Scroll Page Up", //$NON-NLS-1$ //$NON-NLS-0$
	"scrollPageDown": "Scroll Page Down", //$NON-NLS-1$ //$NON-NLS-0$
	"scrollLineUp": "Scroll Line Up", //$NON-NLS-1$ //$NON-NLS-0$
	"scrollLineDown": "Scroll Line Down", //$NON-NLS-1$ //$NON-NLS-0$
	"wordPrevious": "Previous Word", //$NON-NLS-1$ //$NON-NLS-0$
	"wordNext": "Next Word", //$NON-NLS-1$ //$NON-NLS-0$
	"textStart": "Document Start", //$NON-NLS-1$ //$NON-NLS-0$
	"textEnd": "Document End", //$NON-NLS-1$ //$NON-NLS-0$
	"scrollTextStart": "Scroll Document Start", //$NON-NLS-1$ //$NON-NLS-0$
	"scrollTextEnd": "Scroll Document End", //$NON-NLS-1$ //$NON-NLS-0$
	"centerLine": "Center Line", //$NON-NLS-1$ //$NON-NLS-0$
	
	"selectLineUp": "Select Line Up", //$NON-NLS-1$ //$NON-NLS-0$
	"selectLineDown": "Select Line Down", //$NON-NLS-1$ //$NON-NLS-0$
	"selectWholeLineUp": " Select Whole Line Up", //$NON-NLS-1$ //$NON-NLS-0$
	"selectWholeLineDown": "Select Whole Line Down", //$NON-NLS-1$ //$NON-NLS-0$
	"selectLineStart": "Select Line Start", //$NON-NLS-1$ //$NON-NLS-0$
	"selectLineEnd": "Select Line End", //$NON-NLS-1$ //$NON-NLS-0$
	"selectCharPrevious": "Select Previous Character", //$NON-NLS-1$ //$NON-NLS-0$
	"selectCharNext": "Select Next Character", //$NON-NLS-1$ //$NON-NLS-0$
	"selectPageUp": "Select Page Up", //$NON-NLS-1$ //$NON-NLS-0$
	"selectPageDown": "Select Page Down", //$NON-NLS-1$ //$NON-NLS-0$
	"selectWordPrevious": "Select Previous Word", //$NON-NLS-1$ //$NON-NLS-0$
	"selectWordNext": "Select Next Word", //$NON-NLS-1$ //$NON-NLS-0$
	"selectTextStart": "Select Document Start", //$NON-NLS-1$ //$NON-NLS-0$
	"selectTextEnd": "Select Document End", //$NON-NLS-1$ //$NON-NLS-0$

	"deletePrevious": "Delete Previous Character", //$NON-NLS-1$ //$NON-NLS-0$
	"deleteNext": "Delete Next Character", //$NON-NLS-1$ //$NON-NLS-0$
	"deleteWordPrevious": "Delete Previous Word", //$NON-NLS-1$ //$NON-NLS-0$
	"deleteWordNext": "Delete Next Word", //$NON-NLS-1$ //$NON-NLS-0$
	"deleteLineStart": "Delete Line Start", //$NON-NLS-1$ //$NON-NLS-0$
	"deleteLineEnd": "Delete Line End", //$NON-NLS-1$ //$NON-NLS-0$
	"tab": "Insert Tab", //$NON-NLS-1$ //$NON-NLS-0$
	"enter": "Insert Line Delimiter", //$NON-NLS-1$ //$NON-NLS-0$
	"enterNoCursor": "Insert Line Delimiter", //$NON-NLS-1$ //$NON-NLS-0$
	"selectAll": "Select All", //$NON-NLS-1$ //$NON-NLS-0$
	"copy": "Copy", //$NON-NLS-1$ //$NON-NLS-0$
	"cut": "Cut", //$NON-NLS-1$ //$NON-NLS-0$
	"paste": "Paste", //$NON-NLS-1$ //$NON-NLS-0$
	
	"uppercase": "To Upper Case", //$NON-NLS-1$ //$NON-NLS-0$
	"lowercase": "To Lower Case", //$NON-NLS-1$ //$NON-NLS-0$
	"capitalize": "Capitalize", //$NON-NLS-1$ //$NON-NLS-0$
	"reversecase" : "Reverse Case", //$NON-NLS-1$ //$NON-NLS-0$
	
	"toggleWrapMode": "Toggle Wrap Mode", //$NON-NLS-1$ //$NON-NLS-0$
	"toggleTabMode": "Toggle Tab Mode", //$NON-NLS-1$ //$NON-NLS-0$
	"toggleOverwriteMode": "Toggle Overwrite Mode", //$NON-NLS-1$ //$NON-NLS-0$
	
	"committerOnTime": "${0} on ${1}", //$NON-NLS-1$ //$NON-NLS-0$
	
	//Emacs
	"emacs": "Emacs", //$NON-NLS-1$ //$NON-NLS-0$
	"exchangeMarkPoint": "Exchange Mark and Point", //$NON-NLS-1$ //$NON-NLS-0$
	"setMarkCommand": "Set Mark", //$NON-NLS-1$ //$NON-NLS-0$
	"clearMark": "Clear Mark", //$NON-NLS-1$ //$NON-NLS-0$
	"digitArgument": "Digit Argument ${0}", //$NON-NLS-1$ //$NON-NLS-0$
	"negativeArgument": "Negative Argument", //$NON-NLS-1$ //$NON-NLS-0$
			
	"Comment": "Comment", //$NON-NLS-1$ //$NON-NLS-0$
	"Flat outline": "Flat outline", //$NON-NLS-1$ //$NON-NLS-0$
	"incrementalFindStr": "Incremental find: ${0}", //$NON-NLS-1$ //$NON-NLS-0$
	"incrementalFindStrNotFound": "Incremental find: ${0} (not found)", //$NON-NLS-1$ //$NON-NLS-0$
	"incrementalFindReverseStr": "Reverse Incremental find: ${0}", //$NON-NLS-1$ //$NON-NLS-0$
	"incrementalFindReverseStrNotFound": "Reverse Incremental find: ${0} (not found)", //$NON-NLS-1$ //$NON-NLS-0$
	"find": "Find...", //$NON-NLS-1$ //$NON-NLS-0$
	"undo": "Undo", //$NON-NLS-1$ //$NON-NLS-0$
	"redo": "Redo", //$NON-NLS-1$ //$NON-NLS-0$
	"cancelMode": "Cancel Current Mode", //$NON-NLS-1$ //$NON-NLS-0$
	"findNext": "Find Next Occurrence", //$NON-NLS-1$ //$NON-NLS-0$
	"findPrevious": "Find Previous Occurrence", //$NON-NLS-1$ //$NON-NLS-0$
	"incrementalFind": "Incremental Find", //$NON-NLS-1$ //$NON-NLS-0$
	"incrementalFindReverse": "Incremental Find Reverse", //$NON-NLS-1$ //$NON-NLS-0$
	"indentLines": "Indent Lines", //$NON-NLS-1$ //$NON-NLS-0$
	"unindentLines": "Unindent Lines", //$NON-NLS-1$ //$NON-NLS-0$
	"moveLinesUp": "Move Lines Up", //$NON-NLS-1$ //$NON-NLS-0$
	"moveLinesDown": "Move Lines Down", //$NON-NLS-1$ //$NON-NLS-0$
	"copyLinesUp": "Copy Lines Up", //$NON-NLS-1$ //$NON-NLS-0$
	"copyLinesDown": "Copy Lines Down", //$NON-NLS-1$ //$NON-NLS-0$
	"deleteLines": "Delete Lines", //$NON-NLS-1$ //$NON-NLS-0$
	"gotoLine": "Goto Line...", //$NON-NLS-1$ //$NON-NLS-0$
	"gotoLinePrompty": "Goto Line:", //$NON-NLS-1$ //$NON-NLS-0$
	"nextAnnotation": "Next Annotation", //$NON-NLS-1$ //$NON-NLS-0$
	"prevAnnotation": "Previous Annotation", //$NON-NLS-1$ //$NON-NLS-0$
	"expand": "Expand", //$NON-NLS-1$ //$NON-NLS-0$
	"collapse": "Collapse", //$NON-NLS-1$ //$NON-NLS-0$
	"expandAll": "Expand All", //$NON-NLS-1$ //$NON-NLS-0$
	"collapseAll": "Collapse All", //$NON-NLS-1$ //$NON-NLS-0$
	"lastEdit": "Last Edit Location", //$NON-NLS-1$ //$NON-NLS-0$
	"trimTrailingWhitespaces": "Trim Trailing Whitespaces", //$NON-NLS-1$ //$NON-NLS-0$
	"toggleLineComment": "Toggle Line Comment", //$NON-NLS-1$ //$NON-NLS-0$
	"addBlockComment": "Add Block Comment", //$NON-NLS-1$ //$NON-NLS-0$
	"removeBlockComment": "Remove Block Comment", //$NON-NLS-1$ //$NON-NLS-0$
	"linkedModeEntered": "Linked Mode entered", //$NON-NLS-1$ //$NON-NLS-0$
	"linkedModeExited": "Linked Mode exited", //$NON-NLS-1$ //$NON-NLS-0$
	"syntaxError": "Syntax Error", //$NON-NLS-1$ //$NON-NLS-0$
	"contentAssist": "Content Assist", //$NON-NLS-1$ //$NON-NLS-0$
	"lineColumn": "Line ${0} : Col ${1}", //$NON-NLS-1$ //$NON-NLS-0$
	
	//vi
	"vi": "vi", //$NON-NLS-1$ //$NON-NLS-0$
	"vimove": "(Move)", //$NON-NLS-1$ //$NON-NLS-0$
	"viyank": "(Yank)", //$NON-NLS-1$ //$NON-NLS-0$
	"videlete": "(Delete)", //$NON-NLS-1$ //$NON-NLS-0$
	"vichange": "(Change)", //$NON-NLS-1$ //$NON-NLS-0$
	"viLeft": "${0} Left", //$NON-NLS-1$ //$NON-NLS-0$
	"viRight": "${0} Right", //$NON-NLS-1$ //$NON-NLS-0$
	"viUp": "${0} Up", //$NON-NLS-1$ //$NON-NLS-0$
	"viDown": "${0} Down", //$NON-NLS-1$ //$NON-NLS-0$
	"viw": "${0} Next Word", //$NON-NLS-1$ //$NON-NLS-0$
	"vib": "${0} Beginning of Word", //$NON-NLS-1$ //$NON-NLS-0$
	"viW": "${0} Next Word (ws stop)", //$NON-NLS-1$ //$NON-NLS-0$
	"viB": "${0} Beginning of Word (ws stop)", //$NON-NLS-1$ //$NON-NLS-0$
	"vie": "${0} End of Word", //$NON-NLS-1$ //$NON-NLS-0$
	"viE": "${0} End of Word (ws stop)", //$NON-NLS-1$ //$NON-NLS-0$
	"vi$": "${0} End of the line", //$NON-NLS-1$ //$NON-NLS-0$
	"vi^_": "${0} First non-blank Char Current Line", //$NON-NLS-1$ //$NON-NLS-0$
	"vi+": "${0} First Char Next Line", //$NON-NLS-1$ //$NON-NLS-0$
	"vi-": "${0} First Char Previous Line", //$NON-NLS-1$ //$NON-NLS-0$
	"vi|": "${0} nth Column in Line", //$NON-NLS-1$ //$NON-NLS-0$
	"viH": "${0} Top of Page", //$NON-NLS-1$ //$NON-NLS-0$
	"viM": "${0} Middle of Page", //$NON-NLS-1$ //$NON-NLS-0$
	"viL": "${0} Bottom of Page", //$NON-NLS-1$ //$NON-NLS-0$
	"vi/": "${0} Search Forward", //$NON-NLS-1$ //$NON-NLS-0$
	"vi?": "${0} Search Backward", //$NON-NLS-1$ //$NON-NLS-0$
	"vin": "${0} Next Search", //$NON-NLS-1$ //$NON-NLS-0$
	"viN": "${0} Previous Search", //$NON-NLS-1$ //$NON-NLS-0$
	"vif": "${0} Search Char Fwd", //$NON-NLS-1$ //$NON-NLS-0$
	"viF": "${0} Search Char Bckwd", //$NON-NLS-1$ //$NON-NLS-0$
	"vit": "${0} Search Before Char Fwd", //$NON-NLS-1$ //$NON-NLS-0$
	"viT": "${0} Search Before Char Bckwd", //$NON-NLS-1$ //$NON-NLS-0$
	"vi,": "${0} Repeat Reverse Char Search", //$NON-NLS-1$ //$NON-NLS-0$
	"vi;": "${0} Repeat Char Search", //$NON-NLS-1$ //$NON-NLS-0$
	"viG": "${0} Go to Line", //$NON-NLS-1$ //$NON-NLS-0$
	"viycd": "${0} Current Line", //$NON-NLS-1$ //$NON-NLS-0$
	"via": "Append After Cursor", //$NON-NLS-1$ //$NON-NLS-0$
	"viA": "Append to End of Line", //$NON-NLS-1$ //$NON-NLS-0$
	"vii": "Insert Before Cursor", //$NON-NLS-1$ //$NON-NLS-0$
	"viI": "Insert at Beginning of Line", //$NON-NLS-1$ //$NON-NLS-0$
	"viO": "Insert Line Above", //$NON-NLS-1$ //$NON-NLS-0$
	"vio": "Insert Line Below", //$NON-NLS-1$ //$NON-NLS-0$
	"viR": "Begin Overwriting Text", //$NON-NLS-1$ //$NON-NLS-0$
	"vis": "Substitute a Character", //$NON-NLS-1$ //$NON-NLS-0$
	"viS": "Substitute Entire Line", //$NON-NLS-1$ //$NON-NLS-0$
	"viC": "Change Text Until Line End", //$NON-NLS-1$ //$NON-NLS-0$
	"vip": "Paste After Char or Line", //$NON-NLS-1$ //$NON-NLS-0$
	"viP": "Paste Before Char or Line", //$NON-NLS-1$ //$NON-NLS-0$
	"viStar": "Search Word Under Cursor", //$NON-NLS-1$ //$NON-NLS-0$


	"replaceAll": "Replacing all...", //$NON-NLS-1$ //$NON-NLS-0$
	"replacedMatches": "Replaced ${0} matches", //$NON-NLS-1$ //$NON-NLS-0$
	"nothingReplaced": "Nothing replaced", //$NON-NLS-1$ //$NON-NLS-0$
	"notFound": "Not found" //$NON-NLS-1$ //$NON-NLS-0$
});

/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: 
 *		Felipe Heidrich (IBM Corporation) - initial API and implementation
 *		Silenio Quarti (IBM Corporation) - initial API and implementation
 ******************************************************************************/

/*global define*/

define('orion/editor/nls/messages',['orion/editor/i18n!orion/editor/nls/messages', 'orion/editor/nls/root/messages'], function(bundle, root) {
	var result = {
		root: root
	};
	for (var key in bundle) {
		if (bundle.hasOwnProperty(key)) {
			if (typeof result[key] === 'undefined') {
				result[key] = bundle[key];
			}
		}
	}
	return result;
});

/*******************************************************************************
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: 
 *		Felipe Heidrich (IBM Corporation) - initial API and implementation
 *		Silenio Quarti (IBM Corporation) - initial API and implementation
 ******************************************************************************/
 
/*global define */
define("orion/editor/eventTarget", [], function() { //$NON-NLS-0$
	/** 
	 * Constructs a new EventTarget object.
	 * 
	 * @class 
	 * @name orion.editor.EventTarget
	 */
	function EventTarget() {
	}
	/**
	 * Adds in the event target interface into the specified object.
	 *
	 * @param {Object} object The object to add in the event target interface.
	 */
	EventTarget.addMixin = function(object) {
		var proto = EventTarget.prototype;
		for (var p in proto) {
			if (proto.hasOwnProperty(p)) {
				object[p] = proto[p];
			}
		}
	};
	EventTarget.prototype = /** @lends orion.editor.EventTarget.prototype */ {
		/**
		 * Adds an event listener to this event target.
		 * 
		 * @param {String} type The event type.
		 * @param {Function|EventListener} listener The function or the EventListener that will be executed when the event happens. 
		 * @param {Boolean} [useCapture=false] <code>true</code> if the listener should be trigged in the capture phase.
		 * 
		 * @see orion.editor.EventTarget#removeEventListener
		 */
		addEventListener: function(type, listener, useCapture) {
			if (!this._eventTypes) { this._eventTypes = {}; }
			var state = this._eventTypes[type];
			if (!state) {
				state = this._eventTypes[type] = {level: 0, listeners: []};
			}
			var listeners = state.listeners;
			listeners.push({listener: listener, useCapture: useCapture});
		},
		/**
		 * Dispatches the given event to the listeners added to this event target.
		 * @param {Event} evt The event to dispatch.
		 */
		dispatchEvent: function(evt) {
			var type = evt.type;
			this._dispatchEvent("pre" + type, evt); //$NON-NLS-0$
			this._dispatchEvent(type, evt);
			this._dispatchEvent("post" + type, evt); //$NON-NLS-0$
		},
		_dispatchEvent: function(type, evt) {
			var state = this._eventTypes ? this._eventTypes[type] : null;
			if (state) {
				var listeners = state.listeners;
				try {
					state.level++;
					if (listeners) {
						for (var i=0, len=listeners.length; i < len; i++) {
							if (listeners[i]) {
								var l = listeners[i].listener;
								if (typeof l === "function") { //$NON-NLS-0$
									l.call(this, evt);
								} else if (l.handleEvent && typeof l.handleEvent === "function") { //$NON-NLS-0$
									l.handleEvent(evt);
								}
							}
						}
					}
				} finally {
					state.level--;
					if (state.compact && state.level === 0) {
						for (var j=listeners.length - 1; j >= 0; j--) {
							if (!listeners[j]) {
								listeners.splice(j, 1);
							}
						}
						if (listeners.length === 0) {
							delete this._eventTypes[type];
						}
						state.compact = false;
					}
				}
			}
		},
		/**
		 * Returns whether there is a listener for the specified event type.
		 * 
		 * @param {String} type The event type
		 * 
		 * @see orion.editor.EventTarget#addEventListener
		 * @see orion.editor.EventTarget#removeEventListener
		 */
		isListening: function(type) {
			if (!this._eventTypes) { return false; }
			return this._eventTypes[type] !== undefined;
		},		
		/**
		 * Removes an event listener from the event target.
		 * <p>
		 * All the parameters must be the same ones used to add the listener.
		 * </p>
		 * 
		 * @param {String} type The event type
		 * @param {Function|EventListener} listener The function or the EventListener that will be executed when the event happens. 
		 * @param {Boolean} [useCapture=false] <code>true</code> if the listener should be trigged in the capture phase.
		 * 
		 * @see orion.editor.EventTarget#addEventListener
		 */
		removeEventListener: function(type, listener, useCapture){
			if (!this._eventTypes) { return; }
			var state = this._eventTypes[type];
			if (state) {
				var listeners = state.listeners;
				for (var i=0, len=listeners.length; i < len; i++) {
					var l = listeners[i];
					if (l && l.listener === listener && l.useCapture === useCapture) {
						if (state.level !== 0) {
							listeners[i] = null;
							state.compact = true;
						} else {
							listeners.splice(i, 1);
						}
						break;
					}
				}
				if (listeners.length === 0) {
					delete this._eventTypes[type];
				}
			}
		}
	};
	return {EventTarget: EventTarget};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define */
/*jslint browser:true regexp:false*/
/**
 * @name orion.regex
 * @class Utilities for dealing with regular expressions.
 * @description Utilities for dealing with regular expressions.
 */
define("orion/regex", [], function() { //$NON-NLS-0$
	/**
	 * @memberOf orion.regex
	 * @function
	 * @static
	 * @description Escapes regex special characters in the input string.
	 * @param {String} str The string to escape.
	 * @returns {String} A copy of <code>str</code> with regex special characters escaped.
	 */
	function escape(str) {
		return str.replace(/([\\$\^*\/+?\.\(\)|{}\[\]])/g, "\\$&"); //$NON-NLS-0$
	}

	/**
	 * @memberOf orion.regex
	 * @function
	 * @static
	 * @description Parses a pattern and flags out of a regex literal string.
	 * @param {String} str The string to parse. Should look something like <code>"/ab+c/"</code> or <code>"/ab+c/i"</code>.
	 * @returns {Object} If <code>str</code> looks like a regex literal, returns an object with properties
	 * <code><dl>
	 * <dt>pattern</dt><dd>{String}</dd>
	 * <dt>flags</dt><dd>{String}</dd>
	 * </dl></code> otherwise returns <code>null</code>.
	 */
	function parse(str) {
		var regexp = /^\s*\/(.+)\/([gim]{0,3})\s*$/.exec(str);
		if (regexp) {
			return {
				pattern : regexp[1],
				flags : regexp[2]
			};
		}
		return null;
	}

	return {
		escape: escape,
		parse: parse
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/

/*global define navigator document*/
define('orion/util',[],function() {

	var userAgent = navigator.userAgent;
	var isIE = (userAgent.indexOf("MSIE") !== -1 || userAgent.indexOf("Trident") !== -1) ? document.documentMode : undefined; //$NON-NLS-1$ //$NON-NLS-0$
	var isFirefox = parseFloat(userAgent.split("Firefox/")[1] || userAgent.split("Minefield/")[1]) || undefined; //$NON-NLS-1$ //$NON-NLS-0$
	var isOpera = userAgent.indexOf("Opera") !== -1 ? parseFloat(userAgent.split("Version/")[1]) : undefined; //$NON-NLS-0$
	var isChrome = parseFloat(userAgent.split("Chrome/")[1]) || undefined; //$NON-NLS-0$
	var isSafari = userAgent.indexOf("Safari") !== -1 && !isChrome; //$NON-NLS-0$
	var isWebkit = parseFloat(userAgent.split("WebKit/")[1]) || undefined; //$NON-NLS-0$
	var isAndroid = userAgent.indexOf("Android") !== -1; //$NON-NLS-0$
	var isIPad = userAgent.indexOf("iPad") !== -1; //$NON-NLS-0$
	var isIPhone = userAgent.indexOf("iPhone") !== -1; //$NON-NLS-0$
	var isIOS = isIPad || isIPhone;
	var isMac = navigator.platform.indexOf("Mac") !== -1; //$NON-NLS-0$
	var isWindows = navigator.platform.indexOf("Win") !== -1; //$NON-NLS-0$
	var isLinux = navigator.platform.indexOf("Linux") !== -1; //$NON-NLS-0$
	var isTouch = "ontouchstart" in document.createElement("input"); //$NON-NLS-1$ //$NON-NLS-0$
	
	var platformDelimiter = isWindows ? "\r\n" : "\n"; //$NON-NLS-1$ //$NON-NLS-0$

	function formatMessage(msg) {
		var args = arguments;
		return msg.replace(/\$\{([^\}]+)\}/g, function(str, index) { return args[(index << 0) + 1]; });
	}
	
	var XHTML = "http://www.w3.org/1999/xhtml"; //$NON-NLS-0$
	function createElement(document, tagName) {
		if (document.createElementNS) {
			return document.createElementNS(XHTML, tagName);
		}
		return document.createElement(tagName);
	}

	return {
		formatMessage: formatMessage,
		
		createElement: createElement,
		
		/** Browsers */
		isIE: isIE,
		isFirefox: isFirefox,
		isOpera: isOpera,
		isChrome: isChrome,
		isSafari: isSafari,
		isWebkit: isWebkit,
		isAndroid: isAndroid,
		isIPad: isIPad,
		isIPhone: isIPhone,
		isIOS: isIOS,
		
		/** OSs */
		isMac: isMac,
		isWindows: isWindows,
		isLinux: isLinux,

		/** Capabilities */
		isTouch: isTouch,

		platformDelimiter: platformDelimiter
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: 
 *		Felipe Heidrich (IBM Corporation) - initial API and implementation
 *		Silenio Quarti (IBM Corporation) - initial API and implementation
 ******************************************************************************/
 
/*global define*/

define("orion/editor/textModel", ['orion/editor/eventTarget', 'orion/regex', 'orion/util'], function(mEventTarget, mRegex, util) { //$NON-NLS-2$  //$NON-NLS-1$ //$NON-NLS-0$

	/**
	 * Constructs a new TextModel with the given text and default line delimiter.
	 *
	 * @param {String} [text=""] the text that the model will store
	 * @param {String} [lineDelimiter=platform delimiter] the line delimiter used when inserting new lines to the model.
	 *
	 * @name orion.editor.TextModel
	 * @class The TextModel is an interface that provides text for the view. Applications may
	 * implement the TextModel interface to provide a custom store for the view content. The
	 * view interacts with its text model in order to access and update the text that is being
	 * displayed and edited in the view. This is the default implementation.
	 * <p>
	 * <b>See:</b><br/>
	 * {@link orion.editor.TextView}<br/>
	 * {@link orion.editor.TextView#setModel}
	 * </p>
	 * @borrows orion.editor.EventTarget#addEventListener as #addEventListener
	 * @borrows orion.editor.EventTarget#removeEventListener as #removeEventListener
	 * @borrows orion.editor.EventTarget#dispatchEvent as #dispatchEvent
	 */
	function TextModel(text, lineDelimiter) {
		this._lastLineIndex = -1;
		this._text = [""];
		this._lineOffsets = [0];
		this.setText(text);
		this.setLineDelimiter(lineDelimiter);
	}

	TextModel.prototype = /** @lends orion.editor.TextModel.prototype */ {
		/**
		 * Destroys this text model.
		 */
		destroy: function() {
		},
		/**
		 * @class This object describes the options to use while finding occurrences of a string in a text model.
		 * @name orion.editor.FindOptions
		 *
		 * @property {String} string the search string to be found.
		 * @property {Boolean} [regex=false] whether or not the search string is a regular expression.
		 * @property {Boolean} [wrap=false] whether or not to wrap search.
		 * @property {Boolean} [wholeWord=false] whether or not to search only whole words.
		 * @property {Boolean} [caseInsensitive=false] whether or not search is case insensitive.
		 * @property {Boolean} [reverse=false] whether or not to search backwards.
		 * @property {Number} [start=0] The start offset to start searching
		 * @property {Number} [end=charCount] The end offset of the search. Used to search in a given range.
		 */
		/**
		 * @class This object represents a find occurrences iterator.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.TextModel#find}<br/>
		 * </p>		 
		 * @name orion.editor.FindIterator
		 * 
		 * @property {Function} hasNext Determines whether there are more occurrences in the iterator.
		 * @property {Function} next Returns the next matched range {start,end} in the iterator.
		 */	
		/**
		 * Finds occurrences of a string in the text model.
		 *
		 * @param {orion.editor.FindOptions} options the search options
		 * @return {orion.editor.FindIterator} the find occurrences iterator.
		 */
		find: function(options) {
			if (this._text.length > 1) {
				this._text = [this._text.join("")];
			}
			var string = options.string;
			var regex = options.regex;
			var pattern = string;
			var flags = "";
			var caseInsensitive = options.caseInsensitive;
			if (pattern) {
				if (regex) {
					var parsed = mRegex.parse(pattern);
					if (parsed) {
						pattern = parsed.pattern;
						flags = parsed.flags;
					}
				} else {
					pattern = string.replace(/([\\$\^*\/+?\.\(\)|{}\[\]])/g, "\\$&"); //$NON-NLS-0$
					/*
					* Bug in JS RegEx. In a Turkish locale, dotless i (u0131) capitalizes to I (u0049) and i (u0069) 
					* capitalizes to dot I (u0130). The JS RegEx does not match correctly the Turkish i's in case
					* insensitive mode. The fix is to detect the presence of Turkish i's in the search pattern and 
					* to modify the pattern to search for both upper and lower case.
					*/
					if (caseInsensitive) {  //$NON-NLS-1$ //$NON-NLS-0$
						pattern = pattern.replace(/[iI\u0130\u0131]/g, "[Ii\u0130\u0131]"); //$NON-NLS-0$
					}
				}
			}
			var current = null, skip;
			if (pattern) {
				var reverse = options.reverse;
				var wrap = options.wrap;
				var wholeWord = options.wholeWord;
				var start = options.start || 0;
				var end = options.end;
				var isRange = (end !== null && end !== undefined);
				if (flags.indexOf("g") === -1) { flags += "g"; } //$NON-NLS-1$ //$NON-NLS-0$
				if (flags.indexOf("m") === -1) { flags += "m"; } //$NON-NLS-1$ //$NON-NLS-0$
				if (caseInsensitive) {
					if (flags.indexOf("i") === -1) { flags += "i"; } //$NON-NLS-1$ //$NON-NLS-0$
				}
				if (wholeWord) {
					pattern = "\\b" + pattern + "\\b"; //$NON-NLS-1$ //$NON-NLS-0$
				}
				var text = this._text[0], result, lastIndex, offset = 0;
				if (isRange) {
					var s = start < end ? start : end;
					var e = start < end ? end : start;
					text = text.substring(s, e);
					offset = s;
				}
				var re = new RegExp(pattern, flags);
				if (reverse) {
					skip = function() {
						var match = null;
						re.lastIndex = 0;
						while (true) {
							lastIndex = re.lastIndex;
							result = re.exec(text);
							if (lastIndex === re.lastIndex) {
								return null;
							}
							if (result) {
								if (result.index + offset < start) {
									match = {start: result.index + offset, end: re.lastIndex + offset};
								} else {
									if (!wrap || match) {
										break;
									}
									start = text.length + offset;
									match = {start: result.index + offset, end: re.lastIndex + offset};
								}
							} else {
								break;
							}
						}
						if (match) { start = match.start; }
						return match;
					};
				} else {
					if (!isRange) {
						re.lastIndex = start;
					}
					skip = function() {
						while (true) {
							lastIndex = re.lastIndex;
							result = re.exec(text);
							if (lastIndex === re.lastIndex) {
								return null;
							}
							if (result) {
								return {start: result.index + offset, end: re.lastIndex + offset};
							}
							if (lastIndex !== 0) {
								if (wrap) {
									continue;
								}
							}
							break;
						}
						return null;
					};
				}
				current = skip();
			}
			return {
				next: function() {
					var result = current;
					if (result) { current = skip(); }
					return result;					
				},
				hasNext: function() {
					return current !== null;
				}
			};
		},
		/**
		 * Returns the number of characters in the model.
		 *
		 * @returns {Number} the number of characters in the model.
		 */
		getCharCount: function() {
			var count = 0;
			for (var i = 0; i<this._text.length; i++) {
				count += this._text[i].length;
			}
			return count;
		},
		/**
		 * Returns the text of the line at the given index.
		 * <p>
		 * The valid indices are 0 to line count exclusive.  Returns <code>null</code> 
		 * if the index is out of range. 
		 * </p>
		 *
		 * @param {Number} lineIndex the zero based index of the line.
		 * @param {Boolean} [includeDelimiter=false] whether or not to include the line delimiter. 
		 * @returns {String} the line text or <code>null</code> if out of range.
		 *
		 * @see orion.editor.TextModel#getLineAtOffset
		 */
		getLine: function(lineIndex, includeDelimiter) {
			var lineCount = this.getLineCount();
			if (!(0 <= lineIndex && lineIndex < lineCount)) {
				return null;
			}
			var start = this._lineOffsets[lineIndex];
			if (lineIndex + 1 < lineCount) {
				var text = this.getText(start, this._lineOffsets[lineIndex + 1]);
				if (includeDelimiter) {
					return text;
				}
				var end = text.length, c;
				while (((c = text.charCodeAt(end - 1)) === 10) || (c === 13)) {
					end--;
				}
				return text.substring(0, end);
			} else {
				return this.getText(start); 
			}
		},
		/**
		 * Returns the line index at the given character offset.
		 * <p>
		 * The valid offsets are 0 to char count inclusive. The line index for
		 * char count is <code>line count - 1</code>. Returns <code>-1</code> if
		 * the offset is out of range.
		 * </p>
		 *
		 * @param {Number} offset a character offset.
		 * @returns {Number} the zero based line index or <code>-1</code> if out of range.
		 */
		getLineAtOffset: function(offset) {
			var charCount = this.getCharCount();
			if (!(0 <= offset && offset <= charCount)) {
				return -1;
			}
			var lineCount = this.getLineCount();
			if (offset === charCount) {
				return lineCount - 1; 
			}
			var lineStart, lineEnd;
			var index = this._lastLineIndex;
			if (0 <= index && index < lineCount) {
				lineStart = this._lineOffsets[index];
				lineEnd = index + 1 < lineCount ? this._lineOffsets[index + 1] : charCount;
				if (lineStart <= offset && offset < lineEnd) {
					return index;
				}
			}
			var high = lineCount;
			var low = -1;
			while (high - low > 1) {
				index = Math.floor((high + low) / 2);
				lineStart = this._lineOffsets[index];
				lineEnd = index + 1 < lineCount ? this._lineOffsets[index + 1] : charCount;
				if (offset <= lineStart) {
					high = index;
				} else if (offset < lineEnd) {
					high = index;
					break;
				} else {
					low = index;
				}
			}
			this._lastLineIndex = high;
			return high;
		},
		/**
		 * Returns the number of lines in the model.
		 * <p>
		 * The model always has at least one line.
		 * </p>
		 *
		 * @returns {Number} the number of lines.
		 */
		getLineCount: function() {
			return this._lineOffsets.length;
		},
		/**
		 * Returns the line delimiter that is used by the view
		 * when inserting new lines. New lines entered using key strokes 
		 * and paste operations use this line delimiter.
		 *
		 * @return {String} the line delimiter that is used by the view when inserting new lines.
		 */
		getLineDelimiter: function() {
			return this._lineDelimiter;
		},
		/**
		 * Returns the end character offset for the given line. 
		 * <p>
		 * The end offset is not inclusive. This means that when the line delimiter is included, the 
		 * offset is either the start offset of the next line or char count. When the line delimiter is
		 * not included, the offset is the offset of the line delimiter.
		 * </p>
		 * <p>
		 * The valid indices are 0 to line count exclusive.  Returns <code>-1</code> 
		 * if the index is out of range. 
		 * </p>
		 *
		 * @param {Number} lineIndex the zero based index of the line.
		 * @param {Boolean} [includeDelimiter=false] whether or not to include the line delimiter. 
		 * @return {Number} the line end offset or <code>-1</code> if out of range.
		 *
		 * @see orion.editor.TextModel#getLineStart
		 */
		getLineEnd: function(lineIndex, includeDelimiter) {
			var lineCount = this.getLineCount();
			if (!(0 <= lineIndex && lineIndex < lineCount)) {
				return -1;
			}
			if (lineIndex + 1 < lineCount) {
				var end = this._lineOffsets[lineIndex + 1];
				if (includeDelimiter) {
					return end;
				}
				var text = this.getText(Math.max(this._lineOffsets[lineIndex], end - 2), end);
				var i = text.length, c;
				while (((c = text.charCodeAt(i - 1)) === 10) || (c === 13)) {
					i--;
				}
				return end - (text.length - i);
			} else {
				return this.getCharCount();
			}
		},
		/**
		 * Returns the start character offset for the given line.
		 * <p>
		 * The valid indices are 0 to line count exclusive.  Returns <code>-1</code> 
		 * if the index is out of range. 
		 * </p>
		 *
		 * @param {Number} lineIndex the zero based index of the line.
		 * @return {Number} the line start offset or <code>-1</code> if out of range.
		 *
		 * @see orion.editor.TextModel#getLineEnd
		 */
		getLineStart: function(lineIndex) {
			if (!(0 <= lineIndex && lineIndex < this.getLineCount())) {
				return -1;
			}
			return this._lineOffsets[lineIndex];
		},
		/**
		 * Returns the text for the given range.
		 * <p>
		 * The end offset is not inclusive. This means that character at the end offset
		 * is not included in the returned text.
		 * </p>
		 *
		 * @param {Number} [start=0] the zero based start offset of text range.
		 * @param {Number} [end=char count] the zero based end offset of text range.
		 *
		 * @see orion.editor.TextModel#setText
		 */
		getText: function(start, end) {
			if (start === undefined) { start = 0; }
			if (end === undefined) { end = this.getCharCount(); }
			if (start === end) { return ""; }
			var offset = 0, chunk = 0, length;
			while (chunk<this._text.length) {
				length = this._text[chunk].length; 
				if (start <= offset + length) { break; }
				offset += length;
				chunk++;
			}
			var firstOffset = offset;
			var firstChunk = chunk;
			while (chunk<this._text.length) {
				length = this._text[chunk].length; 
				if (end <= offset + length) { break; }
				offset += length;
				chunk++;
			}
			var lastOffset = offset;
			var lastChunk = chunk;
			if (firstChunk === lastChunk) {
				return this._text[firstChunk].substring(start - firstOffset, end - lastOffset);
			}
			var beforeText = this._text[firstChunk].substring(start - firstOffset);
			var afterText = this._text[lastChunk].substring(0, end - lastOffset);
			return beforeText + this._text.slice(firstChunk+1, lastChunk).join("") + afterText; 
		},
		/**
		 * Notifies all listeners that the text is about to change.
		 * <p>
		 * This notification is intended to be used only by the view. Application clients should
		 * use {@link orion.editor.TextView#event:onModelChanging}.
		 * </p>
		 * <p>
		 * NOTE: This method is not meant to called directly by application code. It is called internally by the TextModel
		 * as part of the implementation of {@link #setText}. This method is included in the public API for documentation
		 * purposes and to allow integration with other toolkit frameworks.
		 * </p>
		 *
		 * @param {orion.editor.ModelChangingEvent} modelChangingEvent the changing event
		 */
		onChanging: function(modelChangingEvent) {
			return this.dispatchEvent(modelChangingEvent);
		},
		/**
		 * Notifies all listeners that the text has changed.
		 * <p>
		 * This notification is intended to be used only by the view. Application clients should
		 * use {@link orion.editor.TextView#event:onModelChanged}.
		 * </p>
		 * <p>
		 * NOTE: This method is not meant to called directly by application code. It is called internally by the TextModel
		 * as part of the implementation of {@link #setText}. This method is included in the public API for documentation
		 * purposes and to allow integration with other toolkit frameworks.
		 * </p>
		 *
		 * @param {orion.editor.ModelChangedEvent} modelChangedEvent the changed event
		 */
		onChanged: function(modelChangedEvent) {
			return this.dispatchEvent(modelChangedEvent);
		},
		/**
		 * Sets the line delimiter that is used by the view
		 * when new lines are inserted in the model due to key
		 * strokes and paste operations. The line delimiter of
		 * existing lines are unchanged unless the to <code>all</code>
		 * argument is <code>true</code>.
		 * <p>
		 * If lineDelimiter is "auto", the delimiter is computed to be
		 * the first delimiter found in the current text. If lineDelimiter
		 * is undefined or if there are no delimiters in the current text, the
		 * platform delimiter is used.
		 * </p>
		 *
		 * @param {String} lineDelimiter the line delimiter that is used by the view when inserting new lines.
		 * @param {Boolean} [all=false] whether or not the delimiter of existing lines are changed.
		 */
		setLineDelimiter: function(lineDelimiter, all) {
			if (lineDelimiter === "auto") { //$NON-NLS-0$
				lineDelimiter = undefined;
				if (this.getLineCount() > 1) {
					lineDelimiter = this.getText(this.getLineEnd(0), this.getLineEnd(0, true));
				}
			}
			this._lineDelimiter = lineDelimiter ? lineDelimiter : util.platformDelimiter;
			if (all) {
				var lineCount = this.getLineCount();
				if (lineCount > 1) {
					var lines = new Array(lineCount);
					for (var i=0; i<lineCount; i++) {
						lines[i] = this.getLine(i);
					}
					this.setText(lines.join(this._lineDelimiter));
				}
			}
		},
		/**
		 * Replaces the text in the given range with the given text.
		 * <p>
		 * The end offset is not inclusive. This means that the character at the 
		 * end offset is not replaced.
		 * </p>
		 * <p>
		 * The text model must notify the listeners before and after the
		 * the text is changed by calling {@link #onChanging} and {@link #onChanged}
		 * respectively. 
		 * </p>
		 *
		 * @param {String} [text=""] the new text.
		 * @param {Number} [start=0] the zero based start offset of text range.
		 * @param {Number} [end=char count] the zero based end offset of text range.
		 *
		 * @see orion.editor.TextModel#getText
		 */
		setText: function(text, start, end) {
			if (text === undefined) { text = ""; }
			if (start === undefined) { start = 0; }
			if (end === undefined) { end = this.getCharCount(); }
			if (start === end && text === "") { return; }
			var startLine = this.getLineAtOffset(start);
			var endLine = this.getLineAtOffset(end);
			var eventStart = start;
			var removedCharCount = end - start;
			var removedLineCount = endLine - startLine;
			var addedCharCount = text.length;
			var addedLineCount = 0;
			var lineCount = this.getLineCount();
			
			var cr = 0, lf = 0, index = 0;
			var newLineOffsets = [];
			while (true) {
				if (cr !== -1 && cr <= index) { cr = text.indexOf("\r", index); } //$NON-NLS-0$
				if (lf !== -1 && lf <= index) { lf = text.indexOf("\n", index); } //$NON-NLS-0$
				if (lf === -1 && cr === -1) { break; }
				if (cr !== -1 && lf !== -1) {
					if (cr + 1 === lf) {
						index = lf + 1;
					} else {
						index = (cr < lf ? cr : lf) + 1;
					}
				} else if (cr !== -1) {
					index = cr + 1;
				} else {
					index = lf + 1;
				}
				newLineOffsets.push(start + index);
				addedLineCount++;
			}
		
			var modelChangingEvent = {
				type: "Changing", //$NON-NLS-0$
				text: text,
				start: eventStart,
				removedCharCount: removedCharCount,
				addedCharCount: addedCharCount,
				removedLineCount: removedLineCount,
				addedLineCount: addedLineCount
			};
			this.onChanging(modelChangingEvent);
			
			//TODO this should be done the loops below to avoid getText()
			if (newLineOffsets.length === 0) {
				var startLineOffset = this.getLineStart(startLine), endLineOffset;
				if (endLine + 1 < lineCount) {
					endLineOffset = this.getLineStart(endLine + 1);
				} else {
					endLineOffset = this.getCharCount();
				}
				if (start !== startLineOffset) {
					text = this.getText(startLineOffset, start) + text;
					start = startLineOffset;
				}
				if (end !== endLineOffset) {
					text = text + this.getText(end, endLineOffset);
					end = endLineOffset;
				}
			}
			
			var changeCount = addedCharCount - removedCharCount;
			for (var j = startLine + removedLineCount + 1; j < lineCount; j++) {
				this._lineOffsets[j] += changeCount;
			}
			
			/*
			* Feature in Chrome.  Chrome exceeds the maximum call stack when calling splice
			* around 62k arguments. The limit seems to be higher on IE (250K) and Firefox (450k).
			* The fix is to break the splice in junks of 50k.
			*/
			var SPLICE_LIMIT = 50000;
			var limit = SPLICE_LIMIT, args;
			if (newLineOffsets.length < limit) {
				args = [startLine + 1, removedLineCount].concat(newLineOffsets);
				Array.prototype.splice.apply(this._lineOffsets, args);
			} else {
				index = startLine + 1;
				this._lineOffsets.splice(index, removedLineCount);
				for (var k = 0; k < newLineOffsets.length; k += limit) {
					args = [index, 0].concat(newLineOffsets.slice(k, Math.min(newLineOffsets.length, k + limit)));
					Array.prototype.splice.apply(this._lineOffsets, args);
					index += limit;
				}
			}
			
			var offset = 0, chunk = 0, length;
			while (chunk<this._text.length) {
				length = this._text[chunk].length; 
				if (start <= offset + length) { break; }
				offset += length;
				chunk++;
			}
			var firstOffset = offset;
			var firstChunk = chunk;
			while (chunk<this._text.length) {
				length = this._text[chunk].length; 
				if (end <= offset + length) { break; }
				offset += length;
				chunk++;
			}
			var lastOffset = offset;
			var lastChunk = chunk;
			var firstText = this._text[firstChunk];
			var lastText = this._text[lastChunk];
			var beforeText = firstText.substring(0, start - firstOffset);
			var afterText = lastText.substring(end - lastOffset);
			var params = [firstChunk, lastChunk - firstChunk + 1];
			if (beforeText) { params.push(beforeText); }
			if (text) { params.push(text); }
			if (afterText) { params.push(afterText); }
			Array.prototype.splice.apply(this._text, params);
			if (this._text.length === 0) { this._text = [""]; }
			
			var modelChangedEvent = {
				type: "Changed", //$NON-NLS-0$
				start: eventStart,
				removedCharCount: removedCharCount,
				addedCharCount: addedCharCount,
				removedLineCount: removedLineCount,
				addedLineCount: addedLineCount
			};
			this.onChanged(modelChangedEvent);
		}
	};
	mEventTarget.EventTarget.addMixin(TextModel.prototype);
	
	return {TextModel: TextModel};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: 
 *		Felipe Heidrich (IBM Corporation) - initial API and implementation
 *		Silenio Quarti (IBM Corporation) - initial API and implementation
 ******************************************************************************/

/*global define */

define("orion/keyBinding", ['orion/util'], function(util) { //$NON-NLS-1$ //$NON-NLS-0$

    /**
	 * @class A KeyBinding is an interface used to define keyboard shortcuts.
	 * @name orion.KeyBinding
	 * 
	 * @property {Function} match The function to match events.
	 * @property {Function} equals The funtion to compare to key bindings.
	 *
	 * @see orion.KeyStroke
	 * @see orion.KeySequence
	 */

	/**
	 * Constructs a new key stroke with the given key code, modifiers and event type.
	 * 
	 * @param {String|Number} keyCode the key code.
	 * @param {Boolean} mod1 the primary modifier (usually Command on Mac and Control on other platforms).
	 * @param {Boolean} mod2 the secondary modifier (usually Shift).
	 * @param {Boolean} mod3 the third modifier (usually Alt).
	 * @param {Boolean} mod4 the fourth modifier (usually Control on the Mac).
	 * @param {String} type the type of event that the keybinding matches; either "keydown" or "keypress".
	 * 
	 * @class A KeyStroke represents of a key code and modifier state that can be triggered by the user using the keyboard.
	 * @name orion.KeyStroke
	 * 
	 * @property {String|Number} keyCode The key code.
	 * @property {Boolean} mod1 The primary modifier (usually Command on Mac and Control on other platforms).
	 * @property {Boolean} mod2 The secondary modifier (usually Shift).
	 * @property {Boolean} mod3 The third modifier (usually Alt).
	 * @property {Boolean} mod4 The fourth modifier (usually Control on the Mac).
	 * @property {String} [type=keydown] The type of event that the keybinding matches; either "keydown" or "keypress"
	 *
	 * @see orion.editor.TextView#setKeyBinding
	 */
	function KeyStroke (keyCode, mod1, mod2, mod3, mod4, type) {
		this.type = type || "keydown"; //$NON-NLS-0$
		if (typeof(keyCode) === "string" && this.type === "keydown") { //$NON-NLS-1$ //$NON-NLS-0$
			this.keyCode = keyCode.toUpperCase().charCodeAt(0);
		} else {
			this.keyCode = keyCode;
		}
		this.mod1 = mod1 !== undefined && mod1 !== null ? mod1 : false;
		this.mod2 = mod2 !== undefined && mod2 !== null ? mod2 : false;
		this.mod3 = mod3 !== undefined && mod3 !== null ? mod3 : false;
		this.mod4 = mod4 !== undefined && mod4 !== null ? mod4 : false;
	}
	KeyStroke.prototype = /** @lends orion.KeyStroke.prototype */ {
		getKeys: function() {
			return [this];
		},
		/**
		 * Determines either this key stroke matches the specifed event.  It can match either a
		 * a whole sequence of key events or a single key event at a specified index.
		 * <p>
		 * <code>KeyStroke</code> only matches single key events. <code>KeySequence</code> handles
		 * matching a sequence of events.
		 * </p>
		 * TODO explain this better
		 * 
		 * @param {DOMEvent|DOMEvent[]} e the key event or list of events to match.
		 * @param index the key event to match.
		 * @returns {Boolean} <code>true</code> whether the key binding matches the key event.
		 *
		 * @see orion.KeySequence#match
		 */
		match: function (e, index) {
			if (index !== undefined) {
				if (index !== 0) {
					return false;
				}
			} else {
				if (e instanceof Array) {
					if (e.length > 1) {
						return false;
					}
					e = e[0];
				}
			}
			if (e.type !== this.type) {
				return false;
			}
			if (this.keyCode === e.keyCode || this.keyCode === String.fromCharCode(util.isOpera ? e.which : (e.charCode !== undefined ? e.charCode : e.keyCode))) {
				var mod1 = util.isMac ? e.metaKey : e.ctrlKey;
				if (this.mod1 !== mod1) { return false; }
				if (this.type === "keydown") { //$NON-NLS-0$
					if (this.mod2 !== e.shiftKey) { return false; }
				}
				if (this.mod3 !== e.altKey) { return false; }
				if (util.isMac && this.mod4 !== e.ctrlKey) { return false; }
				return true;
			}
			return false;
		},
		/**
		 * Returns whether this key stroke is the same as the given parameter.
		 * 
		 * @param {orion.KeyBinding} kb the key binding to compare with.
		 * @returns {Boolean} whether or not the parameter and the receiver describe the same key binding.
		 */
		equals: function(kb) {
			if (!kb) { return false; }
			if (this.keyCode !== kb.keyCode) { return false; }
			if (this.mod1 !== kb.mod1) { return false; }
			if (this.mod2 !== kb.mod2) { return false; }
			if (this.mod3 !== kb.mod3) { return false; }
			if (this.mod4 !== kb.mod4) { return false; }
			if (this.type !== kb.type) { return false; }
			return true;
		} 
	};
	
	/**
	 * Constructs a new key sequence with the given key strokes.
	 * 
	 * @param {orion.KeyStroke[]} keys the key strokes for this sequence.
	 * 
	 * @class A KeySequence represents of a list of key codes and a modifiers state that can be triggered by the user using the keyboard.
	 * @name orion.KeySequence
	 * 
	 * @property {orion.KeyStroke[]} keys the list of key strokes.
	 *
	 * @see orion.editor.TextView#setKeyBinding
	 */
	function KeySequence (keys) {
		this.keys = keys;
	}
	KeySequence.prototype = /** @lends orion.KeySequence.prototype */ {
		getKeys: function() {
			return this.keys.slice(0);
		},
		match: function (e, index) {
			var keys = this.keys;
			if (index !== undefined) {
				if (index > keys.length) {
					return false;
				}
				if (keys[index].match(e)) {
					if (index === keys.length - 1) {
						return true;
					}
					return index + 1;
				}
				return false;
			} else {
				if (!(e instanceof Array)) {
					e = [e];
				}
				if (e.length > keys.length) {
					return false;
				}
				var i;
				for (i = 0; i < e.length; i++) {
					if (!keys[i].match(e[i])) {
						return false;
					}
				}
				if (i === keys.length) {
					return true;
				}
				return i;
			}
		},
		/**
		 * Returns whether this key sequence is the same as the given parameter.
		 * 
		 * @param {orion.KeyBinding|orion.KeySequence} kb the key binding to compare with.
		 * @returns {Boolean} whether or not the parameter and the receiver describe the same key binding.
		 */
		equals: function(kb) {
			if (!kb.keys) { return false; }
			if (kb.keys.length !== this.keys.length) { return false; }
			for (var i=0; i<kb.keys.length; i++) {
				if (!kb.keys[i].equals(this.keys[i])) { return false; }
			}
			return true;
		}	
	};
	
	return {
		KeyBinding: KeyStroke, // for backwards compatibility
		KeyStroke: KeyStroke,
		KeySequence: KeySequence
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
 
/*global define window */

define("orion/editor/keyModes", [ //$NON-NLS-0$
		"orion/keyBinding", //$NON-NLS-0$
		"orion/util" //$NON-NLS-0$
], function(mKeyBinding, util) {

	function KeyMode(view) {
		if (!view) {
			return;
		}
		this._view = view;
		this._keyBindings = this.createKeyBindings();
		this._keyBindingIndex = 0;
	}
	KeyMode.prototype = /** @lends orion.editor.KeyMode.prototype */ {
		createKeyBindings: function () {
			return [];
		},
		/**
		 * Returns all the key bindings associated to the given action ID.
		 *
		 * @param {String} actionID the action ID.
		 * @returns {orion.editor.KeyBinding[]} the array of key bindings associated to the given action ID.
		 *
		 * @see orion.editor.KeyModesetKeyBinding
		 * @see orion.editor.KeyModesetAction
		 */
		getKeyBindings: function (actionID) {
			var result = [];
			var keyBindings = this._keyBindings;
			for (var i = 0; i < keyBindings.length; i++) {
				if (keyBindings[i].actionID === actionID) {
					result.push(keyBindings[i].keyBinding);
				}
			}
			return result;
		},
		getView: function() {
			return this._view;
		},
		isActive: function () {
			return this._view.getKeyModes().indexOf(this) !== -1;
		},
		match: function(e) {
			if (e.type === "keydown") { //$NON-NLS-0$
				switch (e.keyCode) {
					case 16: /* Shift */
					case 17: /* Control */
					case 18: /* Alt */
					case 91: /* Command */
						return undefined;
				}
			}
			var keyBindingIndex = this._keyBindingIndex;
			var keyBindings = this._matchingKeyBindings || this._keyBindings;
			var matchingKeyBindings = [];
			for (var i = 0; i < keyBindings.length; i++) {
				var kb = keyBindings[i];
				var keyBinding = kb.keyBinding;
				var match = keyBinding.match(e, keyBindingIndex);
				if (match === true) {
					this._keyBindingIndex = 0;
					this._matchingKeyBindings = null;
					return kb.actionID;
				} else if (typeof match === "number") { //$NON-NLS-0$
					matchingKeyBindings.push(kb);
				}
			}
			if (matchingKeyBindings.length === 0) {
				this._keyBindingIndex = 0;
				this._matchingKeyBindings = null;
			} else {
				this._keyBindingIndex++;
				this._matchingKeyBindings = matchingKeyBindings;
				return "noop"; //$NON-NLS-0$
			}
			return undefined;
		},
		/**
		 * Associates a key binding with the given action ID. Any previous
		 * association with the specified key binding is overwriten. If the
		 * action ID is <code>null</code>, the association is removed.
		 * 
		 * @param {orion.editor.KeyBinding} keyBinding the key binding
		 * @param {String} actionID the action ID
		 */
		setKeyBinding: function(keyBinding, actionID) {
			var keyBindings = this._keyBindings;
			for (var i = 0; i < keyBindings.length; i++) {
				var kb = keyBindings[i]; 
				if (kb.keyBinding.equals(keyBinding)) {
					if (actionID) {
						kb.actionID = actionID;
					} else {
						if (kb.predefined) {
							kb.actionID = "noop"; //$NON-NLS-0$
						} else {
							keyBindings.splice(i, 1);
						}
					}
					return;
				}
			}
			if (actionID) {
				keyBindings.push({keyBinding: keyBinding, actionID: actionID});
			}
		},
		setView: function(view) {
			this._view = view;
		}
	};
	
	function DefaultKeyMode(view) {
		KeyMode.call(this, view);
	}
	DefaultKeyMode.prototype = new KeyMode();
	DefaultKeyMode.prototype.createKeyBindings = function () {
		var KeyBinding = mKeyBinding.KeyBinding;
		//no duplicate keybindings
		var bindings = [];

		// Cursor Navigation
		bindings.push({actionID: "lineUp",		keyBinding: new KeyBinding(38), predefined: true}); //$NON-NLS-0$
		bindings.push({actionID: "lineDown",	keyBinding: new KeyBinding(40), predefined: true}); //$NON-NLS-0$
		bindings.push({actionID: "charPrevious",	keyBinding: new KeyBinding(37), predefined: true}); //$NON-NLS-0$
		bindings.push({actionID: "charNext",	keyBinding: new KeyBinding(39), predefined: true}); //$NON-NLS-0$
		if (util.isMac) {
			bindings.push({actionID: "scrollPageUp",		keyBinding: new KeyBinding(33), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "scrollPageDown",	keyBinding: new KeyBinding(34), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "pageUp",		keyBinding: new KeyBinding(33, null, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "pageDown",	keyBinding: new KeyBinding(34, null, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "lineStart",	keyBinding: new KeyBinding(37, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "lineEnd",		keyBinding: new KeyBinding(39, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "wordPrevious",	keyBinding: new KeyBinding(37, null, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "wordNext",	keyBinding: new KeyBinding(39, null, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "scrollTextStart",	keyBinding: new KeyBinding(36), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "scrollTextEnd",		keyBinding: new KeyBinding(35), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "textStart",	keyBinding: new KeyBinding(38, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "textEnd",		keyBinding: new KeyBinding(40, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "scrollPageUp",	keyBinding: new KeyBinding(38, null, null, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "scrollPageDown",		keyBinding: new KeyBinding(40, null, null, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "lineStart",	keyBinding: new KeyBinding(37, null, null, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "lineEnd",		keyBinding: new KeyBinding(39, null, null, null, true), predefined: true}); //$NON-NLS-0$
			//TODO These two actions should be changed to paragraph start and paragraph end  when word wrap is implemented
			bindings.push({actionID: "lineStart",	keyBinding: new KeyBinding(38, null, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "lineEnd",		keyBinding: new KeyBinding(40, null, null, true), predefined: true}); //$NON-NLS-0$
		} else {
			bindings.push({actionID: "pageUp",		keyBinding: new KeyBinding(33), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "pageDown",	keyBinding: new KeyBinding(34), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "lineStart",	keyBinding: new KeyBinding(36), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "lineEnd",		keyBinding: new KeyBinding(35), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "wordPrevious",	keyBinding: new KeyBinding(37, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "wordNext",	keyBinding: new KeyBinding(39, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "textStart",	keyBinding: new KeyBinding(36, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "textEnd",		keyBinding: new KeyBinding(35, true), predefined: true}); //$NON-NLS-0$
		}
		if (util.isFirefox && util.isLinux) {
			bindings.push({actionID: "lineUp",		keyBinding: new KeyBinding(38, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "lineDown",	keyBinding: new KeyBinding(40, true), predefined: true}); //$NON-NLS-0$
		}
		if (util.isWindows) {
			bindings.push({actionID: "scrollLineUp",	keyBinding: new KeyBinding(38, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "scrollLineDown",	keyBinding: new KeyBinding(40, true), predefined: true}); //$NON-NLS-0$
		}

		// Select Cursor Navigation
		bindings.push({actionID: "selectLineUp",		keyBinding: new KeyBinding(38, null, true), predefined: true}); //$NON-NLS-0$
		bindings.push({actionID: "selectLineDown",		keyBinding: new KeyBinding(40, null, true), predefined: true}); //$NON-NLS-0$
		bindings.push({actionID: "selectCharPrevious",	keyBinding: new KeyBinding(37, null, true), predefined: true}); //$NON-NLS-0$
		bindings.push({actionID: "selectCharNext",		keyBinding: new KeyBinding(39, null, true), predefined: true}); //$NON-NLS-0$
		bindings.push({actionID: "selectPageUp",		keyBinding: new KeyBinding(33, null, true), predefined: true}); //$NON-NLS-0$
		bindings.push({actionID: "selectPageDown",		keyBinding: new KeyBinding(34, null, true), predefined: true}); //$NON-NLS-0$
		if (util.isMac) {
			bindings.push({actionID: "selectLineStart",	keyBinding: new KeyBinding(37, true, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectLineEnd",		keyBinding: new KeyBinding(39, true, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectWordPrevious",	keyBinding: new KeyBinding(37, null, true, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectWordNext",	keyBinding: new KeyBinding(39, null, true, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectTextStart",	keyBinding: new KeyBinding(36, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectTextEnd",		keyBinding: new KeyBinding(35, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectTextStart",	keyBinding: new KeyBinding(38, true, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectTextEnd",		keyBinding: new KeyBinding(40, true, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectLineStart",	keyBinding: new KeyBinding(37, null, true, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectLineEnd",		keyBinding: new KeyBinding(39, null, true, null, true), predefined: true}); //$NON-NLS-0$
			//TODO These two actions should be changed to select paragraph start and select paragraph end  when word wrap is implemented
			bindings.push({actionID: "selectLineStart",	keyBinding: new KeyBinding(38, null, true, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectLineEnd",		keyBinding: new KeyBinding(40, null, true, true), predefined: true}); //$NON-NLS-0$
		} else {
			if (util.isLinux) {
				bindings.push({actionID: "selectWholeLineUp",		keyBinding: new KeyBinding(38, true, true), predefined: true}); //$NON-NLS-0$
				bindings.push({actionID: "selectWholeLineDown",		keyBinding: new KeyBinding(40, true, true), predefined: true}); //$NON-NLS-0$
			}
			bindings.push({actionID: "selectLineStart",		keyBinding: new KeyBinding(36, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectLineEnd",		keyBinding: new KeyBinding(35, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectWordPrevious",	keyBinding: new KeyBinding(37, true, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectWordNext",		keyBinding: new KeyBinding(39, true, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectTextStart",		keyBinding: new KeyBinding(36, true, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "selectTextEnd",		keyBinding: new KeyBinding(35, true, true), predefined: true}); //$NON-NLS-0$
		}
		
		//Undo stack
		bindings.push({actionID: "undo", keyBinding: new mKeyBinding.KeyBinding('z', true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
		if (util.isMac) {
			bindings.push({actionID: "redo", keyBinding: new mKeyBinding.KeyBinding('z', true, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
		} else {
			bindings.push({actionID: "redo", keyBinding: new mKeyBinding.KeyBinding('y', true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
		}

		//Misc
		bindings.push({actionID: "deletePrevious",		keyBinding: new KeyBinding(8), predefined: true}); //$NON-NLS-0$
		bindings.push({actionID: "deletePrevious",		keyBinding: new KeyBinding(8, null, true), predefined: true}); //$NON-NLS-0$
		bindings.push({actionID: "deleteNext",		keyBinding: new KeyBinding(46), predefined: true}); //$NON-NLS-0$
		bindings.push({actionID: "deleteWordPrevious",	keyBinding: new KeyBinding(8, true), predefined: true}); //$NON-NLS-0$
		bindings.push({actionID: "deleteWordPrevious",	keyBinding: new KeyBinding(8, true, true), predefined: true}); //$NON-NLS-0$
		bindings.push({actionID: "deleteWordNext",		keyBinding: new KeyBinding(46, true), predefined: true}); //$NON-NLS-0$
		bindings.push({actionID: "tab",			keyBinding: new KeyBinding(9), predefined: true}); //$NON-NLS-0$
		bindings.push({actionID: "shiftTab",			keyBinding: new KeyBinding(9, null, true), predefined: true}); //$NON-NLS-0$
		bindings.push({actionID: "enter",			keyBinding: new KeyBinding(13), predefined: true}); //$NON-NLS-0$
		bindings.push({actionID: "enter",			keyBinding: new KeyBinding(13, null, true), predefined: true}); //$NON-NLS-0$
		bindings.push({actionID: "selectAll",		keyBinding: new KeyBinding('a', true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
		bindings.push({actionID: "toggleTabMode",	keyBinding: new KeyBinding('m', true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
		if (util.isMac) {
			bindings.push({actionID: "deleteNext",		keyBinding: new KeyBinding(46, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "deleteWordPrevious",	keyBinding: new KeyBinding(8, null, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "deleteWordNext",		keyBinding: new KeyBinding(46, null, null, true), predefined: true}); //$NON-NLS-0$
		}
		
		bindings.push({actionID: "toggleWrapMode",		keyBinding: new mKeyBinding.KeyBinding('w', true, false, true)}); //$NON-NLS-1$ //$NON-NLS-0$
		bindings.push({actionID: "toggleOverwriteMode",		keyBinding: new mKeyBinding.KeyBinding(45)}); //$NON-NLS-0$
		
		/*
		* Feature in IE/Chrome: prevent ctrl+'u', ctrl+'i', and ctrl+'b' from applying styles to the text.
		*
		* Note that Chrome applies the styles on the Mac with Ctrl instead of Cmd.
		*/
		if (!util.isFirefox) {
			var isMacChrome = util.isMac && util.isChrome;
			bindings.push({actionID: "noop", keyBinding: new KeyBinding('u', !isMacChrome, false, false, isMacChrome), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
			bindings.push({actionID: "noop", keyBinding: new KeyBinding('i', !isMacChrome, false, false, isMacChrome), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
			bindings.push({actionID: "noop", keyBinding: new KeyBinding('b', !isMacChrome, false, false, isMacChrome), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
		}

		if (util.isFirefox) {
			bindings.push({actionID: "copy", keyBinding: new KeyBinding(45, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "paste", keyBinding: new KeyBinding(45, null, true), predefined: true}); //$NON-NLS-0$
			bindings.push({actionID: "cut", keyBinding: new KeyBinding(46, null, true), predefined: true}); //$NON-NLS-0$
		}

		// Add the emacs Control+ ... key bindings.
		if (util.isMac) {
			bindings.push({actionID: "lineStart", keyBinding: new KeyBinding("a", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
			bindings.push({actionID: "lineEnd", keyBinding: new KeyBinding("e", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
			bindings.push({actionID: "lineUp", keyBinding: new KeyBinding("p", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
			bindings.push({actionID: "lineDown", keyBinding: new KeyBinding("n", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
			bindings.push({actionID: "charPrevious", keyBinding: new KeyBinding("b", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
			bindings.push({actionID: "charNext", keyBinding: new KeyBinding("f", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
			bindings.push({actionID: "deletePrevious", keyBinding: new KeyBinding("h", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
			bindings.push({actionID: "deleteNext", keyBinding: new KeyBinding("d", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
			bindings.push({actionID: "deleteLineEnd", keyBinding: new KeyBinding("k", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
			if (util.isFirefox) {
				bindings.push({actionID: "scrollPageDown", keyBinding: new KeyBinding("v", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
				bindings.push({actionID: "deleteLineStart", keyBinding: new KeyBinding("u", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
				bindings.push({actionID: "deleteWordPrevious", keyBinding: new KeyBinding("w", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
			} else {
				bindings.push({actionID: "pageDown", keyBinding: new KeyBinding("v", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
				bindings.push({actionID: "centerLine", keyBinding: new KeyBinding("l", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
				bindings.push({actionID: "enterNoCursor", keyBinding: new KeyBinding("o", false, false, false, true), predefined: true}); //$NON-NLS-1$ //$NON-NLS-0$
				//TODO implement: y (yank), t (transpose)
			}
		}
		return bindings;
	};
	
	return {
		KeyMode: KeyMode,
		DefaultKeyMode: DefaultKeyMode
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
 
/*globals define*/

define("orion/editor/textTheme", //$NON-NLS-0$
[
	'require', //$NON-NLS-0$
	'orion/editor/eventTarget', //$NON-NLS-0$
	'orion/util' //$NON-NLS-0$
], function(require, mEventTarget, util) {
	var THEME_PREFIX = "orion-theme-"; //$NON-NLS-0$
	
	var Themes = {};

	/**
	 * Constructs a new text theme. 
	 * 
	 * @class A TextTheme is a class used to specify an editor theme.
	 * @name orion.editor.TextTheme
	 * @borrows orion.editor.EventTarget#addEventListener as #addEventListener
	 * @borrows orion.editor.EventTarget#removeEventListener as #removeEventListener
	 * @borrows orion.editor.EventTarget#dispatchEvent as #dispatchEvent
	 */
	function TextTheme(options) {
		options = options || {};
		this._document = options.document || document;
	}

	/**
	 * Gets an instance of <code>orion.editor.TextTheme</code> by name. If the name
	 * paramenter is not speficed the default text theme instance is returned.
	 * Subsequent calls of <code>getTheme</code> with the same name will return
	 * the same instance.
	 */
	TextTheme.getTheme = function(name) {
		name = name || "default"; //$NON-NLS-0$
		var theme = Themes[name];
		if (!theme) {
			theme = Themes[name] = new TextTheme();
		}
		return theme;
	};

	TextTheme.prototype = /** @lends orion.editor.TextTheme.prototype */ {
		/**
		 * Returns the theme className.
		 *
		 * @see orion.editor.TextTheme#setThemeClass
		 */
		getThemeClass: function() {
			return this._themeClass;
		},
		/**
		 * @class This object represents a style sheet for a theme manager.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.TextTheme#setThemeClass}
		 * </p>
		 * @name orion.editor.ThemeStyleSheet
		 * 
		 * @property {String} href The href of the stylesheet
		 */
		/**
		 * Sets the theme className and style sheet.
		 * <p>
		 * If the <code>stylesheet</code> parameter is a string, it represents an inline
		 * CSS and it will be added to the document as a <i>STYLE</i> tag element.  If the
		 * <code>stylesheet</code> parameter is a <code>orion.editor.ThemeStyleSheet</code>,
		 * its href property is loaded as either a <i>STYLE</i> tag element or as a <i>LINK</i>
		 * tag element.
		 * </p>
		 * <p>
		 * Listeners of the ThemeChanged event are notify once the styled sheet is loaded
		 * into the document.
		 * </p>
		 *
		 * @param {String} className the new theme className.
		 * @param {String|orion.editor.ThemeStyleSheet} styleSheet the CSS stylesheet for the new theme className.
		 *
		 * @see orion.editor.TextTheme#getThemeClass
		 * @see orion.editor.TextTheme#onThemeChanged
		 */
		 setThemeClass: function(className, styleSheet) {
			var self = this;
			var oldThemeClass = self._themeClass;	
			self._themeClass = className;
			this._load(className, styleSheet, function() {
				self.onThemeChanged({
					type: "ThemeChanged", //$NON-NLS-0$
					oldValue: oldThemeClass,
					newValue: self.getThemeClass()
				});
			});
		},
		/**
		 * @class This is the event sent when the theme className or style sheet has changed.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.TextTheme}<br/>
		 * {@link orion.editor.TextTheme#event:onThemeChanged}
		 * </p>
		 * @name orion.editor.ThemeChangedEvent
		 * 
		 * @property {String} oldValue The old theme clasName.
		 * @property {String} newValue The new theme className.
		 */
		/**
		 * This event is sent when the theme clasName has changed and its style sheet has been loaded in the document.
		 *
		 * @event
		 * @param {orion.editor.ThemeChangedEvent} themeChangedEvent the event
		 */
		onThemeChanged: function(themeChangedEvent) {
			return this.dispatchEvent(themeChangedEvent);
		},
		/**
		 * @private
		 */
		buildStyleSheet: function(themeClass, settings) {
			
			var result = [];
			result.push("");
			
			result.push("." + themeClass + " {"); //$NON-NLS-1$ //$NON-NLS-0$
			if (settings.fontFamily) {
				result.push("\tfont-family: " + settings.fontFamily + ";"); //$NON-NLS-1$ //$NON-NLS-0$
			}
			if (settings.fontSize) {
				result.push("\tfont-size: " + settings.fontSize + ";"); //$NON-NLS-1$ //$NON-NLS-0$
			}
			if (settings.fontSize) {			
				result.push("\tcolor: " + settings.text + ";"); //$NON-NLS-1$ //$NON-NLS-0$
			}
			result.push("}"); //$NON-NLS-0$
			
			//From textview.css
			result.push("." + themeClass + ".textview {"); //$NON-NLS-1$ //$NON-NLS-0$
			if (settings.background) {		
				result.push("\tbackground-color: " + settings.background + ";"); //$NON-NLS-1$ //$NON-NLS-0$
			}
			result.push("}"); //$NON-NLS-0$
			
			function defineRule(className, value, isBackground) {
				if (value) {
					result.push("." + themeClass + " ." + className + " {"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					result.push("\t" + (isBackground ? "background-color" : "color") + ": " + value + ";"); //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					result.push("}"); //$NON-NLS-0$
				}
			}
			
			//From rulers.css
			defineRule("ruler.annotations", settings.annotationRuler, true); //$NON-NLS-0$
			defineRule("ruler.lines", settings.annotationRuler, true); //$NON-NLS-0$
			defineRule("ruler.folding", settings.annotationRuler, true); //$NON-NLS-0$
			defineRule("ruler.overview", settings.overviewRuler, true); //$NON-NLS-0$
			defineRule("rulerLines", settings.lineNumber, false); //$NON-NLS-0$
			defineRule("rulerLines.even", settings.lineNumberEven, false); //$NON-NLS-0$
			defineRule("rulerLines.odd", settings.lineNumberOdd, false); //$NON-NLS-0$
			
			//From annotations.css
			defineRule("annotationLine.currentLine", settings.currentLine, true); //$NON-NLS-0$
			
			//From textstyler.css
			defineRule("entity-name-tag", settings.keyword, false); //$NON-NLS-0$
			defineRule("entity-other-attribute-name", settings.attribute, false); //$NON-NLS-0$
			defineRule("string-quoted", settings.string, false); //$NON-NLS-0$
			defineRule("meta.annotation.currentLine", settings.currentLine, true); //$NON-NLS-0$
			defineRule("keyword", settings.keyword, false); //$NON-NLS-0$
			defineRule("string", settings.string, false); //$NON-NLS-0$
			defineRule("comment", settings.comment, false); //$NON-NLS-0$
			defineRule("comment.block.documentation", settings.comment, false); //$NON-NLS-0$
			defineRule("keyword.other.documentation.markup", settings.comment, false); //$NON-NLS-0$

			return result.join("\n"); //$NON-NLS-0$
		},
		/**
		 * @private
		 */
		_createStyle: function(className, styleSheet, callback, link) {
			var document = this._document;
			var id = THEME_PREFIX + className;
			var node = document.getElementById(id);
			if (node) {
				if (link || node.firstChild.data === styleSheet) {
					return;
				}
				node.removeChild(node.firstChild);
				node.appendChild(document.createTextNode(styleSheet));
			} else {
				if (link) {
					node = util.createElement(document, "link"); //$NON-NLS-0$
					node.rel = "stylesheet"; //$NON-NLS-0$
					node.type = "text/css"; //$NON-NLS-0$
					node.href = styleSheet;
					node.addEventListener("load", function() { //$NON-NLS-0$
						callback();
					});
				} else {
					node = util.createElement(document, "style"); //$NON-NLS-0$
					node.appendChild(document.createTextNode(styleSheet));
				}
				node.id = id;
				var head = document.getElementsByTagName("head")[0] || document.documentElement; //$NON-NLS-0$
				head.appendChild(node);
			}
			if (!link) {
				callback();
			}
		},
		/**
		 * @private
		 */
		_load: function (className, styleSheet, callback) {
			if (!className) {
				callback();
				return;
			}
			if (typeof styleSheet === "string") { //$NON-NLS-0$
				this._createStyle(className, styleSheet, callback);
				return;
			}
			var href = styleSheet.href;
			var extension = ".css"; //$NON-NLS-0$
			if (href.substring(href.length - extension.length) !== extension) {
				href += extension;
			}
			if (/^\//.test(href) || /[a-zA-Z0-9]+:\/\//i.test(href) || !require.toUrl /* almond cannot load dynamically */) {
				this._createStyle(className, href, callback, true);
			} else {
				var self = this;
				require(["text!" + href], function(cssText) { //$NON-NLS-0$
					self._createStyle(className, cssText, callback, false);
				});
			}
		}
	};
	mEventTarget.EventTarget.addMixin(TextTheme.prototype);
	
	return {
		TextTheme: TextTheme
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
 
/*global define*/

define("orion/editor/util", [], function() { //$NON-NLS-0$
	
	/** @private */
	function addEventListener(node, type, handler, capture) {
		if (typeof node.addEventListener === "function") { //$NON-NLS-0$
			node.addEventListener(type, handler, capture === true);
		} else {
			node.attachEvent("on" + type, handler); //$NON-NLS-0$
		}
	}
	/** @private */
	function removeEventListener(node, type, handler, capture) {
		if (typeof node.removeEventListener === "function") { //$NON-NLS-0$
			node.removeEventListener(type, handler, capture === true);
		} else {
			node.detachEvent("on" + type, handler); //$NON-NLS-0$
		}
	}
	/** @private */
	function contains(topNode, node) {
		if (!node) { return false; }
		if (!topNode.compareDocumentPosition) {
			var temp = node;
			while (temp) {
				if (topNode === temp) {
					return true;
				}
				temp = temp.parentNode;
			}
			return false;
		}
		return topNode === node || (topNode.compareDocumentPosition(node) & 16) !== 0;
	}

	return {
		contains: contains,
		addEventListener: addEventListener,
		removeEventListener: removeEventListener
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: 
 *		Felipe Heidrich (IBM Corporation) - initial API and implementation
 *		Silenio Quarti (IBM Corporation) - initial API and implementation
 *		Mihai Sucan (Mozilla Foundation) - fix for Bug#334583 Bug#348471 Bug#349485 Bug#350595 Bug#360726 Bug#361180 Bug#362835 Bug#362428 Bug#362286 Bug#354270 Bug#361474 Bug#363945 Bug#366312 Bug#370584
 ******************************************************************************/

/*global define document*/

define("orion/editor/textView", [ //$NON-NLS-0$
	'i18n!orion/editor/nls/messages', //$NON-NLS-0$
	'orion/editor/textModel', //$NON-NLS-0$
	'orion/editor/keyModes', //$NON-NLS-0$
	'orion/editor/eventTarget', //$NON-NLS-0$
	'orion/editor/textTheme', //$NON-NLS-0$
	'orion/editor/util', //$NON-NLS-0$
	'orion/util' //$NON-NLS-0$
], function(messages, mTextModel, mKeyModes, mEventTarget, mTextTheme, textUtil, util) {

	/** @private */
	function getWindow(document) {
		return document.defaultView || document.parentWindow;
	}
	var addHandler = textUtil.addEventListener;
	var removeHandler = textUtil.removeEventListener;
	/** @private */
	function applyStyle(style, node, reset) {
		if (reset) {
			node.className = "";
			var attrs = node.attributes;
			for (var i= attrs.length; i-->0;) {
				if (!util.isIE || util.isIE >= 9 || (util.isIE < 9 && attrs[i].specified)) {
					node.removeAttribute(attrs[i].name); 
				}
			}
		}
		if (!style) {
			return;
		}
		if (style.styleClass) {
			node.className = style.styleClass;
		}
		var properties = style.style;
		if (properties) {
			for (var s in properties) {
				if (properties.hasOwnProperty(s)) {
					node.style[s] = properties[s];
				}
			}
		}
		var attributes = style.attributes;
		if (attributes) {
			for (var a in attributes) {
				if (attributes.hasOwnProperty(a)) {
					node.setAttribute(a, attributes[a]);
				}
			}
		}
	}
	/** @private */
	function clone(obj) {
		/*Note that this code only works because of the limited types used in TextViewOptions */
		if (obj instanceof Array) {
			return obj.slice(0);
		}
		return obj;
	}
	/**	@private */
	function merge(obj1, obj2) {
		if (!obj1) {
			return obj2;
		}
		if (!obj2) {
			return obj1;
		}
		for (var p in obj2) {
			if (obj2.hasOwnProperty(p)) {
				if (!obj1.hasOwnProperty(p)) {
					obj1[p] = obj2[p];
				}
			}
		}
		return obj1;
	}
	/** @private */
	function compare(s1, s2) {
		if (s1 === s2) { return true; }
		if (s1 && !s2 || !s1 && s2) { return false; }
		if ((s1 && s1.constructor === String) || (s2 && s2.constructor === String)) { return false; }
		if (s1 instanceof Array || s2 instanceof Array) {
			if (!(s1 instanceof Array && s2 instanceof Array)) { return false; }
			if (s1.length !== s2.length) { return false; }
			for (var i = 0; i < s1.length; i++) {
				if (!compare(s1[i], s2[i])) {
					return false;
				}
			}
			return true;
		}
		if (!(s1 instanceof Object) || !(s2 instanceof Object)) { return false; }
		var p;
		for (p in s1) {
			if (s1.hasOwnProperty(p)) {
				if (!s2.hasOwnProperty(p)) { return false; }
				if (!compare(s1[p], s2[p])) {return false; }
			}
		}
		for (p in s2) {
			if (!s1.hasOwnProperty(p)) { return false; }
		}
		return true;
	}
	/** @private */
	function convertDelimiter(text, addTextFunc, addDelimiterFunc) {
		var cr = 0, lf = 0, index = 0, length = text.length;
		while (index < length) {
			if (cr !== -1 && cr <= index) { cr = text.indexOf("\r", index); } //$NON-NLS-0$
			if (lf !== -1 && lf <= index) { lf = text.indexOf("\n", index); } //$NON-NLS-0$
			var start = index, end;
			if (lf === -1 && cr === -1) {
				addTextFunc(text.substring(index));
				break;
			}
			if (cr !== -1 && lf !== -1) {
				if (cr + 1 === lf) {
					end = cr;
					index = lf + 1;
				} else {
					end = cr < lf ? cr : lf;
					index = (cr < lf ? cr : lf) + 1;
				}
			} else if (cr !== -1) {
				end = cr;
				index = cr + 1;
			} else {
				end = lf;
				index = lf + 1;
			}
			addTextFunc(text.substring(start, end));
			addDelimiterFunc();
		}
	}
	/** @private */
	function getBorder(node) {
		var left,top,right,bottom;
		var window = getWindow(node.ownerDocument);
		if (window.getComputedStyle) {
			var style = window.getComputedStyle(node, null);
			left = style.getPropertyValue("border-left-width"); //$NON-NLS-0$
			top = style.getPropertyValue("border-top-width"); //$NON-NLS-0$
			right = style.getPropertyValue("border-right-width"); //$NON-NLS-0$
			bottom = style.getPropertyValue("border-bottom-width"); //$NON-NLS-0$
		} else if (node.currentStyle) {
			left = node.currentStyle.borderLeftWidth;
			top = node.currentStyle.borderTopWidth;
			right = node.currentStyle.borderRightWidth;
			bottom = node.currentStyle.borderBottomWidth;
		}
		return {
			left: parseInt(left, 10) || 0,
			top: parseInt(top, 10) || 0,
			right: parseInt(right, 10) || 0,
			bottom: parseInt(bottom, 10) || 0
		};
	}
	/** @private */
	function getPadding(node) {
		var left,top,right,bottom;
		var window = getWindow(node.ownerDocument);
		if (window.getComputedStyle) {
			var style = window.getComputedStyle(node, null);
			left = style.getPropertyValue("padding-left"); //$NON-NLS-0$
			top = style.getPropertyValue("padding-top"); //$NON-NLS-0$
			right = style.getPropertyValue("padding-right"); //$NON-NLS-0$
			bottom = style.getPropertyValue("padding-bottom"); //$NON-NLS-0$
		} else if (node.currentStyle) {
			left = node.currentStyle.paddingLeft;
			top = node.currentStyle.paddingTop;
			right = node.currentStyle.paddingRight;
			bottom = node.currentStyle.paddingBottom;
		}
		return {
			left: parseInt(left, 10) || 0, 
			top: parseInt(top, 10) || 0,
			right: parseInt(right, 10) || 0,
			bottom: parseInt(bottom, 10) || 0
		};
	}
	/** @private */
	function getLineTrim(line) {
		var trim = line._trim;
		if (!trim) {
			trim = getPadding(line);
			var border = getBorder(line);
			trim.left += border.left;
			trim.top += border.top;
			trim.right += border.right;
			trim.bottom += border.bottom;
			line._trim = trim;
		}
		return trim;
	}
	
	/**
	 * @class
	 * @private
	 * @name orion.editor.Animation
	 * @description Creates an animation.
	 * @param {Object} options Options controlling the animation.
	 * @param {Array} options.curve Array of 2 values giving the start and end points for the animation.
	 * @param {Number} [options.duration=350] Duration of the animation, in milliseconds.
	 * @param {Function} [options.easing]
	 * @param {Function} [options.onAnimate]
	 * @param {Function} [options.onEnd]
	 * @param {Number} [options.rate=20] The time between frames, in milliseconds.
	 */
	var Animation = /** @ignore */ (function() {
		function Animation(options) {
			this.options = options;
		}
		/**
		 * Plays this animation.
		 * @function
		 * @memberOf orion.editor.Animation.prototype
		 * @name play
		 */
		Animation.prototype.play = function() {
			var duration = (typeof this.options.duration === "number") ? this.options.duration : 350, //$NON-NLS-0$
			    rate = (typeof this.options.rate === "number") ? this.options.rate : 20, //$NON-NLS-0$
			    easing = this.options.easing || this.defaultEasing,
			    onAnimate = this.options.onAnimate || function() {},
			    start = this.options.curve[0],
			    end = this.options.curve[1],
			    range = (end - start),
			    startedAt = -1,
				propertyValue,
				self = this;

			function onFrame() {
				startedAt = (startedAt === -1) ? new Date().getTime() : startedAt;
				var now = new Date().getTime(),
				    percentDone = (now - startedAt) / duration;
				if (percentDone < 1) {
					var eased = easing(percentDone);
					propertyValue = start + (eased * range);
					onAnimate(propertyValue);
				} else {
					onAnimate(end);
					self.stop();
				}
			}
			this.interval = this.options.window.setInterval(onFrame, rate);
		};
		/**
		 * Stops this animation.
		 * @function
		 * @memberOf orion.editor.Animation.prototype
		 */
		Animation.prototype.stop = function() {
			this.options.window.clearInterval(this.interval);
		    var onEnd = this.options.onEnd || function () {};
			onEnd();
		};
		Animation.prototype.defaultEasing = function(x) {
			return Math.sin(x * (Math.PI / 2));
		};
		return Animation;
	}());
	
	/** 
	 * Constructs a new Selection object.
	 * 
	 * @class A Selection represents a range of selected text in the view.
	 * @name orion.editor.Selection
	 */
	function Selection (start, end, caret) {
		/**
		 * The selection start offset.
		 *
		 * @name orion.editor.Selection#start
		 */
		this.start = start;
		/**
		 * The selection end offset.
		 *
		 * @name orion.editor.Selection#end
		 */
		this.end = end;
		/** @private */
		this.caret = caret; //true if the start, false if the caret is at end
	}
	Selection.prototype = /** @lends orion.editor.Selection.prototype */ {
		/** @private */
		clone: function() {
			return new Selection(this.start, this.end, this.caret);
		},
		/** @private */
		collapse: function() {
			if (this.caret) {
				this.end = this.start;
			} else {
				this.start = this.end;
			}
		},
		/** @private */
		extend: function (offset) {
			if (this.caret) {
				this.start = offset;
			} else {
				this.end = offset;
			}
			if (this.start > this.end) {
				var tmp = this.start;
				this.start = this.end;
				this.end = tmp;
				this.caret = !this.caret;
			}
		},
		/** @private */
		setCaret: function(offset) {
			this.start = offset;
			this.end = offset;
			this.caret = false;
		},
		/** @private */
		getCaret: function() {
			return this.caret ? this.start : this.end;
		},
		/** @private */
		toString: function() {
			return "start=" + this.start + " end=" + this.end + (this.caret ? " caret is at start" : " caret is at end"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		},
		/** @private */
		isEmpty: function() {
			return this.start === this.end;
		},
		/** @private */
		equals: function(object) {
			return this.caret === object.caret && this.start === object.start && this.end === object.end;
		}
	};
	/** @private */
	function TextRect (rect) {
		this.left = rect.left;
		this.top = rect.top;
		this.right = rect.right;
		this.bottom = rect.bottom;
	}
	TextRect.prototype = /** @lends orion.editor.TextRect.prototype */ {
		/** @private */
		toString: function() {
			return "{l=" + this.left + ", t=" + this.top + ", r=" + this.right + ", b=" + this.bottom + "}"; //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		}
	};
	/** 
	 * Constructs a new TextLine object.
	 * 
	 * @class A TextLine represents a line of text in the view.
	 * @name orion.editor.TextLine
	 * @private
	 */
	function TextLine (view, lineIndex, lineDiv) {
		/**
		 * The view.
		 *
		 * @name orion.editor.TextLine#view
		 * @private
		 */
		this.view = view;
		/**
		 * The line index.
		 *
		 * @name orion.editor.TextLine#lineIndex
		 * @private
		 */
		this.lineIndex = lineIndex;
		
		this._lineDiv = lineDiv;
	}
	TextLine.prototype = /** @lends orion.editor.TextLine.prototype */ {
		/** @private */
		create: function(parent, div) {
			if (this._lineDiv) { return; }
			var child = this._lineDiv = this._createLine(parent, div, this.lineIndex);
			child._line = this;
			return child;
		},
		_createLine: function(parent, div, lineIndex) {
			var view = this.view;
			var model = view._model;
			var lineText = model.getLine(lineIndex);
			var lineStart = model.getLineStart(lineIndex);
			var e = {type:"LineStyle", textView: view, lineIndex: lineIndex, lineText: lineText, lineStart: lineStart}; //$NON-NLS-0$
			if (lineText.length < 2000) {
				view.onLineStyle(e);
			}
			var lineDiv = div || util.createElement(parent.ownerDocument, "div"); //$NON-NLS-0$
			if (!div || !compare(div.viewStyle, e.style)) {
				applyStyle(e.style, lineDiv, div);
				if (div) { div._trim = null; }
				lineDiv.viewStyle = e.style;
				lineDiv.setAttribute("role", "presentation"); //$NON-NLS-1$ //$NON-NLS-0$
			}
			lineDiv.lineIndex = lineIndex;
			var ranges = [];
			var data = {tabOffset: 0, ranges: ranges};
			this._createRanges(e.ranges, lineText, 0, lineText.length, lineStart, data);
			
			/*
			* A trailing span with a whitespace is added for three different reasons:
			* 1. Make sure the height of each line is the largest of the default font
			* in normal, italic, bold, and italic-bold.
			* 2. When full selection is off, Firefox, Opera and IE9 do not extend the 
			* selection at the end of the line when the line is fully selected. 
			* 3. The height of a div with only an empty span is zero.
			*/
			var c = " "; //$NON-NLS-0$
			if (!view._fullSelection && util.isIE < 9) {
				/* 
				* IE8 already selects extra space at end of a line fully selected,
				* adding another space at the end of the line causes the selection 
				* to look too big. The fix is to use a zero-width space (\uFEFF) instead. 
				*/
				c = "\uFEFF"; //$NON-NLS-0$
			}
			var range = {text: c, style: view._metrics.largestFontStyle, ignoreChars: 1};
			if (ranges.length === 0 || !ranges[ranges.length - 1].style || ranges[ranges.length - 1].style.tagName !== "div") { //$NON-NLS-0$
				ranges.push(range);
			} else {
				ranges.splice(ranges.length - 1, 0, range);
			}
			
			var span, style, oldSpan, oldStyle, text, oldText, end = 0, oldEnd = 0, next;
			var changeCount, changeStart;
			if (div) {
				var modelChangedEvent = div.modelChangedEvent;
				if (modelChangedEvent) {
					if (modelChangedEvent.removedLineCount === 0 && modelChangedEvent.addedLineCount === 0) {
						changeStart = modelChangedEvent.start - lineStart;
						changeCount = modelChangedEvent.addedCharCount - modelChangedEvent.removedCharCount;
					} else {
						changeStart = -1;
					}
					div.modelChangedEvent = undefined;
				}
				oldSpan = div.firstChild;
			}
			for (var i = 0; i < ranges.length; i++) {
				range = ranges[i];
				text = range.text;
				end += text.length;
				style = range.style;
				if (oldSpan) {
					oldText = oldSpan.firstChild.data;
					oldStyle = oldSpan.viewStyle;
					if (oldText === text && compare(style, oldStyle)) {
						oldEnd += oldText.length;
						oldSpan._rectsCache = undefined;
						span = oldSpan = oldSpan.nextSibling;
						continue;
					} else {
						while (oldSpan) {
							if (changeStart !== -1) {
								var spanEnd = end;
								if (spanEnd >= changeStart) {
									spanEnd -= changeCount;
								}
								var t = oldSpan.firstChild.data;
								var length = t ? t.length : 0;
								if (oldEnd + length > spanEnd) { break; }
								oldEnd += length;
							}
							next = oldSpan.nextSibling;
							lineDiv.removeChild(oldSpan);
							oldSpan = next;
						}
					}
				}
				span = this._createSpan(lineDiv, text, style, range.ignoreChars);
				if (oldSpan) {
					lineDiv.insertBefore(span, oldSpan);
				} else {
					lineDiv.appendChild(span);
				}
				if (div) {
					div.lineWidth = undefined;
				}
			}
			if (div) {
				var tmp = span ? span.nextSibling : null;
				while (tmp) {
					next = tmp.nextSibling;
					div.removeChild(tmp);
					tmp = next;
				}
			} else {
				parent.appendChild(lineDiv);
			}
			return lineDiv;
		},
		_createRanges: function(ranges, text, start, end, lineStart, data) {
			if (start > end) { return; }
			if (ranges) {
				for (var i = 0; i < ranges.length; i++) {
					var range = ranges[i];
					if (range.end < lineStart + start) { continue; }
					var styleStart = Math.max(lineStart + start, range.start) - lineStart;
					if (styleStart > end) { break; }
					var styleEnd = Math.min(lineStart + end, range.end) - lineStart;
					if (styleStart <= styleEnd) {
						styleStart = Math.max(start, styleStart);
						styleEnd = Math.min(end, styleEnd);
						if (start < styleStart) {
							this._createRange(text, start, styleStart, null, data);
						}
						if (!range.style || !range.style.unmergeable) {
							while (i + 1 < ranges.length && ranges[i + 1].start - lineStart === styleEnd && compare(range.style, ranges[i + 1].style)) {
								range = ranges[i + 1];
								styleEnd = Math.min(lineStart + end, range.end) - lineStart;
								i++;
							}
						}
						this._createRange(text, styleStart, styleEnd, range.style, data);
						start = styleEnd;
					}
				}
			}
			if (start < end) {
				this._createRange(text, start, end, null, data);
			}
		},
		_createRange: function(text, start, end, style, data) {
			if (start > end) { return; }
			var tabSize = this.view._customTabSize, range;
			if (tabSize && tabSize !== 8) {
				var tabIndex = text.indexOf("\t", start); //$NON-NLS-0$
				while (tabIndex !== -1 && tabIndex < end) {
					if (start < tabIndex) {
						range = {text: text.substring(start, tabIndex), style: style};
						data.ranges.push(range);
						data.tabOffset += range.text.length;
					}
					var spacesCount = tabSize - (data.tabOffset % tabSize);
					if (spacesCount > 0) {
						//TODO hack to preserve tabs in getDOMText()
						var spaces = "\u00A0"; //$NON-NLS-0$
						for (var i = 1; i < spacesCount; i++) {
							spaces += " "; //$NON-NLS-0$
						}
						range = {text: spaces, style: style, ignoreChars: spacesCount - 1};
						data.ranges.push(range);
						data.tabOffset += range.text.length;
					}
					start = tabIndex + 1;
					if (start === end) {
						return;
					}
					tabIndex = text.indexOf("\t", start); //$NON-NLS-0$
				}
			}
			if (start <= end) {
				range = {text: text.substring(start, end), style: style};
				data.ranges.push(range);
				data.tabOffset += range.text.length;
			}
		},
		_createSpan: function(parent, text, style, ignoreChars) {
			var view = this.view;
			var tagName = "span"; //$NON-NLS-0$
			if (style && style.tagName) {
				tagName = style.tagName.toLowerCase();
			}
			var isLink = tagName === "a"; //$NON-NLS-0$
			if (isLink) { parent.hasLink = true; }
			if (isLink && !view._linksVisible) {
				tagName = "span"; //$NON-NLS-0$
			}
			var document = parent.ownerDocument;
			var child = util.createElement(parent.ownerDocument, tagName);
			if (style && style.html) {
				child.innerHTML = style.html;
				child.ignore = true;
			} else if (style && style.node) {
				child.appendChild(style.node);
				child.ignore = true;
			} else {
				child.appendChild(document.createTextNode(style && style.text ? style.text : text));
			}
			applyStyle(style, child);
			if (tagName === "a") { //$NON-NLS-0$
				var window = view._getWindow();
				addHandler(child, "click", function(e) { return view._handleLinkClick(e ? e : window.event); }, false); //$NON-NLS-0$
			}
			child.viewStyle = style;
			if (ignoreChars) {
				child.ignoreChars = ignoreChars;
			}
			return child;
		},
		_ensureCreated: function() {
			if (this._lineDiv) { return this._lineDiv; }
			return (this._createdDiv = this.create(this.view._clientDiv, null));
		},
		/** @private */
		getBoundingClientRect: function(offset, absolute) {
			var child = this._ensureCreated();
			var view = this.view;
			if (offset === undefined) {
				return this._getLineBoundingClientRect(child, true);
			}
			var model = view._model;
			var document = child.ownerDocument;
			var lineIndex = this.lineIndex;
			var result = null;
			if (offset < model.getLineEnd(lineIndex)) {
				var lineOffset = model.getLineStart(lineIndex);
				var lineChild = child.firstChild;
				while (lineChild) {
					if (lineChild.ignore) {
						lineChild = lineChild.nextSibling;
						continue;
					}
					var textNode = lineChild.firstChild;
					var nodeLength = textNode.length; 
					if (lineChild.ignoreChars) {
						nodeLength -= lineChild.ignoreChars;
					}
					if (lineOffset + nodeLength > offset) {
						var index = offset - lineOffset;
						var range;
						if (textNode.length === 1) {
							result = new TextRect(lineChild.getBoundingClientRect());
						} else if (view._isRangeRects) {
							range = document.createRange();
							range.setStart(textNode, index);
							range.setEnd(textNode, index + 1);
							result = new TextRect(range.getBoundingClientRect());
						} else if (util.isIE) {
							range = document.body.createTextRange();
							range.moveToElementText(lineChild);
							range.collapse();
							/*
							* Bug in IE8. TextRange.getClientRects() and TextRange.getBoundingClientRect() fails
							* if the line child is not the first element in the line and if the start offset is 0. 
							* The fix is to use Node.getClientRects() left edge instead.
							*/
							var fixIE8 = index === 0 && util.isIE === 8;
							if (fixIE8) { index = 1; }
							range.moveEnd("character", index + 1); //$NON-NLS-0$
							range.moveStart("character", index); //$NON-NLS-0$
							result = new TextRect(range.getBoundingClientRect());
							if (fixIE8) {
								result.left = lineChild.getClientRects()[0].left;
							}
						} else {
							var text = textNode.data;
							lineChild.removeChild(textNode);
							lineChild.appendChild(document.createTextNode(text.substring(0, index)));
							var span = util.createElement(document, "span"); //$NON-NLS-0$
							span.appendChild(document.createTextNode(text.substring(index, index + 1)));
							lineChild.appendChild(span);
							lineChild.appendChild(document.createTextNode(text.substring(index + 1)));
							result = new TextRect(span.getBoundingClientRect());
							lineChild.innerHTML = "";
							lineChild.appendChild(textNode);
							if (!this._createdDiv) {
								/*
								 * Removing the element node that holds the selection start or end
								 * causes the selection to be lost. The fix is to detect this case
								 * and restore the selection. 
								 */
								var s = view._getSelection();
								if ((lineOffset <= s.start && s.start < lineOffset + nodeLength) ||  (lineOffset <= s.end && s.end < lineOffset + nodeLength)) {
									view._updateDOMSelection();
								}
							}
						}
						if (util.isIE) {
							var window = getWindow(child.ownerDocument);
							var xFactor = window.screen.logicalXDPI / window.screen.deviceXDPI;
							var yFactor = window.screen.logicalYDPI / window.screen.deviceYDPI;
							result.left = result.left * xFactor;
							result.right = result.right * xFactor;
							result.top = result.top * yFactor;
							result.bottom = result.bottom * yFactor;
						}
						break;
					}
					lineOffset += nodeLength;
					lineChild = lineChild.nextSibling;
				}
			}
			var rect = this.getBoundingClientRect();
			if (!result) {
				if (view._wrapMode) {
					var rects = this.getClientRects();
					result = rects[rects.length - 1];
					result.left = result.right;
					result.left += rect.left;
					result.top += rect.top;
					result.right += rect.left;
					result.bottom += rect.top;
				} else {
					result = new TextRect(rect);
					result.left = result.right;
				}
			}
			if (absolute || absolute === undefined) {
				result.left -= rect.left;
				result.top -= rect.top;
				result.right -= rect.left;
				result.bottom -= rect.top;
			}
			return result;
		},
		/** @private */
		_getClientRects: function(element, parentRect) {
			var rects, newRects, rect, i;
			if (!element._rectsCache) {
				rects = element.getClientRects();
				newRects = new Array(rects.length);
				for (i = 0; i<rects.length; i++) {
					rect = newRects[i] = new TextRect(rects[i]);
					rect.left -= parentRect.left;
					rect.top -= parentRect.top;
					rect.right -= parentRect.left;
					rect.bottom -= parentRect.top;
				}
				element._rectsCache = newRects;
			}
			rects = element._rectsCache;
			newRects = [rects.length];
			for (i = 0; i<rects.length; i++) {
				newRects[i] = new TextRect(rects[i]);
			}
			return newRects;
		},
		/** @private */
		getClientRects: function(lineIndex) {
			if (!this.view._wrapMode) { return [this.getBoundingClientRect()]; }
			var child = this._ensureCreated();
			//TODO [perf] cache rects
			var result = [];
			var lineChild = child.firstChild, i, r, parentRect = child.getBoundingClientRect();
			while (lineChild) {
				if (lineChild.ignore) {
					lineChild = lineChild.nextSibling;
					continue;
				}
				var rects = this._getClientRects(lineChild, parentRect);
				for (i = 0; i < rects.length; i++) {
					var rect = rects[i], j;
					if (rect.top === rect.bottom) { continue; }
					var center = rect.top + (rect.bottom - rect.top) / 2;
					for (j = 0; j < result.length; j++) {
						r = result[j];
						if ((r.top <= center && center < r.bottom)) {
							break;
						}
					}
					if (j === result.length) {
						result.push(rect);
					} else {
						if (rect.left < r.left) { r.left = rect.left; }
						if (rect.top < r.top) { r.top = rect.top; }
						if (rect.right > r.right) { r.right = rect.right; }
						if (rect.bottom > r.bottom) { r.bottom = rect.bottom; }
					}
				}
				lineChild = lineChild.nextSibling;
			}
			if (lineIndex !== undefined) {
				return result[lineIndex];
			}
			return result;
		},
		/** @private */
		_getLineBoundingClientRect: function (child, noTrim) {
			var rect = new TextRect(child.getBoundingClientRect());
			if (this.view._wrapMode) {
			} else {
				rect.right = rect.left;
				var lastChild = child.lastChild;
				//Remove any artificial trailing whitespace in the line
				while (lastChild && lastChild.ignoreChars === lastChild.firstChild.length) {
					lastChild = lastChild.previousSibling;
				}
				if (lastChild) {
					var lastRect = lastChild.getBoundingClientRect();
					rect.right = lastRect.right + getLineTrim(child).right;
				}
			}
			if (noTrim) {
				var padding = getLineTrim(child);
				rect.left = rect.left + padding.left;
				rect.right = rect.right - padding.right;
			}
			return rect;
		},
		/** @private */
		getLineCount: function () {
			if (!this.view._wrapMode) { return 1; }
			return this.getClientRects().length;
		},
		/** @private */
		getLineIndex: function(offset) {
			if (!this.view._wrapMode) { return 0; }
			var rects = this.getClientRects();
			var rect = this.getBoundingClientRect(offset);
			var center = rect.top + ((rect.bottom - rect.top) / 2);
			for (var i = 0; i < rects.length; i++) {
				if (rects[i].top <= center && center < rects[i].bottom) {
					return i;
				}
			}
			return rects.length - 1;
		},
		/** @private */
		getLineStart: function (lineIndex) {
			if (!this.view._wrapMode || lineIndex === 0) {
				return this.view._model.getLineStart(lineIndex);
			}
			var rects = this.getClientRects();
			return this.getOffset(rects[lineIndex].left + 1, rects[lineIndex].top + 1);
		},
		/** @private */
		getOffset: function(x, y) {
			var view = this.view;
			var model = view._model;
			var lineIndex = this.lineIndex;
			var lineStart = model.getLineStart(lineIndex);
			var lineEnd = model.getLineEnd(lineIndex);
			if (lineStart === lineEnd) {
				return lineStart;
			}
			var child = this._ensureCreated();
			var lineRect = this.getBoundingClientRect(), rects, rect;
			if (view._wrapMode) {
				rects = this.getClientRects();
				if (y < rects[0].top) {
					y = rects[0].top;
				}
				for (var i = 0; i < rects.length; i++) {
					rect = rects[i];
					if (rect.top <= y && y < rect.bottom) {
						break;
					}
				}
				if (x < rect.left) { x = rect.left; }
				if (x > rect.right) { x = rect.right - 1; }
			} else {
				if (x < 0) { x = 0; }
				if (x > (lineRect.right - lineRect.left)) { x = lineRect.right - lineRect.left; }
			}
			var document = child.ownerDocument;
			var window = getWindow(document);
			var xFactor = util.isIE ? window.screen.logicalXDPI / window.screen.deviceXDPI : 1;
			var yFactor = util.isIE ? window.screen.logicalYDPI / window.screen.deviceYDPI : 1;
			var offset = lineStart;
			var lineChild = child.firstChild;
			done:
			while (lineChild) {
				if (lineChild.ignore) {
					lineChild = lineChild.nextSibling;
					continue;
				}
				var textNode = lineChild.firstChild;
				var nodeLength = textNode.length;
				if (lineChild.ignoreChars) {
					nodeLength -= lineChild.ignoreChars;
				}
				var rangeLeft, rangeTop, rangeRight, rangeBottom;
				rects = this._getClientRects(lineChild, lineRect);
				for (var j = 0; j < rects.length; j++) {
					rect = rects[j];
					if (rect.left <= x && x < rect.right && (!view._wrapMode || (rect.top <= y && y < rect.bottom))) {
						var range, start, end;
						var rl = rect.left + lineRect.left, fixIE8;
						if (util.isIE || view._isRangeRects) {
							range = view._isRangeRects ? document.createRange() : document.body.createTextRange();
							var high = nodeLength;
							var low = -1;
							while ((high - low) > 1) {
								var mid = Math.floor((high + low) / 2);
								start = low + 1;
								end = mid === nodeLength - 1 && lineChild.ignoreChars ? textNode.length : mid + 1;
								/*
								* Bug in IE8. TextRange.getClientRects() and TextRange.getBoundingClientRect() fails
								* if the line child is not the first element in the line and if the start offset is 0. 
								* The fix is to use Node.getClientRects() left edge instead.
								*/
								fixIE8 = start === 0 && util.isIE === 8;
								if (view._isRangeRects) {
									range.setStart(textNode, start);
									range.setEnd(textNode, end);
								} else {
									if (fixIE8) { start = 1; } 
									range.moveToElementText(lineChild);
									range.move("character", start); //$NON-NLS-0$
									range.moveEnd("character", end - start); //$NON-NLS-0$
								}
								rects = range.getClientRects();
								var found = false;
								for (var k = 0; k < rects.length; k++) {
									rect = rects[k];
									rangeLeft = (fixIE8 ? rl : rect.left) * xFactor - lineRect.left;
									rangeRight = rect.right * xFactor - lineRect.left;
									rangeTop = rect.top * yFactor - lineRect.top;
									rangeBottom = rect.bottom * yFactor - lineRect.top;
									if (rangeLeft <= x && x < rangeRight && (!view._wrapMode || (rangeTop <= y && y < rangeBottom))) {
										found = true;
										break;
									}
								}
								if (found) {
									high = mid;
								} else {
									low = mid;
								}
							}
							offset += high;
							start = high;
							end = high === nodeLength - 1 && lineChild.ignoreChars ? textNode.length : Math.min(high + 1, textNode.length);
							if (view._isRangeRects) {
								range.setStart(textNode, start);
								range.setEnd(textNode, end);
							} else {
								range.moveToElementText(lineChild);
								range.move("character", start); //$NON-NLS-0$
								range.moveEnd("character", end - start); //$NON-NLS-0$
							}
							rects = range.getClientRects();
							var trailing = false;
							if (rects.length > 0) {
								rect = rects[0];
								rangeLeft = (fixIE8 ? rl : rect.left) * xFactor - lineRect.left;
								rangeRight = rect.right * xFactor - lineRect.left;
								//TODO test for character trailing (wrong for bidi)
								trailing = x > (rangeLeft + (rangeRight - rangeLeft) / 2);
							}
							// Handle Unicode surrogates
							var offsetInLine = offset - lineStart;
							var lineText = model.getLine(lineIndex);
							var c = lineText.charCodeAt(offsetInLine);
							if (0xD800 <= c && c <= 0xDBFF && trailing) {
								if (offsetInLine < lineText.length) {
									c = lineText.charCodeAt(offsetInLine + 1);
									if (0xDC00 <= c && c <= 0xDFFF) {
										offset += 1;
									}
								}
							} else if (0xDC00 <= c && c <= 0xDFFF && !trailing) {
								if (offsetInLine > 0) {
									c = lineText.charCodeAt(offsetInLine - 1);
									if (0xD800 <= c && c <= 0xDBFF) {
										offset -= 1;
									}
								}
							}
							if (trailing) {
								offset++;
							}
						} else {
							var newText = [];
							for (var q = 0; q < nodeLength; q++) {
								newText.push("<span>"); //$NON-NLS-0$
								if (q === nodeLength - 1) {
									newText.push(textNode.data.substring(q));
								} else {
									newText.push(textNode.data.substring(q, q + 1));
								}
								newText.push("</span>"); //$NON-NLS-0$
							}
							lineChild.innerHTML = newText.join("");
							var rangeChild = lineChild.firstChild;
							while (rangeChild) {
								rect = rangeChild.getBoundingClientRect();
								rangeLeft = rect.left - lineRect.left;
								rangeRight = rect.right - lineRect.left;
								if (rangeLeft <= x && x < rangeRight) {
									//TODO test for character trailing (wrong for bidi)
									if (x > rangeLeft + (rangeRight - rangeLeft) / 2) {
										offset++;
									}
									break;
								}
								offset++;
								rangeChild = rangeChild.nextSibling;
							}
							if (!this._createdDiv) {
								lineChild.innerHTML = "";
								lineChild.appendChild(textNode);
								/*
								 * Removing the element node that holds the selection start or end
								 * causes the selection to be lost. The fix is to detect this case
								 * and restore the selection. 
								 */
								var s = view._getSelection();
								if ((offset <= s.start && s.start < offset + nodeLength) || (offset <= s.end && s.end < offset + nodeLength)) {
									view._updateDOMSelection();
								}
							}
						}
						break done;
					}
				}
				offset += nodeLength;
				lineChild = lineChild.nextSibling;
			}
			return Math.min(lineEnd, Math.max(lineStart, offset));
		},
		/** @private */
		getNextOffset: function (offset, data) {
			if (data.unit === "line") { //$NON-NLS-0$
				var view = this.view;
				var model = view._model;
				var lineIndex = model.getLineAtOffset(offset);
				if (data.count > 0) {
					data.count--;
					return model.getLineEnd(lineIndex);
				}
				data.count++;
				return model.getLineStart(lineIndex);
			}
			if (data.unit === "wordend" || data.unit === "wordWS" || data.unit === "wordendWS") { //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				return this._getNextOffset_W3C(offset, data);
			}
			return util.isIE ? this._getNextOffset_IE(offset, data) : this._getNextOffset_W3C(offset, data);
		},
		/** @private */
		_getNextOffset_W3C: function (offset, data) {
			function _isPunctuation(c) {
				return (33 <= c && c <= 47) || (58 <= c && c <= 64) || (91 <= c && c <= 94) || c === 96 || (123 <= c && c <= 126);
			}
			function _isWhitespace(c) {
				return c === 32 || c === 9;
			}
			var view = this.view;
			var model = view._model;
			var lineIndex = model.getLineAtOffset(offset);
			var lineText = model.getLine(lineIndex);
			var lineStart = model.getLineStart(lineIndex);
			var lineEnd = model.getLineEnd(lineIndex);
			var lineLength = lineText.length;
			var offsetInLine = offset - lineStart;
			var c;
			var step = data.count < 0 ? -1 : 1;
			if (data.unit === "word" || data.unit === "wordend" || data.unit === "wordWS" || data.unit === "wordendWS") { //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				var previousPunctuation, previousLetterOrDigit, punctuation, letterOrDigit;
				while (data.count !== 0) {
					if (data.count > 0) {
						if (offsetInLine === lineLength) { return lineEnd; }
						c = lineText.charCodeAt(offsetInLine);
						previousPunctuation = _isPunctuation(c); 
						previousLetterOrDigit = !previousPunctuation && !_isWhitespace(c);
						offsetInLine++;
						while (offsetInLine < lineLength) {
							c = lineText.charCodeAt(offsetInLine);
							if (data.unit !== "wordWS" && data.unit !== "wordendWS") { //$NON-NLS-1$ //$NON-NLS-0$
								punctuation = _isPunctuation(c);
								if (data.unit === "wordend") { //$NON-NLS-0$
									if (!punctuation && previousPunctuation) { break; }
								} else {
									if (punctuation && !previousPunctuation) { break; }
								}
								letterOrDigit  = !punctuation && !_isWhitespace(c);
							} else {
								letterOrDigit  = !_isWhitespace(c);
							}
							if (data.unit === "wordend" || data.unit === "wordendWS") { //$NON-NLS-1$ //$NON-NLS-0$
								if (!letterOrDigit && previousLetterOrDigit) { break; }
							} else {
								if (letterOrDigit && !previousLetterOrDigit) { break; }
							}
							previousLetterOrDigit = letterOrDigit;
							previousPunctuation = punctuation;
							offsetInLine++;
						}
					} else {
						if (offsetInLine === 0) { return lineStart; }
						offsetInLine--;
						c = lineText.charCodeAt(offsetInLine);
						previousPunctuation = _isPunctuation(c); 
						previousLetterOrDigit = !previousPunctuation && !_isWhitespace(c);
						while (0 < offsetInLine) {
							c = lineText.charCodeAt(offsetInLine - 1);
							if (data.unit !== "wordWS" && data.unit !== "wordendWS") { //$NON-NLS-1$ //$NON-NLS-0$ 
								punctuation = _isPunctuation(c);
								if (data.unit === "wordend") { //$NON-NLS-0$
									if (punctuation && !previousPunctuation) { break; }
								} else {
									if (!punctuation && previousPunctuation) { break; }
								}
								letterOrDigit  = !punctuation && !_isWhitespace(c);
							} else {
								letterOrDigit  = !_isWhitespace(c);
							}
							if (data.unit === "wordend" || data.unit === "wordendWS") { //$NON-NLS-1$ //$NON-NLS-0$
								if (letterOrDigit && !previousLetterOrDigit) { break; }
							} else {
								if (!letterOrDigit && previousLetterOrDigit) { break; }
							}
							previousLetterOrDigit = letterOrDigit;
							previousPunctuation = punctuation;
							offsetInLine--;
						}
						if (offsetInLine === 0) {
							//get previous line
						}
					}
					data.count -= step;
				}
			} else {
				while (data.count !== 0 && (0 <= offsetInLine + step && offsetInLine + step <= lineLength)) {
					offsetInLine += step;
					c = lineText.charCodeAt(offsetInLine);
					// Handle Unicode surrogates
					if (0xDC00 <= c && c <= 0xDFFF) {
						if (offsetInLine > 0) {
							c = lineText.charCodeAt(offsetInLine - 1);
							if (0xD800 <= c && c <= 0xDBFF) {
								offsetInLine += step;
							}
						}
					}
					data.count -= step;
				}
			}
			return lineStart + offsetInLine;
		},
		/** @private */
		_getNextOffset_IE: function (offset, data) {
			var child = this._ensureCreated();
			var view = this.view;
			var model = view._model;
			var lineIndex = this.lineIndex;
			var result = 0, range, length;
			var lineOffset = model.getLineStart(lineIndex);
			var document = child.ownerDocument;
			var lineChild;
			var step = data.count < 0 ? -1 : 1;
			if (offset === model.getLineEnd(lineIndex)) {
				lineChild = child.lastChild;
				while (lineChild && lineChild.ignoreChars === lineChild.firstChild.length) {
					lineChild = lineChild.previousSibling;
				}
				if (!lineChild) {
					return lineOffset;
				}
				range = document.body.createTextRange();
				range.moveToElementText(lineChild);
				length = range.text.length;
				range.moveEnd(data.unit, step);
				result = offset + range.text.length - length;
			} else if (offset === lineOffset && data.count < 0) {
				result = lineOffset;
			} else {
				lineChild = child.firstChild;
				while (lineChild) {
					var textNode = lineChild.firstChild;
					var nodeLength = textNode.length;
					if (lineChild.ignoreChars) {
						nodeLength -= lineChild.ignoreChars;
					}
					if (lineOffset + nodeLength > offset) {
						range = document.body.createTextRange();
						if (offset === lineOffset && data.count < 0) {
							var temp = lineChild.previousSibling;
							// skip empty nodes
							while (temp) {
								if (temp.firstChild && temp.firstChild.length) {
									break;
								}
								temp = temp.previousSibling;
							}
							range.moveToElementText(temp ? temp : lineChild.previousSibling);
						} else {
							range.moveToElementText(lineChild);
							range.collapse();
							range.moveEnd("character", offset - lineOffset); //$NON-NLS-0$
						}
						length = range.text.length;
						range.moveEnd(data.unit, step);
						result = offset + range.text.length - length;
						break;
					}
					lineOffset = nodeLength + lineOffset;
					lineChild = lineChild.nextSibling;
				}
			}
			data.count -= step;
			return result;
		},
		/** @private */
		destroy: function() {
			var div = this._createdDiv;
			if (div) {
				div.parentNode.removeChild(div);
				this._createdDiv = null;
			}
		}
	};
	
	/**
	 * @class This object describes the options for the text view.
	 * <p>
	 * <b>See:</b><br/>
	 * {@link orion.editor.TextView}<br/>
	 * {@link orion.editor.TextView#setOptions}
	 * {@link orion.editor.TextView#getOptions}	 
	 * </p>		 
	 * @name orion.editor.TextViewOptions
	 *
	 * @property {String|DOMElement} parent the parent element for the view, it can be either a DOM element or an ID for a DOM element.
	 * @property {orion.editor.TextModel} [model] the text model for the view. If it is not set the view creates an empty {@link orion.editor.TextModel}.
	 * @property {Boolean} [readonly=false] whether or not the view is read-only.
	 * @property {Boolean} [fullSelection=true] whether or not the view is in full selection mode.
	 * @property {Boolean} [tabMode=true] whether or not the tab keypress is consumed by the view or is used for focus traversal.
	 * @property {Boolean} [expandTab=false] whether or not the tab key inserts white spaces.
	 * @property {orion.editor.TextTheme} [theme=orion.editor.TextTheme.getTheme()] the TextTheme manager. TODO more info on this
	 * @property {String} [themeClass] the CSS class for the view theming.
	 * @property {Number} [tabSize=8] The number of spaces in a tab.
	 * @property {Boolean} [overwriteMode=false] whether or not the view is in insert/overwrite mode.
	 * @property {Boolean} [singleMode=false] whether or not the editor is in single line mode.
	 * @property {Number} [marginOffset=0] the offset in a line where the print margin should be displayed. <code>0</code> means no print margin.
	 * @property {Number} [wrapOffset=0] the offset in a line where text should wrap. <code>0</code> means wrap at the client area right edge.
	 * @property {Boolean} [wrapMode=false] whether or not the view wraps lines.
	 * @property {Boolean} [wrapable=false] whether or not the view is wrappable.
	 * @property {Number} [scrollAnimation=0] the time duration in miliseconds for scrolling animation. <code>0</code> means no animation.
	 * @property {Boolean} [blockCursorVisible=false] whether or not to show the block cursor.
	 */
	/**
	 * Constructs a new text view.
	 * 
	 * @param {orion.editor.TextViewOptions} options the view options.
	 * 
	 * @class A TextView is a user interface for editing text.
	 * @name orion.editor.TextView
	 * @borrows orion.editor.EventTarget#addEventListener as #addEventListener
	 * @borrows orion.editor.EventTarget#removeEventListener as #removeEventListener
	 * @borrows orion.editor.EventTarget#dispatchEvent as #dispatchEvent
	 */
	function TextView (options) {
		this._init(options || {});
	}
	
	TextView.prototype = /** @lends orion.editor.TextView.prototype */ {
		/**
		 * Adds a keyMode to the text view at the specified position.
		 *
		 * @param {orion.editor.KeyMode} mode the editor keyMode.
		 * @param {Number} [index=length] the index.
		 */
		addKeyMode: function(mode, index) {
			var keyModes = this._keyModes;
			if (index !== undefined) {
				keyModes.splice(index, 0, mode);
			} else {
				keyModes.push(mode);
			}
			//TODO: API needed for this
			if (mode._modeAdded) {
				mode._modeAdded();
			}
		},
		/**
		 * Adds a ruler to the text view at the specified position.
		 * <p>
		 * The position is relative to the ruler location.
		 * </p>
		 *
		 * @param {orion.editor.Ruler} ruler the ruler.
		 * @param {Number} [index=length] the ruler index.
		 */
		addRuler: function (ruler, index) {
			ruler.setView(this);
			var rulers = this._rulers;
			if (index !== undefined) {
				var i, sideIndex;
				for (i = 0, sideIndex=0; i < rulers.length && sideIndex < index; i++) {
					if (ruler.getLocation() === rulers[i].getLocation()) {
						sideIndex++;
					}
				}
				rulers.splice(sideIndex, 0, ruler);
				index = sideIndex;
			} else {
				rulers.push(ruler);
			}
			this._createRuler(ruler, index);
			this._update();
		},
		computeSize: function() {
			var w = 0, h = 0;
			var model = this._model, clientDiv = this._clientDiv;
			if (!clientDiv) { return {width: w, height: h}; }
			var clientWidth = clientDiv.style.width;
			/*
			* Feature in WekKit. Webkit limits the width of the lines
			* computed below to the width of the client div.  This causes
			* the lines to be wrapped even though "pre" is set.  The fix
			* is to set the width of the client div to a "0x7fffffffpx"
			* before computing the lines width.  Note that this value is
			* reset to the appropriate value further down.
			*/
			if (util.isWebkit) {
				clientDiv.style.width = "0x7fffffffpx"; //$NON-NLS-0$
			}
			var lineCount = model.getLineCount();
			for (var lineIndex=0; lineIndex<lineCount; lineIndex++) {
				var line = this._getLine(lineIndex);
				var rect = line.getBoundingClientRect();
				w = Math.max(w, rect.right - rect.left);
				h += rect.bottom - rect.top;
				line.destroy();
			}
			if (util.isWebkit) {
				clientDiv.style.width = clientWidth;
			}
			var viewPadding = this._getViewPadding();
			w += viewPadding.right + viewPadding.left + this._metrics.scrollWidth;
			h += viewPadding.bottom + viewPadding.top + this._metrics.scrollWidth;
			return {width: w, height: h};
		},
		/**
		 * Converts the given rectangle from one coordinate spaces to another.
		 * <p>The supported coordinate spaces are:
		 * <ul>
		 *   <li>"document" - relative to document, the origin is the top-left corner of first line</li>
		 *   <li>"page" - relative to html page that contains the text view</li>
		 * </ul>
		 * </p>
		 * <p>All methods in the view that take or return a position are in the document coordinate space.</p>
		 *
		 * @param rect the rectangle to convert.
		 * @param rect.x the x of the rectangle.
		 * @param rect.y the y of the rectangle.
		 * @param rect.width the width of the rectangle.
		 * @param rect.height the height of the rectangle.
		 * @param {String} from the source coordinate space.
		 * @param {String} to the destination coordinate space.
		 *
		 * @see orion.editor.TextView#getLocationAtOffset
		 * @see orion.editor.TextView#getOffsetAtLocation
		 * @see orion.editor.TextView#getTopPixel
		 * @see orion.editor.TextView#setTopPixel
		 */
		convert: function(rect, from, to) {
			if (!this._clientDiv) { return; }
			var scroll = this._getScroll();
			var viewPad = this._getViewPadding();
			var viewRect = this._viewDiv.getBoundingClientRect();
			if (from === "document") { //$NON-NLS-0$
				if (rect.x !== undefined) {
					rect.x += - scroll.x + viewRect.left + viewPad.left;
				}
				if (rect.y !== undefined) {
					rect.y += - scroll.y + viewRect.top + viewPad.top;
				}
			}
			//At this point rect is in the widget coordinate space
			if (to === "document") { //$NON-NLS-0$
				if (rect.x !== undefined) {
					rect.x += scroll.x - viewRect.left - viewPad.left;
				}
				if (rect.y !== undefined) {
					rect.y += scroll.y - viewRect.top - viewPad.top;
				}
			}
			return rect;
		},
		/**
		 * Destroys the text view. 
		 * <p>
		 * Removes the view from the page and frees all resources created by the view.
		 * Calling this function causes the "Destroy" event to be fire so that all components
		 * attached to view can release their references.
		 * </p>
		 *
		 * @see orion.editor.TextView#onDestroy
		 */
		destroy: function() {
			/* Destroy rulers*/
			for (var i=0; i< this._rulers.length; i++) {
				this._rulers[i].setView(null);
			}
			this.rulers = null;
			
			this._destroyView();

			var e = {type: "Destroy"}; //$NON-NLS-0$
			this.onDestroy(e);

			this._parent = null;
			if (this._model && this._model.destroy) {
				this._model.destroy();
			}
			this._model = null;
			this._theme = null;
			this._selection = null;
			this._doubleClickSelection = null;
			this._keyModes = null;
			this._actions = null;
		},
		/**
		 * Gives focus to the text view.
		 */
		focus: function() {
			if (!this._clientDiv) { return; }
			/*
			* Feature in Chrome. When focus is called in the clientDiv without
			* setting selection the browser will set the selection to the first dom 
			* element, which can be above the client area. When this happen the 
			* browser also scrolls the window to show that element.
			* The fix is to call _updateDOMSelection() before calling focus().
			*/
			this._updateDOMSelection();
			this._clientDiv.focus();
			/*
			* Feature in Safari. When focus is called the browser selects the clientDiv
			* itself. The fix is to call _updateDOMSelection() after calling focus().
			*/
			this._updateDOMSelection();
		},
		/**
		 * Check if the text view has focus.
		 *
		 * @returns {Boolean} <code>true</code> if the text view has focus, otherwise <code>false</code>.
		 */
		hasFocus: function() {
			return this._hasFocus;
		},
		/**
		 * Returns the action description for a given action ID.
		 *
		 * @returns {orion.editor.ActionDescrition} the action description
		 */
		getActionDescription: function(actionID) {
			var action = this._actions[actionID];
			if (action) {
				return action.actionDescription;
			}
			return undefined;
		},
		/**
		 * Returns all action IDs defined in the text view.
		 * <p>
		 * There are two types of actions, the predefined actions of the view 
		 * and the actions added by application code.
		 * </p>
		 * <p>
		 * The predefined actions are:
		 * <ul>
		 *   <li>Navigation actions. These actions move the caret collapsing the selection.</li>
		 *     <ul>
		 *       <li>"lineUp" - moves the caret up by one line</li>
		 *       <li>"lineDown" - moves the caret down by one line</li>
		 *       <li>"lineStart" - moves the caret to beginning of the current line</li>
		 *       <li>"lineEnd" - moves the caret to end of the current line </li>
		 *       <li>"charPrevious" - moves the caret to the previous character</li>
		 *       <li>"charNext" - moves the caret to the next character</li>
		 *       <li>"pageUp" - moves the caret up by one page</li>
		 *       <li>"pageDown" - moves the caret down by one page</li>
		 *       <li>"wordPrevious" - moves the caret to the previous word</li>
		 *       <li>"wordNext" - moves the caret to the next word</li>
		 *       <li>"textStart" - moves the caret to the beginning of the document</li>
		 *       <li>"textEnd" - moves the caret to the end of the document</li>
		 *     </ul>
		 *   <li>Selection actions. These actions move the caret extending the selection.</li>
		 *     <ul>
		 *       <li>"selectLineUp" - moves the caret up by one line</li>
		 *       <li>"selectLineDown" - moves the caret down by one line</li>
		 *       <li>"selectLineStart" - moves the caret to beginning of the current line</li>
		 *       <li>"selectLineEnd" - moves the caret to end of the current line </li>
		 *       <li>"selectCharPrevious" - moves the caret to the previous character</li>
		 *       <li>"selectCharNext" - moves the caret to the next character</li>
		 *       <li>"selectPageUp" - moves the caret up by one page</li>
		 *       <li>"selectPageDown" - moves the caret down by one page</li>
		 *       <li>"selectWordPrevious" - moves the caret to the previous word</li>
		 *       <li>"selectWordNext" - moves the caret to the next word</li>
		 *       <li>"selectTextStart" - moves the caret to the beginning of the document</li>
		 *       <li>"selectTextEnd" - moves the caret to the end of the document</li>
		 *       <li>"selectAll" - selects the entire document</li>
		 *     </ul>
		 *   <li>Edit actions. These actions modify the text view text</li>
		 *     <ul>
		 *       <li>"deletePrevious" - deletes the character preceding the caret</li>
		 *       <li>"deleteNext" - deletes the charecter following the caret</li>
		 *       <li>"deleteWordPrevious" - deletes the word preceding the caret</li>
		 *       <li>"deleteWordNext" - deletes the word following the caret</li>
		 *       <li>"tab" - inserts a tab character at the caret</li>
		 *       <li>"shiftTab" - noop</li>
		 *       <li>"toggleTabMode" - toggles tab mode.</li>
		 *       <li>"toggleWrapMode" - toggles wrap mode.</li>
		 *       <li>"toggleOverwriteMode" - toggles overwrite mode.</li>
		 *       <li>"enter" - inserts a line delimiter at the caret</li>
		 *     </ul>
		 *   <li>Clipboard actions.</li>
		 *     <ul>
		 *       <li>"copy" - copies the selected text to the clipboard</li>
		 *       <li>"cut" - copies the selected text to the clipboard and deletes the selection</li>
		 *       <li>"paste" - replaces the selected text with the clipboard contents</li>
		 *     </ul>
		 * </ul>
		 * </p>
		 *
		 * @param {Boolean} [defaultAction=false] whether or not the predefined actions are included.
		 * @returns {String[]} an array of action IDs defined in the text view.
		 *
		 * @see orion.editor.TextView#invokeAction
		 * @see orion.editor.TextView#setAction
		 * @see orion.editor.TextView#setKeyBinding
		 * @see orion.editor.TextView#getKeyBindings
		 */
		getActions: function (defaultAction) {
			var result = [];
			var actions = this._actions;
			for (var i in actions) {
				if (actions.hasOwnProperty(i)) {
					if (!defaultAction && actions[i].defaultHandler) { continue; }
					result.push(i);
				}
			}
			return result;
		},
		/**
		 * Returns the bottom index.
		 * <p>
		 * The bottom index is the line that is currently at the bottom of the view.  This
		 * line may be partially visible depending on the vertical scroll of the view. The parameter
		 * <code>fullyVisible</code> determines whether to return only fully visible lines. 
		 * </p>
		 *
		 * @param {Boolean} [fullyVisible=false] if <code>true</code>, returns the index of the last fully visible line. This
		 *    parameter is ignored if the view is not big enough to show one line.
		 * @returns {Number} the index of the bottom line.
		 *
		 * @see orion.editor.TextView#getTopIndex
		 * @see orion.editor.TextView#setTopIndex
		 */
		getBottomIndex: function(fullyVisible) {
			if (!this._clientDiv) { return 0; }
			return this._getBottomIndex(fullyVisible);
		},
		/**
		 * Returns the bottom pixel.
		 * <p>
		 * The bottom pixel is the pixel position that is currently at
		 * the bottom edge of the view.  This position is relative to the
		 * beginning of the document.
		 * </p>
		 *
		 * @returns {Number} the bottom pixel.
		 *
		 * @see orion.editor.TextView#getTopPixel
		 * @see orion.editor.TextView#setTopPixel
		 * @see orion.editor.TextView#convert
		 */
		getBottomPixel: function() {
			if (!this._clientDiv) { return 0; }
			return this._getScroll().y + this._getClientHeight();
		},
		/**
		 * Returns the caret offset relative to the start of the document.
		 *
		 * @returns {Number} the caret offset relative to the start of the document.
		 *
		 * @see orion.editor.TextView#setCaretOffset
		 * @see orion.editor.TextView#setSelection
		 * @see orion.editor.TextView#getSelection
		 */
		getCaretOffset: function () {
			var s = this._getSelection();
			return s.getCaret();
		},
		/**
		 * Returns the client area.
		 * <p>
		 * The client area is the portion in pixels of the document that is visible. The
		 * client area position is relative to the beginning of the document.
		 * </p>
		 *
		 * @returns {Object} the client area rectangle {x, y, width, height}.
		 *
		 * @see orion.editor.TextView#getTopPixel
		 * @see orion.editor.TextView#getBottomPixel
		 * @see orion.editor.TextView#getHorizontalPixel
		 * @see orion.editor.TextView#convert
		 */
		getClientArea: function() {
			if (!this._clientDiv) { return {x: 0, y: 0, width: 0, height: 0}; }
			var scroll = this._getScroll();
			return {x: scroll.x, y: scroll.y, width: this._getClientWidth(), height: this._getClientHeight()};
		},
		/**
		 * Returns the horizontal pixel.
		 * <p>
		 * The horizontal pixel is the pixel position that is currently at
		 * the left edge of the view.  This position is relative to the
		 * beginning of the document.
		 * </p>
		 *
		 * @returns {Number} the horizontal pixel.
		 *
		 * @see orion.editor.TextView#setHorizontalPixel
		 * @see orion.editor.TextView#convert
		 */
		getHorizontalPixel: function() {
			if (!this._clientDiv) { return 0; }
			return this._getScroll().x;
		},
		/**
		 * Returns all the key bindings associated to the given action ID.
		 *
		 * @param {String} actionID the action ID.
		 * @returns {orion.editor.KeyBinding[]} the array of key bindings associated to the given action ID.
		 *
		 * @see orion.editor.TextView#setKeyBinding
		 * @see orion.editor.TextView#setAction
		 */
		getKeyBindings: function (actionID) {
			var result = [];
			var keyModes = this._keyModes;
			for (var i = 0; i < keyModes.length; i++) {
				result = result.concat(keyModes[i].getKeyBindings(actionID));
			}
			return result;
		},
		/**
		 * Returns all the key modes added to text view.
		 *
		 * @returns {orion.editor.KeyMode[]} the array of key modes.
		 *
		 * @see orion.editor.TextView#addKeyMode
		 * @see orion.editor.TextView#removeKeyMode
		 */
		getKeyModes: function() {
			return this._keyModes.slice(0);
		},
		/**
		 * Returns the line height for a given line index.  Returns the default line
		 * height if the line index is not specified.
		 *
		 * @param {Number} [lineIndex] the line index.
		 * @returns {Number} the height of the line in pixels.
		 *
		 * @see orion.editor.TextView#getLinePixel
		 */
		getLineHeight: function(lineIndex) {
			if (!this._clientDiv) { return 0; }
			return this._getLineHeight(lineIndex);
		},
		/**
		 * Returns the line index for a given line pixel position relative to the document.
		 *
		 * @param {Number} [y] the line pixel.
		 * @returns {Number} the line index for the specified pixel position.
		 *
		 * @see orion.editor.TextView#getLinePixel
		 */
		getLineIndex: function(y) {
			if (!this._clientDiv) { return 0; }
			return this._getLineIndex(y);
		},
		/**
		 * Returns the top pixel position of a given line index relative to the beginning
		 * of the document.
		 * <p>
		 * Clamps out of range indices.
		 * </p>
		 *
		 * @param {Number} lineIndex the line index.
		 * @returns {Number} the pixel position of the line.
		 *
		 * @see orion.editor.TextView#setTopPixel
		 * @see orion.editor.TextView#getLineIndex
		 * @see orion.editor.TextView#convert
		 */
		getLinePixel: function(lineIndex) {
			if (!this._clientDiv) { return 0; }
			return this._getLinePixel(lineIndex);
		},
		/**
		 * Returns the {x, y} pixel location of the top-left corner of the character
		 * bounding box at the specified offset in the document.  The pixel location
		 * is relative to the document.
		 * <p>
		 * Clamps out of range offsets.
		 * </p>
		 *
		 * @param {Number} offset the character offset
		 * @returns {Object} the {x, y} pixel location of the given offset.
		 *
		 * @see orion.editor.TextView#getOffsetAtLocation
		 * @see orion.editor.TextView#convert
		 */
		getLocationAtOffset: function(offset) {
			if (!this._clientDiv) { return {x: 0, y: 0}; }
			var model = this._model;
			offset = Math.min(Math.max(0, offset), model.getCharCount());
			var lineIndex = model.getLineAtOffset(offset);
			var line = this._getLine(lineIndex);
			var rect = line.getBoundingClientRect(offset);
			line.destroy();
			var x = rect.left;
			var y = this._getLinePixel(lineIndex) + rect.top;
			return {x: x, y: y};
		},
		/**
		 * Returns the next character offset after the given offset and options
		 *
		 * @param {Number} offset the offset to start from
		 * @param {Object} options
		 *   { unit: the type of unit to advance to (eg "character", "word", "wordend", "wordWS", "wordendWS"),
		 *    count: the number of units to advance (negative to advance backwards) }
		 * @returns {Number} the next character offset
		 */
		getNextOffset: function(offset, options) {
		  var selection = new Selection(offset, offset, false);
		  this._doMove(options, selection);
		  return selection.getCaret();
		},
        /**
		 * Returns the specified view options.
		 * <p>
		 * The returned value is either a <code>orion.editor.TextViewOptions</code> or an option value. An option value is returned when only one string paremeter
		 * is specified. A <code>orion.editor.TextViewOptions</code> is returned when there are no paremeters, or the parameters are a list of options names or a
		 * <code>orion.editor.TextViewOptions</code>. All view options are returned when there no paremeters.
		 * </p>
		 *
		 * @param {String|orion.editor.TextViewOptions} [options] The options to return.
		 * @return {Object|orion.editor.TextViewOptions} The requested options or an option value.
		 *
		 * @see orion.editor.TextView#setOptions
		 */
		getOptions: function() {
			var options;
			if (arguments.length === 0) {
				options = this._defaultOptions();
			} else if (arguments.length === 1) {
				var arg = arguments[0];
				if (typeof arg === "string") { //$NON-NLS-0$
					return clone(this["_" + arg]); //$NON-NLS-0$
				}
				options = arg;
			} else {
				options = {};
				for (var index in arguments) {
					if (arguments.hasOwnProperty(index)) {
						options[arguments[index]] = undefined;
					}
				}
			}
			for (var option in options) {
				if (options.hasOwnProperty(option)) {
					options[option] = clone(this["_" + option]); //$NON-NLS-0$
				}
			}
			return options;
		},
		/**
		 * Returns the text model of the text view.
		 *
		 * @returns {orion.editor.TextModel} the text model of the view.
		 */
		getModel: function() {
			return this._model;
		},
		/**
		 * Returns the character offset nearest to the given pixel location.  The
		 * pixel location is relative to the document.
		 *
		 * @param x the x of the location
		 * @param y the y of the location
		 * @returns {Number} the character offset at the given location.
		 *
		 * @see orion.editor.TextView#getLocationAtOffset
		 */
		getOffsetAtLocation: function(x, y) {
			if (!this._clientDiv) { return 0; }
			var lineIndex = this._getLineIndex(y);
			var line = this._getLine(lineIndex);
			var offset = line.getOffset(x, y - this._getLinePixel(lineIndex));
			line.destroy();
			return offset;
		},
		/**
		 * @name getLineAtOffset
		 * @description Compute the editor line number for the given offset
		 * @function
		 * @public
		 * @memberof orion.editor.TextView
		 * @param {Number} offset The offset into the editor
		 * @returns {Number} Returns the line number in the editor corresponding to the given offset or <code>-1</code> if the offset is 
		 * out of range
		 * @since 5.0
		 */
		getLineAtOffset: function(offset) {
			this.getModel().getLineAtOffset(offset);
		},
		/**
		 * @name getLineStart
		 * @description Compute the editor start offset of the given line number
		 * @function
		 * @public
		 * @memberof orion.editor.TextView
		 * @param {Number} line The line number in the editor
		 * @returns {Number} Returns the start offset of the given line number in the editor.
		 * @since 5.0
		 */
		getLineStart: function(line) {
			this.getModel().getLineStart(line);
		},
		/**
		 * Get the view rulers.
		 *
		 * @returns {orion.editor.Ruler[]} the view rulers
		 *
		 * @see orion.editor.TextView#addRuler
		 */
		getRulers: function() {
			return this._rulers.slice(0);
		},
		/**
		 * Returns the text view selection.
		 * <p>
		 * The selection is defined by a start and end character offset relative to the
		 * document. The character at end offset is not included in the selection.
		 * </p>
		 * 
		 * @returns {orion.editor.Selection} the view selection
		 *
		 * @see orion.editor.TextView#setSelection
		 */
		getSelection: function () {
			var s = this._getSelection();
			return {start: s.start, end: s.end};
		},
		/**
		 * Returns the text for the given range.
		 * <p>
		 * The text does not include the character at the end offset.
		 * </p>
		 *
		 * @param {Number} [start=0] the start offset of text range.
		 * @param {Number} [end=char count] the end offset of text range.
		 *
		 * @see orion.editor.TextView#setText
		 */
		getText: function(start, end) {
			var model = this._model;
			return model.getText(start, end);
		},
		/**
		 * Returns the top index.
		 * <p>
		 * The top index is the line that is currently at the top of the view.  This
		 * line may be partially visible depending on the vertical scroll of the view. The parameter
		 * <code>fullyVisible</code> determines whether to return only fully visible lines. 
		 * </p>
		 *
		 * @param {Boolean} [fullyVisible=false] if <code>true</code>, returns the index of the first fully visible line. This
		 *    parameter is ignored if the view is not big enough to show one line.
		 * @returns {Number} the index of the top line.
		 *
		 * @see orion.editor.TextView#getBottomIndex
		 * @see orion.editor.TextView#setTopIndex
		 */
		getTopIndex: function(fullyVisible) {
			if (!this._clientDiv) { return 0; }
			return this._getTopIndex(fullyVisible);
		},
		/**
		 * Returns the top pixel.
		 * <p>
		 * The top pixel is the pixel position that is currently at
		 * the top edge of the view.  This position is relative to the
		 * beginning of the document.
		 * </p>
		 *
		 * @returns {Number} the top pixel.
		 *
		 * @see orion.editor.TextView#getBottomPixel
		 * @see orion.editor.TextView#setTopPixel
		 * @see orion.editor.TextView#convert
		 */
		getTopPixel: function() {
			if (!this._clientDiv) { return 0; }
			return this._getScroll().y;
		},
		/**
		 * Executes the action handler associated with the given action ID.
		 * <p>
		 * The application defined action takes precedence over predefined actions unless
		 * the <code>defaultAction</code> paramater is <code>true</code>.
		 * </p>
		 * <p>
		 * If the application defined action returns <code>false</code>, the text view predefined
		 * action is executed if present.
		 * </p>
		 *
		 * @param {String} actionID the action ID.
		 * @param {Boolean} [defaultAction] whether to always execute the predefined action only.
		 * @param {Object} [actionOptions] action specific options to be passed to the action handlers.
		 * @returns {Boolean} <code>true</code> if the action was executed.
		 *
		 * @see orion.editor.TextView#setAction
		 * @see orion.editor.TextView#getActions
		 */
		invokeAction: function (actionID, defaultAction, actionOptions) {
			if (!this._clientDiv) { return; }
			var action = this._actions[actionID];
			if (action) {
				if (!defaultAction && action.handler) {
					if (action.handler(actionOptions)) {
						return true;
					}
				}
				if (action.defaultHandler) {
					return typeof action.defaultHandler(actionOptions) === "boolean"; //$NON-NLS-0$
				}
			}
			return false;
		},
		/**
		* Returns if the view is destroyed.
		* @returns {Boolean} <code>true</code> if the view is destroyed.
		*/
		isDestroyed: function () {
			return !this._clientDiv;
		},
		/** 
		 * @class This is the event sent when the user right clicks or otherwise invokes the context menu of the view. 
		 * <p> 
		 * <b>See:</b><br/> 
		 * {@link orion.editor.TextView}<br/> 
		 * {@link orion.editor.TextView#event:onContextMenu} 
		 * </p> 
		 * 
		 * @name orion.editor.ContextMenuEvent 
		 * 
		 * @property {Number} x The pointer location on the x axis, relative to the document the user is editing. 
		 * @property {Number} y The pointer location on the y axis, relative to the document the user is editing. 
		 * @property {Number} screenX The pointer location on the x axis, relative to the screen. This is copied from the DOM contextmenu event.screenX property. 
		 * @property {Number} screenY The pointer location on the y axis, relative to the screen. This is copied from the DOM contextmenu event.screenY property. 
		 * @property {Boolean} defaultPrevented Determines whether the user agent context menu should be shown. It is shown by default.
		 * @property {Function} preventDefault If called prevents the user agent context menu from showing.
		 */ 
		/** 
		 * This event is sent when the user invokes the view context menu. 
		 * 
		 * @event 
		 * @param {orion.editor.ContextMenuEvent} contextMenuEvent the event 
		 */ 
		onContextMenu: function(contextMenuEvent) {
			return this.dispatchEvent(contextMenuEvent); 
		}, 
		onDragStart: function(dragEvent) {
			return this.dispatchEvent(dragEvent);
		},
		onDrag: function(dragEvent) {
			return this.dispatchEvent(dragEvent);
		},
		onDragEnd: function(dragEvent) {
			return this.dispatchEvent(dragEvent);
		},
		onDragEnter: function(dragEvent) {
			return this.dispatchEvent(dragEvent);
		},
		onDragOver: function(dragEvent) {
			return this.dispatchEvent(dragEvent);
		},
		onDragLeave: function(dragEvent) {
			return this.dispatchEvent(dragEvent);
		},
		onDrop: function(dragEvent) {
			return this.dispatchEvent(dragEvent);
		},
		/**
		 * @class This is the event sent when the text view is destroyed.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.TextView}<br/>
		 * {@link orion.editor.TextView#event:onDestroy}
		 * </p>
		 * @name orion.editor.DestroyEvent
		 */
		/**
		 * This event is sent when the text view has been destroyed.
		 *
		 * @event
		 * @param {orion.editor.DestroyEvent} destroyEvent the event
		 *
		 * @see orion.editor.TextView#destroy
		 */
		onDestroy: function(destroyEvent) {
			return this.dispatchEvent(destroyEvent);
		},
		/**
		 * @class This object is used to define style information for the text view.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.TextView}<br/>
		 * {@link orion.editor.TextView#event:onLineStyle}
		 * </p>		 
		 * @name orion.editor.Style
		 * 
		 * @property {String} styleClass A CSS class name.
		 * @property {Object} style An object with CSS properties.
		 * @property {String} tagName A DOM tag name.
		 * @property {Object} attributes An object with DOM attributes.
		 */
		/**
		 * @class This object is used to style range.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.TextView}<br/>
		 * {@link orion.editor.TextView#event:onLineStyle}
		 * </p>		 
		 * @name orion.editor.StyleRange
		 * 
		 * @property {Number} start The start character offset, relative to the document, where the style should be applied.
		 * @property {Number} end The end character offset (exclusive), relative to the document, where the style should be applied.
		 * @property {orion.editor.Style} style The style for the range.
		 */
		/**
		 * @class This is the event sent when the text view needs the style information for a line.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.TextView}<br/>
		 * {@link orion.editor.TextView#event:onLineStyle}
		 * </p>		 
		 * @name orion.editor.LineStyleEvent
		 * 
		 * @property {orion.editor.TextView} textView The text view.		 
		 * @property {Number} lineIndex The line index.
		 * @property {String} lineText The line text.
		 * @property {Number} lineStart The character offset, relative to document, of the first character in the line.
		 * @property {orion.editor.Style} style The style for the entire line (output argument).
		 * @property {orion.editor.StyleRange[]} ranges An array of style ranges for the line (output argument).		 
		 */
		/**
		 * This event is sent when the text view needs the style information for a line.
		 *
		 * @event
		 * @param {orion.editor.LineStyleEvent} lineStyleEvent the event
		 */
		onLineStyle: function(lineStyleEvent) {
			return this.dispatchEvent(lineStyleEvent);
		},
		/**
		 * @class This is the event sent for all keyboard events.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.TextView}<br/>
		 * {@link orion.editor.TextView#event:onKeyDown}<br/>
		 * {@link orion.editor.TextView#event:onKeyPress}<br/>
		 * {@link orion.editor.TextView#event:onKeyUp}<br/>
		 * </p>
		 * @name orion.editor.KeyEvent
		 * 
		 * @property {String} type The type of event.
		 * @property {DOMEvent} event The key DOM event.
		 * @property {Boolean} defaultPrevented Determines whether the user agent context menu should be shown. It is shown by default.
		 * @property {Function} preventDefault If called prevents the user agent context menu from showing.
		 */
		/**
		 * This event is sent for key down events.
		 *
		 * @event
		 * @param {orion.editor.KeyEvent} keyEvent the event
		 */
		onKeyDown: function(keyEvent) {
			return this.dispatchEvent(keyEvent);
		},
		/**
		 * This event is sent for key press events. Key press events are only sent
		 * for printable characters.
		 *
		 * @event
		 * @param {orion.editor.KeyEvent} keyEvent the event
		 */
		onKeyPress: function(keyEvent) {
			return this.dispatchEvent(keyEvent);
		},
		/**
		 * This event is sent for key up events.
		 *
		 * @event
		 * @param {orion.editor.KeyEvent} keyEvent the event
		 */
		onKeyUp: function(keyEvent) {
			return this.dispatchEvent(keyEvent);
		},
		/**
		 * @class This is the event sent when the text in the model has changed.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.TextView}<br/>
		 * {@link orion.editor.TextView#event:onModelChanged}<br/>
		 * {@link orion.editor.TextModel#onChanged}
		 * </p>
		 * @name orion.editor.ModelChangedEvent
		 * 
		 * @property {Number} start The character offset in the model where the change has occurred.
		 * @property {Number} removedCharCount The number of characters removed from the model.
		 * @property {Number} addedCharCount The number of characters added to the model.
		 * @property {Number} removedLineCount The number of lines removed from the model.
		 * @property {Number} addedLineCount The number of lines added to the model.
		 */
		/**
		 * This event is sent when the text in the model has changed.
		 *
		 * @event
		 * @param {orion.editor.ModelChangedEvent} modelChangedEvent the event
		 */
		onModelChanged: function(modelChangedEvent) {
			return this.dispatchEvent(modelChangedEvent);
		},
		/**
		 * @class This is the event sent when the text in the model is about to change.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.TextView}<br/>
		 * {@link orion.editor.TextView#event:onModelChanging}<br/>
		 * {@link orion.editor.TextModel#onChanging}
		 * </p>
		 * @name orion.editor.ModelChangingEvent
		 * 
		 * @property {String} text The text that is about to be inserted in the model.
		 * @property {Number} start The character offset in the model where the change will occur.
		 * @property {Number} removedCharCount The number of characters being removed from the model.
		 * @property {Number} addedCharCount The number of characters being added to the model.
		 * @property {Number} removedLineCount The number of lines being removed from the model.
		 * @property {Number} addedLineCount The number of lines being added to the model.
		 */
		/**
		 * This event is sent when the text in the model is about to change.
		 *
		 * @event
		 * @param {orion.editor.ModelChangingEvent} modelChangingEvent the event
		 */
		onModelChanging: function(modelChangingEvent) {
			return this.dispatchEvent(modelChangingEvent);
		},
		/**
		 * @class This is the event sent when the text is modified by the text view.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.TextView}<br/>
		 * {@link orion.editor.TextView#event:onModify}
		 * </p>
		 * @name orion.editor.ModifyEvent
		 */
		/**
		 * This event is sent when the text view has changed text in the model.
		 * <p>
		 * If the text is changed directly through the model API, this event
		 * is not sent.
		 * </p>
		 *
		 * @event
		 * @param {orion.editor.ModifyEvent} modifyEvent the event
		 */
		onModify: function(modifyEvent) {
			return this.dispatchEvent(modifyEvent);
		},
		onMouseDown: function(mouseEvent) {
			return this.dispatchEvent(mouseEvent);
		},
		onMouseUp: function(mouseEvent) {
			return this.dispatchEvent(mouseEvent);
		},
		onMouseMove: function(mouseEvent) {
			return this.dispatchEvent(mouseEvent);
		},
		onMouseOver: function(mouseEvent) {
			return this.dispatchEvent(mouseEvent);
		},
		onMouseOut: function(mouseEvent) {
			return this.dispatchEvent(mouseEvent);
		},
		/**
		 * @class This is the event sent when the selection changes in the text view.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.TextView}<br/>
		 * {@link orion.editor.TextView#event:onSelection}
		 * </p>		 
		 * @name orion.editor.SelectionEvent
		 * 
		 * @property {orion.editor.Selection} oldValue The old selection.
		 * @property {orion.editor.Selection} newValue The new selection.
		 */
		/**
		 * This event is sent when the text view selection has changed.
		 *
		 * @event
		 * @param {orion.editor.SelectionEvent} selectionEvent the event
		 */
		onSelection: function(selectionEvent) {
			return this.dispatchEvent(selectionEvent);
		},
		/**
		 * @class This is the event sent when the text view scrolls.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.TextView}<br/>
		 * {@link orion.editor.TextView#event:onScroll}
		 * </p>		 
		 * @name orion.editor.ScrollEvent
		 * 
		 * @property {Object} oldValue The old scroll {x,y}.
		 * @property {Object} newValue The new scroll {x,y}.
		 */
		/**
		 * This event is sent when the text view scrolls vertically or horizontally.
		 *
		 * @event
		 * @param {orion.editor.ScrollEvent} scrollEvent the event
		 */
		onScroll: function(scrollEvent) {
			return this.dispatchEvent(scrollEvent);
		},
		/**
		 * @class This is the event sent when the text is about to be modified by the text view.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.TextView}<br/>
		 * {@link orion.editor.TextView#event:onVerify}
		 * </p>
		 * @name orion.editor.VerifyEvent
		 * 
		 * @property {String} text The text being inserted.
		 * @property {Number} start The start offset of the text range to be replaced.
		 * @property {Number} end The end offset (exclusive) of the text range to be replaced.
		 */
		/**
		 * This event is sent when the text view is about to change text in the model.
		 * <p>
		 * If the text is changed directly through the model API, this event
		 * is not sent.
		 * </p>
		 * <p>
		 * Listeners are allowed to change these parameters. Setting text to null
		 * or undefined stops the change.
		 * </p>
		 *
		 * @event
		 * @param {orion.editor.VerifyEvent} verifyEvent the event
		 */
		onVerify: function(verifyEvent) {
			return this.dispatchEvent(verifyEvent);
		},
		/**
		 * @class This is the event sent when the text view is focused.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.TextView}<br/>
		 * {@link orion.editor.TextView#event:onFocus}<br/>
		 * </p>
		 * @name orion.editor.FocusEvent
		 */
		/**
		 * This event is sent when the text view is focused.
		 *
		 * @event
		 * @param {orion.editor.FocusEvent} focusEvent the event
		 */
		onFocus: function(focusEvent) {
			return this.dispatchEvent(focusEvent);
		},
		/**
		 * @class This is the event sent when the text view goes out of focus.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.TextView}<br/>
		 * {@link orion.editor.TextView#event:onBlur}<br/>
		 * </p>
		 * @name orion.editor.BlurEvent
		 */
		/**
		 * This event is sent when the text view goes out of focus.
		 *
		 * @event
		 * @param {orion.editor.BlurEvent} blurEvent the event
		 */
		onBlur: function(blurEvent) {
			return this.dispatchEvent(blurEvent);
		},
		/**
		 * Redraws the entire view, including rulers.
		 *
		 * @see orion.editor.TextView#redrawLines
		 * @see orion.editor.TextView#redrawRange
		 * @see orion.editor.TextView#setRedraw
		 */
		redraw: function() {
			if (this._redrawCount > 0) { return; }
			var lineCount = this._model.getLineCount();
			this.redrawRulers(0, lineCount);
			this.redrawLines(0, lineCount); 
		},
		redrawRulers: function(startLine, endLine) {
			if (this._redrawCount > 0) { return; }
			var rulers = this.getRulers();
			for (var i = 0; i < rulers.length; i++) {
				this.redrawLines(startLine, endLine, rulers[i]);
			}
		},
		/**
		 * Redraws the text in the given line range.
		 * <p>
		 * The line at the end index is not redrawn.
		 * </p>
		 *
		 * @param {Number} [startLine=0] the start line
		 * @param {Number} [endLine=line count] the end line
		 *
		 * @see orion.editor.TextView#redraw
		 * @see orion.editor.TextView#redrawRange
		 * @see orion.editor.TextView#setRedraw
		 */
		redrawLines: function(startLine, endLine, ruler) {
			if (this._redrawCount > 0) { return; }
			if (startLine === undefined) { startLine = 0; }
			if (endLine === undefined) { endLine = this._model.getLineCount(); }
			if (startLine === endLine) { return; }
			var div = this._clientDiv;
			if (!div) { return; }
			if (ruler) {
				var divRuler = this._getRulerParent(ruler);
				div = divRuler.firstChild;
				while (div) {
					if (div._ruler === ruler) {
						break;
					}
					div = div.nextSibling;
				}
			}
			if (ruler) {
				div.rulerChanged = true;
			} else {
				if (this._lineHeight) {
					this._resetLineHeight(startLine, endLine);
				}
			}
			if (!ruler || ruler.getOverview() === "page") { //$NON-NLS-0$
				var child = div.firstChild;
				while (child) {
					var lineIndex = child.lineIndex;
					if (startLine <= lineIndex && lineIndex < endLine) {
						child.lineChanged = true;
					}
					child = child.nextSibling;
				}
			}
			if (!ruler) {
				if (!this._wrapMode) {
					if (startLine <= this._maxLineIndex && this._maxLineIndex < endLine) {
						this._checkMaxLineIndex = this._maxLineIndex;
						this._maxLineIndex = -1;
						this._maxLineWidth = 0;
					}
				}
			}
			this._queueUpdate();
		},
		/**
		 * Redraws the text in the given range.
		 * <p>
		 * The character at the end offset is not redrawn.
		 * </p>
		 *
		 * @param {Number} [start=0] the start offset of text range
		 * @param {Number} [end=char count] the end offset of text range
		 *
		 * @see orion.editor.TextView#redraw
		 * @see orion.editor.TextView#redrawLines
		 * @see orion.editor.TextView#setRedraw
		 */
		redrawRange: function(start, end) {
			if (this._redrawCount > 0) { return; }
			var model = this._model;
			if (start === undefined) { start = 0; }
			if (end === undefined) { end = model.getCharCount(); }
			var startLine = model.getLineAtOffset(start);
			var endLine = model.getLineAtOffset(Math.max(start, end - 1)) + 1;
			this.redrawLines(startLine, endLine);
		},	
		/**
		 * Removes a key mode from the text view.
		 *
		 * @param {orion.editor.KeyMode} mode the key mode.
		 */
		removeKeyMode: function (mode) {
			var keyModes = this._keyModes;
			for (var i=0; i<keyModes.length; i++) {
				if (keyModes[i] === mode) {
					keyModes.splice(i, 1);
					break;
				}
			}
			//TODO: API needed for this
			if (mode._modeRemoved) {
				mode._modeRemoved();
			}
		},
		/**
		 * Removes a ruler from the text view.
		 *
		 * @param {orion.editor.Ruler} ruler the ruler.
		 */
		removeRuler: function (ruler) {
			var rulers = this._rulers;
			for (var i=0; i<rulers.length; i++) {
				if (rulers[i] === ruler) {
					rulers.splice(i, 1);
					ruler.setView(null);
					this._destroyRuler(ruler);
					this._update();
					break;
				}
			}
		},
		resize: function() {
			if (!this._clientDiv) { return; }
			this._handleResize(null);
		},
		/**
		 * @class This object describes an action for the text view.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.TextView}<br/>
		 * {@link orion.editor.TextView#setAction}
		 * </p>		 
		 * @name orion.editor.ActionDescription
		 *
		 * @property {String} [name] the name to be used when showing the action as text.
		 */
		/**
		 * Associates an application defined handler to an action ID.
		 * <p>
		 * If the action ID is a predefined action, the given handler executes before
		 * the default action handler.  If the given handler returns <code>true</code>, the
		 * default action handler is not called.
		 * </p>
		 *
		 * @param {String} actionID the action ID.
		 * @param {Function} handler the action handler.
		 * @param {orion.editor.ActionDescription} [actionDescription=undefined] the action description.
		 *
		 * @see orion.editor.TextView#getActions
		 * @see orion.editor.TextView#invokeAction
		 */
		setAction: function(actionID, handler, actionDescription) {
			if (!actionID) { return; }
			var actions = this._actions;
			var action = actions[actionID];
			if (!action) { 
				action = actions[actionID] = {};
			}
			action.handler = handler;
			if (actionDescription !== undefined) {
				action.actionDescription = actionDescription;
			}
		},
		/**
		 * Associates a key binding with the given action ID. Any previous
		 * association with the specified key binding is overwriten. If the
		 * action ID is <code>null</code>, the association is removed.
		 * 
		 * @param {orion.editor.KeyBinding} keyBinding the key binding
		 * @param {String} actionID the action ID
		 */
		setKeyBinding: function(keyBinding, actionID) {
			this._keyModes[0].setKeyBinding(keyBinding, actionID);
		},
		/**
		 * Sets the caret offset relative to the start of the document.
		 *
		 * @param {Number} caret the caret offset relative to the start of the document.
		 * @param {Boolean|Number} [show=true] if <code>true</code>, the view will scroll the minimum amount necessary to show the caret location. If
		 *					<code>show</code> is a <code>Number</code>, the view will scroll the minimum amount necessary to show the caret location plus a
		 *					percentage of the client area height. The parameter is clamped to the [0,1] range.  In either case, the view will only scroll
		 *					if the new caret location is visible already.
		 * @param {Function} [callback] if callback is specified and <code>scrollAnimation</code> is not zero, view scrolling is animated and
		 *					the callback is called when the animation is done. Otherwise, callback is callback right away.
		 *
		 * @see orion.editor.TextView#getCaretOffset
		 * @see orion.editor.TextView#setSelection
		 * @see orion.editor.TextView#getSelection
		 */
		setCaretOffset: function(offset, show, callback) {
			var charCount = this._model.getCharCount();
			offset = Math.max(0, Math.min (offset, charCount));
			var selection = new Selection(offset, offset, false);
			this._setSelection (selection, show === undefined || show, true, callback);
		},
		/**
		 * Sets the horizontal pixel.
		 * <p>
		 * The horizontal pixel is the pixel position that is currently at
		 * the left edge of the view.  This position is relative to the
		 * beginning of the document.
		 * </p>
		 *
		 * @param {Number} pixel the horizontal pixel.
		 *
		 * @see orion.editor.TextView#getHorizontalPixel
		 * @see orion.editor.TextView#convert
		 */
		setHorizontalPixel: function(pixel) {
			if (!this._clientDiv) { return; }
			pixel = Math.max(0, pixel);
			this._scrollView(pixel - this._getScroll().x, 0);
		},
		/**
		 * Sets whether the view should update the DOM.
		 * <p>
		 * This can be used to improve the performance.
		 * </p><p>
		 * When the flag is set to <code>true</code>,
		 * the entire view is marked as needing to be redrawn. 
		 * Nested calls to this method are stacked.
		 * </p>
		 *
		 * @param {Boolean} redraw the new redraw state
		 * 
		 * @see orion.editor.TextView#redraw
		 */
		setRedraw: function(redraw) {
			if (redraw) {
				if (--this._redrawCount === 0) {
					this.redraw();
				}
			} else {
				this._redrawCount++;
			}
		},
		/**
		 * Sets the text model of the text view.
		 *
		 * @param {orion.editor.TextModel} model the text model of the view.
		 */
		setModel: function(model) {
			if (!model) { return; }
			if (model === this._model) { return; }
			this._model.removeEventListener("preChanging", this._modelListener.onChanging); //$NON-NLS-0$
			this._model.removeEventListener("postChanged", this._modelListener.onChanged); //$NON-NLS-0$
			var oldLineCount = this._model.getLineCount();
			var oldCharCount = this._model.getCharCount();
			var newLineCount = model.getLineCount();
			var newCharCount = model.getCharCount();
			var newText = model.getText();
			var e = {
				type: "ModelChanging", //$NON-NLS-0$
				text: newText,
				start: 0,
				removedCharCount: oldCharCount,
				addedCharCount: newCharCount,
				removedLineCount: oldLineCount,
				addedLineCount: newLineCount
			};
			this.onModelChanging(e);
			this._model = model;
			e = {
				type: "ModelChanged", //$NON-NLS-0$
				start: 0,
				removedCharCount: oldCharCount,
				addedCharCount: newCharCount,
				removedLineCount: oldLineCount,
				addedLineCount: newLineCount
			};
			this.onModelChanged(e); 
			this._model.addEventListener("preChanging", this._modelListener.onChanging); //$NON-NLS-0$
			this._model.addEventListener("postChanged", this._modelListener.onChanged); //$NON-NLS-0$
			this._reset();
			this._update();
		},
		/**
		 * Sets the view options for the view.
		 *
		 * @param {orion.editor.TextViewOptions} options the view options.
		 * 
		 * @see orion.editor.TextView#getOptions
		 */
		setOptions: function (options) {
			var defaultOptions = this._defaultOptions();
			for (var option in options) {
				if (options.hasOwnProperty(option)) {
					var newValue = options[option], oldValue = this["_" + option]; //$NON-NLS-0$
					if (compare(oldValue, newValue)) { continue; }
					var update = defaultOptions[option] ? defaultOptions[option].update : null;
					if (update) {
						update.call(this, newValue);
						continue;
					}
					this["_" + option] = clone(newValue); //$NON-NLS-0$
				}
			}
		},
		/**
		 * Sets the text view selection.
		 * <p>
		 * The selection is defined by a start and end character offset relative to the
		 * document. The character at end offset is not included in the selection.
		 * </p>
		 * <p>
		 * The caret is always placed at the end offset. The start offset can be
		 * greater than the end offset to place the caret at the beginning of the
		 * selection.
		 * </p>
		 * <p>
		 * Clamps out of range offsets.
		 * </p>
		 * 
		 * @param {Number} start the start offset of the selection
		 * @param {Number} end the end offset of the selection
		 * @param {Boolean|Number} [show=true] if <code>true</code>, the view will scroll the minimum amount necessary to show the caret location. If
		 *					<code>show</code> is a <code>Number</code>, the view will scroll the minimum amount necessary to show the caret location plus a
		 *					percentage of the client area height. The parameter is clamped to the [0,1] range.  In either case, the view will only scroll
		 *					if the new caret location is visible already.
		 * @param {Function} [callback] if callback is specified and <code>scrollAnimation</code> is not zero, view scrolling is animated and
		 *					the callback is called when the animation is done. Otherwise, callback is callback right away.
		 *
		 * @see orion.editor.TextView#getSelection
		 */
		setSelection: function (start, end, show, callback) {
			var caret = start > end;
			if (caret) {
				var tmp = start;
				start = end;
				end = tmp;
			}
			var charCount = this._model.getCharCount();
			start = Math.max(0, Math.min (start, charCount));
			end = Math.max(0, Math.min (end, charCount));
			var selection = new Selection(start, end, caret);
			this._setSelection(selection, show === undefined || show, true, callback);
		},
		/**
		 * Replaces the text in the given range with the given text.
		 * <p>
		 * The character at the end offset is not replaced.
		 * </p>
		 * <p>
		 * When both <code>start</code> and <code>end</code> parameters
		 * are not specified, the text view places the caret at the beginning
		 * of the document and scrolls to make it visible.
		 * </p>
		 *
		 * @param {String} text the new text.
		 * @param {Number} [start=0] the start offset of text range.
		 * @param {Number} [end=char count] the end offset of text range.
		 *
		 * @see orion.editor.TextView#getText
		 */
		setText: function (text, start, end) {
			var reset = start === undefined && end === undefined;
			if (start === undefined) { start = 0; }
			if (end === undefined) { end = this._model.getCharCount(); }
			if (reset) {
				this._variableLineHeight = false;
			}
			this._modifyContent({text: text, start: start, end: end, _code: true}, !reset);
			if (reset) {
				this._columnX = -1;
				this._setSelection(new Selection (0, 0, false), true);
				
				/*
				* Bug in Firefox.  For some reason, the caret does not show after the
				* view is refreshed.  The fix is to toggle the contentEditable state and
				* force the clientDiv to loose and receive focus if it is focused.
				*/
				if (util.isFirefox) {
					this._fixCaret();
				}
			}
		},
		/**
		 * Sets the top index.
		 * <p>
		 * The top index is the line that is currently at the top of the text view.  This
		 * line may be partially visible depending on the vertical scroll of the view.
		 * </p>
		 *
		 * @param {Number} topIndex the index of the top line.
		 *
		 * @see orion.editor.TextView#getBottomIndex
		 * @see orion.editor.TextView#getTopIndex
		 */
		setTopIndex: function(topIndex) {
			if (!this._clientDiv) { return; }
			this._scrollView(0, this._getLinePixel(Math.max(0, topIndex)) - this._getScroll().y);
		},
		/**
		 * Sets the top pixel.
		 * <p>
		 * The top pixel is the pixel position that is currently at
		 * the top edge of the view.  This position is relative to the
		 * beginning of the document.
		 * </p>
		 *
		 * @param {Number} pixel the top pixel.
		 *
		 * @see orion.editor.TextView#getBottomPixel
		 * @see orion.editor.TextView#getTopPixel
		 * @see orion.editor.TextView#convert
		 */
		setTopPixel: function(pixel) {
			if (!this._clientDiv) { return; }
			this._scrollView(0, Math.max(0, pixel) - this._getScroll().y);
		},
		/**
		 * Scrolls the selection into view if needed.
		 *
		 * @returns {Boolean} true if the view was scrolled.
		 *
		 * @see orion.editor.TextView#getSelection
		 * @see orion.editor.TextView#setSelection
		 */
		showSelection: function() {
			return this._showCaret(true);
		},
		update: function(styleChanged, sync) {
			if (!this._clientDiv) { return; }
			if (styleChanged) {
				this._updateStyle();
			}
			if (sync === undefined || sync) {
				this._update();
			} else {
				this._queueUpdate();
			}
		},
		
		/**************************************** Event handlers *********************************/
		_handleRootMouseDown: function (e) {
			if (this._ignoreEvent(e)) { return; }
			if (util.isFirefox && e.which === 1) {
				this._clientDiv.contentEditable = false;
				(this._overlayDiv || this._clientDiv).draggable = true;
				this._ignoreBlur = true;
			}
			
			/* Prevent clicks outside of the client div from taking focus away. */
			var topNode = this._overlayDiv || this._clientDiv;
			/* Use view div on IE 8 otherwise it is not possible to scroll. */
			if (util.isIE < 9) { topNode = this._viewDiv; }
			var temp = e.target ? e.target : e.srcElement;
			while (temp) {
				if (topNode === temp) {
					return;
				}
				temp = temp.parentNode;
			}
			if (e.preventDefault) { e.preventDefault(); }
			if (e.stopPropagation){ e.stopPropagation(); }
			if (!this._isW3CEvents) {
				/*
				* In IE 8 is not possible to prevent the default handler from running
				* during mouse down event using usual API. The workaround is to give
				* focus back to the client div.
				*/ 
				var self = this;
				var window = this._getWindow();
				window.setTimeout(function() {
					self._clientDiv.focus();
				}, 0);
			}
		},
		_handleRootMouseUp: function (e) {
			if (this._ignoreEvent(e)) { return; }
			if (util.isFirefox && e.which === 1) {
				this._clientDiv.contentEditable = true;
				(this._overlayDiv || this._clientDiv).draggable = false;
				
				/*
				* Bug in Firefox.  For some reason, Firefox stops showing the caret
				* in some cases. For example when the user cancels a drag operation 
				* by pressing ESC.  The fix is to detect that the drag operation was
				* cancelled,  toggle the contentEditable state and force the clientDiv
				* to loose and receive focus if it is focused.
				*/
				this._fixCaret();
				this._ignoreBlur = false;
			}
		},
		_handleBlur: function (e) {
			if (this._ignoreBlur) { return; }
			this._hasFocus = false;
			/*
			* Bug in IE 8 and earlier. For some reason when text is deselected
			* the overflow selection at the end of some lines does not get redrawn.
			* The fix is to create a DOM element in the body to force a redraw.
			*/
			if (util.isIE < 9) {
				if (!this._getSelection().isEmpty()) {
					var rootDiv = this._rootDiv;
					var child = util.createElement(rootDiv.ownerDocument, "div"); //$NON-NLS-0$
					rootDiv.appendChild(child);
					rootDiv.removeChild(child);
				}
			}
			if (this._cursorDiv) {
				this._cursorDiv.style.display = "none"; //$NON-NLS-0$
			}
			if (this._selDiv1) {
				var color = "lightgray"; //$NON-NLS-0$
				this._selDiv1.style.background = color;
				this._selDiv2.style.background = color;
				this._selDiv3.style.background = color;
				/* Clear browser selection if selection is within clientDiv */
				var temp;
				var window = this._getWindow();
				var document = this._selDiv1.ownerDocument;
				if (window.getSelection) {
					var sel = window.getSelection();
					temp = sel.anchorNode;
					while (temp) {
						if (temp === this._clientDiv) {
							if (sel.rangeCount > 0) { sel.removeAllRanges(); }
							break;
						}
						temp = temp.parentNode;
					}
				} else if (document.selection) {
					this._ignoreSelect = false;
					temp = document.selection.createRange().parentElement();
					while (temp) {
						if (temp === this._clientDiv) {
							document.selection.empty();
							break;
						}
						temp = temp.parentNode;
					}
					this._ignoreSelect = true;
				}
			}
			if (!this._ignoreFocus) {
				this.onBlur({type: "Blur"}); //$NON-NLS-0$
			}
		},
		_handleContextMenu: function (e) {
			if (this._ignoreEvent(e)) { return; }
			if (util.isIE && this._lastMouseButton === 3) {
				// We need to update the DOM selection, because on
				// right-click the caret moves to the mouse location.
				// See bug 366312 and 376508.
				this._updateDOMSelection();
			}
			var preventDefault = false;
			if (this.isListening("ContextMenu")) { //$NON-NLS-0$
				var evt = this._createMouseEvent("ContextMenu", e); //$NON-NLS-0$
				evt.screenX = e.screenX;
				evt.screenY = e.screenY;
				this.onContextMenu(evt);
				preventDefault = evt.defaultPrevented;
			} else if (util.isMac && util.isFirefox && e.button === 0) {
				// hack to prevent CTRL+Space from showing the browser context menu
				preventDefault = true;
			}
			if (preventDefault) {
				if (e.preventDefault) { e.preventDefault(); }
				return false;
			}
		},
		_handleCopy: function (e) {
			if (this._ignoreEvent(e)) { return; }
			if (this._ignoreCopy) { return; }
			if (this._doCopy(e)) {
				if (e.preventDefault) { e.preventDefault(); }
				return false;
			}
		},
		_handleCut: function (e) {
			if (this._ignoreEvent(e)) { return; }
			if (this._doCut(e)) {
				if (e.preventDefault) { e.preventDefault(); }
				return false;
			}
		},
		_handleDataModified: function(e) {
			if (this._ignoreEvent(e)) { return; }
			this._startIME();
		},
		_handleDblclick: function (e) {
			if (this._ignoreEvent(e)) { return; }
			var time = e.timeStamp ? e.timeStamp : new Date().getTime();
			this._lastMouseTime = time;
			if (this._clickCount !== 2) {
				this._clickCount = 2;
				this._handleMouse(e);
			}
		},
		_handleDragStart: function (e) {
			if (this._ignoreEvent(e)) { return; }
			if (util.isFirefox) {
				var self = this;
				var window = this._getWindow();
				window.setTimeout(function() {
					self._clientDiv.contentEditable = true;
					self._clientDiv.draggable = false;
					self._ignoreBlur = false;
				}, 0);
			}
			if (this.isListening("DragStart") && this._dragOffset !== -1) { //$NON-NLS-0$
				this._isMouseDown = false;
				this.onDragStart(this._createMouseEvent("DragStart", e)); //$NON-NLS-0$
				this._dragOffset = -1;
			} else {
				if (e.preventDefault) { e.preventDefault(); }
				return false;
			}
		},
		_handleDrag: function (e) {
			if (this._ignoreEvent(e)) { return; }
			if (this.isListening("Drag")) { //$NON-NLS-0$
				this.onDrag(this._createMouseEvent("Drag", e)); //$NON-NLS-0$
			}
		},
		_handleDragEnd: function (e) {
			if (this._ignoreEvent(e)) { return; }
			this._dropTarget = false;
			this._dragOffset = -1;
			if (this.isListening("DragEnd")) { //$NON-NLS-0$
				this.onDragEnd(this._createMouseEvent("DragEnd", e)); //$NON-NLS-0$
			}
			if (util.isFirefox) {
				this._fixCaret();
				/*
				* Bug in Firefox.  For some reason, Firefox stops showing the caret when the 
				* selection is dropped onto itself. The fix is to detected the case and 
				* call fixCaret() a second time.
				*/
				if (e.dataTransfer.dropEffect === "none" && !e.dataTransfer.mozUserCancelled) { //$NON-NLS-0$
					this._fixCaret();
				}
			}
		},
		_handleDragEnter: function (e) {
			if (this._ignoreEvent(e)) { return; }
			var prevent = true;
			this._dropTarget = true;
			if (this.isListening("DragEnter")) { //$NON-NLS-0$
				prevent = false;
				this.onDragEnter(this._createMouseEvent("DragEnter", e)); //$NON-NLS-0$
			}
			/*
			* Webkit will not send drop events if this event is not prevented, as spec in HTML5.
			* Firefox and IE do not follow this spec for contentEditable. Note that preventing this 
			* event will result is loss of functionality (insertion mark, etc).
			*/
			if (util.isWebkit || prevent) {
				if (e.preventDefault) { e.preventDefault(); }
				return false;
			}
		},
		_handleDragOver: function (e) {
			if (this._ignoreEvent(e)) { return; }
			var prevent = true;
			if (this.isListening("DragOver")) { //$NON-NLS-0$
				prevent = false;
				this.onDragOver(this._createMouseEvent("DragOver", e)); //$NON-NLS-0$
			}
			/*
			* Webkit will not send drop events if this event is not prevented, as spec in HTML5.
			* Firefox and IE do not follow this spec for contentEditable. Note that preventing this 
			* event will result is loss of functionality (insertion mark, etc).
			*/
			if (util.isWebkit || prevent) {
				if (prevent) { e.dataTransfer.dropEffect = "none"; } //$NON-NLS-0$
				if (e.preventDefault) { e.preventDefault(); }
				return false;
			}
		},
		_handleDragLeave: function (e) {
			if (this._ignoreEvent(e)) { return; }
			this._dropTarget = false;
			if (this.isListening("DragLeave")) { //$NON-NLS-0$
				this.onDragLeave(this._createMouseEvent("DragLeave", e)); //$NON-NLS-0$
			}
		},
		_handleDrop: function (e) {
			if (this._ignoreEvent(e)) { return; }
			this._dropTarget = false;
			if (this.isListening("Drop")) { //$NON-NLS-0$
				this.onDrop(this._createMouseEvent("Drop", e)); //$NON-NLS-0$
			}
			/*
			* This event must be prevented otherwise the user agent will modify
			* the DOM. Note that preventing the event on some user agents (i.e. IE)
			* indicates that the operation is cancelled. This causes the dropEffect to 
			* be set to none  in the dragend event causing the implementor to not execute
			* the code responsible by the move effect.
			*/
			if (e.preventDefault) { e.preventDefault(); }
			return false;
		},
		_handleFocus: function (e) {
			this._hasFocus = true;
			if (util.isIOS && this._lastTouchOffset !== undefined) {
				this.setCaretOffset(this._lastTouchOffset, true);
				this._lastTouchOffset = undefined;
			} else {
				this._updateDOMSelection();
			}
			if (this._cursorDiv) {
				this._cursorDiv.style.display = "block"; //$NON-NLS-0$
			}
			if (this._selDiv1) {
				var color = this._highlightRGB;
				this._selDiv1.style.background = color;
				this._selDiv2.style.background = color;
				this._selDiv3.style.background = color;
			}
			if (!this._ignoreFocus) {
				this.onFocus({type: "Focus"}); //$NON-NLS-0$
			}
		},
		_handleKeyDown: function (e) {
			if (this._ignoreEvent(e)) {	return;	}
			if (this.isListening("KeyDown")) { //$NON-NLS-0$
				var keyEvent = this._createKeyEvent("KeyDown", e); //$NON-NLS-0$
				this.onKeyDown(keyEvent); //$NON-NLS-0$
				if (keyEvent.defaultPrevented) {
					/*
					* Feature in Firefox. Keypress events still happen even if the keydown event
					* was prevented. The fix is to remember that keydown was prevented and prevent
					* the keypress ourselves.
					*/
					if (util.isFirefox) {
						this._keyDownPrevented = true;
					}
					e.preventDefault();
					return;
				}
			}
			var modifier = false;
			switch (e.keyCode) {
				case 16: /* Shift */
				case 17: /* Control */
				case 18: /* Alt */
				case 91: /* Command */
					modifier = true;
					break;
				default:
					this._setLinksVisible(false);
			}
			if (e.keyCode === 229) {
				if (this._readonly) {
					if (e.preventDefault) { e.preventDefault(); }
					return false;
				}
				var startIME = true;
				
				/*
				* Bug in Safari. Some Control+key combinations send key events
				* with keyCode equals to 229. This is unexpected and causes the
				* view to start an IME composition. The fix is to ignore these
				* events.
				*/
				if (util.isSafari && util.isMac) {
					if (e.ctrlKey) {
						startIME = false;
						e.keyCode = 0x81;
					}
				}
				if (startIME) {
					this._startIME();
				}
			} else {
				if (!modifier) {
					this._commitIME();
				}
			}
			/*
			* Feature in Firefox. When a key is held down the browser sends 
			* right number of keypress events but only one keydown. This is
			* unexpected and causes the view to only execute an action
			* just one time. The fix is to ignore the keydown event and 
			* execute the actions from the keypress handler.
			* Note: This only happens on the Mac and Linux (Firefox 3.6).
			*
			* Feature in Opera < 12.16.  Opera sends keypress events even for non-printable
			* keys.  The fix is to handle actions in keypress instead of keydown.
			*/
			if (((util.isMac || util.isLinux) && util.isFirefox < 4) || util.isOpera < 12.16) {
				this._keyDownEvent = e;
				return true;
			}
			
			if (this._doAction(e)) {
				if (e.preventDefault) {
					e.preventDefault(); 
					e.stopPropagation(); 
				} else {
					e.cancelBubble = true;
					e.returnValue = false;
					e.keyCode = 0;
				}
				return false;
			}
		},
		_handleKeyPress: function (e) {
			if (this._ignoreEvent(e)) { return; }
			/*
			* Feature in Firefox. Keypress events still happen even if the keydown event
			* was prevented. The fix is to remember that keydown was prevented and prevent
			* the keypress ourselves.
			*/
			if (this._keyDownPrevented) { 
				if (e.preventDefault) {
					e.preventDefault(); 
					e.stopPropagation(); 
				} 
				this._keyDownPrevented = undefined;
				return;
			}
			/*
			* Feature in Embedded WebKit.  Embedded WekKit on Mac runs in compatibility mode and
			* generates key press events for these Unicode values (Function keys).  This does not
			* happen in Safari or Chrome.  The fix is to ignore these key events.
			*/
			if (util.isMac && util.isWebkit) {
				if ((0xF700 <= e.keyCode && e.keyCode <= 0xF7FF) || e.keyCode === 13 || e.keyCode === 8) {
					if (e.preventDefault) { e.preventDefault(); }
					return false;
				}
			}
			if (((util.isMac || util.isLinux) && util.isFirefox < 4) || util.isOpera < 12.16) {
				if (this._doAction(this._keyDownEvent)) {
					if (e.preventDefault) { e.preventDefault(); }
					return false;
				}
			}
			var ctrlKey = util.isMac ? e.metaKey : e.ctrlKey;
			if (e.charCode !== undefined) {
				if (ctrlKey) {
					switch (e.charCode) {
						/*
						* In Firefox and Safari if ctrl+v, ctrl+c ctrl+x is canceled
						* the clipboard events are not sent. The fix to allow
						* the browser to handles these key events.
						*/
						case 99://c
						case 118://v
						case 120://x
							return true;
					}
				}
			}
			if (this.isListening("KeyPress")) { //$NON-NLS-0$
				var keyEvent = this._createKeyEvent("KeyPress", e); //$NON-NLS-0$
				this.onKeyPress(keyEvent); //$NON-NLS-0$
				if (keyEvent.defaultPrevented) {
					e.preventDefault();
					return;
				}
			}
			if (this._doAction(e)) {
				if (e.preventDefault) {
					e.preventDefault(); 
					e.stopPropagation(); 
				} else {
					e.cancelBubble = true;
					e.returnValue = false;
					e.keyCode = 0;
				}
				return false;
			}
			var ignore = false;
			if (util.isMac) {
				if (e.ctrlKey || e.metaKey) { ignore = true; }
			} else {
				if (util.isFirefox) {
					//Firefox clears the state mask when ALT GR generates input
					if (e.ctrlKey || e.altKey) { ignore = true; }
				} else {
					//IE and Chrome only send ALT GR when input is generated
					if (e.ctrlKey ^ e.altKey) { ignore = true; }
				}
			}
			if (!ignore) {
				var key = util.isOpera ? e.which : (e.charCode !== undefined ? e.charCode : e.keyCode);
				if (key > 31) {
					this._doContent(String.fromCharCode (key));
					if (e.preventDefault) { e.preventDefault(); }
					return false;
				}
			}
		},
		_handleDocKeyUp: function (e) {
			var ctrlKey = util.isMac ? e.metaKey : e.ctrlKey;
			if (!ctrlKey) {
				this._setLinksVisible(false);
			}
		},
		_handleKeyUp: function (e) {
			if (this._ignoreEvent(e)) { return; }
			if (this.isListening("KeyUp")) { //$NON-NLS-0$
				var keyEvent = this._createKeyEvent("KeyUp", e); //$NON-NLS-0$
				this.onKeyUp(keyEvent); //$NON-NLS-0$
				if (keyEvent.defaultPrevented) {
					e.preventDefault();
					return;
				}
			}
			this._handleDocKeyUp(e);
			// don't commit for space (it happens during JP composition)  
			if (e.keyCode === 13) {
				this._commitIME();
			}
		},
		_handleLinkClick: function (e) {
			var ctrlKey = util.isMac ? e.metaKey : e.ctrlKey;
			if (!ctrlKey) {
				if (e.preventDefault) { e.preventDefault(); }
				return false;
			}
		},
		_handleMouse: function (e) {
			var window = this._getWindow();
			var result = true;
			var target = window;
			if (util.isIE || (util.isFirefox && !this._overlayDiv)) { target = this._clientDiv; }
			if (this._overlayDiv) {
				if (this._hasFocus) {
					this._ignoreFocus = true;
				}
				var self = this;
				window.setTimeout(function () {
					self.focus();
					self._ignoreFocus = false;
				}, 0);
			}
			if (this._clickCount === 1) {
				result = this._setSelectionTo(e.clientX, e.clientY, e.shiftKey, (!util.isOpera || util.isOpera >= 12.16) && this._hasFocus && this.isListening("DragStart")); //$NON-NLS-0$
				if (result) { this._setGrab(target); }
			} else {
				/*
				* Feature in IE8 and older, the sequence of events in the IE8 event model
				* for a doule-click is:
				*
				*	down
				*	up
				*	up
				*	dblclick
				*
				* Given that the mouse down/up events are not balanced, it is not possible to
				* grab on mouse down and ungrab on mouse up.  The fix is to grab on the first
				* mouse down and ungrab on mouse move when the button 1 is not set.
				*/
				if (this._isW3CEvents) { this._setGrab(target); }
				
				this._doubleClickSelection = null;
				this._setSelectionTo(e.clientX, e.clientY, e.shiftKey);
				this._doubleClickSelection = this._getSelection();
			}
			return result;
		},
		_handleMouseDown: function (e) {
			if (this._ignoreEvent(e)) { return; }
			if (this._linksVisible) {
				var target = e.target || e.srcElement;
				if (target.tagName !== "A") { //$NON-NLS-0$
					this._setLinksVisible(false);
				} else {
					return;
				}
			}
			this._commitIME();

			var button = e.which; // 1 - left, 2 - middle, 3 - right
			if (!button) { 
				// if IE 8 or older
				if (e.button === 4) { button = 2; }
				if (e.button === 2) { button = 3; }
				if (e.button === 1) { button = 1; }
			}

			// For middle click we always need getTime(). See _getClipboardText().
			var time = button !== 2 && e.timeStamp ? e.timeStamp : new Date().getTime();
			var timeDiff = time - this._lastMouseTime;
			var deltaX = Math.abs(this._lastMouseX - e.clientX);
			var deltaY = Math.abs(this._lastMouseY - e.clientY);
			var sameButton = this._lastMouseButton === button;
			this._lastMouseX = e.clientX;
			this._lastMouseY = e.clientY;
			this._lastMouseTime = time;
			this._lastMouseButton = button;

			if (button === 1) {
				this._isMouseDown = true;
				if (sameButton && timeDiff <= this._clickTime && deltaX <= this._clickDist && deltaY <= this._clickDist) {
					this._clickCount++;
				} else {
					this._clickCount = 1;
				}
			}
			if (this.isListening("MouseDown")) { //$NON-NLS-0$
				var mouseEvent = this._createMouseEvent("MouseDown", e); //$NON-NLS-0$
				this.onMouseDown(mouseEvent);
				if (mouseEvent.defaultPrevented) {
					e.preventDefault();
					return;
				}
			}
			if (button === 1) {
				if (this._handleMouse(e) && (util.isIE >= 9 || util.isOpera || util.isChrome || util.isSafari || (util.isFirefox && !this._overlayDiv))) {
					if (!this._hasFocus) {
						this.focus();
					}
					e.preventDefault();
				}
			}
			if (util.isFirefox && this._lastMouseButton === 3) {
				// We need to update the DOM selection, because on
				// right-click the caret moves to the mouse location.
				// See bug 366312 and 376508.
				this._updateDOMSelection();
			}
		},
		_handleMouseOver: function (e) {
			if (this._ignoreEvent(e)) { return; }
			if (this._animation) { return; }
			if (this.isListening("MouseOver")) { //$NON-NLS-0$
				this.onMouseOver(this._createMouseEvent("MouseOver", e)); //$NON-NLS-0$
			}
		},
		_handleMouseOut: function (e) {
			if (this._ignoreEvent(e)) { return; }
			if (this._animation) { return; }
			if (this.isListening("MouseOut")) { //$NON-NLS-0$
				this.onMouseOut(this._createMouseEvent("MouseOut", e)); //$NON-NLS-0$
			}
		},
		_handleMouseMove: function (e) {
			if (this._animation) { return; }
			var inClient = this._isClientDiv(e);
			if (this.isListening("MouseMove")) { //$NON-NLS-0$
				if (inClient){
					this.onMouseMove(this._createMouseEvent("MouseMove", e)); //$NON-NLS-0$
				}
			}
			if (this._dropTarget) {
				return;
			}
			/*
			* Bug in IE9. IE sends one mouse event when the user changes the text by
			* pasting or undo.  These operations usually happen with the Ctrl key
			* down which causes the view to enter link mode.  Link mode does not end
			* because there are no further events.  The fix is to only enter link
			* mode when the coordinates of the mouse move event have changed.
			*/
			var changed = this._linksVisible || this._lastMouseMoveX !== e.clientX || this._lastMouseMoveY !== e.clientY;
			this._lastMouseMoveX = e.clientX;
			this._lastMouseMoveY = e.clientY;
			this._setLinksVisible(changed && !this._isMouseDown && (util.isMac ? e.metaKey : e.ctrlKey));

			/*
			* Feature in IE8 and older, the sequence of events in the IE8 event model
			* for a doule-click is:
			*
			*	down
			*	up
			*	up
			*	dblclick
			*
			* Given that the mouse down/up events are not balanced, it is not possible to
			* grab on mouse down and ungrab on mouse up.  The fix is to grab on the first
			* mouse down and ungrab on mouse move when the button 1 is not set.
			*
			* In order to detect double-click and drag gestures, it is necessary to send
			* a mouse down event from mouse move when the button is still down and isMouseDown
			* flag is not set.
			*/
			if (!this._isW3CEvents) {
				if (e.button === 0) {
					this._setGrab(null);
					return true;
				}
				if (!this._isMouseDown && e.button === 1 && (this._clickCount & 1) !== 0 && inClient) {
					this._clickCount = 2;
					return this._handleMouse(e, this._clickCount);
				}
			}
			if (!this._isMouseDown || this._dragOffset !== -1) {
				return;
			}
			
			var x = e.clientX;
			var y = e.clientY;
			var viewPad = this._getViewPadding();
			var viewRect = this._viewDiv.getBoundingClientRect();
			var width = this._getClientWidth (), height = this._getClientHeight();
			var leftEdge = viewRect.left + viewPad.left;
			var topEdge = viewRect.top + viewPad.top;
			var rightEdge = viewRect.left + viewPad.left + width;
			var bottomEdge = viewRect.top + viewPad.top + height;
			if (y < topEdge) {
				this._doAutoScroll("up", x, y - topEdge); //$NON-NLS-0$
			} else if (y > bottomEdge) {
				this._doAutoScroll("down", x, y - bottomEdge); //$NON-NLS-0$
			} else if (x < leftEdge && !this._wrapMode) {
				this._doAutoScroll("left", x - leftEdge, y); //$NON-NLS-0$
			} else if (x > rightEdge && !this._wrapMode) {
				this._doAutoScroll("right", x - rightEdge, y); //$NON-NLS-0$
			} else {
				this._endAutoScroll();
				this._setSelectionTo(x, y, true);
			}
		},
		_isClientDiv: function(e) {
			var topNode = this._overlayDiv || this._clientDiv;
			var temp = e.target ? e.target : e.srcElement;
			while (temp) {
				if (topNode === temp) {
					return true;
				}
				temp = temp.parentNode;
			}
			return false;
		},
		_createKeyEvent: function(type, e) {
			return {
				type: type,
				event: e,
				preventDefault: function() {
					this.defaultPrevented = true;
				}
			};
		},
		_createMouseEvent: function(type, e) {
			var pt = this.convert({x: e.clientX, y: e.clientY}, "page", "document"); //$NON-NLS-1$ //$NON-NLS-0$
			return {
				type: type,
				event: e,
				clickCount: this._clickCount,
				x: pt.x,
				y: pt.y,
				preventDefault: function() {
					this.defaultPrevented = true;
				}
			};
		},
		_handleMouseUp: function (e) {
			var left = e.which ? e.button === 0 : e.button === 1;
			if (this.isListening("MouseUp")) { //$NON-NLS-0$
				if (this._isClientDiv(e) || (left && this._isMouseDown)) {
					this.onMouseUp(this._createMouseEvent("MouseUp", e)); //$NON-NLS-0$
				}
			}
			if (this._linksVisible) {
				return;
			}
			if (left && this._isMouseDown) {
				if (this._dragOffset !== -1) {
					var selection = this._getSelection();
					selection.extend(this._dragOffset);
					selection.collapse();
					this._setSelection(selection, true, true);
					this._dragOffset = -1;
				}
				this._isMouseDown = false;
				this._endAutoScroll();
				
				/*
				* Feature in IE8 and older, the sequence of events in the IE8 event model
				* for a doule-click is:
				*
				*	down
				*	up
				*	up
				*	dblclick
				*
				* Given that the mouse down/up events are not balanced, it is not possible to
				* grab on mouse down and ungrab on mouse up.  The fix is to grab on the first
				* mouse down and ungrab on mouse move when the button 1 is not set.
				*/
				if (this._isW3CEvents) { this._setGrab(null); }

				/*
				* Note that there cases when Firefox sets the DOM selection in mouse up.
				* This happens for example after a cancelled drag operation.
				*
				* Note that on Chrome and IE, the caret stops blicking if mouse up is
				* prevented.
				*/
				if (util.isFirefox) {
					e.preventDefault();
				}
			}
		},
		_handleMouseWheel: function (e) {
			var lineHeight = this._getLineHeight();
			var pixelX = 0, pixelY = 0;
			// Note: On the Mac the correct behaviour is to scroll by pixel.
			if (util.isIE || util.isOpera) {
				pixelY = (-e.wheelDelta / 40) * lineHeight;
			} else if (util.isFirefox) {
				var limit = 256;
				if (e.type === "wheel") { //$NON-NLS-0$
					if (e.deltaMode) { // page or line
						pixelX = Math.max(-limit, Math.min(limit, e.deltaX)) * lineHeight;
						pixelY = Math.max(-limit, Math.min(limit, e.deltaY)) * lineHeight;
					} else {
						pixelX = e.deltaX;
						pixelY = e.deltaY;
					}
				} else {
					var pixel;
					if (util.isMac) {
						pixel = e.detail * 3;
					} else {
						pixel = Math.max(-limit, Math.min(limit, e.detail)) * lineHeight;
					}
					if (e.axis === e.HORIZONTAL_AXIS) {
						pixelX = pixel;
					} else {
						pixelY = pixel;
					}
				}
			} else {
				//Webkit
				if (util.isMac) {
					/*
					* In Safari, the wheel delta is a multiple of 120. In order to
					* convert delta to pixel values, it is necessary to divide delta
					* by 40.
					*
					* In Chrome and Safari 5, the wheel delta depends on the type of the
					* mouse. In general, it is the pixel value for Mac mice and track pads,
					* but it is a multiple of 120 for other mice. There is no presise
					* way to determine if it is pixel value or a multiple of 120.
					* 
					* Note that the current approach does not calculate the correct
					* pixel value for Mac mice when the delta is a multiple of 120.
					*
					* For values that are multiples of 120, the denominator varies on
					* the time between events.
					*/
					var denominatorX, denominatorY;
					var deltaTime = e.timeStamp - this._wheelTimeStamp;
					this._wheelTimeStamp = e.timeStamp;
					if (e.wheelDeltaX % 120 !== 0) { 
						denominatorX = 1; 
					} else {
						denominatorX = deltaTime < 40 ? 40/(40-deltaTime) : 40;
					}
					if (e.wheelDeltaY % 120 !== 0) { 
						denominatorY = 1; 
					} else {
						denominatorY = deltaTime < 40 ? 40/(40-deltaTime) : 40; 
					}
					pixelX = Math.ceil(-e.wheelDeltaX / denominatorX);
					if (-1 < pixelX && pixelX < 0) { pixelX = -1; }
					if (0 < pixelX && pixelX < 1) { pixelX = 1; }
					pixelY = Math.ceil(-e.wheelDeltaY / denominatorY);
					if (-1 < pixelY && pixelY < 0) { pixelY = -1; }
					if (0 < pixelY && pixelY < 1) { pixelY = 1; }
				} else {
					pixelX = -e.wheelDeltaX;
					var linesToScroll = 8;
					pixelY = (-e.wheelDeltaY / 120 * linesToScroll) * lineHeight;
				}
			}
			/* 
			* Feature in Safari. If the event target is removed from the DOM 
			* safari stops smooth scrolling. The fix is keep the element target
			* in the DOM and remove it on a later time. 
			*
			* Note: Using a timer is not a solution, because the timeout needs to
			* be at least as long as the gesture (which is too long).
			*/
			if (util.isSafari || (util.isChrome && util.isMac)) {
				var lineDiv = e.target;
				while (lineDiv && lineDiv.lineIndex === undefined) {
					lineDiv = lineDiv.parentNode;
				}
				this._mouseWheelLine = lineDiv;
			}
			var oldScroll = this._getScroll();
			this._scrollView(pixelX, pixelY);
			var newScroll = this._getScroll();
			if (oldScroll.x !== newScroll.x || oldScroll.y !== newScroll.y) {
				if (e.preventDefault) { e.preventDefault(); }
				return false;
			}
		},
		_handlePaste: function (e) {
			if (this._ignoreEvent(e)) { return; }
			if (this._ignorePaste) { return; }
			if (this._doPaste(e)) {
				if (util.isIE) {
					/*
					 * Bug in IE,  
					 */
					var self = this;
					this._ignoreFocus = true;
					var window = this._getWindow();
					window.setTimeout(function() {
						self._updateDOMSelection();
						self._ignoreFocus = false;
					}, 0);
				}
				if (e.preventDefault) { e.preventDefault(); }
				return false;
			}
		},
		_handleResize: function (e) {
			var newWidth = this._rootDiv.clientWidth;
			var newHeight = this._rootDiv.clientHeight;
			if (this._rootWidth !== newWidth || this._rootHeight !== newHeight) {
				if (this._rootWidth !== newWidth && this._wrapMode) {
					this._resetLineHeight();
				}
				this._rootWidth = newWidth;
				this._rootHeight = newHeight;
				/*
				* Feature in IE7. For some reason, sometimes Internet Explorer 7 
				* returns incorrect values for element.getBoundingClientRect() when 
				* inside a resize handler. The fix is to queue the work.
				*/			
				var queue = util.isIE < 9;

				/*
				* The calculated metrics may be out of date when the zoom level changes.
				*/
				var metrics = this._calculateMetrics();
				if (!compare(metrics, this._metrics)) {
					if (this._variableLineHeight) {
						this._variableLineHeight = false;
						this._resetLineHeight();
					}
					this._metrics = metrics;
					queue = true;
				}

				if (queue) {
					this._queueUpdate();
				} else {
					this._update();
				}
			}
		},
		_handleRulerEvent: function (e) {
			var target = e.target ? e.target : e.srcElement;
			var lineIndex = target.lineIndex;
			var element = target;
			while (element && !element._ruler) {
				if (lineIndex === undefined && element.lineIndex !== undefined) {
					lineIndex = element.lineIndex;
				}
				element = element.parentNode;
			}
			var ruler = element ? element._ruler : null;
			if (lineIndex === undefined && ruler && ruler.getOverview() === "document") { //$NON-NLS-0$
				var clientHeight = this._getClientHeight ();
				var lineCount = this._model.getLineCount ();
				var viewPad = this._getViewPadding();
				var viewRect = this._viewDiv.getBoundingClientRect();
				var trackHeight = clientHeight + viewPad.top + viewPad.bottom - 2 * this._metrics.scrollWidth;
				lineIndex = Math.floor(((e.clientY - viewRect.top) - this._metrics.scrollWidth) * lineCount / trackHeight);
				if (!(0 <= lineIndex && lineIndex < lineCount)) {
					lineIndex = undefined;
				}
			}
			if (ruler) {
				switch (e.type) {
					case "click": //$NON-NLS-0$
						if (ruler.onClick) { ruler.onClick(lineIndex, e); }
						break;
					case "dblclick": //$NON-NLS-0$
						if (ruler.onDblClick) { ruler.onDblClick(lineIndex, e); }
						break;
					case "mousemove": //$NON-NLS-0$
						if (ruler.onMouseMove) { ruler.onMouseMove(lineIndex, e); }
						break;
					case "mouseover": //$NON-NLS-0$
						if (ruler.onMouseOver) { ruler.onMouseOver(lineIndex, e); }
						break;
					case "mouseout": //$NON-NLS-0$
						if (ruler.onMouseOut) { 
							var tmp = e.relatedTarget;
							while (tmp && tmp !== this._rootDiv) {
								if (tmp === element) {
									return;
								}
								tmp = tmp.parentNode;
							}
							ruler.onMouseOut(lineIndex, e); 
						}
						break;
				}
			}
		},
		_handleScroll: function () {
			var scroll = this._getScroll(false);
			var oldX = this._hScroll;
			var oldY = this._vScroll;
			if (oldX !== scroll.x || oldY !== scroll.y) {
				this._hScroll = scroll.x;
				this._vScroll = scroll.y;
				this._commitIME();
				this._update(oldY === scroll.y);
				var e = {
					type: "Scroll", //$NON-NLS-0$
					oldValue: {x: oldX, y: oldY},
					newValue: scroll
				};
				this.onScroll(e);
			}
		},
		_handleSelectStart: function (e) {
			if (this._ignoreSelect) {
				if (e && e.preventDefault) { e.preventDefault(); }
				return false;
			}
		},
		_getModelOffset: function(node, offset) {
			if (!node) { return; }
			var lineNode;
			if (node.tagName === "DIV") { //$NON-NLS-0$
				lineNode = node;
			} else {
				lineNode = node.parentNode.parentNode;
			}
			var lineOffset = 0;
			var lineIndex = lineNode.lineIndex;
			if (node.tagName !== "DIV") { //$NON-NLS-0$
				var child = lineNode.firstChild;
				while (child) {
					var textNode = child.firstChild;
					if (textNode === node) {
						if (child.ignoreChars) { lineOffset -= child.ignoreChars; }
						lineOffset += offset;
						break;
					}
					if (child.ignoreChars) { lineOffset -= child.ignoreChars; }
					lineOffset += textNode.data.length;
					child = child.nextSibling;
				}
			}
			return Math.max(0, lineOffset) + this._model.getLineStart(lineIndex);
		},
		_updateSelectionFromDOM: function() {
			var window = this._getWindow();
			var selection = window.getSelection();
			var start = this._getModelOffset(selection.anchorNode, selection.anchorOffset);
			var end = this._getModelOffset(selection.focusNode, selection.focusOffset);
			if (start === undefined || end === undefined) {
			    return;
			}
			this._setSelection(new Selection(start, end), false, false);
		},
		_handleSelectionChange: function (e) {
			if (this._imeOffset !== -1) {
				return;
			}
			/*
			 * Feature in Android. The selection handles are hidden when the DOM changes. Sending
			 * selection events to the application while the user is moving the selection handles
			 * may hide the handles unexpectedly.  The fix is to delay updating the selection and
			 * sending the event to the application.
			 */
			if (util.isAndroid) {
				var window = this._getWindow();
				if (this._selTimer) {
					window.clearTimeout(this._selTimer);
				}
				var that = this;
				this._selTimer = window.setTimeout(function() {
					if (!that._clientDiv) { return; }
					that._selTimer = null; 
					that._updateSelectionFromDOM();
				}, 250);
			} else {
				this._updateSelectionFromDOM();
			}
		},
		_handleTextInput: function (e) {
			if (this._ignoreEvent(e)) { return; }
			this._imeOffset = -1;
			var selection = this._getWindow().getSelection();
			if (
				selection.anchorNode !== this._anchorNode || selection.focusNode !== this._focusNode ||
				selection.anchorOffset !== this._anchorOffset || selection.focusOffset !== this._focusOffset
			) {
				var temp = selection.anchorNode;
				while (temp) {
					if (temp.lineIndex !== undefined) {
						break;
					}
					temp = temp.parentNode;
				}
				if (temp) {
					var model = this._model;
					var lineIndex = temp.lineIndex;
					var oldText = model.getLine(lineIndex), text = oldText;
					var offset = 0;
					var lineStart = model.getLineStart(lineIndex);
					if (selection.rangeCount > 0) {
						selection.getRangeAt(0).deleteContents();
						var node = temp.ownerDocument.createTextNode(e.data);
						selection.getRangeAt(0).insertNode(node);
						var nodeText = this._getDOMText(temp, node);
						text = nodeText.text;
						offset = nodeText.offset;
						node.parentNode.removeChild(node);
					}
					temp.lineRemoved = true;
					
					var start = 0;
					while (oldText.charCodeAt(start) === text.charCodeAt(start) && start < offset) {
						start++;
					}
		
					var end = oldText.length - 1, delta = text.length - oldText.length;
					while (oldText.charCodeAt(end) === text.charCodeAt(end + delta) && end + delta >= offset + e.data.length) {
						end--;
					}
					end++;
					
					var deltaText = text.substring(start, end + delta);
					start += lineStart;
					end += lineStart;
					
					this._modifyContent({text: deltaText, start: start, end: end, _ignoreDOMSelection: true}, true);
				}
			} else {
				this._doContent(e.data);
			}
			e.preventDefault();
		},
		_handleTouchStart: function (e) {
			this._commitIME();
			var window = this._getWindow();
			if (this._touchScrollTimer) {
				this._vScrollDiv.style.display = "none"; //$NON-NLS-0$
				this._hScrollDiv.style.display = "none"; //$NON-NLS-0$
				window.clearInterval(this._touchScrollTimer);
				this._touchScrollTimer = null;
			}
			var touches = e.touches;
			if (touches.length === 1) {
				var touch = touches[0];
				var x = touch.clientX, y = touch.clientY;
				this._touchStartX = x;
				this._touchStartY = y;
				if (util.isAndroid) {
					/*
					* Bug in Android 4.  The clientX/Y coordinates of the touch events
					* include the page scrolling offsets.
					*/
				    if (y < (touch.pageY - window.pageYOffset) || x < (touch.pageX - window.pageXOffset) ) {
						x = touch.pageX - window.pageXOffset;
						y = touch.pageY - window.pageYOffset;
				    }
				}
				var pt = this.convert({x: x, y: y}, "page", "document"); //$NON-NLS-1$ //$NON-NLS-0$
				this._lastTouchOffset = this.getOffsetAtLocation(pt.x, pt.y);
				this._touchStartTime = e.timeStamp;
				this._touching = true;
			}
		},
		_handleTouchMove: function (e) {
			var touches = e.touches;
			if (touches.length === 1) {
				var touch = touches[0];
				this._touchCurrentX = touch.clientX;
				this._touchCurrentY = touch.clientY;
				var interval = 10;
				if (!this._touchScrollTimer && (e.timeStamp - this._touchStartTime) < (interval*20)) {
					this._vScrollDiv.style.display = "block"; //$NON-NLS-0$
					if (!this._wrapMode) {
						this._hScrollDiv.style.display = "block"; //$NON-NLS-0$
					}
					var self = this;
					var window = this._getWindow();
					this._touchScrollTimer = window.setInterval(function() {
						var deltaX = 0, deltaY = 0;
						if (self._touching) {
							deltaX = self._touchStartX - self._touchCurrentX;
							deltaY = self._touchStartY - self._touchCurrentY;
							self._touchSpeedX = deltaX / interval;
							self._touchSpeedY = deltaY / interval;
							self._touchStartX = self._touchCurrentX;
							self._touchStartY = self._touchCurrentY;
						} else {
							if (Math.abs(self._touchSpeedX) < 0.1 && Math.abs(self._touchSpeedY) < 0.1) {
								self._vScrollDiv.style.display = "none"; //$NON-NLS-0$
								self._hScrollDiv.style.display = "none"; //$NON-NLS-0$
								window.clearInterval(self._touchScrollTimer);
								self._touchScrollTimer = null;
								return;
							} else {
								deltaX = self._touchSpeedX * interval;
								deltaY = self._touchSpeedY * interval;
								self._touchSpeedX *= 0.95;
								self._touchSpeedY *= 0.95;
							}
						}
						self._scrollView(deltaX, deltaY);
					}, interval);
				}
				if (this._touchScrollTimer) {
					e.preventDefault();
				}
			}
		},
		_handleTouchEnd: function (e) {
			var touches = e.touches;
			if (touches.length === 0) {
				this._touching = false;
			}
		},

		/************************************ Actions ******************************************/
		_doAction: function (e) {
			var mode, i;
			var keyModes = this._keyModes;
			for (i = keyModes.length - 1 ; i >= 0; i--) {
				mode = keyModes[i];
				if (typeof mode.match === "function") { //$NON-NLS-0$
					var actionID = mode.match(e);
					if (actionID !== undefined) {
						return this.invokeAction(actionID);
					}
				}
			}
			return false;
		},
		_doMove: function(args, selection) {
			var model = this._model;
			var caret = selection.getCaret();
			var lineIndex = model.getLineAtOffset(caret);
			if (!args.count) {
				args.count = 1;
			}
			while (args.count !== 0) {
				var lineStart = model.getLineStart(lineIndex);
				if (args.count < 0 && caret === lineStart) {
					if (lineIndex > 0) {
						if (args.unit === "character") { //$NON-NLS-0$
							args.count++;
						}
						lineIndex--;
						selection.extend(model.getLineEnd(lineIndex));
					} else {
						break;
					}
				} else if (args.count > 0 && caret === model.getLineEnd(lineIndex)) {
					if (lineIndex + 1 < model.getLineCount()) {
						if (args.unit === "character") { //$NON-NLS-0$
							args.count--;
						}
						lineIndex++;
						selection.extend(model.getLineStart(lineIndex));
					} else {
						break;
					}
				} else {
					var removeTab = false;
					if (args.expandTab && args.unit === "character" && (caret - lineStart) % this._tabSize === 0) { //$NON-NLS-0$
						var lineText = model.getText(lineStart, caret);
						removeTab = !/[^ ]/.test(lineText); // Only spaces between line start and caret.
					}
					if (removeTab) {
						selection.extend(caret - this._tabSize);
						args.count += args.count < 0 ? 1 : -1;
					} else {
						var line = this._getLine(lineIndex);
						selection.extend(line.getNextOffset(caret, args));
						line.destroy();
					}
				}
				caret = selection.getCaret();
			}
			return selection;
		},
		_doBackspace: function (args) {
			var selection = this._getSelection();
			if (selection.isEmpty()) {
				if (!args.count) {
					args.count = 1;
				}
				args.count *= -1;
				args.expandTab = this._expandTab;
				this._doMove(args, selection);
			}
			this._modifyContent({text: "", start: selection.start, end: selection.end}, true);
			return true;
		},
		_doCase: function (args) {
			var selection = this._getSelection();
			this._doMove(args, selection);
			var text = this.getText(selection.start, selection.end);
			this._setSelection(selection, true);
			switch (args.type) {
				case "lower": text = text.toLowerCase(); break; //$NON-NLS-0$
				case "capitalize": text = text.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); }); break; //$NON-NLS-0$
				case "reverse":  //$NON-NLS-0$
					var newText = "";
					for (var i=0; i<text.length; i++) {
						var s = text[i];
						var l = s.toLowerCase();
						if (l !== s) {
							s = l;
						} else {
							s = s.toUpperCase();
						}
						newText += s;
					} 
					text = newText;
					break;
				default: text = text.toUpperCase(); break;
			}
			this._doContent(text);
			return true;
		},
		_doContent: function (text) {
			var selection = this._getSelection();
			if (this._overwriteMode && selection.isEmpty()) {
				var model = this._model;
				var lineIndex = model.getLineAtOffset(selection.end);
				if (selection.end < model.getLineEnd(lineIndex)) {
					var line = this._getLine(lineIndex);
					selection.extend(line.getNextOffset(selection.getCaret(), {unit:"character", count:1})); //$NON-NLS-0$
					line.destroy();
				}
			}
			this._modifyContent({text: text, start: selection.start, end: selection.end, _ignoreDOMSelection: true}, true);
		},
		_doCopy: function (e) {
			var selection = this._getSelection();
			if (!selection.isEmpty()) {
				var text = this._getBaseText(selection.start, selection.end);
				return this._setClipboardText(text, e);
			}
			return true;
		},
		_doCursorNext: function (args) {
			var selection = this._getSelection();
			if (!selection.isEmpty() && !args.select) {
				selection.start = selection.end;
			} else {
				this._doMove(args, selection);
			}
			if (!args.select) { selection.collapse(); }
			this._setSelection(selection, true);
			return true;
		},
		_doCursorPrevious: function (args) {
			var selection = this._getSelection();
			if (!selection.isEmpty() && !args.select) {
				selection.end = selection.start;
			} else {
				if (!args.count) {
					args.count = 1;
				}
				args.count *= -1;
				this._doMove(args, selection);
			}
			if (!args.select) { selection.collapse(); }
			this._setSelection(selection, true);
			return true;
		},
		_doCut: function (e) {
			var selection = this._getSelection();
			if (!selection.isEmpty()) {
				var text = this._getBaseText(selection.start, selection.end);
				this._doContent("");
				return this._setClipboardText(text, e);
			}
			return true;
		},
		_doDelete: function (args) {
			var selection = this._getSelection();
			if (selection.isEmpty()) {
				this._doMove(args, selection);
			}
			this._modifyContent({text: "", start: selection.start, end: selection.end}, true);
			return true;
		},
		_doEnd: function (args) {
			var selection = this._getSelection();
			var model = this._model;
			var callback;
			if (args.ctrl) {
				selection.extend(model.getCharCount());
				callback = function() {};
			} else {
				var offset = selection.getCaret();
				var lineIndex = model.getLineAtOffset(offset);
				if (this._wrapMode) {
					var line = this._getLine(lineIndex);
					var visualIndex = line.getLineIndex(offset);
					if (visualIndex === line.getLineCount() - 1) {
						offset = model.getLineEnd(lineIndex);
					} else {
						offset = line.getLineStart(visualIndex + 1) - 1;
					}
					line.destroy();
				} else {
					if (args.count && args.count > 0) {
						lineIndex = Math.min (lineIndex  + args.count - 1, model.getLineCount() - 1);
					}
					offset = model.getLineEnd(lineIndex);
				}
				selection.extend(offset);
			}
			if (!args.select) { selection.collapse(); }
			this._setSelection(selection, true, true, callback);
			return true;
		},
		_doEnter: function (args) {
			var model = this._model;
			var selection = this._getSelection();
			this._doContent(model.getLineDelimiter()); 
			if (args && args.noCursor) {
				selection.end = selection.start;
				this._setSelection(selection, true);
			}
			return true;
		},
		_doHome: function (args) {
			var selection = this._getSelection();
			var model = this._model;
			var callback;
			if (args.ctrl) {
				selection.extend(0);
				callback = function() {};
			} else {
				var offset = selection.getCaret();
				var lineIndex = model.getLineAtOffset(offset);
				if (this._wrapMode) {
					var line = this._getLine(lineIndex);
					var visualIndex = line.getLineIndex(offset);
					offset = line.getLineStart(visualIndex);
					line.destroy();
				} else {
					offset = model.getLineStart(lineIndex);
				}
				selection.extend(offset); 
			}
			if (!args.select) { selection.collapse(); }
			this._setSelection(selection, true, true, callback);
			return true;
		},
		_doLineDown: function (args) {
			var model = this._model;
			var selection = this._getSelection();
			var caret = selection.getCaret();
			var lineIndex = model.getLineAtOffset(caret), visualIndex;
			var line = this._getLine(lineIndex);
			var x = this._columnX, y = 1, lastLine = false;
			if (x === -1 || args.wholeLine || (args.select && util.isIE)) {
				var offset = args.wholeLine ? model.getLineEnd(lineIndex + 1) : caret;
				x = line.getBoundingClientRect(offset).left;
			}
			if ((visualIndex = line.getLineIndex(caret)) < line.getLineCount() - 1) {
				y = line.getClientRects(visualIndex + 1).top + 1;
			} else {
				var lastLineCount = model.getLineCount() - 1;
				lastLine = lineIndex === lastLineCount;
				if (args.count && args.count > 0) {
					lineIndex = Math.min (lineIndex + args.count, lastLineCount);
				} else {
					lineIndex++;
				}
			}
			var select = false;
			if (lastLine) {
				if (args.select || (util.isMac || util.isLinux)) {
					selection.extend(model.getCharCount());
					select = true;
				}
			} else {
				if (line.lineIndex !== lineIndex) {
					line.destroy();
					line = this._getLine(lineIndex);
				}
				selection.extend(line.getOffset(x, y));
				select = true;
			}
			if (select) {
				if (!args.select) { selection.collapse(); }
				this._setSelection(selection, true, true);
			}
			this._columnX = x;
			line.destroy();
			return true;
		},
		_doLineUp: function (args) {
			var model = this._model;
			var selection = this._getSelection();
			var caret = selection.getCaret();
			var lineIndex = model.getLineAtOffset(caret), visualIndex;
			var line = this._getLine(lineIndex);
			var x = this._columnX, firstLine = false, y;
			if (x === -1 || args.wholeLine || (args.select && util.isIE)) {
				var offset = args.wholeLine ? model.getLineStart(lineIndex - 1) : caret;
				x = line.getBoundingClientRect(offset).left;
			}
			if ((visualIndex = line.getLineIndex(caret)) > 0) {
				y = line.getClientRects(visualIndex - 1).top + 1;
			} else {
				firstLine = lineIndex === 0;
				if (!firstLine) {
					if (args.count && args.count > 0) {
						lineIndex = Math.max (lineIndex - args.count, 0);
					} else {
						lineIndex--;
					}
					y = this._getLineHeight(lineIndex) - 1;
				}
			}
			var select = false;
			if (firstLine) {
				if (args.select || (util.isMac || util.isLinux)) {
					selection.extend(0);
					select = true;
				}
			} else {
				if (line.lineIndex !== lineIndex) {
					line.destroy();
					line = this._getLine(lineIndex);
				}
				selection.extend(line.getOffset(x, y));
				select = true;
			}
			if (select) {
				if (!args.select) { selection.collapse(); }
				this._setSelection(selection, true, true);
			}
			this._columnX = x;
			line.destroy();
			return true;
		},
		_doNoop: function () {
			return true;
		},
		_doPageDown: function (args) {
			var self = this;
			var model = this._model;
			var selection = this._getSelection();
			var caret = selection.getCaret();
			var caretLine = model.getLineAtOffset(caret);
			var lineCount = model.getLineCount();
			var scroll = this._getScroll();
			var clientHeight = this._getClientHeight(), x, line;
			if (this._lineHeight) {
				x = this._columnX;
				var caretRect = this._getBoundsAtOffset(caret);
				if (x === -1 || (args.select && util.isIE)) {
					x = caretRect.left;
				}
				var lineIndex = this._getLineIndex(caretRect.top + clientHeight);
				line = this._getLine(lineIndex);
				var linePixel = this._getLinePixel(lineIndex);
				var y = caretRect.top + clientHeight - linePixel;
				caret = line.getOffset(x, y);
				var rect = line.getBoundingClientRect(caret);
				line.destroy();
				selection.extend(caret);
				if (!args.select) { selection.collapse(); }
				this._setSelection(selection, true, true, function() {
					self._columnX = x;
				}, rect.top + linePixel - caretRect.top);
				return true;
			}
			if (caretLine < lineCount - 1) {
				var lineHeight = this._getLineHeight();
				var lines = Math.floor(clientHeight / lineHeight);
				var scrollLines = Math.min(lineCount - caretLine - 1, lines);
				scrollLines = Math.max(1, scrollLines);
				x = this._columnX;
				if (x === -1 || (args.select && util.isIE)) {
					line = this._getLine(caretLine);
					x = line.getBoundingClientRect(caret).left;
					line.destroy();
				}
				line = this._getLine(caretLine + scrollLines);
				selection.extend(line.getOffset(x, 0));
				line.destroy();
				if (!args.select) { selection.collapse(); }
				var verticalMaximum = lineCount * lineHeight;
				var scrollOffset = scroll.y + scrollLines * lineHeight;
				if (scrollOffset + clientHeight > verticalMaximum) {
					scrollOffset = verticalMaximum - clientHeight;
				}
				this._setSelection(selection, true, true, function() {
					self._columnX = x;
				}, scrollOffset - scroll.y);
			}
			return true;
		},
		_doPageUp: function (args) {
			var self = this;
			var model = this._model;
			var selection = this._getSelection();
			var caret = selection.getCaret();
			var caretLine = model.getLineAtOffset(caret);
			var scroll = this._getScroll();
			var clientHeight = this._getClientHeight(), x, line;
			if (this._lineHeight) {
				x = this._columnX;
				var caretRect = this._getBoundsAtOffset(caret);
				if (x === -1 || (args.select && util.isIE)) {
					x = caretRect.left;
				}
				var lineIndex = this._getLineIndex(caretRect.bottom - clientHeight);
				line = this._getLine(lineIndex);
				var linePixel = this._getLinePixel(lineIndex);
				var y = (caretRect.bottom - clientHeight) - linePixel;
				caret = line.getOffset(x, y);
				var rect = line.getBoundingClientRect(caret);
				line.destroy();
				selection.extend(caret);
				if (!args.select) { selection.collapse(); }
				this._setSelection(selection, true, true, function() {
					self._columnX = x;
				}, rect.top + linePixel - caretRect.top);
				return true;
			}
			if (caretLine > 0) {
				var lineHeight = this._getLineHeight();
				var lines = Math.floor(clientHeight / lineHeight);
				var scrollLines = Math.max(1, Math.min(caretLine, lines));
				x = this._columnX;
				if (x === -1 || (args.select && util.isIE)) {
					line = this._getLine(caretLine);
					x = line.getBoundingClientRect(caret).left;
					line.destroy();
				}
				line = this._getLine(caretLine - scrollLines);
				selection.extend(line.getOffset(x, this._getLineHeight(caretLine - scrollLines) - 1));
				line.destroy();
				if (!args.select) { selection.collapse(); }
				var scrollOffset = Math.max(0, scroll.y - scrollLines * lineHeight);
				this._setSelection(selection, true, true, function() {
					self._columnX = x;
				}, scrollOffset - scroll.y);
			}
			return true;
		},
		_doPaste: function(e) {
			var self = this;
			var result = this._getClipboardText(e, function(text) {
				if (text) {
					if (util.isLinux && self._lastMouseButton === 2) {
						var timeDiff = new Date().getTime() - self._lastMouseTime;
						if (timeDiff <= self._clickTime) {
							self._setSelectionTo(self._lastMouseX, self._lastMouseY);
						}
					}
					self._doContent(text);
				}
			});
			return result !== null;
		},
		_doScroll: function (args) {
			var type = args.type;
			var model = this._model;
			var lineCount = model.getLineCount();
			var clientHeight = this._getClientHeight();
			var lineHeight = this._getLineHeight();
			var verticalMaximum = lineCount * lineHeight;
			var verticalScrollOffset = this._getScroll().y;
			var pixel;
			switch (type) {
				case "textStart": pixel = 0; break; //$NON-NLS-0$
				case "textEnd": pixel = verticalMaximum - clientHeight; break; //$NON-NLS-0$
				case "pageDown": pixel = verticalScrollOffset + clientHeight; break; //$NON-NLS-0$
				case "pageUp": pixel = verticalScrollOffset - clientHeight; break; //$NON-NLS-0$
				case "lineDown": pixel = verticalScrollOffset + lineHeight; break; //$NON-NLS-0$
				case "lineUp": pixel = verticalScrollOffset - lineHeight; break; //$NON-NLS-0$
				case "centerLine": //$NON-NLS-0$
					var selection = this._getSelection();
					var lineStart = model.getLineAtOffset(selection.start);
					var lineEnd = model.getLineAtOffset(selection.end);
					var selectionHeight = (lineEnd - lineStart + 1) * lineHeight;
					pixel = (lineStart * lineHeight) - (clientHeight / 2) + (selectionHeight / 2);
					break;
			}
			if (pixel !== undefined) {
				pixel = Math.min(Math.max(0, pixel), verticalMaximum - clientHeight);
				this._scrollViewAnimated(0, pixel - verticalScrollOffset, function() {});
			}
			return true;
		},
		_doSelectAll: function (args) {
			var model = this._model;
			var selection = this._getSelection();
			selection.setCaret(0);
			selection.extend(model.getCharCount());
			this._setSelection(selection, false);
			return true;
		},
		_doTab: function (args) {
			if (!this._tabMode || this._readonly) { return; }
			var text = "\t"; //$NON-NLS-0$
			if (this._expandTab) {
				var model = this._model;
				var caret = this._getSelection().getCaret();
				var lineIndex = model.getLineAtOffset(caret);
				var lineStart = model.getLineStart(lineIndex);
				var spaces = this._tabSize - ((caret - lineStart) % this._tabSize);
				text = (new Array(spaces + 1)).join(" "); //$NON-NLS-0$
			}
			this._doContent(text);
			return true;
		},
		_doShiftTab: function (args) {
			if (!this._tabMode || this._readonly) { return; }
			return true;
		},
		_doOverwriteMode: function (args) {
			if (this._readonly) { return; }
			this.setOptions({overwriteMode: !this.getOptions("overwriteMode")}); //$NON-NLS-0$
			return true;
		},
		_doTabMode: function (args) {
			this._tabMode = !this._tabMode;
			return true;
		},
		_doWrapMode: function (args) {
			this.setOptions({wrapMode: !this.getOptions("wrapMode")}); //$NON-NLS-0$
			return true;
		},
		
		/************************************ Internals ******************************************/
		_autoScroll: function () {
			var model = this._model;
			var selection = this._getSelection();
			var pt = this.convert({x: this._autoScrollX, y: this._autoScrollY}, "page", "document"); //$NON-NLS-1$ //$NON-NLS-0$
			var caret = selection.getCaret();
			var lineCount = model.getLineCount();
			var caretLine = model.getLineAtOffset(caret), lineIndex, line;
			if (this._autoScrollDir === "up" || this._autoScrollDir === "down") { //$NON-NLS-1$ //$NON-NLS-0$
				var scroll = this._autoScrollY / this._getLineHeight();
				scroll = scroll < 0 ? Math.floor(scroll) : Math.ceil(scroll);
				lineIndex = caretLine;
				lineIndex = Math.max(0, Math.min(lineCount - 1, lineIndex + scroll));
			} else if (this._autoScrollDir === "left" || this._autoScrollDir === "right") { //$NON-NLS-1$ //$NON-NLS-0$
				lineIndex = this._getLineIndex(pt.y);
				line = this._getLine(caretLine); 
				pt.x += line.getBoundingClientRect(caret, false).left;
				line.destroy();
			}
			if (lineIndex === 0 && (util.isMac || util.isLinux)) {
				selection.extend(0);
			} else if (lineIndex === lineCount - 1 && (util.isMac || util.isLinux)) {
				selection.extend(model.getCharCount());
			} else {
				line = this._getLine(lineIndex);
				selection.extend(line.getOffset(pt.x, pt.y - this._getLinePixel(lineIndex)));
				line.destroy();
			}
			this._setSelection(selection, true);
		},
		_autoScrollTimer: function () {
			this._autoScroll();
			var self = this;
			var window = this._getWindow();
			this._autoScrollTimerID = window.setTimeout(function () {self._autoScrollTimer();}, this._AUTO_SCROLL_RATE);
		},
		_calculateLineHeightTimer: function(calculate) {
			if (!this._lineHeight) { return; }
			if (this._calculateLHTimer) { return; }
			var lineCount = this._model.getLineCount(), i = 0;
			if (calculate) {
				var c = 0;
				var MAX_TIME = 100;
				var start = new Date().getTime(), firstLine = 0;
				while (i < lineCount) {
					if (!this._lineHeight[i]) {
						c++;
						if (!firstLine) { firstLine = i; }
						this._lineHeight[i] = this._calculateLineHeight(i);
					}
					i++;
					if ((new Date().getTime() - start) > MAX_TIME) {
						break;
					}
				}
				this.redrawRulers(0, lineCount);
				this._queueUpdate();
			}
			var window = this._getWindow();
			if (i !== lineCount) {
				var self = this;
				this._calculateLHTimer = window.setTimeout(function() {
					self._calculateLHTimer = null;
					self._calculateLineHeightTimer(true);
				}, 0);
				return;
			}
			if (this._calculateLHTimer) {
				window.clearTimeout(this._calculateLHTimer);
				this._calculateLHTimer = undefined;
			}
		},
		_calculateLineHeight: function(lineIndex) {
			var line = this._getLine(lineIndex);
			var rect = line.getBoundingClientRect();
			line.destroy();
			return Math.max(1, rect.bottom - rect.top);
		},
		_calculateMetrics: function() {
			var parent = this._clientDiv;
			var document = parent.ownerDocument;
			var c = " "; //$NON-NLS-0$
			var line = util.createElement(document, "div"); //$NON-NLS-0$
			line.style.lineHeight = "normal"; //$NON-NLS-0$
			var model = this._model;
			var lineText = model.getLine(0);
			var e = {type:"LineStyle", textView: this, 0: 0, lineText: lineText, lineStart: 0}; //$NON-NLS-0$
			this.onLineStyle(e);
			applyStyle(e.style, line);
			line.style.position = "fixed"; //$NON-NLS-0$
			line.style.left = "-1000px"; //$NON-NLS-0$
			var span1 = util.createElement(document, "span"); //$NON-NLS-0$
			span1.appendChild(document.createTextNode(c));
			line.appendChild(span1);
			var span2 = util.createElement(document, "span"); //$NON-NLS-0$
			span2.style.fontStyle = "italic"; //$NON-NLS-0$
			span2.appendChild(document.createTextNode(c));
			line.appendChild(span2);
			var span3 = util.createElement(document, "span"); //$NON-NLS-0$
			span3.style.fontWeight = "bold"; //$NON-NLS-0$
			span3.appendChild(document.createTextNode(c));
			line.appendChild(span3);
			var span4 = util.createElement(document, "span"); //$NON-NLS-0$
			span4.style.fontWeight = "bold"; //$NON-NLS-0$
			span4.style.fontStyle = "italic"; //$NON-NLS-0$
			span4.appendChild(document.createTextNode(c));
			line.appendChild(span4);
			parent.appendChild(line);
			var lineRect = line.getBoundingClientRect();
			var spanRect1 = span1.getBoundingClientRect();
			var spanRect2 = span2.getBoundingClientRect();
			var spanRect3 = span3.getBoundingClientRect();
			var spanRect4 = span4.getBoundingClientRect();
			var h1 = spanRect1.bottom - spanRect1.top;
			var h2 = spanRect2.bottom - spanRect2.top;
			var h3 = spanRect3.bottom - spanRect3.top;
			var h4 = spanRect4.bottom - spanRect4.top;
			var fontStyle = 0;
			var invalid = (lineRect.bottom - lineRect.top) <= 0;
			var lineHeight = Math.max(1, lineRect.bottom - lineRect.top);
			if (h2 > h1) {
				fontStyle = 1;
			}
			if (h3 > h2) {
				fontStyle = 2;
			}
			if (h4 > h3) {
				fontStyle = 3;
			}
			var style;
			if (fontStyle !== 0) {
				style = {style: {}};
				if ((fontStyle & 1) !== 0) {
					style.style.fontStyle = "italic"; //$NON-NLS-0$
				}
				if ((fontStyle & 2) !== 0) {
					style.style.fontWeight = "bold"; //$NON-NLS-0$
				}
			}
			var trim = getLineTrim(line);
			parent.removeChild(line);
			
			// calculate pad and scroll width
			var pad = getPadding(this._viewDiv);
			var div1 = util.createElement(document, "div"); //$NON-NLS-0$
			div1.style.position = "fixed"; //$NON-NLS-0$
			div1.style.left = "-1000px"; //$NON-NLS-0$
			div1.style.paddingLeft = pad.left + "px"; //$NON-NLS-0$
			div1.style.paddingTop = pad.top + "px"; //$NON-NLS-0$
			div1.style.paddingRight = pad.right + "px"; //$NON-NLS-0$
			div1.style.paddingBottom = pad.bottom + "px"; //$NON-NLS-0$
			div1.style.width = "100px"; //$NON-NLS-0$
			div1.style.height = "100px"; //$NON-NLS-0$
			var div2 = util.createElement(document, "div"); //$NON-NLS-0$
			div2.style.width = "100%"; //$NON-NLS-0$
			div2.style.height = "100%"; //$NON-NLS-0$
			div1.appendChild(div2);
			parent.appendChild(div1);
			var rect1 = div1.getBoundingClientRect();
			var rect2 = div2.getBoundingClientRect();
			var scrollWidth = 0;
			if (!this._singleMode) {
				div1.style.overflow = 'hidden'; //$NON-NLS-0$
				div2.style.height = "200px"; //$NON-NLS-0$
				var w1 = div1.clientWidth;
				div1.style.overflow = 'scroll'; //$NON-NLS-0$
				var w2 = div1.clientWidth;
				scrollWidth = w1 - w2;
			}
			parent.removeChild(div1);
			pad = {
				left: rect2.left - rect1.left,
				top: rect2.top - rect1.top,
				right: rect1.right - rect2.right,
				bottom: rect1.bottom - rect2.bottom
			};
			var wrapWidth = 0, marginWidth = 0;
			if (!invalid) {
				if (this._wrapOffset || this._marginOffset) {
					div1 = util.createElement(document, "div"); //$NON-NLS-0$
					div1.style.position = "fixed"; //$NON-NLS-0$
					div1.style.left = "-1000px"; //$NON-NLS-0$
					div1.innerHTML = new Array(this._wrapOffset + 1).join(" "); //$NON-NLS-0$
					parent.appendChild(div1);
					rect1 = div1.getBoundingClientRect();
					wrapWidth = Math.ceil(rect1.right - rect1.left);
					div1.innerHTML = new Array(this._marginOffset + 1).join(" "); //$NON-NLS-0$
					rect2 = div1.getBoundingClientRect();
					marginWidth = Math.ceil(rect2.right - rect2.left);
					parent.removeChild(div1);
				}
			}
			return {
				lineHeight: lineHeight,
				largestFontStyle: style,
				lineTrim: trim,
				viewPadding: pad,
				scrollWidth: scrollWidth,
				wrapWidth: wrapWidth,
				marginWidth: marginWidth,
				invalid: invalid
			};
		},
		_cancelAnimation: function() {
			if (this._animation) {
				this._animation.stop();
				this._animation = null;
			}
		},
		_clearSelection: function (direction) {
			var selection = this._getSelection();
			if (selection.isEmpty()) { return false; }
			if (direction === "next") { //$NON-NLS-0$
				selection.start = selection.end;
			} else {
				selection.end = selection.start;
			}
			this._setSelection(selection, true);
			return true;
		},
		_commitIME: function () {
			if (this._imeOffset === -1) { return; }
			// make the state of the IME match the state the view expects it be in
			// when the view commits the text and IME also need to be committed
			// this can be accomplished by changing the focus around
			this._scrollDiv.focus();
			this._clientDiv.focus();
			
			var model = this._model;
			var lineIndex = model.getLineAtOffset(this._imeOffset);
			var lineStart = model.getLineStart(lineIndex);
			var newText = this._getDOMText(this._getLineNode(lineIndex)).text;
			var oldText = model.getLine(lineIndex);
			var start = this._imeOffset - lineStart;
			var end = start + newText.length - oldText.length;
			if (start !== end) {
				var insertText = newText.substring(start, end);
				this._doContent(insertText);
			}
			this._imeOffset = -1;
		},
		_createActions: function () {
			this.addKeyMode(new mKeyModes.DefaultKeyMode(this));
			//1 to 1, no duplicates
			var self = this;
			this._actions = {
				"noop": {defaultHandler: function() {return self._doNoop();}}, //$NON-NLS-0$

				"lineUp": {defaultHandler: function(data) {return self._doLineUp(merge(data,{select: false}));}, actionDescription: {name: messages.lineUp}}, //$NON-NLS-0$
				"lineDown": {defaultHandler: function(data) {return self._doLineDown(merge(data,{select: false}));}, actionDescription: {name: messages.lineDown}}, //$NON-NLS-0$
				"lineStart": {defaultHandler: function(data) {return self._doHome(merge(data,{select: false, ctrl:false}));}, actionDescription: {name: messages.lineStart}}, //$NON-NLS-0$
				"lineEnd": {defaultHandler: function(data) {return self._doEnd(merge(data,{select: false, ctrl:false}));}, actionDescription: {name: messages.lineEnd}}, //$NON-NLS-0$
				"charPrevious": {defaultHandler: function(data) {return self._doCursorPrevious(merge(data,{select: false, unit:"character"}));}, actionDescription: {name: messages.charPrevious}}, //$NON-NLS-1$ //$NON-NLS-0$
				"charNext": {defaultHandler: function(data) {return self._doCursorNext(merge(data,{select: false, unit:"character"}));}, actionDescription: {name: messages.charNext}}, //$NON-NLS-1$ //$NON-NLS-0$
				"pageUp": {defaultHandler: function(data) {return self._doPageUp(merge(data,{select: false}));}, actionDescription: {name: messages.pageUp}}, //$NON-NLS-0$
				"pageDown": {defaultHandler: function(data) {return self._doPageDown(merge(data,{select: false}));}, actionDescription: {name: messages.pageDown}}, //$NON-NLS-0$
				"scrollPageUp": {defaultHandler: function(data) {return self._doScroll(merge(data,{type: "pageUp"}));}, actionDescription: {name: messages.scrollPageUp}}, //$NON-NLS-1$ //$NON-NLS-0$
				"scrollPageDown": {defaultHandler: function(data) {return self._doScroll(merge(data,{type: "pageDown"}));}, actionDescription: {name: messages.scrollPageDown}}, //$NON-NLS-1$ //$NON-NLS-0$
				"scrollLineUp": {defaultHandler: function(data) {return self._doScroll(merge(data,{type: "lineUp"}));}, actionDescription: {name: messages.scrollLineUp}}, //$NON-NLS-1$ //$NON-NLS-0$
				"scrollLineDown": {defaultHandler: function(data) {return self._doScroll(merge(data,{type: "lineDown"}));}, actionDescription: {name: messages.scrollLineDown}}, //$NON-NLS-1$ //$NON-NLS-0$
				"wordPrevious": {defaultHandler: function(data) {return self._doCursorPrevious(merge(data,{select: false, unit:"word"}));}, actionDescription: {name: messages.wordPrevious}}, //$NON-NLS-1$ //$NON-NLS-0$
				"wordNext": {defaultHandler: function(data) {return self._doCursorNext(merge(data,{select: false, unit:"word"}));}, actionDescription: {name: messages.wordNext}}, //$NON-NLS-1$ //$NON-NLS-0$
				"textStart": {defaultHandler: function(data) {return self._doHome(merge(data,{select: false, ctrl:true}));}, actionDescription: {name: messages.textStart}}, //$NON-NLS-0$
				"textEnd": {defaultHandler: function(data) {return self._doEnd(merge(data,{select: false, ctrl:true}));}, actionDescription: {name: messages.textEnd}}, //$NON-NLS-0$
				"scrollTextStart": {defaultHandler: function(data) {return self._doScroll(merge(data,{type: "textStart"}));}, actionDescription: {name: messages.scrollTextStart}}, //$NON-NLS-1$ //$NON-NLS-0$
				"scrollTextEnd": {defaultHandler: function(data) {return self._doScroll(merge(data,{type: "textEnd"}));}, actionDescription: {name: messages.scrollTextEnd}}, //$NON-NLS-1$ //$NON-NLS-0$
				"centerLine": {defaultHandler: function(data) {return self._doScroll(merge(data,{type: "centerLine"}));}, actionDescription: {name: messages.centerLine}}, //$NON-NLS-1$ //$NON-NLS-0$
				
				"selectLineUp": {defaultHandler: function(data) {return self._doLineUp(merge(data,{select: true}));}, actionDescription: {name: messages.selectLineUp}}, //$NON-NLS-0$
				"selectLineDown": {defaultHandler: function(data) {return self._doLineDown(merge(data,{select: true}));}, actionDescription: {name: messages.selectLineDown}}, //$NON-NLS-0$
				"selectWholeLineUp": {defaultHandler: function(data) {return self._doLineUp(merge(data,{select: true, wholeLine: true}));}, actionDescription: {name: messages.selectWholeLineUp}}, //$NON-NLS-0$
				"selectWholeLineDown": {defaultHandler: function(data) {return self._doLineDown(merge(data,{select: true, wholeLine: true}));}, actionDescription: {name: messages.selectWholeLineDown}}, //$NON-NLS-0$
				"selectLineStart": {defaultHandler: function(data) {return self._doHome(merge(data,{select: true, ctrl:false}));}, actionDescription: {name: messages.selectLineStart}}, //$NON-NLS-0$
				"selectLineEnd": {defaultHandler: function(data) {return self._doEnd(merge(data,{select: true, ctrl:false}));}, actionDescription: {name: messages.selectLineEnd}}, //$NON-NLS-0$
				"selectCharPrevious": {defaultHandler: function(data) {return self._doCursorPrevious(merge(data,{select: true, unit:"character"}));}, actionDescription: {name: messages.selectCharPrevious}}, //$NON-NLS-1$ //$NON-NLS-0$
				"selectCharNext": {defaultHandler: function(data) {return self._doCursorNext(merge(data,{select: true, unit:"character"}));}, actionDescription: {name: messages.selectCharNext}}, //$NON-NLS-1$ //$NON-NLS-0$
				"selectPageUp": {defaultHandler: function(data) {return self._doPageUp(merge(data,{select: true}));}, actionDescription: {name: messages.selectPageUp}}, //$NON-NLS-0$
				"selectPageDown": {defaultHandler: function(data) {return self._doPageDown(merge(data,{select: true}));}, actionDescription: {name: messages.selectPageDown}}, //$NON-NLS-0$
				"selectWordPrevious": {defaultHandler: function(data) {return self._doCursorPrevious(merge(data,{select: true, unit:"word"}));}, actionDescription: {name: messages.selectWordPrevious}}, //$NON-NLS-1$ //$NON-NLS-0$
				"selectWordNext": {defaultHandler: function(data) {return self._doCursorNext(merge(data,{select: true, unit:"word"}));}, actionDescription: {name: messages.selectWordNext}}, //$NON-NLS-1$ //$NON-NLS-0$
				"selectTextStart": {defaultHandler: function(data) {return self._doHome(merge(data,{select: true, ctrl:true}));}, actionDescription: {name: messages.selectTextStart}}, //$NON-NLS-0$
				"selectTextEnd": {defaultHandler: function(data) {return self._doEnd(merge(data,{select: true, ctrl:true}));}, actionDescription: {name: messages.selectTextEnd}}, //$NON-NLS-0$

				"deletePrevious": {defaultHandler: function(data) {return self._doBackspace(merge(data,{unit:"character"}));}, actionDescription: {name: messages.deletePrevious}}, //$NON-NLS-1$ //$NON-NLS-0$
				"deleteNext": {defaultHandler: function(data) {return self._doDelete(merge(data,{unit:"character"}));}, actionDescription: {name: messages.deleteNext}}, //$NON-NLS-1$ //$NON-NLS-0$
				"deleteWordPrevious": {defaultHandler: function(data) {return self._doBackspace(merge(data,{unit:"word"}));}, actionDescription: {name: messages.deleteWordPrevious}}, //$NON-NLS-1$ //$NON-NLS-0$
				"deleteWordNext": {defaultHandler: function(data) {return self._doDelete(merge(data,{unit:"word"}));}, actionDescription: {name: messages.deleteWordNext}}, //$NON-NLS-1$ //$NON-NLS-0$
				"deleteLineStart": {defaultHandler: function(data) {return self._doBackspace(merge(data,{unit: "line"}));}, actionDescription: {name: messages.deleteLineStart}}, //$NON-NLS-1$ //$NON-NLS-0$
				"deleteLineEnd": {defaultHandler: function(data) {return self._doDelete(merge(data,{unit: "line"}));}, actionDescription: {name: messages.deleteLineEnd}}, //$NON-NLS-1$ //$NON-NLS-0$
				"tab": {defaultHandler: function(data) {return self._doTab();}, actionDescription: {name: messages.tab}}, //$NON-NLS-0$
				"shiftTab": {defaultHandler: function(data) {return self._doShiftTab();}, actionDescription: {name: messages.shiftTab}}, //$NON-NLS-0$
				"enter": {defaultHandler: function(data) {return self._doEnter();}, actionDescription: {name: messages.enter}}, //$NON-NLS-0$
				"enterNoCursor": {defaultHandler: function(data) {return self._doEnter(merge(data,{noCursor:true}));}, actionDescription: {name: messages.enterNoCursor}}, //$NON-NLS-0$
				"selectAll": {defaultHandler: function(data) {return self._doSelectAll();}, actionDescription: {name: messages.selectAll}}, //$NON-NLS-0$
				"copy": {defaultHandler: function(data) {return self._doCopy();}, actionDescription: {name: messages.copy}}, //$NON-NLS-0$
				"cut": {defaultHandler: function(data) {return self._doCut();}, actionDescription: {name: messages.cut}}, //$NON-NLS-0$
				"paste": {defaultHandler: function(data) {return self._doPaste();}, actionDescription: {name: messages.paste}}, //$NON-NLS-0$
				
				"uppercase": {defaultHandler: function(data) {return self._doCase(merge(data,{type: "upper"}));}, actionDescription: {name: messages.uppercase}}, //$NON-NLS-1$ //$NON-NLS-0$
				"lowercase": {defaultHandler: function(data) {return self._doCase(merge(data,{type: "lower"}));}, actionDescription: {name: messages.lowercase}}, //$NON-NLS-1$ //$NON-NLS-0$
				"capitalize": {defaultHandler: function(data) {return self._doCase(merge(data,{unit: "word", type: "capitalize"}));}, actionDescription: {name: messages.capitalize}}, //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				"reversecase": {defaultHandler: function(data) {return self._doCase(merge(data,{type: "reverse"}));}, actionDescription: {name: messages.reversecase}}, //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				
				"toggleOverwriteMode": {defaultHandler: function(data) {return self._doOverwriteMode();}, actionDescription: {name: messages.toggleOverwriteMode}}, //$NON-NLS-0$
				"toggleTabMode": {defaultHandler: function(data) {return self._doTabMode();}, actionDescription: {name: messages.toggleTabMode}}, //$NON-NLS-0$
				"toggleWrapMode": {defaultHandler: function(data) {return self._doWrapMode();}, actionDescription: {name: messages.toggleWrapMode}} //$NON-NLS-0$
			};
		},
		_createRulerParent: function(className) {
			var div = util.createElement(document, "div"); //$NON-NLS-0$
			div.className = className;
			div.tabIndex = -1;
			div.style.overflow = "hidden"; //$NON-NLS-0$
			div.style.MozUserSelect = "none"; //$NON-NLS-0$
			div.style.WebkitUserSelect = "none"; //$NON-NLS-0$
			div.style.position = "absolute"; //$NON-NLS-0$
			div.style.top = "0px"; //$NON-NLS-0$
			div.style.bottom = "0px"; //$NON-NLS-0$
			div.style.cursor = "default"; //$NON-NLS-0$
			div.style.display = "none"; //$NON-NLS-0$
			div.setAttribute("aria-hidden", "true"); //$NON-NLS-1$ //$NON-NLS-0$
			this._rootDiv.appendChild(div);
			return div;
		},
		_createRuler: function(ruler, index) {
			if (!this._clientDiv) { return; }
			var rulerParent = this._getRulerParent(ruler);
			if (!rulerParent) { return; }
			if (rulerParent !== this._marginDiv || this._marginOffset) {
				rulerParent.style.display = "block"; //$NON-NLS-0$
			}
			var div = util.createElement(rulerParent.ownerDocument, "div"); //$NON-NLS-0$
			div._ruler = ruler;
			div.rulerChanged = true;
			div.style.position = "relative"; //$NON-NLS-0$
			div.style.cssFloat = "left"; //$NON-NLS-0$
			div.style.styleFloat = "left"; //$NON-NLS-0$
			div.style.outline = "none"; //$NON-NLS-0$
			if (index === undefined || index < 0 || index >= rulerParent.children.length) {
				rulerParent.appendChild(div);
			} else {
				var sibling = rulerParent.firstChild;
				while (sibling && index-- > 0) {
					sibling = sibling.nextSibling;
				}
				rulerParent.insertBefore(div, sibling);
			}
		},
		_createView: function() {
			if (this._clientDiv) { return; }
			var parent = this._parent;
			while (parent.hasChildNodes()) { parent.removeChild(parent.lastChild); }

			var document = parent.ownerDocument;
			var rootDiv = util.createElement(document, "div"); //$NON-NLS-0$
			this._rootDiv = rootDiv;
			rootDiv.tabIndex = -1;
			rootDiv.style.position = "relative"; //$NON-NLS-0$
			rootDiv.style.overflow = "hidden"; //$NON-NLS-0$
			rootDiv.style.width = "100%"; //$NON-NLS-0$
			rootDiv.style.height = "100%"; //$NON-NLS-0$
			rootDiv.style.overflow = "hidden"; //$NON-NLS-0$
			rootDiv.style.WebkitTextSizeAdjust = "100%"; //$NON-NLS-0$
			rootDiv.setAttribute("role", "application"); //$NON-NLS-1$ //$NON-NLS-0$
			parent.appendChild(rootDiv);
			
			var leftDiv = this._createRulerParent("textviewLeftRuler"); //$NON-NLS-0$
			this._leftDiv = leftDiv;

			var viewDiv = util.createElement(document, "div"); //$NON-NLS-0$
			viewDiv.className = "textviewScroll"; //$NON-NLS-0$
			this._viewDiv = viewDiv;
			viewDiv.tabIndex = -1;
			viewDiv.style.position = "absolute"; //$NON-NLS-0$
			viewDiv.style.top = "0px"; //$NON-NLS-0$
			viewDiv.style.bottom = "0px"; //$NON-NLS-0$
			viewDiv.style.borderWidth = "0px"; //$NON-NLS-0$
			viewDiv.style.margin = "0px"; //$NON-NLS-0$
			viewDiv.style.outline = "none"; //$NON-NLS-0$
			viewDiv.style.background = "transparent"; //$NON-NLS-0$
			if (util.isMac && util.isWebkit) {
				viewDiv.style.pointerEvents = "none"; //$NON-NLS-0$
				viewDiv.style.zIndex = "2"; //$NON-NLS-0$
			}
			rootDiv.appendChild(viewDiv);
			
			var rightDiv = this._createRulerParent("textviewRightRuler"); //$NON-NLS-0$
			this._rightDiv = rightDiv;
			rightDiv.style.right = "0px"; //$NON-NLS-0$
				
			var scrollDiv = util.createElement(document, "div"); //$NON-NLS-0$
			this._scrollDiv = scrollDiv;
			scrollDiv.style.margin = "0px"; //$NON-NLS-0$
			scrollDiv.style.borderWidth = "0px"; //$NON-NLS-0$
			scrollDiv.style.padding = "0px"; //$NON-NLS-0$
			viewDiv.appendChild(scrollDiv);
			
			var marginDiv = this._marginDiv = this._createRulerParent("textviewMarginRuler"); //$NON-NLS-0$
			marginDiv.style.zIndex = "4"; //$NON-NLS-0$
			
			if (!util.isIE && !util.isIOS) {
				var clipDiv = util.createElement(document, "div"); //$NON-NLS-0$
				this._clipDiv = clipDiv;
				clipDiv.style.position = "absolute"; //$NON-NLS-0$
				clipDiv.style.overflow = "hidden"; //$NON-NLS-0$
				clipDiv.style.margin = "0px"; //$NON-NLS-0$
				clipDiv.style.borderWidth = "0px"; //$NON-NLS-0$
				clipDiv.style.padding = "0px"; //$NON-NLS-0$
				clipDiv.style.background = "transparent"; //$NON-NLS-0$
				rootDiv.appendChild(clipDiv);
				
				var clipScrollDiv = util.createElement(document, "div"); //$NON-NLS-0$
				this._clipScrollDiv = clipScrollDiv;
				clipScrollDiv.style.position = "absolute"; //$NON-NLS-0$
				clipScrollDiv.style.height = "1px"; //$NON-NLS-0$
				clipScrollDiv.style.top = "-1000px"; //$NON-NLS-0$
				clipScrollDiv.style.background = "transparent"; //$NON-NLS-0$
				clipDiv.appendChild(clipScrollDiv);
			}
			
			this._setFullSelection(this._fullSelection, true);

			var clientDiv = util.createElement(document, "div"); //$NON-NLS-0$
			clientDiv.className = "textviewContent"; //$NON-NLS-0$
			this._clientDiv = clientDiv;
			clientDiv.tabIndex = 0;
			clientDiv.style.position = "absolute"; //$NON-NLS-0$
			clientDiv.style.borderWidth = "0px"; //$NON-NLS-0$
			clientDiv.style.margin = "0px"; //$NON-NLS-0$
			clientDiv.style.padding = "0px"; //$NON-NLS-0$
			clientDiv.style.outline = "none"; //$NON-NLS-0$
			clientDiv.style.zIndex = "1"; //$NON-NLS-0$
			clientDiv.style.WebkitUserSelect = "text"; //$NON-NLS-0$
			clientDiv.setAttribute("spellcheck", "false"); //$NON-NLS-1$ //$NON-NLS-0$
			if (util.isIOS || util.isAndroid) {
				clientDiv.style.WebkitTapHighlightColor = "transparent"; //$NON-NLS-0$
			}
			(this._clipDiv || rootDiv).appendChild(clientDiv);
			
			if (util.isIOS || util.isAndroid) {
				var vScrollDiv = util.createElement(document, "div"); //$NON-NLS-0$
				this._vScrollDiv = vScrollDiv;
				vScrollDiv.style.position = "absolute"; //$NON-NLS-0$
				vScrollDiv.style.borderWidth = "1px"; //$NON-NLS-0$
				vScrollDiv.style.borderColor = "white"; //$NON-NLS-0$
				vScrollDiv.style.borderStyle = "solid"; //$NON-NLS-0$
				vScrollDiv.style.borderRadius = "4px"; //$NON-NLS-0$
				vScrollDiv.style.backgroundColor = "black"; //$NON-NLS-0$
				vScrollDiv.style.opacity = "0.5"; //$NON-NLS-0$
				vScrollDiv.style.margin = "0px"; //$NON-NLS-0$
				vScrollDiv.style.padding = "0px"; //$NON-NLS-0$
				vScrollDiv.style.outline = "none"; //$NON-NLS-0$
				vScrollDiv.style.zIndex = "3"; //$NON-NLS-0$
				vScrollDiv.style.width = "8px"; //$NON-NLS-0$
				vScrollDiv.style.display = "none"; //$NON-NLS-0$
				rootDiv.appendChild(vScrollDiv);
				var hScrollDiv = util.createElement(document, "div"); //$NON-NLS-0$
				this._hScrollDiv = hScrollDiv;
				hScrollDiv.style.position = "absolute"; //$NON-NLS-0$
				hScrollDiv.style.borderWidth = "1px"; //$NON-NLS-0$
				hScrollDiv.style.borderColor = "white"; //$NON-NLS-0$
				hScrollDiv.style.borderStyle = "solid"; //$NON-NLS-0$
				hScrollDiv.style.borderRadius = "4px"; //$NON-NLS-0$
				hScrollDiv.style.backgroundColor = "black"; //$NON-NLS-0$
				hScrollDiv.style.opacity = "0.5"; //$NON-NLS-0$
				hScrollDiv.style.margin = "0px"; //$NON-NLS-0$
				hScrollDiv.style.padding = "0px"; //$NON-NLS-0$
				hScrollDiv.style.outline = "none"; //$NON-NLS-0$
				hScrollDiv.style.zIndex = "3"; //$NON-NLS-0$
				hScrollDiv.style.height = "8px"; //$NON-NLS-0$
				hScrollDiv.style.display = "none"; //$NON-NLS-0$
				rootDiv.appendChild(hScrollDiv);
			}

			if (util.isFirefox && !clientDiv.setCapture) {
				var overlayDiv = util.createElement(document, "div"); //$NON-NLS-0$
				this._overlayDiv = overlayDiv;
				overlayDiv.style.position = clientDiv.style.position;
				overlayDiv.style.borderWidth = clientDiv.style.borderWidth;
				overlayDiv.style.margin = clientDiv.style.margin;
				overlayDiv.style.padding = clientDiv.style.padding;
				overlayDiv.style.cursor = "text"; //$NON-NLS-0$
				overlayDiv.style.zIndex = "2"; //$NON-NLS-0$
				(this._clipDiv || rootDiv).appendChild(overlayDiv);
			}
			clientDiv.contentEditable = "true"; //$NON-NLS-0$
			clientDiv.setAttribute("role", "textbox"); //$NON-NLS-1$ //$NON-NLS-0$
			clientDiv.setAttribute("aria-multiline", "true"); //$NON-NLS-1$ //$NON-NLS-0$
			this._setWrapMode(this._wrapMode, true);
			this._setReadOnly(this._readonly);
			this._setThemeClass(this._themeClass, true);
			this._setTabSize(this._tabSize, true);
			this._setMarginOffset(this._marginOffset, true);
			this._hookEvents();
			var rulers = this._rulers;
			for (var i=0; i<rulers.length; i++) {
				this._createRuler(rulers[i]);
			}
			this._update();
		},
		_defaultOptions: function() {
			return {
				parent: {value: undefined, update: null},
				model: {value: undefined, update: this.setModel},
				scrollAnimation: {value: 0, update: null},
				readonly: {value: false, update: this._setReadOnly},
				fullSelection: {value: true, update: this._setFullSelection},
				tabMode: { value: true, update: null },
				tabSize: {value: 8, update: this._setTabSize},
				expandTab: {value: false, update: null},
				singleMode: {value: false, update: this._setSingleMode},
				overwriteMode: { value: false, update: this._setOverwriteMode },
				blockCursorVisible: { value: false, update: this._setBlockCursor},
				marginOffset: {value: 0, update: this._setMarginOffset},
				wrapOffset: {value: 0, update: this._setWrapOffset},
				wrapMode: {value: false, update: this._setWrapMode},
				wrappable: {value: false, update: null},
				theme: {value: mTextTheme.TextTheme.getTheme(), update: this._setTheme},
				themeClass: {value: undefined, update: this._setThemeClass}
			};
		},
		_destroyRuler: function(ruler) {
			var rulerParent = this._getRulerParent(ruler);
			if (rulerParent) {
				var div = rulerParent.firstChild;
				while (div) {
					if (div._ruler === ruler) {
						div._ruler = undefined;
						rulerParent.removeChild(div);
						if (rulerParent.children.length === 0 && (rulerParent !== this._marginDiv || !this._marginOffset)) {
							rulerParent.style.display = "none"; //$NON-NLS-0$
						}
						break;
					}
					div = div.nextSibling;
				}
			}
		},
		_destroyView: function() {
			var clientDiv = this._clientDiv;
			if (!clientDiv) { return; }
			this._setGrab(null);
			this._unhookEvents();

			/* Destroy timers */
			var window = this._getWindow();
			if (this._autoScrollTimerID) {
				window.clearTimeout(this._autoScrollTimerID);
				this._autoScrollTimerID = null;
			}
			if (this._updateTimer) {
				window.clearTimeout(this._updateTimer);
				this._updateTimer = null;
			}
			
			var rootDiv = this._rootDiv;
			rootDiv.parentNode.removeChild(rootDiv);

			/* Destroy DOM */
			this._selDiv1 = null;
			this._selDiv2 = null;
			this._selDiv3 = null;
			this._clipboardDiv = null;
			this._rootDiv = null;
			this._scrollDiv = null;
			this._viewDiv = null;
			this._clipDiv = null;
			this._clipScrollDiv = null;
			this._clientDiv = null;
			this._overlayDiv = null;
			this._leftDiv = null;
			this._rightDiv = null;
			this._marginDiv = null;
			this._cursorDiv = null;
			this._vScrollDiv = null;
			this._hScrollDiv = null;
		},
		_doAutoScroll: function (direction, x, y) {
			this._autoScrollDir = direction;
			this._autoScrollX = x;
			this._autoScrollY = y;
			if (!this._autoScrollTimerID) {
				this._autoScrollTimer();
			}
		},
		_endAutoScroll: function () {
			if (this._autoScrollTimerID) {
				var window = this._getWindow();
				window.clearTimeout(this._autoScrollTimerID);
			}
			this._autoScrollDir = undefined;
			this._autoScrollTimerID = undefined;
		},
		_fixCaret: function() {
			var clientDiv = this._clientDiv;
			if (clientDiv) {
				var hasFocus = this._hasFocus;
				this._ignoreFocus = true;
				if (hasFocus) { clientDiv.blur(); }
				clientDiv.contentEditable = false;
				clientDiv.contentEditable = true;
				if (hasFocus) { clientDiv.focus(); }
				this._ignoreFocus = false;
			}
		},
		_getBaseText: function(start, end) {
			var model = this._model;
			/* This is the only case the view access the base model, alternatively the view could use a event to application to customize the text */
			if (model.getBaseModel) {
				start = model.mapOffset(start);
				end = model.mapOffset(end);
				model = model.getBaseModel();
			}
			return model.getText(start, end);
		},
		_getBottomIndex: function (fullyVisible) {
			var child = this._bottomChild;
			if (fullyVisible && this._getClientHeight() > this._getLineHeight()) {
				var rect = child.getBoundingClientRect();
				var clientRect = this._clientDiv.getBoundingClientRect();
				if (rect.bottom > clientRect.bottom) {
					child = this._getLinePrevious(child) || child;
				}
			}
			return child.lineIndex;
		},
		_getBoundsAtOffset: function(offset) {
			var model = this._model;
			var line = this._getLine(model.getLineAtOffset(offset));
			var result = line.getBoundingClientRect(offset);
			var linePixel = this._getLinePixel(line.lineIndex);
			result.top += linePixel;
			result.bottom += linePixel;
			line.destroy();
			return result;
		},
		_getClientHeight: function() {
			var viewPad = this._getViewPadding();
			return Math.max(0, this._viewDiv.clientHeight - viewPad.top - viewPad.bottom);
		},
		_getClientWidth: function() {
			var viewPad = this._getViewPadding();
			return Math.max(0, this._viewDiv.clientWidth - viewPad.left - viewPad.right);
		},
		_getClipboardText: function (event, handler) {
			var delimiter = this._model.getLineDelimiter();
			var clipboadText, text;
			// IE
			var window = this._getWindow();
			var clipboardData = window.clipboardData;
			// WebKit and Firefox > 21
			if (!clipboardData && event) {
				clipboardData = event.clipboardData;
			}
			if (clipboardData) {
				clipboadText = [];
				text = clipboardData.getData(util.isIE ? "Text" : "text/plain"); //$NON-NLS-1$"//$NON-NLS-0$
				convertDelimiter(text, function(t) {clipboadText.push(t);}, function() {clipboadText.push(delimiter);});
				text = clipboadText.join("");
				if (handler) { handler(text); }
				return text;
			}
			if (util.isFirefox) {
				this._ignoreFocus = true;
				var clipboardDiv = this._clipboardDiv;
				var document = this._rootDiv.ownerDocument;
				if (!clipboardDiv) {
					clipboardDiv = util.createElement(document, "div"); //$NON-NLS-0$
					this._clipboardDiv = clipboardDiv;
					clipboardDiv.style.position = "fixed"; //$NON-NLS-0$
					clipboardDiv.style.whiteSpace = "pre"; //$NON-NLS-0$
					clipboardDiv.style.left = "-1000px"; //$NON-NLS-0$
					this._rootDiv.appendChild(clipboardDiv);
				}
				clipboardDiv.innerHTML = "<pre contenteditable=''></pre>"; //$NON-NLS-0$
				clipboardDiv.firstChild.focus();
				var self = this;
				var _getText = function() {
					var noteText = self._getTextFromElement(clipboardDiv);
					clipboardDiv.innerHTML = "";
					clipboadText = [];
					convertDelimiter(noteText, function(t) {clipboadText.push(t);}, function() {clipboadText.push(delimiter);});
					return clipboadText.join("");
				};
				
				/* Try execCommand first. Works on firefox with clipboard permission. */
				var result = false;
				this._ignorePaste = true;

				/* Do not try execCommand if middle-click is used, because if we do, we get the clipboard text, not the primary selection text. */
				if (!util.isLinux || this._lastMouseButton !== 2) {
					try {
						result = document.execCommand("paste", false, null); //$NON-NLS-0$
					} catch (ex) {
						/* Firefox can throw even when execCommand() works, see bug 362835. */
						result = clipboardDiv.childNodes.length > 1 || clipboardDiv.firstChild && clipboardDiv.firstChild.childNodes.length > 0;
					}
				}
				this._ignorePaste = false;
				if (!result) {
					/* Try native paste in DOM, works for firefox during the paste event. */
					if (event) {
						window.setTimeout(function() {
							self.focus();
							text = _getText();
							if (text && handler) {
								handler(text);
							}
							self._ignoreFocus = false;
						}, 0);
						return null;
					} else {
						/* no event and no clipboard permission, paste can't be performed */
						this.focus();
						this._ignoreFocus = false;
						return "";
					}
				}
				this.focus();
				this._ignoreFocus = false;
				text = _getText();
				if (text && handler) {
					handler(text);
				}
				return text;
			}
			return "";
		},
		_getDOMText: function(child, offsetNode) {
			var lineChild = child.firstChild;
			var text = "", offset = 0;
			while (lineChild) {
				var textNode;
				if (lineChild.ignore) {
					lineChild = lineChild.nextSibling;
					continue;
				}
				if (lineChild.ignoreChars) {
					textNode = lineChild.lastChild;
					var ignored = 0, childText = [], childOffset = -1;
					while (textNode) {
						var data = textNode.data;
						if (data) {
							for (var i = data.length - 1; i >= 0; i--) {
								var ch = data.substring(i, i + 1);
								if (ignored < lineChild.ignoreChars && (ch === " " || ch === "\u200B" || ch === "\uFEFF")) { //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
									ignored++;
								} else {
									childText.push(ch === "\u00A0" ? "\t" : ch); //$NON-NLS-1$ //$NON-NLS-0$
								}
							}
						}
						if (offsetNode === textNode) {
							childOffset = childText.length;
						}
						textNode = textNode.previousSibling;
					}
					childText = childText.reverse().join("");
					if (childOffset !== -1) {
						offset = text.length + childText.length - childOffset;
					}
					text += childText;
				} else {
					textNode = lineChild.firstChild;
					while (textNode) {
						if (offsetNode === textNode) {
							offset = text.length;
						}
						text += textNode.data;
						textNode = textNode.nextSibling;
					}
				}
				lineChild = lineChild.nextSibling;
			}
			return {text: text, offset: offset};
		},
		_getTextFromElement: function(element) {
			var document = element.ownerDocument;
			var window = document.defaultView;
			if (!window.getSelection) {
				return element.innerText || element.textContent;
			}

			var newRange = document.createRange();
			newRange.selectNode(element);

			var selection = window.getSelection();
			var oldRanges = [], i;
			for (i = 0; i < selection.rangeCount; i++) {
				oldRanges.push(selection.getRangeAt(i));
			}

			this._ignoreSelect = true;
			selection.removeAllRanges();
			selection.addRange(newRange);

			var text = selection.toString();

			selection.removeAllRanges();
			for (i = 0; i < oldRanges.length; i++) {
				selection.addRange(oldRanges[i]);
			}

			this._ignoreSelect = false;
			return text;
		},
		_getViewPadding: function() {
			return this._metrics.viewPadding;
		},
		_getLine: function(lineIndex) {
			var child = this._getLineNode(lineIndex);
			if (child && !child.lineChanged && !child.lineRemoved) {
				return child._line;
			}
			return new TextLine(this, lineIndex);
		},
		_getLineHeight: function(lineIndex, calculate) {
			if (lineIndex !== undefined && this._lineHeight) {
				var lineHeight = this._lineHeight[lineIndex];
				if (lineHeight) { return lineHeight; }
				if (calculate || calculate === undefined) {
					var height = this._lineHeight[lineIndex] = this._calculateLineHeight(lineIndex);
					return height;
				}
			}
			return this._metrics.lineHeight;
		},
		_getLineNode: function (lineIndex) {
			var clientDiv = this._clientDiv;
			var child = clientDiv.firstChild;
			while (child) {
				if (lineIndex === child.lineIndex) {
					return child;
				}
				child = child.nextSibling;
			}
			return undefined;
		},
		_getLineNext: function (lineNode) {
			var node = lineNode ? lineNode.nextSibling : this._clientDiv.firstChild;
			while (node && node.lineIndex === -1) {
				node = node.nextSibling;
			}
			return node;
		},
		_getLinePrevious: function (lineNode) {
			var node = lineNode ? lineNode.previousSibling : this._clientDiv.lastChild;
			while (node && node.lineIndex === -1) {
				node = node.previousSibling;
			}
			return node;
		},
		_getLinePixel: function(lineIndex) {
			lineIndex = Math.min(Math.max(0, lineIndex), this._model.getLineCount());
			if (this._lineHeight) {
				var topIndex = this._getTopIndex();
				var pixel = -this._topIndexY + this._getScroll().y, i;
				if (lineIndex > topIndex) {
					for (i = topIndex; i < lineIndex; i++) {
						pixel += this._getLineHeight(i);
					}
				} else {
					for (i = topIndex - 1; i >= lineIndex; i--) {
						pixel -= this._getLineHeight(i);
					}
				}
				return pixel;
			}
			var lineHeight = this._getLineHeight();
			return lineHeight * lineIndex;
		},
		_getLineIndex: function(y) {
			var lineHeight, lineIndex = 0;
			var lineCount = this._model.getLineCount();
			if (this._lineHeight) {
				lineIndex = this._getTopIndex();
				var pixel = -this._topIndexY + this._getScroll().y;
				if (y !== pixel) {
					if (y < pixel) {
						while (y < pixel && lineIndex > 0) {
							y += this._getLineHeight(--lineIndex);
						}
					} else {
						lineHeight = this._getLineHeight(lineIndex);
						while (y - lineHeight >= pixel && lineIndex < lineCount - 1) {
							y -= lineHeight;
							lineHeight = this._getLineHeight(++lineIndex);
						}
					}
				}
			} else {
				lineHeight = this._getLineHeight();
				lineIndex = Math.floor(y / lineHeight);
			}
			return Math.max(0, Math.min(lineCount - 1, lineIndex));
		},
		_getRulerParent: function(ruler) {
			switch (ruler.getLocation()) {
				case "left": return this._leftDiv; //$NON-NLS-0$
				case "right": return this._rightDiv; //$NON-NLS-0$
				case "margin": return this._marginDiv; //$NON-NLS-0$
			}
			return null;
		},
		_getScroll: function(cancelAnimation) {
			if (cancelAnimation === undefined || cancelAnimation) {
				this._cancelAnimation();
			}
			var viewDiv = this._viewDiv;
			return {x: viewDiv.scrollLeft, y: viewDiv.scrollTop};
		},
		_getSelection: function () {
			return this._selection.clone();
		},
		_getTopIndex: function (fullyVisible) {
			var child = this._topChild;
			if (fullyVisible && this._getClientHeight() > this._getLineHeight()) {
				var rect = child.getBoundingClientRect();
				var viewPad = this._getViewPadding();
				var viewRect = this._viewDiv.getBoundingClientRect();
				if (rect.top < viewRect.top + viewPad.top) {
					child = this._getLineNext(child) || child;
				}
			}
			return child.lineIndex;
		},
		_hookEvents: function() {
			var self = this;
			this._modelListener = {
				/** @private */
				onChanging: function(modelChangingEvent) {
					self._onModelChanging(modelChangingEvent);
				},
				/** @private */
				onChanged: function(modelChangedEvent) {
					self._onModelChanged(modelChangedEvent);
				}
			};
			this._model.addEventListener("preChanging", this._modelListener.onChanging); //$NON-NLS-0$
			this._model.addEventListener("postChanged", this._modelListener.onChanged); //$NON-NLS-0$
			
			this._themeListener = {
				onChanged: function(themeChangedEvent) {
					self._setThemeClass(self._themeClass);
				}
			};
			this._theme.addEventListener("ThemeChanged", this._themeListener.onChanged); //$NON-NLS-0$
			
			var handlers = this._handlers = [];
			var clientDiv = this._clientDiv, viewDiv = this._viewDiv, rootDiv = this._rootDiv;
			var topNode = this._overlayDiv || clientDiv;
			var document = clientDiv.ownerDocument;
			var window = this._getWindow();
			var grabNode = util.isIE ? document : window;
			handlers.push({target: window, type: "resize", handler: function(e) { return self._handleResize(e ? e : window.event);}}); //$NON-NLS-0$
			handlers.push({target: clientDiv, type: "blur", handler: function(e) { return self._handleBlur(e ? e : window.event);}}); //$NON-NLS-0$
			handlers.push({target: clientDiv, type: "focus", handler: function(e) { return self._handleFocus(e ? e : window.event);}}); //$NON-NLS-0$
			handlers.push({target: viewDiv, type: "focus", handler: function(e) { clientDiv.focus(); }}); //$NON-NLS-0$
			handlers.push({target: viewDiv, type: "scroll", handler: function(e) { return self._handleScroll(e ? e : window.event);}}); //$NON-NLS-0$
			handlers.push({target: clientDiv, type: "textInput", handler: function(e) { return self._handleTextInput(e ? e : window.event); }}); //$NON-NLS-0$
			handlers.push({target: clientDiv, type: "keydown", handler: function(e) { return self._handleKeyDown(e ? e : window.event);}}); //$NON-NLS-0$
			handlers.push({target: clientDiv, type: "keypress", handler: function(e) { return self._handleKeyPress(e ? e : window.event);}}); //$NON-NLS-0$
			handlers.push({target: clientDiv, type: "keyup", handler: function(e) { return self._handleKeyUp(e ? e : window.event);}}); //$NON-NLS-0$
			if (util.isIE) {
				handlers.push({target: document, type: "keyup", handler: function(e) { return self._handleDocKeyUp(e ? e : window.event);}}); //$NON-NLS-0$
			}
			handlers.push({target: clientDiv, type: "contextmenu", handler: function(e) { return self._handleContextMenu(e ? e : window.event);}}); //$NON-NLS-0$
			handlers.push({target: clientDiv, type: "copy", handler: function(e) { return self._handleCopy(e ? e : window.event);}}); //$NON-NLS-0$
			handlers.push({target: clientDiv, type: "cut", handler: function(e) { return self._handleCut(e ? e : window.event);}}); //$NON-NLS-0$
			handlers.push({target: clientDiv, type: "paste", handler: function(e) { return self._handlePaste(e ? e : window.event);}}); //$NON-NLS-0$
			if (util.isIOS || util.isAndroid) {
				handlers.push({target: document, type: "selectionchange", handler: function(e) { return self._handleSelectionChange(e ? e : window.event); }}); //$NON-NLS-0$
				handlers.push({target: clientDiv, type: "touchstart", handler: function(e) { return self._handleTouchStart(e ? e : window.event); }}); //$NON-NLS-0$
				handlers.push({target: clientDiv, type: "touchmove", handler: function(e) { return self._handleTouchMove(e ? e : window.event); }}); //$NON-NLS-0$
				handlers.push({target: clientDiv, type: "touchend", handler: function(e) { return self._handleTouchEnd(e ? e : window.event); }}); //$NON-NLS-0$
			} else {
				handlers.push({target: clientDiv, type: "selectstart", handler: function(e) { return self._handleSelectStart(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: clientDiv, type: "mousedown", handler: function(e) { return self._handleMouseDown(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: clientDiv, type: "mouseover", handler: function(e) { return self._handleMouseOver(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: clientDiv, type: "mouseout", handler: function(e) { return self._handleMouseOut(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: grabNode, type: "mouseup", handler: function(e) { return self._handleMouseUp(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: grabNode, type: "mousemove", handler: function(e) { return self._handleMouseMove(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: rootDiv, type: "mousedown", handler: function(e) { return self._handleRootMouseDown(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: rootDiv, type: "mouseup", handler: function(e) { return self._handleRootMouseUp(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: topNode, type: "dragstart", handler: function(e) { return self._handleDragStart(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: topNode, type: "drag", handler: function(e) { return self._handleDrag(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: topNode, type: "dragend", handler: function(e) { return self._handleDragEnd(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: topNode, type: "dragenter", handler: function(e) { return self._handleDragEnter(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: topNode, type: "dragover", handler: function(e) { return self._handleDragOver(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: topNode, type: "dragleave", handler: function(e) { return self._handleDragLeave(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: topNode, type: "drop", handler: function(e) { return self._handleDrop(e ? e : window.event);}}); //$NON-NLS-0$
				handlers.push({target: this._clientDiv, type: util.isFirefox > 26 ? "wheel" : util.isFirefox ? "DOMMouseScroll" : "mousewheel", handler: function(e) { return self._handleMouseWheel(e ? e : window.event); }}); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				if (this._clipDiv) {
					handlers.push({target: this._clipDiv, type: util.isFirefox > 26 ? "wheel" : util.isFirefox ? "DOMMouseScroll" : "mousewheel", handler: function(e) { return self._handleMouseWheel(e ? e : window.event); }}); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				}
				if (util.isFirefox && (!util.isWindows || util.isFirefox >= 15)) {
					var MutationObserver = window.MutationObserver || window.MozMutationObserver;
					if (MutationObserver) {
						this._mutationObserver = new MutationObserver(function(mutations) { self._handleDataModified(mutations); });
						this._mutationObserver.observe(clientDiv, {subtree: true, characterData: true});
					} else {
						handlers.push({target: this._clientDiv, type: "DOMCharacterDataModified", handler: function (e) { return self._handleDataModified(e ? e : window.event); }}); //$NON-NLS-0$
					}
				}
				if (this._overlayDiv) {
					handlers.push({target: this._overlayDiv, type: "mousedown", handler: function(e) { return self._handleMouseDown(e ? e : window.event);}}); //$NON-NLS-0$
					handlers.push({target: this._overlayDiv, type: "mouseover", handler: function(e) { return self._handleMouseOver(e ? e : window.event);}}); //$NON-NLS-0$
					handlers.push({target: this._overlayDiv, type: "mouseout", handler: function(e) { return self._handleMouseOut(e ? e : window.event);}}); //$NON-NLS-0$
					handlers.push({target: this._overlayDiv, type: "contextmenu", handler: function(e) { return self._handleContextMenu(e ? e : window.event); }}); //$NON-NLS-0$
				}
				if (!this._isW3CEvents) {
					handlers.push({target: this._clientDiv, type: "dblclick", handler: function(e) { return self._handleDblclick(e ? e : window.event); }}); //$NON-NLS-0$
				}
			}

			this._hookRulerEvents(this._leftDiv, handlers);
			this._hookRulerEvents(this._rightDiv, handlers);
			this._hookRulerEvents(this._marginDiv, handlers);
			
			for (var i=0; i<handlers.length; i++) {
				var h = handlers[i];
				addHandler(h.target, h.type, h.handler, h.capture);
			}
		},
		_hookRulerEvents: function(div, handlers) {
			if (!div) { return; }
			var self = this;
			var window = this._getWindow();
			if (util.isIE) {
				handlers.push({target: div, type: "selectstart", handler: function() {return false;}}); //$NON-NLS-0$
			}
			handlers.push({target: div, type: util.isFirefox > 26 ? "wheel" : util.isFirefox ? "DOMMouseScroll" : "mousewheel", handler: function(e) { return self._handleMouseWheel(e ? e : window.event); }}); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			handlers.push({target: div, type: "click", handler: function(e) { self._handleRulerEvent(e ? e : window.event); }}); //$NON-NLS-0$
			handlers.push({target: div, type: "dblclick", handler: function(e) { self._handleRulerEvent(e ? e : window.event); }}); //$NON-NLS-0$
			handlers.push({target: div, type: "mousemove", handler: function(e) { self._handleRulerEvent(e ? e : window.event); }}); //$NON-NLS-0$
			handlers.push({target: div, type: "mouseover", handler: function(e) { self._handleRulerEvent(e ? e : window.event); }}); //$NON-NLS-0$
			handlers.push({target: div, type: "mouseout", handler: function(e) { self._handleRulerEvent(e ? e : window.event); }}); //$NON-NLS-0$
		},
		_getWindow: function() {
			return getWindow(this._parent.ownerDocument);
		},
		_ignoreEvent: function(e) {
			var node = e.target;
			while (node && node !== this._clientDiv) {
				if (node.ignore) { return true; }
				node = node.parentNode;
			}
			return false;
		},
		_init: function(options) {
			var parent = options.parent;
			if (typeof(parent) === "string") { //$NON-NLS-0$
				parent = (options.document || document).getElementById(parent);
			}
			if (!parent) { throw "no parent"; } //$NON-NLS-0$
			options.parent = parent;
			options.model = options.model || new mTextModel.TextModel();
			var defaultOptions = this._defaultOptions();
			for (var option in defaultOptions) {
				if (defaultOptions.hasOwnProperty(option)) {
					var value;
					if (options[option] !== undefined) {
						value = options[option];
					} else {
						value = defaultOptions[option].value;
					}
					this["_" + option] = value; //$NON-NLS-0$
				}
			}
			this._keyModes = [];
			this._rulers = [];
			this._selection = new Selection (0, 0, false);
			this._linksVisible = false;
			this._redrawCount = 0;
			this._maxLineWidth = 0;
			this._maxLineIndex = -1;
			this._ignoreSelect = true;
			this._ignoreFocus = false;
			this._hasFocus = false;
			this._columnX = -1;
			this._dragOffset = -1;
			this._isRangeRects = (!util.isIE || util.isIE >= 9) && typeof parent.ownerDocument.createRange().getBoundingClientRect === "function"; //$NON-NLS-0$
			this._isW3CEvents = parent.addEventListener;

			/* Auto scroll */
			this._autoScrollX = null;
			this._autoScrollY = null;
			this._autoScrollTimerID = null;
			this._AUTO_SCROLL_RATE = 50;
			this._grabControl = null;
			this._moseMoveClosure  = null;
			this._mouseUpClosure = null;
			
			/* Double click */
			this._lastMouseX = 0;
			this._lastMouseY = 0;
			this._lastMouseTime = 0;
			this._clickCount = 0;
			this._clickTime = 250;
			this._clickDist = 5;
			this._isMouseDown = false;
			this._doubleClickSelection = null;
			
			/* Scroll */
			this._hScroll = 0;
			this._vScroll = 0;

			/* IME */
			this._imeOffset = -1;
			
			/* Create elements */
			this._createActions();
			this._createView();
		},
		_modifyContent: function(e, updateCaret) {
			if (this._readonly && !e._code) {
				return;
			}
			e.type = "Verify"; //$NON-NLS-0$
			this.onVerify(e);

			if (e.text === null || e.text === undefined) { return; }
			
			var model = this._model;
			try {
				if (e._ignoreDOMSelection) { this._ignoreDOMSelection = true; }
				model.setText(e.text, e.start, e.end);
			} finally {
				if (e._ignoreDOMSelection) { this._ignoreDOMSelection = false; }
			}
			
			if (updateCaret) {
				var selection = this._getSelection ();
				selection.setCaret(e.start + e.text.length);
				this._setSelection(selection, true);
			}
			this.onModify({type: "Modify"}); //$NON-NLS-0$
		},
		_onModelChanged: function(modelChangedEvent) {
			modelChangedEvent.type = "ModelChanged"; //$NON-NLS-0$
			this.onModelChanged(modelChangedEvent);
			modelChangedEvent.type = "Changed"; //$NON-NLS-0$
			var start = modelChangedEvent.start;
			var addedCharCount = modelChangedEvent.addedCharCount;
			var removedCharCount = modelChangedEvent.removedCharCount;
			var addedLineCount = modelChangedEvent.addedLineCount;
			var removedLineCount = modelChangedEvent.removedLineCount;
			var selection = this._getSelection();
			if (selection.end > start) {
				if (selection.end > start && selection.start < start + removedCharCount) {
					// selection intersects replaced text. set caret behind text change
					selection.setCaret(start + addedCharCount);
				} else {
					// move selection to keep same text selected
					selection.start +=  addedCharCount - removedCharCount;
					selection.end +=  addedCharCount - removedCharCount;
				}
				this._setSelection(selection, false, false);
			}
			
			var model = this._model;
			var startLine = model.getLineAtOffset(start);
			var child = this._getLineNext();
			while (child) {
				var lineIndex = child.lineIndex;
				if (startLine <= lineIndex && lineIndex <= startLine + removedLineCount) {
					if (startLine === lineIndex && !child.modelChangedEvent && !child.lineRemoved) {
						child.modelChangedEvent = modelChangedEvent;
						child.lineChanged = true;
					} else {
						child.lineRemoved = true;
						child.lineChanged = false;
						child.modelChangedEvent = null;
					}
				}
				if (lineIndex > startLine + removedLineCount) {
					child.lineIndex = lineIndex + addedLineCount - removedLineCount;
					child._line.lineIndex = child.lineIndex;
				}
				child = this._getLineNext(child);
			}
			if (this._lineHeight) {
				var args = [startLine, removedLineCount].concat(new Array(addedLineCount));
				Array.prototype.splice.apply(this._lineHeight, args);
			}
			if (!this._wrapMode) {
				if (startLine <= this._maxLineIndex && this._maxLineIndex <= startLine + removedLineCount) {
					this._checkMaxLineIndex = this._maxLineIndex;
					this._maxLineIndex = -1;
					this._maxLineWidth = 0;
				}
			}
			this._update();
		},
		_onModelChanging: function(modelChangingEvent) {
			modelChangingEvent.type = "ModelChanging"; //$NON-NLS-0$
			this.onModelChanging(modelChangingEvent);
			modelChangingEvent.type = "Changing"; //$NON-NLS-0$
		},
		_queueUpdate: function() {
			if (this._updateTimer || this._ignoreQueueUpdate) { return; }
			var self = this;
			var window = this._getWindow();
			this._updateTimer = window.setTimeout(function() { 
				self._updateTimer = null;
				self._update();
			}, 0);
		},
		_resetLineHeight: function(startLine, endLine) {
			if (this._wrapMode || this._variableLineHeight) {
				if (startLine !== undefined && endLine !== undefined) {
					for (var i = startLine; i < endLine; i++) {
						this._lineHeight[i] = undefined;
					}
				} else {
					this._lineHeight = new Array(this._model.getLineCount());
				}
				this._calculateLineHeightTimer();
			} else {
				this._lineHeight = null;
			}
		},
		_resetLineWidth: function() {
			var clientDiv = this._clientDiv;
			if (clientDiv) {
				var child = clientDiv.firstChild;
				while (child) {
					child.lineWidth = undefined;
					child = child.nextSibling;
				}
			}
		},
		_reset: function() {
			this._maxLineIndex = -1;
			this._maxLineWidth = 0;
			this._columnX = -1;
			this._topChild = null;
			this._bottomChild = null;
			this._topIndexY = 0;
			this._variableLineHeight = false;
			this._resetLineHeight();
			this._setSelection(new Selection (0, 0, false), false, false);
			if (this._viewDiv) {
				this._viewDiv.scrollLeft = 0;
				this._viewDiv.scrollTop = 0;
			}
			var clientDiv = this._clientDiv;
			if (clientDiv) {
				var child = clientDiv.firstChild;
				while (child) {
					child.lineRemoved = true;
					child = child.nextSibling;
				}
				/*
				* Bug in Firefox.  For some reason, the caret does not show after the
				* view is refreshed.  The fix is to toggle the contentEditable state and
				* force the clientDiv to loose and receive focus if it is focused.
				*/
				if (util.isFirefox) {
					this._ignoreFocus = false;
					var hasFocus = this._hasFocus;
					if (hasFocus) { clientDiv.blur(); }
					clientDiv.contentEditable = false;
					clientDiv.contentEditable = true;
					if (hasFocus) { clientDiv.focus(); }
					this._ignoreFocus = false;
				}
			}
		},
		_scrollViewAnimated: function (pixelX, pixelY, callback) {
			var window = this._getWindow();
			if (callback && this._scrollAnimation) {
				var self = this;
				this._animation = new Animation({
					window: window,
					duration: this._scrollAnimation,
					curve: [pixelY, 0],
					onAnimate: function(x) {
						var deltaY = pixelY - Math.floor(x);
						self._scrollView (0, deltaY);
						pixelY -= deltaY;
					},
					onEnd: function() {
						self._animation = null;
						self._scrollView (pixelX, pixelY);
						if (callback) {
							window.setTimeout(callback, 0);
						}
					}
				});
				this._animation.play();
			} else {
				this._scrollView (pixelX, pixelY);
				if (callback) {
					window.setTimeout(callback, 0);
				}
			}
		}, 
		_scrollView: function (pixelX, pixelY) {
			/*
			* Always set _ensureCaretVisible to false so that the view does not scroll
			* to show the caret when scrollView is not called from showCaret().
			*/
			this._ensureCaretVisible = false;
			
			/*
			* Scrolling is done only by setting the scrollLeft and scrollTop fields in the
			* view div. This causes an update from the scroll event. In some browsers 
			* this event is asynchronous and forcing update page to run synchronously
			* leads to redraw problems. 
			* On Chrome 11, the view redrawing at times when holding PageDown/PageUp key.
			* On Firefox 4 for Linux, the view redraws the first page when holding 
			* PageDown/PageUp key, but it will not redraw again until the key is released.
			*/
			var viewDiv = this._viewDiv;
			if (pixelX) { viewDiv.scrollLeft += pixelX; }
			if (pixelY) { viewDiv.scrollTop += pixelY; }
		},
		_setClipboardText: function (text, event) {
			var clipboardText;
			// IE
			var window = this._getWindow();
			var clipboardData = window.clipboardData;
			// WebKit and Firefox > 21
			if (!clipboardData && event) {
				clipboardData = event.clipboardData;
			}
			if (clipboardData) {
				clipboardText = [];
				convertDelimiter(text, function(t) {clipboardText.push(t);}, function() {clipboardText.push(util.platformDelimiter);});
				if (clipboardData.setData(util.isIE ? "Text" : "text/plain", clipboardText.join(""))) { //$NON-NLS-1$ //$NON-NLS-0$
					return true;
				}
			}
			var document = this._parent.ownerDocument;
			var child = util.createElement(document, "pre"); //$NON-NLS-0$
			child.style.position = "fixed"; //$NON-NLS-0$
			child.style.left = "-1000px"; //$NON-NLS-0$
			convertDelimiter(text, 
				function(t) {
					child.appendChild(document.createTextNode(t));
				}, 
				function() {
					child.appendChild(util.createElement(document, "br")); //$NON-NLS-0$
				}
			);
			child.appendChild(document.createTextNode(" ")); //$NON-NLS-0$
			this._clientDiv.appendChild(child);
			var range = document.createRange();
			range.setStart(child.firstChild, 0);
			range.setEndBefore(child.lastChild);
			var sel = window.getSelection();
			if (sel.rangeCount > 0) { sel.removeAllRanges(); }
			sel.addRange(range);
			var self = this;
			/** @ignore */
			var cleanup = function() {
				if (child && child.parentNode === self._clientDiv) {
					self._clientDiv.removeChild(child);
				}
				self._updateDOMSelection();
			};
			var result = false;
			/* 
			* Try execCommand first, it works on firefox with clipboard permission,
			* chrome 5, safari 4.
			*/
			this._ignoreCopy = true;
			try {
				result = document.execCommand("copy", false, null); //$NON-NLS-0$
			} catch (e) {}
			this._ignoreCopy = false;
			if (!result) {
				if (event) {
					window.setTimeout(cleanup, 0);
					return false;
				}
			}
			/* no event and no permission, copy can not be done */
			cleanup();
			return true;
		},
		_setDOMSelection: function (startNode, startOffset, endNode, endOffset, startCaret) {
			var startLineNode, startLineOffset, endLineNode, endLineOffset;
			var offset = 0;
			var lineChild = startNode.firstChild;
			var node, nodeLength, model = this._model;
			var startLineEnd = model.getLine(startNode.lineIndex).length;
			while (lineChild) {
				if (lineChild.ignore) {
					lineChild = lineChild.nextSibling;
					continue;
				}
				node = lineChild.firstChild;
				nodeLength = node.length;
				if (lineChild.ignoreChars) {
					nodeLength -= lineChild.ignoreChars;
				}
				if (offset + nodeLength > startOffset || offset + nodeLength >= startLineEnd) {
					startLineNode = node;
					startLineOffset = startOffset - offset;
					if (lineChild.ignoreChars && nodeLength > 0 && startLineOffset === nodeLength) {
						startLineOffset += lineChild.ignoreChars; 
					}
					break;
				}
				offset += nodeLength;
				lineChild = lineChild.nextSibling;
			}
			offset = 0;
			lineChild = endNode.firstChild;
			var endLineEnd = this._model.getLine(endNode.lineIndex).length;
			while (lineChild) {
				if (lineChild.ignore) {
					lineChild = lineChild.nextSibling;
					continue;
				}
				node = lineChild.firstChild;
				nodeLength = node.length;
				if (lineChild.ignoreChars) {
					nodeLength -= lineChild.ignoreChars;
				}
				if (nodeLength + offset > endOffset || offset + nodeLength >= endLineEnd) {
					endLineNode = node;
					endLineOffset = endOffset - offset;
					if (lineChild.ignoreChars && nodeLength > 0 && endLineOffset === nodeLength) {
						endLineOffset += lineChild.ignoreChars; 
					}
					break;
				}
				offset += nodeLength;
				lineChild = lineChild.nextSibling;
			}
			
			this._setDOMFullSelection(startNode, startOffset, startLineEnd, endNode, endOffset, endLineEnd);

			var range;
			var window = this._getWindow();
			var document = this._parent.ownerDocument;
			if (window.getSelection) {
				//W3C
				var sel = window.getSelection();
				range = document.createRange();
				range.setStart(startLineNode, startLineOffset);
				range.setEnd(endLineNode, endLineOffset);
				if (this._hasFocus && (
					sel.anchorNode !== startLineNode || sel.anchorOffset !== startLineOffset ||
					sel.focusNode !== endLineNode || sel.focusOffset !== endLineOffset ||
					sel.anchorNode !== endLineNode || sel.anchorOffset !== endLineOffset ||
					sel.focusNode !== startLineNode || sel.focusOffset !== startLineOffset))
				{
					this._anchorNode = startLineNode;
					this._anchorOffset = startLineOffset;
					this._focusNode = endLineNode;
					this._focusOffset = endLineOffset;
					this._ignoreSelect = false;
					if (sel.rangeCount > 0) { sel.removeAllRanges(); }
					sel.addRange(range);
					this._ignoreSelect = true;
				}
				if (this._cursorDiv) {
					range = document.createRange();
					if (startCaret) {
						range.setStart(startLineNode, startLineOffset);
						range.setEnd(startLineNode, startLineOffset);
					} else {
						range.setStart(endLineNode, endLineOffset);
						range.setEnd(endLineNode, endLineOffset);
					}
					var rect = range.getClientRects()[0];
					var cursorParent = this._cursorDiv.parentNode;
					var clientRect = cursorParent.getBoundingClientRect();
					if (rect && clientRect) {
						this._cursorDiv.style.top = (rect.top - clientRect.top + cursorParent.scrollTop) + "px"; //$NON-NLS-0$
						this._cursorDiv.style.left = (rect.left - clientRect.left + cursorParent.scrollLeft) + "px"; //$NON-NLS-0$
					}
				}
			} else if (document.selection) {
				if (!this._hasFocus) { return; }
				//IE < 9
				var body = document.body;

				/*
				* Bug in IE. For some reason when text is deselected the overflow
				* selection at the end of some lines does not get redrawn.  The
				* fix is to create a DOM element in the body to force a redraw.
				*/
				var child = util.createElement(document, "div"); //$NON-NLS-0$
				body.appendChild(child);
				body.removeChild(child);
				
				range = body.createTextRange();
				range.moveToElementText(startLineNode.parentNode);
				range.moveStart("character", startLineOffset); //$NON-NLS-0$
				var endRange = body.createTextRange();
				endRange.moveToElementText(endLineNode.parentNode);
				endRange.moveStart("character", endLineOffset); //$NON-NLS-0$
				range.setEndPoint("EndToStart", endRange); //$NON-NLS-0$
				this._ignoreSelect = false;
				range.select();
				this._ignoreSelect = true;
			}
		},
		_setDOMFullSelection: function(startNode, startOffset, startLineEnd, endNode, endOffset, endLineEnd) {
			if (!this._selDiv1) { return; }
			var selDiv = this._selDiv1;
			selDiv.style.width = "0px"; //$NON-NLS-0$
			selDiv.style.height = "0px"; //$NON-NLS-0$
			selDiv = this._selDiv2;
			selDiv.style.width = "0px"; //$NON-NLS-0$
			selDiv.style.height = "0px"; //$NON-NLS-0$
			selDiv = this._selDiv3;
			selDiv.style.width = "0px"; //$NON-NLS-0$
			selDiv.style.height = "0px"; //$NON-NLS-0$
			if (startNode === endNode && startOffset === endOffset) { return; }
			var model = this._model;
			var viewPad = this._getViewPadding();
			var clientRect = this._clientDiv.getBoundingClientRect();
			var viewRect = this._viewDiv.getBoundingClientRect();
			var left = viewRect.left + viewPad.left;
			var right = clientRect.right;
			var top = viewRect.top + viewPad.top;
			var bottom = clientRect.bottom;
			var hd = 0, vd = 0;
			if (this._clipDiv) {
				var clipRect = this._clipDiv.getBoundingClientRect();
				hd = clipRect.left - this._clipDiv.scrollLeft;
				vd = clipRect.top;
			} else {
				var rootpRect = this._rootDiv.getBoundingClientRect();
				hd = rootpRect.left;
				vd = rootpRect.top;
			}
			this._ignoreDOMSelection = true;
			var startLine = new TextLine(this, startNode.lineIndex, startNode);
			var startRect = startLine.getBoundingClientRect(model.getLineStart(startNode.lineIndex) + startOffset, false);
			var l = startRect.left;
			var endLine = new TextLine(this, endNode.lineIndex, endNode);
			var endRect = endLine.getBoundingClientRect(model.getLineStart(endNode.lineIndex) + endOffset, false);
			var r = endRect.left;
			this._ignoreDOMSelection = false;
			var sel1Div = this._selDiv1;
			var sel1Left = Math.min(right, Math.max(left, l));
			var sel1Top = Math.min(bottom, Math.max(top, startRect.top));
			var sel1Right = right;
			var sel1Bottom = Math.min(bottom, Math.max(top, startRect.bottom));
			sel1Div.style.left = (sel1Left - hd) + "px"; //$NON-NLS-0$
			sel1Div.style.top = (sel1Top - vd) + "px"; //$NON-NLS-0$
			sel1Div.style.width = Math.max(0, sel1Right - sel1Left) + "px"; //$NON-NLS-0$
			sel1Div.style.height = Math.max(0, sel1Bottom - sel1Top) + "px"; //$NON-NLS-0$
			if (startNode.lineIndex === endNode.lineIndex) {
				sel1Right = Math.min(r, right);
				sel1Div.style.width = Math.max(0, sel1Right - sel1Left) + "px"; //$NON-NLS-0$
			} else {
				var sel3Left = left;
				var sel3Top = Math.min(bottom, Math.max(top, endRect.top));
				var sel3Right = Math.min(right, Math.max(left, r));
				var sel3Bottom = Math.min(bottom, Math.max(top, endRect.bottom));
				var sel3Div = this._selDiv3;
				sel3Div.style.left = (sel3Left - hd) + "px"; //$NON-NLS-0$
				sel3Div.style.top = (sel3Top - vd) + "px"; //$NON-NLS-0$
				sel3Div.style.width = Math.max(0, sel3Right - sel3Left) + "px"; //$NON-NLS-0$
				sel3Div.style.height = Math.max(0, sel3Bottom - sel3Top) + "px"; //$NON-NLS-0$
				if (Math.abs(startNode.lineIndex - endNode.lineIndex) > 1) {
					var sel2Div = this._selDiv2;
					sel2Div.style.left = (left - hd)  + "px"; //$NON-NLS-0$
					sel2Div.style.top = (sel1Bottom - vd) + "px"; //$NON-NLS-0$
					sel2Div.style.width = Math.max(0, right - left) + "px"; //$NON-NLS-0$
					sel2Div.style.height = Math.max(0, sel3Top - sel1Bottom) + "px"; //$NON-NLS-0$
				}
			}
		},
		_setGrab: function (target) {
			if (target === this._grabControl) { return; }
			if (target) {
				if (target.setCapture) { target.setCapture(); }
				this._grabControl = target;
			} else {
				if (this._grabControl.releaseCapture) { this._grabControl.releaseCapture(); }
				this._grabControl = null;
			}
		},
		_setLinksVisible: function(visible) {
			if (this._linksVisible === visible) { return; }
			this._linksVisible = visible;
			/*
			* Feature in IE.  The client div looses focus and does not regain it back
			* when the content editable flag is reset. The fix is to remember that it
			* had focus when the flag is cleared and give focus back to the div when
			* the flag is set.
			*/
			if (util.isIE && visible) {
				this._hadFocus = this._hasFocus;
			}
			var clientDiv = this._clientDiv;
			clientDiv.contentEditable = !visible;
			if (this._hadFocus && !visible) {
				clientDiv.focus();
			}
			if (this._overlayDiv) {
				this._overlayDiv.style.zIndex = visible ? "-1" : "1"; //$NON-NLS-1$ //$NON-NLS-0$
			}
			var line = this._getLineNext();
			while (line) {
				if (line.hasLink) {
					var lineChild = line.firstChild;
					while (lineChild) {
						if (lineChild.ignore) {
							lineChild = lineChild.nextSibling;
							continue;
						}
						var next = lineChild.nextSibling;
						var style = lineChild.viewStyle;
						if (style && style.tagName && style.tagName.toLowerCase() === "a") { //$NON-NLS-0$
							line.replaceChild(line._line._createSpan(line, lineChild.firstChild.data, style), lineChild);
						}
						lineChild = next;
					}
				}
				line = this._getLineNext(line);
			}
			this._updateDOMSelection();
		},
		_setSelection: function (selection, scroll, update, callback, pageScroll) {
			if (selection) {
				this._columnX = -1;
				if (update === undefined) { update = true; }
				var oldSelection = this._selection; 
				this._selection = selection;

				/* 
				* Always showCaret(), even when the selection is not changing, to ensure the
				* caret is visible. Note that some views do not scroll to show the caret during
				* keyboard navigation when the selection does not chanage. For example, line down
				* when the caret is already at the last line.
				*/
				if (scroll !== false) { /*update = !*/this._showCaret(false, callback, scroll, pageScroll); }
				
				/* 
				* Sometimes the browser changes the selection 
				* as result of method calls or "leaked" events. 
				* The fix is to set the visual selection even
				* when the logical selection is not changed.
				*/
				if (update) { this._updateDOMSelection(); }
				
				if (!oldSelection.equals(selection)) {
					var e = {
						type: "Selection", //$NON-NLS-0$
						oldValue: {start:oldSelection.start, end:oldSelection.end},
						newValue: {start:selection.start, end:selection.end}
					};
					this.onSelection(e);
				}
			}
		},
		_setSelectionTo: function (x, y, extent, drag) {
			var model = this._model, offset;
			var selection = this._getSelection();
			var pt = this.convert({x: x, y: y}, "page", "document"); //$NON-NLS-1$ //$NON-NLS-0$
			var lineIndex = this._getLineIndex(pt.y), line;
			if (this._clickCount === 1) {
				line = this._getLine(lineIndex);
				offset = line.getOffset(pt.x, pt.y - this._getLinePixel(lineIndex));
				line.destroy();
				if (drag && !extent) {
					if (selection.start <= offset && offset < selection.end) {
						this._dragOffset = offset;
						return false;
					}
				}
				selection.extend(offset);
				if (!extent) { selection.collapse(); }
			} else {
				var word = (this._clickCount & 1) === 0;
				var start, end;
				if (word) {
					line = this._getLine(lineIndex);
					offset = line.getOffset(pt.x, pt.y - this._getLinePixel(lineIndex));
					if (this._doubleClickSelection) {
						if (offset >= this._doubleClickSelection.start) {
							start = this._doubleClickSelection.start;
							end = line.getNextOffset(offset, {unit:"wordend", count:1}); //$NON-NLS-0$
						} else {
							start = line.getNextOffset(offset, {unit:"word", count:-1}); //$NON-NLS-0$
							end = this._doubleClickSelection.end;
						}
					} else {
						start = line.getNextOffset(offset, {unit:"word", count:-1}); //$NON-NLS-0$
						end = line.getNextOffset(start, {unit:"wordend", count:1}); //$NON-NLS-0$
					}
					line.destroy();
				} else {
					if (this._doubleClickSelection) {
						var doubleClickLine = model.getLineAtOffset(this._doubleClickSelection.start);
						if (lineIndex >= doubleClickLine) {
							start = model.getLineStart(doubleClickLine);
							end = model.getLineEnd(lineIndex);
						} else {
							start = model.getLineStart(lineIndex);
							end = model.getLineEnd(doubleClickLine);
						}
					} else {
						start = model.getLineStart(lineIndex);
						end = model.getLineEnd(lineIndex);
					}
				}
				selection.setCaret(start);
				selection.extend(end);
			} 
			this._setSelection(selection, true, true);
			return true;
		},
		_setFullSelection: function(fullSelection, init) {
			this._fullSelection = fullSelection;
			if (util.isWebkit) {
				this._fullSelection = true;
			}
			var parent = this._clipDiv || this._rootDiv;
			if (!parent) {
				return;
			}
			if (!this._fullSelection) {
				if (this._selDiv1) {
					parent.removeChild(this._selDiv1);
					this._selDiv1 = null;
				}
				if (this._selDiv2) {
					parent.removeChild(this._selDiv2);
					this._selDiv2 = null;
				}
				if (this._selDiv3) {
					parent.removeChild(this._selDiv3);
					this._selDiv3 = null;
				}
				return;
			}
			
			if (!this._selDiv1 && (this._fullSelection && !util.isIOS)) {
				var document = parent.ownerDocument;
				this._highlightRGB = util.isWebkit ? "transparent" : "Highlight"; //$NON-NLS-1$ //$NON-NLS-0$
				var selDiv1 = util.createElement(document, "div"); //$NON-NLS-0$
				this._selDiv1 = selDiv1;
				selDiv1.style.position = "absolute"; //$NON-NLS-0$
				selDiv1.style.borderWidth = "0px"; //$NON-NLS-0$
				selDiv1.style.margin = "0px"; //$NON-NLS-0$
				selDiv1.style.padding = "0px"; //$NON-NLS-0$
				selDiv1.style.outline = "none"; //$NON-NLS-0$
				selDiv1.style.background = this._highlightRGB;
				selDiv1.style.width = "0px"; //$NON-NLS-0$
				selDiv1.style.height = "0px"; //$NON-NLS-0$
				selDiv1.style.zIndex = "0"; //$NON-NLS-0$
				parent.appendChild(selDiv1);
				var selDiv2 = util.createElement(document, "div"); //$NON-NLS-0$
				this._selDiv2 = selDiv2;
				selDiv2.style.position = "absolute"; //$NON-NLS-0$
				selDiv2.style.borderWidth = "0px"; //$NON-NLS-0$
				selDiv2.style.margin = "0px"; //$NON-NLS-0$
				selDiv2.style.padding = "0px"; //$NON-NLS-0$
				selDiv2.style.outline = "none"; //$NON-NLS-0$
				selDiv2.style.background = this._highlightRGB;
				selDiv2.style.width = "0px"; //$NON-NLS-0$
				selDiv2.style.height = "0px"; //$NON-NLS-0$
				selDiv2.style.zIndex = "0"; //$NON-NLS-0$
				parent.appendChild(selDiv2);
				var selDiv3 = util.createElement(document, "div"); //$NON-NLS-0$
				this._selDiv3 = selDiv3;
				selDiv3.style.position = "absolute"; //$NON-NLS-0$
				selDiv3.style.borderWidth = "0px"; //$NON-NLS-0$
				selDiv3.style.margin = "0px"; //$NON-NLS-0$
				selDiv3.style.padding = "0px"; //$NON-NLS-0$
				selDiv3.style.outline = "none"; //$NON-NLS-0$
				selDiv3.style.background = this._highlightRGB;
				selDiv3.style.width = "0px"; //$NON-NLS-0$
				selDiv3.style.height = "0px"; //$NON-NLS-0$
				selDiv3.style.zIndex = "0"; //$NON-NLS-0$
				parent.appendChild(selDiv3);
				
				/*
				* Bug in Firefox. The Highlight color is mapped to list selection
				* background instead of the text selection background.  The fix
				* is to map known colors using a table or fallback to light blue.
				*/
				if (util.isFirefox && util.isMac) {
					var window = this._getWindow();
					var style = window.getComputedStyle(selDiv3, null);
					var rgb = style.getPropertyValue("background-color"); //$NON-NLS-0$
					switch (rgb) {
						case "rgb(119, 141, 168)": rgb = "rgb(199, 208, 218)"; break; //$NON-NLS-1$ //$NON-NLS-0$
						case "rgb(127, 127, 127)": rgb = "rgb(198, 198, 198)"; break; //$NON-NLS-1$ //$NON-NLS-0$
						case "rgb(255, 193, 31)": rgb = "rgb(250, 236, 115)"; break; //$NON-NLS-1$ //$NON-NLS-0$
						case "rgb(243, 70, 72)": rgb = "rgb(255, 176, 139)"; break; //$NON-NLS-1$ //$NON-NLS-0$
						case "rgb(255, 138, 34)": rgb = "rgb(255, 209, 129)"; break; //$NON-NLS-1$ //$NON-NLS-0$
						case "rgb(102, 197, 71)": rgb = "rgb(194, 249, 144)"; break; //$NON-NLS-1$ //$NON-NLS-0$
						case "rgb(140, 78, 184)": rgb = "rgb(232, 184, 255)"; break; //$NON-NLS-1$ //$NON-NLS-0$
						default: rgb = "rgb(180, 213, 255)"; break; //$NON-NLS-0$
					}
					this._highlightRGB = rgb;
					selDiv1.style.background = rgb;
					selDiv2.style.background = rgb;
					selDiv3.style.background = rgb;
				}
				if (!init) {
					this._updateDOMSelection();
				}
			}
		},
		_setBlockCursor: function (visible) {
			this._blockCursorVisible = visible;
			this._updateBlockCursorVisible();
		},
		_setOverwriteMode: function (overwrite) {
			this._overwriteMode = overwrite;
			this._updateBlockCursorVisible();
		},
		_updateBlockCursorVisible: function () {
			if (this._blockCursorVisible || this._overwriteMode) {
				if (!this._cursorDiv) {
					var cursorDiv = util.createElement(document, "div"); //$NON-NLS-0$
					cursorDiv.className = "textviewBlockCursor"; //$NON-NLS-0$
					this._cursorDiv = cursorDiv;
					cursorDiv.tabIndex = -1;
					cursorDiv.style.zIndex = "2"; //$NON-NLS-0$
					cursorDiv.style.color = "transparent"; //$NON-NLS-0$
					cursorDiv.style.position = "absolute"; //$NON-NLS-0$
					cursorDiv.style.pointerEvents = "none"; //$NON-NLS-0$
					cursorDiv.innerHTML = "&nbsp;"; //$NON-NLS-0$
					this._viewDiv.appendChild(cursorDiv);
					this._updateDOMSelection();
				}
			} else {
				if (this._cursorDiv) {
					this._cursorDiv.parentNode.removeChild(this._cursorDiv);
					this._cursorDiv = null;
				}
			}
		},
		_setMarginOffset: function(marginOffset, init) {
			this._marginOffset = marginOffset;
			this._marginDiv.style.display = marginOffset ? "block" : "none"; //$NON-NLS-1$ //$NON-NLS-0$
			if (!init) {
				this._metrics = this._calculateMetrics();
				this._queueUpdate();
			}
		},
		_setWrapOffset: function(wrapOffset, init) {
			this._wrapOffset = wrapOffset;
			if (!init) {
				this._metrics = this._calculateMetrics();
				this._queueUpdate();
			}
		},
		_setReadOnly: function (readOnly) {
			this._readonly = readOnly;
			this._clientDiv.setAttribute("aria-readonly", readOnly ? "true" : "false"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		},
		_setSingleMode: function (singleMode, init) {
			this._singleMode = singleMode;
			this._updateOverflow();
			this._updateStyle(init);
		},
		_setTabSize: function (tabSize, init) {
			this._tabSize = tabSize;
			this._customTabSize = undefined;
			var clientDiv = this._clientDiv;
			if (util.isOpera) {
				if (clientDiv) { clientDiv.style.OTabSize = this._tabSize+""; }
			} else if (util.isWebkit >= 537.1) {
				if (clientDiv) { clientDiv.style.tabSize = this._tabSize+""; }
			} else if (util.isFirefox >= 4) {
				if (clientDiv) {  clientDiv.style.MozTabSize = this._tabSize+""; }
			} else if (this._tabSize !== 8) {
				this._customTabSize = this._tabSize;
			}
			if (!init) {
				this.redrawLines();
				this._resetLineWidth();
			}
		},
		_setTheme: function(theme) {
			if (this._theme) {
				this._theme.removeEventListener("ThemeChanged", this._themeListener.onChanged); //$NON-NLS-0$
			}
			this._theme = theme;
			if (this._theme) {
				this._theme.addEventListener("ThemeChanged", this._themeListener.onChanged); //$NON-NLS-0$
			}
			this._setThemeClass(this._themeClass);
		},
		_setThemeClass: function (themeClass, init) {
			this._themeClass = themeClass;
			var viewContainerClass = "textview"; //$NON-NLS-0$
			var globalThemeClass = this._theme.getThemeClass();
			if (globalThemeClass) { viewContainerClass += " " + globalThemeClass; } //$NON-NLS-0$
			if (this._themeClass && globalThemeClass !== this._themeClass) { viewContainerClass += " " + this._themeClass; } //$NON-NLS-0$
			this._rootDiv.className = viewContainerClass;
			this._updateStyle(init);
		},
		_setWrapMode: function (wrapMode, init) {
			this._wrapMode = wrapMode && this._wrappable;
			var clientDiv = this._clientDiv;
			if (this._wrapMode) {
				clientDiv.style.whiteSpace = "pre-wrap"; //$NON-NLS-0$
				clientDiv.style.wordWrap = "break-word"; //$NON-NLS-0$
			} else {
				clientDiv.style.whiteSpace = "pre"; //$NON-NLS-0$
				clientDiv.style.wordWrap = "normal"; //$NON-NLS-0$
			}
			this._updateOverflow();
			if (!init) {
				this.redraw();
				this._resetLineWidth();
			}
			this._resetLineHeight();
		},
		_showCaret: function (allSelection, callback, scrollAlign, pageScroll) {
			if (!this._clientDiv) { return; }
			var model = this._model;
			var selection = this._getSelection();
			var scroll = this._getScroll();
			var caret = selection.getCaret();
			var start = selection.start;
			var end = selection.end;
			var endLine = model.getLineAtOffset(end);
			var endInclusive = Math.max(Math.max(start, model.getLineStart(endLine)), end - 1);
			var clientWidth = this._getClientWidth();
			var clientHeight = this._getClientHeight();
			var minScroll = clientWidth / 4;
			var bounds = this._getBoundsAtOffset(caret === start ? start : endInclusive);
			var left = bounds.left;
			var right = bounds.right;
			var top = bounds.top;
			var bottom = bounds.bottom;
			if (allSelection && !selection.isEmpty()) {
				bounds = this._getBoundsAtOffset(caret === end ? start : endInclusive);
				if (bounds.top === top) {
					if (caret === start) {
						right = left + Math.min(bounds.right - left, clientWidth);
					} else {
						left = right - Math.min(right - bounds.left, clientWidth);
					}
				} else {
					if (caret === start) {
						bottom = top + Math.min(bounds.bottom - top, clientHeight);
					} else {
						top = bottom - Math.min(bottom - bounds.top, clientHeight);
					}
				}
			}
			var pixelX = 0;
			if (left < scroll.x) {
				pixelX = Math.min(left - scroll.x, -minScroll);
			}
			if (right > scroll.x + clientWidth) {
				pixelX = Math.max(right - scroll.x - clientWidth, minScroll);
			}
			var pixelY = 0;
			if (top < scroll.y) {
				pixelY = top - scroll.y;
			} else if (bottom > scroll.y + clientHeight) {
				pixelY = bottom - scroll.y - clientHeight;
			}
			if (pageScroll) {
				if (pageScroll > 0) {
					if (pixelY > 0) {
						pixelY = Math.max(pixelY, pageScroll);
					}
				} else {
					if (pixelY < 0) {
						pixelY = Math.min(pixelY, pageScroll);
					}
				}
			}
			if (pixelX !== 0 || pixelY !== 0) {
				if (pixelY !== 0 && typeof scrollAlign === "number") { //$NON-NLS-0$
					if (scrollAlign < 0) { scrollAlign = 0; }
					if (scrollAlign > 1) { scrollAlign = 1; }
					pixelY += Math.floor(pixelY > 0 ? scrollAlign * clientHeight : -scrollAlign * clientHeight);
				}
				this._scrollViewAnimated(pixelX, pixelY, callback);
				/*
				* When the view scrolls it is possible that one of the scrollbars can show over the caret.
				* Depending on the browser scrolling can be synchronous (Safari), in which case the change 
				* can be detected before showCaret() returns. When scrolling is asynchronous (most browsers), 
				* the detection is done during the next update page.
				*/
				if (clientHeight !== this._getClientHeight() || clientWidth !== this._getClientWidth()) {
					this._showCaret();
				} else {
					this._ensureCaretVisible = true;
				}
				return true;
			} else {
				if (callback) {
					callback();
				}
			}
			return false;
		},
		_startIME: function () {
			if (this._imeOffset !== -1) { return; }
			var selection = this._getSelection();
			if (!selection.isEmpty()) {
				this._modifyContent({text: "", start: selection.start, end: selection.end}, true);
			}
			this._imeOffset = selection.start;
		},
		_unhookEvents: function() {
			this._model.removeEventListener("preChanging", this._modelListener.onChanging); //$NON-NLS-0$
			this._model.removeEventListener("postChanged", this._modelListener.onChanged); //$NON-NLS-0$
			this._theme.removeEventListener("ThemeChanged", this._themeListener.onChanged); //$NON-NLS-0$
			this._modelListener = null;
			for (var i=0; i<this._handlers.length; i++) {
				var h = this._handlers[i];
				removeHandler(h.target, h.type, h.handler);
			}
			this._handlers = null;
			if (this._mutationObserver) {
				this._mutationObserver.disconnect();
				this._mutationObserver = null;
			}
		},
		_updateDOMSelection: function () {
			if (this._redrawCount > 0) { return; }
			if (this._ignoreDOMSelection) { return; }
			if (!this._clientDiv) { return; }
			var selection = this._getSelection();
			var model = this._model;
			var startLine = model.getLineAtOffset(selection.start);
			var endLine = model.getLineAtOffset(selection.end);
			var firstNode = this._getLineNext();
			/*
			* Bug in Firefox. For some reason, after a update page sometimes the 
			* firstChild returns null incorrectly. The fix is to ignore show selection.
			*/
			if (!firstNode) { return; }
			var lastNode = this._getLinePrevious();
			
			var topNode, bottomNode, topOffset, bottomOffset;
			if (startLine < firstNode.lineIndex) {
				topNode = firstNode;
				topOffset = 0;
			} else if (startLine > lastNode.lineIndex) {
				topNode = lastNode;
				topOffset = 0;
			} else {
				topNode = this._getLineNode(startLine);
				topOffset = selection.start - model.getLineStart(startLine);
			}

			if (endLine < firstNode.lineIndex) {
				bottomNode = firstNode;
				bottomOffset = 0;
			} else if (endLine > lastNode.lineIndex) {
				bottomNode = lastNode;
				bottomOffset = 0;
			} else {
				bottomNode = this._getLineNode(endLine);
				bottomOffset = selection.end - model.getLineStart(endLine);
			}
			this._setDOMSelection(topNode, topOffset, bottomNode, bottomOffset, selection.caret);
		},
		_update: function(hScrollOnly) {
			if (this._redrawCount > 0) { return; }
			if (this._updateTimer) {
				var window = this._getWindow();
				window.clearTimeout(this._updateTimer);
				this._updateTimer = null;
				hScrollOnly = false;
			}
			var clientDiv = this._clientDiv;
			var viewDiv = this._viewDiv;
			if (!clientDiv) { return; }
			if (this._metrics.invalid) {
				this._ignoreQueueUpdate = true;
				this._updateStyle();
				this._ignoreQueueUpdate = false;
			}
			var model = this._model;
			var scroll = this._getScroll(false);
			var viewPad = this._getViewPadding();
			var lineCount = model.getLineCount();
			var lineHeight = this._getLineHeight();
			var needUpdate = false;
			var hScroll = false, vScroll = false;
			var scrollbarWidth = this._metrics.scrollWidth;
			
			if (this._wrapMode) {
				clientDiv.style.width = (this._metrics.wrapWidth || this._getClientWidth()) + "px"; //$NON-NLS-0$
			}
			
			/*
			* topIndex - top line index of the view (maybe be particialy visible)
			* lineStart - top line minus one line (if any)
			* topIndexY - portion of the top line that is NOT visible.
			* top - topIndexY plus height of the line before top line (if any)
			*/
			var topIndex, lineStart, top, topIndexY,
				leftWidth, leftRect,
				clientWidth, clientHeight, scrollWidth, scrollHeight,
				totalHeight = 0, totalLineIndex = 0, tempLineHeight;
			if (this._lineHeight) {
				while (totalLineIndex < lineCount) {
					tempLineHeight = this._getLineHeight(totalLineIndex);
					if (totalHeight + tempLineHeight > scroll.y) {
						break;
					}
					totalHeight += tempLineHeight;
					totalLineIndex++;
				}
				topIndex = totalLineIndex;
				lineStart = Math.max(0, topIndex - 1);
				topIndexY = top = scroll.y - totalHeight;
				if (topIndex > 0) {
					top += this._getLineHeight(topIndex - 1);
				}
			} else {
				var firstLine = Math.max(0, scroll.y) / lineHeight;
				topIndex = Math.floor(firstLine);
				lineStart = Math.max(0, topIndex - 1);
				top = Math.round((firstLine - lineStart) * lineHeight);
				topIndexY = Math.round((firstLine - topIndex) * lineHeight);
				scrollHeight = lineCount * lineHeight;
			}
			this._topIndexY = topIndexY;
			var rootDiv = this._rootDiv;
			var rootWidth = rootDiv.clientWidth;
			var rootHeight = rootDiv.clientHeight;
			if (hScrollOnly) {
				leftWidth = 0;
				if (this._leftDiv) {
					leftRect = this._leftDiv.getBoundingClientRect();
					leftWidth = leftRect.right - leftRect.left;
				}
				clientWidth = this._getClientWidth();
				clientHeight = this._getClientHeight();
				scrollWidth = clientWidth;
				if (this._wrapMode) {
					if (this._metrics.wrapWidth) {
						scrollWidth = this._metrics.wrapWidth;
					}
				} else {
					scrollWidth = Math.max(this._maxLineWidth, scrollWidth);
				}
				while (totalLineIndex < lineCount) {
					tempLineHeight = this._getLineHeight(totalLineIndex, false);
					totalHeight += tempLineHeight;
					totalLineIndex++;
				}
				scrollHeight = totalHeight;
			} else {
				clientHeight = this._getClientHeight();

				var linesPerPage = Math.floor((clientHeight + topIndexY) / lineHeight);
				var bottomIndex = Math.min(topIndex + linesPerPage, lineCount - 1);
				var lineEnd = Math.min(bottomIndex + 1, lineCount - 1);
				
				var lineIndex, lineWidth;
				var child = clientDiv.firstChild;
				while (child) {
					lineIndex = child.lineIndex;
					var nextChild = child.nextSibling;
					if (!(lineStart <= lineIndex && lineIndex <= lineEnd) || child.lineRemoved || child.lineIndex === -1) {
						if (this._mouseWheelLine === child) {
							child.style.display = "none"; //$NON-NLS-0$
							child.lineIndex = -1;
						} else {
							clientDiv.removeChild(child);
						}
					}
					child = nextChild;
				}
	
				child = this._getLineNext();
				var document = viewDiv.ownerDocument;
				var frag = document.createDocumentFragment();
				for (lineIndex=lineStart; lineIndex<=lineEnd; lineIndex++) {
					if (!child || child.lineIndex > lineIndex) {
						new TextLine(this, lineIndex).create(frag, null);
					} else {
						if (frag.firstChild) {
							clientDiv.insertBefore(frag, child);
							frag = document.createDocumentFragment();
						}
						if (child && child.lineChanged) {
							child = new TextLine(this, lineIndex).create(frag, child);
							child.lineChanged = false;
						}
						child = this._getLineNext(child);
					}
				}
				if (frag.firstChild) { clientDiv.insertBefore(frag, child); }
	
				/*
				* Feature in WekKit. Webkit limits the width of the lines
				* computed below to the width of the client div.  This causes
				* the lines to be wrapped even though "pre" is set.  The fix
				* is to set the width of the client div to "0x7fffffffpx"
				* before computing the lines width.  Note that this value is
				* reset to the appropriate value further down.
				*/ 
				if (util.isWebkit && !this._wrapMode) {
					clientDiv.style.width = "0x7fffffffpx"; //$NON-NLS-0$
				}
	
				var rect;
				child = this._getLineNext();
				var bottomHeight = clientHeight + top;
				var foundBottomIndex = false;
				while (child) {
					lineWidth = child.lineWidth;
					if (lineWidth === undefined) {
						rect = child._line.getBoundingClientRect();
						lineWidth = child.lineWidth = Math.ceil(rect.right - rect.left);
						var lh = rect.bottom - rect.top;
						if (this._lineHeight) {
							this._lineHeight[child.lineIndex] = lh;
						} else if (lineHeight !== 0 && lh !== 0 && Math.ceil(lineHeight) !== Math.ceil(lh)) {
							this._variableLineHeight = true;
							this._lineHeight = [];
							this._lineHeight[child.lineIndex] = lh;
						}
					}
					if (this._lineHeight && !foundBottomIndex) {
						bottomHeight -= this._lineHeight[child.lineIndex];
						if (bottomHeight < 0) {
							bottomIndex = child.lineIndex;
							foundBottomIndex = true;
						}
					}
					if (!this._wrapMode) {
						if (lineWidth >= this._maxLineWidth) {
							this._maxLineWidth = lineWidth;
							this._maxLineIndex = child.lineIndex;
						}
						if (this._checkMaxLineIndex === child.lineIndex) { this._checkMaxLineIndex = -1; }
					}
					if (child.lineIndex === topIndex) { this._topChild = child; }
					if (child.lineIndex === bottomIndex) { this._bottomChild = child; }
					child = this._getLineNext(child);
				}
				if (this._checkMaxLineIndex !== -1) {
					lineIndex = this._checkMaxLineIndex;
					this._checkMaxLineIndex = -1;
					if (0 <= lineIndex && lineIndex < lineCount) {
						var line = new TextLine(this, lineIndex);
						rect = line.getBoundingClientRect();
						lineWidth = rect.right - rect.left;
						if (lineWidth >= this._maxLineWidth) {
							this._maxLineWidth = lineWidth;
							this._maxLineIndex = lineIndex;
						}
						line.destroy();
					}
				}
				
				while (totalLineIndex < lineCount) {
					tempLineHeight = this._getLineHeight(totalLineIndex, totalLineIndex <= bottomIndex);
					totalHeight += tempLineHeight;
					totalLineIndex++;
				}
				scrollHeight = totalHeight;
	
				// Update rulers
				this._updateRuler(this._leftDiv, topIndex, lineEnd, rootHeight);
				this._updateRuler(this._rightDiv, topIndex, lineEnd, rootHeight);
				this._updateRuler(this._marginDiv, topIndex, lineEnd, rootHeight);
				
				leftWidth = 0;
				if (this._leftDiv) {
					leftRect = this._leftDiv.getBoundingClientRect();
					leftWidth = leftRect.right - leftRect.left;
				}
				var rightWidth = 0;
				if (this._rightDiv) {
					var rightRect = this._rightDiv.getBoundingClientRect();
					rightWidth = rightRect.right - rightRect.left;
				}
				viewDiv.style.left = leftWidth + "px"; //$NON-NLS-0$
				viewDiv.style.right = rightWidth + "px"; //$NON-NLS-0$

				/* Need to set the height first in order for the width to consider the vertical scrollbar */
				var scrollDiv = this._scrollDiv;
				scrollDiv.style.height = scrollHeight + "px"; //$NON-NLS-0$
				
				clientWidth = this._getClientWidth();
				if (!this._singleMode && !this._wrapMode) {
					var clientHeightNoScroll = clientHeight, clientHeightScroll = clientHeight;
					var oldHScroll = viewDiv.style.overflowX === "scroll"; //$NON-NLS-0$
					if (oldHScroll) {
						clientHeightNoScroll += scrollbarWidth;
					} else {
						clientHeightScroll -= scrollbarWidth;
					}
					var clientWidthNoScroll = clientWidth, clientWidthScroll = clientWidth;
					var oldVScroll = viewDiv.style.overflowY === "scroll"; //$NON-NLS-0$
					if (oldVScroll) {
						clientWidthNoScroll += scrollbarWidth;
					} else {
						clientWidthScroll -= scrollbarWidth;
					}
					clientHeight = clientHeightNoScroll;
					clientWidth = clientWidthNoScroll;
					if (scrollHeight > clientHeight) {
						vScroll = true;
						clientWidth = clientWidthScroll;
					}
					if (this._maxLineWidth > clientWidth) {
						hScroll = true;
						clientHeight = clientHeightScroll;
						if (scrollHeight > clientHeight) {
							vScroll = true;
							clientWidth = clientWidthScroll;
						}
					}
					if (oldHScroll !== hScroll) {
						viewDiv.style.overflowX = hScroll ? "scroll" : "hidden"; //$NON-NLS-1$ //$NON-NLS-0$
					}
					if (oldVScroll !== vScroll) {
						viewDiv.style.overflowY = vScroll ? "scroll" : "hidden"; //$NON-NLS-1$ //$NON-NLS-0$
					}
					needUpdate = oldHScroll !== hScroll || oldVScroll !== vScroll;
				}
				
				var width = clientWidth;
				if (this._wrapMode) {
					if (this._metrics.wrapWidth) {
						width = this._metrics.wrapWidth;
					}
				} else {
					width = Math.max(this._maxLineWidth, width);
				}
				/*
				* Except by IE 8 and earlier, all other browsers are not allocating enough space for the right padding 
				* in the scrollbar. It is possible this a bug since all other paddings are considered.
				*/
				scrollWidth = width;
				if ((!util.isIE || util.isIE >= 9) && this._maxLineWidth > clientWidth) { width += viewPad.right + viewPad.left; }
				scrollDiv.style.width = width + "px"; //$NON-NLS-0$
				if (this._clipScrollDiv) {
					this._clipScrollDiv.style.width = width + "px"; //$NON-NLS-0$
				}
				/* Get the left scroll after setting the width of the scrollDiv as this can change the horizontal scroll offset. */
				scroll = this._getScroll(false);
			}
			if (this._vScrollDiv) {
				var trackHeight = clientHeight - 8;
				var thumbHeight = Math.max(15, Math.ceil(Math.min(1, trackHeight / (scrollHeight + viewPad.top + viewPad.bottom)) * trackHeight));
				this._vScrollDiv.style.left = (leftWidth + clientWidth - 8) + "px"; //$NON-NLS-0$
				this._vScrollDiv.style.top = Math.floor(Math.max(0, (scroll.y * trackHeight / scrollHeight))) + "px"; //$NON-NLS-0$
				this._vScrollDiv.style.height = thumbHeight + "px"; //$NON-NLS-0$
			}
			if (!this._wrapMode && this._hScrollDiv) {
				var trackWidth = clientWidth - 8;
				var thumbWidth = Math.max(15, Math.ceil(Math.min(1, trackWidth / (this._maxLineWidth + viewPad.left + viewPad.right)) * trackWidth));
				this._hScrollDiv.style.left = leftWidth + Math.floor(Math.max(0, Math.floor(scroll.x * trackWidth / this._maxLineWidth))) + "px"; //$NON-NLS-0$
				this._hScrollDiv.style.top = (clientHeight - 9) + "px"; //$NON-NLS-0$
				this._hScrollDiv.style.width = thumbWidth + "px"; //$NON-NLS-0$
			}
			var left = scroll.x;	
			var clipDiv = this._clipDiv;
			var overlayDiv = this._overlayDiv;
			var marginDiv = this._marginDiv;
			var clipLeft, clipTop;
			if (marginDiv) {
				marginDiv.style.left = (-left + leftWidth + this._metrics.marginWidth + viewPad.left) + "px"; //$NON-NLS-0$
				marginDiv.style.bottom = (viewDiv.style.overflowX === "scroll" ? scrollbarWidth : 0) + "px"; //$NON-NLS-1$ //$NON-NLS-0$
			}
			if (clipDiv) {
				clipDiv.scrollLeft = left;
				clipDiv.scrollTop = 0;
				clipLeft = leftWidth + viewPad.left;
				clipTop = viewPad.top;
				var clipWidth = clientWidth;
				var clipHeight = clientHeight;
				var clientLeft = 0, clientTop = -top;
				if (scroll.x === 0) {
					clipLeft -= viewPad.left;
					clipWidth += viewPad.left;
					clientLeft = viewPad.left;
				} 
				if (scroll.x + clientWidth === scrollWidth) {
					clipWidth += viewPad.right;
				}
				if (scroll.y === 0) {
					clipTop -= viewPad.top;
					clipHeight += viewPad.top;
					clientTop += viewPad.top;
				}
				if (scroll.y + clientHeight === scrollHeight) { 
					clipHeight += viewPad.bottom; 
				}
				clipDiv.style.left = clipLeft + "px"; //$NON-NLS-0$
				clipDiv.style.top = clipTop + "px"; //$NON-NLS-0$
				clipDiv.style.right = (rootWidth - clipWidth - clipLeft) + "px"; //$NON-NLS-0$
				clipDiv.style.bottom = (rootHeight - clipHeight - clipTop) + "px"; //$NON-NLS-0$
				clientDiv.style.left = clientLeft + "px"; //$NON-NLS-0$
				clientDiv.style.top = clientTop + "px"; //$NON-NLS-0$
				clientDiv.style.width = scrollWidth + "px"; //$NON-NLS-0$
				clientDiv.style.height = (clientHeight + top) + "px"; //$NON-NLS-0$
				if (overlayDiv) {
					overlayDiv.style.left = clientDiv.style.left;
					overlayDiv.style.top = clientDiv.style.top;
					overlayDiv.style.width = clientDiv.style.width;
					overlayDiv.style.height = clientDiv.style.height;
				}
			} else {
				clipLeft = left;
				clipTop = top;
				var clipRight = left + clientWidth;
				var clipBottom = top + clientHeight;
				if (clipLeft === 0) { clipLeft -= viewPad.left; }
				if (clipTop === 0) { clipTop -= viewPad.top; }
				if (clipRight === scrollWidth) { clipRight += viewPad.right; }
				if (scroll.y + clientHeight === scrollHeight) { clipBottom += viewPad.bottom; }
				clientDiv.style.clip = "rect(" + clipTop + "px," + clipRight + "px," + clipBottom + "px," + clipLeft + "px)"; //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				clientDiv.style.left = (-left + leftWidth + viewPad.left) + "px"; //$NON-NLS-0$
				clientDiv.style.width = (this._wrapMode || util.isWebkit ? scrollWidth : clientWidth + left) + "px"; //$NON-NLS-0$
				if (!hScrollOnly) {
					clientDiv.style.top = (-top + viewPad.top) + "px"; //$NON-NLS-0$
					clientDiv.style.height = (clientHeight + top) + "px"; //$NON-NLS-0$
				}
				if (overlayDiv) {
					overlayDiv.style.clip = clientDiv.style.clip;
					overlayDiv.style.left = clientDiv.style.left;
					overlayDiv.style.width = clientDiv.style.width;
					if (!hScrollOnly) {
						overlayDiv.style.top = clientDiv.style.top;
						overlayDiv.style.height = clientDiv.style.height;
					}
				}
			}
			this._updateDOMSelection();

			if (needUpdate) {
				var ensureCaretVisible = this._ensureCaretVisible;
				this._ensureCaretVisible = false;
				if (ensureCaretVisible) {
					this._showCaret();
				}
				this._queueUpdate();
			}
		},
		_updateOverflow: function() {
			var viewDiv = this._viewDiv;
			if (this._wrapMode) {
				viewDiv.style.overflowX = "hidden"; //$NON-NLS-0$
				viewDiv.style.overflowY = "scroll"; //$NON-NLS-0$
			} else {
				viewDiv.style.overflow = "hidden"; //$NON-NLS-0$
			}
		},
		_updateRuler: function (divRuler, topIndex, bottomIndex, rootHeight) {
			if (!divRuler) { return; }
			var document = this._parent.ownerDocument;
			var lineHeight = this._getLineHeight();
			var viewPad = this._getViewPadding();
			var div = divRuler.firstChild;
			while (div) {
				var ruler = div._ruler;
				var offset = lineHeight;
				var overview = ruler.getOverview();
				if (overview === "page") { offset += this._topIndexY; } //$NON-NLS-0$
				div.style.top = -offset + "px"; //$NON-NLS-0$
				div.style.height = (rootHeight + offset) + "px"; //$NON-NLS-0$
				
				if (div.rulerChanged) {
					applyStyle(ruler.getRulerStyle(), div);
				}
				
				var widthDiv;
				var child = div.firstChild;
				if (child) {
					widthDiv = child;
					child = child.nextSibling;
				} else {
					widthDiv = util.createElement(document, "div"); //$NON-NLS-0$
					widthDiv.style.visibility = "hidden"; //$NON-NLS-0$
					div.appendChild(widthDiv);
				}
				var lineIndex, annotation;
				if (div.rulerChanged) {
					if (widthDiv) {
						lineIndex = -1;
						annotation = ruler.getWidestAnnotation();
						if (annotation) {
							applyStyle(annotation.style, widthDiv);
							if (annotation.html) {
								widthDiv.innerHTML = annotation.html;
							}
						}
						widthDiv.lineIndex = lineIndex;
						widthDiv.style.height = (lineHeight + viewPad.top) + "px"; //$NON-NLS-0$
					}
				}

				var lineDiv, frag, annotations;
				if (overview === "page") { //$NON-NLS-0$
					annotations = ruler.getAnnotations(topIndex, bottomIndex + 1);
					while (child) {
						lineIndex = child.lineIndex;
						var nextChild = child.nextSibling;
						if (!(topIndex <= lineIndex && lineIndex <= bottomIndex) || child.lineChanged) {
							div.removeChild(child);
						}
						child = nextChild;
					}
					child = div.firstChild.nextSibling;
					frag = document.createDocumentFragment();
					for (lineIndex=topIndex; lineIndex<=bottomIndex; lineIndex++) {
						if (!child || child.lineIndex > lineIndex) {
							lineDiv = util.createElement(document, "div"); //$NON-NLS-0$
							annotation = annotations[lineIndex];
							if (annotation) {
								applyStyle(annotation.style, lineDiv);
								if (annotation.html) {
									lineDiv.innerHTML = annotation.html;
								}
								lineDiv.annotation = annotation;
							}
							lineDiv.lineIndex = lineIndex;
							lineDiv.style.height = this._getLineHeight(lineIndex) + "px"; //$NON-NLS-0$
							frag.appendChild(lineDiv);
						} else {
							if (frag.firstChild) {
								div.insertBefore(frag, child);
								frag = document.createDocumentFragment();
							}
							if (child) {
								child = child.nextSibling;
							}
						}
					}
					if (frag.firstChild) { div.insertBefore(frag, child); }
				} else {
					var clientHeight = this._getClientHeight ();
					var lineCount = this._model.getLineCount ();
					var contentHeight = lineHeight * lineCount;
					var trackHeight = clientHeight + viewPad.top + viewPad.bottom - 2 * this._metrics.scrollWidth;
					var divHeight;
					if (contentHeight < trackHeight) {
						divHeight = lineHeight;
					} else {
						divHeight = trackHeight / lineCount;
					}
					if (div.rulerChanged) {
						var count = div.childNodes.length;
						while (count > 1) {
							div.removeChild(div.lastChild);
							count--;
						}
						annotations = ruler.getAnnotations(0, lineCount);
						frag = document.createDocumentFragment();
						for (var prop in annotations) {
							lineIndex = prop >>> 0;
							if (lineIndex < 0) { continue; }
							lineDiv = util.createElement(document, "div"); //$NON-NLS-0$
							annotation = annotations[prop];
							applyStyle(annotation.style, lineDiv);
							lineDiv.style.position = "absolute"; //$NON-NLS-0$
							lineDiv.style.top = this._metrics.scrollWidth + lineHeight + Math.floor(lineIndex * divHeight) + "px"; //$NON-NLS-0$
							if (annotation.html) {
								lineDiv.innerHTML = annotation.html;
							}
							lineDiv.annotation = annotation;
							lineDiv.lineIndex = lineIndex;
							frag.appendChild(lineDiv);
						}
						div.appendChild(frag);
					} else if (div._oldTrackHeight !== trackHeight) {
						lineDiv = div.firstChild ? div.firstChild.nextSibling : null;
						while (lineDiv) {
							lineDiv.style.top = this._metrics.scrollWidth + lineHeight + Math.floor(lineDiv.lineIndex * divHeight) + "px"; //$NON-NLS-0$
							lineDiv = lineDiv.nextSibling;
						}
					}
					div._oldTrackHeight = trackHeight;
				}
				div.rulerChanged = false;
				div = div.nextSibling;
			}
		},
		_updateStyleSheet: function() {
			var styleText = "";
			if (util.isWebkit && this._metrics.scrollWidth > 0) {
				styleText += "\n.textview ::-webkit-scrollbar-corner {background: #eeeeee;}"; //$NON-NLS-0$
			}
			if (util.isFirefox && util.isMac && this._highlightRGB && this._highlightRGB !== "Highlight") { //$NON-NLS-0$
				styleText += "\n.textview ::-moz-selection {background: " + this._highlightRGB + ";}"; //$NON-NLS-1$ //$NON-NLS-0$
			}
			if (styleText) {
				var node = document.getElementById("_textviewStyle"); //$NON-NLS-0$
				if (!node) {
					node = util.createElement(document, "style"); //$NON-NLS-0$
					node.id = "_textviewStyle"; //$NON-NLS-0$
					var head = document.getElementsByTagName("head")[0] || document.documentElement; //$NON-NLS-0$
					node.appendChild(document.createTextNode(styleText));
					head.insertBefore(node, head.firstChild);
				} else {
					node.removeChild(node.firstChild);
					node.appendChild(document.createTextNode(styleText));
				}
			}
		},
		_updateStyle: function (init) {
			if (!init && util.isIE) {
				this._rootDiv.style.lineHeight = "normal"; //$NON-NLS-0$
			}
			var metrics = this._metrics = this._calculateMetrics();
			if (util.isIE) {
				this._rootDiv.style.lineHeight = (metrics.lineHeight - (metrics.lineTrim.top + metrics.lineTrim.bottom)) + "px"; //$NON-NLS-0$
			} else {
				this._rootDiv.style.lineHeight = "normal"; //$NON-NLS-0$
			}
			this._updateStyleSheet();
			if (!init) {
				this.redraw();
				this._resetLineWidth();
			}
		}
	};//end prototype
	mEventTarget.EventTarget.addMixin(TextView.prototype);
	
	return {TextView: TextView};
});


/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: 
 *		Felipe Heidrich (IBM Corporation) - initial API and implementation
 *		Silenio Quarti (IBM Corporation) - initial API and implementation
 ******************************************************************************/

/*global define */

define("orion/editor/projectionTextModel", ['orion/editor/textModel', 'orion/editor/eventTarget'], function(mTextModel, mEventTarget) { //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

	/**
	 * @class This object represents a projection range. A projection specifies a
	 * range of text and the replacement text. The range of text is relative to the
	 * base text model associated to a projection model.
	 * <p>
	 * <b>See:</b><br/>
	 * {@link orion.editor.ProjectionTextModel}<br/>
	 * {@link orion.editor.ProjectionTextModel#addProjection}<br/>
	 * </p>		 
	 * @name orion.editor.Projection
	 * 
	 * @property {Number} start The start offset of the projection range. 
	 * @property {Number} end The end offset of the projection range. This offset is exclusive.
	 * @property {String|orion.editor.TextModel} [text=""] The projection text to be inserted
	 */
	/**
	 * Constructs a new <code>ProjectionTextModel</code> based on the specified <code>TextModel</code>.
	 *
	 * @param {orion.editor.TextModel} baseModel The base text model.
	 *
	 * @name orion.editor.ProjectionTextModel
	 * @class The <code>ProjectionTextModel</code> represents a projection of its base text
	 * model. Projection ranges can be added to the projection text model to hide and/or insert
	 * ranges to the base text model.
	 * <p>
	 * The contents of the projection text model is modified when changes occur in the base model,
	 * projection model or by calls to {@link #addProjection} and {@link #removeProjection}.
	 * </p>
	 * <p>
	 * <b>See:</b><br/>
	 * {@link orion.editor.TextView}<br/>
	 * {@link orion.editor.TextModel}
	 * {@link orion.editor.TextView#setModel}
	 * </p>
	 * @borrows orion.editor.EventTarget#addEventListener as #addEventListener
	 * @borrows orion.editor.EventTarget#removeEventListener as #removeEventListener
	 * @borrows orion.editor.EventTarget#dispatchEvent as #dispatchEvent
	 */
	function ProjectionTextModel(baseModel) {
		this._model = baseModel;
		this._projections = [];
		var self = this;
		this._listener = {
			onChanged: function(e) {
				self._onChanged(e);
			},
			onChanging: function(e) {
				self._onChanging(e);
			}
		};
		baseModel.addEventListener("postChanged", this._listener.onChanged); //$NON-NLS-0$
		baseModel.addEventListener("preChanging", this._listener.onChanging); //$NON-NLS-0$
	}

	ProjectionTextModel.prototype = /** @lends orion.editor.ProjectionTextModel.prototype */ {
		/**
		 * Destroys this projection text model.
		 */
		destroy: function() {
			if (this._model) {
				this._model.removeEventListener("postChanged", this._listener.onChanged); //$NON-NLS-0$
				this._model.removeEventListener("preChanging", this._listener.onChanging); //$NON-NLS-0$
				this._model = null;
			}
		},
		/**
		 * Adds a projection range to the model.
		 * <p>
		 * The model must notify the listeners before and after the the text is
		 * changed by calling {@link #onChanging} and {@link #onChanged} respectively. 
		 * </p>
		 * @param {orion.editor.Projection} projection The projection range to be added.
		 * 
		 * @see orion.editor.ProjectionTextModel#removeProjection
		 */
		addProjection: function(projection) {
			if (!projection) {return;}
			//start and end can't overlap any exist projection
			var model = this._model, projections = this._projections;
			projection._lineIndex = model.getLineAtOffset(projection.start);
			projection._lineCount = model.getLineAtOffset(projection.end) - projection._lineIndex;
			var text = projection.text;
			if (!text) { text = ""; }
			if (typeof text === "string") { //$NON-NLS-0$
				projection._model = new mTextModel.TextModel(text, model.getLineDelimiter());
			} else {
				projection._model = text;
			}
			var eventStart = this.mapOffset(projection.start, true);
			var removedCharCount = projection.end - projection.start;
			var removedLineCount = projection._lineCount;
			var addedCharCount = projection._model.getCharCount();
			var addedLineCount = projection._model.getLineCount() - 1;
			var modelChangingEvent = {
				type: "Changing", //$NON-NLS-0$
				text: projection._model.getText(),
				start: eventStart,
				removedCharCount: removedCharCount,
				addedCharCount: addedCharCount,
				removedLineCount: removedLineCount,
				addedLineCount: addedLineCount
			};
			this.onChanging(modelChangingEvent);
			var index = this._binarySearch(projections, projection.start);
			projections.splice(index, 0, projection);
			var modelChangedEvent = {
				type: "Changed", //$NON-NLS-0$
				start: eventStart,
				removedCharCount: removedCharCount,
				addedCharCount: addedCharCount,
				removedLineCount: removedLineCount,
				addedLineCount: addedLineCount
			};
			this.onChanged(modelChangedEvent);
		},
		/**
		 * Returns all projection ranges of this model.
		 * 
		 * @return {orion.editor.Projection[]} The projection ranges.
		 * 
		 * @see orion.editor.ProjectionTextModel#addProjection
		 */
		getProjections: function() {
			return this._projections.slice(0);
		},
		/**
		 * Gets the base text model.
		 *
		 * @return {orion.editor.TextModel} The base text model.
		 */
		getBaseModel: function() {
			return this._model;
		},
		/**
		 * Maps offsets between the projection model and its base model.
		 *
		 * @param {Number} offset The offset to be mapped.
		 * @param {Boolean} [baseOffset=false] <code>true</code> if <code>offset</code> is in base model and
		 *	should be mapped to the projection model.
		 * @return {Number} The mapped offset
		 */
		mapOffset: function(offset, baseOffset) {
			var projections = this._projections, delta = 0, i, projection;
			if (baseOffset) {
				for (i = 0; i < projections.length; i++) {
					projection = projections[i];
					if (projection.start > offset) { break; }
					if (projection.end > offset) { return -1; }
					delta += projection._model.getCharCount() - (projection.end - projection.start);
				}
				return offset + delta;
			}
			for (i = 0; i < projections.length; i++) {
				projection = projections[i];
				if (projection.start > offset - delta) { break; }
				var charCount = projection._model.getCharCount();
				if (projection.start + charCount > offset - delta) {
					return -1;
				}
				delta += charCount - (projection.end - projection.start);
			}
			return offset - delta;
		},
		/**
		 * Removes a projection range from the model.
		 * <p>
		 * The model must notify the listeners before and after the the text is
		 * changed by calling {@link #onChanging} and {@link #onChanged} respectively. 
		 * </p>
		 * 
		 * @param {orion.editor.Projection} projection The projection range to be removed.
		 * 
		 * @see orion.editor.ProjectionTextModel#addProjection
		 */
		removeProjection: function(projection) {
			var i, delta = 0;
			for (i = 0; i < this._projections.length; i++) {
				var p = this._projections[i];
				if (p === projection) {
					projection = p;
					break;
				}
				delta += p._model.getCharCount() - (p.end - p.start);
			}
			if (i < this._projections.length) {
				var model = this._model;
				var eventStart = projection.start + delta;
				var addedCharCount = projection.end - projection.start;
				var addedLineCount = projection._lineCount;
				var removedCharCount = projection._model.getCharCount();
				var removedLineCount = projection._model.getLineCount() - 1;
				var modelChangingEvent = {
					type: "Changing", //$NON-NLS-0$
					text: model.getText(projection.start, projection.end),
					start: eventStart,
					removedCharCount: removedCharCount,
					addedCharCount: addedCharCount,
					removedLineCount: removedLineCount,
					addedLineCount: addedLineCount
				};
				this.onChanging(modelChangingEvent);
				this._projections.splice(i, 1);
				var modelChangedEvent = {
					type: "Changed", //$NON-NLS-0$
					start: eventStart,
					removedCharCount: removedCharCount,
					addedCharCount: addedCharCount,
					removedLineCount: removedLineCount,
					addedLineCount: addedLineCount
				};
				this.onChanged(modelChangedEvent);
			}
		},
		/** @ignore */
		_binarySearch: function (array, offset) {
			var high = array.length, low = -1, index;
			while (high - low > 1) {
				index = Math.floor((high + low) / 2);
				if (offset <= array[index].start) {
					high = index;
				} else {
					low = index;
				}
			}
			return high;
		},
		/**
		 * @see orion.editor.TextModel#getCharCount
		 */
		getCharCount: function() {
			var count = this._model.getCharCount(), projections = this._projections;
			for (var i = 0; i < projections.length; i++) {
				var projection = projections[i];
				count += projection._model.getCharCount() - (projection.end - projection.start);
			}
			return count;
		},
		/**
		 * @see orion.editor.TextModel#getLine
		 */
		getLine: function(lineIndex, includeDelimiter) {
			if (lineIndex < 0) { return null; }
			var model = this._model, projections = this._projections;
			var delta = 0, result = [], offset = 0, i, lineCount, projection;
			for (i = 0; i < projections.length; i++) {
				projection = projections[i];
				if (projection._lineIndex >= lineIndex - delta) { break; }
				lineCount = projection._model.getLineCount() - 1;
				if (projection._lineIndex + lineCount >= lineIndex - delta) {
					var projectionLineIndex = lineIndex - (projection._lineIndex + delta);
					if (projectionLineIndex < lineCount) {
						return projection._model.getLine(projectionLineIndex, includeDelimiter);
					} else {
						result.push(projection._model.getLine(lineCount));
					}
				}
				offset = projection.end;
				delta += lineCount - projection._lineCount;
			}
			offset = Math.max(offset, model.getLineStart(lineIndex - delta));
			for (; i < projections.length; i++) {
				projection = projections[i];
				if (projection._lineIndex > lineIndex - delta) { break; }
				result.push(model.getText(offset, projection.start));
				lineCount = projection._model.getLineCount() - 1;
				if (projection._lineIndex + lineCount > lineIndex - delta) {
					result.push(projection._model.getLine(0, includeDelimiter));
					return result.join("");
				}
				result.push(projection._model.getText());
				offset = projection.end;
				delta += lineCount - projection._lineCount;
			}
			var end = model.getLineEnd(lineIndex - delta, includeDelimiter);
			if (offset < end) {
				result.push(model.getText(offset, end));
			}
			return result.join("");
		},
		/**
		 * @see orion.editor.TextModel#getLineAtOffset
		 */
		getLineAtOffset: function(offset) {
			var model = this._model, projections = this._projections;
			var delta = 0, lineDelta = 0;
			for (var i = 0; i < projections.length; i++) {
				var projection = projections[i];
				if (projection.start > offset - delta) { break; }
				var charCount = projection._model.getCharCount();
				if (projection.start + charCount > offset - delta) {
					var projectionOffset = offset - (projection.start + delta);
					lineDelta += projection._model.getLineAtOffset(projectionOffset);
					delta += projectionOffset;
					break;
				}
				lineDelta += projection._model.getLineCount() - 1 - projection._lineCount;
				delta += charCount - (projection.end - projection.start);
			}
			return model.getLineAtOffset(offset - delta) + lineDelta;
		},
		/**
		 * @see orion.editor.TextModel#getLineCount
		 */
		getLineCount: function() {
			var model = this._model, projections = this._projections;
			var count = model.getLineCount();
			for (var i = 0; i < projections.length; i++) {
				var projection = projections[i];
				count += projection._model.getLineCount() - 1 - projection._lineCount;
			}
			return count;
		},
		/**
		 * @see orion.editor.TextModel#getLineDelimiter
		 */
		getLineDelimiter: function() {
			return this._model.getLineDelimiter();
		},
		/**
		 * @see orion.editor.TextModel#getLineEnd
		 */
		getLineEnd: function(lineIndex, includeDelimiter) {
			if (lineIndex < 0) { return -1; }
			var model = this._model, projections = this._projections;
			var delta = 0, offsetDelta = 0;
			for (var i = 0; i < projections.length; i++) {
				var projection = projections[i];
				if (projection._lineIndex > lineIndex - delta) { break; }
				var lineCount = projection._model.getLineCount() - 1;
				if (projection._lineIndex + lineCount > lineIndex - delta) {
					var projectionLineIndex = lineIndex - (projection._lineIndex + delta);
					return projection._model.getLineEnd (projectionLineIndex, includeDelimiter) + projection.start + offsetDelta;
				}
				offsetDelta += projection._model.getCharCount() - (projection.end - projection.start);
				delta += lineCount - projection._lineCount;
			}
			return model.getLineEnd(lineIndex - delta, includeDelimiter) + offsetDelta;
		},
		/**
		 * @see orion.editor.TextModel#getLineStart
		 */
		getLineStart: function(lineIndex) {
			if (lineIndex < 0) { return -1; }
			var model = this._model, projections = this._projections;
			var delta = 0, offsetDelta = 0;
			for (var i = 0; i < projections.length; i++) {
				var projection = projections[i];
				if (projection._lineIndex >= lineIndex - delta) { break; }
				var lineCount = projection._model.getLineCount() - 1;
				if (projection._lineIndex + lineCount >= lineIndex - delta) {
					var projectionLineIndex = lineIndex - (projection._lineIndex + delta);
					return projection._model.getLineStart (projectionLineIndex) + projection.start + offsetDelta;
				}
				offsetDelta += projection._model.getCharCount() - (projection.end - projection.start);
				delta += lineCount - projection._lineCount;
			}
			return model.getLineStart(lineIndex - delta) + offsetDelta;
		},
		/**
		 * @see orion.editor.TextModel#getText
		 */
		getText: function(start, end) {
			if (start === undefined) { start = 0; }
			var model = this._model, projections = this._projections;
			var delta = 0, result = [], i, projection, charCount;
			for (i = 0; i < projections.length; i++) {
				projection = projections[i];
				if (projection.start > start - delta) { break; }
				charCount = projection._model.getCharCount();
				if (projection.start + charCount > start - delta) {
					if (end !== undefined && projection.start + charCount > end - delta) {
						return projection._model.getText(start - (projection.start + delta), end - (projection.start + delta));
					} else {
						result.push(projection._model.getText(start - (projection.start + delta)));
						start = projection.end + delta + charCount - (projection.end - projection.start);
					}
				}
				delta += charCount - (projection.end - projection.start);
			}
			var offset = start - delta;
			if (end !== undefined) {
				for (; i < projections.length; i++) {
					projection = projections[i];
					if (projection.start > end - delta) { break; }
					result.push(model.getText(offset, projection.start));
					charCount = projection._model.getCharCount();
					if (projection.start + charCount > end - delta) {
						result.push(projection._model.getText(0, end - (projection.start + delta)));
						return result.join("");
					}
					result.push(projection._model.getText());
					offset = projection.end;
					delta += charCount - (projection.end - projection.start);
				}
				result.push(model.getText(offset, end - delta));
			} else {
				for (; i < projections.length; i++) {
					projection = projections[i];
					result.push(model.getText(offset, projection.start));
					result.push(projection._model.getText());
					offset = projection.end;
				}
				result.push(model.getText(offset));
			}
			return result.join("");
		},
		/** @ignore */
		_onChanged: function(modelChangedEvent) {
			var change = this._change;
			var start = change.baseStart, end = change.baseEnd, i;
			var projection, projections = this._projections;
			for (i = 0; i < projections.length; i++) {
				projection = projections[i];
				if (projection.end > start) { break; }
			}
			var rangeStart = i;
			for (i = 0; i < projections.length; i++) {
				projection = projections[i];
				if (projection.start >= end) { break; }
			}
			var rangeEnd = i;
			var model = this._model;
			var changeCount = change.baseText.length - (end - start);
			for (i = rangeEnd; i < projections.length; i++) {
				projection = projections[i];
				projection.start += changeCount;
				projection.end += changeCount;
				projection._lineIndex = model.getLineAtOffset(projection.start);
			}
			var removed = projections.splice(rangeStart, rangeEnd - rangeStart);
			for (i = 0; i < removed.length; i++) {
				if (removed[i].annotation) {
					removed[i].annotation._expand();
				}
			}
			var modelChangedEvent1 = {
				type: "Changed", //$NON-NLS-0$
				start: change.start,
				removedCharCount: change.removedCharCount,
				addedCharCount: change.addedCharCount,
				removedLineCount: change.removedLineCount,
				addedLineCount: change.addedLineCount
			};
			this.onChanged(modelChangedEvent1);
			this._change = undefined;
		},
		_onChanging: function(modelChangingEvent) {
			var hasChange = !!this._change;
			var change = this._change || {};
			var start = modelChangingEvent.start, end = start + modelChangingEvent.removedCharCount;
			change.baseStart = start;
			change.baseEnd = end;
			change.baseText = modelChangingEvent.text;
			change.addedLineCount = modelChangingEvent.addedLineCount;
			if (!hasChange) {
				this._change = change;
				change.text = modelChangingEvent.text;
				var projections = this._projections, delta, i, projection;
				function mapOffset(offset) {
					for (i = 0, delta = 0; i < projections.length; i++) {
						projection = projections[i];
						if (projection.start > offset) { break; }
						if (projection.end > offset) { return -1; }
						delta += projection._model.getCharCount() - (projection.end - projection.start);
					}
					return offset + delta;
				}
				change.start = mapOffset(start);
				if (change.start === -1) {
					change.text = this._model.getText(projection.start, start) + change.text;
					change.addedLineCount += this._model.getLineAtOffset(start) - this._model.getLineAtOffset(projection.start);
					change.start = projection.start + delta;
				}
				change.end = mapOffset(end);
				if (change.end === -1) {
					change.text += this._model.getText(end, projection.end);
					change.addedLineCount += this._model.getLineAtOffset(projection.end) - this._model.getLineAtOffset(end);
					change.end = projection.start + delta;
				}
			}
			change.addedCharCount = change.text.length;
			change.removedCharCount = change.end - change.start;
			change.removedLineCount = this.getLineAtOffset(change.end) - this.getLineAtOffset(change.start);
			var modelChangingEvent1 = {
				type: "Changing", //$NON-NLS-0$
				text: change.text,
				start: change.start,
				removedCharCount: change.removedCharCount,
				addedCharCount: change.addedCharCount,
				removedLineCount: change.removedLineCount,
				addedLineCount: change.addedLineCount
			};
			this.onChanging(modelChangingEvent1);
		},
		/**
		 * @see orion.editor.TextModel#onChanging
		 */
		onChanging: function(modelChangingEvent) {
			return this.dispatchEvent(modelChangingEvent);
		},
		/**
		 * @see orion.editor.TextModel#onChanged
		 */
		onChanged: function(modelChangedEvent) {
			return this.dispatchEvent(modelChangedEvent);
		},
		/**
		 * @see orion.editor.TextModel#setLineDelimiter
		 */
		setLineDelimiter: function(lineDelimiter) {
			this._model.setLineDelimiter(lineDelimiter);
		},
		/**
		 * @see orion.editor.TextModel#setText
		 */
		setText: function(text, start, end) {
			this._change = {
				text: text || "",
				start: start || 0,
				end: end === undefined ? this.getCharCount() : end
			};
			var projections = this._projections, delta, i, projection;
			function mapOffset(offset) {
				for (i = 0, delta = 0; i < projections.length; i++) {
					projection = projections[i];
					if (projection.start > offset - delta) { break; }
					var charCount = projection._model.getCharCount();
					if (projection.start + charCount > offset - delta) {
						return -1;
					}
					delta += charCount - (projection.end - projection.start);
				}
				return offset - delta;
			}
			var startProjection, endProjection;
			var mapStart = mapOffset(this._change.start);
			if (mapStart === -1) {
				startProjection = {
					projection: projection,
					start: this._change.start - (projection.start + delta)
				};
				mapStart = projection.end;
			}
			var mapEnd = mapOffset(this._change.end);
			if (mapEnd === -1) {
				endProjection = {
					projection: projection,
					end: this._change.end - (projection.start + delta)
				};
				mapEnd = projection.start;
			}
			if (startProjection && endProjection && startProjection.projection === endProjection.projection) {
				//TODO events - special case - change is completely inside of a projection
				projection._model.setText(this._change.text, startProjection.start, endProjection.end);
			} else {
				this._model.setText(this._change.text, mapStart, mapEnd);
				if (startProjection) {
					projection = startProjection.projection;
					projection._model.setText("", startProjection.start);
				}		
				if (endProjection) {
					projection = endProjection.projection;
					projection._model.setText("", 0, endProjection.end);
					projection.start = projection.end;
					projection._lineCount = 0;
				}
			}
			this._change = undefined;
		}
	};
	mEventTarget.EventTarget.addMixin(ProjectionTextModel.prototype);

	return {ProjectionTextModel: ProjectionTextModel};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: 
 *		Felipe Heidrich (IBM Corporation) - initial API and implementation
 *		Silenio Quarti (IBM Corporation) - initial API and implementation
 ******************************************************************************/

/*global define */

define("orion/editor/annotations", ['i18n!orion/editor/nls/messages', 'orion/editor/eventTarget'], function(messages, mEventTarget) { //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	/**
	 * @class This object represents a decoration attached to a range of text. Annotations are added to a
	 * <code>AnnotationModel</code> which is attached to a <code>TextModel</code>.
	 * <p>
	 * <b>See:</b><br/>
	 * {@link orion.editor.AnnotationModel}<br/>
	 * {@link orion.editor.Ruler}<br/>
	 * </p>		 
	 * @name orion.editor.Annotation
	 * 
	 * @property {String} type The annotation type (for example, orion.annotation.error).
	 * @property {Number} start The start offset of the annotation in the text model.
	 * @property {Number} end The end offset of the annotation in the text model.
	 * @property {String} html The HTML displayed for the annotation.
	 * @property {String} title The text description for the annotation.
	 * @property {orion.editor.Style} style The style information for the annotation used in the annotations ruler and tooltips.
	 * @property {orion.editor.Style} overviewStyle The style information for the annotation used in the overview ruler.
	 * @property {orion.editor.Style} rangeStyle The style information for the annotation used in the text view to decorate a range of text.
	 * @property {orion.editor.Style} lineStyle The style information for the annotation used in the text view to decorate a line of text.
	 */
	/**
	 * Constructs a new folding annotation.
	 * 
	 * @param {Number} start The start offset of the annotation in the text model.
	 * @param {Number} end The end offset of the annotation in the text model.
	 * @param {orion.editor.ProjectionTextModel} projectionModel The projection text model.
	 * 
	 * @class This object represents a folding annotation.
	 * @name orion.editor.FoldingAnnotation
	 */
	function FoldingAnnotation (start, end, projectionModel) {
		this.start = start;
		this.end = end;
		this._projectionModel = projectionModel;
		this.html = this._expandedHTML;
		this.style = this._expandedStyle;
		this.expanded = true;
	}
	
	FoldingAnnotation.prototype = /** @lends orion.editor.FoldingAnnotation.prototype */ {
		_expandedHTML: "<div class='annotationHTML expanded'></div>", //$NON-NLS-0$
		_expandedStyle: {styleClass: "annotation expanded"}, //$NON-NLS-0$
		_collapsedHTML: "<div class='annotationHTML collapsed'></div>", //$NON-NLS-0$
		_collapsedStyle: {styleClass: "annotation collapsed"}, //$NON-NLS-0$
		_collapse: function() {
			if (!this.expanded) { return false; }
			this.expanded = false;
			this.html = this._collapsedHTML;
			this.style = this._collapsedStyle;
			if (this._annotationModel) {
				this._annotationModel.modifyAnnotation(this);
			}
			return true;
		},
		_expand: function() {
			if (this.expanded) { return false; }
			this.expanded = true;
			this.html = this._expandedHTML;
			this.style = this._expandedStyle;
			if (this._annotationModel) {
				this._annotationModel.modifyAnnotation(this);
			}
			return true;
		},
		/**
		 * Collapses the annotation.
		 */
		collapse: function () {
			if (this._collapse()) {
				var projectionModel = this._projectionModel;
				var baseModel = projectionModel.getBaseModel();
				this._projection = {
					annotation: this,
					start: baseModel.getLineStart(baseModel.getLineAtOffset(this.start) + 1),
					end: baseModel.getLineEnd(baseModel.getLineAtOffset(this.end), true)
				};
				projectionModel.addProjection(this._projection);
			}
		},
		/**
		 * Expands the annotation.
		 */
		expand: function () {
			if (this._expand()) {
				this._projectionModel.removeProjection(this._projection);
			}
		}
	};
	 
	/**
	 * @class This object represents a regitry of annotation types.
	 * @name orion.editor.AnnotationType
	 */
	function AnnotationType() {
	}
	
	/**
	 * Error annotation type.
	 */
	AnnotationType.ANNOTATION_ERROR = "orion.annotation.error"; //$NON-NLS-0$
	/**
	 * Warning annotation type.
	 */
	AnnotationType.ANNOTATION_WARNING = "orion.annotation.warning"; //$NON-NLS-0$
	/**
	 * Task annotation type.
	 */
	AnnotationType.ANNOTATION_TASK = "orion.annotation.task"; //$NON-NLS-0$
	/**
	 * Breakpoint annotation type.
	 */
	AnnotationType.ANNOTATION_BREAKPOINT = "orion.annotation.breakpoint"; //$NON-NLS-0$
	/**
	 * Bookmark annotation type.
	 */
	AnnotationType.ANNOTATION_BOOKMARK = "orion.annotation.bookmark"; //$NON-NLS-0$
	/**
	 * Folding annotation type.
	 */
	AnnotationType.ANNOTATION_FOLDING = "orion.annotation.folding"; //$NON-NLS-0$
	/**
	 * Curent bracket annotation type.
	 */
	AnnotationType.ANNOTATION_CURRENT_BRACKET = "orion.annotation.currentBracket"; //$NON-NLS-0$
	/**
	 * Matching bracket annotation type.
	 */
	AnnotationType.ANNOTATION_MATCHING_BRACKET = "orion.annotation.matchingBracket"; //$NON-NLS-0$
	/**
	 * Current line annotation type.
	 */
	AnnotationType.ANNOTATION_CURRENT_LINE = "orion.annotation.currentLine"; //$NON-NLS-0$
	/**
	 * Current search annotation type.
	 */
	AnnotationType.ANNOTATION_CURRENT_SEARCH = "orion.annotation.currentSearch"; //$NON-NLS-0$
	/**
	 * Matching search annotation type.
	 */
	AnnotationType.ANNOTATION_MATCHING_SEARCH = "orion.annotation.matchingSearch"; //$NON-NLS-0$
	/**
	 * Read Occurrence annotation type.
	 */
	AnnotationType.ANNOTATION_READ_OCCURRENCE = "orion.annotation.readOccurrence"; //$NON-NLS-0$
	/**
	 * Write Occurrence annotation type.
	 */
	AnnotationType.ANNOTATION_WRITE_OCCURRENCE = "orion.annotation.writeOccurrence"; //$NON-NLS-0$

	/**
	 * Selected linked group annotation type.
	 */
	AnnotationType.ANNOTATION_SELECTED_LINKED_GROUP = "orion.annotation.selectedLinkedGroup"; //$NON-NLS-0$

	/**
	 * Current linked group annotation type.
	 */
	AnnotationType.ANNOTATION_CURRENT_LINKED_GROUP = "orion.annotation.currentLinkedGroup"; //$NON-NLS-0$

	/**
	 * Linked group annotation type.
	 */
	AnnotationType.ANNOTATION_LINKED_GROUP = "orion.annotation.linkedGroup"; //$NON-NLS-0$
	
	/**
	* Blame annotation type.
	*/
	AnnotationType.ANNOTATION_BLAME = "orion.annotation.blame"; //$NON-NLS-0$
	
	/**
	* Current Blame annotation type.
	*/
	AnnotationType.ANNOTATION_CURRENT_BLAME = "orion.annotation.currentBlame"; //$NON-NLS-0$
	
	
	/** @private */
	var annotationTypes = {};
	
	/**
	 * Register an annotation type.
	 *
	 * @param {String} type The annotation type (for example, orion.annotation.error).
	 * @param {Object|Function} properties The common annotation properties of the registered
	 *		annotation type. All annotations create with this annotation type will expose these
	 *		properties.
	 */
	AnnotationType.registerType = function(type, properties) {
		var constructor = properties;
		if (typeof constructor !== "function") { //$NON-NLS-0$
			constructor = function(start, end, title) {
				this.start = start;
				this.end = end;
				if (title !== undefined) { this.title = title; }
			};
			constructor.prototype = properties;
		}
		constructor.prototype.type = type;
		annotationTypes[type] = constructor;
		return type;
	};
	
	/**
	 * Creates an annotation of a given type with the specified start end end offsets.
	 *
	 * @param {String} type The annotation type (for example, orion.annotation.error).
	 * @param {Number} start The start offset of the annotation in the text model.
	 * @param {Number} end The end offset of the annotation in the text model.
	 * @param {String} [title] The text description for the annotation if different then the type description.
	 * @return {orion.editor.Annotation} the new annotation
	 */
	AnnotationType.createAnnotation = function(type, start, end, title) {
		return new (this.getType(type))(start, end, title);
	};
	
	/**
	 * Gets the registered annotation type with specified type. The returned
	 * value is a constructor that can be used to create annotations of the
	 * speficied type.  The constructor takes the start and end offsets of
	 * the annotation.
	 *
	 * @param {String} type The annotation type (for example, orion.annotation.error).
	 * @return {Function} The annotation type constructor ( i.e function(start, end, title) ).
	 */
	AnnotationType.getType = function(type) {
		return annotationTypes[type];
	};
	
	/** @private */
	function registerType(type, lineStyling) {
		var index = type.lastIndexOf('.'); //$NON-NLS-0$
		var suffix = type.substring(index + 1);
		var properties = {
			title: messages[suffix],
			style: {styleClass: "annotation " + suffix}, //$NON-NLS-0$
			html: "<div class='annotationHTML " + suffix + "'></div>", //$NON-NLS-1$ //$NON-NLS-0$
			overviewStyle: {styleClass: "annotationOverview " + suffix} //$NON-NLS-0$
		};
		if (lineStyling) {
			properties.lineStyle = {styleClass: "annotationLine " + suffix}; //$NON-NLS-0$
		} else {
			properties.rangeStyle = {styleClass: "annotationRange " + suffix}; //$NON-NLS-0$
		}
		AnnotationType.registerType(type, properties);
	}
	registerType(AnnotationType.ANNOTATION_ERROR);
	registerType(AnnotationType.ANNOTATION_WARNING);
	registerType(AnnotationType.ANNOTATION_TASK);
	registerType(AnnotationType.ANNOTATION_BREAKPOINT);
	registerType(AnnotationType.ANNOTATION_BOOKMARK);
	registerType(AnnotationType.ANNOTATION_CURRENT_BRACKET);
	registerType(AnnotationType.ANNOTATION_MATCHING_BRACKET);
	registerType(AnnotationType.ANNOTATION_CURRENT_SEARCH);
	registerType(AnnotationType.ANNOTATION_MATCHING_SEARCH);
	registerType(AnnotationType.ANNOTATION_READ_OCCURRENCE);
	registerType(AnnotationType.ANNOTATION_WRITE_OCCURRENCE);
	registerType(AnnotationType.ANNOTATION_SELECTED_LINKED_GROUP);
	registerType(AnnotationType.ANNOTATION_CURRENT_LINKED_GROUP);
	registerType(AnnotationType.ANNOTATION_LINKED_GROUP);
	registerType(AnnotationType.ANNOTATION_CURRENT_LINE, true);
	registerType(AnnotationType.ANNOTATION_BLAME, true);
	registerType(AnnotationType.ANNOTATION_CURRENT_BLAME, true);
	AnnotationType.registerType(AnnotationType.ANNOTATION_FOLDING, FoldingAnnotation);
	
	/** 
	 * Constructs a new AnnotationTypeList object.
	 * 
	 * @class This represents an interface of prioritized annotation types.
	 * @name orion.editor.AnnotationTypeList
	 */
	function AnnotationTypeList () {
	}
	/**
	 * Adds in the annotation type interface into the specified object.
	 *
	 * @param {Object} object The object to add in the annotation type interface.
	 */
	AnnotationTypeList.addMixin = function(object) {
		var proto = AnnotationTypeList.prototype;
		for (var p in proto) {
			if (proto.hasOwnProperty(p)) {
				object[p] = proto[p];
			}
		}
	};	
	AnnotationTypeList.prototype = /** @lends orion.editor.AnnotationTypeList.prototype */ {
		/**
		 * Adds an annotation type to the receiver.
		 * <p>
		 * Only annotations of the specified types will be shown by
		 * the receiver.
		 * </p>
		 *
		 * @param {Object} type the annotation type to be shown
		 * 
		 * @see orion.editor.AnnotationTypeList#removeAnnotationType
		 * @see orion.editor.AnnotationTypeList#isAnnotationTypeVisible
		 */
		addAnnotationType: function(type) {
			if (!this._annotationTypes) { this._annotationTypes = []; }
			this._annotationTypes.push(type);
		},
		/**
		 * Gets the annotation type priority.  The priority is determined by the
		 * order the annotation type is added to the receiver.  Annotation types
		 * added first have higher priority.
		 * <p>
		 * Returns <code>0</code> if the annotation type is not added.
		 * </p>
		 *
		 * @param {Object} type the annotation type
		 * 
		 * @see orion.editor.AnnotationTypeList#addAnnotationType
		 * @see orion.editor.AnnotationTypeList#removeAnnotationType
		 * @see orion.editor.AnnotationTypeList#isAnnotationTypeVisible
		 */
		getAnnotationTypePriority: function(type) {
			if (this._annotationTypes) { 
				for (var i = 0; i < this._annotationTypes.length; i++) {
					if (this._annotationTypes[i] === type) {
						return i + 1;
					}
				}
			}
			return 0;
		},
		/**
		 * Returns an array of annotations in the specified annotation model for the given range of text sorted by type.
		 *
		 * @param {orion.editor.AnnotationModel} annotationModel the annotation model.
		 * @param {Number} start the start offset of the range.
		 * @param {Number} end the end offset of the range.
		 * @return {orion.editor.Annotation[]} an annotation array.
		 */
		getAnnotationsByType: function(annotationModel, start, end) {
			var iter = annotationModel.getAnnotations(start, end);
			var annotation, annotations = [];
			while (iter.hasNext()) {
				annotation = iter.next();
				var priority = this.getAnnotationTypePriority(annotation.type);
				if (priority === 0) { continue; }
				annotations.push(annotation);
			}
			var self = this;
			annotations.sort(function(a, b) {
				return self.getAnnotationTypePriority(a.type) - self.getAnnotationTypePriority(b.type);
			});
			return annotations;
		},
		/**
		 * Returns whether the receiver shows annotations of the specified type.
		 *
		 * @param {Object} type the annotation type 
		 * @returns {Boolean} whether the specified annotation type is shown
		 * 
		 * @see orion.editor.AnnotationTypeList#addAnnotationType
		 * @see orion.editor.AnnotationTypeList#removeAnnotationType
		 */
		isAnnotationTypeVisible: function(type) {
			return this.getAnnotationTypePriority(type) !== 0;
		},
		/**
		 * Removes an annotation type from the receiver.
		 *
		 * @param {Object} type the annotation type to be removed
		 * 
		 * @see orion.editor.AnnotationTypeList#addAnnotationType
		 * @see orion.editor.AnnotationTypeList#isAnnotationTypeVisible
		 */
		removeAnnotationType: function(type) {
			if (!this._annotationTypes) { return; }
			for (var i = 0; i < this._annotationTypes.length; i++) {
				if (this._annotationTypes[i] === type) {
					this._annotationTypes.splice(i, 1);
					break;
				}
			}
		}
	};
	
	/**
	 * Constructs an annotation model.
	 * 
	 * @param {orion.editor.TextModel} textModel The text model.
	 * 
	 * @class This object manages annotations for a <code>TextModel</code>.
	 * <p>
	 * <b>See:</b><br/>
	 * {@link orion.editor.Annotation}<br/>
	 * {@link orion.editor.TextModel}<br/> 
	 * </p>	
	 * @name orion.editor.AnnotationModel
	 * @borrows orion.editor.EventTarget#addEventListener as #addEventListener
	 * @borrows orion.editor.EventTarget#removeEventListener as #removeEventListener
	 * @borrows orion.editor.EventTarget#dispatchEvent as #dispatchEvent
	 */
	function AnnotationModel(textModel) {
		this._annotations = [];
		var self = this;
		this._listener = {
			onChanged: function(modelChangedEvent) {
				self._onChanged(modelChangedEvent);
			}
		};
		this.setTextModel(textModel);
	}

	AnnotationModel.prototype = /** @lends orion.editor.AnnotationModel.prototype */ {
		/**
		 * Adds an annotation to the annotation model. 
		 * <p>The annotation model listeners are notified of this change.</p>
		 * 
		 * @param {orion.editor.Annotation} annotation the annotation to be added.
		 * 
		 * @see orion.editor.AnnotationModel#removeAnnotation
		 */
		addAnnotation: function(annotation) {
			if (!annotation) { return; }
			var annotations = this._annotations;
			var index = this._binarySearch(annotations, annotation.start);
			annotations.splice(index, 0, annotation);
			annotation._annotationModel = this;
			var e = {
				type: "Changed", //$NON-NLS-0$
				added: [annotation],
				removed: [],
				changed: []
			};
			this.onChanged(e);
		},
		/**
		 * Returns the text model. 
		 * 
		 * @return {orion.editor.TextModel} The text model.
		 * 
		 * @see orion.editor.AnnotationModel#setTextModel
		 */
		getTextModel: function() {
			return this._model;
		},
		/**
		 * @class This object represents an annotation iterator.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.AnnotationModel#getAnnotations}<br/>
		 * </p>		 
		 * @name orion.editor.AnnotationIterator
		 * 
		 * @property {Function} hasNext Determines whether there are more annotations in the iterator.
		 * @property {Function} next Returns the next annotation in the iterator.
		 */		
		/**
		 * Returns an iterator of annotations for the given range of text. If called with no parameters,
		 * returns all annotations in the model.
		 *
		 * @param {Number} start the start offset of the range.
		 * @param {Number} end the end offset of the range.
		 * @return {orion.editor.AnnotationIterator} an annotation iterartor.
		 */
		getAnnotations: function(start, end) {
			var annotations = this._annotations, current;
			var i = 0, skip;
			if (start === undefined && end === undefined) {
				skip = function() {
					return (i < annotations.length) ? annotations[i++] : null;
				};
			} else {
				//TODO binary search does not work for range intersection when there are overlaping ranges, need interval search tree for this
				skip = function() {
					while (i < annotations.length) {
						var a =  annotations[i++];
						if ((start === a.start) || (start > a.start ? start < a.end : a.start < end)) {
							return a;
						}
						if (a.start >= end) {
							break;
						}
					}
					return null;
				};
			}
			current = skip();
			return {
				next: function() {
					var result = current;
					if (result) { current = skip(); }
					return result;					
				},
				hasNext: function() {
					return current !== null;
				}
			};
		},
		/**
		 * Notifies the annotation model that the given annotation has been modified.
		 * <p>The annotation model listeners are notified of this change.</p>
		 * 
		 * @param {orion.editor.Annotation} annotation the modified annotation.
		 * 
		 * @see orion.editor.AnnotationModel#addAnnotation
		 */
		modifyAnnotation: function(annotation) {
			if (!annotation) { return; }
			var index = this._getAnnotationIndex(annotation);
			if (index < 0) { return; }
			var e = {
				type: "Changed", //$NON-NLS-0$
				added: [],
				removed: [],
				changed: [annotation]
			};
			this.onChanged(e);
		},
		/**
		 * Notifies all listeners that the annotation model has changed.
		 *
		 * @param {orion.editor.Annotation[]} added The list of annotation being added to the model.
		 * @param {orion.editor.Annotation[]} changed The list of annotation modified in the model.
		 * @param {orion.editor.Annotation[]} removed The list of annotation being removed from the model.
		 * @param {ModelChangedEvent} textModelChangedEvent the text model changed event that trigger this change, can be null if the change was trigger by a method call (for example, {@link #addAnnotation}).
		 */
		onChanged: function(e) {
			return this.dispatchEvent(e);
		},
		/**
		 * Removes all annotations of the given <code>type</code>. All annotations
		 * are removed if the type is not specified. 
		 * <p>The annotation model listeners are notified of this change.  Only one changed event is generated.</p>
		 * 
		 * @param {Object} type the type of annotations to be removed.
		 * 
		 * @see orion.editor.AnnotationModel#removeAnnotation
		 */
		removeAnnotations: function(type) {
			var annotations = this._annotations;
			var removed, i; 
			if (type) {
				removed = [];
				for (i = annotations.length - 1; i >= 0; i--) {
					var annotation = annotations[i];
					if (annotation.type === type) {
						annotations.splice(i, 1);
						removed.splice(0, 0, annotation);
						annotation._annotationModel = null;
					}
				}
			} else {
				removed = annotations;
				annotations = [];
			}
			var e = {
				type: "Changed", //$NON-NLS-0$
				removed: removed,
				added: [],
				changed: []
			};
			this.onChanged(e);
		},
		/**
		 * Removes an annotation from the annotation model. 
		 * <p>The annotation model listeners are notified of this change.</p>
		 * 
		 * @param {orion.editor.Annotation} annotation the annotation to be removed.
		 * 
		 * @see orion.editor.AnnotationModel#addAnnotation
		 */
		removeAnnotation: function(annotation) {
			if (!annotation) { return; }
			var index = this._getAnnotationIndex(annotation);
			if (index < 0) { return; }
			annotation._annotationModel = null;
			var e = {
				type: "Changed", //$NON-NLS-0$
				removed: this._annotations.splice(index, 1),
				added: [],
				changed: []
			};
			this.onChanged(e);
		},
		/**
		 * Removes and adds the specifed annotations to the annotation model. 
		 * <p>The annotation model listeners are notified of this change.  Only one changed event is generated.</p>
		 * 
		 * @param {orion.editor.Annotation} remove the annotations to be removed.
		 * @param {orion.editor.Annotation} add the annotations to be added.
		 * 
		 * @see orion.editor.AnnotationModel#addAnnotation
		 * @see orion.editor.AnnotationModel#removeAnnotation
		 */
		replaceAnnotations: function(remove, add) {
			var annotations = this._annotations, i, index, annotation, removed = [];
			if (remove) {
				for (i = remove.length - 1; i >= 0; i--) {
					annotation = remove[i];
					index = this._getAnnotationIndex(annotation);
					if (index < 0) { continue; }
					annotation._annotationModel = null;
					annotations.splice(index, 1);
					removed.splice(0, 0, annotation);
				}
			}
			if (!add) { add = []; }
			for (i = 0; i < add.length; i++) {
				annotation = add[i];
				index = this._binarySearch(annotations, annotation.start);
				annotation._annotationModel = this;
				annotations.splice(index, 0, annotation);
			}
			var e = {
				type: "Changed", //$NON-NLS-0$
				removed: removed,
				added: add,
				changed: []
			};
			this.onChanged(e);
		},
		/**
		 * Sets the text model of the annotation model.  The annotation
		 * model listens for changes in the text model to update and remove
		 * annotations that are affected by the change.
		 * 
		 * @param {orion.editor.TextModel} textModel the text model.
		 * 
		 * @see orion.editor.AnnotationModel#getTextModel
		 */
		setTextModel: function(textModel) {
			if (this._model) {
				this._model.removeEventListener("Changed", this._listener.onChanged); //$NON-NLS-0$
			}
			this._model = textModel;
			if (this._model) {
				this._model.addEventListener("Changed", this._listener.onChanged); //$NON-NLS-0$
			}
		},
		/** @ignore */
		_binarySearch: function (array, offset) {
			var high = array.length, low = -1, index;
			while (high - low > 1) {
				index = Math.floor((high + low) / 2);
				if (offset <= array[index].start) {
					high = index;
				} else {
					low = index;
				}
			}
			return high;
		},
		/** @ignore */
		_getAnnotationIndex: function(annotation) {
			var annotations = this._annotations;
			var index = this._binarySearch(annotations, annotation.start);
			while (index < annotations.length && annotations[index].start === annotation.start) {
				if (annotations[index] === annotation) {
					return index;
				}
				index++;
			}
			return -1;
		},
		/** @ignore */
		_onChanged: function(modelChangedEvent) {
			var start = modelChangedEvent.start;
			var addedCharCount = modelChangedEvent.addedCharCount;
			var removedCharCount = modelChangedEvent.removedCharCount;
			var annotations = this._annotations, end = start + removedCharCount;
			//TODO binary search does not work for range intersection when there are overlaping ranges, need interval search tree for this
			var startIndex = 0;
			if (!(0 <= startIndex && startIndex < annotations.length)) { return; }
			var e = {
				type: "Changed", //$NON-NLS-0$
				added: [],
				removed: [],
				changed: [],
				textModelChangedEvent: modelChangedEvent
			};
			var changeCount = addedCharCount - removedCharCount, i;
			for (i = startIndex; i < annotations.length; i++) {
				var annotation = annotations[i];
				if (annotation.start >= end) {
					annotation._oldStart = annotation.start;
					annotation._oldEnd = annotation.end;
					annotation.start += changeCount;
					annotation.end += changeCount;
					e.changed.push(annotation);
				} else if (annotation.end <= start) {
					//nothing
				} else if (annotation.start < start && end < annotation.end) {
					annotation._oldStart = annotation.start;
					annotation._oldEnd = annotation.end;
					annotation.end += changeCount;
					e.changed.push(annotation);
				} else {
					annotations.splice(i, 1);
					e.removed.push(annotation);
					annotation._annotationModel = null;
					if (annotation.expand) {
						annotation.expand();
					}
					i--;
				}
			}
			if (e.added.length > 0 || e.removed.length > 0 || e.changed.length > 0) {
				this.onChanged(e);
			}
		}
	};
	mEventTarget.EventTarget.addMixin(AnnotationModel.prototype);

	/**
	 * Constructs a new styler for annotations.
	 * 
	 * @param {orion.editor.TextView} view The styler view.
	 * @param {orion.editor.AnnotationModel} view The styler annotation model.
	 * 
	 * @class This object represents a styler for annotation attached to a text view.
	 * @name orion.editor.AnnotationStyler
	 * @borrows orion.editor.AnnotationTypeList#addAnnotationType as #addAnnotationType
	 * @borrows orion.editor.AnnotationTypeList#getAnnotationTypePriority as #getAnnotationTypePriority
	 * @borrows orion.editor.AnnotationTypeList#getAnnotationsByType as #getAnnotationsByType
	 * @borrows orion.editor.AnnotationTypeList#isAnnotationTypeVisible as #isAnnotationTypeVisible
	 * @borrows orion.editor.AnnotationTypeList#removeAnnotationType as #removeAnnotationType
	 */
	function AnnotationStyler (view, annotationModel) {
		this._view = view;
		this._annotationModel = annotationModel;
		var self = this;
		this._listener = {
			onDestroy: function(e) {
				self._onDestroy(e);
			},
			onLineStyle: function(e) {
				self._onLineStyle(e);
			},
			onChanged: function(e) {
				self._onAnnotationModelChanged(e);
			}
		};
		view.addEventListener("Destroy", this._listener.onDestroy); //$NON-NLS-0$
		view.addEventListener("postLineStyle", this._listener.onLineStyle); //$NON-NLS-0$
		annotationModel.addEventListener("Changed", this._listener.onChanged); //$NON-NLS-0$
	}
	AnnotationStyler.prototype = /** @lends orion.editor.AnnotationStyler.prototype */ {
		/**
		 * Destroys the styler. 
		 * <p>
		 * Removes all listeners added by this styler.
		 * </p>
		 */
		destroy: function() {
			var view = this._view;
			if (view) {
				view.removeEventListener("Destroy", this._listener.onDestroy); //$NON-NLS-0$
				view.removeEventListener("LineStyle", this._listener.onLineStyle); //$NON-NLS-0$
				this.view = null;
			}
			var annotationModel = this._annotationModel;
			if (annotationModel) {
				annotationModel.removeEventListener("Changed", this._listener.onChanged); //$NON-NLS-0$
				annotationModel = null;
			}
		},
		_mergeStyle: function(result, style) {
			if (style) {
				if (!result) { result = {}; }
				if (result.styleClass && style.styleClass && result.styleClass !== style.styleClass) {
					result.styleClass += " " + style.styleClass; //$NON-NLS-0$
				} else {
					result.styleClass = style.styleClass;
				}
				var prop;
				if (style.tagName) {
					if (!result.tagName) {
						result.tagName = style.tagName;
					}
				}
				if (style.style) {
					if (!result.style) { result.style  = {}; }
					for (prop in style.style) {
						if (!result.style[prop]) {
							result.style[prop] = style.style[prop];
						}
					}
				}
				if (style.attributes) {
					if (!result.attributes) { result.attributes  = {}; }
					for (prop in style.attributes) {
						if (!result.attributes[prop]) {
							result.attributes[prop] = style.attributes[prop];
						}
					}
				}
			}
			return result;
		},
		_mergeStyleRanges: function(ranges, styleRange) {
			if (!ranges) {
				ranges = [];
			}
			var mergedStyle, i;
			for (i=0; i<ranges.length && styleRange; i++) {
				var range = ranges[i];
				if (styleRange.end <= range.start) { break; }
				if (styleRange.start >= range.end) { continue; }
				mergedStyle = this._mergeStyle({}, range.style);
				mergedStyle = this._mergeStyle(mergedStyle, styleRange.style);
				var args = [];
				args.push(i, 1);
				if (styleRange.start < range.start) {
					args.push({start: styleRange.start, end: range.start, style: styleRange.style});
				}
				if (styleRange.start > range.start) {
					args.push({start: range.start, end: styleRange.start, style: range.style});
				}
				args.push({start: Math.max(range.start, styleRange.start), end: Math.min(range.end, styleRange.end), style: mergedStyle});
				if (styleRange.end < range.end) {
					args.push({start: styleRange.end, end: range.end, style: range.style});
				}
				if (styleRange.end > range.end) {
					styleRange = {start: range.end, end: styleRange.end, style: styleRange.style};
				} else {
					styleRange = null;
				}
				Array.prototype.splice.apply(ranges, args);
			}
			if (styleRange) {
				mergedStyle = this._mergeStyle({}, styleRange.style);
				ranges.splice(i, 0, {start: styleRange.start, end: styleRange.end, style: mergedStyle});
			}
			return ranges;
		},
		_onAnnotationModelChanged: function(e) {
			var view = this._view;
			if (!view) { return; }
			var self = this;
			var model = view.getModel();
			function redrawRange(start, end) {
				if (model.getBaseModel) {
					start = model.mapOffset(start, true);
					end = model.mapOffset(end, true);
				}
				if (start !== -1 && end !== -1) {
					view.redrawRange(start, end);
				}
			}
			function redraw(changes, changed) {
				for (var i = 0; i < changes.length; i++) {
					if (!self.isAnnotationTypeVisible(changes[i].type)) { continue; }
					var change = changes[i];
					redrawRange(change.start, change.end);
					if (changed && change._oldStart !== undefined && change._oldEnd) {
						redrawRange(change._oldStart, change._oldEnd);
					}
				}
			}
			redraw(e.added);
			redraw(e.removed);
			redraw(e.changed, true);
		},
		_onDestroy: function(e) {
			this.destroy();
		},
		_onLineStyle: function (e) {
			var annotationModel = this._annotationModel;
			var viewModel = e.textView.getModel();
			var baseModel = annotationModel.getTextModel();
			var start = e.lineStart;
			var end = e.lineStart + e.lineText.length;
			if (baseModel !== viewModel) {
				start = viewModel.mapOffset(start);
				end = viewModel.mapOffset(end);
			}
			var annotations = annotationModel.getAnnotations(start, end);
			while (annotations.hasNext()) {
				var annotation = annotations.next();
				if (!this.isAnnotationTypeVisible(annotation.type)) { continue; }
				if (annotation.rangeStyle) {
					var annotationStart = annotation.start;
					var annotationEnd = annotation.end;
					if (baseModel !== viewModel) {
						annotationStart = viewModel.mapOffset(annotationStart, true);
						annotationEnd = viewModel.mapOffset(annotationEnd, true);
					}
					e.ranges = this._mergeStyleRanges(e.ranges, {start: annotationStart, end: annotationEnd, style: annotation.rangeStyle});
				}
				if (annotation.lineStyle) {
					e.style = this._mergeStyle({}, e.style);
					e.style = this._mergeStyle(e.style, annotation.lineStyle);
				}
			}
		}
	};
	AnnotationTypeList.addMixin(AnnotationStyler.prototype);
	
	return {
		FoldingAnnotation: FoldingAnnotation,
		AnnotationType: AnnotationType,
		AnnotationTypeList: AnnotationTypeList,
		AnnotationModel: AnnotationModel,
		AnnotationStyler: AnnotationStyler
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define Node */

define("orion/editor/tooltip", [ //$NON-NLS-0$
	'i18n!orion/editor/nls/messages', //$NON-NLS-0$
	'orion/editor/textView', //$NON-NLS-0$
	'orion/editor/textModel', //$NON-NLS-0$
	'orion/editor/projectionTextModel', //$NON-NLS-0$
	'orion/editor/util', //$NON-NLS-0$
	'orion/util' //$NON-NLS-0$
], function(messages, mTextView, mTextModel, mProjectionTextModel, textUtil, util) {

	/** @private */
	function Tooltip (view) {
		this._view = view;
		this._fadeDelay = 500;
		this._hideDelay = 200;
		this._showDelay = 500;
		this._autoHideDelay = 5000;
		this._create(view.getOptions("parent").ownerDocument); //$NON-NLS-0$
	}
	Tooltip.getTooltip = function(view) {
		if (!view._tooltip) {
			 view._tooltip = new Tooltip(view);
		}
		return view._tooltip;
	};
	Tooltip.prototype = /** @lends orion.editor.Tooltip.prototype */ {
		_create: function(document) {
			if (this._tooltipDiv) { return; }
			var tooltipDiv = this._tooltipDiv = util.createElement(document, "div"); //$NON-NLS-0$
			tooltipDiv.tabIndex = 0;
			tooltipDiv.className = "textviewTooltip"; //$NON-NLS-0$
			tooltipDiv.setAttribute("aria-live", "assertive"); //$NON-NLS-1$ //$NON-NLS-0$
			tooltipDiv.setAttribute("aria-atomic", "true"); //$NON-NLS-1$ //$NON-NLS-0$
			var tooltipContents = this._tooltipContents = util.createElement(document, "div"); //$NON-NLS-0$
			tooltipDiv.appendChild(tooltipContents);
			document.body.appendChild(tooltipDiv);
			var self = this;
			textUtil.addEventListener(tooltipDiv, "mouseover", function(event) { //$NON-NLS-0$
				if (!self._hideDelay) { return; }
				var window = self._getWindow();
				if (self._delayedHideTimeout) {
					window.clearTimeout(self._delayedHideTimeout);
					self._delayedHideTimeout = null;
				}
				
				if (self._hideTimeout) {
					window.clearTimeout(self._hideTimeout);
					self._hideTimeout = null;
				}
				self._nextTarget = null;
			}, false);
			textUtil.addEventListener(tooltipDiv, "mouseout", function(event) { //$NON-NLS-0$
				var relatedTarget = event.relatedTarget || event.toElement;
				if (relatedTarget === tooltipDiv || self._hasFocus()) { return; }
				if (relatedTarget) {
					if (textUtil.contains(tooltipDiv, relatedTarget)) { return; }
				}
				self._hide();
			}, false);
			textUtil.addEventListener(tooltipDiv, "keydown", function(event) { //$NON-NLS-0$
				if (event.keyCode === 27) {
					self._hide();
				}
			}, false);
			textUtil.addEventListener(document, "mousedown", this._mouseDownHandler = function(event) { //$NON-NLS-0$
				if (!self.isVisible()) { return; }
				if (textUtil.contains(tooltipDiv, event.target || event.srcElement)) { return; }
				self._hide();
			}, true);
			this._view.addEventListener("Destroy", function() { //$NON-NLS-0$
				self.destroy();
			});
			this._hide();
		},
		_getWindow: function() {
			var document = this._tooltipDiv.ownerDocument;
			return document.defaultView || document.parentWindow;
		},
		destroy: function() {
			if (!this._tooltipDiv) { return; }
			this._hide();
			var parent = this._tooltipDiv.parentNode;
			if (parent) { parent.removeChild(this._tooltipDiv); }
			var document = this._tooltipDiv.ownerDocument;
			textUtil.removeEventListener(document, "mousedown", this._mouseDownHandler, true); //$NON-NLS-0$
			this._tooltipDiv = null;
		},
		_hasFocus: function() {
			var tooltipDiv = this._tooltipDiv;
			if (!tooltipDiv) { return false; }
			var document = tooltipDiv.ownerDocument;
			return textUtil.contains(tooltipDiv, document.activeElement);
		},
		hide: function(hideDelay) {
			if (hideDelay === undefined) {
				hideDelay = this._hideDelay;
			}
			var window = this._getWindow();
			if (this._delayedHideTimeout) {
				window.clearTimeout(this._delayedHideTimeout);
				this._delayedHideTimeout = null;
			}
			var self = this;
			if (!hideDelay) {
				self._hide();
				self.setTarget(self._nextTarget, 0);
			} else {
				self._delayedHideTimeout = window.setTimeout(function() {
					self._delayedHideTimeout = null;
					self._hide();
					self.setTarget(self._nextTarget, 0);
				}, hideDelay);
			}
		},
		_hide: function() {
			var tooltipDiv = this._tooltipDiv;
			if (!tooltipDiv) { return; }
			if (this._hasFocus()) {
				this._view.focus();
			}
			if (this._contentsView) {
				this._contentsView.destroy();
				this._contentsView = null;
			}
			if (this._tooltipContents) {
				this._tooltipContents.innerHTML = "";
			}
			tooltipDiv.style.visibility = "hidden"; //$NON-NLS-0$
			var window = this._getWindow();
			if (this._showTimeout) {
				window.clearTimeout(this._showTimeout);
				this._showTimeout = null;
			}
			if (this._delayedHideTimeout) {
				window.clearTimeout(this._delayedHideTimeout);
				this._delayedHideTimeout = null;
			}
			if (this._hideTimeout) {
				window.clearTimeout(this._hideTimeout);
				this._hideTimeout = null;
			}
			if (this._fadeTimeout) {
				window.clearInterval(this._fadeTimeout);
				this._fadeTimeout = null;
			}
		},
		isVisible: function() {
			return this._tooltipDiv && this._tooltipDiv.style.visibility === "visible"; //$NON-NLS-0$
		},
		setTarget: function(target, delay, hideDelay) {
			var visible = this.isVisible();
			if (visible) {
				if (this._hasFocus()) { return; }
				this._nextTarget = target;
				this.hide(hideDelay);
			} else {
				this._target = target;
				if (target) {
					var self = this;
					var window = self._getWindow();
					if (self._showTimeout) {
						window.clearTimeout(self._showTimeout);
						self._showTimeout = null;
					}
					if (delay === 0) {
						self.show(true);
					} else {
						self._showTimeout = window.setTimeout(function() {
							self._showTimeout = null;
							self.show(true);
						}, delay ? delay : self._showDelay);
					}
				}
			}
		},
		show: function(autoHide) {
			if (!this._target) { return; }
			var info = this._target.getTooltipInfo();
			if (!info) { return; }
			var tooltipDiv = this._tooltipDiv, tooltipContents = this._tooltipContents;
			tooltipDiv.style.left = tooltipDiv.style.right = tooltipDiv.style.width = tooltipDiv.style.height = 
				tooltipContents.style.width = tooltipContents.style.height = "auto"; //$NON-NLS-0$
			var contents = info.contents;
			if (contents instanceof Array) {
				contents = this._getAnnotationContents(contents);
			}
			if (typeof contents === "string") { //$NON-NLS-0$
				tooltipContents.innerHTML = contents;
			} else if (this._isNode(contents)) {
				tooltipContents.appendChild(contents);
			} else if (contents instanceof mProjectionTextModel.ProjectionTextModel) {
				var view = this._view;
				var options = view.getOptions();
				options.wrapMode = false;
				options.parent = tooltipContents;
				var tooltipTheme = "tooltipTheme"; //$NON-NLS-0$
				var theme = options.themeClass;
				if (theme) {
					theme = theme.replace(tooltipTheme, "");
					if (theme) { theme = " " + theme; } //$NON-NLS-0$
					theme = tooltipTheme + theme;
				} else {
					theme = tooltipTheme;
				}
				options.themeClass = theme;
				var contentsView = this._contentsView = new mTextView.TextView(options);
				//TODO need to find a better way of sharing the styler for multiple views
				var listener = {
					onLineStyle: function(e) {
						view.onLineStyle(e);
					}
				};
				contentsView.addEventListener("LineStyle", listener.onLineStyle); //$NON-NLS-0$
				contentsView.setModel(contents);
				var size = contentsView.computeSize();
				tooltipContents.style.width = size.width + "px"; //$NON-NLS-0$
				tooltipContents.style.height = size.height + "px"; //$NON-NLS-0$
				contentsView.resize();
			} else {
				return;
			}
			var documentElement = tooltipDiv.ownerDocument.documentElement;
			if (info.anchor === "right") { //$NON-NLS-0$
				var right = documentElement.clientWidth - info.x;
				tooltipDiv.style.right = right + "px"; //$NON-NLS-0$
				tooltipDiv.style.maxWidth = (documentElement.clientWidth - right - 10) + "px"; //$NON-NLS-0$
			} else {
				var left = parseInt(this._getNodeStyle(tooltipDiv, "padding-left", "0"), 10); //$NON-NLS-1$ //$NON-NLS-0$
				left += parseInt(this._getNodeStyle(tooltipDiv, "border-left-width", "0"), 10); //$NON-NLS-1$ //$NON-NLS-0$
				left = info.x - left;
				tooltipDiv.style.left = left + "px"; //$NON-NLS-0$
				tooltipDiv.style.maxWidth = (documentElement.clientWidth - left - 10) + "px"; //$NON-NLS-0$
			}
			var top = parseInt(this._getNodeStyle(tooltipDiv, "padding-top", "0"), 10); //$NON-NLS-1$ //$NON-NLS-0$
			top += parseInt(this._getNodeStyle(tooltipDiv, "border-top-width", "0"), 10); //$NON-NLS-1$ //$NON-NLS-0$
			top = info.y - top;
			tooltipDiv.style.top = top + "px"; //$NON-NLS-0$
			tooltipDiv.style.maxHeight = (documentElement.clientHeight - top - 10) + "px"; //$NON-NLS-0$
			tooltipDiv.style.opacity = "1"; //$NON-NLS-0$
			tooltipDiv.style.visibility = "visible"; //$NON-NLS-0$
			if (autoHide) {
				var self = this;
				var window = this._getWindow();
				self._hideTimeout = window.setTimeout(function() {
					self._hideTimeout = null;
					var opacity = parseFloat(self._getNodeStyle(tooltipDiv, "opacity", "1")); //$NON-NLS-1$ //$NON-NLS-0$
					self._fadeTimeout = window.setInterval(function() {
						if (tooltipDiv.style.visibility === "visible" && opacity > 0) { //$NON-NLS-0$
							opacity -= 0.1;
							tooltipDiv.style.opacity = opacity;
							return;
						}
						self._hide();
					}, self._fadeDelay / 10);
				}, self._autoHideDelay);
			}
		},
		_getAnnotationContents: function(annotations) {
			var annotation;
			var newAnnotations = [];
			for (var j = 0; j < annotations.length; j++) {
				annotation = annotations[j];
				if (annotation.title !== "" && !annotation.groupAnnotation) { 
					newAnnotations.push(annotation); 
				}
			}
			annotations = newAnnotations;
			if (annotations.length === 0) {
				return null;
			}
			var self = this;
			var html;
			var document = this._tooltipDiv.ownerDocument;
			var view = this._view;
			var model = view.getModel();
			var baseModel = model.getBaseModel ? model.getBaseModel() : model;
			function getText(start, end) {
				var textStart = baseModel.getLineStart(baseModel.getLineAtOffset(start));
				var textEnd = baseModel.getLineEnd(baseModel.getLineAtOffset(end), true);
				return baseModel.getText(textStart, textEnd);
			}
			function getAnnotationHTML(annotation) {
				var title = annotation.title;
				var result = util.createElement(document, "div"); //$NON-NLS-0$
				result.className = "tooltipRow"; //$NON-NLS-0$
				if (annotation.html) {
					result.innerHTML = annotation.html;
					if (result.lastChild) {
						textUtil.addEventListener(result.lastChild, "click", function(event) { //$NON-NLS-0$
							var start = annotation.start, end = annotation.end;
							if (model.getBaseModel) {
								start = model.mapOffset(start, true);
								end = model.mapOffset(end, true);
							}
							view.setSelection(start, end, 1 / 3, function() { self._hide(); });
						}, false);
					}
					result.appendChild(document.createTextNode("\u00A0")); //$NON-NLS-0$
				}
				if (!title) {
					title = getText(annotation.start, annotation.end);
				}
				if (typeof title === "function") { //$NON-NLS-0$
					title = annotation.title();
				}
				if (typeof title === "string") { //$NON-NLS-0$
					var span = util.createElement(document, "span"); //$NON-NLS-0$
//					span.className = "tooltipTitle"; //$NON-NLS-0$
					span.appendChild(document.createTextNode(title));
					title = span;
				}
				result.appendChild(title);
				return result;
			}
			if (annotations.length === 1) {
				annotation = annotations[0];
				if (annotation.title !== undefined) {
					html = getAnnotationHTML(annotation);
					if (html.firstChild) {
						var className = html.firstChild.className;
						if (className) { className += " "; } //$NON-NLS-0$
						className += "single"; //$NON-NLS-0$
						html.firstChild.className = className;
					}
					return html;
				} else {
					var newModel = new mProjectionTextModel.ProjectionTextModel(baseModel);
					var lineStart = baseModel.getLineStart(baseModel.getLineAtOffset(annotation.start));
					var charCount = baseModel.getCharCount();
					if (annotation.end !== charCount) {
						newModel.addProjection({start: annotation.end, end: charCount});
					}
					if (lineStart > 0) {
						newModel.addProjection({start: 0, end: lineStart});
					}
					return newModel;
				}
			} else {
				var tooltipHTML = util.createElement(document, "div"); //$NON-NLS-0$
				var em = util.createElement(document, "em"); //$NON-NLS-0$
				em.appendChild(document.createTextNode(messages.multipleAnnotations));
				tooltipHTML.appendChild(em);
				for (var i = 0; i < annotations.length; i++) {
					annotation = annotations[i];
					html = getAnnotationHTML(annotation);
					if (html) {
						tooltipHTML.appendChild(html);
					}
				}
				return tooltipHTML;
			}
		},
		_getNodeStyle: function(node, prop, defaultValue) {
			var value;
			if (node) {
				value = node.style[prop];
				if (!value) {
					if (node.currentStyle) {
						var index = 0, p = prop;
						while ((index = p.indexOf("-", index)) !== -1) { //$NON-NLS-0$
							p = p.substring(0, index) + p.substring(index + 1, index + 2).toUpperCase() + p.substring(index + 2);
						}
						value = node.currentStyle[p];
					} else {
						var css = node.ownerDocument.defaultView.getComputedStyle(node, null);
						value = css ? css.getPropertyValue(prop) : null;
					}
				}
			}
			return value || defaultValue;
		},
		_isNode: function (obj) {
			return typeof Node === "object" ? obj instanceof Node : //$NON-NLS-0$
				obj && typeof obj === "object" && typeof obj.nodeType === "number" && typeof obj.nodeName === "string"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		}
	};
	return {Tooltip: Tooltip};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define*/

define("orion/editor/rulers", ['i18n!orion/editor/nls/messages', 'orion/editor/annotations', 'orion/editor/tooltip', 'orion/util'], function(messages, mAnnotations, mTooltip, util) { //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

	/**
	 * Constructs a new ruler. 
	 * <p>
	 * The default implementation does not implement all the methods in the interface
	 * and is useful only for objects implementing rulers.
	 * <p/>
	 * 
	 * @param {orion.editor.AnnotationModel} annotationModel the annotation model for the ruler.
	 * @param {String} [rulerLocation="left"] the location for the ruler.
	 * @param {String} [rulerOverview="page"] the overview for the ruler.
	 * @param {orion.editor.Style} [rulerStyle] the style for the ruler. 
	 * 
	 * @class This interface represents a ruler for the text view.
	 * <p>
	 * A Ruler is a graphical element that is placed either on the left or on the right side of 
	 * the view. It can be used to provide the view with per line decoration such as line numbering,
	 * bookmarks, breakpoints, folding disclosures, etc. 
	 * </p><p>
	 * There are two types of rulers: page and document. A page ruler only shows the content for the lines that are
	 * visible, while a document ruler always shows the whole content.
	 * </p>
	 * <b>See:</b><br/>
	 * {@link orion.editor.LineNumberRuler}<br/>
	 * {@link orion.editor.AnnotationRuler}<br/>
	 * {@link orion.editor.OverviewRuler}<br/> 
	 * {@link orion.editor.TextView}<br/>
	 * {@link orion.editor.TextView#addRuler}
	 * </p>		 
	 * @name orion.editor.Ruler
	 * @borrows orion.editor.AnnotationTypeList#addAnnotationType as #addAnnotationType
	 * @borrows orion.editor.AnnotationTypeList#getAnnotationTypePriority as #getAnnotationTypePriority
	 * @borrows orion.editor.AnnotationTypeList#getAnnotationsByType as #getAnnotationsByType
	 * @borrows orion.editor.AnnotationTypeList#isAnnotationTypeVisible as #isAnnotationTypeVisible
	 * @borrows orion.editor.AnnotationTypeList#removeAnnotationType as #removeAnnotationType
	 */
	function Ruler (annotationModel, rulerLocation, rulerOverview, rulerStyle) {
		this._location = rulerLocation || "left"; //$NON-NLS-0$
		this._overview = rulerOverview || "page"; //$NON-NLS-0$
		this._rulerStyle = rulerStyle;
		this._view = null;
		var self = this;
		this._listener = {
			onTextModelChanged: function(e) {
				self._onTextModelChanged(e);
			},
			onAnnotationModelChanged: function(e) {
				self._onAnnotationModelChanged(e);
			}
		};
		this.setAnnotationModel(annotationModel);
	}
	Ruler.prototype = /** @lends orion.editor.Ruler.prototype */ {
		/**
		 * Returns the annotations for a given line range merging multiple
		 * annotations when necessary.
		 * <p>
		 * This method is called by the text view when the ruler is redrawn.
		 * </p>
		 *
		 * @param {Number} startLine the start line index
		 * @param {Number} endLine the end line index
		 * @return {orion.editor.Annotation[]} the annotations for the line range. The array might be sparse.
		 */
		getAnnotations: function(startLine, endLine) {
			var annotationModel = this._annotationModel;
			if (!annotationModel) { return []; }
			var model = this._view.getModel();
			var start = model.getLineStart(startLine);
			var end = model.getLineEnd(endLine - 1);
			var baseModel = model;
			if (model.getBaseModel) {
				baseModel = model.getBaseModel();
				start = model.mapOffset(start);
				end = model.mapOffset(end);
			}
			var result = [];
			var annotations = this.getAnnotationsByType(annotationModel, start, end);
			for (var i = 0; i < annotations.length; i++) {
				var annotation = annotations[i];
				var annotationLineStart = baseModel.getLineAtOffset(annotation.start);
				var annotationLineEnd = baseModel.getLineAtOffset(Math.max(annotation.start, annotation.end - 1));
				for (var lineIndex = annotationLineStart; lineIndex<=annotationLineEnd; lineIndex++) {
					var visualLineIndex = lineIndex;
					if (model !== baseModel) {
						var ls = baseModel.getLineStart(lineIndex);
						ls = model.mapOffset(ls, true);
						if (ls === -1) { continue; }
						visualLineIndex = model.getLineAtOffset(ls);
					}
					if (!(startLine <= visualLineIndex && visualLineIndex < endLine)) { continue; }
					var rulerAnnotation = this._mergeAnnotation(result[visualLineIndex], annotation, lineIndex - annotationLineStart, annotationLineEnd - annotationLineStart + 1);
					if (rulerAnnotation) {
						result[visualLineIndex] = rulerAnnotation;
					}
				}
			}
			if (!this._multiAnnotation && this._multiAnnotationOverlay) {
				for (var k in result) {
					if (result[k]._multiple) {
						result[k].html = result[k].html + this._multiAnnotationOverlay.html;
					}
				}
			}
			return result;
		},
		/**
		 * Returns the annotation model.
		 *
		 * @returns {orion.editor.AnnotationModel} the ruler annotation model.
		 *
		 * @see orion.editor.Ruler#setAnnotationModel
		 */
		getAnnotationModel: function() {
			return this._annotationModel;
		},
		/**
		 * Returns the ruler location.
		 *
		 * @returns {String} the ruler location, which is either "left" or "right".
		 *
		 * @see orion.editor.Ruler#getOverview
		 */
		getLocation: function() {
			return this._location;
		},
		/**
		 * Returns the ruler overview type.
		 *
		 * @returns {String} the overview type, which is either "page" or "document".
		 *
		 * @see orion.editor.Ruler#getLocation
		 */
		getOverview: function() {
			return this._overview;
		},
		/**
		 * Returns the style information for the ruler.
		 *
		 * @returns {orion.editor.Style} the style information.
		 */
		getRulerStyle: function() {
			return this._rulerStyle;
		},
		/**
		 * Returns the text view.
		 *
		 * @returns {orion.editor.TextView} the text view.
		 *
		 * @see orion.editor.Ruler#setView
		 */
		getView: function() {
			return this._view;
		},
		/**
		 * Returns the widest annotation which determines the width of the ruler.
		 * <p>
		 * If the ruler does not have a fixed width it should provide the widest
		 * annotation to avoid the ruler from changing size as the view scrolls.
		 * </p>
		 * <p>
		 * This method is called by the text view when the ruler is redrawn.
		 * </p>
		 *
		 * @returns {orion.editor.Annotation} the widest annotation.
		 *
		 * @see orion.editor.Ruler#getAnnotations
		 */
		getWidestAnnotation: function() {
			return null;
		},
		/**
		 * Sets the annotation model for the ruler.
		 *
		 * @param {orion.editor.AnnotationModel} annotationModel the annotation model.
		 *
		 * @see orion.editor.Ruler#getAnnotationModel
		 */
		setAnnotationModel: function (annotationModel) {
			if (this._annotationModel) {
				this._annotationModel.removEventListener("Changed", this._listener.onAnnotationModelChanged); //$NON-NLS-0$
			}
			this._annotationModel = annotationModel;
			if (this._annotationModel) {
				this._annotationModel.addEventListener("Changed", this._listener.onAnnotationModelChanged); //$NON-NLS-0$
			}
		},
		/**
		 * Sets the annotation that is displayed when a given line contains multiple
		 * annotations.  This annotation is used when there are different types of
		 * annotations in a given line.
		 *
		 * @param {orion.editor.Annotation} annotation the annotation for lines with multiple annotations.
		 * 
		 * @see orion.editor.Ruler#setMultiAnnotationOverlay
		 */
		setMultiAnnotation: function(annotation) {
			this._multiAnnotation = annotation;
		},
		/**
		 * Sets the annotation that overlays a line with multiple annotations.  This annotation is displayed on
		 * top of the computed annotation for a given line when there are multiple annotations of the same type
		 * in the line. It is also used when the multiple annotation is not set.
		 *
		 * @param {orion.editor.Annotation} annotation the annotation overlay for lines with multiple annotations.
		 * 
		 * @see orion.editor.Ruler#setMultiAnnotation
		 */
		setMultiAnnotationOverlay: function(annotation) {
			this._multiAnnotationOverlay = annotation;
		},
		/**
		 * Sets the view for the ruler.
		 * <p>
		 * This method is called by the text view when the ruler
		 * is added to the view.
		 * </p>
		 *
		 * @param {orion.editor.TextView} view the text view.
		 */
		setView: function (view) {
			if (this._onTextModelChanged && this._view) {
				this._view.removeEventListener("ModelChanged", this._listener.onTextModelChanged); //$NON-NLS-0$
			}
			this._view = view;
			if (this._onTextModelChanged && this._view) {
				this._view.addEventListener("ModelChanged", this._listener.onTextModelChanged); //$NON-NLS-0$
			}
		},
		/**
		 * This event is sent when the user clicks a line annotation.
		 *
		 * @event
		 * @param {Number} lineIndex the line index of the annotation under the pointer.
		 * @param {DOMEvent} e the click event.
		 */
		onClick: function(lineIndex, e) {
			if (lineIndex === undefined) { return; }
			var view = this._view;
			var model = view.getModel();
			var baseModel = model;
			var start = model.getLineStart(lineIndex), lineStart = start;
			var end = start;
			var annotationModel = this._annotationModel;
			if (annotationModel) {
				var selection = view.getSelection();
				end = model.getLineEnd(lineIndex, true);
				if (start <= selection.start && selection.start < end) {
					start = selection.start;
				}
				if (model.getBaseModel) {
					start = model.mapOffset(start);
					end = model.mapOffset(end);
					baseModel = model.getBaseModel();
				}
				var annotation, iter = annotationModel.getAnnotations(start, end);
				var clickedAnnotation = null;
				while (!annotation && iter.hasNext()) {
					var a = iter.next();
					if (!this.isAnnotationTypeVisible(a.type)) { continue; }
					clickedAnnotation = a;
					if (a.start <= start) { continue; }
					annotation = a; 
				}
				if (clickedAnnotation && clickedAnnotation.groupId !== undefined) {
					if (this._currentClickGroup === clickedAnnotation.groupId) {
						this._currentClickGroup = null;
					} else {
						this._currentClickGroup = clickedAnnotation.groupId;
					}
					this._setCurrentGroup(lineIndex);
				} 
				if (annotation && baseModel.getLineAtOffset(annotation.start) === baseModel.getLineAtOffset(start)) {
					start = annotation.start;
					end = annotation.end;
				} else {
					end = start = lineStart;
				}
				
				if (model.getBaseModel) {
					start = model.mapOffset(start, true);
					end = model.mapOffset(end, true);
				}
			}
			var tooltip = mTooltip.Tooltip.getTooltip(this._view);
			if (tooltip) {
				tooltip.setTarget(null);
			}
			this._view.setSelection(end, start, 1/3, function(){});
		},
		/**
		 * This event is sent when the user double clicks a line annotation.
		 *
		 * @event
		 * @param {Number} lineIndex the line index of the annotation under the pointer.
		 * @param {DOMEvent} e the double click event.
		 */
		onDblClick: function(lineIndex, e) {
		},
		/**
		 * This event is sent when the user moves the mouse over a line annotation.
		 *
		 * @event
		 * @param {Number} lineIndex the line index of the annotation under the pointer.
		 * @param {DOMEvent} e the mouse move event.
		 */
		onMouseMove: function(lineIndex, e) {
			var tooltip = mTooltip.Tooltip.getTooltip(this._view);
			if (!tooltip) { return; }
			if (tooltip.isVisible() && this._tooltipLineIndex === lineIndex) { return; }
			this._tooltipLineIndex = lineIndex;
			var self = this;
			tooltip.setTarget({
				y: e.clientY,
				getTooltipInfo: function() {
					return self._getTooltipInfo(self._tooltipLineIndex, this.y);
				}
			});
		},
		/**
		 * This event is sent when the mouse pointer enters a line annotation.
		 *
		 * @event
		 * @param {Number} lineIndex the line index of the annotation under the pointer.
		 * @param {DOMEvent} e the mouse over event.
		 */
		onMouseOver: function(lineIndex, e) {
			this.onMouseMove(lineIndex, e);
			if (!this._currentClickGroup) {
				this._setCurrentGroup(lineIndex);
			}
		},
		/**
		 * This event is sent when the mouse pointer exits a line annotation.
		 *
		 * @event
		 * @param {Number} lineIndex the line index of the annotation under the pointer.
		 * @param {DOMEvent} e the mouse out event.
		 */
		onMouseOut: function(lineIndex, e) {
			if (!this._currentClickGroup) {
				this._setCurrentGroup(-1);
			}
			var tooltip = mTooltip.Tooltip.getTooltip(this._view);
			if (!tooltip) { return; }
			tooltip.setTarget(null);
		},
		/** @ignore */
		_getTooltipInfo: function(lineIndex, y) {
			if (lineIndex === undefined) { return; }
			var view = this._view;
			var model = view.getModel();
			var annotationModel = this._annotationModel;
			var annotations = [];
			if (annotationModel) {
				var start = model.getLineStart(lineIndex);
				var end = model.getLineEnd(lineIndex);
				if (model.getBaseModel) {
					start = model.mapOffset(start);
					end = model.mapOffset(end);
				}
				annotations = this.getAnnotationsByType(annotationModel, start, end);
			}
			var contents = this._getTooltipContents(lineIndex, annotations);
			if (!contents) { return null; }
			var info = {
				contents: contents,
				anchor: this.getLocation()
			};
			var rect = view.getClientArea();
			if (this.getOverview() === "document") { //$NON-NLS-0$
				rect.y = view.convert({y: y}, "view", "document").y; //$NON-NLS-1$ //$NON-NLS-0$
			} else {
				rect.y = view.getLocationAtOffset(model.getLineStart(lineIndex)).y;
			}
			view.convert(rect, "document", "page"); //$NON-NLS-1$ //$NON-NLS-0$
			info.x = rect.x;
			info.y = rect.y;
			if (info.anchor === "right") { //$NON-NLS-0$
				info.x += rect.width;
			}
			return info;
		},
		/** @ignore */
		_getTooltipContents: function(lineIndex, annotations) {
			return annotations;
		},
		/** @ignore */
		_onAnnotationModelChanged: function(e) {
			var view = this._view;
			if (!view) { return; }
			var model = view.getModel(), self = this;
			var lineCount = model.getLineCount();
			if (e.textModelChangedEvent) {
				var start = e.textModelChangedEvent.start;
				if (model.getBaseModel) { start = model.mapOffset(start, true); }
				var startLine = model.getLineAtOffset(start);
				view.redrawLines(startLine, lineCount, self);
				return;
			}
			function redraw(changes) {
				for (var i = 0; i < changes.length; i++) {
					if (!self.isAnnotationTypeVisible(changes[i].type)) { continue; }
					var start = changes[i].start;
					var end = changes[i].end;
					if (model.getBaseModel) {
						start = model.mapOffset(start, true);
						end = model.mapOffset(end, true);
					}
					if (start !== -1 && end !== -1) {
						view.redrawLines(model.getLineAtOffset(start), model.getLineAtOffset(Math.max(start, end - 1)) + 1, self);
					}
				}
			}
			redraw(e.added);
			redraw(e.removed);
			redraw(e.changed);
		},
		/** @ignore */
		_mergeAnnotation: function(result, annotation, annotationLineIndex, annotationLineCount) {
			if (!result) { result = {}; }
			if (annotationLineIndex === 0) {
				if (result.html && annotation.html) {
					if (annotation.html !== result.html) {
						if (!result._multiple && this._multiAnnotation) {
							result.html = this._multiAnnotation.html;
						}
					} 
					result._multiple = true;
				} else {
					result.html = annotation.html;
				}
			}
			result.style = this._mergeStyle(result.style, annotation.style);
			return result;
		},
		/** @ignore */
		_mergeStyle: function(result, style) {
			if (style) {
				if (!result) { result = {}; }
				if (result.styleClass && style.styleClass && result.styleClass !== style.styleClass) {
					result.styleClass += " " + style.styleClass; //$NON-NLS-0$
				} else {
					result.styleClass = style.styleClass;
				}
				var prop;
				if (style.style) {
					if (!result.style) { result.style  = {}; }
					for (prop in style.style) {
						if (result.style[prop] === undefined) {
							result.style[prop] = style.style[prop];
						}
					}
				}
				if (style.attributes) {
					if (!result.attributes) { result.attributes  = {}; }
					for (prop in style.attributes) {
						if (result.attributes[prop] === undefined) {
							result.attributes[prop] = style.attributes[prop];
						}
					}
				}
			}
			return result;
		},
		_setCurrentGroup: function(lineIndex) {
			var annotationModel = this._annotationModel;
			var groupAnnotation = null;
			var model = annotationModel.getTextModel();
			var annotation;
			var annotations;
			var currentGroupAnnotation = this._currentGroupAnnotation;
			if (lineIndex !== -1) {
				var start = model.getLineStart(lineIndex);
				var end = model.getLineEnd(lineIndex);
				if (model.getBaseModel) {
					start = model.mapOffset(start);
					end = model.mapOffset(end);
				}
				annotations = annotationModel.getAnnotations(start, end);
				while(annotations.hasNext()){
					annotation = annotations.next();
					if (!this.isAnnotationTypeVisible(annotation.type)) { continue; }
					if (annotation.start <= start && annotation.end >= end){
						if (annotation.groupId !== undefined) {
							groupAnnotation = annotation;
							break;
						}
					}
				}
				if (currentGroupAnnotation && groupAnnotation) {
					if (currentGroupAnnotation.groupId === groupAnnotation.groupId) {
						return;
					}
				}
			}
			this._currentGroupAnnotation = null;
			if (currentGroupAnnotation) {
				annotationModel.removeAnnotations(currentGroupAnnotation.groupType);
			}
			if (!groupAnnotation) { return; }
			
			if (lineIndex === -1) { return; }
			this._currentGroupAnnotation = groupAnnotation;
			annotations = annotationModel.getAnnotations();
			var add = [];
			while (annotations.hasNext()) {
				annotation = annotations.next();
				delete annotation.groupAnnotation;
				if (annotation.groupId === groupAnnotation.groupId) {
					annotation = annotation.createGroupAnnotation();
					add.push(annotation);
				}
			}
			annotationModel.replaceAnnotations(null, add);
		}
	};
	mAnnotations.AnnotationTypeList.addMixin(Ruler.prototype);

	/**
	 * Constructs a new line numbering ruler. 
	 *
	 * @param {orion.editor.AnnotationModel} annotationModel the annotation model for the ruler.
	 * @param {String} [rulerLocation="left"] the location for the ruler.
	 * @param {orion.editor.Style} [rulerStyle=undefined] the style for the ruler.
	 * @param {orion.editor.Style} [oddStyle={style: {backgroundColor: "white"}] the style for lines with odd line index.
	 * @param {orion.editor.Style} [evenStyle={backgroundColor: "white"}] the style for lines with even line index.
	 *
	 * @augments orion.editor.Ruler
	 * @class This objects implements a line numbering ruler.
	 *
	 * <p><b>See:</b><br/>
	 * {@link orion.editor.Ruler}
	 * </p>
	 * @name orion.editor.LineNumberRuler
	 */
	function LineNumberRuler (annotationModel, rulerLocation, rulerStyle, oddStyle, evenStyle) {
		Ruler.call(this, annotationModel, rulerLocation, "page", rulerStyle); //$NON-NLS-0$
		this._oddStyle = oddStyle || {style: {backgroundColor: "white"}}; //$NON-NLS-0$
		this._evenStyle = evenStyle || {style: {backgroundColor: "white"}}; //$NON-NLS-0$
		this._numOfDigits = 0;
		this._firstLine = 1;
	}
	LineNumberRuler.prototype = new Ruler(); 
	/** @ignore */
	LineNumberRuler.prototype.getAnnotations = function(startLine, endLine) {
		var result = Ruler.prototype.getAnnotations.call(this, startLine, endLine);
		var model = this._view.getModel();
		for (var lineIndex = startLine; lineIndex < endLine; lineIndex++) {
			var style = lineIndex & 1 ? this._oddStyle : this._evenStyle;
			var mapLine = lineIndex;
			if (model.getBaseModel) {
				var lineStart = model.getLineStart(mapLine);
				mapLine = model.getBaseModel().getLineAtOffset(model.mapOffset(lineStart));
			}
			if (!result[lineIndex]) { result[lineIndex] = {}; }
			result[lineIndex].html = (this._firstLine + mapLine) + "";
			if (!result[lineIndex].style) { result[lineIndex].style = style; }
		}
		return result;
	};
	/** @ignore */
	LineNumberRuler.prototype.getWidestAnnotation = function() {
		var lineCount = this._view.getModel().getLineCount();
		return this.getAnnotations(lineCount - 1, lineCount)[lineCount - 1];
	};
	/**
	 * Sets the line index displayed for the first line. The default value is
	 * <code>1</code>.
	 *
	 * @param {Number} [lineIndex=1] the first line index displayed
	 */
	LineNumberRuler.prototype.setFirstLine = function(lineIndex) {
		this._firstLine = lineIndex !== undefined ? lineIndex : 1;
	};
	/** @ignore */
	LineNumberRuler.prototype._onTextModelChanged = function(e) {
		var start = e.start;
		var model = this._view.getModel();
		var lineCount = model.getBaseModel ? model.getBaseModel().getLineCount() : model.getLineCount();
		var numOfDigits = ((this._firstLine + lineCount - 1)+"").length;
		if (this._numOfDigits !== numOfDigits) {
			this._numOfDigits = numOfDigits;
			var startLine = model.getLineAtOffset(start);
			this._view.redrawLines(startLine,  model.getLineCount(), this);
		}
	};
	
	/** 
	 * @class This is class represents an annotation for the AnnotationRuler. 
	 * <p> 
	 * <b>See:</b><br/> 
	 * {@link orion.editor.AnnotationRuler}
	 * </p> 
	 * 
	 * @name orion.editor.Annotation 
	 * 
	 * @property {String} [html=""] The html content for the annotation, typically contains an image.
	 * @property {orion.editor.Style} [style] the style for the annotation.
	 * @property {orion.editor.Style} [overviewStyle] the style for the annotation in the overview ruler.
	 */ 
	/**
	 * Constructs a new annotation ruler. 
	 *
	 * @param {orion.editor.AnnotationModel} annotationModel the annotation model for the ruler.
	 * @param {String} [rulerLocation="left"] the location for the ruler.
	 * @param {orion.editor.Style} [rulerStyle=undefined] the style for the ruler.
	 * @param {orion.editor.Annotation} [defaultAnnotation] the default annotation.
	 *
	 * @augments orion.editor.Ruler
	 * @class This objects implements an annotation ruler.
	 *
	 * <p><b>See:</b><br/>
	 * {@link orion.editor.Ruler}<br/>
	 * {@link orion.editor.Annotation}
	 * </p>
	 * @name orion.editor.AnnotationRuler
	 */
	function AnnotationRuler (annotationModel, rulerLocation, rulerStyle) {
		Ruler.call(this, annotationModel, rulerLocation, "page", rulerStyle); //$NON-NLS-0$
	}
	AnnotationRuler.prototype = new Ruler();
	
	/**
	 * Constructs a new overview ruler. 
	 * <p>
	 * The overview ruler is used in conjunction with a AnnotationRuler, for each annotation in the 
	 * AnnotationRuler this ruler displays a mark in the overview. Clicking on the mark causes the 
	 * view to scroll to the annotated line.
	 * </p>
	 *
	 * @param {orion.editor.AnnotationModel} annotationModel the annotation model for the ruler.
	 * @param {String} [rulerLocation="left"] the location for the ruler.
	 * @param {orion.editor.Style} [rulerStyle=undefined] the style for the ruler.
	 *
	 * @augments orion.editor.Ruler
	 * @class This objects implements an overview ruler.
	 *
	 * <p><b>See:</b><br/>
	 * {@link orion.editor.AnnotationRuler} <br/>
	 * {@link orion.editor.Ruler} 
	 * </p>
	 * @name orion.editor.OverviewRuler
	 */
	function OverviewRuler (annotationModel, rulerLocation, rulerStyle) {
		Ruler.call(this, annotationModel, rulerLocation, "document", rulerStyle); //$NON-NLS-0$
	}
	OverviewRuler.prototype = new Ruler();
	
	/** @ignore */
	OverviewRuler.prototype.getRulerStyle = function() {
		var result = {style: {lineHeight: "1px", fontSize: "1px"}}; //$NON-NLS-1$ //$NON-NLS-0$
		result = this._mergeStyle(result, this._rulerStyle);
		return result;
	};
	/** @ignore */
	OverviewRuler.prototype._getTooltipContents = function(lineIndex, annotations) {
		if (annotations.length === 0) {
			var model = this._view.getModel();
			var mapLine = lineIndex;
			if (model.getBaseModel) {
				var lineStart = model.getLineStart(mapLine);
				mapLine = model.getBaseModel().getLineAtOffset(model.mapOffset(lineStart));
			}
			return util.formatMessage(messages.line, mapLine + 1);
		}
		return Ruler.prototype._getTooltipContents.call(this, lineIndex, annotations);
	};
	/** @ignore */
	OverviewRuler.prototype._mergeAnnotation = function(previousAnnotation, annotation, annotationLineIndex, annotationLineCount) {
		if (annotationLineIndex !== 0) { return undefined; }
		var result = previousAnnotation;
		if (!result) {
			//TODO annotationLineCount does not work when there are folded lines
			var height = 3 * annotationLineCount;
			result = {html: "&nbsp;", style: { style: {height: height + "px"}}}; //$NON-NLS-1$ //$NON-NLS-0$
			result.style = this._mergeStyle(result.style, annotation.overviewStyle);
		}
		return result;
	};

	/**
	 * Constructs a new folding ruler. 
	 *
	 * @param {orion.editor.AnnotationModel} annotationModel the annotation model for the ruler.
	 * @param {String} [rulerLocation="left"] the location for the ruler.
	 * @param {orion.editor.Style} [rulerStyle=undefined] the style for the ruler.
	 *
	 * @augments orion.editor.Ruler
	 * @class This objects implements an overview ruler.
	 *
	 * <p><b>See:</b><br/>
	 * {@link orion.editor.AnnotationRuler} <br/>
	 * {@link orion.editor.Ruler} 
	 * </p>
	 * @name orion.editor.OverviewRuler
	 */
	function FoldingRuler (annotationModel, rulerLocation, rulerStyle) {
		AnnotationRuler.call(this, annotationModel, rulerLocation, rulerStyle);
	}
	FoldingRuler.prototype = new AnnotationRuler();
	
	/** @ignore */
	FoldingRuler.prototype.onClick =  function(lineIndex, e) {
		if (lineIndex === undefined) { return; }
		var annotationModel = this._annotationModel;
		if (!annotationModel) { return; }
		var view = this._view;
		var model = view.getModel();
		var start = model.getLineStart(lineIndex);
		var end = model.getLineEnd(lineIndex, true);
		if (model.getBaseModel) {
			start = model.mapOffset(start);
			end = model.mapOffset(end);
			model = model.getBaseModel();
		}
		var annotation, iter = annotationModel.getAnnotations(start, end);
		while (!annotation && iter.hasNext()) {
			var a = iter.next();
			if (!this.isAnnotationTypeVisible(a.type)) { continue; }
			annotation = a;
		}
		if (annotation && model.getLineAtOffset(annotation.start) === model.getLineAtOffset(start)) {
			var tooltip = mTooltip.Tooltip.getTooltip(this._view);
			if (tooltip) {
				tooltip.setTarget(null);
			}
			if (annotation.expanded) {
				annotation.collapse();
			} else {
				annotation.expand();
			}
		}
	};
	/** @ignore */
	FoldingRuler.prototype._getTooltipContents = function(lineIndex, annotations) {
		if (annotations.length === 1) {
			if (annotations[0].expanded) {
				return null;
			}
		}
		return AnnotationRuler.prototype._getTooltipContents.call(this, lineIndex, annotations);
	};
	/** @ignore */
	FoldingRuler.prototype._onAnnotationModelChanged = function(e) {
		if (e.textModelChangedEvent) {
			AnnotationRuler.prototype._onAnnotationModelChanged.call(this, e);
			return;
		}
		var view = this._view;
		if (!view) { return; }
		var model = view.getModel(), self = this, i;
		var lineCount = model.getLineCount(), lineIndex = lineCount;
		function redraw(changes) {
			for (i = 0; i < changes.length; i++) {
				if (!self.isAnnotationTypeVisible(changes[i].type)) { continue; }
				var start = changes[i].start;
				if (model.getBaseModel) {
					start = model.mapOffset(start, true);
				}
				if (start !== -1) {
					lineIndex = Math.min(lineIndex, model.getLineAtOffset(start));
				}
			}
		}
		redraw(e.added);
		redraw(e.removed);
		redraw(e.changed);
		var rulers = view.getRulers();
		for (i = 0; i < rulers.length; i++) {
			view.redrawLines(lineIndex, lineCount, rulers[i]);
		}
	};
	
	return {
		Ruler: Ruler,
		AnnotationRuler: AnnotationRuler,
		LineNumberRuler: LineNumberRuler,
		OverviewRuler: OverviewRuler,
		FoldingRuler: FoldingRuler
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define */

define("orion/editor/undoStack", [], function() { //$NON-NLS-0$

	/** 
	 * Constructs a new Change object.
	 * 
	 * @class 
	 * @name orion.editor.Change
	 * @private
	 */
	function Change(model, offset, text, previousText, type) {
		this.model = model;
		this.offset = offset;
		this.text = text;
		this.previousText = previousText;
		this.type = type;
	}
	Change.prototype = {
		/** @ignore */
		getRedoChanges: function() {
			return [{start: this.offset, end: this.offset + this.previousText.length, text: this.text}];
		},
		/** @ignore */
		getUndoChanges: function() {
			return [{start: this.offset, end: this.offset + this.text.length, text: this.previousText}];
		},
		/** @ignore */
		undo: function (view, select) {
			this._doUndoRedo(this.offset, this.previousText, this.text, view, select);
			return true;
		},
		/** @ignore */
		redo: function (view, select) {
			this._doUndoRedo(this.offset, this.text, this.previousText, view, select);
			return true;
		},
		merge: function(start, text, previousText, type, end) {
			if (type === this.type) {
				if (type === 1 && start === this.offset + this.text.length) {
					this.text += text;
					return true;
				} else if (type === -1 && end === this.offset) {
					this.offset = start;
					this.previousText = previousText + this.previousText;
					return true;
				} else if (type === -1 && start === this.offset) {
					this.previousText = this.previousText + previousText;
					return true;
				}
			}
			return false;
		},
		_doUndoRedo: function(offset, text, previousText, view, select) {
			this.model.setText(text, offset, offset + previousText.length);
			if (select && view) {
				var model = view.getModel();
				if (model !== this.model) {
					offset = model.mapOffset(offset, true);
				}
				view.setSelection(offset, offset + text.length);
			}
		}
	};

	/** 
	 * Constructs a new CompoundChange object.
	 * 
	 * @param owner the owner of the compound change
	 *
	 * @class 
	 * @name orion.editor.CompoundChange
	 * @private
	 */
	function CompoundChange (owner) {
		this.owner = owner;
		this.changes = [];
	}
	CompoundChange.prototype = {
		/** @ignore */
		getRedoChanges: function() {
			var changes = [];
			for (var i=0; i<this.changes.length; i++) {
				changes = changes.concat(this.changes[i].getRedoChanges());
			}
			return changes;
		},
		/** @ignore */
		getUndoChanges: function() {
			var changes = [];
			for (var i=this.changes.length - 1; i >= 0; i--) {
				changes = changes.concat(this.changes[i].getUndoChanges());
			}
			return changes;
		},
		/** @ignore */
		add: function (change) {
			this.changes.push(change);
		},
		/** @ignore */
		end: function (view) {
			if (view) {
				this.endSelection = view.getSelection();
				this.endCaret = view.getCaretOffset();
			}
			var owner = this.owner;
			if (owner && owner.end) {
				owner.end();
			}
		},
		/** @ignore */
		undo: function (view, select) {
			if (this.changes.length > 1 && view) {
				view.setRedraw(false);
			}
			for (var i=this.changes.length - 1; i >= 0; i--) {
				this.changes[i].undo(view, false);
			}
			if (this.changes.length > 1 && view) {
				view.setRedraw(true);
			}
			if (select && view) {
				var start = this.startSelection.start;
				var end = this.startSelection.end;
				view.setSelection(this.startCaret ? start : end, this.startCaret ? end : start);
			}
			var owner = this.owner;
			if (owner && owner.undo) {
				owner.undo();
			}
			return this.changes.length > 0;
		},
		/** @ignore */
		redo: function (view, select) {
			if (this.changes.length > 1 && view) {
				view.setRedraw(false);
			}
			for (var i = 0; i < this.changes.length; i++) {
				this.changes[i].redo(view, false);
			}
			if (this.changes.length > 1, view) {
				view.setRedraw(true);
			}
			if (select && view) {
				var start = this.endSelection.start;
				var end = this.endSelection.end;
				view.setSelection(this.endCaret ? start : end, this.endCaret ? end : start);
			}
			var owner = this.owner;
			if (owner && owner.redo) {
				owner.redo();
			}
			return this.changes.length > 0;
		},
		merge: function(start, text, previousText, type, end) {
			var length = this.changes.length;
			if (length > 0) {
				return this.changes[length - 1].merge(start, text, previousText, type, end);
			}
			return false;
		},
		/** @ignore */
		start: function (view) {
			if (view) {
				this.startSelection = view.getSelection();
				this.startCaret = view.getCaretOffset();
			}
			var owner = this.owner;
			if (owner && owner.start) {
				owner.start();
			}
		}
	};

	/**
	 * Constructs a new UndoStack on a text view.
	 *
	 * @param {orion.editor.TextView} view the text view for the undo stack.
	 * @param {Number} [size=100] the size for the undo stack.
	 *
	 * @name orion.editor.UndoStack
	 * @class The UndoStack is used to record the history of a text model associated to an view. Every
	 * change to the model is added to stack, allowing the application to undo and redo these changes.
	 *
	 * <p>
	 * <b>See:</b><br/>
	 * {@link orion.editor.TextView}<br/>
	 * </p>
	 */
	function UndoStack (view, size) {
		this.size = size !== undefined ? size : 100;
		this.reset();
		var self = this;
		this._listener = {
			onChanging: function(e) {
				self._onChanging(e);
			},
			onDestroy: function(e) {
				self._onDestroy(e);
			}
		};
		if (view.getModel) {
			var model = view.getModel();
			if (model.getBaseModel) {
				model = model.getBaseModel();
			}
			this.model = model;
			this.setView(view);
		} else {
			this.shared = true;
			this.model = view;
		}
		this.model.addEventListener("Changing", this._listener.onChanging); //$NON-NLS-0$
	}
	UndoStack.prototype = /** @lends orion.editor.UndoStack.prototype */ {
		/**
		 * Destroy the undo stack.
		 */
		destroy: function() {
			this._onDestroy();
		},
		/**
		 * Adds a change to the stack.
		 * 
		 * @param change the change to add.
		 */
		add: function (change) {
			if (this.compoundChange) {
				this.compoundChange.add(change);
			} else {
				var length = this.stack.length;
				this.stack.splice(this.index, length-this.index, change);
				this.index++;
				if (this.stack.length > this.size) {
					this.stack.shift();
					this.index--;
				}
			}
		},
		/** 
		 * Marks the current state of the stack as clean.
		 *
		 * <p>
		 * This function is typically called when the content of view associated with the stack is saved.
		 * </p>
		 *
		 * @see orion.editor.UndoStack#isClean
		 */
		markClean: function() {
			this._commitUndo();
			this.cleanChange = this.stack[this.index - 1];
			if (this.cleanChange) {
				this.cleanChange.type = 2;
			}
		},
		/**
		 * Returns true if current state of stack is the same
		 * as the state when markClean() was called.
		 *
		 * <p>
		 * For example, the application calls markClean(), then calls undo() four times and redo() four times.
		 * At this point isClean() returns true.  
		 * </p>
		 * <p>
		 * This function is typically called to determine if the content of the view associated with the stack
		 * has changed since the last time it was saved.
		 * </p>
		 *
		 * @return {Boolean} returns if the state is the same as the state when markClean() was called.
		 *
		 * @see orion.editor.UndoStack#markClean
		 */
		isClean: function() {
			return this.cleanChange === this.stack[this.index - 1];
		},
		/**
		 * Returns true if there is at least one change to undo.
		 *
		 * @return {Boolean} returns true if there is at least one change to undo.
		 *
		 * @see orion.editor.UndoStack#canRedo
		 * @see orion.editor.UndoStack#undo
		 */
		canUndo: function() {
			return this.index > 0;
		},
		/**
		 * Returns true if there is at least one change to redo.
		 *
		 * @return {Boolean} returns true if there is at least one change to redo.
		 *
		 * @see orion.editor.UndoStack#canUndo
		 * @see orion.editor.UndoStack#redo
		 */
		canRedo: function() {
			return (this.stack.length - this.index) > 0;
		},
		/**
		 * Finishes a compound change.
		 *
		 * @see orion.editor.UndoStack#startCompoundChange
		 */
		endCompoundChange: function() {
			if (this.compoundChange) {
				this.compoundChange.end(this.view);
			}
			this.compoundChange = undefined;
		},
		/**
		 * Returns the sizes of the stack.
		 *
		 * @return {object} a object where object.undo is the number of changes that can be un-done, 
		 *  and object.redo is the number of changes that can be re-done.
		 *
		 * @see orion.editor.UndoStack#canUndo
		 * @see orion.editor.UndoStack#canRedo
		 */
		getSize: function() {
			return {
				undo: this.index,
				redo: this.stack.length - this.index
			};
		},
		/**
		 * @class This object represents a text change.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.UndoStack}<br/>
		 * {@link orion.editor.UndoStack#getUndoChanges}<br/>
		 * {@link orion.editor.UndoStack#getRedoChanges}<br/>
		 * </p>
		 * @name orion.editor.TextChange
		 * 
		 * @property {Number} start The start offset in the model of the range to be replaced.
		 * @property {Number} end The end offset in the model of the range to be replaced
		 * @property {String} text the text to be inserted
		 */
		/**
		 * Returns the redo changes.
		 *
		 * @return {orion.editor.TextChange[]} an array of TextChanges that are returned in the order
		 * that they occurred (most recent change last).
		 *
		 * @see orion.editor.UndoStack#getUndoChanges
		 */
		getRedoChanges: function() {
			this._commitUndo();
			var changes = [];
			for (var i=this.index; i<this.stack.length; i++) {
				changes = changes.concat(this.stack[i].getRedoChanges());
			}
			return changes;
		},
		/**
		 * Returns the undo changes.
		 *
		 * @return {orion.editor.TextChange[]} an array of TextChanges that are returned in the reverse order
		 * that they occurred (most recent change first).
		 *
		 * @see orion.editor.UndoStack#getRedoChanges
		 */
		getUndoChanges: function() {
			this._commitUndo();
			var changes = [];
			for (var i=this.index; i >= 0; i--) {
				changes = changes.concat(this.stack[i].getUndoChanges());
			}
			return changes;
		},
		/**
		 * Undo the last change in the stack.
		 *
		 * @return {Boolean} returns true if a change was un-done.
		 *
		 * @see orion.editor.UndoStack#redo
		 * @see orion.editor.UndoStack#canUndo
		 */
		undo: function() {
			this._commitUndo();
			var change, result = false;
			this._ignoreUndo = true;
			do {
				if (this.index <= 0) {
					break;
				}
				change = this.stack[--this.index];
			} while (!(result = change.undo(this.view, true)));
			this._ignoreUndo = false;
			return result;
		},
		/**
		 * Redo the last change in the stack.
		 *
		 * @return {Boolean} returns true if a change was re-done.
		 *
		 * @see orion.editor.UndoStack#undo
		 * @see orion.editor.UndoStack#canRedo
		 */
		redo: function() {
			this._commitUndo();
			var change, result = false;
			this._ignoreUndo = true;
			do {
				if (this.index >= this.stack.length) {
					break;
				}
				change = this.stack[this.index++];
			} while (!(result = change.redo(this.view, true)));
			this._ignoreUndo = false;
			return true;
		},
		/**
		 * Reset the stack to its original state. All changes in the stack are thrown away.
		 */
		reset: function() {
			this.index = 0;
			this.cleanChange = undefined;
			this.stack = [];
			this._ignoreUndo = false;
			this._compoundChange = undefined;
		},
		setView: function(view) {
			if (this.view === view) { return; }
			if (this.view) {
				view.removeEventListener("Destroy", this._listener.onDestroy); //$NON-NLS-0$
			}
			this.view = view;
			if (this.view) {
				view.addEventListener("Destroy", this._listener.onDestroy); //$NON-NLS-0$
			}
		},
		/**
		 * Starts a compound change. 
		 * <p>
		 * All changes added to stack from the time startCompoundChange() is called
		 * to the time that endCompoundChange() is called are compound on one change that can be un-done or re-done
		 * with one single call to undo() or redo().
		 * </p>
		 *
		 * @param owner the owner of the compound change which is called for start, end, undo and redo.
		 *		 
		 * @return the compound change
		 *
		 * @see orion.editor.UndoStack#endCompoundChange
		 */
		startCompoundChange: function(owner) {
			this._commitUndo();
			var change = new CompoundChange(owner);
			this.add(change);
			this.compoundChange = change;
			this.compoundChange.start(this.view);
			return this.compoundChange;
		},
		_commitUndo: function () {
			this.endCompoundChange();
		},
		_onDestroy: function(evt) {
			if (!evt /* undo stack destroyed */ || !this.shared) {
				this.model.removeEventListener("Changing", this._listener.onChanging); //$NON-NLS-0$
			}
			if (this.view) {
				this.view.removeEventListener("Destroy", this._listener.onDestroy); //$NON-NLS-0$
				this.view = null;
			}
		},
		_onChanging: function(e) {
			if (this._ignoreUndo) {
				return;
			}
			var text = e.text;
			var start = e.start;
			var addedCharCount = e.addedCharCount;
			var removedCharCount = e.removedCharCount;
			var end = start + removedCharCount;
			var type = 0;
			if (addedCharCount === 0 && removedCharCount === 1) {
				type = -1;
			} else if (addedCharCount === 1 && removedCharCount === 0) {
				type = 1;
			}
			var length = this.stack.length;
			var previousText = this.model.getText(start, end);
			if (length > 0 && this.index === length) {
				var change = this.stack[length - 1];
				if (change.merge(start, text, previousText, type, end)) {
					return;
				}
			}
			this.add(new Change(this.model, start, text, previousText, type));
		}
	};
	
	return {
		UndoStack: UndoStack
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: 
 *		Felipe Heidrich (IBM Corporation) - initial API and implementation
 *		Silenio Quarti (IBM Corporation) - initial API and implementation
 ******************************************************************************/
 
/*global define */

define("orion/editor/textDND", ['orion/util'], function(util) { //$NON-NLS-1$ //$NON-NLS-0$

	function TextDND(view, undoStack) {
		this._view = view;
		this._undoStack = undoStack;
		this._dragSelection = null;
		this._dropOffset = -1;
		this._dropText = null;
		var self = this;
		this._listener = {
			onDragStart: function (evt) {
				self._onDragStart(evt);
			},
			onDragEnd: function (evt) {
				self._onDragEnd(evt);
			},
			onDragEnter: function (evt) {
				self._onDragEnter(evt);
			},
			onDragOver: function (evt) {
				self._onDragOver(evt);
			},
			onDrop: function (evt) {
				self._onDrop(evt);
			},
			onDestroy: function (evt) {
				self._onDestroy(evt);
			}
		};
		view.addEventListener("DragStart", this._listener.onDragStart); //$NON-NLS-0$
		view.addEventListener("DragEnd", this._listener.onDragEnd); //$NON-NLS-0$
		view.addEventListener("DragEnter", this._listener.onDragEnter); //$NON-NLS-0$
		view.addEventListener("DragOver", this._listener.onDragOver); //$NON-NLS-0$
		view.addEventListener("Drop", this._listener.onDrop); //$NON-NLS-0$
		view.addEventListener("Destroy", this._listener.onDestroy); //$NON-NLS-0$
	}
	TextDND.prototype = {
		destroy: function() {
			var view = this._view;
			if (!view) { return; }
			view.removeEventListener("DragStart", this._listener.onDragStart); //$NON-NLS-0$
			view.removeEventListener("DragEnd", this._listener.onDragEnd); //$NON-NLS-0$
			view.removeEventListener("DragEnter", this._listener.onDragEnter); //$NON-NLS-0$
			view.removeEventListener("DragOver", this._listener.onDragOver); //$NON-NLS-0$
			view.removeEventListener("Drop", this._listener.onDrop); //$NON-NLS-0$
			view.removeEventListener("Destroy", this._listener.onDestroy); //$NON-NLS-0$
			this._view = null;
		},
		_onDestroy: function(e) {
			this.destroy();
		},
		_onDragStart: function(e) {
			var view = this._view;
			var selection = view.getSelection();
			var model = view.getModel();
			if (model.getBaseModel) {
				selection.start = model.mapOffset(selection.start);
				selection.end = model.mapOffset(selection.end);
				model = model.getBaseModel();
			}
			var text = model.getText(selection.start, selection.end);
			if (text) {
				this._dragSelection = selection;
				e.event.dataTransfer.effectAllowed = "copyMove"; //$NON-NLS-0$
				e.event.dataTransfer.setData("Text", text); //$NON-NLS-0$
			}
		},
		_onDragEnd: function(e) {
			if (this._dragSelection) {
				var view = this._view;
				var dropEffect = e.event.dataTransfer.dropEffect;
				if (!util.isFirefox) {
					if (dropEffect !== "none" || this._dropText) { //$NON-NLS-0$
						dropEffect = e.event.dataTransfer.dropEffect = this._dropEffect;
					}
				}
				if (this._undoStack) { this._undoStack.startCompoundChange(); }
				var move = dropEffect === "move"; //$NON-NLS-0$
				if (move) {
					view.setText("", this._dragSelection.start, this._dragSelection.end);
				}
				if (this._dropText) {
					var text = this._dropText;
					var offset = this._dropOffset;
					if (move) {
						if (offset >= this._dragSelection.end) {
							offset -= this._dragSelection.end - this._dragSelection.start;
						} else if (offset >= this._dragSelection.start) {
							offset = this._dragSelection.start;
						}
					}
					view.setText(text, offset, offset);
					view.setSelection(offset, offset + text.length);
					this._dropText = null;
					this._dropOffset = -1;
				}
				if (this._undoStack) { this._undoStack.endCompoundChange(); }
			}
			this._dragSelection = null;
		},
		_onDragEnter: function(e) {
			this._onDragOver(e);
		},
		_onDragOver: function(e) {
			var types = e.event.dataTransfer.types;
			var allowed = !this._view.getOptions("readonly"); //$NON-NLS-0$
			if (allowed) {
				if (types) {
					allowed = types.contains ? 
						types.contains("text/plain") || types.contains("Text") : //$NON-NLS-1$ //$NON-NLS-0$
						types.indexOf("text/plain") !== -1 || types.indexOf("Text") !== -1; //$NON-NLS-1$ //$NON-NLS-0$
					}
			}
			if (!allowed) {
				e.event.dataTransfer.dropEffect = "none"; //$NON-NLS-0$
			} else {
				if (!util.isFirefox) {
					var copy = util.isMac ? e.event.altKey : e.event.ctrlKey;
					this._dropEffect = e.event.dataTransfer.dropEffect = copy ? "copy" : "move"; //$NON-NLS-1$ //$NON-NLS-0$
				}
			}
		},
		_onDrop: function(e) {
			var view = this._view;
			var text = e.event.dataTransfer.getData("Text"); //$NON-NLS-0$
			if (text) {
				if (!util.isFirefox) {
					e.event.dataTransfer.dropEffect = this._dropEffect; //$NON-NLS-1$ //$NON-NLS-0$
				}
				var offset = view.getOffsetAtLocation(e.x, e.y);
				if (this._dragSelection) {
					this._dropOffset = offset;
					this._dropText = text;
				} else {
					view.setText(text, offset, offset);
					view.setSelection(offset, offset + text.length);
				}
			}
		}
	};

	return {TextDND: TextDND};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define*/
define('orion/objects',[], function() {
	function mixin(target/*, source..*/) {
		for (var j = 1; j < arguments.length; j++) {
			var source = arguments[j];
			for (var key in source) {
				if (Object.prototype.hasOwnProperty.call(source, key)) {
					target[key] = source[key];
				}
			}
		}
		return target;
	}

	/**
	 * @name orion.objects
	 * @class Object-oriented helpers.
	 */
	return {
		/**
		 * Creates a shallow clone of the given <code>object</code>.
		 * @name orion.objects.clone
		 * @function
		 * @static
		 * @param {Object|Array} object The object to clone. Must be a "normal" Object or Array. Other built-ins,
		 * host objects, primitives, etc, will not work.
		 * @returns {Object|Array} A clone of <code>object</code>.
		 */
		clone: function(object) {
			if (Array.isArray(object)) {
				return Array.prototype.slice.call(object);
			}
			var clone = Object.create(Object.getPrototypeOf(object));
			mixin(clone, object);
			return clone;
		},
		/**
		 * Mixes all <code>source</code>'s own enumerable properties into <code>target</code>. Multiple source objects
		 * can be passed as varags.
		 * @name orion.objects.mixin
		 * @function
		 * @static
		 * @param {Object} target
		 * @param {Object} source
		 */
		mixin: mixin,
		/**
		 * Wraps an object into an Array if necessary.
		 * @name orion.objects.toArray
		 * @function
		 * @static
		 * @param {Object} obj An object.
		 * @returns {Array} Returns <code>obj</code> unchanged, if <code>obj</code> is an Array. Otherwise returns a 1-element Array
		 * whose sole element is <code>obj</code>.
		 */
		toArray: function(o) {
			return Array.isArray(o) ? o : [o];
		}
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
 
/*global define*/

define("orion/editor/editor", [ //$NON-NLS-0$
	'i18n!orion/editor/nls/messages', //$NON-NLS-0$
	'orion/editor/eventTarget', //$NON-NLS-0$
	'orion/editor/tooltip', //$NON-NLS-0$
	'orion/editor/annotations', //$NON-NLS-0$
	'orion/objects', //$NON-NLS-0$
	'orion/util' //$NON-NLS-0$
], function(messages, mEventTarget, mTooltip, mAnnotations, objects, util) {

	var AT = mAnnotations.AnnotationType;

	var HIGHLIGHT_ERROR_ANNOTATION = "orion.annotation.highlightError"; //$NON-NLS-0$
	
	/**
	 * @name orion.editor.BaseEditor
	 * @class This is the base interface for text and visual editors based on a text buffer.
	 * 
	 * @description Creates a new Base Editor with the given options.
	 * @param {Object} options Creation options for this editor.
	 * @param {Object} options.domNode
	 * @param {Object} options.statusReporter
	 *
	 * @borrows orion.editor.EventTarget#addEventListener as #addEventListener
	 * @borrows orion.editor.EventTarget#removeEventListener as #removeEventListener
	 * @borrows orion.editor.EventTarget#dispatchEvent as #dispatchEvent
	 */
	function BaseEditor(options) {
		options = options || {};
		this._domNode = options.domNode;
		this._model = options.model;
		this._undoStack = options.undoStack;
		this._statusReporter = options.statusReporter;
		this._title = null;
		var self = this;
		this._listener = {
			onChanged: function(e) {
				self.onChanged(e);
			}
		};
		if (this._model) {
			this._model.addEventListener("Changed", this._listener.onChanged); //$NON-NLS-0$
		}
		this.checkDirty();
	}
	BaseEditor.prototype = /** @lends orion.editor.BaseEditor.prototype */ {
		/**
		 * Destroys the editor. Uninstall the editor view.
		 */
		destroy: function() {
			this.uninstall();
			this._statusReporter = this._domNode = null;
			if (this._model) {
				this._model.removeEventListener("Changed", this._listener.onChanged); //$NON-NLS-0$
			}
		},
		
		/** @private */
		checkDirty : function() {
			this.setDirty(this._undoStack && !this._undoStack.isClean());
		},
		/**
		 * Focus the the editor view. The default implementation does nothing.
		 */
		focus: function() {
		},
		/**
		 * Returns the text model of the editor.
		 *
		 * @returns {orion.editor.TextModel} the text model of the view.
		 */
		getModel: function() {
			return this._model;	
		},
		/**
		 * Returns the text for the given range.
		 * <p>
		 * The text does not include the character at the end offset.
		 * </p>
		 *
		 * @param {Number} [start=0] the start offset of text range.
		 * @param {Number} [end=char count] the end offset of text range.
		 *
		 * @see orion.editor.TextView#setText
		 */
		getText: function(start, end) {
			return this.getModel().getText(start, end);
		},
		/**
		 * Returns the editor title. 
		 *
		 * @returns {String} the editor title.
		 */
		getTitle: function() {
			return this._title;
		},
		/**
		 * Returns the editor undo stack. 
		 *
		 * @returns {orion.editor.UndoStack} the editor undo stack.
		 */
		getUndoStack: function() {
			return this._undoStack;
		},
		/**
		 * Creates the DOM hierarchy of the editor and add it to the document.
		 */
		install: function() {
			this.installed = true;
		},
		/**
		 * Returns <code>true</code> if the editor is dirty; <code>false</code> otherwise.
		 * @returns {Boolean} whether the editor is dirty
		 */
		isDirty: function() {
			return this._dirty;
		},
		/** 
		 * Marks the current state of the editor as clean. Meaning there are no unsaved modifications.
		 */
		markClean: function() {
			this.getUndoStack().markClean();
			this.setDirty(false);
		},
		/**
		 * Called when the dirty state of the editor changes.
		 * @param {Event} dirtyChangedEvent
		 */
		onDirtyChanged: function(dirtyChangedEvent) {
			return this.dispatchEvent(dirtyChangedEvent);
		},
		/**
		 * Called when the editor's contents have been changed or saved.
		 * @param {Event} inputChangedEvent
		 */
		onInputChanged: function (inputChangedEvent) {
			return this.dispatchEvent(inputChangedEvent);
		},
		/**
		 * Called when the editor's text model has been changed.
		 * @param {Event} inputChangedEvent
		 */
		onChanged: function (modelChangedEvent) {
			this.checkDirty();
		},
		/**
		 * Report the message to the user.
		 * 
		 * @param {String} message the message to show
		 * @param {String} [type] the message type. Either normal or "progress" or "error";
		 * @param {Boolean} [isAccessible] If <code>true</code>, a screen reader will read this message.
		 * Otherwise defaults to the domNode default.
		 */
		reportStatus: function(message, type, isAccessible) {
			if (this._statusReporter) {
				this._statusReporter(message, type, isAccessible);
			}
		},
		/**
		 * Resizes the editor view. The default implementation does nothing.
		 */
		resize: function() {
		},
		/**
		 * Sets whether the editor is dirty.
		 *
		 * @param {Boolean} dirty
		 */
		setDirty: function(dirty) {
			if (this._dirty === dirty) { return; }
			this._dirty = dirty;
			this.onDirtyChanged({type: "DirtyChanged"}); //$NON-NLS-0$
		},
		/**
		 * @private
		 */
		_setModelText: function(contents) {
			if (this._model) {
				this._model.setText(contents);
			}
		},
		/**
		 * Sets the editor's contents.
		 *
		 * @param {String} title the editor title
		 * @param {String} message an error message
		 * @param {String} contents the editor contents
		 * @param {Boolean} contentsSaved whether the editor contents was saved.
		 */
		setInput: function(title, message, contents, contentsSaved) {
			this._title = title;
			if (!contentsSaved) {
				if (message) {
					this.reportStatus(message, "error"); //$NON-NLS-0$
				} else {
					if (contents !== null && contents !== undefined && typeof contents === "string") { //$NON-NLS-0$
						this._setModelText(contents);
					}
				}
				if (this._undoStack) {
					this._undoStack.reset();
				}
			}
			this.checkDirty();
			this.onInputChanged({
				type: "InputChanged", //$NON-NLS-0$
				title: title,
				message: message,
				contents: contents,
				contentsSaved: contentsSaved
			});
		},
		/**
		 * Replaces the text in the given range with the given text.
		 * <p>
		 * The character at the end offset is not replaced.
		 * </p>
		 *
		 * @param {String} text the new text.
		 * @param {Number} [start=0] the start offset of text range.
		 * @param {Number} [end=char count] the end offset of text range.
		 */
		setText: function(text, start, end) {
			this.getModel().setText(text, start, end);
		},
		/**
		 * Removes the DOM hierarchy of the editor from the document.
		 */
		uninstall: function() {
			this.installed = false;
		}
	};
	mEventTarget.EventTarget.addMixin(BaseEditor.prototype);

	/**
	 * @name orion.editor.Editor
	 * @augments orion.editor.BaseEditor
	 * @class An <code>Editor</code> is a user interface for editing text that provides additional features over the basic {@link orion.editor.TextView}.
	 * Some of <code>Editor</code>'s features include:
	 * <ul>
	 * <li>Additional actions and key bindings for editing text</li>
	 * <li>Content assist</li>
	 * <li>Find and Incremental Find</li>
	 * <li>Rulers for displaying line numbers and annotations</li>
	 * <li>Status reporting</li>
	 * </ul>
	 * 
	 * @description Creates a new Editor with the given options.
	 * @param {Object} options Options controlling the features of this Editor.
	 * @param {Object} options.annotationFactory
	 * @param {Object} options.contentAssistFactory
	 * @param {Object} options.domNode
	 * @param {Object} options.keyBindingFactory
	 * @param {Object} options.lineNumberRulerFactory
	 * @param {Object} options.foldingRulerFactory
	 * @param {Object} options.statusReporter
	 * @param {Object} options.textViewFactory
	 * @param {Object} options.undoStackFactory
	 * @param {Object} options.textDNDFactory
	 */
	function Editor(options) {
		options = options || {};
		BaseEditor.call(this, options);
		this._textViewFactory = options.textViewFactory;
		this._undoStackFactory = options.undoStackFactory;
		this._textDNDFactory = options.textDNDFactory;
		this._annotationFactory = options.annotationFactory;
		this._foldingRulerFactory = options.foldingRulerFactory;
		this._lineNumberRulerFactory = options.lineNumberRulerFactory;
		this._contentAssistFactory = options.contentAssistFactory;
		this._keyBindingFactory = options.keyBindingFactory;
		
		this._annotationStyler = null;
		this._annotationModel = null;
		this._annotationRuler = null;
		this._lineNumberRuler = null;
		this._overviewRuler = null;
		this._foldingRuler = null;
		this._contentAssist = null;
	}
	Editor.prototype = new BaseEditor();
	objects.mixin(Editor.prototype, /** @lends orion.editor.Editor.prototype */ {
		/**
		 * Destroys the editor.
		 */
		destroy: function() {
			BaseEditor.prototype.destroy.call(this);
			this._textViewFactory = this._undoStackFactory = this._textDNDFactory = 
			this._annotationFactory = this._foldingRulerFactory = this._lineNumberRulerFactory = 
			this._contentAssistFactory = this._keyBindingFactory = null;
		},
		/**
		 * Returns the annotation model of the editor. 
		 *
		 * @returns {orion.editor.AnnotationModel}
		 */
		getAnnotationModel: function() {
			return this._annotationModel;
		},
		/**
		 * Returns the annotation ruler of the editor. 
		 *
		 * @returns {orion.editor.AnnotationRuler}
		 */
		getAnnotationRuler: function() {
			return this._annotationRuler;
		},
		/**
		 * Returns the annotation styler of the editor. 
		 *
		 * @returns {orion.editor.AnnotationStyler}
		 */
		getAnnotationStyler: function() {
			return this._annotationStyler;
		},
		/**
		 * Returns the content assist of the editor. 
		 *
		 * @returns {orion.editor.LineNumberRuler}
		 */
		getContentAssist: function() {
			return this._contentAssist;
		},
		/**
		 * Returns the folding ruler of the editor. 
		 *
		 * @returns {orion.editor.FoldingRuler}
		 */
		getFoldingRuler: function() {
			return this._foldingRuler;
		},
		/**
		 * Returns the line number ruler of the editor. 
		 *
		 * @returns {orion.editor.LineNumberRuler}
		 */
		getLineNumberRuler: function() {
			return this._lineNumberRuler;
		},
		/**
		 * Returns the base text model of this editor.
		 *
		 * @returns {orion.editor.TextModel}
		 */
		getModel: function() {
			if (!this._textView) {
				return null;
			}
			var model = this._textView.getModel();
			if (model.getBaseModel) {
				model = model.getBaseModel();
			}
			return model;
		},
		/**
		 * Returns the overview ruler of the editor. 
		 *
		 * @returns {orion.editor.OverviewRuler}
		 */
		getOverviewRuler: function() {
			return this._overviewRuler;
		},
		/**
		 * Returns the underlying <code>TextView</code> used by this editor. 
		 * @returns {orion.editor.TextView} the editor text view.
		 */
		getTextView: function() {
			return this._textView;
		},
		/**
		 * Returns the editor's key modes.
		 *
		 * @returns {Array} the editor key modes.
		 */
		getKeyModes: function() {
			return this._textView.getKeyModes();
		},
		/**
		 * Returns the editor source code actions.
		 *
		 * @returns {orion.editor.sourceCodeActions}
		 */
		getSourceCodeActions: function() {
			return this._sourceCodeActions;
		},
		/**
		 * Returns the editor linked mode.
		 *
		 * @returns {orion.editor.LinkedMode}
		 */
		getLinkedMode: function() {
			return this._linkedMode;
		},
		/**
		 * Returns the editor text actions.
		 *
		 * @returns {orion.editor.textActions}
		 */
		getTextActions: function() {
			return this._textActions;
		},
		/**
		 * Gives focus to the text view.
		 */
		focus: function() {
			if (this._textView) {
				this._textView.focus();
			}
		},
		/**
		 * Resizes the text view.
		 */
		resize: function() {
			if (this._textView) {
				this._textView.resize();
			}
		},
		/**
		 * Sets whether the annotation ruler is visible.
		 *
		 * @param {Boolean} visible <code>true</code> to show ruler, <code>false</code> otherwise
		 */
		setAnnotationRulerVisible: function(visible, force) {
			if (this._annotationRulerVisible === visible && !force) { return; }
			this._annotationRulerVisible = visible;
			if (!this._annotationRuler) { return; }
			var textView = this._textView;
			if (visible) {
				textView.addRuler(this._annotationRuler, 0);
			} else {
				textView.removeRuler(this._annotationRuler);
			}
		},
		/**
		 * Sets whether the folding ruler is visible.
		 *
		 * @param {Boolean} visible <code>true</code> to show ruler, <code>false</code> otherwise
		 */
		setFoldingRulerVisible: function(visible, force) {
			if (this._foldingRulerVisible === visible && !force) { return; }
			this._foldingRulerVisible = visible;
			if (!this._foldingRuler) { return; }
			var textView = this._textView;
			if (!textView.getModel().getBaseModel) { return; }
			if (visible) {
				textView.addRuler(this._foldingRuler);
			} else {
				textView.removeRuler(this._foldingRuler);
			}
		},
		/**
		 * Sets whether the line numbering ruler is visible.
		 *
		 * @param {Boolean} visible <code>true</code> to show ruler, <code>false</code> otherwise
		 */
		setLineNumberRulerVisible: function(visible, force) {
			if (this._lineNumberRulerVisible === visible && !force) { return; }
			this._lineNumberRulerVisible = visible;
			if (!this._lineNumberRuler) { return; }
			var textView = this._textView;
			if (visible) {
				textView.addRuler(this._lineNumberRuler, !this._annotationRulerVisible ? 0 : 1);
			} else {
				textView.removeRuler(this._lineNumberRuler);
			}
		},
		/**
		 * Sets whether the overview ruler is visible.
		 *
		 * @param {Boolean} visible <code>true</code> to show ruler, <code>false</code> otherwise
		 */
		setOverviewRulerVisible: function(visible, force) {
			if (this._overviewRulerVisible === visible && !force) { return; }
			this._overviewRulerVisible = visible;
			if (!this._overviewRuler) { return; }
			var textView = this._textView;
			if (visible) {
				textView.addRuler(this._overviewRuler);
			} else {
				textView.removeRuler(this._overviewRuler);
			}
		},
		
		mapOffset: function(offset, parent) {
			var textView = this._textView;
			var model = textView.getModel();
			if (model.getBaseModel) {
				offset = model.mapOffset(offset, parent);
			}
			return offset;
		},
		/**
		 * @name getLineAtOffset
		 * @description Returns the line number corresponding to the given offset in the source
		 * @function
		 * @public
		 * @memberof orion.editor.Editor
		 * @param {Number} offset The offset into the source
		 * @returns {Number} The line number corresponding to the given offset or <code>-1</code> if out of range
		 * @since 5.0
		 */
		getLineAtOffset: function(offset) {
			return this.getModel().getLineAtOffset(this.mapOffset(offset));	
		},
		/**
		 * @name getLineStart
		 * @description Compute the editor start offset of the given line number
		 * @function
		 * @public
		 * @memberof orion.editor.TextView
		 * @param {Number} line The line number in the editor
		 * @returns {Number} Returns the start offset of the given line number in the editor.
		 * @since 5.0
		 */
		getLineStart: function(line) {
			return this.getModel().getLineStart(line);
		},
		getCaretOffset: function() {
			return this.mapOffset(this._textView.getCaretOffset());
		},
		
		getSelection: function() {
			var textView = this._textView;
			var selection = textView.getSelection();
			var model = textView.getModel();
			if (model.getBaseModel) {
				selection.start = model.mapOffset(selection.start);
				selection.end = model.mapOffset(selection.end);
			}
			return selection;
		},
		
		_expandOffset: function(offset) {
			var model = this._textView.getModel();
			var annotationModel = this._annotationModel;
			if (!annotationModel || !model.getBaseModel) { return; }
			var annotations = annotationModel.getAnnotations(offset, offset + 1);
			while (annotations.hasNext()) {
				var annotation = annotations.next();
				if (annotation.type === AT.ANNOTATION_FOLDING) {
					if (annotation.expand) {
						annotation.expand();
					}
				}
			}
		},

		setCaretOffset: function(caretOffset, show, callback) {
			var textView = this._textView;
			var model = textView.getModel();
			if (model.getBaseModel) {
				this._expandOffset(caretOffset);
				caretOffset = model.mapOffset(caretOffset, true);
			}
			textView.setCaretOffset(caretOffset, show, callback);
		},
	
		setText: function(text, start, end) {
			var textView = this._textView;
			var model = textView.getModel();
			if (model.getBaseModel) {
				if (start !== undefined) {
					this._expandOffset(start);
					start = model.mapOffset(start, true);
				}
				if (end !== undefined) {
					this._expandOffset(end);
					end = model.mapOffset(end, true);
				}
			}
			textView.setText(text, start, end);
		},
		
		setSelection: function(start, end, show, callback) {
			var textView = this._textView;
			var model = textView.getModel();
			if (model.getBaseModel) {
				this._expandOffset(start);
				this._expandOffset(end);
				start = model.mapOffset(start, true);
				end = model.mapOffset(end, true);
			}
			textView.setSelection(start, end, show, callback);
		},
				
		/**
		 * @param {Number} start
		 * @param {Number} [end]
		 * @param {function} [callback] if callback is specified, scrolling to show the selection is animated and callback is called when the animation is done.
		 * @param {Boolean} [focus=true] whether the text view should be focused when the selection is done.
		 * @private
		 * @deprecated use #setSelection instead
		 */
		moveSelection: function(start, end, callback, focus) {
			end = end || start;
			var textView = this._textView;
			this.setSelection(start, end, 1 / 3, function() {
				if (focus === undefined || focus) {
					textView.focus();
				}
				if (callback) {
					callback();
				}
			});
		},
		
		/** @private */
		_getTooltipInfo: function(x, y) {
			var textView = this._textView;			
			var annotationModel = this.getAnnotationModel();
			if (!annotationModel) { return null; }
			var annotationStyler = this._annotationStyler;
			if (!annotationStyler) { return null; }
			var offset = textView.getOffsetAtLocation(x, y);
			if (offset === -1) { return null; }
			offset = this.mapOffset(offset);
			var annotations = annotationStyler.getAnnotationsByType(annotationModel, offset, offset + 1);
			var rangeAnnotations = [];
			for (var i = 0; i < annotations.length; i++) {
				if (annotations[i].rangeStyle) {
					rangeAnnotations.push(annotations[i]);
				}
			}
			if (rangeAnnotations.length === 0) { return null; }
			var pt = textView.convert({x: x, y: y}, "document", "page"); //$NON-NLS-1$ //$NON-NLS-0$
			var info = {
				contents: rangeAnnotations,
				anchor: "left", //$NON-NLS-0$
				x: pt.x + 10,
				y: pt.y + 20
			};
			return info;
		},
		
		/** @private */
		_highlightCurrentLine: function(newSelection, oldSelection) {
			var annotationModel = this._annotationModel;
			if (!annotationModel) { return; }
			var textView = this._textView;
			if (textView.getOptions("singleMode")) { return; } //$NON-NLS-0$
			var model = textView.getModel();
			var oldLineIndex = oldSelection ? model.getLineAtOffset(oldSelection.start) : -1;
			var lineIndex = model.getLineAtOffset(newSelection.start);
			var newEmpty = newSelection.start === newSelection.end;
			var oldEmpty = !oldSelection || oldSelection.start === oldSelection.end;
			var start = model.getLineStart(lineIndex);
			var end = model.getLineEnd(lineIndex);
			if (model.getBaseModel) {
				start = model.mapOffset(start);
				end = model.mapOffset(end);
			}
			var annotation = this._currentLineAnnotation; 
			if (oldLineIndex === lineIndex && oldEmpty && newEmpty && annotation && annotation.start === start && annotation.end === end) {
				return;
			}
			var remove = annotation ? [annotation] : null;
			var add;
			if (newEmpty) {
				var type = AT.ANNOTATION_CURRENT_LINE;
				annotation = AT.createAnnotation(type, start, end);
				add = [annotation];
			}
			this._currentLineAnnotation = annotation;
			annotationModel.replaceAnnotations(remove, add);
		},
		
		/**
		 * Creates the underlying TextView and installs the editor's features.
		 */
		installTextView: function() {
			this.install();
		},
		
		install : function() {
			if (this._textView) { return; }
			
			// Create textView and install optional features
			this._textView = this._textViewFactory();
			if (this._undoStackFactory) {
				this._undoStack = this._undoStackFactory.createUndoStack(this);
				this.checkDirty();
			}
			if (this._textDNDFactory) {
				this._textDND = this._textDNDFactory.createTextDND(this, this._undoStack);
			}
			if (this._contentAssistFactory) {
				var contentAssistMode = this._contentAssistFactory.createContentAssistMode(this);
				this._contentAssist = contentAssistMode.getContentAssist();
			}
			
			var editor = this, textView = this._textView;
			
			var self = this;
			this._listener = {
				onModelChanged: function(e) {
					self.checkDirty();
				},
				onMouseOver: function(e) {
					self._listener.onMouseMove(e);
				},
				onMouseMove: function(e) {
					var tooltip = mTooltip.Tooltip.getTooltip(textView);
					if (!tooltip) { return; }
					if (self._listener.lastMouseX === e.event.clientX && self._listener.lastMouseY === e.event.clientY) {
						return;
					}
					self._listener.lastMouseX = e.event.clientX;
					self._listener.lastMouseY = e.event.clientY;
					tooltip.setTarget({
						x: e.x,
						y: e.y,
						getTooltipInfo: function() {
							return self._getTooltipInfo(this.x, this.y);
						}
					});
				},
				onMouseOut: function(e) {
					var tooltip = mTooltip.Tooltip.getTooltip(textView);
					if (!tooltip) { return; }
					if (self._listener.lastMouseX === e.event.clientX && self._listener.lastMouseY === e.event.clientY) {
						return;
					}
					self._listener.lastMouseX = e.event.clientX;
					self._listener.lastMouseY = e.event.clientY;
					tooltip.setTarget(null);
				},
				onScroll: function(e) {
					var tooltip = mTooltip.Tooltip.getTooltip(textView);
					if (!tooltip) { return; }
					tooltip.setTarget(null, 0, 0);
				},
				onSelection: function(e) {
					self._updateCursorStatus();
					self._highlightCurrentLine(e.newValue, e.oldValue);
				}
			};
			textView.addEventListener("ModelChanged", this._listener.onModelChanged); //$NON-NLS-0$
			textView.addEventListener("Selection", this._listener.onSelection); //$NON-NLS-0$
			textView.addEventListener("MouseOver", this._listener.onMouseOver); //$NON-NLS-0$
			textView.addEventListener("MouseOut", this._listener.onMouseOut); //$NON-NLS-0$
			textView.addEventListener("MouseMove", this._listener.onMouseMove); //$NON-NLS-0$
			textView.addEventListener("Scroll", this._listener.onScroll); //$NON-NLS-0$
						
			// Set up keybindings
			if (this._keyBindingFactory) {
				var keyBindings;
				if (typeof this._keyBindingFactory === "function") { //$NON-NLS-0$
					keyBindings = this._keyBindingFactory(this, this.getKeyModes(), this._undoStack, this._contentAssist);
				} else {
					keyBindings = this._keyBindingFactory.createKeyBindings(editor, this._undoStack, this._contentAssist);
				}
				if (keyBindings) {
					this._textActions = keyBindings.textActions;
					this._linkedMode = keyBindings.linkedMode;
					this._sourceCodeActions = keyBindings.sourceCodeActions;
				}
			}

			var addRemoveBookmark = function(lineIndex, e) {
				if (lineIndex === undefined) { return; }
				if (lineIndex === -1) { return; }
				var view = this.getView();
				var viewModel = view.getModel();
				var annotationModel = this.getAnnotationModel();
				var lineStart = editor.mapOffset(viewModel.getLineStart(lineIndex));
				var lineEnd = editor.mapOffset(viewModel.getLineEnd(lineIndex));
				var annotations = annotationModel.getAnnotations(lineStart, lineEnd);
				var bookmark = null;
				while (annotations.hasNext()) {
					var annotation = annotations.next();
					if (annotation.type === AT.ANNOTATION_BOOKMARK) {
						bookmark = annotation;
						break;
					}
				}
				if (bookmark) {
					annotationModel.removeAnnotation(bookmark);
				} else {
					bookmark = AT.createAnnotation(AT.ANNOTATION_BOOKMARK, lineStart, lineEnd);
					bookmark.title = undefined;
					annotationModel.addAnnotation(bookmark);
				}
			};

			// Create rulers, annotation model and styler
			if (this._annotationFactory) {
				var textModel = textView.getModel();
				if (textModel.getBaseModel) { textModel = textModel.getBaseModel(); }
				this._annotationModel = this._annotationFactory.createAnnotationModel(textModel);
				if (this._annotationModel) {
					var styler = this._annotationStyler = this._annotationFactory.createAnnotationStyler(textView, this._annotationModel);
					if (styler) {
						styler.addAnnotationType(AT.ANNOTATION_CURRENT_SEARCH);
						styler.addAnnotationType(AT.ANNOTATION_MATCHING_SEARCH);
						styler.addAnnotationType(AT.ANNOTATION_ERROR);
						styler.addAnnotationType(AT.ANNOTATION_WARNING);
						styler.addAnnotationType(AT.ANNOTATION_MATCHING_BRACKET);
						styler.addAnnotationType(AT.ANNOTATION_CURRENT_BRACKET);
						styler.addAnnotationType(AT.ANNOTATION_CURRENT_LINE);
						styler.addAnnotationType(AT.ANNOTATION_READ_OCCURRENCE);
						styler.addAnnotationType(AT.ANNOTATION_WRITE_OCCURRENCE);
						styler.addAnnotationType(AT.ANNOTATION_SELECTED_LINKED_GROUP);
						styler.addAnnotationType(AT.ANNOTATION_CURRENT_LINKED_GROUP);
						styler.addAnnotationType(AT.ANNOTATION_LINKED_GROUP);
						styler.addAnnotationType(HIGHLIGHT_ERROR_ANNOTATION);
					}
				}
				
				var rulers = this._annotationFactory.createAnnotationRulers(this._annotationModel);
				var ruler = this._annotationRuler = rulers.annotationRuler;
				if (ruler) {
					ruler.onDblClick = addRemoveBookmark;
					ruler.setMultiAnnotationOverlay({html: "<div class='annotationHTML overlay'></div>"}); //$NON-NLS-0$
					ruler.addAnnotationType(AT.ANNOTATION_ERROR);
					ruler.addAnnotationType(AT.ANNOTATION_WARNING);
					ruler.addAnnotationType(AT.ANNOTATION_TASK);
					ruler.addAnnotationType(AT.ANNOTATION_BOOKMARK);
				}
				this.setAnnotationRulerVisible(this._annotationRulerVisible || this._annotationRulerVisible === undefined, true);
					
				ruler = this._overviewRuler = rulers.overviewRuler;
				if (ruler) {
					ruler.addAnnotationType(AT.ANNOTATION_CURRENT_SEARCH);
					ruler.addAnnotationType(AT.ANNOTATION_MATCHING_SEARCH);
					ruler.addAnnotationType(AT.ANNOTATION_READ_OCCURRENCE);
					ruler.addAnnotationType(AT.ANNOTATION_WRITE_OCCURRENCE);
					ruler.addAnnotationType(AT.ANNOTATION_CURRENT_BLAME);
					ruler.addAnnotationType(AT.ANNOTATION_ERROR);
					ruler.addAnnotationType(AT.ANNOTATION_WARNING);
					ruler.addAnnotationType(AT.ANNOTATION_TASK);
					ruler.addAnnotationType(AT.ANNOTATION_BOOKMARK);
					ruler.addAnnotationType(AT.ANNOTATION_MATCHING_BRACKET);
					ruler.addAnnotationType(AT.ANNOTATION_CURRENT_BRACKET);
					ruler.addAnnotationType(AT.ANNOTATION_CURRENT_LINE);
				}
				this.setOverviewRulerVisible(this._overviewRulerVisible || this._overviewRulerVisible === undefined, true);
			}
			
			if (this._lineNumberRulerFactory) {
				this._lineNumberRuler = this._lineNumberRulerFactory.createLineNumberRuler(this._annotationModel);
				this._lineNumberRuler.addAnnotationType(AT.ANNOTATION_CURRENT_BLAME);
				this._lineNumberRuler.addAnnotationType(AT.ANNOTATION_BLAME);
				this._lineNumberRuler.onDblClick = addRemoveBookmark;
				this.setLineNumberRulerVisible(this._lineNumberRulerVisible || this._lineNumberRulerVisible === undefined, true);
			}
			
			if (this._foldingRulerFactory) {
				this._foldingRuler = this._foldingRulerFactory.createFoldingRuler(this._annotationModel);
				this._foldingRuler.addAnnotationType(AT.ANNOTATION_FOLDING);
				this.setFoldingRulerVisible(this._foldingRulerVisible || this._foldingRulerVisible === undefined, true);
			}
			
			var textViewInstalledEvent = {
				type: "TextViewInstalled", //$NON-NLS-0$
				textView: textView
			};
			this.dispatchEvent(textViewInstalledEvent);
			BaseEditor.prototype.install.call(this);
		},

		/**
		 * Destroys the underlying TextView.
		 */
		uninstallTextView: function() {
			this.uninstall();
		},
		
		uninstall: function() {
			var textView = this._textView;
			if (!textView) { return; }
			
			textView.destroy();
			
			this._textView = this._undoStack = this._textDND = this._contentAssist = 
				this._listener = this._annotationModel = this._annotationStyler =
				this._annotationRuler = this._overviewRuler = this._lineNumberRuler =
				this._foldingRuler = this._currentLineAnnotation = this._title = null;
			this._dirty = false;
			this._foldingRulerVisible = this._overviewRulerVisible =
				this._lineNumberRulerVisible = this._annotationRulerVisible = undefined;
			
			var textViewUninstalledEvent = {
				type: "TextViewUninstalled", //$NON-NLS-0$
				textView: textView
			};
			this.dispatchEvent(textViewUninstalledEvent);
			BaseEditor.prototype.uninstall.call(this);
		},
		
		_updateCursorStatus: function() {
			var model = this.getModel();
			var caretOffset = this.getCaretOffset();
			var lineIndex = model.getLineAtOffset(caretOffset);
			var lineStart = model.getLineStart(lineIndex);
			var offsetInLine = caretOffset - lineStart;
			// If we are in a mode and it owns status reporting, we bail out from reporting the cursor position.
			var keyModes = this.getKeyModes();
			for (var i=0; i<keyModes.length; i++) {
				var mode = keyModes[i];
				if (mode.isActive() && mode.isStatusActive && mode.isStatusActive()) {
					return;
				}
			}
			this.reportStatus(util.formatMessage(messages.lineColumn, lineIndex + 1, offsetInLine + 1));
		},
		
		showAnnotations: function(annotations, types, createAnnotation, getType) {
			var annotationModel = this._annotationModel;
			if (!annotationModel) {
				return;
			}
			var remove = [], add = [];
			var model = annotationModel.getTextModel();
			var iter = annotationModel.getAnnotations(), annotation;
			while (iter.hasNext()) {
				annotation = iter.next();
				if (types.indexOf(annotation.type) !== -1) {
					if (annotation.creatorID === this) {
						remove.push(annotation);
					}
				}
			}
			if (annotations) { 
				for (var i = 0; i < annotations.length; i++) {
					annotation = annotations[i];
					if (!annotation) { continue; }
					if (createAnnotation) {
						annotation = createAnnotation(annotation);
					} else {
						var start, end;
						if (typeof annotation.line === "number") { //$NON-NLS-0$
							// line/column
							var lineIndex = annotation.line - 1;
							var lineStart = model.getLineStart(lineIndex);
							start = lineStart + annotation.start - 1;
							end = lineStart + annotation.end - 1;
						} else {
							// document offsets
							start = annotation.start;
							end = annotation.end;
						}
						var type = getType(annotation);
						if (!type) { continue; }
						annotation = AT.createAnnotation(type, start, end, annotation.description);
					}
					annotation.creatorID = this;
					add.push(annotation);
					
				}
			}
			annotationModel.replaceAnnotations(remove, add);
		},
		
		showProblems: function(problems) {
			this.showAnnotations(problems, [
				AT.ANNOTATION_ERROR,
				AT.ANNOTATION_WARNING,
				AT.ANNOTATION_TASK
			], null, function(annotation) {
				switch (annotation.severity) {
					case "error": return AT.ANNOTATION_ERROR; //$NON-NLS-0$
					case "warning": return AT.ANNOTATION_WARNING; //$NON-NLS-0$
					case "task": return AT.ANNOTATION_TASK; //$NON-NLS-0$
				}
				return null;
			});
		},
		
		showOccurrences: function(occurrences) {
			this.showAnnotations(occurrences, [
				AT.ANNOTATION_READ_OCCURRENCE,
				AT.ANNOTATION_WRITE_OCCURRENCE
			], null, function(annotation) {
				return annotation.readAccess ? AT.ANNOTATION_READ_OCCURRENCE : AT.ANNOTATION_WRITE_OCCURRENCE;
			});
		},
		
		showBlame : function(blameMarkers) {
			var blameRGB = this._blameRGB;
			var document = this.getTextView().getOptions("parent").ownerDocument; //$NON-NLS-0$
			if (!blameRGB) {
				var div = util.createElement(document, "div"); //$NON-NLS-0$
				div.className = "annotation blame"; //$NON-NLS-0$
				document.body.appendChild(div);
				var window = document.defaultView || document.parentWindow;
				var blameStyle = window.getComputedStyle(div);
				var color = blameStyle.getPropertyValue("background-color"); //$NON-NLS-0$
				div.parentNode.removeChild(div);
				var i1 = color.indexOf("("); //$NON-NLS-0$
				var i2 = color.indexOf(")"); //$NON-NLS-0$
				color = color.substring(i1 + 1, i2);
				this._blameRGB = blameRGB = color.split(",").slice(0,3); //$NON-NLS-0$
			}
			var createGroup = function() {
				var annotation = mAnnotations.AnnotationType.createAnnotation(this.groupType, this.start, this.end, this.title);
				annotation.style = objects.mixin({}, annotation.style);
				annotation.style.style = objects.mixin({}, annotation.style.style);
				annotation.style.style.backgroundColor = "";
				this.groupAnnotation = annotation;
				annotation.blame = this.blame;
				annotation.html = this.html;
				annotation.creatorID = this.creatorID;
				return annotation;
			};
			var title = function() {
				var div = util.createElement(document, "div"); //$NON-NLS-0$
				div.className = "tooltipTitle"; //$NON-NLS-0$
				var index = this.blame.Message.indexOf("\n"); //$NON-NLS-0$
				if (index === -1) { index = this.blame.Message.length; }
				var commitLink = util.createElement(document, "a"); //$NON-NLS-0$
				commitLink.href = this.blame.CommitLink;
				commitLink.appendChild(document.createTextNode(this.blame.Message.substring(0, index)));
				div.appendChild(commitLink);
				div.appendChild(util.createElement(document, "br")); //$NON-NLS-0$
				div.appendChild(document.createTextNode(util.formatMessage(messages.committerOnTime, this.blame.AuthorName, this.blame.Time)));
				return div;
			};
			var model = this.getModel();
			this.showAnnotations(blameMarkers, [
				AT.ANNOTATION_BLAME,
				AT.ANNOTATION_CURRENT_BLAME
			], function (blameMarker) {
				var start = model.getLineStart(blameMarker.Start - 1);
				var end = model.getLineEnd(blameMarker.End - 1, true);
				var annotation = mAnnotations.AnnotationType.createAnnotation(AT.ANNOTATION_BLAME, start, end, title);
				var blameColor = blameRGB.slice(0);
				blameColor.push(blameMarker.Shade);
				annotation.style = objects.mixin({}, annotation.style);
				annotation.style.style = objects.mixin({}, annotation.style.style);
				annotation.style.style.backgroundColor = "rgba(" + blameColor.join() + ")"; //$NON-NLS-0$ //$NON-NLS-1$
				annotation.groupId = blameMarker.Name;
				annotation.groupType = AT.ANNOTATION_CURRENT_BLAME;
				annotation.createGroupAnnotation = createGroup;
				annotation.html = '<img class="annotationHTML blame" src="' + blameMarker.AuthorImage + '"/>'; //$NON-NLS-0$ //$NON-NLS-1$
				annotation.blame = blameMarker;
				return annotation;
			});
		},
		
		/**
		 * Reveals and selects a portion of text.
		 * @param {Number} start
		 * @param {Number} end
		 * @param {Number} line
		 * @param {Number} offset
		 * @param {Number} length
		 */
		showSelection: function(start, end, line, offset, length) {
			// We use typeof because we need to distinguish the number 0 from an undefined or null parameter
			if (typeof(start) === "number") { //$NON-NLS-0$
				if (typeof(end) !== "number") { //$NON-NLS-0$
					end = start;
				}
				this.moveSelection(start, end);
			} else if (typeof(line) === "number") { //$NON-NLS-0$
				var model = this.getModel();
				var pos = model.getLineStart(line-1);
				if (typeof(offset) === "number") { //$NON-NLS-0$
					pos = pos + offset;
				}
				if (typeof(length) !== "number") { //$NON-NLS-0$
					length = 0;
				}
				this.moveSelection(pos, pos+length);
			}
		},
		
		/**
		 * @private
		 */
		_setModelText: function(contents) {
			if (this._textView) {
				this._textView.setText(contents);
				this._textView.getModel().setLineDelimiter("auto"); //$NON-NLS-0$
				this._highlightCurrentLine(this._textView.getSelection());
			}
		},
		
		/**
		 * Sets the editor's contents.
		 *
		 * @param {String} title
		 * @param {String} message
		 * @param {String} contents
		 * @param {Boolean} contentsSaved
		 * @param {Boolean} noFocus
		 */
		setInput: function(title, message, contents, contentsSaved, noFocus) {
			BaseEditor.prototype.setInput.call(this, title, message, contents, contentsSaved);
			if (this._textView && !contentsSaved && !noFocus) {
				this._textView.focus();
			}
		},
		/**
		 * Reveals a line in the editor, and optionally selects a portion of the line.
		 * @param {Number} line - document base line index
		 * @param {Number|String} column
		 * @param {Number} [end]
		 */
		onGotoLine: function(line, column, end, callback) {
			if (this._textView) {
				var model = this.getModel();
				line = Math.max(0, Math.min(line, model.getLineCount() - 1));
				var lineStart = model.getLineStart(line);
				var start = 0;
				if (end === undefined) {
					end = 0;
				}
				if (typeof column === "string") { //$NON-NLS-0$
					var index = model.getLine(line).indexOf(column);
					if (index !== -1) {
						start = index;
						end = start + column.length;
					}
				} else {
					start = column;
					var lineLength = model.getLineEnd(line) - lineStart;
					start = Math.min(start, lineLength);
					end = Math.min(end, lineLength);
				}
				this.moveSelection(lineStart + start, lineStart + end, callback);
			}
		}
	});

	return {
		BaseEditor: BaseEditor,
		Editor: Editor
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define prompt window*/

define("orion/editor/find", [ //$NON-NLS-0$
	'i18n!orion/editor/nls/messages', //$NON-NLS-0$
	'orion/keyBinding', //$NON-NLS-0$
	'orion/editor/keyModes', //$NON-NLS-0$
	'orion/editor/annotations', //$NON-NLS-0$
	'orion/regex', //$NON-NLS-0$
	'orion/objects', //$NON-NLS-0$
	'orion/util' //$NON-NLS-0$
], function(messages, mKeyBinding, mKeyModes, mAnnotations, mRegex, objects, util) {

	var exports = {};
	
	function IncrementalFind(editor) {
		var textView = editor.getTextView();
		mKeyModes.KeyMode.call(this, textView);
		this.editor = editor;
		this._active = false;
		this._success = true;
		this._ignoreSelection = false;
		this._prefix = "";
		
		textView.setAction("incrementalFindCancel", function() { //$NON-NLS-0$
			this.setActive(false);
			return true;
		}.bind(this));
		textView.setAction("incrementalFindBackspace", function() { //$NON-NLS-0$
			return this._backspace();
		}.bind(this));
		
		var self = this;
		this._listener = {
			onVerify: function(e){
				var editor = self.editor;
				var model = editor.getModel();
				var start = editor.mapOffset(e.start), end = editor.mapOffset(e.end);
				var txt = model.getText(start, end);
				var prefix = self._prefix;
				// TODO: mRegex is pulled in just for this one call so we can get case-insensitive search
				// is it really necessary
				var match = prefix.match(new RegExp("^" + mRegex.escape(txt), "i")); //$NON-NLS-1$ //$NON-NLS-0$
				if (match && match.length > 0) {
					prefix = self._prefix += e.text;
					self._success = true;
					self._status();
					self.find(self._forward, true);
					e.text = null;
				}
			},
			onSelection: function() {
				if (!self._ignoreSelection) {
					self.setActive(false);
				}
			}
		};
	}
	IncrementalFind.prototype = new mKeyModes.KeyMode();
	objects.mixin(IncrementalFind.prototype, {
		createKeyBindings: function() {
			var KeyBinding = mKeyBinding.KeyBinding;
			var bindings = [];
			bindings.push({actionID: "incrementalFindBackspace", keyBinding: new KeyBinding(8)}); //$NON-NLS-0$
			bindings.push({actionID: "incrementalFindCancel", keyBinding: new KeyBinding(13)}); //$NON-NLS-0$
			bindings.push({actionID: "incrementalFindCancel", keyBinding: new KeyBinding(27)}); //$NON-NLS-0$
			bindings.push({actionID: "incrementalFindReverse", keyBinding: new KeyBinding(38)}); //$NON-NLS-0$
			bindings.push({actionID: "incrementalFind", keyBinding: new KeyBinding(40)}); //$NON-NLS-0$
			bindings.push({actionID: "incrementalFindReverse", keyBinding: new KeyBinding('k', true, true)}); //$NON-NLS-1$ //$NON-NLS-0$
			bindings.push({actionID: "incrementalFind", keyBinding: new KeyBinding('k', true)}); //$NON-NLS-1$ //$NON-NLS-0$
			return bindings;
		},
		find: function(forward, incremental) {
			this._forward = forward;
			if (!this.isActive()) {
				this.setActive(true);
				return false;
			}
			var prefix = this._prefix;
			if (prefix.length === 0) {
				return false;
			}
			var editor = this.editor;
			var model = editor.getModel();
			var start;
			if (forward) {
				if (this._success) {
					start = incremental ? this._start : editor.getCaretOffset() + 1;
				} else {
					start = 0;
				}
			} else {
				if (this._success) {
					start = incremental ? this._start : editor.getCaretOffset();
				} else {
					start = model.getCharCount() - 1;
				}
			}
			var result = editor.getModel().find({
				string: prefix,
				start: start,
				reverse: !forward,
				caseInsensitive: prefix.toLowerCase() === prefix}).next();
			if (result) {
				if (!incremental) {
					this._start = start;
				}
				this._success = true;
				this._ignoreSelection = true;
				editor.moveSelection(forward ? result.start : result.end, forward ? result.end : result.start);
				this._ignoreSelection = false;
			} else {
				this._success = false;
			}
			this._status();
			return true;
		},
		isActive: function() {
			return this._active;
		},
		isStatusActive: function() {
			return this.isActive();
		},
		setActive: function(active) {
			if (this._active === active) {
				return;
			}
			this._active = active;
			this._prefix = "";
			this._success = true;
			var editor = this.editor;
			var textView = editor.getTextView();
			this._start = this.editor.getCaretOffset();
			this.editor.setCaretOffset(this._start);
			if (this._active) {
				textView.addEventListener("Verify", this._listener.onVerify); //$NON-NLS-0$
				textView.addEventListener("Selection", this._listener.onSelection); //$NON-NLS-0$
				textView.addKeyMode(this);
			} else {
				textView.removeEventListener("Verify", this._listener.onVerify); //$NON-NLS-0$
				textView.removeEventListener("Selection", this._listener.onSelection); //$NON-NLS-0$
				textView.removeKeyMode(this);
			}
			this._status();
		},
		_backspace: function() {
			var prefix = this._prefix;
			prefix = this._prefix = prefix.substring(0, prefix.length-1);
			if (prefix.length === 0) {
				this._success = true;
				this._ignoreSelection = true;
				this.editor.setCaretOffset(this.editor.getSelection().start);
				this._ignoreSelection = false;
				this._status();
				return true;
			}
			return this.find(this._forward, true);
		},
		_status: function() {
			if (!this.isActive()) {
				this.editor.reportStatus("");
				return;
			}
			var msg;
			if (this._forward) {
				msg = this._success ? messages.incrementalFindStr : messages.incrementalFindStrNotFound;
			} else {
				msg = this._success ? messages.incrementalFindReverseStr : messages.incrementalFindReverseStrNotFound;
			}
			msg = util.formatMessage(msg, this._prefix);
			this.editor.reportStatus(msg, this._success ? "" : "error"); //$NON-NLS-0$
		}
	});
	exports.IncrementalFind = IncrementalFind;
	
	
	function Find(editor, undoStack, options) {
		if (!editor) { return; }	
		this._editor = editor;
		this._undoStack = undoStack;
		this._showAll = true;
		this._visible = false;
		this._caseInsensitive = true;
		this._wrap = true;
		this._wholeWord = false;
		this._incremental = true;
		this._regex = false;
		this._findAfterReplace = true;
		this._hideAfterFind = false;
		this._reverse = false;
		this._start = undefined;
		this._end = undefined;
		this._timer = undefined;
		this._lastString = "";
		var that = this;
		this._listeners = {
			onEditorFocus: function(e) {
				that._removeCurrentAnnotation(e);
			}
		};
		this.setOptions(options);
	}
	Find.prototype = {
		find: function (forward, tempOptions, incremental) {
			this.setOptions({
				reverse : !forward
			});
			var string = this.getFindString();
			var count;
			if (tempOptions) {
				string = tempOptions.findString || string;
				count =  tempOptions.count;
			}
			var savedOptions = this.getOptions();
			this.setOptions(tempOptions);
			var startOffset = incremental ? this._startOffset : this.getStartOffset();
			var result = this._doFind(string, startOffset, count);
			if (result) {
				if (!incremental) {
					this._startOffset = result.start;
				}
			}
			this.setOptions(savedOptions);
			if (this._hideAfterFind) {
				this.hide();
			}
			return result;
		},
		getStartOffset: function() {
			if (this._start !== undefined) {
				return this._start;
			}
			if (this._reverse) {
				return this._editor.getSelection().start - 1;
			}
			return this._editor.getCaretOffset();
		},
		getFindString: function() {
			var selection = this._editor.getSelection();
			var searchString = this._editor.getText(selection.start, selection.end);
			if (this._regex) {
				searchString = mRegex.escape(searchString);
			}
			return searchString || this._lastString;
		},
		getOptions: function() {
			return {
				showAll: this._showAll, 
				caseInsensitive: this._caseInsensitive, 
				wrap: this._wrap, 
				wholeWord: this._wholeWord, 
				incremental: this._incremental,
				regex: this._regex,
				findAfterReplace: this._findAfterReplace,
				hideAfterFind: this._hideAfterFind,
				reverse: this._reverse,
				findCallback: this._findCallback,
				start: this._start,
				end: this._end
			};
		},
		getReplaceString: function() {
			return "";
		},
		hide: function() {
			this._visible = false;
			if (this._savedOptions) {
				this.setOptions(this._savedOptions.pop());
				if (this._savedOptions.length === 0) {
					this._savedOptions = null;
				}
			}
			this._removeAllAnnotations();
			var textView = this._editor.getTextView();
			if (textView) {
				textView.removeEventListener("Focus", this._listeners.onEditorFocus); //$NON-NLS-0$
				textView.focus();
			}
		},
		_processReplaceString: function(str) {
			var newStr = str;
			if (this._regex) {
				newStr = "";
				var escape = false;
				var delimiter = this._editor.getModel().getLineDelimiter();
				for (var i=0; i<str.length; i++) {
					var c = str.substring(i, i + 1);
					if (escape) {
						switch (c) {
							case "R": newStr += delimiter; break;
							case "r": newStr += "\r"; break;
							case "n": newStr += "\n"; break;
							case "t": newStr += "\t"; break;
							case "\\": newStr += "\\"; break;
							default: newStr += "\\" + c;
						}
						escape = false;
					} else if (c === "\\") {
						escape = true;
					} else {
						newStr += c;
					}
				}
				if (escape) {
					newStr += "\\";
				}
			}
			return newStr;
		},
		isVisible: function() {
			return this._visible;
		},
		replace: function() {
			var string = this.getFindString();
			if (string) {
				var editor = this._editor;
				var replaceString = this._processReplaceString(this.getReplaceString());
				var selection = editor.getSelection();
				var start = selection.start;
				var result = editor.getModel().find({
					string: string,
					start: start,
					reverse: false,
					wrap: this._wrap,
					regex: this._regex,
					wholeWord: this._wholeWord,
					caseInsensitive: this._caseInsensitive
				}).next();
				if (result) {
					this.startUndo();
					this._doReplace(result.start, result.end, string, replaceString);
					this.endUndo();
				}
			}
			if (this._findAfterReplace && string){
				this._doFind(string, this.getStartOffset());
			}
		},
		replaceAll : function() {
			var string = this.getFindString();
			if (string) {
				this._replacingAll = true;
				var editor = this._editor;
				var textView = editor.getTextView();
				editor.reportStatus(messages.replaceAll);
				var replaceString = this._processReplaceString(this.getReplaceString());
				var self = this;
				window.setTimeout(function() {
					var startPos = 0;
					var count = 0, lastResult;
					while (true) {
						//For replace all, we need to ignore the wrap search from the user option
						//Otherwise the loop will be dead, see https://bugs.eclipse.org/bugs/show_bug.cgi?id=411813
						var result = self._doFind(string, startPos, null, true);
						if (!result) {
							break;
						}
						lastResult = result;
						count++;
						if (count === 1) {
							textView.setRedraw(false);
							self.startUndo();
						}
						self._doReplace(result.start, result.end, string, replaceString);
						startPos = self.getStartOffset();
					}
					if (count > 0) {
						self.endUndo();
						textView.setRedraw(true);
					}
					if (startPos > 0) {
						editor.reportStatus(util.formatMessage(messages.replacedMatches, count));
					} else {
						editor.reportStatus(messages.nothingReplaced, "error"); //$NON-NLS-0$ 
					}
					self._replacingAll = false;
				}, 100);				
			}
		},
		/**
		 * @property {String} string the search string to be found.
		 * @property {Boolean} [regex=false] whether or not the search string is a regular expression.
		 * @property {Boolean} [wrap=false] whether or not to wrap search.
		 * @property {Boolean} [wholeWord=false] whether or not to search only whole words.
		 * @property {Boolean} [caseInsensitive=false] whether or not search is case insensitive.
		 * @property {Boolean} [reverse=false] whether or not to search backwards.
		 * @property {Number} [start=0] The start offset to start searching
		 * @property {Number} [end=charCount] The end offset of the search. Used to search in a given range.	
		 */
		setOptions : function(options) {
			if (options) {
				if ((options.showAll === true || options.showAll === false) && this._showAll !== options.showAll) {
					this._showAll = options.showAll;
					if (this.isVisible()) {
						if (this._showAll) {
							this._markAllOccurrences();
						} else {
							var annotationModel = this._editor.getAnnotationModel();
							if (annotationModel) {
								annotationModel.removeAnnotations(mAnnotations.AnnotationType.ANNOTATION_MATCHING_SEARCH);
							}
						}
					}
				}
				if (options.caseInsensitive === true || options.caseInsensitive === false) {
					this._caseInsensitive = options.caseInsensitive;
				}
				if (options.wrap === true || options.wrap === false) {
					this._wrap = options.wrap;
				}
				if (options.wholeWord === true || options.wholeWord === false) {
					this._wholeWord = options.wholeWord;
				}
				if (options.incremental === true || options.incremental === false) {
					this._incremental = options.incremental;
				}
				if (options.regex === true || options.regex === false) {
					this._regex = options.regex;
				}
				if (options.findAfterReplace === true || options.findAfterReplace === false) {
					this._findAfterReplace = options.findAfterReplace;
				}
				if (options.hideAfterFind === true || options.hideAfterFind === false) {
					this._hideAfterFind = options.hideAfterFind;
				}
				if (options.reverse === true || options.reverse === false) {
					this._reverse = options.reverse;
				}
				if (options.hasOwnProperty("findCallback")) { //$NON-NLS-0$
					this._findCallback = options.findCallback;
				}
				if (options.hasOwnProperty("start")) { //$NON-NLS-0$	
					this._start = options.start;
				}
				if (options.hasOwnProperty("end")) { //$NON-NLS-0$
					this._end = options.end;
				}
			}
		},
		show: function(tempOptions) {
			this._visible = true;
			if (tempOptions) {
				if (!this._savedOptions) {
					this._savedOptions = [];
				}	
				this._savedOptions.push(this.getOptions());
				this.setOptions(tempOptions);
			}
			this._startOffset = this._editor.getSelection().start;
			this._editor.getTextView().addEventListener("Focus", this._listeners.onEditorFocus); //$NON-NLS-0$
			var self = this;
			window.setTimeout(function() {
				if (self._incremental) {
					self.find(true, null, true);
				}
			}, 0);
		},
		startUndo: function() {
			if (this._undoStack) {
				this._undoStack.startCompoundChange();
			}
		}, 
		endUndo: function() {
			if (this._undoStack) {
				this._undoStack.endCompoundChange();
			}
		},
		_find: function(string, startOffset, noWrap) {
			return this._editor.getModel().find({
				string: string,
				start: startOffset,
				end: this._end,
				reverse: this._reverse,
				wrap: (noWrap ? false: this._wrap),
				regex: this._regex,
				wholeWord: this._wholeWord,
				caseInsensitive: this._caseInsensitive
			});
		},
		_doFind: function(string, startOffset, count, noWrap) {
			count = count || 1;
			var editor = this._editor;
			if (!string) {
				this._removeAllAnnotations();
				return null;
			}
			this._lastString = string;
			var result, iterator;
			if (this._regex) {
				try {
					iterator = this._find(string, startOffset, noWrap);
				} catch (ex) {
					editor.reportStatus(ex.message, "error"); //$NON-NLS-0$
					return;
				}
			} else {
				iterator = this._find(string, startOffset, noWrap);
			}
			for (var i=0; i<count && iterator.hasNext(); i++) {
				result = iterator.next();
			}
			if (!this._replacingAll) {
				if (result) {
					this._editor.reportStatus("");
				} else {
					this._editor.reportStatus(messages.notFound, "error"); //$NON-NLS-0$
				}
				if (this.isVisible()) {
					var type = mAnnotations.AnnotationType.ANNOTATION_CURRENT_SEARCH;
					var annotationModel = editor.getAnnotationModel();
					if (annotationModel) {
						annotationModel.removeAnnotations(type);
						if (result) {
							annotationModel.addAnnotation(mAnnotations.AnnotationType.createAnnotation(type, result.start, result.end));
						}
					}
					if (this._showAll) {
						if (this._timer) {
							window.clearTimeout(this._timer);
						}
						var that = this;
						this._timer = window.setTimeout(function(){
							that._markAllOccurrences();
							that._timer = null;
						}, 500);
					}
				}
				if (this._findCallback) {
					this._findCallback(result);
				}
				else if (result) {
					editor.moveSelection(result.start, result.end, null, false);
				}
			}
			return result;
		},
		_doReplace: function(start, end, searchStr, newStr) {
			var editor = this._editor;
			if (this._regex) {
				newStr = editor.getText(start, end).replace(new RegExp(searchStr, this._caseInsensitive ? "i" : ""), newStr); //$NON-NLS-0$
				if (!newStr) {
					return;
				}
			}
			editor.setText(newStr, start, end);
			editor.setSelection(start, start + newStr.length, true);
		},
		_markAllOccurrences: function() {
			var annotationModel = this._editor.getAnnotationModel();
			if (!annotationModel) {
				return;
			}
			var type = mAnnotations.AnnotationType.ANNOTATION_MATCHING_SEARCH;
			var iter = annotationModel.getAnnotations();
			var remove = [], add;
			while (iter.hasNext()) {
				var annotation = iter.next();
				if (annotation.type === type) {
					remove.push(annotation);
				}
			}
			if (this.isVisible()) {
				var string = this.getFindString();
				iter = this._editor.getModel().find({
					string: string,
					regex: this._regex,
					wholeWord: this._wholeWord,
					caseInsensitive: this._caseInsensitive
				});
				add = [];
				while (iter.hasNext()) {
					var range = iter.next();
					add.push(mAnnotations.AnnotationType.createAnnotation(type, range.start, range.end));
				}
			}
			annotationModel.replaceAnnotations(remove, add);
		},
		_removeAllAnnotations: function() {
			var annotationModel = this._editor.getAnnotationModel();
			if (annotationModel) {
				annotationModel.removeAnnotations(mAnnotations.AnnotationType.ANNOTATION_CURRENT_SEARCH);
				annotationModel.removeAnnotations(mAnnotations.AnnotationType.ANNOTATION_MATCHING_SEARCH);
			}
		},
		_removeCurrentAnnotation: function(evt){
			var annotationModel = this._editor.getAnnotationModel();
			if (annotationModel) {
				annotationModel.removeAnnotations(mAnnotations.AnnotationType.ANNOTATION_CURRENT_SEARCH);
			}
		}
	};
	exports.Find = Find;
	
	return exports;
});

/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define prompt */

define("orion/editor/actions", [ //$NON-NLS-0$
	'i18n!orion/editor/nls/messages', //$NON-NLS-0$
	'orion/keyBinding', //$NON-NLS-0$
	'orion/editor/annotations', //$NON-NLS-0$
	'orion/editor/tooltip', //$NON-NLS-0$
	'orion/editor/find', //$NON-NLS-0$
	'orion/util' //$NON-NLS-0$
], function(messages, mKeyBinding, mAnnotations, mTooltip, mFind, util) {

	var AT = mAnnotations.AnnotationType;

	var exports = {};

	/**
	 * TextActions connects common text editing keybindings onto an editor.
	 */
	function TextActions(editor, undoStack, find) {
		this.editor = editor;
		this.undoStack = undoStack;
		this._incrementalFind = new mFind.IncrementalFind(editor);
		this._find = find ? find : new mFind.Find(editor, undoStack);
		this._lastEditLocation = null;
		this.init();
	}

	TextActions.prototype = {
		init: function() {
			var textView = this.editor.getTextView();

			this._lastEditListener = {
				onModelChanged: function(e) {
					if (this.editor.isDirty()) {
						this._lastEditLocation = e.start + e.addedCharCount;
					}
				}.bind(this)
			};
			textView.addEventListener("ModelChanged", this._lastEditListener.onModelChanged); //$NON-NLS-0$

			textView.setAction("undo", function(data) { //$NON-NLS-0$
				if (this.undoStack) {
					var count = 1;
					if (data && data.count) {
						count = data.count;
					}
					while (count > 0) {
						this.undoStack.undo();
						--count;
					}
					return true;
				}
				return false;
			}.bind(this), {name: messages.undo});

			textView.setAction("redo", function(data) { //$NON-NLS-0$
				if (this.undoStack) {
					var count = 1;
					if (data && data.count) {
						count = data.count;
					}
					while (count > 0) {
						this.undoStack.redo();
						--count;
					}
					return true;
				}
				return false;
			}.bind(this), {name: messages.redo});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("f", true), "find"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("find", function() { //$NON-NLS-0$
				if (this._find) {
					var selection = this.editor.getSelection();
					var search = prompt(messages.find, this.editor.getText(selection.start, selection.end));
					if (search) {
						this._find.find(true, {findString:search});
					}
				}
			}.bind(this), {name: messages.find});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("k", true), "findNext"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("findNext", function(options) { //$NON-NLS-0$
				if (this._find){
					this._find.find(true, options);
					return true;
				}
				return false;
			}.bind(this), {name: messages.findNext});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("k", true, true), "findPrevious"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("findPrevious", function(options) { //$NON-NLS-0$
				if (this._find){
					this._find.find(false, options);
					return true;
				}
				return false;
			}.bind(this), {name: messages.findPrevious});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("j", true), "incrementalFind"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("incrementalFind", function() { //$NON-NLS-0$
				if (this._incrementalFind) {
					this._incrementalFind.find(true);
				}
				return true;
			}.bind(this), {name: messages.incrementalFind});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("j", true, true), "incrementalFindReverse"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("incrementalFindReverse", function() { //$NON-NLS-0$
				if (this._incrementalFind) {
					this._incrementalFind.find(false);
				}
				return true;
			}.bind(this), {name: messages.incrementalFindReverse});

			textView.setAction("tab", function() { //$NON-NLS-0$
				return this.indentLines();
			}.bind(this));

			textView.setAction("shiftTab", function() { //$NON-NLS-0$
				return this.unindentLines();
			}.bind(this), {name: messages.unindentLines});

			textView.setKeyBinding(new mKeyBinding.KeyBinding(38, false, false, true), "moveLinesUp"); //$NON-NLS-0$
			textView.setAction("moveLinesUp", function() { //$NON-NLS-0$
				return this.moveLinesUp();
			}.bind(this), {name: messages.moveLinesUp});

			textView.setKeyBinding(new mKeyBinding.KeyBinding(40, false, false, true), "moveLinesDown"); //$NON-NLS-0$
			textView.setAction("moveLinesDown", function() { //$NON-NLS-0$
				return this.moveLinesDown();
			}.bind(this), {name: messages.moveLinesDown});

			textView.setKeyBinding(new mKeyBinding.KeyBinding(38, true, false, true), "copyLinesUp"); //$NON-NLS-0$
			textView.setAction("copyLinesUp", function() { //$NON-NLS-0$
				return this.copyLinesUp();
			}.bind(this), {name: messages.copyLinesUp});

			textView.setKeyBinding(new mKeyBinding.KeyBinding(40, true, false, true), "copyLinesDown"); //$NON-NLS-0$
			textView.setAction("copyLinesDown", function() { //$NON-NLS-0$
				return this.copyLinesDown();
			}.bind(this), {name: messages.copyLinesDown});

			textView.setKeyBinding(new mKeyBinding.KeyBinding('d', true, false, false), "deleteLines"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("deleteLines", function(data) { //$NON-NLS-0$
				return this.deleteLines(data);
			}.bind(this), {name: messages.deleteLines});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("l", !util.isMac, false, false, util.isMac), "gotoLine"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("gotoLine", function() { //$NON-NLS-0$
				return this.gotoLine();
			}.bind(this), {name: messages.gotoLine});

			textView.setKeyBinding(new mKeyBinding.KeyBinding(190, true), "nextAnnotation"); //$NON-NLS-0$
			textView.setAction("nextAnnotation", function() { //$NON-NLS-0$
				return this.nextAnnotation(true);
			}.bind(this), {name: messages.nextAnnotation});

			textView.setKeyBinding(new mKeyBinding.KeyBinding(188, true), "previousAnnotation"); //$NON-NLS-0$
			textView.setAction("previousAnnotation", function() { //$NON-NLS-0$
				return this.nextAnnotation(false);
			}.bind(this), {name: messages.prevAnnotation});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("e", true, false, true, false), "expand"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("expand", function() { //$NON-NLS-0$
				return this.expandAnnotation(true);
			}.bind(this), {name: messages.expand});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("c", true, false, true, false), "collapse"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("collapse", function() { //$NON-NLS-0$
				return this.expandAnnotation(false);
			}.bind(this), {name: messages.collapse});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("e", true, true, true, false), "expandAll"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("expandAll", function() { //$NON-NLS-0$
				return this.expandAnnotations(true);
			}.bind(this), {name: messages.expandAll});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("c", true, true, true, false), "collapseAll"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("collapseAll", function() { //$NON-NLS-0$
				return this.expandAnnotations(false);
			}.bind(this), {name: messages.collapseAll});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("q", !util.isMac, false, false, util.isMac), "lastEdit"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("lastEdit", function() { //$NON-NLS-0$
				return this.gotoLastEdit();
			}.bind(this), {name: messages.lastEdit});
		},
		copyLinesDown: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var model = editor.getModel();
			var selection = editor.getSelection();
			var firstLine = model.getLineAtOffset(selection.start);
			var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
			var lineStart = model.getLineStart(firstLine);
			var lineEnd = model.getLineEnd(lastLine, true);
			var lineCount = model.getLineCount();
			var delimiter = "";
			var text = model.getText(lineStart, lineEnd);
			if (lastLine === lineCount-1) {
				text = (delimiter = model.getLineDelimiter()) + text;
			}
			var insertOffset = lineEnd;
			editor.setText(text, insertOffset, insertOffset);
			editor.setSelection(insertOffset + delimiter.length, insertOffset + text.length);
			return true;
		},
		copyLinesUp: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var model = editor.getModel();
			var selection = editor.getSelection();
			var firstLine = model.getLineAtOffset(selection.start);
			var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
			var lineStart = model.getLineStart(firstLine);
			var lineEnd = model.getLineEnd(lastLine, true);
			var lineCount = model.getLineCount();
			var delimiter = "";
			var text = model.getText(lineStart, lineEnd);
			if (lastLine === lineCount-1) {
				text += (delimiter = model.getLineDelimiter());
			}
			var insertOffset = lineStart;
			editor.setText(text, insertOffset, insertOffset);
			editor.setSelection(insertOffset, insertOffset + text.length - delimiter.length);
			return true;
		},
		deleteLines: function(data) {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var count = 1;
			if (data && data.count) {
				count = data.count;
			}
			var selection = editor.getSelection();
			var model = editor.getModel();
			var firstLine = model.getLineAtOffset(selection.start);
			var lineStart = model.getLineStart(firstLine);
			var lastLine;
			if (selection.start !== selection.end || count === 1) {
				lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
			} else {
				lastLine = Math.min(firstLine + count - 1, model.getLineCount() - 1);
			}
			var lineEnd = model.getLineEnd(lastLine, true);
			editor.setText("", lineStart, lineEnd);
			return true;
		},
		expandAnnotation: function(expand) {
			var editor = this.editor;
			var annotationModel = editor.getAnnotationModel();
			if(!annotationModel) { return true; }
			var model = editor.getModel();
			var currentOffset = editor.getCaretOffset();
			var lineIndex = model.getLineAtOffset(currentOffset);
			var start = model.getLineStart(lineIndex);
			var end = model.getLineEnd(lineIndex, true);
			if (model.getBaseModel) {
				start = model.mapOffset(start);
				end = model.mapOffset(end);
				model = model.getBaseModel();
			}
			var annotation, iter = annotationModel.getAnnotations(start, end);
			while (!annotation && iter.hasNext()) {
				var a = iter.next();
				if (a.type !== mAnnotations.AnnotationType.ANNOTATION_FOLDING) { continue; }
				annotation = a;
			}
			if (annotation) {
				if (expand !== annotation.expanded) {
					if (expand) {
						annotation.expand();
					} else {
						editor.setCaretOffset(annotation.start);
						annotation.collapse();
					}
				}
			}
			return true;
		},
		expandAnnotations: function(expand) {
			var editor = this.editor;
			var textView = editor.getTextView();
			var annotationModel = editor.getAnnotationModel();
			if(!annotationModel) { return true; }
			var model = editor.getModel();
			var annotation, iter = annotationModel.getAnnotations();
			textView.setRedraw(false);
			while (iter.hasNext()) {
				annotation = iter.next();
				if (annotation.type !== mAnnotations.AnnotationType.ANNOTATION_FOLDING) { continue; }
				if (expand !== annotation.expanded) {
					if (expand) {
						annotation.expand();
					} else {
						annotation.collapse();
					}
				}
			}
			textView.setRedraw(true);
			return true;
		},
		indentLines: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			if(!textView.getOptions("tabMode")) { return; } //$NON-NLS-0$
			var model = editor.getModel();
			var selection = editor.getSelection();
			var firstLine = model.getLineAtOffset(selection.start);
			var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
			if (firstLine !== lastLine) {
				var lines = [];
				lines.push("");
				for (var i = firstLine; i <= lastLine; i++) {
					lines.push(model.getLine(i, true));
				}
				var lineStart = model.getLineStart(firstLine);
				var lineEnd = model.getLineEnd(lastLine, true);
				var options = textView.getOptions("tabSize", "expandTab"); //$NON-NLS-1$ //$NON-NLS-0$
				var text = options.expandTab ? new Array(options.tabSize + 1).join(" ") : "\t"; //$NON-NLS-1$ //$NON-NLS-0$
				editor.setText(lines.join(text), lineStart, lineEnd);
				editor.setSelection(lineStart === selection.start ? selection.start : selection.start + text.length, selection.end + ((lastLine - firstLine + 1) * text.length));
				return true;
			}
			return false;
		},
		gotoLastEdit: function() {
			if (typeof this._lastEditLocation === "number")  { //$NON-NLS-0$
				this.editor.showSelection(this._lastEditLocation);
			}
			return true;
		},
		gotoLine: function() {
			var editor = this.editor;
			var model = editor.getModel();
			var line = model.getLineAtOffset(editor.getCaretOffset());
			line = prompt(messages.gotoLinePrompty, line + 1);
			if (line) {
				line = parseInt(line, 10);
				editor.onGotoLine(line - 1, 0);
			}
			return true;
		},
		moveLinesDown: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var model = editor.getModel();
			var selection = editor.getSelection();
			var firstLine = model.getLineAtOffset(selection.start);
			var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
			var lineCount = model.getLineCount();
			if (lastLine === lineCount-1) {
				return true;
			}
			var lineStart = model.getLineStart(firstLine);
			var lineEnd = model.getLineEnd(lastLine, true);
			var insertOffset = model.getLineEnd(lastLine+1, true) - (lineEnd - lineStart);
			var text, delimiterLength = 0;
			if (lastLine !== lineCount-2) {
				text = model.getText(lineStart, lineEnd);
			} else {
				// Move delimiter following selection to front of the text
				var lineEndNoDelimiter = model.getLineEnd(lastLine);
				text = model.getText(lineEndNoDelimiter, lineEnd) + model.getText(lineStart, lineEndNoDelimiter);
				delimiterLength += lineEnd - lineEndNoDelimiter;
			}
			this.startUndo();
			editor.setText("", lineStart, lineEnd);
			editor.setText(text, insertOffset, insertOffset);
			editor.setSelection(insertOffset + delimiterLength, insertOffset + delimiterLength + text.length);
			this.endUndo();
			return true;
		},
		moveLinesUp: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var model = editor.getModel();
			var selection = editor.getSelection();
			var firstLine = model.getLineAtOffset(selection.start);
			if (firstLine === 0) {
				return true;
			}
			var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
			var lineCount = model.getLineCount();
			var insertOffset = model.getLineStart(firstLine - 1);
			var lineStart = model.getLineStart(firstLine);
			var lineEnd = model.getLineEnd(lastLine, true);
			var text = model.getText(lineStart, lineEnd);
			var delimiterLength = 0;
			if (lastLine === lineCount-1) {
				// Move delimiter preceding selection to end of text
				var delimiterStart = model.getLineEnd(firstLine - 1);
				var delimiterEnd = model.getLineEnd(firstLine - 1, true);
				text += model.getText(delimiterStart, delimiterEnd);
				lineStart = delimiterStart;
				delimiterLength = delimiterEnd - delimiterStart;
			}
			this.startUndo();
			editor.setText("", lineStart, lineEnd);
			editor.setText(text, insertOffset, insertOffset);
			editor.setSelection(insertOffset, insertOffset + text.length - delimiterLength);
			this.endUndo();
			return true;
		},
		nextAnnotation: function (forward) {
			var editor = this.editor;
			var annotationModel = editor.getAnnotationModel();
			if (!annotationModel) { return true; }
			var list = editor.getOverviewRuler() || editor.getAnnotationStyler();
			if (!list) { return true; }
			function ignore(annotation) {
				return !!annotation.lineStyle ||
					annotation.type === AT.ANNOTATION_MATCHING_BRACKET ||
					annotation.type === AT.ANNOTATION_CURRENT_BRACKET ||
					!list.isAnnotationTypeVisible(annotation.type);
			}
			var model = editor.getModel();
			var currentOffset = editor.getCaretOffset();
			var annotations = annotationModel.getAnnotations(forward ? currentOffset : 0, forward ? model.getCharCount() : currentOffset);
			var foundAnnotation = null;
			while (annotations.hasNext()) {
				var annotation = annotations.next();
				if (forward) {
					if (annotation.start <= currentOffset) { continue; }
				} else {
					if (annotation.start >= currentOffset) { continue; }
				}
				if (ignore(annotation)) {
					continue;
				}
				foundAnnotation = annotation;
				if (forward) {
					break;
				}
			}
			if (foundAnnotation) {
				var foundAnnotations = [foundAnnotation];
				annotations = annotationModel.getAnnotations(foundAnnotation.start, foundAnnotation.start);
				while (annotations.hasNext()) {
					annotation = annotations.next();
					if (annotation !== foundAnnotation && !ignore(annotation)) {
						foundAnnotations.push(annotation);
					}
				}
				var view = editor.getTextView();
				var nextLine = model.getLineAtOffset(foundAnnotation.start);
				var tooltip = mTooltip.Tooltip.getTooltip(view);
				if (!tooltip) {
					editor.moveSelection(foundAnnotation.start);
					return true;
				}
				editor.moveSelection(foundAnnotation.start, foundAnnotation.start, function() {
					tooltip.setTarget({
						getTooltipInfo: function() {
							var tooltipCoords = view.convert({
								x: view.getLocationAtOffset(foundAnnotation.start).x,
								y: view.getLocationAtOffset(model.getLineStart(nextLine)).y
							}, "document", "page"); //$NON-NLS-1$ //$NON-NLS-0$
							return {
								contents: foundAnnotations,
								x: tooltipCoords.x,
								y: tooltipCoords.y + Math.floor(view.getLineHeight(nextLine) * 1.33)
							};
						}
					}, 0);
				});
			}
			return true;
		},
		unindentLines: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			if(!textView.getOptions("tabMode")) { return; } //$NON-NLS-0$
			var model = editor.getModel();
			var selection = editor.getSelection();
			var firstLine = model.getLineAtOffset(selection.start);
			var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
			var tabSize = textView.getOptions("tabSize"); //$NON-NLS-0$
			var spaceTab = new Array(tabSize + 1).join(" "); //$NON-NLS-0$
			var lines = [], removeCount = 0, firstRemoveCount = 0;
			for (var i = firstLine; i <= lastLine; i++) {
				var line = model.getLine(i, true);
				if (model.getLineStart(i) !== model.getLineEnd(i)) {
					if (line.indexOf("\t") === 0) { //$NON-NLS-0$
						line = line.substring(1);
						removeCount++;
					} else if (line.indexOf(spaceTab) === 0) {
						line = line.substring(tabSize);
						removeCount += tabSize;
					} else {
						return true;
					}
				}
				if (i === firstLine) {
					firstRemoveCount = removeCount;
				}
				lines.push(line);
			}
			var lineStart = model.getLineStart(firstLine);
			var lineEnd = model.getLineEnd(lastLine, true);
			var lastLineStart = model.getLineStart(lastLine);
			editor.setText(lines.join(""), lineStart, lineEnd);
			var start = lineStart === selection.start ? selection.start : selection.start - firstRemoveCount;
			var end = Math.max(start, selection.end - removeCount + (selection.end === lastLineStart+1 && selection.start !== selection.end ? 1 : 0));
			editor.setSelection(start, end);
			return true;
		},
		startUndo: function() {
			if (this.undoStack) {
				this.undoStack.startCompoundChange();
			}
		},
		endUndo: function() {
			if (this.undoStack) {
				this.undoStack.endCompoundChange();
			}
		}
	};
	exports.TextActions = TextActions;

	/**
	 * @param {orion.editor.Editor} editor
	 * @param {orion.editor.UndoStack} undoStack
	 * @param {orion.editor.ContentAssist} [contentAssist]
	 * @param {orion.editor.LinkedMode} [linkedMode]
	 */
	function SourceCodeActions(editor, undoStack, contentAssist, linkedMode) {
		this.editor = editor;
		this.undoStack = undoStack;
		this.contentAssist = contentAssist;
		this.linkedMode = linkedMode;
		if (this.contentAssist) {
			this.contentAssist.addEventListener("ProposalApplied", this.contentAssistProposalApplied.bind(this)); //$NON-NLS-0$
		}
		this.init();
	}
	SourceCodeActions.prototype = {
		init: function() {
			var textView = this.editor.getTextView();

			textView.setAction("lineStart", function() { //$NON-NLS-0$
				return this.lineStart();
			}.bind(this));

			textView.setAction("enter", function() { //$NON-NLS-0$
				return this.autoIndent();
			}.bind(this));

			textView.setKeyBinding(new mKeyBinding.KeyBinding("t", true, false, true), "trimTrailingWhitespaces"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("trimTrailingWhitespaces", function() { //$NON-NLS-0$
				return this.trimTrailingWhitespaces();
			}.bind(this), {name: messages.trimTrailingWhitespaces});

			textView.setKeyBinding(new mKeyBinding.KeyBinding(191, true), "toggleLineComment"); //$NON-NLS-0$
			textView.setAction("toggleLineComment", function() { //$NON-NLS-0$
				return this.toggleLineComment();
			}.bind(this), {name: messages.toggleLineComment});

			textView.setKeyBinding(new mKeyBinding.KeyBinding(191, true, !util.isMac, false, util.isMac), "addBlockComment"); //$NON-NLS-0$
			textView.setAction("addBlockComment", function() { //$NON-NLS-0$
				return this.addBlockComment();
			}.bind(this), {name: messages.addBlockComment});

			textView.setKeyBinding(new mKeyBinding.KeyBinding(220, true, !util.isMac, false, util.isMac), "removeBlockComment"); //$NON-NLS-0$
			textView.setAction("removeBlockComment", function() { //$NON-NLS-0$
				return this.removeBlockComment();
			}.bind(this), {name: messages.removeBlockComment});

			// Autocomplete square brackets []
			textView.setKeyBinding(new mKeyBinding.KeyBinding("[", false, false, false, false, "keypress"), "autoPairSquareBracket"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("autoPairSquareBracket", function() { //$NON-NLS-0$
				return this.autoPairBrackets("[", "]"); //$NON-NLS-1$ //$NON-NLS-0$
			}.bind(this));

			textView.setKeyBinding(new mKeyBinding.KeyBinding(']', false, false, false, false, "keypress"), "skipClosingSquareBracket"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("skipClosingSquareBracket", function() { //$NON-NLS-0$
				return this.skipClosingBracket(']'); //$NON-NLS-0$
			}.bind(this));

			// Autocomplete angle brackets <>
			textView.setKeyBinding(new mKeyBinding.KeyBinding("<", false, false, false, false, "keypress"), "autoPairAngleBracket"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("autoPairAngleBracket", function() { //$NON-NLS-0$
				return this.autoPairBrackets("<", ">"); //$NON-NLS-1$ //$NON-NLS-0$
			}.bind(this));

			textView.setKeyBinding(new mKeyBinding.KeyBinding('>', false, false, false, false, "keypress"), "skipClosingAngleBracket"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("skipClosingAngleBracket", function() { //$NON-NLS-0$
				return this.skipClosingBracket('>'); //$NON-NLS-0$
			}.bind(this));

			// Autocomplete parentheses ()
			textView.setKeyBinding(new mKeyBinding.KeyBinding("(", false, false, false, false, "keypress"), "autoPairParentheses"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("autoPairParentheses", function() { //$NON-NLS-0$
				return this.autoPairBrackets("(", ")"); //$NON-NLS-1$ //$NON-NLS-0$
			}.bind(this));

			textView.setKeyBinding(new mKeyBinding.KeyBinding(')', false, false, false, false, "keypress"), "skipClosingParenthesis"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("skipClosingParenthesis", function() { //$NON-NLS-0$
				return this.skipClosingBracket(")"); //$NON-NLS-0$
			}.bind(this));

			// Autocomplete braces {}
			textView.setKeyBinding(new mKeyBinding.KeyBinding("{", false, false, false, false, "keypress"), "autoPairBraces"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("autoPairBraces", function() { //$NON-NLS-0$
				return this.autoPairBrackets("{", "}"); //$NON-NLS-1$ //$NON-NLS-0$
			}.bind(this));

			textView.setKeyBinding(new mKeyBinding.KeyBinding('}', false, false, false, false, "keypress"), "skipClosingBrace"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("skipClosingBrace", function() { //$NON-NLS-0$
				return this.skipClosingBracket("}"); //$NON-NLS-0$
			}.bind(this));

			// Autocomplete single quotations
			textView.setKeyBinding(new mKeyBinding.KeyBinding("'", false, false, false, false, "keypress"), "autoPairSingleQuotation"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("autoPairSingleQuotation", function() { //$NON-NLS-0$
				return this.autoPairQuotations("'"); //$NON-NLS-1$ //$NON-NLS-0$
			}.bind(this));

			// Autocomplete double quotations
			textView.setKeyBinding(new mKeyBinding.KeyBinding('"', false, false, false, false, "keypress"), "autoPairDblQuotation"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("autoPairDblQuotation", function() { //$NON-NLS-0$
				return this.autoPairQuotations('"'); //$NON-NLS-1$ //$NON-NLS-0$
			}.bind(this));

			textView.setAction("deletePrevious", function() { //$NON-NLS-0$
				return this.deletePrevious();
			}.bind(this));
		},
		autoIndent: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var selection = editor.getSelection();
			if (selection.start === selection.end) {
				var model = editor.getModel();
				var lineIndex = model.getLineAtOffset(selection.start);
				var lineText = model.getLine(lineIndex, false);
				var lineStart = model.getLineStart(lineIndex);
				var index = 0;
				var lineOffset = selection.start - lineStart;
				var c;
				while (index < lineOffset && ((c = lineText.charCodeAt(index)) === 32 || c === 9)) { index++; }
				var prefix = lineText.substring(0, index);
				var options = textView.getOptions("tabSize", "expandTab"); //$NON-NLS-1$ //$NON-NLS-0$
				var tab = options.expandTab ? new Array(options.tabSize + 1).join(" ") : "\t"; //$NON-NLS-1$ //$NON-NLS-0$
				var lineDelimiter = model.getLineDelimiter();
				var matchCommentStart = /^[\s]*\/\*[\*]*[\s]*$/;
				var matchCommentDelimiter = /^[\s]*\*/;
				var matchCommentEnd = /\*\/[\s]*$/;
				var lineTextBeforeCaret = lineText.substring(0, lineOffset);
				var lineTextAfterCaret = lineText.substring(lineOffset);
				var text;
				// If the character before the caret is an opening brace, smart indent the next line.
				var prevCharIdx;
				if (this.smartIndentation && lineText.charCodeAt(prevCharIdx = lineTextBeforeCaret.trimRight().length - 1) === 123) {
					// Remove any extra whitespace
					var whitespaceBeforeCaret = lineOffset - prevCharIdx - 1;
					var whitespaceAfterCaret = lineTextAfterCaret.length - lineTextAfterCaret.trimLeft().length;

					text = lineText.charCodeAt(lineOffset + whitespaceAfterCaret) === 125 ?
						   lineDelimiter + prefix + tab + lineDelimiter + prefix :
						   lineDelimiter + prefix + tab;

					editor.setText(text, selection.start - whitespaceBeforeCaret, selection.end + whitespaceAfterCaret);
					editor.setCaretOffset(selection.start + lineDelimiter.length + prefix.length + tab.length - whitespaceBeforeCaret);
					return true;
				// Proceed with autocompleting multi-line comment if the text before the caret matches
				// the start or comment delimiter (*) of a multi-line comment
				} else if (this.autoCompleteComments && !matchCommentEnd.test(lineTextBeforeCaret) &&
							(matchCommentStart.test(lineTextBeforeCaret) || matchCommentDelimiter.test(lineTextBeforeCaret))) {
					var caretOffset;

					/**
					 * Matches the start of a multi-line comment. Autocomplete the multi-line block comment,
					 * moving any text after the caret into the block comment and setting the caret to be
					 * after the comment delimiter.
					 */
					var match = matchCommentStart.exec(lineTextBeforeCaret);
					if (match) {
						text = lineDelimiter + prefix + " * "; //$NON-NLS-0$
						// Text added into the comment block are trimmed of all preceding and trailing whitespaces.
						// If the text after the caret contains the ending of a block comment, exclude the ending.
						if (matchCommentEnd.test(lineTextAfterCaret)) {
							text += lineTextAfterCaret.substring(0, lineTextAfterCaret.length - 2).trim();
						} else {
							text += lineTextAfterCaret.trim();
						}
						// Add the closing to the multi-line block comment if the next line is not a
						// comment delimiter.
						if ((model.getLineCount() === lineIndex + 1) ||
							!matchCommentDelimiter.test(model.getLine(lineIndex + 1))) {
							text += lineDelimiter + prefix + " */"; //$NON-NLS-0$
						}
						editor.setText(text, selection.start, selection.end + lineTextAfterCaret.length);
						editor.setCaretOffset(selection.start + lineDelimiter.length + prefix.length + 3);
						return true;
					}

					/**
					 * Matches a comment delimiter (*) as the start of the line, and traverses up the lines to confirm if
					 * it is a multi-line comment by matching the start of a block comment. If so, continue the
					 * multi-line comment in the next line. Any text that follows after the caret is moved to the newly
					 * added comment delimiter.
					 */
					match = matchCommentDelimiter.exec(lineTextBeforeCaret);
					if (match) {
						for (var i = lineIndex - 1; i >= 0; i--) {
							var prevLine = model.getLine(i, false);
							if (matchCommentStart.test(prevLine)) {
								/**
								 * If the text after the caret matches the end of a comment block or the character in front of the
								 * caret is a forward slash, continue the block comment with the caret and text after the caret on
								 * the next line directly in front of the star (*).
								 */
								if (matchCommentEnd.test(lineTextAfterCaret) || lineText.charCodeAt(lineOffset) === 47) {
									text = lineDelimiter + prefix + "*" + lineTextAfterCaret; //$NON-NLS-0$
									caretOffset = selection.start + lineDelimiter.length + prefix.length + 1;
								} else {
									text = lineDelimiter + prefix + "* " + lineTextAfterCaret; //$NON-NLS-0$
									caretOffset = selection.start + lineDelimiter.length + prefix.length + 2;
								}
								editor.setText(text, selection.start, selection.end + lineTextAfterCaret.length);
								editor.setCaretOffset(caretOffset);
								return true;
							} else if (!matchCommentDelimiter.test(prevLine)) {
								return false;
							}
						}
					}
					return false;
				} else if (matchCommentEnd.test(lineTextBeforeCaret) && prefix.charCodeAt(prefix.length - 1) === 32) {
					// Matches the end of a block comment. Fix the indentation for the following line.
					text = lineDelimiter + prefix.substring(0, prefix.length - 1);
					editor.setText(text, selection.start, selection.end);
					editor.setCaretOffset(selection.start + text.length);
					return true;
				} else if (index > 0) {
					//TODO still wrong when typing inside folding
					index = lineOffset;
					while (index < lineText.length && ((c = lineText.charCodeAt(index++)) === 32 || c === 9)) { selection.end++; }
					editor.setText(model.getLineDelimiter() + prefix, selection.start, selection.end);
					return true;
				}
			}
			return false;
		},
		addBlockComment: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var model = editor.getModel();
			var selection = editor.getSelection();
			var open = "/*", close = "*/", commentTags = new RegExp("/\\*" + "|" + "\\*/", "g"); //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

			var result = this._findEnclosingComment(model, selection.start, selection.end);
			if (result.commentStart !== undefined && result.commentEnd !== undefined) {
				return true; // Already in a comment
			}

			var text = model.getText(selection.start, selection.end);
			if (text.length === 0) { return true; }

			var oldLength = text.length;
			text = text.replace(commentTags, "");
			var newLength = text.length;

			editor.setText(open + text + close, selection.start, selection.end);
			editor.setSelection(selection.start + open.length, selection.end + open.length + (newLength-oldLength));
			return true;
		},
		/**
		 * Called on an opening bracket keypress.
		 * Automatically inserts the specified opening and closing brackets around the caret or selected text.
		 */
		autoPairBrackets: function(openBracket, closeBracket) {
			if (openBracket === "[" && !this.autoPairSquareBrackets) {
				return false;
			} else if (openBracket === "{" && !this.autoPairBraces) {
				return false;
			} else if (openBracket === "(" && !this.autoPairParentheses) {
				return false;
			} else if (openBracket === "<" && !this.autoPairAngleBrackets) {
				return false;
			}

			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var selection = editor.getSelection();
			var model = editor.getModel();
			var currentOffset = editor.getCaretOffset();
			var nextChar = (currentOffset === model.getCharCount()) ? "" : model.getText(selection.start, selection.start + 1).trim(); //$NON-NLS-0$
			var isClosingBracket = new RegExp("^$|[)}\\]>]"); //$NON-NLS-0$ // matches any empty string and closing bracket

			if (selection.start === selection.end && isClosingBracket.test(nextChar)) { //$NON-NLS-0$
				// No selection and subsequent character is not a closing bracket - wrap the caret with the opening and closing brackets,
				// and maintain the caret position inbetween the brackets
				editor.setText(openBracket + closeBracket, selection.start, selection.start);
				editor.setCaretOffset(selection.start + 1);
				return true;
			} else if (selection.start !== selection.end) {
				// Wrap the selected text with the specified opening and closing brackets and keep selection on text
				var text = model.getText(selection.start, selection.end);
				editor.setText(openBracket + text + closeBracket, selection.start, selection.end);
				editor.setSelection(selection.start + 1, selection.end + 1);
				return true;
			}
			return false;
		},
		/**
		 * Called on a quotation mark keypress.
		 * Automatically inserts a pair of the specified quotation around the caret the caret or selected text.
		 */
		autoPairQuotations: function(quotation) {
			if (!this.autoPairQuotation) { return false; }
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var selection = editor.getSelection();
			var model = editor.getModel();
			var currentOffset = editor.getCaretOffset();
			var prevChar = (currentOffset === 0) ? "" : model.getText(selection.start - 1, selection.start).trim(); //$NON-NLS-0$
			var nextChar = (currentOffset === model.getCharCount()) ? "" : model.getText(selection.start, selection.start + 1).trim(); //$NON-NLS-0$
			var isQuotation = new RegExp("^\"$|^'$"); //$NON-NLS-0$
			var isAlpha = new RegExp("\\w"); //$NON-NLS-0$
			var isClosingBracket = new RegExp("^$|[)}\\]>]"); //$NON-NLS-0$ // matches any empty string and closing bracket

			// Wrap the selected text with the specified opening and closing quotation marks and keep selection on text
			if (selection.start !== selection.end) {
				var text = model.getText(selection.start, selection.end);
				if (isQuotation.test(text)) { return false; }
				editor.setText(quotation + text + quotation, selection.start, selection.end);
				editor.setSelection(selection.start + 1, selection.end + 1);
			} else if (nextChar === quotation) {
				// Skip over the next character if it matches the specified quotation mark
				editor.setCaretOffset(selection.start + 1);
			} else if (prevChar === quotation || isQuotation.test(nextChar) || isAlpha.test(prevChar) || !isClosingBracket.test(nextChar)) {
				// Insert the specified quotation mark
				return false;
			} else {
				// No selection - wrap the caret with the opening and closing quotation marks, and maintain the caret position inbetween the quotations
				editor.setText(quotation + quotation, selection.start, selection.start);
				editor.setCaretOffset(selection.start + 1);
			}
			return true;
		},
		/**
		 * Called when a content assist proposal has been applied. Inserts the proposal into the
		 * document. Activates Linked Mode if applicable for the selected proposal.
		 * @param {orion.editor.ContentAssist#ProposalAppliedEvent} event
		 */
		contentAssistProposalApplied: function(event) {
			/*
			 * The event.proposal is an object with this shape:
			 * {   proposal: "[proposal string]", // Actual text of the proposal
			 *     description: "diplay string", // Optional
			 *     positions: [{
			 *         offset: 10, // Offset of start position of parameter i
			 *         length: 3  // Length of parameter string for parameter i
			 *     }], // One object for each parameter; can be null
			 *     escapePosition: 19, // Optional; offset that caret will be placed at after exiting Linked Mode.
			 *     style: 'emphasis', // Optional: either emphasis, noemphasis, hr to provide custom styling for the proposal
			 *     unselectable: false // Optional: if set to true, then this proposal cannnot be selected through the keyboard
			 * }
			 * Offsets are relative to the text buffer.
			 */
			var proposal = event.data.proposal;

			//if the proposal specifies linked positions, build the model and enter linked mode
			if (proposal.positions && proposal.positions.length > 0 && this.linkedMode) {
				var positionGroups = [];
				for (var i = 0; i < proposal.positions.length; ++i) {
					positionGroups[i] = {
						positions: [{
							offset: proposal.positions[i].offset,
							length: proposal.positions[i].length
						}]
					};
				}
				this.linkedMode.enterLinkedMode({
					groups: positionGroups,
					escapePosition: proposal.escapePosition
				});
			} else if (proposal.groups && proposal.groups.length > 0 && this.linkedMode) {
				this.linkedMode.enterLinkedMode({
					groups: proposal.groups,
					escapePosition: proposal.escapePosition
				});
			} else if (proposal.escapePosition) {
				//we don't want linked mode, but there is an escape position, so just set cursor position
				var textView = this.editor.getTextView();
				textView.setCaretOffset(proposal.escapePosition);
			}
			return true;
		},
		// On backspace keypress, checks if there are a pair of brackets or quotation marks to be deleted
		deletePrevious: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var selection = editor.getSelection();
			if (selection.start !== selection.end) { return false; }
			var model = editor.getModel();
			var caretOffset = editor.getCaretOffset();
			var prevChar = (caretOffset === 0) ? "" : model.getText(selection.start - 1, selection.start); //$NON-NLS-0$
			var nextChar = (caretOffset === model.getCharCount()) ? "" : model.getText(selection.start, selection.start + 1); //$NON-NLS-0$

			if ((prevChar === "(" && nextChar === ")") || //$NON-NLS-1$ //$NON-NLS-0$
				(prevChar === "[" && nextChar === "]") || //$NON-NLS-1$ //$NON-NLS-0$
				(prevChar === "{" && nextChar === "}") || //$NON-NLS-1$ //$NON-NLS-0$
				(prevChar === "<" && nextChar === ">") || //$NON-NLS-1$ //$NON-NLS-0$
				(prevChar === '"' && nextChar === '"') || //$NON-NLS-1$ //$NON-NLS-0$
				(prevChar === "'" && nextChar === "'")) { //$NON-NLS-1$ //$NON-NLS-0$
				editor.setText("", selection.start, selection.start + 1); //$NON-NLS-0$
			}
			return false;
		},
		_findEnclosingComment: function(model, start, end) {
			var open = "/*", close = "*/"; //$NON-NLS-1$ //$NON-NLS-0$
			var firstLine = model.getLineAtOffset(start);
			var lastLine = model.getLineAtOffset(end);
			var i, line, extent, openPos, closePos;
			var commentStart, commentEnd;
			for (i=firstLine; i >= 0; i--) {
				line = model.getLine(i);
				extent = (i === firstLine) ? start - model.getLineStart(firstLine) : line.length;
				openPos = line.lastIndexOf(open, extent);
				closePos = line.lastIndexOf(close, extent);
				if (closePos > openPos) {
					break; // not inside a comment
				} else if (openPos !== -1) {
					commentStart = model.getLineStart(i) + openPos;
					break;
				}
			}
			for (i=lastLine; i < model.getLineCount(); i++) {
				line = model.getLine(i);
				extent = (i === lastLine) ? end - model.getLineStart(lastLine) : 0;
				openPos = line.indexOf(open, extent);
				closePos = line.indexOf(close, extent);
				if (openPos !== -1 && openPos < closePos) {
					break;
				} else if (closePos !== -1) {
					commentEnd = model.getLineStart(i) + closePos;
					break;
				}
			}
			return {commentStart: commentStart, commentEnd: commentEnd};
		},
		lineStart: function() {
			var editor = this.editor;
			var model = editor.getModel();
			var caretOffset = editor.getCaretOffset();
			var lineIndex = model.getLineAtOffset(caretOffset);
			var lineOffset = model.getLineStart(lineIndex);
			var lineText = model.getLine(lineIndex);
			var offset;
			for (offset=0; offset<lineText.length; offset++) {
				var c = lineText.charCodeAt(offset);
				if (!(c === 32 || c === 9)) {
					break;
				}
			}
			offset += lineOffset;
			if (caretOffset !== offset) {
				editor.setSelection(offset, offset);
				return true;
			}
			return false;
		},
		removeBlockComment: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var model = editor.getModel();
			var selection = editor.getSelection();
			var open = "/*", close = "*/"; //$NON-NLS-1$ //$NON-NLS-0$

			// Try to shrink selection to a comment block
			var selectedText = model.getText(selection.start, selection.end);
			var newStart, newEnd;
			var i;
			for(i=0; i < selectedText.length; i++) {
				if (selectedText.substring(i, i + open.length) === open) {
					newStart = selection.start + i;
					break;
				}
			}
			for (; i < selectedText.length; i++) {
				if (selectedText.substring(i, i + close.length) === close) {
					newEnd = selection.start + i;
					break;
				}
			}

			if (newStart !== undefined && newEnd !== undefined) {
				editor.setText(model.getText(newStart + open.length, newEnd), newStart, newEnd + close.length);
				editor.setSelection(newStart, newEnd);
			} else {
				// Otherwise find enclosing comment block
				var result = this._findEnclosingComment(model, selection.start, selection.end);
				if (result.commentStart === undefined || result.commentEnd === undefined) {
					return true;
				}

				var text = model.getText(result.commentStart + open.length, result.commentEnd);
				editor.setText(text, result.commentStart, result.commentEnd + close.length);
				editor.setSelection(selection.start - open.length, selection.end - close.length);
			}
			return true;
		},
		toggleLineComment: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var model = editor.getModel();
			var selection = editor.getSelection();
			var firstLine = model.getLineAtOffset(selection.start);
			var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
			var uncomment = true, lines = [], lineText, index;
			for (var i = firstLine; i <= lastLine; i++) {
				lineText = model.getLine(i, true);
				lines.push(lineText);
				if (!uncomment || (index = lineText.indexOf("//")) === -1) { //$NON-NLS-0$
					uncomment = false;
				} else {
					if (index !== 0) {
						var j;
						for (j=0; j<index; j++) {
							var c = lineText.charCodeAt(j);
							if (!(c === 32 || c === 9)) {
								break;
							}
						}
						uncomment = j === index;
					}
				}
			}
			var text, selStart, selEnd;
			var lineStart = model.getLineStart(firstLine);
			var lineEnd = model.getLineEnd(lastLine, true);
			if (uncomment) {
				for (var k = 0; k < lines.length; k++) {
					lineText = lines[k];
					index = lineText.indexOf("//"); //$NON-NLS-0$
					lines[k] = lineText.substring(0, index) + lineText.substring(index + 2);
				}
				text = lines.join("");
				var lastLineStart = model.getLineStart(lastLine);
				selStart = lineStart === selection.start ? selection.start : selection.start - 2;
				selEnd = selection.end - (2 * (lastLine - firstLine + 1)) + (selection.end === lastLineStart+1 ? 2 : 0);
			} else {
				lines.splice(0, 0, "");
				text = lines.join("//"); //$NON-NLS-0$
				selStart = lineStart === selection.start ? selection.start : selection.start + 2;
				selEnd = selection.end + (2 * (lastLine - firstLine + 1));
			}
			editor.setText(text, lineStart, lineEnd);
			editor.setSelection(selStart, selEnd);
			return true;
		},
		trimTrailingWhitespaces: function() {
			var editor = this.editor;
			var model = editor.getModel();
			var selection = editor.getSelection();
			editor.getTextView().setRedraw(false);
			editor.getUndoStack().startCompoundChange();
			var matchTrailingWhiteSpace = /(\s+$)/;
			var lineCount = model.getLineCount();
			for (var i = 0; i < lineCount; i++) {
				var lineText = model.getLine(i);
				var match = matchTrailingWhiteSpace.exec(lineText);
				if (match) {
					var lineStartOffset = model.getLineStart(i);
					var matchLength = match[0].length;
					var start = lineStartOffset + match.index;
					model.setText("", start, start + matchLength);
					/**
					 * Move the caret to its original position prior to the save. If the caret
					 * was in the trailing whitespaces, move the caret to the end of the line.
					 */
					if (selection.start > start) {
						selection.start = Math.max(start, selection.start - matchLength);
					}
					if (selection.start !== selection.end && selection.end > start) {
						selection.end = Math.max(start, selection.end - matchLength);
					}
				}
			}
			editor.getUndoStack().endCompoundChange();
			editor.getTextView().setRedraw(true);
			editor.setSelection(selection.start, selection.end, false);
		},
		startUndo: function() {
			if (this.undoStack) {
				this.undoStack.startCompoundChange();
			}
		},
		skipClosingBracket: function(closingChar) {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var selection = editor.getSelection();
			var model = editor.getModel();
			var currentOffset = editor.getCaretOffset();
			var nextChar = (currentOffset === model.getCharCount()) ? "" : model.getText(selection.start, selection.start + 1); //$NON-NLS-0$

			if (nextChar === closingChar) {
				editor.setCaretOffset(selection.start + 1);
				return true;
			}
			return false;
		},
		endUndo: function() {
			if (this.undoStack) {
				this.undoStack.endCompoundChange();
			}
		},
		setAutoPairParentheses: function(enabled) {
			this.autoPairParentheses = enabled;
		},
		setAutoPairBraces: function(enabled) {
			this.autoPairBraces = enabled;
		},
		setAutoPairSquareBrackets: function(enabled) {
			this.autoPairSquareBrackets = enabled;
		},
		setAutoPairAngleBrackets: function(enabled) {
			this.autoPairAngleBrackets = enabled;
		},
		setAutoPairQuotations: function(enabled) {
			this.autoPairQuotation = enabled;
		},
		setAutoCompleteComments: function(enabled) {
			this.autoCompleteComments = enabled;
		},
		setSmartIndentation: function(enabled) {
			this.smartIndentation = enabled;
		}
	};
	exports.SourceCodeActions = SourceCodeActions;

	if (!String.prototype.trimLeft) {
		String.prototype.trimLeft = function(){
			return this.replace(/^\s+/g, '');
		};
	}
	if (!String.prototype.trimRight) {
		String.prototype.trimRight = function(){
			return this.replace(/\s+$/g, '');
		};
	}

	return exports;
});

/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define*/

define("orion/editor/templates", [], function() { //$NON-NLS-0$

	/** 
	 * Removes prefix from string.
	 * @param {String} prefix
	 * @param {String} string
	 */
	function chop(prefix, string) {
		return string.substring(prefix.length);
	}
	
	var tabVar = "${tab}"; //$NON-NLS-0$
	var delimiterVar = "${delimiter}"; //$NON-NLS-0$
	var cursorVar = "${cursor}"; //$NON-NLS-0$
	
	function Template (prefix, description, template, name) {
		this.prefix = prefix;
		this.description = description;
		this.template = template;
		this.name = name;
		this._parse();
	}
	Template.prototype = /** @lends orion.editor.Template.prototype */ {
		getProposal: function(prefix, offset, context) {
			//any returned positions need to be offset based on current cursor position and length of prefix
			var startOffset = offset-prefix.length;
			var groups = {};
			var escapePosition;
			var delimiter = context.delimiter !== undefined ? context.delimiter : "\n"; //$NON-NLS-0$
			if (context.indentation) {
				delimiter += context.indentation;
			}
			var tab = context.tab !== undefined ? context.tab : "\t"; //$NON-NLS-0$
			var delta = 0;
			var variables = this.variables;
			var segments = this.segments, proposal = [];
			for (var i = 0; i < segments.length; i++) {
				var segment = segments[i];
				var variable = variables[segment];
				if (variable !== undefined) {
					switch (segment) {
						case tabVar:
							segment = tab;
							break;
						case delimiterVar:
							segment = delimiter;
							break;
						case cursorVar:
							segment = "";
							escapePosition = delta;
							break;
						default:
							var g = groups[segment];
							if (!g) {
								g = groups[segment] = {data: variable.data, positions: []};
							}
							segment = variable.substitution;
							if (g.data && g.data.values) { segment = g.data.values[0]; }
							g.positions.push({
								offset: startOffset + delta,
								length: segment.length
							});
					}
				}
				proposal.push(segment);
				delta += segment.length;
			}
			var newGroups = [];
			for (var p in groups) {
				if (groups.hasOwnProperty(p)) {
					newGroups.push(groups[p]);
				}
			}
			proposal = proposal.join("");
			if (escapePosition === undefined) {
				escapePosition = proposal.length;
			}
			return {
				proposal: proposal,
				name: this.name,
				description: this.description,
				groups: newGroups,
				escapePosition: startOffset + escapePosition,
				style: 'noemphasis'
			};
		},
		match: function(prefix) {
			return this.prefix.indexOf(prefix) === 0;
		},
		_parse: function() {
			var template = this.template;
			var segments = [], variables = {}, segment, start = 0;
			template = template.replace(/\n/g, delimiterVar);
			template = template.replace(/\t/g, tabVar);
			template.replace(/\$\{((?:[^\\}]+|\\.))*\}/g, function(group, text1, index) {
				var text = group.substring(2,group.length-1);
				var variable = group, substitution = text, data = null;
				var colon = substitution.indexOf(":"); //$NON-NLS-0$
				if (colon !== -1) {
					substitution = substitution.substring(0, colon);
					variable = "${"+ substitution + "}"; //$NON-NLS-1$ //$NON-NLS-0$
					data = JSON.parse(text.substring(colon + 1).replace("\\}", "}").trim()); //$NON-NLS-1$ //$NON-NLS-0$
				}
				var v = variables[variable];
				if (!v) { v = variables[variable] = {}; }
				v.substitution = substitution;
				if (data) {
					v.data = data;
				}
				segment = template.substring(start, index);
				if (segment) { segments.push(segment); }
				segments.push(variable);
				start = index + group.length;
				return substitution;
			});
			segment = template.substring(start, template.length);
			if (segment) { segments.push(segment); }
			this.segments = segments;
			this.variables = variables;
		}
	};
	
	function TemplateContentAssist (keywords, templates) {
		this._keywords = keywords || [];
		this._templates = [];
		this.addTemplates(templates || []);
	}
	TemplateContentAssist.prototype = /** @lends orion.editor.TemplateContentAssist.prototype */ {
		addTemplates: function(json) {
			var templates = this.getTemplates();
			for (var j = 0; j < json.length; j++) {
				templates.push(new Template(json[j].prefix, json[j].description, json[j].template, json[j].name));
			}
		},
		computeProposals: function(buffer, offset, context) {
			var prefix = this.getPrefix(buffer, offset, context);
			var proposals = [];
			if (this.isValid(prefix, buffer, offset, context)) {
				proposals = proposals.concat(this.getTemplateProposals(prefix, offset, context));
				proposals = proposals.concat(this.getKeywordProposals(prefix));
			}
			return proposals;
		},
		getKeywords: function() {
			return this._keywords;
		},
		getKeywordProposals: function(prefix) {
			var proposals = [];
			var keywords = this.getKeywords();
			if (keywords) {
				for (var i = 0; i < keywords.length; i++) {
					if (keywords[i].indexOf(prefix) === 0) {
						proposals.push({proposal: chop(prefix, keywords[i]), 
							description: keywords[i], 
							style: 'noemphasis_keyword'//$NON-NLS-0$
						});
					}
				}
				
				if (0 < proposals.length) {
					proposals.splice(0, 0,{
						proposal: '',
						description: 'Keywords', //$NON-NLS-0$
						style: 'noemphasis_title_keywords', //$NON-NLS-0$
						unselectable: true
					});	
				}
			}
			return proposals;
		},
		getPrefix: function(buffer, offset, context) {
			return context.prefix;
		},
		getTemplates: function() {
			return this._templates;
		},
		getTemplateProposals: function(prefix, offset, context) {
			var proposals = [];
			var templates = this.getTemplates();
			for (var t = 0; t < templates.length; t++) {
				var template = templates[t];
				if (template.match(prefix)) {
					var proposal = template.getProposal(prefix, offset, context);
					this.removePrefix(prefix, proposal);
					proposals.push(proposal);
				}
			}
			
			if (0 < proposals.length) {
				//sort the proposals by name
				proposals.sort(function(p1, p2) {
					if (p1.name < p2.name) return -1;
					if (p1.name > p2.name) return 1;
					return 0;
				});
				// if any templates were added to the list of 
				// proposals, add a title as the first element
				proposals.splice(0, 0, {
					proposal: '',
					description: 'Templates', //$NON-NLS-0$
					style: 'noemphasis_title', //$NON-NLS-0$
					unselectable: true
				});
			}
			
			return proposals;
		},
		removePrefix: function(prefix, proposal) {
			var overwrite = proposal.overwrite = proposal.proposal.substring(0, prefix.length) !== prefix;
			if (!overwrite) {
				proposal.proposal = chop(prefix, proposal.proposal);
			}
		},
		isValid: function(prefix, buffer, offset, context) {
			return true;
		}
	};
	
	return {
		Template: Template,
		TemplateContentAssist: TemplateContentAssist
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define */

define("orion/editor/linkedMode", [ //$NON-NLS-0$
	'i18n!orion/editor/nls/messages', //$NON-NLS-0$
	'orion/keyBinding', //$NON-NLS-0$
	'orion/editor/keyModes', //$NON-NLS-0$
	'orion/editor/annotations', //$NON-NLS-0$
	'orion/editor/templates', //$NON-NLS-0$
	'orion/objects', //$NON-NLS-0$
	'orion/util' //$NON-NLS-0$
], function(messages, mKeyBinding, mKeyModes, mAnnotations, mTemplates, objects) {

	var exports = {};

	function LinkedMode(editor, undoStack, contentAssist) {
		var textView = editor.getTextView();
		mKeyModes.KeyMode.call(this, textView);
		this.editor = editor;
		this.undoStack = undoStack;
		this.contentAssist = contentAssist;
		
		this.linkedModeModel = null;
		
		textView.setAction("linkedModeEnter", function() { //$NON-NLS-0$
			this.exitLinkedMode(true);
			return true;
		}.bind(this));
		textView.setAction("linkedModeCancel", function() { //$NON-NLS-0$
			this.exitLinkedMode(false);
			return true;
		}.bind(this));
		textView.setAction("linkedModeNextGroup", function() { //$NON-NLS-0$
			var model = this.linkedModeModel;
			this.selectLinkedGroup((model.selectedGroupIndex + 1) % model.groups.length);
			return true;
		}.bind(this));
		textView.setAction("linkedModePreviousGroup", function() { //$NON-NLS-0$
			var model = this.linkedModeModel;
			this.selectLinkedGroup(model.selectedGroupIndex > 0 ? model.selectedGroupIndex-1 : model.groups.length-1);
			return true;
		}.bind(this));
		
		/**
		 * Listener called when Linked Mode is active. Updates position's offsets and length
		 * on user change. Also escapes the Linked Mode if the text buffer was modified outside of the Linked Mode positions.
		 */
		this.linkedModeListener = {
		
			onActivating: function(event) {
				if (this._groupContentAssistProvider) {
					this.contentAssist.setProviders([this._groupContentAssistProvider]);
					this.contentAssist.setProgress(null);
				}
			}.bind(this),
			
			onModelChanged: function(event) {
				if (this.ignoreVerify) { return; }

				// Get the position being modified
				var start = this.editor.mapOffset(event.start);
				var model = this.linkedModeModel, positionChanged, changed;
				while (model) {
					positionChanged = this._getPositionChanged(model, start, start + event.removedCharCount);
					changed = positionChanged.position;
					if (changed === undefined || changed.model !== model) {
						// The change has been done outside of the positions, exit the Linked Mode
						this.exitLinkedMode(false);
						model = this.linkedModeModel;
					} else {
						break;
					}
				}
				if (!model) { return; }

				// Update position offsets for this change. Group changes are done in #onVerify
				var deltaCount = 0;
				var changeCount = event.addedCharCount - event.removedCharCount;
				var sortedPositions = positionChanged.positions, position, pos;
				for (var i = 0; i < sortedPositions.length; ++i) {
					pos = sortedPositions[i];
					position = pos.position;
					var inside = position.offset <= start && start <= position.offset + position.length;
					if (inside && !pos.ansestor) {
						position.offset += deltaCount;
						position.length += changeCount;
						deltaCount += changeCount;
					} else {
						position.offset += deltaCount;
						if (pos.ansestor && inside) {
							position.length += changeCount;
						}
					}
					if (pos.escape) {
						pos.model.escapePosition = position.offset;
					}
				}
				this._updateAnnotations(sortedPositions);
			}.bind(this),

			onVerify: function(event) {
				if (this.ignoreVerify) { return; }

				// Get the position being modified
				var editor = this.editor;
				var start = editor.mapOffset(event.start);
				var end = this.editor.mapOffset(event.end);
				var model = this.linkedModeModel, positionChanged, changed;
				while (model) {
					positionChanged = this._getPositionChanged(model, start, end);
					changed = positionChanged.position;
					if (changed === undefined || changed.model !== model) {
						// The change has been done outside of the positions, exit the Linked Mode
						this.exitLinkedMode(false);
						model = this.linkedModeModel;
					} else {
						break;
					}
				}
				if (!model) { return; }
				
				// Make sure changes in a same group are compound
				var undo = this._compoundChange;
				if (undo) {
					if (!(undo.owner.model === model && undo.owner.group === changed.group)) {
						this.endUndo();
						this.startUndo();
					}
				} else {
					this.startUndo();
				}

				model.selectedGroupIndex = changed.group;
				
				// Update position offsets taking into account all positions in the same changing group
				var deltaCount = 0;
				var changeCount = event.text.length - (end - start);
				var sortedPositions = positionChanged.positions, position, pos;
				var deltaStart = start - changed.position.offset, deltaEnd = end - changed.position.offset;
				for (var i = 0; i < sortedPositions.length; ++i) {
					pos = sortedPositions[i];
					position = pos.position;
					pos.oldOffset = position.offset;
					if (pos.model === model && pos.group === changed.group) {
						position.offset += deltaCount;
						position.length += changeCount;
						deltaCount += changeCount;
					} else {
						position.offset += deltaCount;
						if (pos.ansestor) {
							position.length += changed.count * changeCount;
						}
					}
					if (pos.escape) {
						pos.model.escapePosition = position.offset;
					}
				}
				
				// Cancel this modification and apply same modification to all positions in changing group
				this.ignoreVerify = true;
				for (i = sortedPositions.length - 1; i >= 0; i--) {
					pos = sortedPositions[i];
					if (pos.model === model && pos.group === changed.group) {
						editor.setText(event.text, pos.oldOffset + deltaStart , pos.oldOffset + deltaEnd);
					}
				}
				this.ignoreVerify = false;
				event.text = null;
				this._updateAnnotations(sortedPositions);
			}.bind(this)
		};
	}
	LinkedMode.prototype = new mKeyModes.KeyMode();
	objects.mixin(LinkedMode.prototype, {
		createKeyBindings: function() {
			var KeyBinding = mKeyBinding.KeyBinding;
			var bindings = [];
			bindings.push({actionID: "linkedModeEnter", keyBinding: new KeyBinding(13)}); //$NON-NLS-0$
			bindings.push({actionID: "linkedModeCancel", keyBinding: new KeyBinding(27)}); //$NON-NLS-0$
			bindings.push({actionID: "linkedModeNextGroup", keyBinding: new KeyBinding(9)}); //$NON-NLS-0$
			bindings.push({actionID: "linkedModePreviousGroup", keyBinding: new KeyBinding(9, false, true)}); //$NON-NLS-0$
			return bindings;
		},
		/**
		 * Starts Linked Mode, selects the first position and registers the listeners.
		 * @param {Object} linkedModeModel An object describing the model to be used by linked mode.
		 * Contains one or more position groups. If a position in a group is edited, the other positions in
		 * the same group are edited the same way. The model structure is as follows:
		 * <pre>{
		 *		groups: [{
		 *			data: {},
		 *			positions: [{
		 *				offset: 10, // Relative to the text buffer
		 *				length: 3
		 *			}]
		 *		}],
		 *		escapePosition: 19, // Relative to the text buffer
		 * }</pre>
		 *
		 * Each group in the model has an optional <code>data</code> property which can be
		 * used to provide additional content assist for the group.  The <code>type</code> in
		 * data determines what kind of content assist is provided. These are the support
		 * structures for the <code>data</code> property.
		 * <pre>{
		 *		type: "link"
		 *		values: ["proposal0", "proposal1", ...]
		 * }</pre>
		 *
		 * The "link" data struture provides static content assist proposals stored in the
		 * <code>values</code> property.
		 *
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.editor.Template}<br/>
		 * {@link orion.editor.TemplateContentAssist}<br/>
		 * </p>
		 */
		enterLinkedMode: function(linkedModeModel) {
			if (!this.linkedModeModel) {
				var textView = this.editor.getTextView();
				textView.addKeyMode(this);
				textView.addEventListener("Verify", this.linkedModeListener.onVerify); //$NON-NLS-0$
				textView.addEventListener("ModelChanged", this.linkedModeListener.onModelChanged); //$NON-NLS-0$
				var contentAssist = this.contentAssist;
				contentAssist.addEventListener("Activating", this.linkedModeListener.onActivating); //$NON-NLS-0$
				this.editor.reportStatus(messages.linkedModeEntered, null, true);
			}
			this._sortedPositions = null;
			if (this.linkedModeModel) {
				linkedModeModel.previousModel = this.linkedModeModel;
				linkedModeModel.parentGroup = this.linkedModeModel.selectedGroupIndex;
				this.linkedModeModel.nextModel = linkedModeModel;
			}
			this.linkedModeModel = linkedModeModel;
			this.selectLinkedGroup(0);
		},
		/** 
		 * Exits Linked Mode. Optionally places the caret at linkedMode escapePosition. 
		 * @param {Boolean} [escapePosition=false] if true, place the caret at the  escape position.
		 */
		exitLinkedMode: function(escapePosition) {
			if (!this.isActive()) {
				return;
			}
			if (this._compoundChange) {
				this.endUndo();
				this._compoundChange = null;
			}
			this._sortedPositions = null;
			var model = this.linkedModeModel;
			this.linkedModeModel = model.previousModel;
			model.parentGroup = model.previousModel = undefined;
			if (this.linkedModeModel) {
				this.linkedModeModel.nextModel = undefined;
			}
			if (!this.linkedModeModel) {
				var editor = this.editor;
				var textView = editor.getTextView();
				textView.removeKeyMode(this);
				textView.removeEventListener("Verify", this.linkedModeListener.onVerify); //$NON-NLS-0$
				textView.removeEventListener("ModelChanged", this.linkedModeListener.onModelChanged); //$NON-NLS-0$
				var contentAssist = this.contentAssist;
				contentAssist.removeEventListener("Activating", this.linkedModeListener.onActivating); //$NON-NLS-0$
				contentAssist.offset = undefined;
				this.editor.reportStatus(messages.linkedModeExited, null, true);
				if (escapePosition) {
					editor.setCaretOffset(model.escapePosition, false);
				}
			}
			this.selectLinkedGroup(0);
		},
		startUndo: function() {
			if (this.undoStack) {
				var self = this;
				var model = this.linkedModeModel;
				this._compoundChange = this.undoStack.startCompoundChange({
					model: model,
					group: model.selectedGroupIndex,
					end: function() {
						self._compoundChange = null;
					}
				});
			}
		}, 
		endUndo: function() {
			if (this.undoStack) {
				this.undoStack.endCompoundChange();
			}
		},
		isActive: function() {
			return !!this.linkedModeModel;
		},
		isStatusActive: function() {
			return !!this.linkedModeModel;
		},
		selectLinkedGroup: function(index) {
			var model = this.linkedModeModel;
			if (model) {
				model.selectedGroupIndex = index;
				var group = model.groups[index];
				var position = group.positions[0];
				var editor = this.editor;
				editor.setSelection(position.offset, position.offset + position.length);
				var contentAssist = this.contentAssist;
				if (contentAssist) {
					contentAssist.offset = undefined;
					if (group.data && group.data.type === "link" && group.data.values) { //$NON-NLS-0$
						var provider = this._groupContentAssistProvider = new mTemplates.TemplateContentAssist(group.data.values);
						provider.getPrefix = function() {
							var selection = editor.getSelection();
							if (selection.start === selection.end) {
								var caretOffset = editor.getCaretOffset();
								if (position.offset <= caretOffset && caretOffset <= position.offset + position.length) {
									return editor.getText(position.offset, caretOffset);
								}
							}
							return "";
						};
						contentAssist.offset = position.offset;
						contentAssist.deactivate();
						contentAssist.activate();
					} else if (this._groupContentAssistProvider) {
						this._groupContentAssistProvider = null;
						contentAssist.deactivate();
					}
				}
			}
			this._updateAnnotations();
		},
		_getModelPositions: function(all, model, delta) {
			var groups = model.groups;
			for (var i = 0; i < groups.length; i++) {
				var positions = groups[i].positions;
				for (var j = 0; j < positions.length; j++) {
					var position = positions[j];
					if (delta) {
						position = {offset: position.offset + delta, length: position.length};
					}
					var pos = {
						index: j,
						group: i,
						count: positions.length,
						model: model,
						position: position
					};
					all.push(pos);
					if (model.nextModel && model.nextModel.parentGroup === i) {
						pos.ansestor = true;
						this._getModelPositions(all, model.nextModel, (delta || 0) + positions[j].offset - positions[0].offset);
					}
				}
			}
		},
		_getSortedPositions: function(model) {
			var all = this._sortedPositions;
			if (!all) {
				all = [];
				// Get the root linked model
				while (model.previousModel) {
					model = model.previousModel;
				}
				// Get all positions under model expanding group positions of stacked linked modes
				this._getModelPositions(all, model);
				// Add escape position for all models
				while (model) {
					if (model.escapePosition !== undefined) {
						all.push({
							escape: true,
							model: model,
							position: {offset: model.escapePosition, length: 0}
						});
					}
					model = model.nextModel;
				}
				all.sort(function(a, b) {
					return a.position.offset - b.position.offset;
				});
				this._sortedPositions = all;
			}
			return all;
		},
		_getPositionChanged: function(model, start, end) {
			var changed;
			var sortedPositions = this._getSortedPositions(model);
			for (var i = sortedPositions.length - 1; i >= 0; i--) {
				var position = sortedPositions[i].position;
				if (position.offset <= start && end <= position.offset + position.length) {
					changed = sortedPositions[i];
					break;
				}
			}
			return {position: changed, positions: sortedPositions};
		},
		_updateAnnotations: function(positions) {
			var annotationModel = this.editor.getAnnotationModel();
			if (!annotationModel) { return; }
			var remove = [], add = [];
			var textModel = annotationModel.getTextModel();
			var annotations = annotationModel.getAnnotations(), annotation;
			while (annotations.hasNext()) {
				annotation = annotations.next();
				switch (annotation.type) {
					case mAnnotations.AnnotationType.ANNOTATION_LINKED_GROUP:
					case mAnnotations.AnnotationType.ANNOTATION_CURRENT_LINKED_GROUP:
					case mAnnotations.AnnotationType.ANNOTATION_SELECTED_LINKED_GROUP:
						remove.push(annotation);
				}
			}
			var model = this.linkedModeModel;
			if (model) {
				positions = positions || this._getSortedPositions(model);
				for (var i = 0; i < positions.length; i++) {
					var position = positions[i];
					if (position.model !== model) { continue; }
					var type = mAnnotations.AnnotationType.ANNOTATION_LINKED_GROUP;
					if (position.group === model.selectedGroupIndex) {
						if (position.index === 0) {
							type = mAnnotations.AnnotationType.ANNOTATION_SELECTED_LINKED_GROUP;
						} else {
							type = mAnnotations.AnnotationType.ANNOTATION_CURRENT_LINKED_GROUP;
						}
					}
					position = position.position;
					annotation = mAnnotations.AnnotationType.createAnnotation(type, position.offset, position.offset + position.length, "");
					add.push(annotation);
				}
			}
			annotationModel.replaceAnnotations(remove, add);
		}
	});
	exports.LinkedMode = LinkedMode;

	return exports;
});

/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define */

define("orion/editor/factories", [ //$NON-NLS-0$
	'orion/editor/actions', //$NON-NLS-0$
	'orion/editor/undoStack', //$NON-NLS-0$
	'orion/editor/rulers', //$NON-NLS-0$
	'orion/editor/annotations', //$NON-NLS-0$
	'orion/editor/textDND', //$NON-NLS-0$
	'orion/editor/linkedMode' //$NON-NLS-0$
], function(mActions, mUndoStack, mRulers, mAnnotations, mTextDND, mLinkedMode) {

	var exports = {};
	
	function KeyBindingsFactory() {
	}
	KeyBindingsFactory.prototype = {
		createKeyBindings: function(editor, undoStack, contentAssist, searcher) {
			// Create keybindings for generic editing, no dependency on the service model
			var textActions = new mActions.TextActions(editor, undoStack , searcher);
			// Linked Mode
			var linkedMode = new mLinkedMode.LinkedMode(editor, undoStack, contentAssist);
			// create keybindings for source editing
			// TODO this should probably be something that happens more dynamically, when the editor changes input
			var sourceCodeActions = new mActions.SourceCodeActions(editor, undoStack, contentAssist, linkedMode);
			return {
				textActions: textActions,
				linkedMode: linkedMode,
				sourceCodeActions: sourceCodeActions
			};
		}
	};
	exports.KeyBindingsFactory = KeyBindingsFactory;
	
	function UndoFactory() {
	}
	UndoFactory.prototype = {
		createUndoStack: function(editor) {
			var textView = editor.getTextView();
			return new mUndoStack.UndoStack(textView, 200);
		}
	};
	exports.UndoFactory = UndoFactory;

	function LineNumberRulerFactory() {
	}
	LineNumberRulerFactory.prototype = {
		createLineNumberRuler: function(annotationModel) {
			return new mRulers.LineNumberRuler(annotationModel, "left", {styleClass: "ruler lines"}, {styleClass: "rulerLines odd"}, {styleClass: "rulerLines even"}); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		}
	};
	exports.LineNumberRulerFactory = LineNumberRulerFactory;
	
	function FoldingRulerFactory() {
	}
	FoldingRulerFactory.prototype = {
		createFoldingRuler: function(annotationModel) {
			return new mRulers.FoldingRuler(annotationModel, "left", {styleClass: "ruler folding"}); //$NON-NLS-1$ //$NON-NLS-0$
		}
	};
	exports.FoldingRulerFactory = FoldingRulerFactory;
	
	function AnnotationFactory() {
	}
	AnnotationFactory.prototype = {
		createAnnotationModel: function(model) {
			return new mAnnotations.AnnotationModel(model);
		},
		createAnnotationStyler: function(annotationModel, view) {
			return new mAnnotations.AnnotationStyler(annotationModel, view);
		},
		createAnnotationRulers: function(annotationModel) {
			var annotationRuler = new mRulers.AnnotationRuler(annotationModel, "left", {styleClass: "ruler annotations"}); //$NON-NLS-1$ //$NON-NLS-0$
			var overviewRuler = new mRulers.OverviewRuler(annotationModel, "right", {styleClass: "ruler overview"}); //$NON-NLS-1$ //$NON-NLS-0$
			return {annotationRuler: annotationRuler, overviewRuler: overviewRuler};
		}
	};
	exports.AnnotationFactory = AnnotationFactory;
	
	function TextDNDFactory() {
	}
	TextDNDFactory.prototype = {
		createTextDND: function(editor, undoStack) {
			return new mTextDND.TextDND(editor.getTextView(), undoStack);
		}
	};
	exports.TextDNDFactory = TextDNDFactory;
	
	return exports;
});

/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define */

define("orion/editor/editorFeatures", [ //$NON-NLS-0$
	'orion/editor/factories', //$NON-NLS-0$
	'orion/editor/actions', //$NON-NLS-0$
	'orion/editor/linkedMode', //$NON-NLS-0$
	'orion/objects' //$NON-NLS-0$
], function(mFactories, mActions, mLinkedMode, objects) {
	return objects.mixin({}, mFactories, mActions, mLinkedMode);
});

/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global exports module define setTimeout*/

(function(root, factory) { // UMD
    if (typeof define === "function" && define.amd) { //$NON-NLS-0$
        define('orion/Deferred',factory);
    } else if (typeof exports === "object") { //$NON-NLS-0$
        module.exports = factory();
    } else {
        root.orion = root.orion || {};
        root.orion.Deferred = factory();
    }
}(this, function() {
    var queue = [],
        running = false;

    function run() {
        var fn;
        while ((fn = queue.shift())) {
            fn();
        }
        running = false;
    }

    function enqueue(fn) {
        queue.push(fn);
        if (!running) {
            running = true;
            setTimeout(run, 0);
        }
    }

    function noReturn(fn) {
        return function() {
            fn.apply(undefined, arguments);
        };
    }

    /**
     * @name orion.Promise
     * @class Interface representing an eventual value.
     * @description Promise is an interface that represents an eventual value returned from the single completion of an operation.
     *
     * <p>For a concrete class that implements Promise and provides additional API, see {@link orion.Deferred}.</p>
     * @see orion.Deferred
     * @see orion.Deferred#promise
     */
    /**
     * @name then
     * @function
     * @memberOf orion.Promise.prototype
     * @description Adds handlers to be called on fulfillment or progress of this promise.
     * @param {Function} [onResolve] Called when this promise is resolved.
     * @param {Function} [onReject] Called when this promise is rejected.
     * @param {Function} [onProgress] May be called to report progress events on this promise.
     * @returns {orion.Promise} A new promise that is fulfilled when the given <code>onResolve</code> or <code>onReject</code>
     * callback is finished. The callback's return value gives the fulfillment value of the returned promise.
     */
    /**
     * Cancels this promise.
     * @name cancel
     * @function
     * @memberOf orion.Promise.prototype
     * @param {Object} reason The reason for canceling this promise.
     * @param {Boolean} [strict]
     */

    /**
     * @name orion.Deferred
     * @borrows orion.Promise#then as #then
     * @borrows orion.Promise#cancel as #cancel
     * @class Provides abstraction over asynchronous operations.
     * @description Deferred provides abstraction over asynchronous operations.
     *
     * <p>Because Deferred implements the {@link orion.Promise} interface, a Deferred may be used anywhere a Promise is called for.
     * However, in most such cases it is recommended to use the Deferred's {@link #promise} field instead, which exposes a 
     * simplified, minimally <a href="https://github.com/promises-aplus/promises-spec">Promises/A+</a>-compliant interface to callers.</p>
     */
    function Deferred() {
        var result, state, listeners = [],
            _this = this,
            _protected = {};

        Object.defineProperty(this, "_protected", {
            value: function(secret) {
                if (secret !== queue) {
                    throw new Error("protected");
                }
                return _protected;
            }
        });

        function notify() {
            var listener;
            while ((listener = listeners.shift())) {
                var deferred = listener.deferred;
                var methodName = state === "fulfilled" ? "resolve" : "reject"; //$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$
                if (typeof listener[methodName] === "function") { //$NON-NLS-0$
                    try {
                        var fn = listener[methodName];
                        var listenerResult = fn(result);
                        var listenerThen = listenerResult && (typeof listenerResult === "object" || typeof listenerResult === "function") && listenerResult.then;
                        if (typeof listenerThen === "function") {
                            if (listenerResult === deferred.promise) {
                                deferred.reject(new TypeError());
                            } else {
                                var listenerResultCancel = listenerResult.cancel;
                                if (typeof listenerResultCancel === "function") {
                                    deferred._protected(queue).parentCancel = listenerResultCancel.bind(listenerResult);
                                } else {
                                    delete deferred._protected(queue).parentCancel;
                                }
                                listenerThen.call(listenerResult, noReturn(deferred.resolve), noReturn(deferred.reject), noReturn(deferred.progress));
                            }
                        } else {
                            deferred.resolve(listenerResult);
                        }
                    } catch (e) {
                        deferred.reject(e);
                    }
                } else {
                    deferred[methodName](result);
                }
            }
        }

        function _reject(error) {
            delete _protected.parentCancel;
            state = "rejected";
            result = error;
            if (listeners.length) {
                enqueue(notify);
            }
        }

        function _resolve(value) {
            var called = false;

            function once(fn) {
                return function(value) {
                    if (!called) {
                        called = true;
                        fn(value);
                    }
                };
            }
            delete _protected.parentCancel;
            try {
                var valueThen = value && (typeof value === "object" || typeof value === "function") && value.then;
                if (typeof valueThen === "function") {
                    if (value === _this) {
                        _reject(new TypeError());
                    } else {
                        state = "assumed";
                        var valueCancel = value && value.cancel;
                        if (typeof valueCancel !== "function") {
                            var deferred = new Deferred();
                            value = deferred.promise;
                            try {
                                valueThen(deferred.resolve, deferred.reject, deferred.progress);
                            } catch (thenError) {
                                deferred.reject(thenError);
                            }
                            valueCancel = value.cancel;
                            valueThen = value.then;
                        }
                        result = value;
                        valueThen.call(value, once(_resolve), once(_reject));
                        _protected.parentCancel = valueCancel.bind(value);
                    }
                } else {
                    state = "fulfilled";
                    result = value;
                    if (listeners.length) {
                        enqueue(notify);
                    }
                }
            } catch (error) {
                once(_reject)(error);
            }
        }

        function cancel() {
            var parentCancel = _protected.parentCancel;
            if (parentCancel) {
                delete _protected.parentCancel;
                parentCancel();
            } else if (!state) {
                var cancelError = new Error("Cancel");
                cancelError.name = "Cancel";
                _reject(cancelError);
            }
        }


        /**
         * Resolves this Deferred.
         * @name resolve
         * @function
         * @memberOf orion.Deferred.prototype
         * @param {Object} value
         * @returns {orion.Promise}
         */
        this.resolve = function(value) {
            if (!state) {
                _resolve(value);
            }
            return _this;
        };

        /**
         * Rejects this Deferred.
         * @name reject
         * @function
         * @memberOf orion.Deferred.prototype
         * @param {Object} error
         * @param {Boolean} [strict]
         * @returns {orion.Promise}
         */
        this.reject = function(error) {
            if (!state) {
                _reject(error);
            }
            return _this;
        };

        /**
         * Notifies listeners of progress on this Deferred.
         * @name progress
         * @function
         * @memberOf orion.Deferred.prototype
         * @param {Object} update The progress update.
         * @returns {orion.Promise}
         */
        this.progress = function(update) {
            if (!state) {
                listeners.forEach(function(listener) {
                    if (listener.progress) {
                        try {
                            listener.progress(update);
                        } catch (ignore) {
                            // ignore
                        }
                    }
                });
            }
            return _this.promise;
        };

        this.cancel = function() {
            if (_protected.parentCancel) {
                setTimeout(cancel, 0);
            } else {
                cancel();
            }

            return _this;
        };

        // Note: "then" ALWAYS returns before having onResolve or onReject called as per http://promises-aplus.github.com/promises-spec/
        this.then = function(onFulfill, onReject, onProgress) {
            var listener = {
                resolve: onFulfill,
                reject: onReject,
                progress: onProgress,
                deferred: new Deferred()
            };
            listeners.push(listener);
            listener.deferred._protected(queue).parentCancel = _this.promise.cancel.bind(_this);
            if (state === "fulfilled" || state === "rejected") {
                enqueue(notify);
            }
            return listener.deferred.promise;
        };

        /**
         * The promise exposed by this Deferred.
         * @name promise
         * @field
         * @memberOf orion.Deferred.prototype
         * @type orion.Promise
         */
        this.promise = {
            then: _this.then,
            cancel: _this.cancel
        };
    }

    /**
     * Returns a promise that represents the outcome of all the input promises.
     * <p>When <code>all</code> is called with a single parameter, the returned promise has <dfn>eager</dfn> semantics,
     * meaning that if any input promise rejects, the returned promise immediately rejects, without waiting for the rest of the
     * input promises to fulfill.</p>
     *
     * To obtain <dfn>lazy</dfn> semantics (meaning the returned promise waits for every input promise to fulfill), pass the
     * optional parameter <code>optOnError</code>.
     * @name all
     * @function
     * @memberOf orion.Deferred
     * @static
     * @param {orion.Promise[]} promises The input promises.
     * @param {Function} [optOnError] Handles a rejected input promise. <code>optOnError</code> is invoked for every rejected
     * input promise, and is passed the reason the input promise was rejected. <p><code>optOnError</code> can return a value, which
     * allows it to act as a transformer: the return value serves as the final fulfillment value of the rejected promise in the 
     * results array generated by <code>all</code>.
     * @returns {orion.Promise} A new promise. The returned promise is generally fulfilled to an <code>Array</code> whose elements
     * give the fulfillment values of the input promises. <p>However, if an input promise rejects and eager semantics is used, the 
     * returned promise will instead be fulfilled to a single error value.</p>
     */
    Deferred.all = function(promises, optOnError) {
        var count = promises.length,
            result = [],
            rejected = false,
            deferred = new Deferred();

        deferred.then(undefined, function() {
            rejected = true;
            promises.forEach(function(promise) {
                if (promise.cancel) {
                    promise.cancel();
                }
            });
        });

        function onResolve(i, value) {
            if (!rejected) {
                result[i] = value;
                if (--count === 0) {
                    deferred.resolve(result);
                }
            }
        }

        function onReject(i, error) {
            if (!rejected) {
                if (optOnError) {
                    try {
                        onResolve(i, optOnError(error));
                        return;
                    } catch (e) {
                        error = e;
                    }
                }
                deferred.reject(error);
            }
        }

        if (count === 0) {
            deferred.resolve(result);
        } else {
            promises.forEach(function(promise, i) {
                promise.then(onResolve.bind(undefined, i), onReject.bind(undefined, i));
            });
        }
        return deferred.promise;
    };

    /**
     * Applies callbacks to a promise or to a regular object.
     * @name when
     * @function
     * @memberOf orion.Deferred
     * @static
     * @param {Object|orion.Promise} value Either a {@link orion.Promise}, or a normal value.
     * @param {Function} onResolve Called when the <code>value</code> promise is resolved. If <code>value</code> is not a promise,
     * this function is called immediately.
     * @param {Function} onReject Called when the <code>value</code> promise is rejected. If <code>value</code> is not a promise, 
     * this function is never called.
     * @param {Function} onProgress Called when the <code>value</code> promise provides a progress update. If <code>value</code> is
     * not a promise, this function is never called.
     * @returns {orion.Promise} A new promise.
     */
    Deferred.when = function(value, onResolve, onReject, onProgress) {
        var promise, deferred;
        if (value && typeof value.then === "function") { //$NON-NLS-0$
            promise = value;
        } else {
            deferred = new Deferred();
            deferred.resolve(value);
            promise = deferred.promise;
        }
        return promise.then(onResolve, onReject, onProgress);
    };

    return Deferred;
}));

/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global console window define document*/
/*jslint regexp:false*/

define('orion/webui/littlelib',["orion/util"], function(util) {
	/**
	 * @name orion.webui.littlelib
	 * @class A small library of DOM and UI helpers.
	 */

	/**
	 * Alias for <code>node.querySelector()</code>.
	 * @name orion.webui.littlelib.$
	 * @function
	 * @static
	 * @param {String} selectors Selectors to match on.
	 * @param {Node} [node=document] Node to query under.
	 * @returns {Element}
	 */
	function $(selector, node) {
		if (!node) {
			node = document;
		}
		return node.querySelector(selector);
	}

	/**
	 * Alias for <code>node.querySelectorAll()</code>.
	 * @name orion.webui.littlelib.$$
	 * @function
	 * @static
	 * @param {String} selectors Selectors to match on.
	 * @param {Node} [node=document] Node to query under.
	 * @returns {NodeList}
	 */
	function $$(selector, node) {
		if (!node) {
			node = document;
		}
		return node.querySelectorAll(selector);
	}

	/**
	 * Identical to {@link orion.webui.littlelib.$$}, but returns an Array instead of a NodeList.
	 * @name orion.webui.littlelib.$$array
	 * @function
	 * @static
	 * @param {String} selectors Selectors to match on.
	 * @param {Node} [node=document] Node to query under.
	 * @returns {Element[]}
	 */
	function $$array(selector, node) {
		return Array.prototype.slice.call($$(selector,node));
	}

	/**
	 * Alias for <code>document.getElementById</code>, but returns the input unmodified when passed a Node (or other non-string).
	 * @function
	 * @param {String|Element} elementOrId
	 * @returns {Element}
	 */
	function node(either) {
		var theNode = either;
		if (typeof(either) === "string") { //$NON-NLS-0$
			theNode = document.getElementById(either);
		}	
		return theNode;
	}

	/**
	 * Returns whether <code>child</code> is a descendant of <code>parent</code> in the DOM order.
	 * @function
	 * @param {Node} parent
	 * @param {Node} child
	 * @returns {Boolean}
	 */
	function contains(parent, child) {
		if (!parent || !child) { return false; }
		if (parent === child) { return true; }
		var compare = parent.compareDocumentPosition(child);  // useful to break out for debugging
		return Boolean(compare & 16);
	}

	/**
	 * Returns the bounds of a node. The returned coordinates are absolute (not relative to the viewport).
	 * @function
	 * @param {Node} node
	 * @returns {Object}
	 */
	function bounds(node) {
		var clientRect = node.getBoundingClientRect();
		return { 
			left: clientRect.left + document.documentElement.scrollLeft,
			top: clientRect.top + document.documentElement.scrollTop,
			width: clientRect.width,
			height: clientRect.height
		};
	}

	/**
	 * Removes all children of the given node.
	 * @name orion.webui.littlelib.empty
	 * @function
	 * @static
	 * @param {Node} node
	 */
	function empty(node) {
		while (node.hasChildNodes()) {
			var child = node.firstChild;
			node.removeChild(child);
		}
	}

	function _getTabIndex(node) {
		var result = node.tabIndex;
		if (result === 0 && util.isIE) {
			/*
			 * The default value of tabIndex is 0 on IE, even for elements that are not focusable
			 * by default (http://msdn.microsoft.com/en-us/library/ie/ms534654(v=vs.85).aspx).
			 * Handle this browser difference by treating this value as -1 if the node is a type
			 * that is not focusable by default according to the MS doc and has not had this
			 * attribute value explicitly set on it.
			 */
			var focusableElements = {
				a: true,
				body: true,
				button: true,
				frame: true,
				iframe: true,
				img: true,
				input: true,
				isindex: true,
				object: true,
				select: true,
				textarea: true
			};
			if (!focusableElements[node.nodeName.toLowerCase()] && !node.attributes.tabIndex) {
				result = -1;
			}
		}
		return result;
	}

	/* 
	 * Inspired by http://brianwhitmer.blogspot.com/2009/05/jquery-ui-tabbable-what.html
	 */
	function firstTabbable(node) {
		if (_getTabIndex(node) >= 0) {
			return node;
		}
		if (node.hasChildNodes()) {
			for (var i=0; i<node.childNodes.length; i++) {
				var result = firstTabbable(node.childNodes[i]);
				if (result) {
					return result;
				}
			}
		}
		return null;
	}
	
	function lastTabbable(node) {
		if (_getTabIndex(node) >= 0) {
			return node;
		}
		if (node.hasChildNodes()) {
			for (var i=node.childNodes.length - 1; i>=0; i--) {
				var result = lastTabbable(node.childNodes[i]);
				if (result) {
					return result;
				}
			}
		}
		return null;
	}

	var variableRegEx = /\$\{([^\}]+)\}/;
	// Internal helper
	function processNodes(node, replace) {
		if (node.nodeType === 3) { // TEXT_NODE
			var matches = variableRegEx.exec(node.nodeValue);
			if (matches && matches.length > 1) {
				replace(node, matches);
			}
		}
		if (node.hasChildNodes()) {
			for (var i=0; i<node.childNodes.length; i++) {
				processNodes(node.childNodes[i], replace);
			}
		}
	}

	/**
	 * Performs substitution of strings into textContent within the given node and its descendants. An occurrence of <code>${n}</code>
	 * in text content will be replaced with the string <code>messages[n]</code>.
	 * <p>This function is recommended for binding placeholder text in template-created DOM elements to actual display strings.</p>
	 * @name orion.webui.littlelib.processTextNodes
	 * @function
	 * @param {Node} node The node to perform replacement under.
	 * @param {String[]} messages The replacement strings.
	 */
	function processTextNodes(node, messages) {
		processNodes(node, function(targetNode, matches) {
			var replaceText = messages[matches[1]] || matches[1];
			targetNode.parentNode.replaceChild(document.createTextNode(replaceText), targetNode);
		});
	}

	/**
	 * Performs substitution of DOM nodes into textContent within the given node and its descendants. An occurrence of <code>${n}</code>
	 * in text content will be replaced by the DOM node <code>replaceNodes[n]</code>.
	 * <p>This function is recommended for performing rich-text replacement within a localized string. The use of actual DOM nodes
	 * avoids the need for embedded HTML in strings.</p>
	 * @name orion.webui.littlelib.processDOMNodes
	 * @function
	 * @param {Node} node The node to perform replacement under.
	 * @param {Node[]} replaceNodes The replacement nodes.
	 */
	function processDOMNodes(node, replaceNodes) {
		processNodes(node, function(targetNode, matches) {
			var replaceNode = replaceNodes[matches[1]];
			if (replaceNode) {
				var range = document.createRange();
				var start = matches.index;
				range.setStart(targetNode, start);
				range.setEnd(targetNode, start + matches[0].length);
				range.deleteContents();
				range.insertNode(replaceNode);
			}
		});
	}

	/**
	 * Adds auto-dismiss functionality to the document. When a click event occurs whose <code>target</code> is not a descendant of
	 * one of the <code>excludeNodes</code>, the <code>dismissFunction</code> is invoked.
	 * @name orion.webui.littlelib.addAutoDismiss
	 * @function
	 * @static
	 * @param {Node[]} excludeNodes Clicks targeting any descendant of these nodes will not trigger the dismissFunction.
	 * @param {Function} dismissFunction The dismiss handler.
	 */
	
	var autoDismissNodes = null;

	function addAutoDismiss(excludeNodes, dismissFunction) {
		// auto dismissal.  Click anywhere else means close.
		function onclick(event) {
			autoDismissNodes.forEach(function(autoDismissNode) {
				var excludeNodeInDocument = false;
				var excluded = autoDismissNode.excludeNodes.some(function(excludeNode) {
					if(document.body.contains(excludeNode)) {
						excludeNodeInDocument = true;
						return excludeNode.contains(event.target);
					}
					return false;
				});
				if (excludeNodeInDocument && !excluded) {
					try {
						autoDismissNode.dismiss(event);
					} catch (e) {
						if (typeof console !== "undefined" && console) { //$NON-NLS-0$
							console.error(e && e.message);
						}
					}
				}
			});
			autoDismissNodes = autoDismissNodes.filter(function(autoDismissNode) {
				// true if at least one excludeNode is in document.body
				return autoDismissNode.excludeNodes.some(function(excludeNode) {
					return document.body.contains(excludeNode);
				});
			});
		}

		// Hook listener only once
		if (autoDismissNodes === null) {
			autoDismissNodes = [];
			document.addEventListener("click", onclick, true); //$NON-NLS-0$
			if (util.isIOS) {
				document.addEventListener("touchend", function(event){
					function unhook(){
						event.target.removeEventListener("click", unhook);
					}
					if (event.touches.length === 0) {
						// we need a click eventlistener on the target to have ios really trigger a click
						event.target.addEventListener("click", unhook);
					}	
				}, false);
			}
		}
		
		autoDismissNodes.push({excludeNodes: excludeNodes, dismiss: dismissFunction});
	}
	
	/**
	 * Removes all auto-dismiss nodes which trigger the specified dismiss function.
	 * 
	 * @name orion.webui.littlelib.removeAutoDismiss
	 * @function
	 * @static
	 * @param {Function} dismissFunction The dismiss function to look for.
	 */
	function removeAutoDismiss(dismissFunction) {
		autoDismissNodes = autoDismissNodes.filter(function(autoDismissNode) {
			return dismissFunction !== autoDismissNode.dismiss;
		});
	}
	
	/**
	 * Cancels the default behavior of an event and stops its propagation.
	 * @name orion.webui.littlelib.stop
	 * @function
	 * @static
	 * @param {Event} event
	 */
	function stop(event) {
		if (window.document.all) { 
			event.keyCode = 0;
		}
		if (event.preventDefault) {
			event.preventDefault();
			event.stopPropagation();
		}
	}
	
	function setFramesEnabled(enable) {
		var frames = document.getElementsByTagName("iframe"); //$NON-NLS-0$
		for (var i = 0; i<frames.length; i++) {
			frames[i].parentNode.style.pointerEvents = enable ? "" : "none"; //$NON-NLS-0$
		}
	}

	/**
	 * Holds useful <code>keyCode</code> values.
	 * @name orion.webui.littlelib.KEY
	 * @static
	 */
	var KEY = {
		BKSPC: 8,
		TAB: 9,
		ENTER: 13,
		ESCAPE: 27,
		SPACE: 32,
		PAGEUP: 33,
		PAGEDOWN: 34,
		END: 35,
		HOME: 36,
		LEFT: 37,
		UP: 38,
		RIGHT: 39,
		DOWN: 40,
		INSERT: 45,
		DEL: 46
	};
		
	//return module exports
	return {
		$: $,
		$$: $$,
		$$array: $$array,
		node: node,
		contains: contains,
		bounds: bounds,
		empty: empty,
		firstTabbable: firstTabbable,
		lastTabbable: lastTabbable,
		stop: stop,
		processTextNodes: processTextNodes,
		processDOMNodes: processDOMNodes,
		addAutoDismiss: addAutoDismiss,
		setFramesEnabled: setFramesEnabled,
		removeAutoDismiss: removeAutoDismiss,
		KEY: KEY
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global console define */
/*jslint browser:true */

define("orion/editor/contentAssist", [ //$NON-NLS-0$
	'i18n!orion/editor/nls/messages', //$NON-NLS-0$
	'orion/keyBinding', //$NON-NLS-0$
	'orion/editor/keyModes', //$NON-NLS-0$
	'orion/editor/eventTarget', //$NON-NLS-0$
	'orion/Deferred', //$NON-NLS-0$
	'orion/objects', //$NON-NLS-0$
	'orion/editor/util', //$NON-NLS-0$
	'orion/util', //$NON-NLS-0$
	'orion/webui/littlelib' //$NON-NLS-0$
], function(messages, mKeyBinding, mKeyModes, mEventTarget, Deferred, objects, textUtil, util, lib) {
	/**
	 * @name orion.editor.ContentAssistProvider
	 * @class Interface defining a provider of content assist proposals.
	 */
	/**
	 * @memberOf orion.editor.ContentAssistProvider.prototype
	 * @function
	 * @name computeProposals
	 * @param {String} buffer The buffer being edited.
	 * @param {Number} offset The position in the buffer at which content assist is being requested.
	 * @param {orion.editor.ContentAssistProvider.Context} context
	 * @returns {Object[]} This provider's proposals for the given buffer and offset.
	 */
	/**
	 * @name orion.editor.ContentAssistProvider.Context
	 * @class
	 * @property {String} line The text of the line on which content assist is being requested.
	 * @property {String} prefix Any non-whitespace, non-symbol characters preceding the offset.
	 * @property {orion.editor.Selection} selection The current selection.
	 */

	/**
	 * @name orion.editor.ContentAssist
	 * @class Provides content assist for a TextView.
	 * @description Creates a <code>ContentAssist</code> for a TextView. A ContentAssist consults a set of 
	 * {@link orion.editor.ContentAssistProvider}s to obtain proposals for text that may be inserted into a
	 * TextView at a given offset.<p>
	 * A ContentAssist is generally activated by its TextView action, at which point it computes the set of 
	 * proposals available. It will re-compute the proposals in response to subsequent changes on the TextView 
	 * (for example, user typing) for as long as the ContentAssist is active. A proposal may be applied by calling 
	 * {@link #apply}, after which the ContentAssist becomes deactivated. An active ContentAssist may be deactivated
	 * by calling {@link #deactivate}.<p>
	 * A ContentAssist dispatches events when it becomes activated or deactivated, and when proposals have been computed.
	 * @param {orion.editor.TextView} textView The TextView to provide content assist for.
	 * @borrows orion.editor.EventTarget#addEventListener as #addEventListener
	 * @borrows orion.editor.EventTarget#removeEventListener as #removeEventListener
	 * @borrows orion.editor.EventTarget#dispatchEvent as #dispatchEvent
	 */
	/**
	 * Dispatched when a ContentAssist is about to be activated.
	 * @name orion.editor.ContentAssist#ActivatingEvent
	 * @event
	 */
	/**
	 * Dispatched when a ContentAssist is about to be deactivated.
	 * @name orion.editor.ContentAssist#DeactivatingEvent
	 * @event
	 */
	/**
	 * Dispatched when a ContentAssist has applied a proposal. <p>This event's <code>data</code> field gives information
	 * about the proposal that was applied.
	 * @name orion.editor.ContentAssist#ProposalAppliedEvent
	 * @event
	 */
	/**
	 * Dispatched whenever a ContentAssist has obtained proposals from its providers. <p>This event's
	 * <code>data</code> field gives information about the proposals.
	 * @name orion.editor.ContentAssist#ProposalsComputedEvent
	 * @event
	 */
		
	// INACTIVE --Ctrl+Space--> ACTIVE --ModelChanging--> FILTERING
	var State = {
		INACTIVE: 1,
		ACTIVE: 2,
		FILTERING: 3
	};
	
	var STYLES = {
		selected : "selected", //$NON-NLS-0$
		hr : "proposal-hr", //$NON-NLS-0$
		emphasis : "proposal-emphasis", //$NON-NLS-0$
		noemphasis : "proposal-noemphasis", //$NON-NLS-0$
		noemphasis_keyword : "proposal-noemphasis-keyword", //$NON-NLS-0$
		noemphasis_title : "proposal-noemphasis-title", //$NON-NLS-0$
		noemphasis_title_keywords : "proposal-noemphasis-title-keywords", //$NON-NLS-0$
		dfault : "proposal-default" //$NON-NLS-0$
	};
	
	function ContentAssist(textView) {
		this.textView = textView;
		this.state = State.INACTIVE;
		this.resetProviderInfoArray();
		var self = this;
		this.contentAssistListener = {
			onModelChanging: (function(event) {
				this._latestModelChangingEvent = event;
			}).bind(this),
			onSelection: (function(event) {
				if (this.isDeactivatingChange(this._latestModelChangingEvent, event)) {
					this.setState(State.INACTIVE);
				} else {
					if (this.isActive()) {
						if (this.state === State.ACTIVE) {
							this.setState(State.FILTERING);
						}
						this.filterProposals(event);
					}
				}
				this._latestModelChangingEvent = null;
			}).bind(this),
			onScroll: (function(event) {
				this.setState(State.INACTIVE);
			}).bind(this)
		};
		
		textView.setKeyBinding(util.isMac ? new mKeyBinding.KeyBinding(' ', false, false, false, true) : new mKeyBinding.KeyBinding(' ', true), "contentAssist"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		textView.setKeyBinding(util.isMac ? new mKeyBinding.KeyBinding(' ', false, false, true, true) : new mKeyBinding.KeyBinding(' ', true, false, true), "contentAssist"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		textView.setAction("contentAssist", function() { //$NON-NLS-0$
			if (!textView.getOptions("readonly")) { //$NON-NLS-0$
				self.activate();
			}
			return true;
		}, {name: messages.contentAssist});
	}
	ContentAssist.prototype = /** @lends orion.editor.ContentAssist.prototype */ {
		/**
		 * Applies the given proposal to the TextView.
		 * @param {Object} [proposal]
		 * @returns {Boolean} <code>true</code> if the proposal was applied; <code>false</code> if no proposal was provided.
		 */
		apply: function(proposal) {
			if (!proposal) {
				return false;
			}
	
			// now handle prefixes
			// if there is a non-empty selection, then replace it,
			// if overwrite is truthy, then also replace the prefix
			var view = this.textView;
			var sel = view.getSelection();
			var start = this._initialCaretOffset;
			var mapStart = start;
			var end = Math.max(sel.start, sel.end), mapEnd = end;
			var model = view.getModel();
			if (model.getBaseModel) {
				mapStart = model.mapOffset(mapStart);
				mapEnd = model.mapOffset(mapEnd);
				model = model.getBaseModel();
			}
			
			if (proposal.overwrite) {
				start = this.getPrefixStart(model, mapStart);
			}

			var data = {
				proposal: proposal,
				start: mapStart,
				end: mapEnd
			};
			this.setState(State.INACTIVE);
			var proposalText = typeof proposal === "string" ? proposal : proposal.proposal; //$NON-NLS-0$
			view.setText(proposalText, start, end);
			this.dispatchEvent({type: "ProposalApplied", data: data}); //$NON-NLS-0$
			return true;
		},
		activate: function(providerInfoArray, autoTriggered) {
			if (this.state === State.INACTIVE) {
				this._autoTriggered = autoTriggered ? true : false;
				this.setState(State.ACTIVE, providerInfoArray);
			}
		},
		deactivate: function() {
			this.setState(State.INACTIVE);
		},
		/** @returns {orion.editor.TextView} */
		getTextView: function() {
			return this.textView;
		},
		/** @returns {Boolean} */
		isActive: function() {
			return this.state === State.ACTIVE || this.state === State.FILTERING;
		},
		/** @returns {Boolean} <code>true</code> if the event describes a change that should deactivate content assist. */
		isDeactivatingChange: function(/**orion.editor.ModelChangingEvent*/ event, selectionEvent) {
			var isDeactivating = false;
			
			var isPriorToInitialCaretOffset = selectionEvent.newValue.start < this._initialCaretOffset;
			
			if (isPriorToInitialCaretOffset) {
				isDeactivating = true;
			} else if (event) {
				isDeactivating = (event.removedLineCount > 0) || (event.addedLineCount > 0);
			}
			
			return isDeactivating;
		},
		/** @private */
		setState: function(state, /* Optional. Array of providers to pass to dispatched event.*/ providerInfoArray) {
			var eventType;
			if (state === State.ACTIVE) {
				this._filterText = "";
				eventType = "Activating"; //$NON-NLS-0$
				if (this._mode) { this._mode.setActive(true); }
				
			} else if (state === State.INACTIVE) {
				eventType = "Deactivating"; //$NON-NLS-0$
				if (this._mode) { this._mode.setActive(false); }
				this._initialCaretOffset = -1;
				this._filterText = "";
			}
			if (eventType) {
				this.dispatchEvent({type: eventType, providerInfoArray: providerInfoArray});
			}
			this.state = state;
			this.onStateChange(state);
		},
		setMode: function(mode) {
			this._mode = mode;
		},
		/** @private */
		onStateChange: function(state) {
			if (state === State.INACTIVE) {
				if (this.listenerAdded) {
					this._latestModelChangingEvent = null;
					this.textView.removeEventListener("ModelChanging", this.contentAssistListener.onModelChanging); //$NON-NLS-0$
					this.textView.removeEventListener("Scroll", this.contentAssistListener.onScroll); //$NON-NLS-0$
					this.textView.removeEventListener("Selection", this.contentAssistListener.onSelection); //$NON-NLS-0$
					this.listenerAdded = false;
				}
			} else if (state === State.ACTIVE) {
				if (!this.listenerAdded) {
					this.textView.addEventListener("ModelChanging", this.contentAssistListener.onModelChanging); //$NON-NLS-0$
					this.textView.addEventListener("Scroll", this.contentAssistListener.onScroll); //$NON-NLS-0$
					this.textView.addEventListener("Selection", this.contentAssistListener.onSelection); //$NON-NLS-0$
					this.listenerAdded = true;
				}
				this.computeProposals();
			}
		},
		/**
		 * Computes the proposals at the TextView's current caret offset.
		 */
		computeProposals: function() {
			var self = this;
			
			// figure out initial offset, it should be the minimum between 
			// the beginning of the selection and the current caret offset
			var offset = this.textView.getCaretOffset();
			var sel = this.textView.getSelection();
			var selectionStart = Math.min(sel.start, sel.end);			
			this._initialCaretOffset = Math.min(offset, selectionStart);
			
			this._computeProposals(this._initialCaretOffset).then(function(proposals) {
				self._computedProposals = proposals;
				if (!self.isActive()) { return; }
				var displayProposals = self._flatten(proposals);
				self.dispatchEvent({type: "ProposalsComputed", data: {proposals: displayProposals}, autoApply: !self._autoTriggered}); //$NON-NLS-0$
			});
		},
		/** @private */
		getPrefixStart: function(model, end) {
			var index = end;
			while (index > 0 && /[A-Za-z0-9_]/.test(model.getText(index - 1, index))) {
				index--;
			}
			return index;
		},
		handleError: function(error) {
			if (typeof console !== "undefined") { //$NON-NLS-0$
				console.log("Error retrieving content assist proposals"); //$NON-NLS-0$
				console.log(error && error.stack);
			}
		},
		/**
		 * Retrieves the proposals at the given offset.
		 * @private
		 * @param {Number} offset The caret offset.
		 * @returns {Deferred} A promise that will provide the proposals.
		 */
		_computeProposals: function(offset) {
			var providerInfoArray = this._providerInfoArray;
			var textView = this.textView;
			var sel = textView.getSelection();
			var model = textView.getModel(), mapOffset = offset;
			if (model.getBaseModel) {
				mapOffset = model.mapOffset(mapOffset);
				sel.start = model.mapOffset(sel.start);
				sel.end = model.mapOffset(sel.end);
				model = model.getBaseModel();
			}
			var line = model.getLine(model.getLineAtOffset(mapOffset));
			var index = 0;
			while (index < line.length && /\s/.test(line.charAt(index))) {
				index++;
			}
			var indentation = line.substring(0, index);
			var options = textView.getOptions("tabSize", "expandTab"); //$NON-NLS-1$ //$NON-NLS-0$
			var tab = options.expandTab ? new Array(options.tabSize + 1).join(" ") : "\t"; //$NON-NLS-1$ //$NON-NLS-0$
			var params = {
				line: line,
				offset: mapOffset,
				prefix: model.getText(this.getPrefixStart(model, mapOffset), mapOffset),
				selection: sel,
				delimiter: model.getLineDelimiter(),
				tab: tab,
				indentation: indentation
			};
			var self = this;
			var promises = providerInfoArray.map(function(providerInfo) {
				var provider = providerInfo.provider;
				var proposals;
				try {
					var func, promise;
					if ((func = provider.computeContentAssist)) {
						var ecProvider = self.editorContextProvider, editorContext = ecProvider.getEditorContext();
						params = objects.mixin(params, ecProvider.getOptions());
						promise = func.apply(provider, [editorContext, params]);
					} else if ((func = provider.getProposals || provider.computeProposals)) {
						// old API
						promise = func.apply(provider, [model.getText(), mapOffset, params]);
					}
					proposals = self.progress ? self.progress.progress(promise, "Generating content assist proposal") : promise; //$NON-NLS-0$
				} catch (e) {
					self.handleError(e);
				}
				return Deferred.when(proposals);
			});
			return Deferred.all(promises, this.handleError);
		},

		filterProposals: function(event) {
			var text = "";
			var removedCharCount = 0;
			if (this._latestModelChangingEvent) {
				text = this._latestModelChangingEvent.text;
				removedCharCount = this._latestModelChangingEvent.removedCharCount;
			} else {
				// the selection was changed but not the model, do nothing for now
				return;
			}
			
			// update this._filterText based on the modification info
			// contained in the event
			if (removedCharCount) {
				var lastIndex = this._filterText.length - removedCharCount;
				this._filterText = this._filterText.substring(0, lastIndex);
			}
			if (text) {
				this._filterText = this._filterText.concat(text);
			}
			
			var model = this.textView.getModel();
			if (model.getBaseModel) {
				model = model.getBaseModel();
			}
			
			var prefixStart = this.getPrefixStart(model, this._initialCaretOffset);
			var prefixText = this.textView.getText(prefixStart, this._initialCaretOffset);
			
			// filter proposals based on prefixes and _filterText
			var proposals = []; //array of arrays of proposals
			this._computedProposals.forEach(function(proposalArray) {
				var includedProposals = proposalArray.filter(function(proposal) {
					if ((STYLES[proposal.style] === STYLES.hr)
						|| (STYLES[proposal.style] === STYLES.noemphasis_title)) {
						return true;
					}
					
					var proposalString = "";
					if (proposal.overwrite) {
						if (proposal.name) {
							proposalString = proposal.name;
						} else if (proposal.proposal) {
							proposalString = proposal.proposal;
						} else {
							return false; // unknown format
						}
	
						return (0 === proposalString.indexOf(prefixText + this._filterText));
						
					} else if (proposal.name || proposal.proposal) {
						var activated = false;
						// try matching name
						if (proposal.name) {
							activated = (0 === proposal.name.indexOf(prefixText + this._filterText));	
						}
						
						// try matching proposal text
						if (!activated && proposal.proposal) {
							activated = (0 === proposal.proposal.indexOf(this._filterText));
						}
						
						return activated;
					} else if (typeof proposal === "string") { //$NON-NLS-0$
						return 0 === proposal.indexOf(this._filterText);
					} else {
						return false;
					}
				}, this);
				
				if (includedProposals.length > 0) {
					proposals.push(includedProposals);	
				}
			}, this);
			
			// filter out extra separators and titles
			proposals = this._removeExtraUnselectableElements(proposals);
			
			var displayProposals = this._flatten(proposals);
			
			this.dispatchEvent({type: "ProposalsComputed", data: {proposals: displayProposals}, autoApply: false}); //$NON-NLS-0$
		},
		
		/**
		 * Helper method which removes extra separators and titles from
		 * an array containing arrays of proposals from the various providers.
		 * @param{Array[]} proposals An array with each element containing an array of proposals
		 */
		_removeExtraUnselectableElements: function(proposals) {
			// get rid of extra separators and titles
			var mappedProposals = proposals.map(function(proposalArray) {
				var element = proposalArray.filter(function(proposal, index) {
					var keepElement = true;
					if (STYLES[proposal.style] === STYLES.hr) {
						if ((0 === index) || ((proposalArray.length - 1) === index)) {
							keepElement = false; // remove separators at first or last element
						} else if (STYLES.hr === STYLES[proposalArray[index - 1].style]) {
							keepElement = false; // remove separator preceeded by another separator
						}
					} else if (STYLES[proposal.style] === STYLES.noemphasis_title) {
						var nextProposal = proposalArray[index + 1];
						if (nextProposal) {
							// remove titles that preceed other titles, all of their subelements have already been filtered out
							if (STYLES[nextProposal.style] === STYLES.noemphasis_title) {
								keepElement = false;
							}
						} else {
							keepElement = false; //remove titles that are at the end of the array
						}
					}
					return keepElement;
				});
				return element;
			});
			
			return mappedProposals;
		},
		
		/**
		 * Sets the provider that will be invoked to generate the Editor Context service and options to any
		 * content assist providers that implement the v4.0 content assist API.
		 * @param {Object} editorContextProvider
		 */
		setEditorContextProvider: function(editorContextProvider) {
			this.editorContextProvider = editorContextProvider;
		},
		
		/**
		 * Helper method used to generate a unique ID for a provider.
		 * Note that the uniqueness of the ID is only guaranteed for the life of this
		 * object and if all of the other IDs are also generated using this method.
		 */
		_generateProviderId: function() {
			if (this._uniqueProviderIdCounter) {
				this._uniqueProviderIdCounter++;
			} else {
				this._uniqueProviderIdCounter = 0;
			}
			return "ContentAssistGeneratedID_" +  this._uniqueProviderIdCounter;
		},
		
		/**
		 * Sets whether or not automatic content assist triggering is enabled.
		 * @param {Boolean} enableAutoTrigger
		 */
		setAutoTriggerEnabled: function(enableAutoTrigger) {
			this._autoTriggerEnabled = enableAutoTrigger;
			this._updateAutoTriggerListenerState();
		},
		
		/**
		 * Sets the content assist providers that this ContentAssist will consult to obtain proposals.
		 * @param {orion.editor.ContentAssistProvider[]} providers The providers.
		 */
		setProviders: function(providers) {
			var providerInfoArray = providers.map(function(provider){
				return {
					provider: provider,
					id: this._generateProviderId()
				}
			}, this);
			
			this.setProviderInfoArray(providerInfoArray);
		},
		
		/**
		 * Sets the array of content assist provider info that this ContentAssist will 
		 * consult to obtain proposals and automatic triggers.
		 * @param {Array { provider: orion.editor.ContentAssistProvider, 
		 * 				   id: {String},
		 * 				   charTriggers: {RegExp},
		 * 				   excludedStyles: {RegExp}
		 * 				  }
		 * 		 } providers The providers.
		 */
		setProviderInfoArray: function(providerInfoArray) {
			this.resetProviderInfoArray();
			
			this._providerInfoArray = providerInfoArray;
			this._charTriggersInstalled = providerInfoArray.some(function(info){
				return info.charTriggers;
			});
			this._updateAutoTriggerListenerState();
		},
		
		resetProviderInfoArray: function() {
			this._providerInfoArray = [];
			this._charTriggersInstalled = false;
			this._updateAutoTriggerListenerState();
		},

		
		/**
		 * Sets the progress handler that will display progress information, if any are generated by content assist providers.
		 */
		setProgress: function(progress){
			this.progress = progress;
		},
		
		setStyleAccessor: function(styleAccessor) {
			this._styleAccessor = styleAccessor;
		},
		
		/**
		 * Flattens an array of arrays into a one-dimensional array.
		 * @param {Array[]} array
		 * @returns {Array}
		 */
		_flatten: function(arrayOrObjectArray) {
			
			return arrayOrObjectArray.reduce(function(prev, curr) {
				var returnValue = prev;
				
				// add current proposal array to flattened array
				// skip current elements that are not arrays
				if (Array.isArray(curr) && curr.length > 0) {		
					var first = curr;
					var last = prev;
					
					if (curr[0].style && (0 === STYLES[curr[0].style].indexOf(STYLES.noemphasis))) {
						// the style of the first element starts with noemphasis
						// add these proposals to the end of the array
						first = prev;
						last = curr;
					}
					
					if (first.length > 0) {
						if (first[first.length - 1].style && (STYLES.hr !== STYLES[first[first.length - 1].style])) {
							// add separator between proposals from different providers 
							// if the previous array didn't already end with a separator
							first = first.concat({
								proposal: '',
								name: '',
								description: '---------------------------------', //$NON-NLS-0$
								style: 'hr', //$NON-NLS-0$
								unselectable: true
							});
						}
					}
					
					returnValue = first.concat(last);
				}
				
				return returnValue;
			}, []);
		},
		
		_triggerListener: function(event) {
			if (this._styleAccessor) {
				var caretOffset = this.textView.getCaretOffset();
				var stylesAtOffset = null;
				var providerInfosToActivate = [];
				
				if (this._charTriggersInstalled) {
					var currentChar = this.textView.getText(caretOffset - 1, caretOffset);
					
					this._providerInfoArray.forEach(function(info) {
						// check if the charTriggers RegExp matches the currentChar
						// we're assuming that this will fail much more often than
						// the excludedStyles test so do this first for better performance
						var charTriggers = info.charTriggers;
						if (charTriggers && charTriggers.test(currentChar)) {
							var isExcluded = false;
							var excludedStyles = info.excludedStyles;
							if (excludedStyles) {
								if (!stylesAtOffset) {
									// lazily initialize this variable to avoid getting the styles
									// for every model modification, only ones that may trigger
									stylesAtOffset = this._styleAccessor.getStyles(caretOffset - 1);
								}
								// check if any of the styles match the excludedStyles RegExp
								isExcluded = stylesAtOffset.some(function (element) {
									return excludedStyles.test(element.style);
								});
							}
							if (!isExcluded) {
								providerInfosToActivate.push(info);
							}
						}
					}, this);
					
					if (providerInfosToActivate.length > 0) {
						this.activate(providerInfosToActivate, true);
					}
				}
			}
		},
		
		/**
		 * Private helper to install/uninstall the automatic trigger
		 * listener based on the state of the relevant booleans
		 */
		_updateAutoTriggerListenerState: function() {
			if (!this._boundTriggerListener) {
				this._boundTriggerListener = this._triggerListener.bind(this);
			}
			
			if (this._triggerListenerInstalled) {
				// uninstall the listener if necessary
				if (!this._autoTriggerEnabled || !this._charTriggersInstalled) {
					this.textView.removeEventListener("Modify", this._boundTriggerListener); //$NON-NLS-0$
					this._triggerListenerInstalled = false;
				}
			} else if (this._autoTriggerEnabled && this._charTriggersInstalled){
				// install the listener if necessary
				this.textView.addEventListener("Modify", this._boundTriggerListener); //$NON-NLS-0$
				this._triggerListenerInstalled = true;
			}
		}
	};
	mEventTarget.EventTarget.addMixin(ContentAssist.prototype);

	/**
	 * @name orion.editor.ContentAssistMode
	 * @class Editor mode for interacting with content assist proposals.
	 * @description Creates a ContentAssistMode. A ContentAssistMode is a key mode for {@link orion.editor.Editor}
	 * that provides interaction with content assist proposals retrieved from an {@link orion.editor.ContentAssist}. 
	 * Interaction is performed via the {@link #lineUp}, {@link #lineDown}, and {@link #enter} actions. An 
	 * {@link orion.editor.ContentAssistWidget} may optionally be provided to display which proposal is currently selected.
	 * @param {orion.editor.ContentAssist} contentAssist
	 * @param {orion.editor.ContentAssistWidget} [ContentAssistWidget]
	 */
	function ContentAssistMode(contentAssist, ContentAssistWidget) {
		var textView = contentAssist.textView;
		mKeyModes.KeyMode.call(this, textView);
		this.contentAssist = contentAssist;
		this.widget = ContentAssistWidget;
		this.proposals = [];
		var self = this;
		this.contentAssist.addEventListener("ProposalsComputed", function(event) { //$NON-NLS-0$
			self.proposals = event.data.proposals;
			if (self.proposals.length === 0) {
				self.selectedIndex = -1;
				self.cancel();
			} else {
				self.selectedIndex = 0;
				while(self.proposals[self.selectedIndex] && self.proposals[self.selectedIndex].unselectable) {
					self.selectedIndex++;
				}
				if (self.proposals[self.selectedIndex]) {
					if (self.widget) {
						var showWidget = true;
						
						if (event.autoApply) {
							var nextIndex = self.selectedIndex + 1;
							while (self.proposals[nextIndex] && self.proposals[nextIndex].unselectable) {
								nextIndex++;
							}
							if (!self.proposals[nextIndex]) {
								// if there is only one selectable proposal apply it automatically
								showWidget = false;
								self.contentAssist.apply(self.proposals[self.selectedIndex]);
							}
						}
						
						if (showWidget) {
							self.widget.show();
							self.widget.selectNode(self.selectedIndex);
						}
					}
				} else {
					self.selectedIndex = -1; // didn't find any selectable items
					self.cancel();
				}
			}
		});
		textView.setAction("contentAssistApply", function() { //$NON-NLS-0$
			return this.enter();
		}.bind(this));
		textView.setAction("contentAssistCancel", function() { //$NON-NLS-0$
			return this.cancel();
		}.bind(this));
		textView.setAction("contentAssistNextProposal", function() { //$NON-NLS-0$
			return this.lineDown();
		}.bind(this));
		textView.setAction("contentAssistPreviousProposal", function() { //$NON-NLS-0$
			return this.lineUp();
		}.bind(this));
		textView.setAction("contentAssistNextPage", function() { //$NON-NLS-0$
			return this.pageDown();
		}.bind(this));
		textView.setAction("contentAssistPreviousPage", function() { //$NON-NLS-0$
			return this.pageUp();
		}.bind(this));
		textView.setAction("contentAssistHome", function() { //$NON-NLS-0$
			if (this.widget) {
				this.widget.scrollIndex(0, true);
			}
			return this.lineDown(0); // select first selectable element starting at the top and moving downwards
		}.bind(this));
		textView.setAction("contentAssistEnd", function() { //$NON-NLS-0$
			return this.lineUp(this.proposals.length - 1); // select first selectable element starting at the bottom and moving up
		}.bind(this));
		textView.setAction("contentAssistTab", function() { //$NON-NLS-0$
			return this.tab();
		}.bind(this));
		
		if (this.widget) {
			this.widget.setContentAssistMode(this);
			this.widget.createAccessible();
		}
	}
	ContentAssistMode.prototype = new mKeyModes.KeyMode();
	objects.mixin(ContentAssistMode.prototype, {
		createKeyBindings: function() {
			var KeyBinding = mKeyBinding.KeyBinding;
			var bindings = [];
			bindings.push({actionID: "contentAssistApply", keyBinding: new KeyBinding(13)}); //$NON-NLS-0$
			bindings.push({actionID: "contentAssistCancel", keyBinding: new KeyBinding(27)}); //$NON-NLS-0$
			bindings.push({actionID: "contentAssistNextProposal", keyBinding: new KeyBinding(40)}); //$NON-NLS-0$
			bindings.push({actionID: "contentAssistPreviousProposal", keyBinding: new KeyBinding(38)}); //$NON-NLS-0$
			bindings.push({actionID: "contentAssistNextPage", keyBinding: new KeyBinding(34)}); //$NON-NLS-0$
			bindings.push({actionID: "contentAssistPreviousPage", keyBinding: new KeyBinding(33)}); //$NON-NLS-0$
			bindings.push({actionID: "contentAssistHome", keyBinding: new KeyBinding(lib.KEY.HOME)}); //$NON-NLS-0$
			bindings.push({actionID: "contentAssistEnd", keyBinding: new KeyBinding(lib.KEY.END)}); //$NON-NLS-0$
			bindings.push({actionID: "contentAssistTab", keyBinding: new KeyBinding(9)}); //$NON-NLS-0$
			return bindings;
		},
		cancel: function() {
			this.getContentAssist().deactivate();
		},
		/** @private */
		getContentAssist: function() {
			return this.contentAssist;
		},
		getProposals: function() {
			return this.proposals;	
		},
		isActive: function() {
			return this.getContentAssist().isActive();
		},
		setActive: function(active) {
			if (active) {
				this.contentAssist.textView.addKeyMode(this);
			} else {
				this.contentAssist.textView.removeKeyMode(this);
			}
		},
		/**
		 * Selects a selectable item in the content assist widget
		 * iterating backwards for .
		 * 
		 * @param index {number} Optional. The index of the item to try and select. 
		 */
		lineUp: function(index, noWrap) {
			return this.selectNew(index, noWrap, false);
		},
		/**
		 * Selects the item at the specified index or the next
		 * selectable item
		 */
		lineDown: function(index, noWrap) {
			return this.selectNew(index, noWrap, true);
		},
		selectNew: function(index, noWrap, forward) {
			var newIndex = index;
			
			if (forward) {
				if (undefined === newIndex) {
					newIndex = this.selectedIndex + 1;
				}
				// handle wrap around
				if (newIndex >= this.proposals.length) {
					if (noWrap) {
						return true; // do nothing
					} else {
						newIndex = 0;	
					}
				}
			} else {
				if (undefined === newIndex) {
					newIndex = this.selectedIndex - 1;
				}
				// handle wrap around
				if (0 > newIndex) {
					if (noWrap) {
						return true; // do nothing
					} else {
						newIndex = this.proposals.length - 1;	
					}
				}
			}
			
			var startIndex = newIndex;
			while (this.proposals[newIndex] && this.proposals[newIndex].unselectable) {
				if (forward) {
					newIndex++;
					// handle wrap around
					if (newIndex >= this.proposals.length) {
						if (noWrap) {
							return true; // do nothing
						} else {
							newIndex = 0;	
						}
					}
				} else {
					newIndex--;
					// handle wrap around
					if (0 > newIndex) {
						if (noWrap) {
							return true; // do nothing
						} else {
							newIndex = this.proposals.length - 1;	
						}
					}
				}
				
				if (newIndex === startIndex) {
					// looped through all nodes and didn't find any that were selectable
					newIndex = -1;
					break;
				}
			}
			
			this.selectedIndex = newIndex;
			
			if (this.widget) {
				this.widget.selectNode(newIndex);
			}
			return true;
		},
		
		pageUp: function() {
			//TODO find out why this doesn't always go to the very top
			if (this.widget) {
				var newSelected = this.widget.getTopIndex();
				if (newSelected === this.selectedIndex) {
					this.widget.scrollIndex(newSelected, false);
					newSelected = this.widget.getTopIndex();
				}
				if (0 === newSelected) {
					// if we're attempting to select the first item in the list
					// move down to the next one if it is not selectable
					return this.lineDown(newSelected, true);	
				}
				return this.lineUp(newSelected, true);
			} else {
				return this.lineUp();
			}
		},
		pageDown: function() {
			if (this.widget) {
				var newSelected = this.widget.getBottomIndex();
				if (newSelected === this.selectedIndex) {
					this.widget.scrollIndex(newSelected, true);
					newSelected = this.widget.getBottomIndex();
				}
				return this.lineDown(newSelected, true);
			} else {
				return this.lineDown();
			}
		},
		enter: function() {
			var proposal = this.proposals[this.selectedIndex] || null;
			return this.contentAssist.apply(proposal);
		},
		tab: function() {
			if (this.widget) {
				this.widget.parentNode.focus();
				return true;
			} else {
				return false;
			}
		}
	});

	/**
	 * @name orion.editor.ContentAssistWidget
	 * @class Displays proposals from a {@link orion.editor.ContentAssist}.
	 * @description Creates a ContentAssistWidget that will display proposals from the given {@link orion.editor.ContentAssist}
	 * in the given <code>parentNode</code>. Clicking a proposal will cause the ContentAssist to apply that proposal.
	 * @param {orion.editor.ContentAssist} contentAssist
	 * @param {String|DomNode} [parentNode] The ID or DOM node to use as the parent for displaying proposals. If not provided,
	 * a new DIV will be created inside &lt;body&gt; and assigned the CSS class <code>contentassist</code>.
	 */
	function ContentAssistWidget(contentAssist, parentNode) {
		this.contentAssist = contentAssist;
		this.textView = this.contentAssist.getTextView();
		this.textViewListenerAdded = false;
		this.isShowing = false;
		var document = this.textView.getOptions("parent").ownerDocument; //$NON-NLS-0$
		this.parentNode = typeof parentNode === "string" ? document.getElementById(parentNode) : parentNode; //$NON-NLS-0$
		if (!this.parentNode) {
			this.parentNode = util.createElement(document, "div"); //$NON-NLS-0$
			this.parentNode.className = "contentassist"; //$NON-NLS-0$
			var body = document.getElementsByTagName("body")[0]; //$NON-NLS-0$
			if (body) {
				body.appendChild(this.parentNode);
			} else {
				throw new Error("parentNode is required"); //$NON-NLS-0$
			}
		}
		
		this.parentNode.addEventListener("scroll", this.onScroll.bind(this)); //$NON-NLS-0$
		
		var self = this;
		this.textViewListener = {
			onMouseDown: function(event) {
				var target = event.event.target || event.event.srcElement;
				if (target.parentElement !== self.parentNode) {
					self.contentAssist.deactivate();
				}
				// ignore the event if this is a click inside of the parentNode
				// the click is handled by the onClick() function
			}
		};
		this.contentAssist.addEventListener("Deactivating", function(event) { //$NON-NLS-0$
			self.hide();
		});
		this.scrollListener = function(e) {
			if (self.isShowing) {
				self.position();
			}
		};
		textUtil.addEventListener(document, "scroll", this.scrollListener); //$NON-NLS-0$
	}
	ContentAssistWidget.prototype = /** @lends orion.editor.ContentAssistWidget.prototype */ {
		/** @private */
		onClick: function(e) {
			if (!e) { e = window.event; }
			this.contentAssist.apply(this.getProposal(e.target || e.srcElement));
			this.textView.focus();
		},
		/** @private */
		onScroll: function(e) {
			if (this.previousCloneNode && !this.preserveCloneThroughScroll) {
				this._removeCloneNode();
				this.previousSelectedNode.classList.add(STYLES.selected);
			}
			this.preserveCloneThroughScroll = false;
		},
		/** @private */
		createDiv: function(proposal, parent, itemIndex) {
			var document = parent.ownerDocument;
			var div = util.createElement(document, "div"); //$NON-NLS-0$
			div.id = "contentoption" + itemIndex; //$NON-NLS-0$
			div.setAttribute("role", "option"); //$NON-NLS-1$ //$NON-NLS-0$
			div.className = STYLES[proposal.style] ? STYLES[proposal.style] : STYLES.dfault;
			var node;
			if (proposal.style === "hr") { //$NON-NLS-0$
				node = util.createElement(document, "hr"); //$NON-NLS-0$
			} else {
				node = this._createDisplayNode(div, proposal, itemIndex);
				div.contentAssistProposalIndex = itemIndex; // make div clickable
			}
			div.appendChild(node);
			parent.appendChild(div);
		},
		/** @private */
		createAccessible: function() {
			var mode = this._contentAssistMode;
			var self = this;
			this.parentNode.addEventListener("keydown", function(evt) { //$NON-NLS-0$
				if (!evt) { evt = window.event; }
				if (evt.preventDefault) {
					evt.preventDefault();
				}
				if(evt.keyCode === lib.KEY.ESCAPE) {
					return mode.cancel(); 
				} else if(evt.keyCode === lib.KEY.UP) {
					return mode.lineUp();
				} else if(evt.keyCode === lib.KEY.DOWN) {
					return mode.lineDown();
				} else if(evt.keyCode === lib.KEY.ENTER) {
					return mode.enter(); 
				} else if(evt.keyCode === lib.KEY.PAGEDOWN) {
					return mode.pageDown();
				} else if(evt.keyCode === lib.KEY.PAGEUP) {
					return mode.pageUp();
				} else if(evt.keyCode === lib.KEY.HOME) {
					self.scrollIndex(0, true);
					return mode.lineDown(0); // select first selectable element starting at the top and moving downwards
				} else if(evt.keyCode === lib.KEY.END) {
					return mode.lineUp(mode.getProposals().length - 1); // select first selectable element starting at the bottom and moving up
				}
				return false;
			});
		},
		/** @private */
		_createDisplayNode: function(div, proposal, index) {
			var node = null;
			var plainString = null;
			
			if (typeof proposal === "string") { //$NON-NLS-0$
				//for simple string content assist, the display string is just the proposal
				plainString = proposal;
			} else if (proposal.description && typeof proposal.description === "string") { //$NON-NLS-0$
				if (proposal.name && typeof proposal.name === "string") { //$NON-NLS-0$
					var nameNode = this._createNameNode(proposal.name);
					nameNode.contentAssistProposalIndex = index;
					
					node = document.createElement("span"); //$NON-NLS-0$
					node.appendChild(nameNode);
					
					var descriptionNode = document.createTextNode(proposal.description);
					node.appendChild(descriptionNode);
					div.setAttribute("title", proposal.name + proposal.description); //$NON-NLS-0$
				} else {
					plainString = proposal.description;
				}
			} else {
				//by default return the straight proposal text
				plainString = proposal.proposal;
			}
			
			if (plainString) {
				node = this._createNameNode(plainString);
				div.setAttribute("title", plainString); //$NON-NLS-0$
			}
			
			node.contentAssistProposalIndex = index;
			
			return node;
		},
		/** @private */
		_createNameNode: function(name) {
			var node = document.createElement("span"); //$NON-NLS-0$
			node.classList.add("proposal-name"); //$NON-NLS-0$
			node.appendChild(document.createTextNode(name));
			return node;
		},
		/**
		 * @private
		 * @returns {Object} The proposal represented by the given node.
		 */
		getProposal: function(/**DOMNode*/ node) {
			var proposal = null;
			
			var nodeIndex = node.contentAssistProposalIndex;
			
			if (undefined !== nodeIndex){
				proposal = this._contentAssistMode.getProposals()[nodeIndex] || null;
			}
			
			return proposal;
		},
		/** @private */
		getTopIndex: function() {
			var nodes = this.parentNode.childNodes;
			for (var i=0; i < nodes.length; i++) {
				var child = nodes[i];
				if (child.offsetTop >= this.parentNode.scrollTop) {
					return i;
				}
			}
			return 0;
		},
		/** @private */
		getBottomIndex: function() {
			var nodes = this.parentNode.childNodes;
			for (var i=0; i < nodes.length; i++) {
				var child = nodes[i];
				if ((child.offsetTop + child.offsetHeight) > (this.parentNode.scrollTop + this.parentNode.clientHeight)) {
					return Math.max(0, i - 1);
				}
			}
			return nodes.length - 1;
		},
		/** @private */
		scrollIndex: function(index, top) {
			this.parentNode.childNodes[index].scrollIntoView(top);
			this.preserveCloneThroughScroll = true;
		},
		/**
		 * Visually selects the node at the specified nodeIndex
		 * by updating its CSS class and scrolling it into view
		 * if necessary.
		 * @param{Number} nodeIndex The index of the node to select
		 */
		selectNode: function(nodeIndex) {
			var node = null;
			
			if (this.previousSelectedNode) {
				this.previousSelectedNode.classList.remove(STYLES.selected);
				this.previousSelectedNode = null;
				if (this.previousCloneNode) {
					this._removeCloneNode();
				}
			}
			
			if (-1 !== nodeIndex) {
				node = this.parentNode.childNodes[nodeIndex];
				node.classList.add(STYLES.selected);
				this.parentNode.setAttribute("aria-activedescendant", node.id); //$NON-NLS-0$
				node.focus();
				if (node.offsetTop < this.parentNode.scrollTop) {
					node.scrollIntoView(true);
					this.preserveCloneThroughScroll = true;
				} else if ((node.offsetTop + node.offsetHeight) > (this.parentNode.scrollTop + this.parentNode.clientHeight)) {
					node.scrollIntoView(false);
					this.preserveCloneThroughScroll = true;
				}
				
				var textNode = node.firstChild || node;  
				var textBounds = lib.bounds(textNode);
				var parentBounds = lib.bounds(this.parentNode);
				var parentStyle = window.getComputedStyle(this.parentNode);
				var nodeStyle = window.getComputedStyle(node);
				var allPadding = parseInt(parentStyle.paddingLeft) + parseInt(parentStyle.paddingRight) + parseInt(nodeStyle.paddingLeft) + parseInt(nodeStyle.paddingRight);
				if (textBounds.width >= (parentBounds.width - allPadding)) {
					var parentTop = parseInt(parentStyle.top);
					
					// create clone node
					var clone = node.cloneNode(true); // deep clone
					clone.classList.add("cloneProposal"); //$NON-NLS-0$
					clone.style.top = parentTop + node.offsetTop - this.parentNode.scrollTop + "px"; //$NON-NLS-0$
					clone.style.left = parentStyle.left;
					clone.setAttribute("id", clone.id + "_clone"); //$NON-NLS-1$ //$NON-NLS-0$
					
					// try to fit clone node on page horizontally
					var viewportWidth = document.documentElement.clientWidth;
					var horizontalOffset = (textBounds.left + textBounds.width) - parseInt(viewportWidth);
					if (horizontalOffset > 0) {
						var cloneLeft = parseInt(parentStyle.left) - horizontalOffset;
						if (0 > cloneLeft) {
							cloneLeft = 0;
						}
						clone.style.left = cloneLeft + "px";
					}

					// create wrapper parent node (to replicate css class hierarchy)
					var parentClone = document.createElement("div");
					parentClone.id = "clone_contentassist";  //$NON-NLS-0$
					parentClone.classList.add("contentassist"); //$NON-NLS-0$
					parentClone.classList.add("cloneWrapper"); //$NON-NLS-0$
					parentClone.appendChild(clone);
					parentClone.onclick = this.parentNode.onclick;
					this.parentNode.parentNode.insertBefore(parentClone, this.parentNode);
					
					// make all the cloned nodes clickable by setting their contentAssistProposalIndex
					var recursiveSetIndex = function(cloneNode){
						cloneNode.contentAssistProposalIndex = node.contentAssistProposalIndex;
						if (cloneNode.hasChildNodes()) {
							for (var i = 0 ; i < cloneNode.childNodes.length ; i++){
								recursiveSetIndex(cloneNode.childNodes[i]);
							}
						}
					};
					recursiveSetIndex(parentClone);
					
					node.classList.remove(STYLES.selected);
					
					this.previousCloneNode = parentClone;				
				}
			}
			
			this.previousSelectedNode = node;
		},
		setContentAssistMode: function(mode) {
			this._contentAssistMode = mode;
		},
		show: function() {
			var proposals = this._contentAssistMode.getProposals();
			if (proposals.length === 0) {
				this.hide();
			} else {
				this.parentNode.innerHTML = "";
				for (var i = 0; i < proposals.length; i++) {
					this.createDiv(proposals[i], this.parentNode, i);
				}
				this.position();
				this.parentNode.onclick = this.onClick.bind(this);
				this.isShowing = true;
				
				if (!this.textViewListenerAdded) {
					this.textView.addEventListener("MouseDown", this.textViewListener.onMouseDown); //$NON-NLS-0$
					this.textViewListenerAdded = true;
				}
			}
		},
		hide: function() {
			if(this.parentNode.ownerDocument.activeElement === this.parentNode) {
				this.textView.focus();
			}
			this.parentNode.style.display = "none"; //$NON-NLS-0$
			this.parentNode.onclick = null;
			this.isShowing = false;
			
			if (this.textViewListenerAdded) {
				this.textView.removeEventListener("MouseDown", this.textViewListener.onMouseDown); //$NON-NLS-0$
				this.textViewListenerAdded = false;
			}
			
			if (this.previousSelectedNode) {
				this.previousSelectedNode = null;
				if (this.previousCloneNode) {
					this._removeCloneNode();
				}
			}
		},
		position: function() {
			var contentAssist = this.contentAssist;
			var offset;
			var view = this.textView;
			if (contentAssist.offset !== undefined) {
				offset = contentAssist.offset;
				var model = view.getModel();
				if (model.getBaseModel) {
					offset = model.mapOffset(offset, true);
				}
			} else {
				offset = this.textView.getCaretOffset();
			}
			var caretLocation = view.getLocationAtOffset(offset);
			caretLocation.y += view.getLineHeight();
			this.textView.convert(caretLocation, "document", "page"); //$NON-NLS-1$ //$NON-NLS-0$
			this.parentNode.style.position = "fixed"; //$NON-NLS-0$
			this.parentNode.style.left = caretLocation.x + "px"; //$NON-NLS-0$
			this.parentNode.style.top = caretLocation.y + "px"; //$NON-NLS-0$
			this.parentNode.style.display = "block"; //$NON-NLS-0$
			this.parentNode.scrollTop = 0;

			// Make sure that the panel is never outside the viewport
			var document = this.parentNode.ownerDocument;
			var viewportWidth = document.documentElement.clientWidth,
			    viewportHeight =  document.documentElement.clientHeight;
			if (caretLocation.y + this.parentNode.offsetHeight > viewportHeight) {
				this.parentNode.style.top = (caretLocation.y - this.parentNode.offsetHeight - this.textView.getLineHeight()) + "px"; //$NON-NLS-0$
			}
			if (caretLocation.x + this.parentNode.offsetWidth > viewportWidth) {
				this.parentNode.style.left = (viewportWidth - this.parentNode.offsetWidth) + "px"; //$NON-NLS-0$
			}
		},
		_removeCloneNode: function(){
			if (this.parentNode.parentNode.contains(this.previousCloneNode)) {
				this.parentNode.parentNode.removeChild(this.previousCloneNode);	
			}
			this.previousCloneNode = null;
		}
	};
	return {
		ContentAssist: ContentAssist,
		ContentAssistMode: ContentAssistMode,
		ContentAssistWidget: ContentAssistWidget
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define*/

define("orion/editor/stylers/lib/syntax", [], function() { //$NON-NLS-0$
	return {
		id: "orion.lib",
		grammars: [{
			id: "orion.lib",
			patterns: [
				{include: "#brace_open"},
				{include: "#brace_close"},
				{include: "#bracket_open"},
				{include: "#bracket_close"},
				{include: "#parenthesis_open"},
				{include: "#parenthesis_close"},
				{include: "#number_decimal"},
				{include: "#number_hex"},
				{include: "#string_doubleQuote"},
				{include: "#string_singleQuote"}
			],
			repository: {
				brace_open: {
					match: "{",
					name: "punctuation.section.block.begin"
				},
				brace_close: {
					match: "}",
					name: "punctuation.section.block.end"
				},
				bracket_open: {
					match: "\\[",
					name: "punctuation.section.bracket.begin"
				},
				bracket_close: {
					match: "\\]",
					name: "punctuation.section.bracket.end"
				},
				parenthesis_open: {
					match: "\\(",
					name: "punctuation.section.parens.begin"
				},
				parenthesis_close: {
					match: "\\)",
					name: "punctuation.section.parens.end"
				},
				doc_block: {
					begin: "/\\*\\*",
					end: "\\*/",
					name: "comment.block.documentation",
					patterns: [
						{
							match: "@(?:(?!\\*/)\\S)*",
							name: "keyword.other.documentation.tag"
						}, {
							match: "\\<\\S*\\>",
							name: "keyword.other.documentation.markup"
						}, {
							match: "(\\b)(TODO)(\\b)(((?!\\*/).)*)",
							name: "meta.annotation.task.todo",
							captures: {
								2: {name: "keyword.other.documentation.task"},
								4: {name: "comment.block"}
							}
						}
					]
				},
				number_decimal: {
					match: "\\b-?(?:\\.\\d+|\\d+\\.?\\d*)(?:[eE][+-]?\\d+)?\\b",
					name: "constant.numeric.number"
				},
				number_hex: {
					match: "\\b0[xX][0-9A-Fa-f]+\\b",
					name: "constant.numeric.hex"
				},
				string_doubleQuote: {
					match: '"(?:\\\\.|[^"])*"?',
					name: "string.quoted.double"
				},
				string_singleQuote: {
					match: "'(?:\\\\.|[^'])*'?",
					name: "string.quoted.single"
				},
				todo_comment_singleLine: {
					match: "(\\b)(TODO)(\\b)(.*)",
					name: "meta.annotation.task.todo",
					captures: {
						2: {name: "keyword.other.documentation.task"},
						4: {name: "comment.line"}
					}
				}
			}
		}, {
			id: "orion.c-like",
			patterns: [
				{include: "orion.lib"},
				{include: "#comment_singleLine"},
				{include: "#comment_block"}
			],
			repository: {
				comment_singleLine: {
					match: "//.*",
					name: "comment.line.double-slash",
					patterns: [
						{
							include: "orion.lib#todo_comment_singleLine"
						}
					]
				},
				comment_block: {
					begin: "/\\*",
					end: "\\*/",
					name: "comment.block",
					patterns: [
						{
							match: "(\\b)(TODO)(\\b)(((?!\\*/).)*)",
							name: "meta.annotation.task.todo",
							captures: {
								2: {name: "keyword.other.documentation.task"},
								4: {name: "comment.block"}
							}
						}
					]
				}
			}
		}],
		keywords: []
	}
});

/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define*/

define("orion/editor/stylers/text_css/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) { //$NON-NLS-0$
	var keywords = [
		"alignment-adjust", "alignment-baseline", "animation-delay", "animation-direction", "animation-duration", "animation-iteration-count", //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"animation-name", "animation-play-state", "animation-timing-function", "animation", "appearance", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"azimuth", "backface-visibility", "background-attachment", "background-clip", "background-color", "background-image", //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"background-origin", "background-position", "background-repeat", "background-size", "background", "baseline-shift", //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"binding", "bleed", "bookmark-label", "bookmark-level", "bookmark-state", "bookmark-target", "border-bottom-color", //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"border-bottom-left-radius", "border-bottom-right-radius", "border-bottom-style", "border-bottom-width", "border-bottom", //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"border-collapse", "border-color", "border-image-outset", "border-image-repeat", "border-image-slice", "border-image-source", //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"border-image-width", "border-image", "border-left-color", "border-left-style", "border-left-width", "border-left", //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"border-radius", "border-right-color", "border-right-style", "border-right-width", "border-right", "border-spacing", "border-style", //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"border-top-color", "border-top-left-radius", "border-top-right-radius", "border-top-style", "border-top-width", "border-top", //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"border-width", "border", "bottom", "box-align", "box-decoration-break", "box-direction", "box-flex-group", "box-flex", "box-lines", //$NON-NLS-8$ //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"box-ordinal-group", "box-orient", "box-pack", "box-shadow", "box-sizing", "break-after", "break-before", "break-inside", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"caption-side", "clear", "clip", "color-profile", "color", "column-count", "column-fill", "column-gap", "column-rule-color", //$NON-NLS-8$ //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"column-rule-style", "column-rule-width", "column-rule", "column-span", "column-width", "columns", "content", "counter-increment", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"counter-reset", "crop", "cue-after", "cue-before", "cue", "cursor", "direction", "display", "dominant-baseline", //$NON-NLS-8$ //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"drop-initial-after-adjust", "drop-initial-after-align", "drop-initial-before-adjust", "drop-initial-before-align", "drop-initial-size", //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"drop-initial-value", "elevation", "empty-cells", "fit-position", "fit", "flex-align", "flex-flow", "flex-inline-pack", "flex-order", //$NON-NLS-8$ //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"flex-pack", "float-offset", "float", "font-family", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-variant", //$NON-NLS-8$ //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"font-weight", "font", "grid-columns", "grid-rows", "hanging-punctuation", "height", "hyphenate-after", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"hyphenate-before", "hyphenate-character", "hyphenate-lines", "hyphenate-resource", "hyphens", "icon", "image-orientation", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"image-rendering", "image-resolution", "inline-box-align", "left", "letter-spacing", "line-height", "line-stacking-ruby", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"line-stacking-shift", "line-stacking-strategy", "line-stacking", "list-style-image", "list-style-position", "list-style-type", //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"list-style", "margin-bottom", "margin-left", "margin-right", "margin-top", "margin", "mark-after", "mark-before", "mark", //$NON-NLS-8$ //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"marker-offset", "marks", "marquee-direction", "marquee-loop", "marquee-play-count", "marquee-speed", "marquee-style", "max-height", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"max-width", "min-height", "min-width", "move-to", "nav-down", "nav-index", "nav-left", "nav-right", "nav-up", "opacity", "orphans", //$NON-NLS-10$ //$NON-NLS-9$ //$NON-NLS-8$ //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"outline-color", "outline-offset", "outline-style", "outline-width", "outline", "overflow-style", "overflow-x", "overflow-y", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"overflow", "padding-bottom", "padding-left", "padding-right", "padding-top", "padding", "page-break-after", "page-break-before", "page-break-inside", //$NON-NLS-8$ //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"page-policy", "page", "pause-after", "pause-before", "pause", "perspective-origin", "perspective", "phonemes", "pitch-range", //$NON-NLS-8$ //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"pitch", "play-during", "position", "presentation-level", "punctuation-trim", "quotes", "rendering-intent", "resize", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"rest-after", "rest-before", "rest", "richness", "right", "rotation-point", "rotation", "ruby-align", "ruby-overhang", "ruby-position", //$NON-NLS-9$ //$NON-NLS-8$ //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"ruby-span", "size", "speak-header", "speak-numeral", "speak-punctuation", "speak", "speech-rate", "stress", "string-set", "table-layout", //$NON-NLS-9$ //$NON-NLS-8$ //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"target-name", "target-new", "target-position", "target", "text-align-last", "text-align", "text-decoration", "text-emphasis", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"text-height", "text-indent", "text-justify", "text-outline", "text-shadow", "text-transform", "text-wrap", "top", "transform-origin", //$NON-NLS-8$ //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"transform-style", "transform", "transition-delay", "transition-duration", "transition-property", "transition-timing-function", //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"transition", "unicode-bidi", "vertical-align", "visibility", "voice-balance", "voice-duration", "voice-family", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"voice-pitch-range", "voice-pitch", "voice-rate", "voice-stress", "voice-volume", "volume", "white-space-collapse", "white-space", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"widows", "width", "word-break", "word-spacing", "word-wrap", "z-index" //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	];

	var grammars = mLib.grammars;
	grammars.push({
		id: "orion.css",
		contentTypes: ["text/css"],
		patterns: [
			{
				include: "orion.lib"
			}, {
				include: "orion.c-like#comment_block"
			}, {
				match: "(?:-webkit-|-moz-|-ms-|\\b)(?:" + keywords.join("|") + ")\\b",
				name: "keyword.control.css"
			}, {
				match: "(?i)\\b-?(?:\\.\\d+|\\d+\\.?\\d*)(?:%|em|ex|ch|rem|vw|vh|vmin|vmax|in|cm|mm|pt|pc|px|deg|grad|rad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx)?\\b",
				name: "constant.numeric.value.css"
			}, {
				begin: "(['\"])(?:\\\\.|[^\\\\\\1])*\\\\$", //$NON-NLS-0$
				end: "^(?:$|(?:\\\\.|[^\\\\\\1])*(\\1|[^\\\\]$))", //$NON-NLS-0$
				name: "string.quoted.multiline.css" //$NON-NLS-0$
			}
		],
		repository: {
			/* override orion.lib#number_hex */
			number_hex: {
				match: "#[0-9A-Fa-f]+\\b",
				name: "constant.numeric.hex.css"
			}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define */

define("orion/editor/cssContentAssist", [ //$NON-NLS-0$
	'orion/editor/templates', //$NON-NLS-0$
	'orion/editor/stylers/text_css/syntax' //$NON-NLS-0$
], function(mTemplates, mCSS) {

	var overflowValues = {
		type: "link", //$NON-NLS-0$
		values: ["visible", "hidden", "scroll", "auto", "no-display", "no-content"] //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	};
	var fontStyleValues = {
		type: "link", //$NON-NLS-0$
		values: ["italic", "normal", "oblique", "inherit"] //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	};
	var fontWeightValues = {
		type: "link", //$NON-NLS-0$
		values: [
			"bold", "normal", "bolder", "lighter", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			"100", "200", "300", "400", "500", "600", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			"700", "800", "900", "inherit" //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		]
	};
	var displayValues = {
		type: "link", //$NON-NLS-0$
		values: [
			"none", "block", "box", "flex", "inline", "inline-block", "inline-flex", "inline-table", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			"list-item", "table", "table-caption", "table-cell", "table-column", "table-column-group", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			"table-footer-group", "table-header-group", "table-row", "table-row-group", "inherit" //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		]
	};
	var visibilityValues = {
		type: "link", //$NON-NLS-0$
		values: ["hidden", "visible", "collapse", "inherit"] //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	};
	var positionValues = {
		type: "link", //$NON-NLS-0$
		values: ["absolute", "fixed", "relative", "static", "inherit"] //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	};
	var whitespaceValues = {
		type: "link", //$NON-NLS-0$
		values: ["pre", "pre-line", "pre-wrap", "nowrap", "normal", "inherit"] //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	};
	var wordwrapValues = {
		type: "link", //$NON-NLS-0$
		values: ["normal", "break-word"] //$NON-NLS-1$ //$NON-NLS-0$
	};
	var floatValues = {
		type: "link", //$NON-NLS-0$
		values: ["left", "right", "none", "inherit"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	};
	var borderStyles = {
		type: "link", //$NON-NLS-0$
		values: ["solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset"] //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	};
	var widths = {
		type: "link", //$NON-NLS-0$
		values: []
	};
	for (var i=0; i<10; i++) {
		widths.values.push(i.toString());
	}
	var colorValues = {
		type: "link", //$NON-NLS-0$
		values: [
			"black", //$NON-NLS-0$
			"white", //$NON-NLS-0$
			"red", //$NON-NLS-0$
			"green", //$NON-NLS-0$
			"blue", //$NON-NLS-0$
			"magenta", //$NON-NLS-0$
			"yellow", //$NON-NLS-0$
			"cyan", //$NON-NLS-0$
			"grey", //$NON-NLS-0$
			"darkred", //$NON-NLS-0$
			"darkgreen", //$NON-NLS-0$
			"darkblue", //$NON-NLS-0$
			"darkmagenta", //$NON-NLS-0$
			"darkcyan", //$NON-NLS-0$
			"darkyellow", //$NON-NLS-0$
			"darkgray", //$NON-NLS-0$
			"lightgray" //$NON-NLS-0$
		]
	};
	var cursorValues = {
		type: "link", //$NON-NLS-0$
		values: [
			"auto", //$NON-NLS-0$
			"crosshair", //$NON-NLS-0$
			"default", //$NON-NLS-0$
			"e-resize", //$NON-NLS-0$
			"help", //$NON-NLS-0$
			"move", //$NON-NLS-0$
			"n-resize", //$NON-NLS-0$
			"ne-resize", //$NON-NLS-0$
			"nw-resize", //$NON-NLS-0$
			"pointer", //$NON-NLS-0$
			"progress", //$NON-NLS-0$
			"s-resize", //$NON-NLS-0$
			"se-resize", //$NON-NLS-0$
			"sw-resize", //$NON-NLS-0$
			"text", //$NON-NLS-0$
			"w-resize", //$NON-NLS-0$
			"wait", //$NON-NLS-0$
			"inherit" //$NON-NLS-0$
		]
	};
	
	function fromJSON(o) {
		return JSON.stringify(o).replace("}", "\\}"); //$NON-NLS-1$ //$NON-NLS-0$
	}
	
	var templates = [
		{
			prefix: "rule", //$NON-NLS-0$
			description: "rule - class selector rule",
			template: ".${class} {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "rule", //$NON-NLS-0$
			description: "rule - id selector rule",
			template: "#${id} {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "outline", //$NON-NLS-0$
			description: "outline - outline style",
			template: "outline: ${color:" + fromJSON(colorValues) + "} ${style:" + fromJSON(borderStyles) + "} ${width:" + fromJSON(widths) + "}px;" //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		},
		{
			prefix: "background-image", //$NON-NLS-0$
			description: "background-image - image style",
			template: "background-image: url(\"${uri}\");" //$NON-NLS-0$
		},
		{
			prefix: "url", //$NON-NLS-0$
			description: "url - url image",
			template: "url(\"${uri}\");" //$NON-NLS-0$
		},
		{
			prefix: "rgb", //$NON-NLS-0$
			description: "rgb - rgb color",
			template: "rgb(${red},${green},${blue});" //$NON-NLS-0$
		},
		{
			prefix: "@", //$NON-NLS-0$
			description: "import - import style sheet",
			template: "@import \"${uri}\";" //$NON-NLS-0$
		}
	];
	var valuesProperties = [
		{prop: "display", values: displayValues}, //$NON-NLS-0$
		{prop: "overflow", values: overflowValues}, //$NON-NLS-0$
		{prop: "overflow-x", values: overflowValues}, //$NON-NLS-0$
		{prop: "overflow-y", values: overflowValues}, //$NON-NLS-0$
		{prop: "float", values: floatValues}, //$NON-NLS-0$
		{prop: "position", values: positionValues}, //$NON-NLS-0$
		{prop: "cursor", values: cursorValues}, //$NON-NLS-0$
		{prop: "color", values: colorValues}, //$NON-NLS-0$
		{prop: "border-top-color", values: colorValues}, //$NON-NLS-0$
		{prop: "border-bottom-color", values: colorValues}, //$NON-NLS-0$
		{prop: "border-right-color", values: colorValues}, //$NON-NLS-0$
		{prop: "border-left-color", values: colorValues}, //$NON-NLS-0$
		{prop: "background-color", values: colorValues}, //$NON-NLS-0$
		{prop: "font-style", values: fontStyleValues}, //$NON-NLS-0$
		{prop: "font-weight", values: fontWeightValues}, //$NON-NLS-0$
		{prop: "white-space", values: whitespaceValues}, //$NON-NLS-0$
		{prop: "word-wrap", values: wordwrapValues}, //$NON-NLS-0$
		{prop: "visibility", values: visibilityValues} //$NON-NLS-0$
	];
	var prop;
	for (i=0; i<valuesProperties.length; i++) {
		prop = valuesProperties[i];
		templates.push({
			prefix: prop.prop, //$NON-NLS-0$
			description: prop.prop + " - " + prop.prop + " style",
			template: prop.prop + ": ${value:" + fromJSON(prop.values) + "};" //$NON-NLS-1$ //$NON-NLS-0$
		});
	}	
	var pixelProperties = [
		"width", "height", "top", "bottom", "left", "right", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"min-width", "min-height", "max-width", "max-height", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"margin", "padding", "padding-left", "padding-right", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"padding-top", "padding-bottom", "margin-left", "margin-top", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"margin-bottom", "margin-right" //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	];
	for (i=0; i<pixelProperties.length; i++) {
		prop = pixelProperties[i];
		templates.push({
			prefix: prop, //$NON-NLS-0$
			description: prop + " - " + prop + " pixel style",
			template: prop  + ": ${value}px;" //$NON-NLS-0$
		});
	}
	var fourWidthsProperties = ["padding", "margin"]; //$NON-NLS-1$ //$NON-NLS-0$
	for (i=0; i<fourWidthsProperties.length; i++) {
		prop = fourWidthsProperties[i];
		templates.push({
			prefix: prop, //$NON-NLS-0$
			description: prop + " - " + prop + " top right bottom left style",
			template: prop  + ": ${top}px ${left}px ${bottom}px ${right}px;" //$NON-NLS-0$
		});
		templates.push({
			prefix: prop, //$NON-NLS-0$
			description: prop + " - " + prop + " top right,left bottom style",
			template: prop  + ": ${top}px ${right_left}px ${bottom}px;" //$NON-NLS-0$
		});
		templates.push({
			prefix: prop, //$NON-NLS-0$
			description: prop + " - " + prop + " top,bottom right,left style",
			template: prop  + ": ${top_bottom}px ${right_left}px" //$NON-NLS-0$
		});
	}
	var borderProperties = ["border", "border-top", "border-bottom", "border-left", "border-right"]; //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	for (i=0; i<borderProperties.length; i++) {
		prop = borderProperties[i];
		templates.push({
			prefix: prop, //$NON-NLS-0$
			description: prop + " - " + prop + " style",
			template: prop + ": ${width:" + fromJSON(widths) + "}px ${style:" + fromJSON(borderStyles) + "} ${color:" + fromJSON(colorValues) + "};" //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		});
	}

	/**
	 * @name orion.editor.CssContentAssistProvider
	 * @class Provides content assist for CSS keywords.
	 */
	function CssContentAssistProvider() {
	}
	CssContentAssistProvider.prototype = new mTemplates.TemplateContentAssist(mCSS.keywords, templates);
	
	CssContentAssistProvider.prototype.getPrefix = function(buffer, offset, context) {
		var index = offset;
		while (index && /[A-Za-z\-\@]/.test(buffer.charAt(index - 1))) {
			index--;
		}
		return index ? buffer.substring(index, offset) : "";
	};

	return {
		CssContentAssistProvider: CssContentAssistProvider
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define */

define("orion/editor/htmlContentAssist", ['orion/editor/templates'], function(mTemplates) { //$NON-NLS-1$ //$NON-NLS-0$

	var simpleDocTemplate = new mTemplates.Template("", "Simple HTML document", //$NON-NLS-0$
		"<!DOCTYPE html>\n" + //$NON-NLS-0$
		"<html lang=\"en\">\n" + //$NON-NLS-0$
		"\t<head>\n" + //$NON-NLS-0$
		"\t\t<meta charset=utf-8>\n" + //$NON-NLS-0$
		"\t\t<title>${title}</title>\n" + //$NON-NLS-0$
		"\t</head>\n" + //$NON-NLS-0$
		"\t<body>\n" + //$NON-NLS-0$
		"\t\t<h1>${header}</h1>\n" + //$NON-NLS-0$
		"\t\t<p>\n" + //$NON-NLS-0$
		"\t\t\t${cursor}\n" + //$NON-NLS-0$
		"\t\t</p>\n" + //$NON-NLS-0$
		"\t</body>\n" + //$NON-NLS-0$
		"</html>"); //$NON-NLS-0$
		
	var templates = [
		{
			prefix: "<img", //$NON-NLS-0$
			name: "<img>", //$NON-NLS-0$
			description: " - HTML image element", //$NON-NLS-0$
			template: "<img src=\"${cursor}\" alt=\"${Image}\"/>" //$NON-NLS-0$
		},
		{
			prefix: "<a", //$NON-NLS-0$
			name: "<a>", //$NON-NLS-0$
			description: " - HTML anchor element", //$NON-NLS-0$
			template: "<a href=\"${cursor}\"></a>" //$NON-NLS-0$
		},
		{
			prefix: "<ul", //$NON-NLS-0$
			name: "<ul>", //$NON-NLS-0$
			description: " - HTML unordered list",  //$NON-NLS-0$
			template: "<ul>\n\t<li>${cursor}</li>\n</ul>" //$NON-NLS-0$
		},
		{
			prefix: "<ol", //$NON-NLS-0$
			name: "<ol>", //$NON-NLS-0$
			description: " - HTML ordered list", //$NON-NLS-0$
			template: "<ol>\n\t<li>${cursor}</li>\n</ol>" //$NON-NLS-0$
		},
		{
			prefix: "<dl", //$NON-NLS-0$
			name: "<dl>", //$NON-NLS-0$
			description: " - HTML definition list", //$NON-NLS-0$
			template: "<dl>\n\t<dt>${cursor}</dt>\n\t<dd></dd>\n</dl>" //$NON-NLS-0$
		},
		{
			prefix: "<table", //$NON-NLS-0$
			name: "<table>", //$NON-NLS-0$
			description: " - basic HTML table", //$NON-NLS-0$
			template: "<table>\n\t<tr>\n\t\t<td>${cursor}</td>\n\t</tr>\n</table>" //$NON-NLS-0$
		},
		{
			prefix: "<!--", //$NON-NLS-0$
			name: "<!-- -->", //$NON-NLS-0$
			description: " - HTML comment", //$NON-NLS-0$
			template: "<!-- ${cursor} -->" //$NON-NLS-0$
		}
	];

	//elements that are typically placed on a single line (e.g., <b>, <h1>, etc)
	var element, template, description, i;
	var singleLineElements = [
		"abbr","b","button","canvas","cite", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"command","dd","del","dfn","dt", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"em","embed","font","h1","h2", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"h3","h4","h5","h6","i", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"ins","kbd","label","li","mark", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"meter","object","option","output","progress", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"q","rp","rt","samp","small", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"strong","sub","sup","td","time", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"title","tt","u","var" //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	];
	for (i = 0; i < singleLineElements.length; i++) {
		element = singleLineElements[i];
		description = "<" + element + "></" + element + ">"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		template = "<" + element + ">${cursor}</" + element + ">"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		templates.push({prefix: "<" + element, description: description, template: template}); //$NON-NLS-0$
	}

	//elements that typically start a block spanning multiple lines (e.g., <p>, <div>, etc)
	var multiLineElements = [
		"address","article","aside","audio","bdo", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"blockquote","body","caption","code","colgroup", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"datalist","details","div","fieldset","figure", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"footer","form","head","header","hgroup", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"iframe","legend","map","menu","nav", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"noframes","noscript","optgroup","p","pre", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"ruby","script","section","select","span", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"style","tbody","textarea","tfoot","th", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"thead","tr","video" //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	];
	for (i = 0; i < multiLineElements.length; i++) {
		element = multiLineElements[i];
		description = "<" + element + "></" + element + ">"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		template = "<" + element + ">\n\t${cursor}\n</" + element + ">"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		templates.push({prefix: "<" + element, description: description, template: template}); //$NON-NLS-0$
	}

	//elements with no closing element (e.g., <hr>, <br>, etc)
	var emptyElements = [
		"area","base","br","col", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"hr","input","link","meta", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"param","keygen","source" //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	];
	for (i = 0; i < emptyElements.length; i++) {
		element = emptyElements[i];
		template = description = "<" + element + "/>"; //$NON-NLS-1$ //$NON-NLS-0$
		templates.push({prefix: "<" + element, description: description, template: template}); //$NON-NLS-0$
	}

	/**
	 * @name orion.editor.HTMLContentAssistProvider
	 * @class Provides content assist for HTML.
	 */
	function HTMLContentAssistProvider() {
	}
	HTMLContentAssistProvider.prototype = new mTemplates.TemplateContentAssist([], templates);

	HTMLContentAssistProvider.prototype.getPrefix = function(buffer, offset, context) {
		var prefix = "";
		var index = offset;
		while (index && /[A-Za-z0-9<!-]/.test(buffer.charAt(index - 1))) {
			index--;
			if (buffer.charAt(index) === "<") { //$NON-NLS-0$
				prefix = buffer.substring(index, offset);
				break;
			}
		}
		return prefix;
	};
	
	HTMLContentAssistProvider.prototype.computeProposals = function(buffer, offset, context) {
		//template - simple html document
		if (buffer.length === 0) {
			return [simpleDocTemplate.getProposal("", offset, context)];
		}
		var proposals = mTemplates.TemplateContentAssist.prototype.computeProposals.call(this, buffer, offset, context);
		
		// sort and then return proposals
		return proposals.sort(function(l,r) {
			var leftString = l.prefix || l.proposal;
			var rightString = r.prefix || r.proposal;
			
			// handle titles
			if (!leftString) {
				return -1;
			} else if (!rightString) {
				return 1;
			}
			
			return leftString.toLowerCase().localeCompare(rightString.toLowerCase());
		});
	};

	return {
		HTMLContentAssistProvider: HTMLContentAssistProvider
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define*/

define("orion/editor/stylers/application_javascript/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) { //$NON-NLS-0$
	var keywords = [
		"break", //$NON-NLS-0$
		"case", "class", "catch", "continue", "const", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"debugger", "default", "delete", "do", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"else", "enum", "export", "extends", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"false", "finally", "for", "function", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"if", "implements", "import", "in", "instanceof", "interface", //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"let", //$NON-NLS-0$
		"new", "null", //$NON-NLS-1$ //$NON-NLS-0$
		"package", "private", "protected", "public", //$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
		"return", //$NON-NLS-0$
		"static", "super", "switch", //$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$
		"this", "throw", "true", "try", "typeof", //$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$ //$NON-NLS-4$
		"undefined", //$NON-NLS-0$
		"var", "void", //$NON-NLS-0$ //$NON-NLS-1$
		"while", "with", //$NON-NLS-0$ //$NON-NLS-1$
		"yield" //$NON-NLS-0$
	];

	var grammars = mLib.grammars;
	grammars.push({
		id: "orion.js", //$NON-NLS-0$
		contentTypes: ["application/javascript"], //$NON-NLS-0$
		patterns: [
			{
				include: "orion.lib#doc_block" //$NON-NLS-0$
			}, {
				include: "orion.c-like" //$NON-NLS-0$
			}, {
				match: "\\b(?:" + keywords.join("|") + ")\\b", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				name: "keyword.control.js" //$NON-NLS-0$
			}, {
				match: "/(?![\\s])(?:\\\\.|[^/])+/(?:[gim]{0,3})", //$NON-NLS-0$
				name: "string.regexp.js" //$NON-NLS-0$
			}, {
				begin: "'(?:\\\\.|[^\\\\'])*\\\\$", //$NON-NLS-0$
				end: "^(?:$|(?:\\\\.|[^\\\\'])*('|[^\\\\]$))", //$NON-NLS-0$
				name: "string.quoted.single.js" //$NON-NLS-0$
			}, {
				begin: '"(?:\\\\.|[^\\\\"])*\\\\$', //$NON-NLS-0$
				end: '^(?:$|(?:\\\\.|[^\\\\"])*("|[^\\\\]$))', //$NON-NLS-0$
				name: "string.quoted.double.js" //$NON-NLS-0$
			}
		]
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2014 IBM Corporation and others.
 * Copyright (c) 2012 VMware, Inc.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *     Andrew Eisenberg - rename to jsTemplateContentAssist.js
 *******************************************************************************/
/*global define */

define("orion/editor/jsTemplateContentAssist", [ //$NON-NLS-0$
	'orion/editor/templates', //$NON-NLS-0$
	'orion/editor/stylers/application_javascript/syntax' //$NON-NLS-0$
], function(mTemplates, mJS) {

	var typeofValues = {
		type: "link", //$NON-NLS-0$
		values: [
			"undefined", //$NON-NLS-0$
			"object", //$NON-NLS-0$
			"boolean", //$NON-NLS-0$
			"number", //$NON-NLS-0$
			"string", //$NON-NLS-0$
			"function", //$NON-NLS-0$
			"xml" //$NON-NLS-0$
		]
	};

	var uninterestingChars = ":!@#$^&*.?<>"; //$NON-NLS-0$

	var templates = [
		{
			prefix: "if", //$NON-NLS-0$
			name: "if",  //$NON-NLS-0$
			description: " - if statement", //$NON-NLS-0$
			template: "if (${condition}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "if", //$NON-NLS-0$
			name: "if", //$NON-NLS-0$
			description: " - if else statement", //$NON-NLS-0$
			template: "if (${condition}) {\n\t${cursor}\n} else {\n\t\n}" //$NON-NLS-0$
		},
		{
			prefix: "for", //$NON-NLS-0$
			name: "for", //$NON-NLS-0$
			description: " - iterate over array", //$NON-NLS-0$
			template: "for (var ${i}=0; ${i}<${array}.length; ${i}++) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "for", //$NON-NLS-0$
			name: "for", //$NON-NLS-0$
			description: " - iterate over array with local var", //$NON-NLS-0$
			template: "for (var ${i}=0; ${i}<${array}.length; ${i}++) {\n\tvar ${value} = ${array}[${i}];\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "for", //$NON-NLS-0$
			name: "for..in", //$NON-NLS-0$
			description: " - iterate over properties of an object", //$NON-NLS-0$
			template: "for (var ${property} in ${object}) {\n\tif (${object}.hasOwnProperty(${property})) {\n\t\t${cursor}\n\t}\n}" //$NON-NLS-0$
		},
		{
			prefix: "while", //$NON-NLS-0$
			name: "while", //$NON-NLS-0$
			description: " - while loop with condition", //$NON-NLS-0$
			template: "while (${condition}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "do", //$NON-NLS-0$
			name: "do", //$NON-NLS-0$
			description: " - do while loop with condition", //$NON-NLS-0$
			template: "do {\n\t${cursor}\n} while (${condition});" //$NON-NLS-0$
		},
		{
			prefix: "switch", //$NON-NLS-0$
			name: "switch", //$NON-NLS-0$
			description: " - switch case statement", //$NON-NLS-0$
			template: "switch (${expression}) {\n\tcase ${value1}:\n\t\t${cursor}\n\t\tbreak;\n\tdefault:\n}" //$NON-NLS-0$
		},
		{
			prefix: "case", //$NON-NLS-0$
			name: "case", //$NON-NLS-0$
			description: " - case statement", //$NON-NLS-0$
			template: "case ${value}:\n\t${cursor}\n\tbreak;" //$NON-NLS-0$
		},
		{
			prefix: "try", //$NON-NLS-0$
			name: "try", //$NON-NLS-0$
			description: " - try..catch statement", //$NON-NLS-0$
			template: "try {\n\t${cursor}\n} catch (${err}) {\n}" //$NON-NLS-0$
			},
		{
			prefix: "try", //$NON-NLS-0$
			name: "try", //$NON-NLS-0$
			description: " - try..catch statement with finally block", //$NON-NLS-0$
			template: "try {\n\t${cursor}\n} catch (${err}) {\n} finally {\n}" //$NON-NLS-0$
		},
		{
			prefix: "typeof", //$NON-NLS-0$
			name: "typeof", //$NON-NLS-0$
			description: " - typeof statement", //$NON-NLS-0$
			template: "typeof ${object} === \"${type:" + JSON.stringify(typeofValues).replace("}", "\\}") + "}\"" //$NON-NLS-1$ //$NON-NLS-0$
		},
		{
			prefix: "instanceof", //$NON-NLS-0$
			name: "instanceof", //$NON-NLS-0$
			description: " - instanceof statement", //$NON-NLS-0$
			template: "${object} instanceof ${type}" //$NON-NLS-0$
		},
		{
			prefix: "with", //$NON-NLS-0$
			name: "with", //$NON-NLS-0$
			description: " - with statement", //$NON-NLS-0$
			template: "with (${object}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "function", //$NON-NLS-0$
			name: "function", //$NON-NLS-0$
			description: " - function declaration",  //$NON-NLS-0$
			template: "/**\n"+  //$NON-NLS-0$
					  " * @name ${name}\n"+  //$NON-NLS-0$
					  " * @param ${parameter}\n"+  //$NON-NLS-0$
					  " */\n"+  //$NON-NLS-0$
					  "function ${name} (${parameter}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "function", //$NON-NLS-0$
			name: "function", //$NON-NLS-0$
			description: " - function expression",  //$NON-NLS-0$
			template: "/**\n"+  //$NON-NLS-0$
					  " * @name ${name}\n"+  //$NON-NLS-0$
					  " * @function\n"+  //$NON-NLS-0$
					  " * @param ${parameter}\n"+  //$NON-NLS-0$
					  " */\n"+  //$NON-NLS-0$
					  "${name}: function(${parameter}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "define", //$NON-NLS-0$
			name: "define", //$NON-NLS-0$
			description: " - define function call",  //$NON-NLS-0$
			template: "/* global define */\n"+
					  "define('${name}',[\n"+  //$NON-NLS-0$
					  "'${import}'\n"+  //$NON-NLS-0$
					  "], function(${importname}) {\n"+  //$NON-NLS-0$
					  "\t${cursor}\n"+  //$NON-NLS-0$
					  "});" //$NON-NLS-0$
		},
		{
			prefix: "nls", //$NON-NLS-0$
			name: "nls", //$NON-NLS-0$
			description: " - non NLS string", //$NON-NLS-0$
			template: "${cursor} //$NON-NLS-${0}$" //$NON-NLS-0$
		},
		{
			prefix: "log", //$NON-NLS-0$
			name: "log", //$NON-NLS-0$
			description: " - console log", //$NON-NLS-0$
			template: "console.log(${object});" //$NON-NLS-0$
		},
		{
			prefix: "mongodb", //$NON-NLS-0$
			name: "mongodb", //$NON-NLS-0$
			description: " - Node.js require statement for MongoDB", //$NON-NLS-0$
			template: "var ${name} = require('mongodb');\n" //$NON-NLS-0$
		},
		{
			prefix: "mongodb", //$NON-NLS-0$
			name: "mongodb client", //$NON-NLS-0$
			description: " - create a new MongoDB client", //$NON-NLS-0$
			template: "var MongoClient = require('mongodb').MongoClient;\n" +//$NON-NLS-0$
					  "var Server = require('mongodb').Server;\n${cursor}"
		},
		{
			prefix: "mongodb", //$NON-NLS-0$
			name: "mongodb open", //$NON-NLS-0$
			description: " - create a new MongoDB client and open a connection", //$NON-NLS-0$
			template: "var MongoClient = require('mongodb').MongoClient;\n" +//$NON-NLS-0$
					  "var Server = require('mongodb').Server;\n"+  //$NON-NLS-0$
					  "var ${client} = new MongoClient(new Server(${host}, ${port}));\n"+ //$NON-NLS-0$
					  "try {\n" + //$NON-NLS-0$
					  "\t${client}.open(function(error, ${client}) {\n" + //$NON-NLS-0$
  					  "\t\tvar ${db} = ${client}.db(${name});\n" + //$NON-NLS-0$
  					  "\t\t${cursor}\n" + //$NON-NLS-0$
  					  "\t});\n" +  //$NON-NLS-0$
  					  "} finally {\n" + //$NON-NLS-0$
  					  "\t${client}.close();\n" + //$NON-NLS-0$
  					  "};" //$NON-NLS-0$
		},
		{
			prefix: "mongodb", //$NON-NLS-0$
			name: "mongodb connect", //$NON-NLS-0$
			description: " - connect to an existing MongoDB database", //$NON-NLS-0$
			template: "var MongoClient = require('mongodb').MongoClient;\n" +//$NON-NLS-0$
					  "MongoClient.connect(${url}, function(error, db) {\n"+  //$NON-NLS-0$
					  "\t${cursor}\n"+ //$NON-NLS-0$
  					  "});\n" //$NON-NLS-0$
		},
		{
			prefix: "mongodb", //$NON-NLS-0$
			name: "mongodb connect (Cloud Foundry)", //$NON-NLS-0$
			description: " - connect to an existing MongoDB database using Cloud Foundry", //$NON-NLS-0$
			template: "if (${process}.env.VCAP_SERVICES) {\n" +  //$NON-NLS-0$
   					  "\tvar env = JSON.parse(${process}.env.VCAP_SERVICES);\n" +  //$NON-NLS-0$
   					  "\tvar mongo = env[\'${mongo-version}\'][0].credentials;\n" +  //$NON-NLS-0$
					  "} else {\n" +  //$NON-NLS-0$
					  "\tvar mongo = {\n" +  //$NON-NLS-0$
					  "\t\tusername : \'username\',\n" +  //$NON-NLS-0$
					  "\t\tpassword : \'password\',\n" +  //$NON-NLS-0$
					  "\t\turl : \'mongodb://username:password@localhost:27017/database\'\n" +  //$NON-NLS-0$
					  "\t};\n}\n" +  //$NON-NLS-0$
					  "var MongoClient = require('mongodb').MongoClient;\n" +//$NON-NLS-0$
					  "MongoClient.connect(mongo.url, function(error, db) {\n"+  //$NON-NLS-0$
					  "\t${cursor}\n"+ //$NON-NLS-0$
  					  "});\n" //$NON-NLS-0$
		},
		{
			prefix: "mongodb", //$NON-NLS-0$
			name: "mongodb collection", //$NON-NLS-0$
			description: " - create a MongoDB database collection", //$NON-NLS-0$
			template: "${db}.collection(${id}, function(${error}, collection) {\n"+//$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});"  //$NON-NLS-0$
		},
		{
			prefix: "mongodb", //$NON-NLS-0$
			name: "mongodb strict collection", //$NON-NLS-0$
			description: " - create a MongoDB database strict collection", //$NON-NLS-0$
			template: "${db}.collection(${id}, {strict:true}, function(${error}, collection) {\n"+//$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});"  //$NON-NLS-0$
		},
		{
			prefix: "redis", //$NON-NLS-0$
			name: "redis", //$NON-NLS-0$
			description: " - Node.js require statement for Redis", //$NON-NLS-0$
			template: "var ${name} = require('redis');\n" //$NON-NLS-0$
		},
		{
			prefix: "redis", //$NON-NLS-0$
			name: "redis client", //$NON-NLS-0$
			description: " - create a new Redis client", //$NON-NLS-0$
			template: "var ${name} = require('redis');\n" + //$NON-NLS-0$
					  "var ${client} = ${name}.createClient(${port}, ${host}, ${options});\n"  //$NON-NLS-0$
		},
		{
			prefix: "redis", //$NON-NLS-0$
			name: "redis connect", //$NON-NLS-0$
			description: " - create a new Redis client and connect", //$NON-NLS-0$
			template: "var ${name} = require('redis');\n" + //$NON-NLS-0$
					  "var ${client} = ${name}.createClient(${port}, ${host}, ${options});\n" +  //$NON-NLS-0$
					  "try {\n" +  //$NON-NLS-0$
					  "\t${cursor}\n"+  //$NON-NLS-0$
					  "} finally {\n"+  //$NON-NLS-0$
					  "\t${client}.close();\n"+  //$NON-NLS-0$
					  "}\n"
		},
		{
			prefix: "redis", //$NON-NLS-0$
			name: "redis set", //$NON-NLS-0$
			description: " - create a new Redis client set call", //$NON-NLS-0$
			template: "client.set(${key}, ${value});\n" //$NON-NLS-0$
		},
		{
			prefix: "redis", //$NON-NLS-0$
			name: "redis get", //$NON-NLS-0$
			description: " - create a new Redis client get call", //$NON-NLS-0$
			template: "client.get(${key}, function(${error}, ${reply}) {\n"+  //$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});\n" //$NON-NLS-0$
		},
		{
			prefix: "redis", //$NON-NLS-0$
			name: "redis on", //$NON-NLS-0$
			description: " - create a new Redis client event handler", //$NON-NLS-0$
			template: "client.on(${event}, function(${arg}) {\n"+  //$NON-NLS-0$
					  "\t${cursor}" +  //$NON-NLS-0$
					  "});\n" //$NON-NLS-0$
		},
		{
			prefix: "pg", //$NON-NLS-0$
			name: "postgres", //$NON-NLS-0$
			description: " - Node.js require statement for Postgres DB", //$NON-NLS-0$
			template: "var pg = require('pg');\n" //$NON-NLS-0$
		},
		{
			prefix: "pg", //$NON-NLS-0$
			name: "postgres client", //$NON-NLS-0$
			description: " - create a new Postgres DB client", //$NON-NLS-0$
			template: "var pg = require('pg');\n" + //$NON-NLS-0$
					  "var url = \"postgres://postgres:${port}@${host}/${database}\";\n" +  //$NON-NLS-0$
					  "var ${client} = new pg.Client(url);\n"  //$NON-NLS-0$
		},
		{
			prefix: "pg", //$NON-NLS-0$
			name: "postgres connect", //$NON-NLS-0$
			description: " - create a new Postgres DB client and connect", //$NON-NLS-0$
			template: "var pg = require('pg');\n" + //$NON-NLS-0$
					  "var url = \"postgres://postgres:${port}@${host}/${database}\";\n" +  //$NON-NLS-0$
					  "var ${client} = new pg.Client(url);\n" + //$NON-NLS-0$
					  "${client}.connect(function(error) {\n" +  //$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});\n"
		},
		{
			prefix: "pg", //$NON-NLS-0$
			name: "postgres query", //$NON-NLS-0$
			description: " - create a new Postgres DB query statement", //$NON-NLS-0$
			template: "${client}.query(${sql}, function(error, result) {\n" + //$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});\n"
		},
		{
			prefix: "mysql", //$NON-NLS-0$
			name: "mysql", //$NON-NLS-0$
			description: " - Node.js require statement for MySQL DB", //$NON-NLS-0$
			template: "var mysql = require('mysql');\n" //$NON-NLS-0$
		},
		{
			prefix: "mysql", //$NON-NLS-0$
			name: "mysql connection", //$NON-NLS-0$
			description: " - create a new MySQL DB connection", //$NON-NLS-0$
			template: "var mysql = require('mysql');\n" + //$NON-NLS-0$
					  "var ${connection} = mysql.createConnection({\n" +  //$NON-NLS-0$
  					  "\thost : ${host},\n" +  //$NON-NLS-0$
  					  "\tuser : ${username},\n" +  //$NON-NLS-0$
  					  "\tpassword : ${password}\n" +  //$NON-NLS-0$
					  "});\n" + //$NON-NLS-0$
					  "try {\n" +  //$NON-NLS-0$
					  "\t${connection}.connect();\n" +  //$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "} finally {\n" +  //$NON-NLS-0$
					  "\t${connection}.end();\n" +  //$NON-NLS-0$
					  "}"
		},
		{
			prefix: "mysql", //$NON-NLS-0$
			name: "mysql query", //$NON-NLS-0$
			description: " - create a new MySQL DB query statement", //$NON-NLS-0$
			template: "${connection}.query(${sql}, function(error, rows, fields) {\n" + //$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});\n"  //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express", //$NON-NLS-0$
			description: " - Node.js require statement for Express", //$NON-NLS-0$
			template: "var ${name} = require('express');" //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express app", //$NON-NLS-0$
			description: " - create a new Express app", //$NON-NLS-0$
			template: "var express = require('express');\n" + //$NON-NLS-0$
					  "var ${app} = express();\n" +  //$NON-NLS-0$
					  "${cursor}\n"+  //$NON-NLS-0$
					  "app.listen(${timeout});\n"  //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express configure", //$NON-NLS-0$
			description: " - create an Express app configure statement", //$NON-NLS-0$
			template: "app.configure(function() {\n" +  //$NON-NLS-0$
  					  "\tapp.set(${id}, ${value});\n" +  //$NON-NLS-0$
					  "});"  //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express specific configure", //$NON-NLS-0$
			description: " - create a specific Express app configure statement", //$NON-NLS-0$
			template: "app.configure(${name}, function() {\n" +  //$NON-NLS-0$
  					  "\tapp.set(${id}, ${value});\n" +  //$NON-NLS-0$
					  "});"  //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express app get", //$NON-NLS-0$
			description: " - create a new Express app.get call", //$NON-NLS-0$
			template: "var value = app.get(${id}, function(request, result){\n" + //$NON-NLS-0$
					  "\t${cursor}\n});\n"  //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express app set", //$NON-NLS-0$
			description: " - create a new Express app set call", //$NON-NLS-0$
			template: "app.set(${id}, ${value});\n"  //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express app use", //$NON-NLS-0$
			description: " - create a new Express app use statement", //$NON-NLS-0$
			template: "app.use(${fnOrObject});\n" //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express app engine", //$NON-NLS-0$
			description: " - create a new Express app engine statement", //$NON-NLS-0$
			template: "app.engine(${fnOrObject});\n" //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express app param", //$NON-NLS-0$
			description: " - create a new Express app param statement", //$NON-NLS-0$
			template: "app.param(${id}, ${value});\n" //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express app error use", //$NON-NLS-0$
			description: " - create a new Express app error handling use statement", //$NON-NLS-0$
			template: "app.use(function(error, request, result, next) {\n" +  //$NON-NLS-0$
  					  "\tresult.send(${code}, ${message});\n" +  //$NON-NLS-0$
					  "});\n" //$NON-NLS-0$
		},
		{
			prefix: "amqp", //$NON-NLS-0$
			name: "amqp", //$NON-NLS-0$
			description: " - Node.js require statement for AMQP framework", //$NON-NLS-0$
			template: "var amqp = require('amqp');\n" //$NON-NLS-0$
		},
		{
			prefix: "amqp", //$NON-NLS-0$
			name: "amqp connection", //$NON-NLS-0$
			description: " - create a new AMQP connection ", //$NON-NLS-0$
			template: "var amqp = require('amqp');\n" + //$NON-NLS-0$
					  "var ${connection} = amqp.createConnection({\n" +  //$NON-NLS-0$ 
					  "\thost: ${host},\n" +  //$NON-NLS-0$
					  "\tport: ${port},\n" +  //$NON-NLS-0$
					  "\tlogin: ${login},\n" +  //$NON-NLS-0$
					  "\tpassword: ${password}\n" +  //$NON-NLS-0$
					  "});\n"  //$NON-NLS-0$
		},
		{
			prefix: "amqp", //$NON-NLS-0$
			name: "amqp on", //$NON-NLS-0$
			description: " - create a new AMQP connection on statement", //$NON-NLS-0$
			template: "${connection}.on(${event}, function() {\n" +  //$NON-NLS-0$ 
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});\n"  //$NON-NLS-0$
		},
		{
			prefix: "amqp", //$NON-NLS-0$
			name: "amqp queue", //$NON-NLS-0$
			description: " - create a new AMQP connection queue statement", //$NON-NLS-0$
			template: "${connection}.queue(${id}, function(queue) {\n" +  //$NON-NLS-0$
					  "\tqueue.bind(\'#\'); //catch all messages\n" + //$NON-NLS-0$
					  "\tqueue.subscribe(function (message, headers, deliveryInfo) {\n" + //$NON-NLS-0$
					  "\t\t// Receive messages\n" + //$NON-NLS-0$
					  "\t});\n" + //$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});\n"  //$NON-NLS-0$
		},
		{
			prefix: "amqp", //$NON-NLS-0$
			name: "amqp exchange", //$NON-NLS-0$
			description: " - create a new AMQP connection exchange", //$NON-NLS-0$
			template: "var exchange = ${connection}.exchange(${id}, {type: \'topic\'}, function(exchange) {\n" +  //$NON-NLS-0$ 
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});\n"  //$NON-NLS-0$
		},
	];

	/**
	 * @name orion.editor.JSTemplateContentAssistProvider
	 * @class Provides content assist for JavaScript keywords.
	 */
	function JSTemplateContentAssistProvider() {
	}
	JSTemplateContentAssistProvider.prototype = new mTemplates.TemplateContentAssist(mJS.keywords, templates);

	/**
	 * @description Determines if the invocation location is a valid place to use
	 * templates.  We are not being too precise here.  As an approximation,
	 * just look at the previous character.
	 * @function
	 * @public
	 * @param {String} prefix The prefix of the proposal, if any
	 * @param {String} buffer The entire buffer from the editor
	 * @param {Number} offset The offset into the buffer
	 * @param {Object} context The completion context object from the editor
	 * @return {Boolean} true if the current invocation location is
	 * a valid place for template proposals to appear.
	 * This means that the invocation location is at the start of a new statement.
	 */
	JSTemplateContentAssistProvider.prototype.isValid = function(prefix, buffer, offset, context) {
		var char = buffer.charAt(offset-prefix.length-1);
		return !char || uninterestingChars.indexOf(char) === -1;
	};

	return {
		JSTemplateContentAssistProvider: JSTemplateContentAssistProvider
	};
});

/******************************************************************************* 
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation 
 ******************************************************************************/
/*jslint browser:true regexp:true*/
/*global console define*/
define("orion/editor/AsyncStyler", ['i18n!orion/editor/nls/messages', 'orion/editor/annotations'], function(messages, mAnnotations) {
	var SERVICE_NAME = "orion.edit.highlighter";
	var HIGHLIGHT_ERROR_ANNOTATION = "orion.annotation.highlightError";
	var badServiceError = SERVICE_NAME + " service must be an event emitter";
	mAnnotations.AnnotationType.registerType(HIGHLIGHT_ERROR_ANNOTATION, {
		title: messages.syntaxError,
		html: "<div class='annotationHTML error'></div>",
		rangeStyle: {styleClass: "annotationRange error"}
	});

	function isRelevant(serviceReference) {
		return serviceReference.getProperty("objectClass").indexOf(SERVICE_NAME) !== -1 &&
				serviceReference.getProperty("type") === "highlighter";
	}

	/**
	 * @name orion.editor.AsyncStyler
	 * @class Provides asynchronous styling for a TextView using registered "highlighter" services.
	 * @description Creates an <code>AsyncStyler</code>. An AsyncStyler allows style information to be sent to a 
	 * <code>TextView</code> asynchronously through the service segistry. Style is generated by <em>style providers</em>, which are services
	 * having the <code>'orion.edit.highlighter'</code> service name and a <code>type</code> === <code>'highlighter'</code> service property.
	 *
	 * <p>A style provider monitors changes to the TextView (typically using an <code>orion.edit.model</code> service) and 
	 * dispatches a service event of type <code>'orion.edit.highlighter.styleReady'</code> when it has style information to send.
	 * The event carries a payload of style information for one or more lines in the TextView. The AsyncStyler then applies
	 * the style information fron the event to the TextView using the {@link orion.editor.TextView#event:onLineStyle} API.
	 * </p>
	 *
	 * <p>Applying style information may cause the TextView to be redrawn, which is potentially expensive. To minimize the 
	 * number of redraws, a provider should provide style for many lines in a single StyleReadyEvent.
	 * </p>
	 *
	 * @param {orion.editor.TextView} textView The TextView to style.
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry The ServiceRegistry to monitor for highlighter services.
	 * @param {orion.editor.AnnotationModel} [annotationModel] The Annotation Model to use for creating error and warning annotations.
	 * @see orion.editor.StyleReadyEvent
	 */
	function AsyncStyler(textView, serviceRegistry, annotationModel) {
		this.initialize(textView, serviceRegistry, annotationModel);
		this.lineStyles = [];
	}
	AsyncStyler.prototype = /** @lends orion.editor.AsyncStyler.prototype*/ {
		/** @private */
		initialize: function(textView, serviceRegistry, annotationModel) {
			this.textView = textView;
			this.serviceRegistry = serviceRegistry;
			this.annotationModel = annotationModel; 
			this.services = [];

			var self = this;
			this.listener = {
				onModelChanging: function(e) {
					self.onModelChanging(e);
				},
				onModelChanged: function(e) {
					self.onModelChanged(e);
				},
				onDestroy: function(e) {
					self.onDestroy(e);
				},
				onLineStyle: function(e) {
					self.onLineStyle(e);
				},
				onStyleReady: function(e) {
					self.onStyleReady(e);
				},
				onServiceAdded: function(serviceEvent) {
					self.onServiceAdded(serviceEvent.serviceReference, self.serviceRegistry.getService(serviceEvent.serviceReference));
				},
				onServiceRemoved: function(serviceEvent) {
					self.onServiceRemoved(serviceEvent.serviceReference, self.serviceRegistry.getService(serviceEvent.serviceReference));
				}
			};
			textView.addEventListener("ModelChanging", this.listener.onModelChanging);
			textView.addEventListener("ModelChanged", this.listener.onModelChanged);
			textView.addEventListener("Destroy", this.listener.onDestroy);
			textView.addEventListener("LineStyle", this.listener.onLineStyle);
			serviceRegistry.addEventListener("registered", this.listener.onServiceAdded);
			serviceRegistry.addEventListener("unregistering", this.listener.onServiceRemoved);

			var serviceRefs = serviceRegistry.getServiceReferences(SERVICE_NAME);
			for (var i = 0; i < serviceRefs.length; i++) {
				var serviceRef = serviceRefs[i];
				if (isRelevant(serviceRef)) {
					this.addServiceListener(serviceRegistry.getService(serviceRef));
				}
			}
		},
		/** @private */
		onDestroy: function(e) {
			this.destroy();
		},
		/** Deactivates this styler and removes any listeners it registered. */
		destroy: function() {
			if (this.textView) {
				this.textView.removeEventListener("ModelChanging", this.listener.onModelChanging);
				this.textView.removeEventListener("ModelChanged", this.listener.onModelChanged);
				this.textView.removeEventListener("Destroy", this.listener.onDestroy);
				this.textView.removeEventListener("LineStyle", this.listener.onLineStyle);
				this.textView = null;
			}
			if (this.services) {
				for (var i = 0; i < this.services.length; i++) {
					this.removeServiceListener(this.services[i]);
				}
				this.services = null;
			}
			if (this.serviceRegistry) {
				this.serviceRegistry.removeEventListener("registered", this.listener.onServiceAdded);
				this.serviceRegistry.removeEventListener("unregistering", this.listener.onServiceRemoved);
				this.serviceRegistry = null;
			}
			this.listener = null;
			this.lineStyles = null;
		},
		/** @private */
		onModelChanging: function(e) {
			this.startLine = this.textView.getModel().getLineAtOffset(e.start);
		},
		/** @private */
		onModelChanged: function(e) {
			var startLine = this.startLine;
			if (e.addedLineCount || e.removedLineCount) {
				Array.prototype.splice.apply(this.lineStyles, [startLine, e.removedLineCount].concat(this._getEmptyStyle(e.addedLineCount)));
			}
		},
		/** @private */
		onStyleReady: function(e) {
			var style = e.lineStyles || e.style;
			var min = Number.MAX_VALUE, max = -1;
			var model = this.textView.getModel();
			for (var lineIndex in style) {
				if (Object.prototype.hasOwnProperty.call(style, lineIndex)) {
					this.lineStyles[lineIndex] = style[lineIndex];
					min = Math.min(min, lineIndex);
					max = Math.max(max, lineIndex);
				}
			}
//			console.debug("Got style for lines " + (min+1) + " to " + (max+1));
			min = Math.max(min, 0);
			max = Math.min(max, model.getLineCount());
			
			var annotationModel = this.annotationModel;
			if (annotationModel) {
				var annos = annotationModel.getAnnotations(model.getLineStart(min), model.getLineEnd(max));
				var toRemove = [];
				while (annos.hasNext()) {
					var anno = annos.next();
					if (anno.type === HIGHLIGHT_ERROR_ANNOTATION) {
						toRemove.push(anno);
					}
				}
				var toAdd = [];
				for (var i = min; i <= max; i++) {
					lineIndex = i;
					var lineStyle = this.lineStyles[lineIndex], errors = lineStyle && lineStyle.errors;
					var lineStart = model.getLineStart(lineIndex);
					if (errors) {
						for (var j=0; j < errors.length; j++) {
							var err = errors[j];
							toAdd.push(mAnnotations.AnnotationType.createAnnotation(HIGHLIGHT_ERROR_ANNOTATION, err.start + lineStart, err.end + lineStart));
						}
					}
				}
				annotationModel.replaceAnnotations(toRemove, toAdd);
			}
			this.textView.redrawLines(min, max + 1);
		},
		/** @private */
		onLineStyle: function(e) {
			function _toDocumentOffset(ranges, lineStart) {
				var len = ranges.length, result = [];
				for (var i=0; i < len; i++) {
					var r = ranges[i];
					result.push({
						start: r.start + lineStart,
						end: r.end + lineStart,
						style: r.style
					});
				}
				return result;
			}
			var style = this.lineStyles[e.lineIndex];
			if (style) {
				// The 'ranges', 'errors' are of type {@link orion.editor.LineStyleEvent#ranges}, except the 
				// start and end indices are line-relative offsets, not document-relative.
				if (style.ranges) { e.ranges = _toDocumentOffset(style.ranges, e.lineStart); }
				else if (style.style) { e.style = style.style; }
			}
		},
		/** @private */
		_getEmptyStyle: function(n) {
			var result = [];
			for (var i=0; i < n; i++) {
				result.push(null);
			}
			return result;
		},
		/**
		 * Sets the content type ID for which style information will be provided. The ID will be passed to all style provider 
		 * services monitored by this AsyncStyler by calling the provider's own <code>setContentType(contentTypeId)</code> method.
		 *
		 * <p>In this way, a single provider service can be registered for several content types, and select different logic for 
		 * each type.</p>
		 * @param {String} contentTypeId The Content Type ID describing the kind of file currently being edited in the TextView.
		 * @see orion.core.ContentType
		 */
		setContentType: function(contentTypeId) {
			this.contentType = contentTypeId;
			if (this.services) {
				for (var i = 0; i < this.services.length; i++) {
					var service = this.services[i];
					if (service.setContentType) {
						var progress = this.serviceRegistry.getService("orion.page.progress");
						if(progress){
							progress.progress(service.setContentType(this.contentType), "Styling content type: " + this.contentType.id ? this.contentType.id: this.contentType);
						} else {
							service.setContentType(this.contentType);
						}
					}
				}
			}
		},
		/** @private */
		onServiceAdded: function(serviceRef, service) {
			if (isRelevant(serviceRef)) {
				this.addServiceListener(service);
			}
		},
		/** @private */
		onServiceRemoved: function(serviceRef, service) {
			if (this.services.indexOf(service) !== -1) {
				this.removeServiceListener(service);
			}
		},
		/** @private */
		addServiceListener: function(service) {
			if (typeof service.addEventListener === "function") {
				service.addEventListener("orion.edit.highlighter.styleReady", this.listener.onStyleReady);
				this.services.push(service);
				if (service.setContentType && this.contentType) {
					var progress = this.serviceRegistry.getService("orion.page.progress");
					if(progress){
						progress.progress(service.setContentType(this.contentType), "Styling content type: " + this.contentType.id ? this.contentType.id: this.contentType);
					} else {
						service.setContentType(this.contentType);
					}
				}
			} else {
				if (typeof console !== "undefined") {
					console.log(new Error(badServiceError));
				}
			}
		},
		/** @private */
		removeServiceListener: function(service) {
			if (typeof service.removeEventListener === "function") {
				service.removeEventListener("orion.edit.highlighter.styleReady", this.listener.onStyleReady);
				var serviceIndex = this.services.indexOf(service);
				if (serviceIndex !== -1) {
					this.services.splice(serviceIndex, 1);
				}
			} else {
				if (typeof console !== "undefined") {
					console.log(new Error(badServiceError));
				}
			}
		}
	};

	/**
	 * @name orion.editor.StyleReadyEvent
	 * @class Represents the styling for a range of lines, as provided by a service.
	 * @description Represents the styling for a range of lines, as provided by a service.
	 * @property {Object} lineStyles A map of style information. Each key of the map is a line index, and the value 
	 * is a {@link orion.editor.StyleReadyEvent#LineStyle} giving the style information for the line.
	 */
	/**
	 * @name orion.editor.StyleReadyEvent#LineStyle
	 * @class Represents style information for a line.
	 * @description Represents style information for a line.
	 * <p>Note that the offsets given in the {@link #ranges} and {@link #errors} properties are relative to the start of the
	 * line that this LineStyle is associated with, not the start of the document.</p>
	 * @property {orion.editor.StyleRange[]} ranges Optional; Gives the styles for this line.
	 * @property {orion.editor.StyleRange[]} errors Optional; Gives the error styles for this line. Error styles will be 
	 * presented as annotations in the UI.
	 */

	return AsyncStyler;
});

/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define console*/
/*jslint browser:true forin:true*/
define("orion/editor/mirror", ["i18n!orion/editor/nls/messages", "orion/editor/eventTarget", "orion/editor/annotations"], function(messages, mEventTarget, mAnnotations) {
	// TODO this affects indentation, which we don't support. Should be a parameter.
	var tabSize = 4;
	
	/**
	 * @private
	 * @name orion.mirror.Stream
	 * @class Encapsulates a line of code and the current position in the line.
	 * @description An implementation of CodeMirror's "StringStream" API.
	 * @see <a href="http://codemirror.net/doc/manual.html#StringStream">http://codemirror.net/doc/manual.html#StringStream</a>
	 */
	function Stream(/**String*/ str) {
		// Don't rename these or CodeMirror's "perl" mode will break.
		this.string = str;
		this.pos = 0;
		this.tokenStart = 0;
	}
	Stream.prototype = /** @lends orion.mirror.Stream.prototype */ {
		/** @returns {Boolean} */
		eol: function() { return this.pos >= this.string.length; },
		/** @returns {Boolean} */
		sol: function() { return this.pos === 0; },
		/** @returns {Char} */
		peek: function() { return this.string[this.pos]; },
		next: function() { return this.string[this.pos++]; },
		/** @returns {Char|undefined} */
		eat: function(/**String|RegExp|Function*/ match) {
			var c = this.string[this.pos];
			var isMatch = (typeof c === "string") && (c === match || (match.test && match.test(c)) || (typeof match === "function" && match(c)));
			return isMatch ? this.string[this.pos++] : undefined;
		},
		/** @returns {Boolean} */
		eatWhile: function(/**String|RegExp|Function*/ match) {
			var ate = false;
			while (this.eat(match) !== undefined) {
				ate = true;
			}
			return ate;
		},
		/** @returns {Boolean} */
		eatSpace: function() { return this.eatWhile(/\s/); },
		skipToEnd: function() { this.pos = this.string.length; },
		skipTo: function(/**Char*/ ch) {
			var idx = this.string.indexOf(ch, this.pos);
			if (idx !== -1) {
				this.pos = idx;
				return true;
			}
			return false;
		},
		match: function(/**String|RegExp*/ pattern, /**Boolean*/ consume, /**Boolean*/ caseFold) {
			consume = (consume === true || typeof consume === "undefined");
			if (typeof pattern === "string") {
				var str = caseFold ? this.string.toLowerCase() : this.string;
				pattern = caseFold ? pattern.toLowerCase() : pattern;
				var index = str.indexOf(pattern, this.pos);
				if (index !== -1 && consume) {
					this.pos = index + pattern.length;
				}
				return index !== -1;
			} else {
				var match = this.string.substring(this.pos).match(pattern);
				if (match && consume && typeof match[0] === "string") {
					this.pos += match.index + match[0].length;
				}
				return match;
			}
		},
		backUp: function(/**Number*/ n) { this.pos -= n; },
		/** @returns {Number} */
		column: function() {
			var col = 0, i = 0;
			while (i < this.tokenStart) {
				col += (this.string[i++] === "\t") ? tabSize : 1;
			}
			return col;
		},
		/** @returns {Number} */
		indentation: function() {
			var index = this.string.search(/\S/);
			var col = 0, i = 0;
			while(i < index) {
				col += (this.string[i++] === "\t") ? tabSize : 1;
			}
			return col;
		},
		/** @returns {String} */
		current: function() { return this.string.substring(this.tokenStart, this.pos); },
		advance: function() { this.tokenStart = this.pos; }
	};

	/**
	 * Creates a mode that consumes a stream and generates no tokens.
	 */
	function NullModeFactory(cmConfig, modeConfig) {
		return {
			token: function(stream, state) {
				return stream.skipToEnd();
			}
		};
	}

	/**
	 * @name orion.mirror.Mirror
	 * @class A shim for CodeMirror's <code>CodeMirror</code> API.
	 * @description A Mirror is a partial implementation of the API provided by the <code><a href="http://codemirror.net/doc/manual.html#api">CodeMirror object</a></code>.
	 * Mirror provides functionality related to mode and MIME management.
	 * 
	 * <p>If clients intend to reuse modes provided by CodeMirror without modification, they must expose a Mirror as 
	 * a property named <code>"CodeMirror"</code> of the global object so that modes may access it to register themselves,
	 * and to load other modes. For example:
	 * </p>
	 * <p><code>
	 * &lt;script&gt;<br>
	 * window.CodeMirror = new Mirror();<br>
	 * // Now you can load the CodeMirror mode scripts.<br>
	 * &lt/script&gt;
	 * </code></p>
	 * @see <a href="http://codemirror.net/manual.html">http://codemirror.net/manual.html</a>
	 */
	function Mirror(options) {
		this._modes = {};
		// This internal variable must be named "mimeModes" otherwise CodeMirror's "less" mode will fail.
		this.mimeModes = {};
		this.options = {};
	
		// Expose Stream as a property named "StringStream". This is required to support CodeMirror's Perl mode,
		// which monkey-patches CodeMirror.StringStream.prototype and will fail if that object doesn't exist.
		this.StringStream = Stream;

		this.defineMode("null", NullModeFactory);
		this.defineMIME("text/plain", "null");
	}
	function keys(obj) {
		var k = [];
		for (var p in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, p)) {
				k.push(p);
			}
		}
		return k;
	}
	Mirror.prototype = /** @lends orion.mirror.Mirror.prototype */ {
		options: {},
		/** @see <a href="http://codemirror.net/doc/manual.html#getOption">http://codemirror.net/doc/manual.html#getOption</a> */
		setOption: function(/**String*/ option, /**Object*/ value) { this.options[option] = value; },
		/**
		 * @see <a href="http://codemirror.net/doc/manual.html#getOption">http://codemirror.net/doc/manual.html#getOption</a>
		 * @returns {Object}
		 */
		getOption: function(option) { return this.options[option]; },
		/** 
		 * @see <a href="http://codemirror.net/doc/manual.html#modeapi">http://codemirror.net/doc/manual.html#modeapi</a>
		 * @returns {Object} A copy of <code>state</code>.
		 */
		copyState: function(/**Object*/ mode, /**Object*/ state) {
			if (typeof mode.copyState === "function") { return mode.copyState(state); }
			var newState = {};
			for (var prop in state) {
				var value = state[prop];
				newState[prop] = (value instanceof Array) ? value.slice() : value;
			}
			return newState;
		},
		/**
		 * Alias for mode.startState().
		 * @returns {Object} The start state returned by <code>mode</code>.
		 */
		startState: function(/**Object*/ mode, /**Number?*/ basecolumn) {
			return mode.startState(basecolumn);
		},
		/** @see <a href="http://codemirror.net/doc/manual.html#modeapi">http://codemirror.net/doc/manual.html#modeapi</a> */
		defineMode: function(/**String*/ name, /**Function(options, config)*/ modeFactory) {
			this._modes[name] = modeFactory;
		},
		/**
		 * @param {String} mime
		 * @param {String|Object} modeSpec
		 * @see <a href="http://codemirror.net/manual.html#option_mode">http://codemirror.net/manual.html#option_mode</a>
		 */
		defineMIME: function(mime, modeSpec) {
			this.mimeModes[mime] = modeSpec;
		},
		/**
		 * @param {String|Object} modeSpec 
		 * @see <a href="http://codemirror.net/manual.html#option_mode">http://codemirror.net/manual.html#option_mode</a>
		 * @returns {Object}
		 */
		getMode: function(options, modeSpec) {
			var config = {}, modeFactory;
			if (typeof modeSpec === "string" && this.mimeModes[modeSpec]) {
				modeSpec = this.mimeModes[modeSpec];
			}
			if (typeof modeSpec === "object") {
				config = modeSpec;
				modeFactory = this._modes[modeSpec.name];
			}
			modeFactory = modeFactory || this._modes[modeSpec];
			if (typeof modeFactory !== "function") {
				if (typeof console !== "undefined" && console) {
					console.log("Mode not found: " + modeSpec);
				}
				// Return the null mode here for compatibility with CodeMirror
				return this.getMode(options, "null");
			}
			return modeFactory(options, config);
		},
		/**
		 * @see <a href="http://codemirror.net/doc/manual.html#option_mode">http://codemirror.net/doc/manual.html#option_mode</a>
		 * @returns {String[]} The mode names.
		 */
		listModes: function() {
			return keys(this._modes);
		},
		/**
		 * @see <a href="http://codemirror.net/doc/manual.html#option_mode">http://codemirror.net/doc/manual.html#option_mode</a>
		 * @returns {String[]} The MIMEs.
		 */
		listMIMEs: function() {
			return keys(this.mimeModes);
		},
		_getModeName: function(mime) {
			var mname = this.mimeModes[mime];
			if (typeof mname === "object") { mname = mname.name; }
			return mname;
		}
	};

	/**
	 * @name orion.mirror.ModeApplier#HighlightEvent
	 * @event
	 * @description Dispatched when the ModeApplier has updated the highlight info for a region of the file.
	 * @param {Number} start The starting line index of the highlighted region.
	 * @param {Number} end The ending line index of the highlighted region.
	 */
	/**
	 * @name orion.mirror.MirrorLineStyle
	 * @class Represents the style provided by a CodeMirror mode for a line.
	 */
	/**
	 * @name orion.mirror.ModeApplier
	 * @class Driver for CodeMirror modes.
	 * @description A <code>ModeApplier</code> listens to text changes on a {@link orion.editor.TextModel} and drives
	 * a CodeMirror mode to calculate highlighting in response to the change. Clients can use the highlighting information
	 * to style a {@link orion.editor.TextView}.
	 * 
	 * <p>After a change is made to the {@link orion.editor.TextModel}, ModeApplier immediately updates the highlighting 
	 * information for a small portion of the file around where the change occurred. Successive portions of the file are
	 * updated by short jobs that run periodically to avoid slowing down the rest of the application.</p>
	 * 
	 * <p>A {@link #event:HighlightEvent} event is dispatched every time the ModeApplier updates highlighting information for
	 * a portion of the file. The event contains information about which lines were highlighted. The style for any highlighted
	 * line can be obtained by calling {@link #getLineStyle}.</p>
	 * 
	 * @param {orion.editor.TextModel} model The text model to listen to.
	 * @param {orion.mirror.Mirror} mirror The {@link orion.mirror.Mirror} to use for loading modes.
	 * @param {Object} [options]
	 * <!-- @param {Boolean} [options.whitespacesVisible] If <code>true</code>, causes ModeApplier 
	 * to generate style regions for any whitespace characters that are not claimed as tokens by the mode. -->
	 * @borrows orion.editor.EventTarget#addEventListener as #addEventListener
	 * @borrows orion.editor.EventTarget#removeEventListener as #removeEventListener
	 * @borrows orion.editor.EventTarget#dispatchEvent as #dispatchEvent
	 */
	function ModeApplier(model, codeMirror, options) {
		options = options || {};
		this.model = model;
		this.codeMirror = codeMirror;
		this.isWhitespaceVisible = (typeof options.whitespacesVisible === "undefined" ? false : options.whitespacesVisible);
		
		this.mode = null;
		this.isModeLoaded = false;
		this.lines = []; // Array of {style: Array, eolState: state}
		this.dirtyLines = [];
		this.startLine = Number.MAX_VALUE;
		this.endLine = -1;
		this.timer = null;

		this.initialize(model);
	}
	
	var TAB = "punctuation separator tab",
	    SPACE = "punctuation separator space",

	    /* Max number of lines to immediately re-highlight after an edit. Remaining lines are handled by follow-up jobs. */
	    MAX_REHIGHLIGHT = 500,

	    /* Time in ms to wait between highlight jobs. */
	    JOB_INTERVAL = 50,

	    /* Maximum duration in ms of the re-highlight job.*/
	    JOB_DURATION = 30,

	    /*
	     * During a highlight job, when mode doesn't define a "compareStates" method and we find more than this many
	     * consecutive unchanged lines, the job aborts. (Assumes rest of file is already correctly highlighted.)
	     */
	    ABORT_THRESHOLD = 3,

	    /* Maximum number of lines to backtrack when searching for previous state to resume parsing from. */
	    MAX_BACKTRACK = 40;
	
	ModeApplier.prototype = /** @lends orion.mirror.ModeApplier.prototype */ {
		/** @private */
		initialize: function(model) {
			var self = this;
			this.listener = {
				onModelChanging: function(e) {
					self._onModelChanging(e);
				},
				onModelChanged: function(e) { // Internal detail of TextModel?
					self._onModelChanged(e);
				},
				onDestroy: function(e) {
					self._onDestroy(e);
				}
			};
			this.model.addEventListener("Changing", this.listener.onModelChanging);
			this.model.addEventListener("Changed", this.listener.onModelChanged);
			this.model.addEventListener("Destroy", this.listener.onDestroy);
		},
		/** Deactivates this ModeApplier and removes its listeners. */
		destroy: function() {
			if (this.model) {
				this.model.removeEventListener("Changing", this.listener.onModelChanging);
				this.model.removeEventListener("Changed", this.listener.onModelChanged);
				this.model.removeEventListener("Destroy", this.listener.onDestroy);
			}
			this.model = null;
			this.codeMirror = null;
			this.mode = null;
			this.lines = null;
			this.dirtyLines = null;
			clearTimeout(this.timer);
			this.timer = null;
		},
		_onModelChanging: function(e) {
			this.startLine = this.model.getLineAtOffset(e.start);
		},
		_onModelChanged: function(e) {
			this._dbgEvent(e);
			var startLine = this.startLine;
			if (e.removedLineCount || e.addedLineCount) {
				// Patch up the line styles array; new lines get empty styles
				Array.prototype.splice.apply(this.lines, [startLine + 1, e.removedLineCount].concat(this._newLines(e.addedLineCount)));
			}
			if (!this.mode) {
				return;
			}
			// We need to continue at least until editEndLine, and possibly beyond up to MAX_REHIGHLIGHT
			var editEndLine = Math.max(e.addedLineCount, e.removedLineCount);
			var endLine = startLine + Math.min(editEndLine, MAX_REHIGHLIGHT);
			this.highlight(startLine, endLine);
			
			// Launch a job to fix up the rest of the buffer
			this.highlightLater(endLine + 1);
		},
		_onDestroy: function(e) {
			this.destroy();
		},
		/** @private */
		setViewportIndex: function(viewportIndex) {
			// TODO this is for the viewport-priority case
			this.viewportIndex = viewportIndex;
		},
		_dbgEvent: function(e) {
//			var str = keys(e).map(function(p) {
//				return p + ": " + e[p];
//			});
//			console.debug( str.join(", ") );
		},
		_dbgStyle: function() {
//			var r = [];
//			for (var i=0; i < this.lines.length; i++) {
//				var style = this.lines[i].style || [];
//				var l = "" + i + ": " ;
//				for (var j=0; j < style.length; j++) {
//					var region = style[j];
//					l += region[0] + "," + region[1] + "\"" + region[2] + "\" ";
//				}
//				r.push(l);
//			}
//			console.debug(r.join("\n"));
		},
		_newLines: function(n, startIndex) {
			if (typeof startIndex === "undefined") { startIndex = 0; }
			var newLines = [];
			for (var i=0; i < n; i++) {
				newLines.push({
					style: null,
					eolState: null
				});
			}
			return newLines;
		},
		/**
		 * Sets the CodeMirror mode to be used for highlighting. The mode must be registered with the {@link orion.mirror.Mirror}
		 * that this <code>ModeApplier</code> was created with. (The methods {@link orion.mirror.Mirror#defineMode} and
		 * {@link orion.mirror.Mirror#defineMIME} can be used to register a mode with a Mirror.)
		 * @param {String} modeSpec Mode name or MIME type.
		 * @param {Boolean} [highlightImmediately=false]
		 */
		setMode: function(modeSpec, highlightImmediately) {
			if (!modeSpec) { return; }
			this.mode = this.codeMirror.getMode(this.codeMirror.options, modeSpec);
			this.lines = this._newLines(this.model.getLineCount());
			if (highlightImmediately) {
				this.highlight();
			}
		},
		/**
		 * Highlights the given range of lines.
		 * @param {Number} [startLine]
		 * @param {Number} [endLine]
		 * @param {Boolean} [partial=false] If <code>true</code>, this function is assumed to be running as part of a larger
		 * operation, and will not dispatch a {@link #event:HighlightEvent}.
		 */
		highlight: function(startLine, endLine, partial) {
			if (!this.mode) {
				return;
			}
			var lineCount = this.model.getLineCount();
			startLine = typeof startLine === "undefined" ? 0 : startLine;
			endLine = typeof endLine === "undefined" ? lineCount - 1 : Math.min(endLine, lineCount - 1);
			var mode = this.mode;
			var state = this.getState(startLine);
			for (var i = startLine; i <= endLine; i++) {
				var line = this.lines[i];
				this.highlightLine(i, line, state);
				line.eolState = this.codeMirror.copyState(mode, state);
			}
//			console.debug("Highlighted " + startLine + " to " + endLine);
			this._expandRange(startLine, endLine);
			if (!partial) {
				this.onHighlightDone();
			}
		},
		/**
		 * Schedules a job that will begin highlighting from <code>startLine</code>. The job runs for a short amount of time,
		 * after which it dispatches a {@link #event:HighlightEvent} indicating its progress, and yields. Follow-up jobs are
		 * scheduled automatically if there's more highlighting to be done.
		 */
		highlightLater: function(/**Number*/ startLine) {
			this.dirtyLines.push(startLine);
			var self = this;
			this.timer = setTimeout(function() {
				self._highlightJob();
			}, JOB_INTERVAL);
		},
		/**
		 * Highlights starting from some dirty line index. Potentially continues up to model.getLineCount(). If this function runs
		 * for longer than JOB_DURATION, it schedules a follow-up job to continue the work, and returns. A HighlightEvent is 
		 * dispatched just before this function finishes.
		 */
		_highlightJob: function() {
			var stopTime = +new Date() + JOB_DURATION, compareStates = this.mode.compareStates, lineCount = this.model.getLineCount();
			while (this.dirtyLines.length) {
				// TODO support viewport priority
				var viewportIndex = this.viewportIndex, viewportLine = this.lines[viewportIndex], lineIndex;
				if (viewportLine && !viewportLine.eolState) {
					lineIndex = viewportIndex;
				} else {
					lineIndex = this.dirtyLines.pop();
				}
				if (lineIndex >= lineCount) {
					break;
				}
				this._expandRange(lineIndex, lineIndex);
				var resumeIndex = this._getResumeLineIndex(lineIndex), startIndex = resumeIndex + 1;
				var state = (resumeIndex >= 0) && this.lines[resumeIndex].eolState;
				state = state ? this.codeMirror.copyState(this.mode, state) : this.mode.startState();
				
				var numUnchanged = 0;
				for (var i=startIndex; i < lineCount; i++) {
					var l = this.lines[i];
					var oldState = l.eolState;
					var isChanged = this.highlightLine(i, l, state);
					l.eolState = this.codeMirror.copyState(this.mode, state);
					if (isChanged) {
						this._expandRange(startIndex, i+1);
					}
					var isCompareStop = compareStates && oldState && compareStates(oldState, l.eolState);
					var isHeuristicStop = !compareStates && !isChanged && (numUnchanged++ > ABORT_THRESHOLD);
					if (isCompareStop || isHeuristicStop) {
						break; // Abort completely. Don't highlight any more lines
					} else if (!oldState || isChanged) {
						numUnchanged = 0;
					}
					var workRemains = i < lineCount || this.dirtyLines.length;
					var timeElapsed = +new Date() > stopTime && workRemains;
					if (timeElapsed) {
						// Stop, continue later
						//this._expandRange(startIndex, i + 1);
						this.highlightLater(i + 1);
						this.onHighlightDone();
						return; // TODO clean up terminating condition
					}
				}
			}
			this.onHighlightDone();
		},
		/** Called when some highlighting has been performed. Dispatches a {@link #event:HighlightEvent}. */
		onHighlightDone: function() {
			if (this.startLine !== Number.MAX_VALUE && this.endLine !== -1) {
				this.dispatchEvent({
					type: "Highlight",
					start: this.startLine,
					end: this.endLine
				});
			}
			this.startLine = Number.MAX_VALUE;
			this.endLine = -1;
		},
		_getResumeLineIndex: function(lineIndex) {
			var lines = this.lines;
			for (var i = lineIndex - 1; i >= 0; i--) {
				if (lines[i].eolState || lineIndex - i > MAX_BACKTRACK) {
					return i;
				}
			}
			return -1;
		},
		/**
		 * Returns the state we can use for parsing from the start of the <i><code>lineIndex</code></i>th line.
		 * @returns {Object} The state. This object is safe to mutate.
		 */
		getState: function(/**Number*/ lineIndex) {
			var mode = this.mode, lines = this.lines;
			var i, line;
			for (i = lineIndex-1; i >= 0; i--) {
				line = lines[i];
				if (line.eolState || lineIndex - i > MAX_BACKTRACK) {
					// CodeMirror optimizes by using least-indented line; we just use this line
					break;
				}
			}
			var state = (i >= 0) && lines[i].eolState;
			if (state) {
				state = this.codeMirror.copyState(mode, state);
				// Highlight from i up to lineIndex-1
				i = Math.max(0, i);
				for (var j = i; j < lineIndex-1; j++) {
					line = lines[j];
					this.highlightLine(j, line, state);
					line.eolState = this.codeMirror.copyState(mode, state);
				}
				return state; // is a copy of lines[lineIndex - 1].eolState
			} else {
				return mode.startState();
			}
		},
		/**
		 * Highlights a single line.
		 * @param {Number} lineIndex
		 * @param {Object} line
		 * @param {Object} state The state to use for parsing from the start of the line.
		 */
		highlightLine: function(lineIndex, line, state) {
			if (!this.mode) {
				return;
			}
			var model = this.model;
			if (model.getLineStart(lineIndex) === model.getLineEnd(lineIndex) && this.mode.blankLine) {
				this.mode.blankLine(state);
			}
			var style = line.style || [];
			var text = model.getLine(lineIndex);
			var stream = new Stream(text);
			var isChanged = !line.style;
			var newStyle = [], ws;
			for (var i=0; !stream.eol(); i++) {
				var tok = this.mode.token(stream, state) || null;
				var tokStr = stream.current();
				ws = this._whitespaceStyle(tok, tokStr, stream.tokenStart);
				if (ws) {
					// TODO Replace this (null) token with whitespace tokens. Do something smart
					// to figure out isChanged, I guess
				}
				var newS = [stream.tokenStart, stream.pos, tok]; // shape is [start, end, token]
				var oldS = style[i];
				newStyle.push(newS);
				isChanged = isChanged || !oldS || oldS[0] !== newS[0] || oldS[1] !== newS[1] || oldS[2] !== newS[2];
				stream.advance();
			}
			isChanged = isChanged || (newStyle.length !== style.length);
			if (isChanged) { line.style = newStyle.length ? newStyle : null; }
			return isChanged;
		},
		/**
		 * If given an un-token'd chunk of whitespace, returns whitespace style tokens for it.
		 * @returns {Array} The whitespace styles for the token, or null.
		 */
		_whitespaceStyle: function(token, str, pos) {
			if (!token && this.isWhitespaceVisible && /\s+/.test(str)) {
				var whitespaceStyles = [], start, type;
				for (var i=0; i < str.length; i++) {
					var chr = str[i];
					if (chr !== type) {
						if (type) {
							whitespaceStyles.push([pos + start, pos + i, (type === "\t" ? TAB : SPACE)]);
						}
						start = i;
						type = chr;
					}
				}
				whitespaceStyles.push([pos + start, pos + i, (type === "\t" ? TAB : SPACE)]);
				return whitespaceStyles;
			}
			return null;
		},
		_expandRange: function(startLine, endLine) {
			this.startLine = Math.min(this.startLine, startLine);
			this.endLine = Math.max(this.endLine, endLine);
		},
		/**
		 * Converts a <code>MirrorLineStyle</code> to a {@link orion.editor.StyleRange[]}.
		 * @param {orion.mirror.MirrorLineStyle} style The line style to convert.
		 * @param {Number} [lineIndex] The line index of the line having the given style. If omitted, the returned 
		 * {@link orion.editor.StyleRange[]} objects will have offsets relative to the line, not the document.
		 * 
		 * @returns {Array} An array of 2 elements. The first element is an {@link orion.editor.StyleRange[]} giving the styles for the line. 
		 * The second element is an {@link orion.editor.StyleRange[]} containing only those elements of the first array that represent
		 * syntax errors. (By CodeMirror convention, anything assigned the <code>"cm-error"</code> tag is assumed to be an error).</p>
		 */
		toStyleRangesAndErrors: function(lineStyle, lineIndex) {
			function token2Class(token) {
				if (!token) { return null; }
				if (token === TAB || token === SPACE) { return token; }
				return "cm-" + token;
			}
			var style = lineStyle.style;
			if (!style) { return null; }
			var ranges = [], errors = [];
			var offset = (typeof lineIndex === "undefined") ? 0 : this.model.getLineStart(lineIndex);
			for (var i=0; i < style.length; i++) {
				var elem = style[i]; // shape is [start, end, token]
				var className = token2Class(elem[2]);
				if (!className) { continue; }
				var obj = {
					start: offset + elem[0],
					end: offset + elem[1],
					style: {styleClass: className} };
				ranges.push(obj);
				if (className === "cm-error") {
					errors.push(obj);
				}
			}
			return [ranges, errors];
		},
		/** @returns {orion.mirror.MirrorLineStyle} */
		getLineStyle: function(/**Number*/ lineIndex) {
			return this.lines[lineIndex];
		},
		/** @returns {orion.mirror.MirrorLineStyle[]} */
		getLineStyles: function() {
			return this.lines;
		}
	};
	mEventTarget.EventTarget.addMixin(ModeApplier.prototype);

	/**
	 * @name orion.mirror.CodeMirrorStyler
	 * @class A styler that uses CodeMirror modes to provide styles for a {@link orion.editor.TextView}.
	 * @description A <code>CodeMirrorStyler</code> applies one or more CodeMirror modes to provide styles for a {@link orion.editor.TextView}.
	 * It uses modes that are registered with the {@link orion.mirror.Mirror} object passed to the CodeMirrorStyler constructor.
	 * 
	 * <p>The process for using CodeMirrorStyler is as follows:</p>
	 * <ol>
	 * <li>Create a {@link orion.mirror.Mirror}.</li>
	 * <li>Load the modes you want to use and register them with the <code>Mirror</code> using {@link orion.mirror.Mirror#defineMode}.
	 * <p>Note that the <a href="https://github.com/marijnh/CodeMirror2/tree/master/mode">modes included with CodeMirror</a> expect
	 * a global variable named "CodeMirror" to be available. If you intend to use these modes without modification, you must first 
	 * expose your Mirror as a global variable. See the {@link orion.mirror.Mirror} documentation for details.</p>
	 * </li>
	 * <li>Call {@link #setMode} to tell the styler what mode to use for highlighting the view.
	 * <p>Note that the mode may refer to other modes to process nested language text. In such cases, you should ensure that all
	 * dependent modes have been registered with the Mirror before calling {@link #setMode}.</p>
	 * </li>
	 * 
	 * @param {orion.editor.TextView} textView The TextView to provide style for.
	 * @param {orion.mirror.Mirror} codeMirror The Mirror object to load modes from.
	 * @param {orion.editor.AnnotationModel} [annotationModel]
	 */
	function CodeMirrorStyler(textView, codeMirror, annotationModel) {
		this.init(textView, codeMirror, annotationModel);
	}

	var LINESTYLE_OVERSHOOT = 20;
	var HIGHLIGHT_ERROR_ANNOTATION = "orion.annotation.highlightError";
	mAnnotations.AnnotationType.registerType(HIGHLIGHT_ERROR_ANNOTATION, {
		title: messages.syntaxError,
		html: "<div class='annotationHTML error'></div>",
		rangeStyle: {styleClass: "annotationRange error"}
	});

	CodeMirrorStyler.prototype = /** @lends orion.mirror.CodeMirrorStyler.prototype */ {
		/** @private */
		init: function(textView, codeMirror, annotationModel) {
			this.textView = textView;
			this.annotationModel = annotationModel;
			this.modeApplier = new ModeApplier(textView.getModel(), codeMirror);
			var self = this;
			this.listener = {
				onLineStyle: function(e) {
					self.onLineStyle(e);
				},
				onDestroy: function(e) {
					self.onDestroy(e);
				},
				onHighlight: function(e) {
					self.onHighlight(e);
				}
			};
			textView.addEventListener("LineStyle", this.listener.onLineStyle);
			textView.addEventListener("Destroy", this.listener.onDestroy);
			this.modeApplier.addEventListener("Highlight", this.listener.onHighlight);
		},
		/** Deactivates this styler and removes its listeners. */
		destroy: function() {
			if (this.modeApplier) {
				this.modeApplier.removeEventListener("Highlight", this.listener.onHighlight);
				this.modeApplier.destroy();
			}
			if (this.annotationModel) {
				// remove annotation listeners
			}
			if (this.textView) {
				this.textView.removeEventListener("LineStyle", this.listener.onLineStyle);
				this.textView.removeEventListener("Destroy", this.listener.onDestroy);
			}
			this.textView = null;
			this.annotationModel = null;
			this.modeApplier = null;
			this.listener = null;
		},
		/** 
		 * Sets the CodeMirror mode that this styler will use for styling the view.
		 * @param {String} modeSpec Name of the mode to use (eg. <code>"css"</code>), or a MIME type defined by the mode
		 * (eg. <code>"text/css"</code>).
		 */
		setMode: function(modeSpec) {
			this.modeApplier.setMode(modeSpec);
		},
		/** @private */
		onLineStyle: function(e) {
			var lineIndex = e.lineIndex, modeApplier = this.modeApplier, style = modeApplier.getLineStyle(lineIndex);
			if (!(style && style.eolState)) {
				// Start highlighting from lineIndex, do a few more lines
				var lineCount = this.textView.getModel().getLineCount();
				modeApplier.highlight(lineIndex, Math.min(lineIndex + LINESTYLE_OVERSHOOT, lineCount - 1), true /*don't dispatch*/);
				style = modeApplier.getLineStyle(lineIndex);
			}
			var model = this.textView.getModel();
			if (style) {
				// Now we have a style for the line. It may not be correct in the case where lineIndex is at the end of a large
				// buffer. But in that case, the highlight job kicked off by ModelChanged will eventually reach it and fix it up.
				var rangesAndErrors = modeApplier.toStyleRangesAndErrors(style, lineIndex);
				if (rangesAndErrors) {
					e.ranges = rangesAndErrors[0];
					var annotationModel = this.annotationModel;
					if (annotationModel) {
						var toRemove = [], toAdd = [];
						var errors = rangesAndErrors[1];
						if (errors) {
							for (var i=0; i < errors.length; i++) {
								var error = errors[i];
								if (error.style.styleClass === "cm-error") {
									toAdd.push(mAnnotations.AnnotationType.createAnnotation(HIGHLIGHT_ERROR_ANNOTATION, error.start, error.end));
								}
							}
						}
						var annos = annotationModel.getAnnotations(model.getLineStart(lineIndex), model.getLineEnd(lineIndex));
						while (annos.hasNext()) {
							var anno = annos.next();
							if (anno.type === HIGHLIGHT_ERROR_ANNOTATION) {
								toRemove.push(anno);
							}
						}
						annotationModel.replaceAnnotations(toRemove, toAdd);
					}
				}
			}
		},
		/** @private */
		onHighlight: function(e) {
			// If the highlighted lines are in view, redraw them
			var start = e.start, end = e.end;
			this.textView.redrawLines(start, end);
		},
		/** @private */
		onDestroy: function(e) {
			this.destroy();
		}
	};

	return {
		Mirror: Mirror,
		ModeApplier: ModeApplier,
		CodeMirrorStyler: CodeMirrorStyler
	};
});

/******************************************************************************* 
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation 
 ******************************************************************************/

/*jslint regexp:false laxbreak:true*/
/*global define */

define("orion/editor/textMateStyler", ['orion/regex' ], function(mRegex) {

var RegexUtil = {
	// Rules to detect some unsupported Oniguruma features
	unsupported: [
		{regex: /\(\?[ims\-]:/, func: function(match) { return "option on/off for subexp"; }},
		{regex: /\(\?<([=!])/, func: function(match) { return (match[1] === "=") ? "lookbehind" : "negative lookbehind"; }},
		{regex: /\(\?>/, func: function(match) { return "atomic group"; }}
	],
	
	/**
	 * @param {String} str String giving a regular expression pattern from a TextMate grammar.
	 * @param {String} [flags] [ismg]+
	 * @returns {RegExp}
	 */
	toRegExp: function(str) {
		function fail(feature, match) {
			throw new Error("Unsupported regex feature \"" + feature + "\": \"" + match[0] + "\" at index: "
					+ match.index + " in " + match.input);
		}
		// Turns an extended regex pattern into a normal one
		function normalize(/**String*/ str) {
			var result = "";
			var insideCharacterClass = false;
			var len = str.length;
			for (var i=0; i < len; ) {
				var chr = str.charAt(i);
				if (!insideCharacterClass && chr === "#") {
					// skip to eol
					while (i < len && chr !== "\r" && chr !== "\n") {
						chr = str.charAt(++i);
					}
				} else if (!insideCharacterClass && /\s/.test(chr)) {
					// skip whitespace
					while (i < len && /\s/.test(chr)) { 
						chr = str.charAt(++i);
					}
				} else if (chr === "\\") {
					result += chr;
					if (!/\s/.test(str.charAt(i+1))) {
						result += str.charAt(i+1);
						i += 1;
					}
					i += 1;
				} else if (chr === "[") {
					insideCharacterClass = true;
					result += chr;
					i += 1;
				} else if (chr === "]") {
					insideCharacterClass = false;
					result += chr;
					i += 1;
				} else {
					result += chr;
					i += 1;
				}
			}
			return result;
		}
		
		var flags = "";
		var i;
		
		// Handle global "x" flag (whitespace/comments)
		str = RegexUtil.processGlobalFlag("x", str, function(subexp) {
				return normalize(subexp);
			});
		
		// Handle global "i" flag (case-insensitive)
		str = RegexUtil.processGlobalFlag("i", str, function(subexp) {
				flags += "i";
				return subexp;
			});
		
		// Check for remaining unsupported syntax
		for (i=0; i < this.unsupported.length; i++) {
			var match;
			if ((match = this.unsupported[i].regex.exec(str))) {
				fail(this.unsupported[i].func(match), match);
			}
		}
		
		return new RegExp(str, flags);
	},
	
	/**
	 * Checks if flag applies to entire pattern. If so, obtains replacement string by calling processor
	 * on the unwrapped pattern. Handles 2 possible syntaxes: (?f)pat and (?f:pat)
	 * @param {String} flag
	 * @param {String} str
	 * @param {Function} processor
	 */
	processGlobalFlag: function(flag, str, processor) {
		function getMatchingCloseParen(/*String*/pat, /*Number*/start) {
			var depth = 0,
			    len = pat.length,
			    flagStop = -1;
			for (var i=start; i < len && flagStop === -1; i++) {
				switch (pat.charAt(i)) {
					case "\\":
						i++; // escape: skip next char
						break;
					case "(":
						depth++;
						break;
					case ")":
						depth--;
						if (depth === 0) {
							flagStop = i;
						}
						break;
				}
			}
			return flagStop;
		}
		var flag1 = "(?" + flag + ")",
		    flag2 = "(?" + flag + ":";
		if (str.substring(0, flag1.length) === flag1) {
			return processor(str.substring(flag1.length));
		} else if (str.substring(0, flag2.length) === flag2) {
			var flagStop = getMatchingCloseParen(str, 0);
			if (flagStop < str.length-1) {
				throw new Error("Only a " + flag2 + ") group that encloses the entire regex is supported in: " + str);
			}
			return processor(str.substring(flag2.length, flagStop));
		}
		return str;
	},
	
	hasBackReference: function(/**RegExp*/ regex) {
		return (/\\\d+/).test(regex.source);
	},
	
	/** @returns {RegExp} A regex made by substituting any backreferences in <code>regex</code> for the value of the property
	 * in <code>sub</code> with the same name as the backreferenced group number. */
	getSubstitutedRegex: function(/**RegExp*/ regex, /**Object*/ sub, /**Boolean*/ escape) {
		escape = (typeof escape === "undefined") ? true : false;
		var exploded = regex.source.split(/(\\\d+)/g);
		var array = [];
		for (var i=0; i < exploded.length; i++) {
			var term = exploded[i];
			var backrefMatch = /\\(\d+)/.exec(term);
			if (backrefMatch) {
				var text = sub[backrefMatch[1]] || "";
				array.push(escape ? mRegex.escape(text) : text);
			} else {
				array.push(term);
			}
		}
		return new RegExp(array.join(""));
	},
	
	/**
	 * Builds a version of <code>regex</code> with every non-capturing term converted into a capturing group. This is a workaround
	 * for JavaScript's lack of API to get the index at which a matched group begins in the input string.<p>
	 * Using the "groupified" regex, we can sum the lengths of matches from <i>consuming groups</i> 1..n-1 to obtain the 
	 * starting index of group n. (A consuming group is a capturing group that is not inside a lookahead assertion).</p>
	 * Example: groupify(/(a+)x+(b+)/) === /(a+)(x+)(b+)/<br />
	 * Example: groupify(/(?:x+(a+))b+/) === /(?:(x+)(a+))(b+)/
	 * @param {RegExp} regex The regex to groupify.
	 * @param {Object} [backRefOld2NewMap] Optional. If provided, the backreference numbers in regex will be updated using the 
	 * properties of this object rather than the new group numbers of regex itself.
	 * <ul><li>[0] {RegExp} The groupified version of the input regex.</li>
	 * <li>[1] {Object} A map containing old-group to new-group info. Each property is a capturing group number of <code>regex</code>
	 * and its value is the corresponding capturing group number of [0].</li>
	 * <li>[2] {Object} A map indicating which capturing groups of [0] are also consuming groups. If a group number is found
	 * as a property in this object, then it's a consuming group.</li></ul>
	 */
	groupify: function(regex, backRefOld2NewMap) {
		var NON_CAPTURING = 1,
		    CAPTURING = 2,
		    LOOKAHEAD = 3,
		    NEW_CAPTURING = 4;
		var src = regex.source,
		    len = src.length;
		var groups = [],
		    lookaheadDepth = 0,
		    newGroups = [],
		    oldGroupNumber = 1,
		    newGroupNumber = 1;
		var result = [],
		    old2New = {},
		    consuming = {};
		for (var i=0; i < len; i++) {
			var curGroup = groups[groups.length-1];
			var chr = src.charAt(i);
			switch (chr) {
				case "(":
					// If we're in new capturing group, close it since ( signals end-of-term
					if (curGroup === NEW_CAPTURING) {
						groups.pop();
						result.push(")");
						newGroups[newGroups.length-1].end = i;
					}
					var peek2 = (i + 2 < len) ? (src.charAt(i+1) + "" + src.charAt(i+2)) : null;
					if (peek2 === "?:" || peek2 === "?=" || peek2 === "?!") {
						// Found non-capturing group or lookahead assertion. Note that we preserve non-capturing groups
						// as such, but any term inside them will become a new capturing group (unless it happens to
						// also be inside a lookahead).
						var groupType;
						if (peek2 === "?:") {
							groupType = NON_CAPTURING;
						} else {
							groupType = LOOKAHEAD;
							lookaheadDepth++;
						}
						groups.push(groupType);
						newGroups.push({ start: i, end: -1, type: groupType /*non capturing*/ });
						result.push(chr);
						result.push(peek2);
						i += peek2.length;
					} else {
						groups.push(CAPTURING);
						newGroups.push({ start: i, end: -1, type: CAPTURING, oldNum: oldGroupNumber, num: newGroupNumber });
						result.push(chr);
						if (lookaheadDepth === 0) {
							consuming[newGroupNumber] = null;
						}
						old2New[oldGroupNumber] = newGroupNumber;
						oldGroupNumber++;
						newGroupNumber++;
					}
					break;
				case ")":
					var group = groups.pop();
					if (group === LOOKAHEAD) { lookaheadDepth--; }
					newGroups[newGroups.length-1].end = i;
					result.push(chr);
					break;
				case "*":
				case "+":
				case "?":
				case "}":
					// Unary operator. If it's being applied to a capturing group, we need to add a new capturing group
					// enclosing the pair
					var op = chr;
					var prev = src.charAt(i-1),
					    prevIndex = i-1;
					if (chr === "}") {
						for (var j=i-1; src.charAt(j) !== "{" && j >= 0; j--) {}
						prev = src.charAt(j-1);
						prevIndex = j-1;
						op = src.substring(j, i+1);
					}
					var lastGroup = newGroups[newGroups.length-1];
					if (prev === ")" && (lastGroup.type === CAPTURING || lastGroup.type === NEW_CAPTURING)) {
						// Shove in the new group's (, increment num/start in from [lastGroup.start .. end]
						result.splice(lastGroup.start, 0, "(");
						result.push(op);
						result.push(")");
						var newGroup = { start: lastGroup.start, end: result.length-1, type: NEW_CAPTURING, num: lastGroup.num };
						for (var k=0; k < newGroups.length; k++) {
							group = newGroups[k];
							if (group.type === CAPTURING || group.type === NEW_CAPTURING) {
								if (group.start >= lastGroup.start && group.end <= prevIndex) {
									group.start += 1;
									group.end += 1;
									group.num = group.num + 1;
									if (group.type === CAPTURING) {
										old2New[group.oldNum] = group.num;
									}
								}
							}
						}
						newGroups.push(newGroup);
						newGroupNumber++;
						break;
					} else {
						// Fallthrough to default
					}
				default:
					if (chr !== "|" && curGroup !== CAPTURING && curGroup !== NEW_CAPTURING) {
						// Not in a capturing group, so make a new one to hold this term.
						// Perf improvement: don't create the new group if we're inside a lookahead, since we don't 
						// care about them (nothing inside a lookahead actually consumes input so we don't need it)
						if (lookaheadDepth === 0) {
							groups.push(NEW_CAPTURING);
							newGroups.push({ start: i, end: -1, type: NEW_CAPTURING, num: newGroupNumber });
							result.push("(");
							consuming[newGroupNumber] = null;
							newGroupNumber++;
						}
					}
					result.push(chr);
					if (chr === "\\") {
						var peek = src.charAt(i+1);
						// Eat next so following iteration doesn't think it's a real special character
						result.push(peek);
						i += 1;
					}
					break;
			}
		}
		while (groups.length) {	
			// Close any remaining new capturing groups
			groups.pop();
			result.push(")");
		}
		var newRegex = new RegExp(result.join(""));
		
		// Update backreferences so they refer to the new group numbers. Use backRefOld2NewMap if provided
		var subst = {};
		backRefOld2NewMap = backRefOld2NewMap || old2New;
		for (var prop in backRefOld2NewMap) {
			if (backRefOld2NewMap.hasOwnProperty(prop)) {
				subst[prop] = "\\" + backRefOld2NewMap[prop];
			}
		}
		newRegex = this.getSubstitutedRegex(newRegex, subst, false);
		
		return [newRegex, old2New, consuming];
	},
	
	/** @returns {Boolean} True if the captures object assigns scope to a matching group other than "0". */
	complexCaptures: function(capturesObj) {
		if (!capturesObj) { return false; }
		for (var prop in capturesObj) {
			if (capturesObj.hasOwnProperty(prop)) {
				if (prop !== "0") {
					return true;
				}
			}
		}
		return false;
	}
};

	/**
	 * @private
	 * @param obj {Object} A JSON-ish object.
	 * @returns {Object} Deep copy of <code>obj</code>. Does not work on properties that are functions or RegExp instances.
	 */
	function clone(obj) {
		var c;
		if (obj instanceof Array) {
			c = new Array(obj.length);
			for (var i=0; i < obj.length; i++) {
				c[i] = clone(obj[i]);
			}
		} else {
			c = {};
			for (var prop in obj) {
				if (Object.prototype.hasOwnProperty.call(obj, prop)) {
					var value = obj[prop];
					if (typeof value === "object" && value !== null) {
						c[prop] = clone(value);
					} else {
						c[prop] = value;
					}
				}
			}
		}
		return c;
	}

	/**
	 * @name orion.editor.TextMateStyler
	 * @class A styler that knows how to apply a subset of the TextMate grammar format to style a line.
	 *
	 * <h4>Styling from a grammar:</h4>
	 * <p>Each scope name given in the grammar is converted to an array of CSS class names. For example 
	 * a region of text with scope <code>keyword.control.php</code> will be assigned the CSS classes<br />
	 * <code>keyword, keyword-control, keyword-control-php</code></p>
	 *
	 * <p>A CSS file can give rules matching any of these class names to provide generic or more specific styling.
	 * For example,</p>
	 * <p><code>.keyword { font-color: blue; }</code></p>
	 * <p>colors all keywords blue, while</p>
	 * <p><code>.keyword-control-php { font-weight: bold; }</code></p>
	 * <p>bolds only PHP control keywords.</p>
	 *
	 * <p>This is useful when using grammars that adhere to TextMate's
	 * <a href="http://manual.macromates.com/en/language_grammars.html#naming_conventions">scope name conventions</a>,
	 * as a single CSS rule can provide consistent styling to similar constructs across different languages.</p>
	 * 
	 * <h4>Top-level grammar constructs:</h4>
	 * <ul><li><code>patterns, repository</code> (with limitations, see "Other Features") are supported.</li>
	 * <li><code>scopeName, firstLineMatch, foldingStartMarker, foldingStopMarker</code> are <b>not</b> supported.</li>
	 * <li><code>fileTypes</code> is <b>not</b> supported. When using the Orion service registry, the "orion.edit.highlighter"
	 * service serves a similar purpose.</li>
	 * </ul>
	 *
	 * <h4>Regular expression constructs:</h4>
	 * <ul>
	 * <li><code>match</code> patterns are supported.</li>
	 * <li><code>begin .. end</code> patterns are supported.</li>
	 * <li>The "extended" regex forms <code>(?x)</code> and <code>(?x:...)</code> are supported, but <b>only</b> when they 
	 * apply to the entire regex pattern.</li>
	 * <li>Matching is done using native JavaScript <code>RegExp</code>s. As a result, many features of the Oniguruma regex
	 * engine used by TextMate are <b>not</b> supported.
	 * Unsupported features include:
	 *   <ul><li>Named captures</li>
	 *   <li>Setting flags inside subgroups (eg. <code>(?i:a)b</code>)</li>
	 *   <li>Lookbehind and negative lookbehind</li>
	 *   <li>Subexpression call</li>
	 *   <li>etc.</li>
	 *   </ul>
	 * </li>
	 * </ul>
	 * 
	 * <h4>Scope-assignment constructs:</h4>
	 * <ul>
	 * <li><code>captures, beginCaptures, endCaptures</code> are supported.</li>
	 * <li><code>name</code> and <code>contentName</code> are supported.</li>
	 * </ul>
	 * 
	 * <h4>Other features:</h4>
	 * <ul>
	 * <li><code>applyEndPatternLast</code> is supported.</li>
	 * <li><code>include</code> is supported, but only when it references a rule in the current grammar's <code>repository</code>.
	 * Including <code>$self</code>, <code>$base</code>, or <code>rule.from.another.grammar</code> is <b>not</b> supported.</li>
	 * </ul>
	 * 
	 * @description Creates a new TextMateStyler.
	 * @extends orion.editor.AbstractStyler
	 * @param {orion.editor.TextView} textView The <code>TextView</code> to provide styling for.
	 * @param {Object} grammar The TextMate grammar to use for styling the <code>TextView</code>, as a JavaScript object. You can
	 * produce this object by running a PList-to-JavaScript conversion tool on a TextMate <code>.tmLanguage</code> file.
	 * @param {Object[]} [externalGrammars] Additional grammar objects that will be used to resolve named rule references.
	 */
	function TextMateStyler(textView, grammar, externalGrammars) {
		this.initialize(textView);
		// Copy grammar object(s) since we will mutate them
		this.grammar = clone(grammar);
		this.externalGrammars = externalGrammars ? clone(externalGrammars) : [];
		
		this._styles = {}; /* key: {String} scopeName, value: {String[]} cssClassNames */
		this._tree = null;
		this._allGrammars = {}; /* key: {String} scopeName of grammar, value: {Object} grammar */
		this.preprocess(this.grammar);
	}
	TextMateStyler.prototype = /** @lends orion.editor.TextMateStyler.prototype */ {
		initialize: function(textView) {
			this.textView = textView;
			this.textView.stylerOptions = this;
			var self = this;
			
			this._listener = {
				onModelChanged: function(e) {
					self.onModelChanged(e);
				},
				onDestroy: function(e) {
					self.onDestroy(e);
				},
				onLineStyle: function(e) {
					self.onLineStyle(e);
				},
				onStorage: function(e){
					self.onStorage(e);
				}
			};
			textView.addEventListener("ModelChanged", this._listener.onModelChanged);
			textView.addEventListener("Destroy", this._listener.onDestroy);
			textView.addEventListener("LineStyle", this._listener.onLineStyle);
			textView.redrawLines();
		},
		onDestroy: function(/**eclipse.DestroyEvent*/ e) {
			this.destroy();
		},
		destroy: function() {
			if (this.textView) {
				this.textView.removeEventListener("ModelChanged", this._listener.onModelChanged);
				this.textView.removeEventListener("Destroy", this._listener.onDestroy);
				this.textView.removeEventListener("LineStyle", this._listener.onLineStyle);
				this.textView = null;
			}
			this.grammar = null;
			this._styles = null;
			this._tree = null;
			this._listener = null;
		},
		/** @private */
		preprocess: function(grammar) {
			var stack = [grammar];
			for (; stack.length !== 0; ) {
				var rule = stack.pop();
				if (rule._resolvedRule && rule._typedRule) {
					continue;
				}
//					console.debug("Process " + (rule.include || rule.name));
				
				// Look up include'd rule, create typed *Rule instance
				rule._resolvedRule = this._resolve(rule);
				rule._typedRule = this._createTypedRule(rule);
				
				// Convert the scope names to styles and cache them for later
				this.addStyles(rule.name);
				this.addStyles(rule.contentName);
				this.addStylesForCaptures(rule.captures);
				this.addStylesForCaptures(rule.beginCaptures);
				this.addStylesForCaptures(rule.endCaptures);
				
				if (rule._resolvedRule !== rule) {
					// Add include target
					stack.push(rule._resolvedRule);
				}
				if (rule.patterns) {
					// Add subrules
					for (var i=0; i < rule.patterns.length; i++) {
						stack.push(rule.patterns[i]);
					}
				}
			}
		},
		
		/**
		 * Adds eclipse.Style objects for scope to our _styles cache.
		 * @private
		 * @param {String} scope A scope name, like "constant.character.php".
		 */
		addStyles: function(scope) {
			if (scope && !this._styles[scope]) {
				this._styles[scope] = [];
				var scopeArray = scope.split(".");
				for (var i = 0; i < scopeArray.length; i++) {
					this._styles[scope].push(scopeArray.slice(0, i + 1).join("-"));
				}
			}
		},
		/** @private */
		addStylesForCaptures: function(/**Object*/ captures) {
			for (var prop in captures) {
				if (captures.hasOwnProperty(prop)) {
					var scope = captures[prop].name;
					this.addStyles(scope);
				}
			}
		},
		/**
		 * A rule that contains subrules ("patterns" in TextMate parlance) but has no "begin" or "end".
		 * Also handles top level of grammar.
		 * @private
		 */
		ContainerRule: (function() {
			function ContainerRule(/**Object*/ rule) {
				this.rule = rule;
				this.subrules = rule.patterns;
			}
			ContainerRule.prototype.valueOf = function() { return "aa"; };
			return ContainerRule;
		}()),
		/**
		 * A rule that is delimited by "begin" and "end" matches, which may be separated by any number of
		 * lines. This type of rule may contain subrules, which apply only inside the begin .. end region.
		 * @private
		 */
		BeginEndRule: (function() {
			function BeginEndRule(/**Object*/ rule) {
				this.rule = rule;
				// TODO: the TextMate blog claims that "end" is optional.
				this.beginRegex = RegexUtil.toRegExp(rule.begin);
				this.endRegex = RegexUtil.toRegExp(rule.end);
				this.subrules = rule.patterns || [];
				
				this.endRegexHasBackRef = RegexUtil.hasBackReference(this.endRegex);
				
				// Deal with non-0 captures
				var complexCaptures = RegexUtil.complexCaptures(rule.captures);
				var complexBeginEnd = RegexUtil.complexCaptures(rule.beginCaptures) || RegexUtil.complexCaptures(rule.endCaptures);
				this.isComplex = complexCaptures || complexBeginEnd;
				if (this.isComplex) {
					var bg = RegexUtil.groupify(this.beginRegex);
					this.beginRegex = bg[0];
					this.beginOld2New = bg[1];
					this.beginConsuming = bg[2];
					
					var eg = RegexUtil.groupify(this.endRegex, this.beginOld2New /*Update end's backrefs to begin's new group #s*/);
					this.endRegex = eg[0];
					this.endOld2New = eg[1];
					this.endConsuming = eg[2];
				}
			}
			BeginEndRule.prototype.valueOf = function() { return this.beginRegex; };
			return BeginEndRule;
		}()),
		/**
		 * A rule with a "match" pattern.
		 * @private
		 */
		MatchRule: (function() {
			function MatchRule(/**Object*/ rule) {
				this.rule = rule;
				this.matchRegex = RegexUtil.toRegExp(rule.match);
				this.isComplex = RegexUtil.complexCaptures(rule.captures);
				if (this.isComplex) {
					var mg = RegexUtil.groupify(this.matchRegex);
					this.matchRegex = mg[0];
					this.matchOld2New = mg[1];
					this.matchConsuming = mg[2];
				}
			}
			MatchRule.prototype.valueOf = function() { return this.matchRegex; };
			return MatchRule;
		}()),
		/**
		 * @param {Object} rule A rule from the grammar.
		 * @returns {MatchRule|BeginEndRule|ContainerRule}
		 * @private
		 */
		_createTypedRule: function(rule) {
			if (rule.match) {
				return new this.MatchRule(rule);
			} else if (rule.begin) {
				return new this.BeginEndRule(rule);
			} else {
				return new this.ContainerRule(rule);
			}
		},
		/**
		 * Resolves a rule from the grammar (which may be an include) into the real rule that it points to.
		 * @private
		 */
		_resolve: function(rule) {
			var resolved = rule;
			if (rule.include) {
				if (rule.begin || rule.end || rule.match) {
					throw new Error("Unexpected regex pattern in \"include\" rule " + rule.include);
				}
				var name = rule.include;
				if (name.charAt(0) === "#") {
					resolved = this.grammar.repository && this.grammar.repository[name.substring(1)];
					if (!resolved) { throw new Error("Couldn't find included rule " + name + " in grammar repository"); }
				} else if (name === "$self") {
					resolved = this.grammar;
				} else if (name === "$base") {
					// $base is only relevant when including rules from foreign grammars
					throw new Error("Include \"$base\" is not supported"); 
				} else {
					resolved = this._allGrammars[name];
					if (!resolved) {
						for (var i=0; i < this.externalGrammars.length; i++) {
							var grammar = this.externalGrammars[i];
							if (grammar.scopeName === name) {
								this.preprocess(grammar);
								this._allGrammars[name] = grammar;
								resolved = grammar;
								break;
							}
						}
					}
				}
			}
			return resolved;
		},

		/** @private */
		ContainerNode: (function() {
			function ContainerNode(parent, rule) {
				this.parent = parent;
				this.rule = rule;
				this.children = [];
				
				this.start = null;
				this.end = null;
			}
			ContainerNode.prototype.addChild = function(child) {
				this.children.push(child);
			};
			ContainerNode.prototype.valueOf = function() {
				var r = this.rule;
				return "ContainerNode { " + (r.include || "") + " " + (r.name || "") + (r.comment || "") + "}";
			};
			return ContainerNode;
		}()),
		/** @private */
		BeginEndNode: (function() {
			function BeginEndNode(parent, rule, beginMatch) {
				this.parent = parent;
				this.rule = rule;
				this.children = [];
				
				this.setStart(beginMatch);
				this.end = null; // will be set eventually during parsing (may be EOF)
				this.endMatch = null; // may remain null if we never match our "end" pattern
				
				// Build a new regex if the "end" regex has backrefs since they refer to matched groups of beginMatch
				if (rule.endRegexHasBackRef) {
					this.endRegexSubstituted = RegexUtil.getSubstitutedRegex(rule.endRegex, beginMatch);
				} else {
					this.endRegexSubstituted = null;
				}
			}
			BeginEndNode.prototype.addChild = function(child) {
				this.children.push(child);
			};
			/** @return {Number} This node's index in its parent's "children" list */
			BeginEndNode.prototype.getIndexInParent = function(node) {
				return this.parent ? this.parent.children.indexOf(this) : -1;
			};
			/** @param {RegExp.match} beginMatch */
			BeginEndNode.prototype.setStart = function(beginMatch) {
				this.start = beginMatch.index;
				this.beginMatch = beginMatch;
			};
			/** @param {RegExp.match|Number} endMatchOrLastChar */
			BeginEndNode.prototype.setEnd = function(endMatchOrLastChar) {
				if (endMatchOrLastChar && typeof(endMatchOrLastChar) === "object") {
					var endMatch = endMatchOrLastChar;
					this.endMatch = endMatch;
					this.end = endMatch.index + endMatch[0].length;
				} else {
					var lastChar = endMatchOrLastChar;
					this.endMatch = null;
					this.end = lastChar;
				}
			};
			BeginEndNode.prototype.shiftStart = function(amount) {
				this.start += amount;
				this.beginMatch.index += amount;
			};
			BeginEndNode.prototype.shiftEnd = function(amount) {
				this.end += amount;
				if (this.endMatch) { this.endMatch.index += amount; }
			};
			BeginEndNode.prototype.valueOf = function() {
				return "{" + this.rule.beginRegex + " range=" + this.start + ".." + this.end + "}";
			};
			return BeginEndNode;
		}()),
		/** Pushes rules onto stack such that rules[startFrom] is on top
		 * @private
		 */
		push: function(/**Array*/ stack, /**Array*/ rules) {
			if (!rules) { return; }
			for (var i = rules.length; i > 0; ) {
				stack.push(rules[--i]);
			}
		},
		/** Executes <code>regex</code> on <code>text</code>, and returns the match object with its index 
		 * offset by the given amount.
		 * @returns {RegExp.match}
		 * @private
		 */
		exec: function(/**RegExp*/ regex, /**String*/ text, /**Number*/ offset) {
			var match = regex.exec(text);
			if (match) { match.index += offset; }
			regex.lastIndex = 0; // Just in case
			return match;
		},
		/** @returns {Number} The position immediately following the match.
		 * @private
		 */
		afterMatch: function(/**RegExp.match*/ match) {
			return match.index + match[0].length;
		},
		/**
		 * @returns {RegExp.match} If node is a BeginEndNode and its rule's "end" pattern matches the text.
		 * @private
		 */
		getEndMatch: function(/**Node*/ node, /**String*/ text, /**Number*/ offset) {
			if (node instanceof this.BeginEndNode) {
				var rule = node.rule;
				var endRegex = node.endRegexSubstituted || rule.endRegex;
				if (!endRegex) { return null; }
				return this.exec(endRegex, text, offset);
			}
			return null;
		},
		/** Called once when file is first loaded to build the parse tree. Tree is updated incrementally thereafter 
		 * as buffer is modified.
		 * @private
		 */
		initialParse: function() {
			var last = this.textView.getModel().getCharCount();
			// First time; make parse tree for whole buffer
			var root = new this.ContainerNode(null, this.grammar._typedRule);
			this._tree = root;
			this.parse(this._tree, false, 0);
		},
		onModelChanged: function(/**eclipse.ModelChangedEvent*/ e) {
			var addedCharCount = e.addedCharCount,
			    addedLineCount = e.addedLineCount,
			    removedCharCount = e.removedCharCount,
			    removedLineCount = e.removedLineCount,
			    start = e.start;
			if (!this._tree) {
				this.initialParse();
			} else {
				var model = this.textView.getModel();
				var charCount = model.getCharCount();
				
				// For rs, we must rewind to the line preceding the line 'start' is on. We can't rely on start's
				// line since it may've been changed in a way that would cause a new beginMatch at its lineStart.
				var rs = model.getLineEnd(model.getLineAtOffset(start) - 1); // may be < 0
				var fd = this.getFirstDamaged(rs, rs);
				rs = rs === -1 ? 0 : rs;
				var stoppedAt;
				if (fd) {
					// [rs, re] is the region we need to verify. If we find the structure of the tree
					// has changed in that area, then we may need to reparse the rest of the file.
					stoppedAt = this.parse(fd, true, rs, start, addedCharCount, removedCharCount);
				} else {
					// FIXME: fd == null ?
					stoppedAt = charCount;
				}
				this.textView.redrawRange(rs, stoppedAt);
			}
		},
		/** @returns {BeginEndNode|ContainerNode} The result of taking the first (smallest "start" value) 
		 * node overlapping [start,end] and drilling down to get its deepest damaged descendant (if any).
		 * @private
		 */
		getFirstDamaged: function(start, end) {
			// If start === 0 we actually have to start from the root because there is no position
			// we can rely on. (First index is damaged)
			if (start < 0) {
				return this._tree;
			}
			
			var nodes = [this._tree];
			var result = null;
			while (nodes.length) {
				var n = nodes.pop();
				if (!n.parent /*n is root*/ || this.isDamaged(n, start, end)) {
					// n is damaged by the edit, so go into its children
					// Note: If a node is damaged, then some of its descendents MAY be damaged
					// If a node is undamaged, then ALL of its descendents are undamaged
					if (n instanceof this.BeginEndNode) {
						result = n;
					}
					// Examine children[0] last
					for (var i=0; i < n.children.length; i++) {
						nodes.push(n.children[i]);
					}
				}
			}
			return result || this._tree;
		},
		/** @returns true If <code>n</code> overlaps the interval [start,end].
		 * @private
		 */
		isDamaged: function(/**BeginEndNode*/ n, start, end) {
			// Note strict > since [2,5] doesn't overlap [5,7]
			return (n.start <= end && n.end > start);
		},
		/**
		 * Builds tree from some of the buffer content
		 *
		 * TODO cleanup params
		 * @param {BeginEndNode|ContainerNode} origNode The deepest node that overlaps [rs,rs], or the root.
		 * @param {Boolean} repairing 
		 * @param {Number} rs See _onModelChanged()
		 * @param {Number} [editStart] Only used for repairing === true
		 * @param {Number} [addedCharCount] Only used for repairing === true
		 * @param {Number} [removedCharCount] Only used for repairing === true
		 * @returns {Number} The end position that redrawRange should be called for.
		 * @private
		 */
		parse: function(origNode, repairing, rs, editStart, addedCharCount, removedCharCount) {
			var model = this.textView.getModel();
			var lastLineStart = model.getLineStart(model.getLineCount() - 1);
			var eof = model.getCharCount();
			var initialExpected = this.getInitialExpected(origNode, rs);
			
			// re is best-case stopping point; if we detect change to tree, we must continue past it
			var re = -1;
			if (repairing) {
				origNode.repaired = true;
				origNode.endNeedsUpdate = true;
				var lastChild = origNode.children[origNode.children.length-1];
				var delta = addedCharCount - removedCharCount;
				var lastChildLineEnd = lastChild ? model.getLineEnd(model.getLineAtOffset(lastChild.end + delta)) : -1;
				var editLineEnd = model.getLineEnd(model.getLineAtOffset(editStart + removedCharCount));
				re = Math.max(lastChildLineEnd, editLineEnd);
			}
			re = (re === -1) ? eof : re;
			
			var expected = initialExpected;
			var node = origNode;
			var matchedChildOrEnd = false;
			var pos = rs;
			var redrawEnd = -1;
			while (node && (!repairing || (pos < re))) {
				var matchInfo = this.getNextMatch(model, node, pos);
				if (!matchInfo) {
					// Go to next line, if any
					pos = (pos >= lastLineStart) ? eof : model.getLineStart(model.getLineAtOffset(pos) + 1);
				}
				var match = matchInfo && matchInfo.match,
				    rule = matchInfo && matchInfo.rule,
				    isSub = matchInfo && matchInfo.isSub,
				    isEnd = matchInfo && matchInfo.isEnd;
				if (isSub) {
					pos = this.afterMatch(match);
					if (rule instanceof this.BeginEndRule) {
						matchedChildOrEnd = true;
						// Matched a child. Did we expect that?
						if (repairing && rule === expected.rule && node === expected.parent) {
							// Yes: matched expected child
							var foundChild = expected;
							foundChild.setStart(match);
							// Note: the 'end' position for this node will either be matched, or fixed up by us post-loop
							foundChild.repaired = true;
							foundChild.endNeedsUpdate = true;
							node = foundChild; // descend
							expected = this.getNextExpected(expected, "begin");
						} else {
							if (repairing) {
								// No: matched unexpected child.
								this.prune(node, expected);
								repairing = false;
							}
							
							// Add the new child (will replace 'expected' in node's children list)
							var subNode = new this.BeginEndNode(node, rule, match);
							node.addChild(subNode);
							node = subNode; // descend
						}
					} else {
						// Matched a MatchRule; no changes to tree required
					}
				} else if (isEnd || pos === eof) {
					if (node instanceof this.BeginEndNode) {
						if (match) {
							matchedChildOrEnd = true;
							redrawEnd = Math.max(redrawEnd, node.end); // if end moved up, must still redraw to its old value
							node.setEnd(match);
							pos = this.afterMatch(match);
							// Matched node's end. Did we expect that?
							if (repairing && node === expected && node.parent === expected.parent) {
								// Yes: found the expected end of node
								node.repaired = true;
								delete node.endNeedsUpdate;
								expected = this.getNextExpected(expected, "end");
							} else {
								if (repairing) {
									// No: found an unexpected end
									this.prune(node, expected);
									repairing = false;
								}
							}
						} else {
							// Force-ending a BeginEndNode that runs until eof
							node.setEnd(eof);
							delete node.endNeedsUpdate;
						}
					}
					node = node.parent; // ascend
				}
				
				if (repairing && pos >= re && !matchedChildOrEnd) {
					// Reached re without matching any begin/end => initialExpected itself was removed => repair fail
					this.prune(origNode, initialExpected);
					repairing = false;
				}
			} // end loop
			// TODO: do this for every node we end?
			this.removeUnrepairedChildren(origNode, repairing, rs);
			
			//console.debug("parsed " + (pos - rs) + " of " + model.getCharCount + "buf");
			this.cleanup(repairing, origNode, rs, re, eof, addedCharCount, removedCharCount);
			if (repairing) {
				return Math.max(redrawEnd, pos);
			} else {
				return pos; // where we stopped reparsing
			}
		},
		/** Helper for parse() in the repair case. To be called when ending a node, as any children that
		 * lie in [rs,node.end] and were not repaired must've been deleted.
		 * @private
		 */
		removeUnrepairedChildren: function(node, repairing, start) {
			if (repairing) {
				var children = node.children;
				var removeFrom = -1;
				for (var i=0; i < children.length; i++) {
					var child = children[i];
					if (!child.repaired && this.isDamaged(child, start, Number.MAX_VALUE /*end doesn't matter*/)) {
						removeFrom = i;
						break;
					}
				}
				if (removeFrom !== -1) {
					node.children.length = removeFrom;
				}
			}
		},
		/** Helper for parse() in the repair case
		 * @private
		 */
		cleanup: function(repairing, origNode, rs, re, eof, addedCharCount, removedCharCount) {
			var i, node, maybeRepairedNodes;
			if (repairing) {
				// The repair succeeded, so update stale begin/end indices by simple translation.
				var delta = addedCharCount - removedCharCount;
				// A repaired node's end can't exceed re, but it may exceed re-delta+1.
				// TODO: find a way to guarantee disjoint intervals for repaired vs unrepaired, then stop using flag
				var maybeUnrepairedNodes = this.getIntersecting(re-delta+1, eof);
				maybeRepairedNodes = this.getIntersecting(rs, re);
				// Handle unrepaired nodes. They are those intersecting [re-delta+1, eof] that don't have the flag
				for (i=0; i < maybeUnrepairedNodes.length; i++) {
					node = maybeUnrepairedNodes[i];
					if (!node.repaired && node instanceof this.BeginEndNode) {
						node.shiftEnd(delta);
						node.shiftStart(delta);
					}
				}
				// Translate 'end' index of repaired node whose 'end' was not matched in loop (>= re)
				for (i=0; i < maybeRepairedNodes.length; i++) {
					node = maybeRepairedNodes[i];
					if (node.repaired && node.endNeedsUpdate) {
						node.shiftEnd(delta);
					}
					delete node.endNeedsUpdate;
					delete node.repaired;
				}
			} else {
				// Clean up after ourself
				maybeRepairedNodes = this.getIntersecting(rs, re);
				for (i=0; i < maybeRepairedNodes.length; i++) {
					delete maybeRepairedNodes[i].repaired;
				}
			}
		},
		/**
		 * @param model {orion.editor.TextModel}
		 * @param {Node} node
		 * @param {Number} pos
		 * @param {Boolean} [matchRulesOnly] Optional, if true only "match" subrules will be considered.
		 * @returns {Object} A match info object with properties:
		 * {Boolean} isEnd
		 * {Boolean} isSub
		 * {RegExp.match} match
		 * {(Match|BeginEnd)Rule} rule
		 * @private
		 */
		getNextMatch: function(model, node, pos, matchRulesOnly) {
			var lineIndex = model.getLineAtOffset(pos);
			var lineEnd = model.getLineEnd(lineIndex);
			var line = model.getText(pos, lineEnd);

			var stack = [],
			    expandedContainers = [],
			    subMatches = [],
			    subrules = [];
			this.push(stack, node.rule.subrules);
			while (stack.length) {
				var next = stack.length ? stack.pop() : null;
				var subrule = next && next._resolvedRule._typedRule;
				if (subrule instanceof this.ContainerRule && expandedContainers.indexOf(subrule) === -1) {
					// Expand ContainerRule by pushing its subrules on
					expandedContainers.push(subrule);
					this.push(stack, subrule.subrules);
					continue;
				}
				if (subrule && matchRulesOnly && !(subrule.matchRegex)) {
					continue;
				}
				var subMatch = subrule && this.exec(subrule.matchRegex || subrule.beginRegex, line, pos);
				if (subMatch) {
					subMatches.push(subMatch);
					subrules.push(subrule);
				}
			}

			var bestSub = Number.MAX_VALUE,
			    bestSubIndex = -1;
			for (var i=0; i < subMatches.length; i++) {
				var match = subMatches[i];
				if (match.index < bestSub) {
					bestSub = match.index;
					bestSubIndex = i;
				}
			}
			
			if (!matchRulesOnly) {
				// See if the "end" pattern of the active begin/end node matches.
				// TODO: The active begin/end node may not be the same as the node that holds the subrules
				var activeBENode = node;
				var endMatch = this.getEndMatch(node, line, pos);
				if (endMatch) {
					var doEndLast = activeBENode.rule.applyEndPatternLast;
					var endWins = bestSubIndex === -1 || (endMatch.index < bestSub) || (!doEndLast && endMatch.index === bestSub);
					if (endWins) {
						return {isEnd: true, rule: activeBENode.rule, match: endMatch};
					}
				}
			}
			return bestSubIndex === -1 ? null : {isSub: true, rule: subrules[bestSubIndex], match: subMatches[bestSubIndex]};
		},
		/**
		 * Gets the node corresponding to the first match we expect to see in the repair.
		 * @param {BeginEndNode|ContainerNode} node The node returned via getFirstDamaged(rs,rs) -- may be the root.
		 * @param {Number} rs See _onModelChanged()
		 * Note that because rs is a line end (or 0, a line start), it will intersect a beginMatch or 
		 * endMatch either at their 0th character, or not at all. (begin/endMatches can't cross lines).
		 * This is the only time we rely on the start/end values from the pre-change tree. After this 
		 * we only look at node ordering, never use the old indices.
		 * @returns {Node}
		 * @private
		 */
		getInitialExpected: function(node, rs) {
			// TODO: Kind of weird.. maybe ContainerNodes should have start & end set, like BeginEndNodes
			var i, child;
			if (node === this._tree) {
				// get whichever of our children comes after rs
				for (i=0; i < node.children.length; i++) {
					child = node.children[i]; // BeginEndNode
					if (child.start >= rs) {
						return child;
					}
				}
			} else if (node instanceof this.BeginEndNode) {
				if (node.endMatch) {
					// Which comes next after rs: our nodeEnd or one of our children?
					var nodeEnd = node.endMatch.index;
					for (i=0; i < node.children.length; i++) {
						child = node.children[i]; // BeginEndNode
						if (child.start >= rs) {
							break;
						}
					}
					if (child && child.start < nodeEnd) {
						return child; // Expect child as the next match
					}
				} else {
					// No endMatch => node goes until eof => it end should be the next match
				}
			}
			return node; // We expect node to end, so it should be the next match
		},
		/**
		 * Helper for repair() to tell us what kind of event we expect next.
		 * @param {Node} expected Last value returned by this method.
		 * @param {String} event "begin" if the last value of expected was matched as "begin",
		 *  or "end" if it was matched as an end.
		 * @returns {Node} The next expected node to match, or null.
		 * @private
		 */
		getNextExpected: function(/**Node*/ expected, event) {
			var node = expected;
			if (event === "begin") {
				var child = node.children[0];
				if (child) {
					return child;
				} else {
					return node;
				}
			} else if (event === "end") {
				var parent = node.parent;
				if (parent) {
					var nextSibling = parent.children[parent.children.indexOf(node) + 1];
					if (nextSibling) {
						return nextSibling;
					} else {
						return parent;
					}
				}
			}
			return null;
		},
		/** Helper for parse() when repairing. Prunes out the unmatched nodes from the tree so we can continue parsing.
		 * @private
		 */
		prune: function(/**BeginEndNode|ContainerNode*/ node, /**Node*/ expected) {
			var expectedAChild = expected.parent === node;
			if (expectedAChild) {
				// Expected child wasn't matched; prune it and all siblings after it
				node.children.length = expected.getIndexInParent();
			} else if (node instanceof this.BeginEndNode) {
				// Expected node to end but it didn't; set its end unknown and we'll match it eventually
				node.endMatch = null;
				node.end = null;
			}
			// Reparsing from node, so prune the successors outside of node's subtree
			if (node.parent) {
				node.parent.children.length = node.getIndexInParent() + 1;
			}
		},
		onLineStyle: function(/**eclipse.LineStyleEvent*/ e) {
			function byStart(r1, r2) {
				return r1.start - r2.start;
			}
			
			if (!this._tree) {
				// In some cases it seems onLineStyle is called before onModelChanged, so we need to parse here
				this.initialParse();
			}
			var lineStart = e.lineStart,
			    model = this.textView.getModel(),
			    lineEnd = model.getLineEnd(e.lineIndex);
			
			var rs = model.getLineEnd(model.getLineAtOffset(lineStart) - 1); // may be < 0
			var node = this.getFirstDamaged(rs, rs);
			
			var scopes = this.getLineScope(model, node, lineStart, lineEnd);
			e.ranges = this.toStyleRanges(scopes);
			// Editor requires StyleRanges must be in ascending order by 'start', or else some will be ignored
			e.ranges.sort(byStart);
		},
		/** Runs parse algorithm on [start, end] in the context of node, assigning scope as we find matches.
		 * @private
		 */
		getLineScope: function(model, node, start, end) {
			var pos = start;
			var expected = this.getInitialExpected(node, start);
			var scopes = [],
			    gaps = [];
			while (node && (pos < end)) {
				var matchInfo = this.getNextMatch(model, node, pos);
				if (!matchInfo) { 
					break; // line is over
				}
				var match = matchInfo && matchInfo.match,
				    rule = matchInfo && matchInfo.rule,
				    isSub = matchInfo && matchInfo.isSub,
				    isEnd = matchInfo && matchInfo.isEnd;
				if (match.index !== pos) {
					// gap [pos..match.index]
					gaps.push({ start: pos, end: match.index, node: node});
				}
				if (isSub) {
					pos = this.afterMatch(match);
					if (rule instanceof this.BeginEndRule) {
						// Matched a "begin", assign its scope and descend into it
						this.addBeginScope(scopes, match, rule);
						node = expected; // descend
						expected = this.getNextExpected(expected, "begin");
					} else {
						// Matched a child MatchRule;
						this.addMatchScope(scopes, match, rule);
					}
				} else if (isEnd) {
					pos = this.afterMatch(match);
					// Matched and "end", assign its end scope and go up
					this.addEndScope(scopes, match, rule);
					expected = this.getNextExpected(expected, "end");
					node = node.parent; // ascend
				}
			}
			if (pos < end) {
				gaps.push({ start: pos, end: end, node: node });
			}
			var inherited = this.getInheritedLineScope(gaps, start, end);
			return scopes.concat(inherited);
		},
		/** @private */
		getInheritedLineScope: function(gaps, start, end) {
			var scopes = [];
			for (var i=0; i < gaps.length; i++) {
				var gap = gaps[i];
				var node = gap.node;
				while (node) {
					// if node defines a contentName or name, apply it
					var rule = node.rule.rule;
					var name = rule.name,
					    contentName = rule.contentName;
					// TODO: if both are given, we don't resolve the conflict. contentName always wins
					var scope = contentName || name;
					if (scope) {
						this.addScopeRange(scopes, gap.start, gap.end, scope);
						break;
					}
					node = node.parent;
				}
			}
			return scopes;
		},
		/** @private */
		addBeginScope: function(scopes, match, typedRule) {
			var rule = typedRule.rule;
			this.addCapturesScope(scopes, match, (rule.beginCaptures || rule.captures), typedRule.isComplex, typedRule.beginOld2New, typedRule.beginConsuming);
		},
		/** @private */
		addEndScope: function(scopes, match, typedRule) {
			var rule = typedRule.rule;
			this.addCapturesScope(scopes, match, (rule.endCaptures || rule.captures), typedRule.isComplex, typedRule.endOld2New, typedRule.endConsuming);
		},
		/** @private */
		addMatchScope: function(scopes, match, typedRule) {
			var rule = typedRule.rule,
			    name = rule.name,
			    captures = rule.captures;
			if (captures) {	
				// captures takes priority over name
				this.addCapturesScope(scopes, match, captures, typedRule.isComplex, typedRule.matchOld2New, typedRule.matchConsuming);
			} else {
				this.addScope(scopes, match, name);
			}
		},
		/** @private */
		addScope: function(scopes, match, name) {
			if (!name) { return; }
			scopes.push({start: match.index, end: this.afterMatch(match), scope: name });
		},
		/** @private */
		addScopeRange: function(scopes, start, end, name) {
			if (!name) { return; }
			scopes.push({start: start, end: end, scope: name });
		},
		/** @private */
		addCapturesScope: function(/**Array*/scopes, /*RegExp.match*/ match, /**Object*/captures, /**Boolean*/isComplex, /**Object*/old2New, /**Object*/consuming) {
			if (!captures) { return; }
			if (!isComplex) {
				this.addScope(scopes, match, captures[0] && captures[0].name);
			} else {
				// apply scopes captures[1..n] to matching groups [1]..[n] of match
				
				// Sum up the lengths of preceding consuming groups to get the start offset for each matched group.
				var newGroupStarts = {1: 0};
				var sum = 0;
				for (var num = 1; match[num] !== undefined; num++) {
					if (consuming[num] !== undefined) {
						sum += match[num].length;
					}
					if (match[num+1] !== undefined) {
						newGroupStarts[num + 1] = sum;
					}
				}
				// Map the group numbers referred to in captures object to the new group numbers, and get the actual matched range.
				var start = match.index;
				for (var oldGroupNum = 1; captures[oldGroupNum]; oldGroupNum++) {
					var scope = captures[oldGroupNum].name;
					var newGroupNum = old2New[oldGroupNum];
					var groupStart = start + newGroupStarts[newGroupNum];
					// Not every capturing group defined in regex need match every time the regex is run.
					// eg. (a)|b matches "b" but group 1 is undefined
					if (typeof match[newGroupNum] !== "undefined") {
						var groupEnd = groupStart + match[newGroupNum].length;
						this.addScopeRange(scopes, groupStart, groupEnd, scope);
					}
				}
			}
		},
		/** @returns {Node[]} In depth-first order
		 * @private
		 */
		getIntersecting: function(start, end) {
			var result = [];
			var nodes = this._tree ? [this._tree] : [];
			while (nodes.length) {
				var n = nodes.pop();
				var visitChildren = false;
				if (n instanceof this.ContainerNode) {
					visitChildren = true;
				} else if (this.isDamaged(n, start, end)) {
					visitChildren = true;
					result.push(n);
				}
				if (visitChildren) {
					var len = n.children.length;
//					for (var i=len-1; i >= 0; i--) {
//						nodes.push(n.children[i]);
//					}
					for (var i=0; i < len; i++) {
						nodes.push(n.children[i]);
					}
				}
			}
			return result.reverse();
		},
		/**
		 * Applies the grammar to obtain the {@link eclipse.StyleRange[]} for the given line.
		 * @returns {eclipse.StyleRange[]}
		 * @private
		 */
		toStyleRanges: function(/**ScopeRange[]*/ scopeRanges) {
			var styleRanges = [];
			for (var i=0; i < scopeRanges.length; i++) {
				var scopeRange = scopeRanges[i];
				var classNames = this._styles[scopeRange.scope];
				if (!classNames) { throw new Error("styles not found for " + scopeRange.scope); }
				var classNamesString = classNames.join(" ");
				styleRanges.push({start: scopeRange.start, end: scopeRange.end, style: {styleClass: classNamesString}});
//				console.debug("{start " + styleRanges[i].start + ", end " + styleRanges[i].end + ", style: " + styleRanges[i].style.styleClass + "}");
			}
			return styleRanges;
		}
	};
	
	return {
		RegexUtil: RegexUtil,
		TextMateStyler: TextMateStyler
	};
});

/******************************************************************************* 
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation 
 ******************************************************************************/

/*jslint */
/*global define */

define("orion/editor/htmlGrammar", [], function() {

	/**
	 * Provides a grammar that can do some very rough syntax highlighting for HTML.
	 * @class orion.syntax.HtmlGrammar
	 */
	function HtmlGrammar() {
		/**
		 * Object containing the grammar rules.
		 * @public
		 * @type Object
		 */
		return {
			"scopeName": "source.html",
			"uuid": "3B5C76FB-EBB5-D930-F40C-047D082CE99B",
			"patterns": [
				{
					"begin": "<!(doctype|DOCTYPE)",
					"end": ">",
					"contentName": "entity.name.tag.doctype.html",
					"beginCaptures": {
						"0": { "name": "entity.name.tag.doctype.html" }
					},
					"endCaptures": {
						"0": { "name": "entity.name.tag.doctype.html" }
					}
				},
				{
					"begin": "<!--",
					"end": "-->",
					"beginCaptures": {
						"0": { "name": "punctuation.definition.comment.html" }
					},
					"endCaptures": {
						"0": { "name": "punctuation.definition.comment.html" }
					},
					"patterns": [
						{
							"match": "--",
							"name": "invalid.illegal.badcomment.html"
						}
					],
					"contentName": "comment.block.html"
				},
				{ // startDelimiter + tagName
					"match": "<[A-Za-z0-9_\\-:]+(?= ?)",
					"name": "entity.name.tag.html"
				},
				{ "include": "#attrName" },
				{ "include": "#qString" },
				{ "include": "#qqString" },
				{ "include": "#entity" },
				// TODO attrName, qString, qqString should be applied first while inside a tag
				{ // startDelimiter + slash + tagName + endDelimiter
					"match": "</[A-Za-z0-9_\\-:]+>",
					"name": "entity.name.tag.html"
				},
				{ // end delimiter of open tag
					"match": ">", 
					"name": "entity.name.tag.html"
				} ],
			"repository": {
				"attrName": { // attribute name
					"match": "[A-Za-z\\-:]+(?=\\s*=\\s*['\"])",
					"name": "entity.other.attribute.name.html"
				},
				"qqString": { // double quoted string
					"match": "(\")[^\"]+(\")",
					"name": "string.quoted.double.html"
				},
				"qString": { // single quoted string
					"match": "(')[^']+(\')",
					"name": "string.quoted.single.html"
				},
				"entity": {
					"match": "&[A-Za-z0-9]+;",
					"name": "constant.character.entity.html"
				}
			}
		};
	}

	return {HtmlGrammar: HtmlGrammar};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 *               Alex Lakatos - fix for bug#369781
 ******************************************************************************/

/*global define */

define("orion/editor/textStyler", [ //$NON-NLS-0$
	'orion/editor/annotations' //$NON-NLS-0$
], function(mAnnotations) {

	/*
	 * Throughout textStyler "block" refers to a potentially multi-line token (ie.- a pattern
	 * defined in the service with begin/end expressions rather than a single match expression).
	 * Typical examples are multi-line comments and multi-line strings.
	 */

	// Styles
	var caretLineStyle = {styleClass: "meta annotation currentLine"}; //$NON-NLS-0$

	var PUNCTUATION_SECTION_BEGIN = ".begin"; //$NON-NLS-0$
	var PUNCTUATION_SECTION_END = ".end"; //$NON-NLS-0$

	var CR = "\r"; //$NON-NLS-0$
	var NEWLINE = "\n"; //$NON-NLS-0$

	var eolRegex = /$/;
	var captureReferenceRegex = /\\(\d)/g;
	var linebreakRegex = /(.*)(?:[\r\n]|$)/g;
	var spacePattern = {regex: / /g, style: {styleClass: "punctuation separator space", unmergeable: true}}; //$NON-NLS-0$
	var tabPattern = {regex: /\t/g, style: {styleClass: "punctuation separator tab", unmergeable: true}}; //$NON-NLS-0$

	var _findMatch = function(regex, text, startIndex, testBeforeMatch) {
		/*
		 * testBeforeMatch provides a potential optimization for callers that do not strongly expect to find
		 * a match.  If this argument is defined then test() is initially called on the regex, which executes
		 * significantly faster than exec().  If a match is found then the regex's lastIndex is reverted to
		 * its pre-test() value, and exec() is then invoked on it in order to get the match details.
		 */

		var index = startIndex;
		var initialLastIndex = regex.lastIndex;
		linebreakRegex.lastIndex = startIndex;

		var currentLine = linebreakRegex.exec(text);
		/*
		 * Processing of the first line is treated specially, as it may not start at the beginning of a logical line, but
		 * regex's may be dependent on matching '^'.  To resolve this, compute the full line corresponding to the start
		 * of the text, even if it begins prior to startIndex, and adjust the regex's lastIndex accordingly to begin searching
		 * for matches at the correct location.
		 */
		var lineString, indexAdjustment;
		regex.lastIndex = 0;
		if (currentLine) {
			var lineStart = currentLine.index;
			while (0 <= --lineStart) {
				var char = text.charAt(lineStart);
				if (char === NEWLINE || char === CR) {
					break;
				}
			}
			lineString = text.substring(lineStart + 1, currentLine.index + currentLine[1].length);
			regex.lastIndex = indexAdjustment = currentLine.index - lineStart - 1;
		}
		while (currentLine && currentLine.index < text.length) {
			var result;
			if (testBeforeMatch) {
				var revertIndex = regex.lastIndex;
				if (regex.test(lineString)) {
					regex.lastIndex = revertIndex;
					result = regex.exec(lineString);
				}
			} else {
				result = regex.exec(lineString);
			}
			if (result) {
				result.index += index;
				result.index -= indexAdjustment;
				regex.lastIndex = initialLastIndex;
				return result;
			}
			indexAdjustment = 0;
			index += currentLine[0].length;
			currentLine = linebreakRegex.exec(text);
			if (currentLine) {
				lineString = currentLine[1];
				regex.lastIndex = 0;
			}
		}
		regex.lastIndex = initialLastIndex;
		return null;
	};
	var substituteCaptureValues = function(regex, resolvedResult) {
		var regexString = regex.toString();
		captureReferenceRegex.lastIndex = 0;
		if (!captureReferenceRegex.test(regexString)) {
			/* nothing to do */
			return regex;
		}

		captureReferenceRegex.lastIndex = 0;
		var result = captureReferenceRegex.exec(regexString);
		while (result) {
			regexString = regexString.replace(result[0], resolvedResult[result[1]] || "");
			captureReferenceRegex.lastIndex = 0;
			result = captureReferenceRegex.exec(regexString);
		}
		/* return an updated regex, remove the leading '/' and trailing /g */
		return new RegExp(regexString.substring(1, regexString.length - 2), "g");
	};
	var updateMatch = function(match, text, matches, minimumIndex) {
		var regEx = match.pattern.regex ? match.pattern.regex : match.pattern.regexBegin;
		var result = _findMatch(regEx, text, minimumIndex, true);
		if (result) {
			match.result = result;
			for (var i = 0; i < matches.length; i++) {
				if (result.index < matches[i].result.index || (result.index === matches[i].result.index && match.pattern.pattern.index < matches[i].pattern.pattern.index)) {
					matches.splice(i, 0, match);
					return;
				}
			}
			matches.push(match);
		}
	};
	var getCaptureStyles = function(result, captures, offset, styles) {
		if (captures[0]) {
			/* capture index 0 is the full result */
			styles.push({start: offset, end: offset + result[0].length, style: captures[0].name});
			return;
		}

		var stringIndex = 0;
		for (var i = 1; i < result.length; i++) {
			if (result[i]) {
				var capture = captures[i];
				if (capture) {
					var styleStart = offset + stringIndex;
					styles.push({start: styleStart, end: styleStart + result[i].length, style: capture.name});
				}
				stringIndex += result[i].length;
			}
		}
	};
	var mergeStyles = function(fullStyle, substyles, resultStyles) {
		var i = fullStyle.start;
		substyles.forEach(function(current) {
			if (i <= current.start) {
				resultStyles.push({start: i, end: current.start, style: fullStyle.style});
			}
			resultStyles.push(current);
			i = current.end;
		});
		if (i < fullStyle.end) {
			resultStyles.push({start: i, end: fullStyle.end, style: fullStyle.style});
		}
	};
	var parse = function(text, offset, block, styles, ignoreCaptures) {
		var patterns = block.getLinePatterns();
		if (!patterns) {
			return;
		}

		var matches = [];
		patterns.forEach(function(current) {
			var regex = current.regex || current.regexBegin;
			regex.oldLastIndex = regex.lastIndex;
			var result = _findMatch(regex, text, 0);
			if (result) {
				matches.push({result: result, pattern: current});
			}
		});
		matches.sort(function(a,b) {
			if (a.result.index < b.result.index) {
				return -1;
			}
			if (a.result.index > b.result.index) {
				return 1;
			}
			return a.pattern.pattern.index < b.pattern.pattern.index ? -1 : 1;
		});

		var index = 0;
		while (matches.length > 0) {
			var current = matches[0];
			matches.splice(0,1);

			if (current.result.index < index) {
				/* processing of another match has moved index beyond this match */
				updateMatch(current, text, matches, index);
				continue;
			}

			/* apply the style */
			var start = current.result.index;
			var end, result;
			var substyles = [];
			if (current.pattern.regex) {	/* line pattern defined by a "match" */
				result = current.result;
				end = start + result[0].length;
				var tokenStyle = {start: offset + start, end: offset + end, style: current.pattern.pattern.name};
				if (!ignoreCaptures) {
					if (current.pattern.pattern.captures) {
						getCaptureStyles(result, current.pattern.pattern.captures, offset + start, substyles);
					}
					substyles.sort(function(a,b) {
						if (a.start < b.start) {
							return -1;
						}
						if (a.start > b.start) {
							return 1;
						}
						return 0;
					});
					for (var j = 0; j < substyles.length - 1; j++) {
						if (substyles[j + 1].start < substyles[j].end) {
							var newStyle = {start: substyles[j + 1].end, end: substyles[j].end, style: substyles[j].style};
							substyles[j].end = substyles[j + 1].start;
							substyles.splice(j + 2, 0, newStyle);
						}
					}
				}
				mergeStyles(tokenStyle, substyles, styles);
			} else {	/* pattern defined by a "begin/end" pair */
				/* 
				 * If the end match contains a capture reference (eg.- "\1") then update
				 * its regex with the resolved capture values from the begin match.
				 */
				var endRegex = current.pattern.regexEnd;
				endRegex = substituteCaptureValues(endRegex, current.result);

				result = _findMatch(endRegex, text, current.result.index + current.result[0].length);
				if (!result) {
					eolRegex.lastIndex = 0;
					result = eolRegex.exec(text);
				}
				end = result.index + result[0].length;
				styles.push({start: offset + start, end: offset + end, style: current.pattern.pattern.name});
			}
			index = result.index + result[0].length;
			updateMatch(current, text, matches, index);
		}
		patterns.forEach(function(current) {
			var regex = current.regex || current.regexBegin;
			regex.lastIndex = regex.oldLastIndex;
		});
	};
	var computeBlocks = function(model, text, block, offset) {
		var matches = [];
		block.getBlockPatterns().forEach(function(current) {
			var result = _findMatch(current.regexBegin || current.regex, text, 0);
			if (result) {
				matches.push({result: result, pattern: current});
			}
		}.bind(this));
		if (!matches.length) {
			return matches;
		}
		matches.sort(function(a,b) {
			if (a.result.index < b.result.index) {
				return -1;
			}
			if (a.result.index > b.result.index) {
				return 1;
			}
			return a.pattern.pattern.index < b.pattern.pattern.index ? -1 : 1;
		});

		var index = 0;
		var results = [];
		while (matches.length > 0) {
			var current = matches[0];
			matches.splice(0,1);

			if (current.result.index < index) {
				/* processing of another match has moved index beyond this match */
				updateMatch(current, text, matches, index);
				continue;
			}

			/* verify that the begin match is valid (eg.- is not within a string, etc.) */
			var lineIndex = model.getLineAtOffset(offset + current.result.index);
			var lineText = model.getLine(lineIndex);
			var styles = [];
			parse(lineText, model.getLineStart(lineIndex), block, styles);
			var start = offset + current.result.index;
			var i = 0;
			for (; i < styles.length; i++) {
				if (styles[i].start === start) {
					/* found it, now determine the end (and ensure that it is valid) */
					var contentStart = current.result.index;
					var resultEnd = null;

					/* 
					 * If the end match contains a capture reference (eg.- "\1") then update
					 * its regex with the resolved capture values from the begin match.
					 */
					var endRegex = current.pattern.regexEnd;
					if (!endRegex) {
						resultEnd = new Block(
							{
								start: start,
								end: start + current.result[0].length,
								contentStart: start,
								contentEnd: start + current.result[0].length
							},
							current.pattern,
							block.getStyler(),
							model,
							block);
					} else {
						contentStart += current.result[0].length;
						endRegex = substituteCaptureValues(endRegex, current.result);

						var lastIndex = contentStart;
						while (!resultEnd) {
							var result = _findMatch(endRegex, text, lastIndex);
							if (!result) {
								eolRegex.lastIndex = 0;
								result = eolRegex.exec(text);
							}
							var styles2 = [];
							var testBlock = new Block(
								{
									start: start,
									end: offset + result.index + result[0].length,
									contentStart: offset + contentStart,
									contentEnd: offset + result.index
								},
								current.pattern,
								block.getStyler(),
								model,
								block);
							parse(text.substring(contentStart, result.index + result[0].length), contentStart, testBlock, styles2);
							if (!styles2.length || styles2[styles2.length - 1].end <= result.index) {
								resultEnd = testBlock;
							}
							lastIndex = result.index + result[0].length;
						}
					}
					results.push(resultEnd);
					index = resultEnd.end - offset;
					break;
				}
			}
			if (i === styles.length) {
				index = current.result.index + 1;
			}
			updateMatch(current, text, matches, index);
		}
		return results;
	};
	var computeTasks = function(block, baseModel, annotations) {
		var annotationModel = block.getAnnotationModel();
		if (!annotationModel) { return; }

		var annotationType = mAnnotations.AnnotationType.ANNOTATION_TASK;
		var subPatterns = block.getLinePatterns();
		if (subPatterns.length && block.pattern && block.pattern.pattern.name && block.pattern.pattern.name.indexOf("comment") === 0) {
			var substyles = [];
			parse(baseModel.getText(block.contentStart, block.end), block.contentStart, block, substyles, true);
			for (var i = 0; i < substyles.length; i++) {
				if (substyles[i].style === "meta.annotation.task.todo") {
					annotations.push(mAnnotations.AnnotationType.createAnnotation(annotationType, substyles[i].start, substyles[i].end, baseModel.getText(substyles[i].start, substyles[i].end)));
				}
			}
		}

		block.getBlocks().forEach(function(current) {
			computeTasks(current, baseModel, annotations);
		}.bind(this));
	};

	function PatternManager(grammars, rootId) {
		this._unnamedCounter = 0;
		this._patterns = [];
		this._rootId = rootId;
		grammars.forEach(function(grammar) {
			this._addRepositoryPatterns(grammar.repository || {}, grammar.id);
			this._addPatterns(grammar.patterns || [], grammar.id);
		}.bind(this));
	}
	PatternManager.prototype = {
		getPatterns: function(pattern) {
			var parentId;
			if (!pattern) {
				parentId = this._rootId;
			} else {
				if (typeof(pattern) === "string") { //$NON-NLS-0$
					parentId = pattern;
				} else {
					parentId = pattern.qualifiedId;
				}
			}
			/* indexes on patterns are used to break ties when multiple patterns match the same start text */
			var indexCounter = [0];
			var resultObject = {};
			var regEx = new RegExp("^" + parentId + "#[^#]+$"); //$NON-NLS-0$
			var includes = [];
			this._patterns.forEach(function(current) {
				if (regEx.test(current.qualifiedId)) {
					if (current.include) {
						includes.push(current);
					} else {
						current.index = indexCounter[0]++;
						resultObject[current.id] = current;
					}
				}
			}.bind(this));
			/*
			 * The includes get processed last to ensure that locally-defined patterns are given
			 * precedence over included ones with respect to pattern identifiers and indexes.
			 */
			includes.forEach(function(current) {
				this._processInclude(current, indexCounter, resultObject);
			}.bind(this));

			var result = [];
			var keys = Object.keys(resultObject);
			keys.forEach(function(current) {
				result.push(resultObject[current]);
			});
			return result;
		},
		_addPatterns: function(patterns, parentId) {
			patterns.forEach(function(pattern) {
				this._addPattern(pattern, this._NO_ID + this._unnamedCounter++, parentId);
			}.bind(this));
		},
		_addRepositoryPatterns: function(repository, parentId) {
			var keys = Object.keys(repository);
			keys.forEach(function(key) {
				this._addPattern(repository[key], key, parentId);
			}.bind(this));
		},
		_addPattern: function(pattern, patternId, parentId) {
			pattern.parentId = parentId;
			pattern.id = patternId;
			pattern.qualifiedId = pattern.parentId + "#" + pattern.id;
			this._patterns.push(pattern);
			if (pattern.patterns && !pattern.include) {
				this._addPatterns(pattern.patterns, pattern.qualifiedId);
			}
		},
		_processInclude: function(pattern, indexCounter, resultObject) {
			var searchExp;
			var index = pattern.include.indexOf("#");
			if (index === 0) {
				/* inclusion of pattern from same grammar */
				searchExp = new RegExp("^" + pattern.qualifiedId.substring(0, pattern.qualifiedId.indexOf("#")) + pattern.include + "$");
			} else if (index === -1) {
				/* inclusion of whole grammar */
				searchExp = new RegExp("^" + pattern.include + "#" + this._NO_ID + "[^#]+$");
			} else {
				/* inclusion of specific pattern from another grammar */
				searchExp = new RegExp("^" + pattern.include + "$");
			}
			var includes = [];
			this._patterns.forEach(function(current) {
				if (searchExp.test(current.qualifiedId)) {
					if (current.include) {
						includes.push(current);
					} else if (!resultObject[current.id]) {
						current.index = indexCounter[0]++;
						resultObject[current.id] = current;
					}
				}
			}.bind(this));

			/*
			 * The includes get processed last to ensure that locally-defined patterns are given
			 * precedence over included ones with respect to pattern identifiers and indexes.
			 */
			includes.forEach(function(current) {
				this._processInclude(current, indexCounter, resultObject);
			}.bind(this));
		},
		_NO_ID: "NoID"	//$NON-NLS-0$
	};

	function Block(bounds, pattern, styler, model, parent) {
		this.start = bounds.start;
		this.end = bounds.end;
		this.contentStart = bounds.contentStart;
		this.contentEnd = bounds.contentEnd;
		this.pattern = pattern;
		this._styler = styler;
		this._parent = parent;
		this._linePatterns = [];
		this._blockPatterns = [];
		this._enclosurePatterns = {};
		if (model) {
			this._initPatterns();
			this._subBlocks = computeBlocks(model, model.getText(this.start, this.end), this, this.start);
		}
	}
	Block.prototype = {
		adjustEnd: function(value) {
			this.end += value;
			this.contentEnd += value;
			this._subBlocks.forEach(function(current) {
				current.adjustEnd(value);
			});
		},
		adjustStart: function(value) {
			this.start += value;
			this.contentStart += value;
			this._subBlocks.forEach(function(current) {
				current.adjustStart(value);
			});
		},
		computeStyle: function(model, offset) {
			if (!(this.pattern && this.start <= offset && offset < this.end)) {
				return null;
			}

			var fullBlock = {
				start: this.start,
				end: this.end,
				style: this.pattern.pattern.name
			};
			if (this.contentStart <= offset && offset < this.contentEnd) {
				if (this.pattern.pattern.contentName) {
					return {
						start: this.contentStart,
						end: this.contentEnd,
						style: this.pattern.pattern.contentName
					};
				}
				return fullBlock;
			}

			var regex, captures, testString, index;
			if (offset < this.contentStart) {
				captures = this.pattern.pattern.beginCaptures || this.pattern.pattern.captures;
				if (!captures) {
					return fullBlock;
				}
				regex = this.pattern.regexBegin;
				testString = model.getText(this.start, this.contentStart);
				index = this.start;
			} else {
				captures = this.pattern.pattern.endCaptures || this.pattern.pattern.captures;
				if (!captures) {
					return fullBlock;
				}
				regex = this.pattern.regexEnd;
				testString = model.getText(this.contentEnd, this.end);
				index = this.contentEnd;
			}

			regex.lastIndex = 0;
			var result = regex.exec(testString);
			if (result) {
				var styles = [];
				getCaptureStyles(result, captures, index, styles);
				for (var i = 0; i < styles.length; i++) {
					if (styles[i].start <= offset && offset < styles[i].end) {
						return styles[i];
					}
				}
			}
			return fullBlock;
		},
		getAnnotationModel: function() {
			return this._styler._getAnnotationModel();
		},
		getBlockPatterns: function() {
			return this._blockPatterns;
		},
		getBlocks: function() {
			return this._subBlocks;
		},
		getEnclosurePatterns: function() {
			return this._enclosurePatterns;
		},
		getLinePatterns: function() {
			return this._linePatterns;
		},
		getParent: function() {
			return this._parent;
		},
		getPatternManager: function() {
			return this._styler._getPatternManager();
		},
		getStyler: function() {
			return this._styler;
		},
		isRenderingWhitespace: function() {
			return this._styler._isRenderingWhitespace();
		},
		_initPatterns: function() {
			var patterns = this.getPatternManager().getPatterns(this.pattern ? this.pattern.pattern : null);
			var processIgnore = function(matchString) {
				var result = /^\(\?i\)\s*/.exec(matchString);
				if (result) {
					matchString = matchString.substring(result[0].length);
				}
				return matchString;
			};
			patterns.forEach(function(current) {
				var pattern;
				if (current.match && !current.begin && !current.end) {
					var flags = "g";	//$NON-NLS-0$
					var match = processIgnore(current.match);
					if (match !== current.match) {
						flags += "i";	//$NON-NLS-0$
					}
					pattern = {regex: new RegExp(match, flags), pattern: current};
					this._linePatterns.push(pattern);
					if (current.patterns) {
						this._blockPatterns.push(pattern);
					} else {
						if (current.name && current.name.indexOf("punctuation.section") === 0 && (current.name.indexOf(PUNCTUATION_SECTION_BEGIN) !== -1 || current.name.indexOf(PUNCTUATION_SECTION_END) !== -1)) { //$NON-NLS-0$
							this._enclosurePatterns[current.name] = pattern;
						}
					}
				} else if (!current.match && current.begin && current.end) {
					var beginFlags = "g";	//$NON-NLS-0$
					var begin = processIgnore(current.begin);
					if (begin !== current.begin) {
						beginFlags += "i";	//$NON-NLS-0$
					}
					var endFlags = "g";	//$NON-NLS-0$
					var end = processIgnore(current.end);
					if (end !== current.end) {
						endFlags += "i";	//$NON-NLS-0$
					}
					pattern = {regexBegin: new RegExp(begin, beginFlags), regexEnd: new RegExp(end, endFlags), pattern: current};
					this._linePatterns.push(pattern);
					this._blockPatterns.push(pattern);
				}
			}.bind(this));
		}
	};

	function TextStylerAccessor(styler) {
		this._styler = styler;
	}
	TextStylerAccessor.prototype = {
		getStyles: function(offset) {
			return this._styler.getStyles(offset);
		}
	};

	function TextStyler (view, annotationModel, grammars, rootGrammarId) {
		this.whitespacesVisible = this.spacesVisible = this.tabsVisible = false;
		this.highlightCaretLine = false;
		this.foldingEnabled = true;
		this.detectTasks = true;
		this.view = view;
		this.annotationModel = annotationModel;
		this.patternManager = new PatternManager(grammars, rootGrammarId);
		this._accessor = new TextStylerAccessor(this);
		this._bracketAnnotations = undefined;

		var self = this;
		this._listener = {
			onChanged: function(e) {
				self._onModelChanged(e);
			},
			onDestroy: function(e) {
				self._onDestroy(e);
			},
			onLineStyle: function(e) {
				self._onLineStyle(e);
			},
			onMouseDown: function(e) {
				self._onMouseDown(e);
			},
			onSelection: function(e) {
				self._onSelection(e);
			}
		};
		var model = view.getModel();
		if (model.getBaseModel) {
			model = model.getBaseModel();
		}
		model.addEventListener("Changed", this._listener.onChanged); //$NON-NLS-0$
		view.addEventListener("MouseDown", this._listener.onMouseDown); //$NON-NLS-0$
		view.addEventListener("Selection", this._listener.onSelection); //$NON-NLS-0$
		view.addEventListener("Destroy", this._listener.onDestroy); //$NON-NLS-0$
		view.addEventListener("LineStyle", this._listener.onLineStyle); //$NON-NLS-0$

		var charCount = model.getCharCount();
		var rootBounds = {start: 0, contentStart: 0, end: charCount, contentEnd: charCount};
		this._rootBlock = new Block(rootBounds, null, this, model);
		this._computeFolding(this._rootBlock.getBlocks());
		if (annotationModel && this.detectTasks) {
			var add = [];
			computeTasks(this._rootBlock, model, add);
			annotationModel.replaceAnnotations([], add);
		}
		view.redrawLines();
	}

	TextStyler.prototype = {
		destroy: function() {
			var view = this.view;
			if (view) {
				var model = view.getModel();
				if (model.getBaseModel) {
					model = model.getBaseModel();
				}
				model.removeEventListener("Changed", this._listener.onChanged); //$NON-NLS-0$
				view.removeEventListener("MouseDown", this._listener.onMouseDown); //$NON-NLS-0$
				view.removeEventListener("Selection", this._listener.onSelection); //$NON-NLS-0$
				view.removeEventListener("Destroy", this._listener.onDestroy); //$NON-NLS-0$
				view.removeEventListener("LineStyle", this._listener.onLineStyle); //$NON-NLS-0$
				this.view = null;
			}
		},
		getStyleAccessor: function() {
			return this._accessor;
		},
		getStyles: function(offset) {
			var result = [];
			var model = this.view.getModel();
			if (model.getBaseModel) {
				model = model.getBaseModel();
			}
			var block = this._findBlock(this._rootBlock, offset);
			var lineIndex = model.getLineAtOffset(offset);
			var lineText = model.getLine(lineIndex);
			var styles = [];
			parse(lineText, model.getLineStart(lineIndex), block, styles);
			for (var i = 0; i < styles.length; i++) {
				if (offset < styles[i].start) {
					break;
				}
				if (styles[i].start <= offset && offset < styles[i].end) {
					result.push(styles[i]);
					break;
				}
			}
			while (block) {
				var style = block.computeStyle(model, offset);
				if (style) {
					result.splice(0, 0, style);
				}
				block = block.getParent();
			}
			return result;
		},
		setHighlightCaretLine: function(highlight) {
			this.highlightCaretLine = highlight;
		},
		setWhitespacesVisible: function(visible, redraw) {
			if (this.whitespacesVisible === visible) { return; }
			this.whitespacesVisible = visible;
			if (redraw) {
				this.view.redraw();
			}
		},
		setTabsVisible: function(visible) {
			if (this.tabsVisible === visible) { return; }
			this.tabsVisible = visible;
			this.setWhitespacesVisible(this.tabsVisible || this.spacesVisible, false);
			this.view.redraw();
		},
		setSpacesVisible: function(visible) {
			if (this.spacesVisible === visible) { return; }
			this.spacesVisible = visible;
			this.setWhitespacesVisible(this.tabsVisible || this.spacesVisible, false);
			this.view.redraw();
		},
		setDetectHyperlinks: function(enabled) {
		},
		setFoldingEnabled: function(enabled) {
			this.foldingEnabled = enabled;
		},
		setDetectTasks: function(enabled) {
			this.detectTasks = enabled;
		},
		_binarySearch: function(array, offset, inclusive, low, high) {
			var index;
			if (low === undefined) { low = -1; }
			if (high === undefined) { high = array.length; }
			while (high - low > 1) {
				index = Math.floor((high + low) / 2);
				if (offset <= array[index].start) {
					high = index;
				} else if (inclusive && offset < array[index].end) {
					high = index;
					break;
				} else {
					low = index;
				}
			}
			return high;
		},
		_computeFolding: function(blocks) {
			if (!this.foldingEnabled) { return; }
			var view = this.view;
			var viewModel = view.getModel();
			if (!viewModel.getBaseModel) { return; }
			var annotationModel = this.annotationModel;
			if (!annotationModel) { return; }
			annotationModel.removeAnnotations(mAnnotations.AnnotationType.ANNOTATION_FOLDING);
			var add = [];
			var baseModel = viewModel.getBaseModel();
			for (var i = 0; i < blocks.length; i++) {
				var block = blocks[i];
				var annotation = this._createFoldingAnnotation(viewModel, baseModel, block.start, block.end);
				if (annotation) {
					add.push(annotation);
				}
			}
			annotationModel.replaceAnnotations(null, add);
		},
		_createFoldingAnnotation: function(viewModel, baseModel, start, end) {
			var startLine = baseModel.getLineAtOffset(start);
			var endLine = baseModel.getLineAtOffset(end);
			if (startLine === endLine) {
				return null;
			}
			return new (mAnnotations.AnnotationType.getType(mAnnotations.AnnotationType.ANNOTATION_FOLDING))(start, end, viewModel);
		},
		_findBlock: function(parentBlock, offset) {
			var blocks = parentBlock.getBlocks();
			if (!blocks.length) {
				return parentBlock;
			}

			var index = this._binarySearch(blocks, offset, true);
			if (index < blocks.length && blocks[index].start <= offset && offset < blocks[index].end) {
				return this._findBlock(blocks[index], offset);
			}
			return parentBlock;
		},
		_findBrackets: function(bracket, closingBracket, block, text, start, end) {
			var result = [], styles = [];
			var offset = start, blocks = block.getBlocks();
			var startIndex = this._binarySearch(blocks, start, true);
			for (var i = startIndex; i < blocks.length; i++) {
				if (blocks[i].start >= end) { break; }
				var blockStart = blocks[i].start;
				var blockEnd = blocks[i].end;
				if (offset < blockStart) {
					parse(text.substring(offset - start, blockStart - start), offset, block, styles);
					styles.forEach(function(current) {
						if (current.style.indexOf(bracket.pattern.name) === 0) {
							result.push(current.start + 1);
						} else if (current.style.indexOf(closingBracket.pattern.name) === 0) {
							result.push(-(current.start + 1));
						}
					});
					styles = [];
				}
				offset = blockEnd;
			}
			if (offset < end) {
				parse(text.substring(offset - start, end - start), offset, block, styles);
				styles.forEach(function(current) {
					if (current.style.indexOf(bracket.pattern.name) === 0) {
						result.push(current.start + 1);
					} else if (current.style.indexOf(closingBracket.pattern.name) === 0) {
						result.push(-(current.start + 1));
					}
				});
			}
			return result;
		},
		_findMatchingBracket: function(model, block, offset) {
			var lineIndex = model.getLineAtOffset(offset);
			var lineEnd = model.getLineEnd(lineIndex);
			var text = model.getText(offset, lineEnd);

			var match;
			var enclosurePatterns = block.getEnclosurePatterns();
			var keys = Object.keys(enclosurePatterns);
			for (var i = 0; i < keys.length; i++) {
				var current = enclosurePatterns[keys[i]];
				var result = _findMatch(current.regex, text, 0);
				if (result && result.index === 0) {
					match = current;
					break;
				}
			}
			if (!match) { return -1; }

			var closingName;
			var onEnclosureStart = false;
			if (match.pattern.name.indexOf(PUNCTUATION_SECTION_BEGIN) !== -1) {
				onEnclosureStart = true;
				closingName = match.pattern.name.replace(PUNCTUATION_SECTION_BEGIN, PUNCTUATION_SECTION_END);
			} else {
				closingName = match.pattern.name.replace(PUNCTUATION_SECTION_END, PUNCTUATION_SECTION_BEGIN);
			}
			var closingBracket = enclosurePatterns[closingName];
			if (!closingBracket) { return -1; }

			var lineText = model.getLine(lineIndex);
			var lineStart = model.getLineStart(lineIndex);
			var brackets = this._findBrackets(match, closingBracket, block, lineText, lineStart, lineEnd);
			for (i = 0; i < brackets.length; i++) {
				var sign = brackets[i] >= 0 ? 1 : -1;
				if (brackets[i] * sign - 1 === offset) {
					var level = 1;
					if (!onEnclosureStart) {
						i--;
						for (; i>=0; i--) {
							sign = brackets[i] >= 0 ? 1 : -1;
							level += sign;
							if (level === 0) {
								return brackets[i] * sign - 1;
							}
						}
						lineIndex -= 1;
						while (lineIndex >= 0) {
							lineText = model.getLine(lineIndex);
							lineStart = model.getLineStart(lineIndex);
							lineEnd = model.getLineEnd(lineIndex);
							brackets = this._findBrackets(match, closingBracket, block, lineText, lineStart, lineEnd);
							for (var j = brackets.length - 1; j >= 0; j--) {
								sign = brackets[j] >= 0 ? 1 : -1;
								level += sign;
								if (level === 0) {
									return brackets[j] * sign - 1;
								}
							}
							lineIndex--;
						}
					} else {
						i++;
						for (; i<brackets.length; i++) {
							sign = brackets[i] >= 0 ? 1 : -1;
							level += sign;
							if (level === 0) {
								return brackets[i] * sign - 1;
							}
						}
						lineIndex += 1;
						var lineCount = model.getLineCount ();
						while (lineIndex < lineCount) {
							lineText = model.getLine(lineIndex);
							lineStart = model.getLineStart(lineIndex);
							lineEnd = model.getLineEnd(lineIndex);
							brackets = this._findBrackets(match, closingBracket, block, lineText, lineStart, lineEnd);
							for (var k=0; k<brackets.length; k++) {
								sign = brackets[k] >= 0 ? 1 : -1;
								level += sign;
								if (level === 0) {
									return brackets[k] * sign - 1;
								}
							}
							lineIndex++;
						}
					}
					break;
				}
			}
			return -1;
		},
		_getAnnotationModel: function() {
			return this.annotationModel;
		},
		_getLineStyle: function(lineIndex) {
			if (this.highlightCaretLine) {
				var view = this.view;
				var model = view.getModel();
				var selection = view.getSelection();
				if (selection.start === selection.end && model.getLineAtOffset(selection.start) === lineIndex) {
					return caretLineStyle;
				}
			}
			return null;
		},
		_getPatternManager: function() {
			return this.patternManager;
		},
		_getStyles: function(block, model, text, start) {
			if (model.getBaseModel) {
				start = model.mapOffset(start);
			}
			var end = start + text.length;

			var styles = [];
			var offset = start, blocks = block.getBlocks();
			var startIndex = this._binarySearch(blocks, start, true);
			for (var i = startIndex; i < blocks.length; i++) {
				if (blocks[i].start >= end) { break; }
				var blockStart = blocks[i].start;
				var blockEnd = blocks[i].end;
				if (offset < blockStart) {
					/* content on that line that preceeds the start of the block */
					parse(text.substring(offset - start, blockStart - start), offset, block, styles);
				}
				var s = Math.max(offset, blockStart);
				if (s === blockStart) {
					/* currently at the block's "start" match, which specifies its style by either a capture or name */
					if (blocks[i].pattern.regexBegin) {
						var result = _findMatch(blocks[i].pattern.regexBegin, text.substring(s - start), 0);
						if (result) {
							/* the begin match is still valid */
							var captures = blocks[i].pattern.pattern.beginCaptures || blocks[i].pattern.pattern.captures;
							if (captures) {
								getCaptureStyles(result, captures, s, styles);
							} else {
								styles.push({start: s, end: s + result[0].length, style: blocks[i].pattern.pattern.name});
							}
							s += result[0].length;
						}
					}
				}

				/*
				 * Compute the end match now in order to determine the end-bound of the contained content, but do not add the
				 * end match's styles to the styles array until content styles have been computed so that ordering is preserved.
				 */
				var e = Math.min(end, blockEnd);
				var endStyles = [];
				if (e === blockEnd) {
					/* currently at the block's "end" match, which specifies its style by either a capture or name */
					if (blocks[i].pattern.regexEnd) {
						var testString = text.substring(e - offset - (blocks[i].end - blocks[i].contentEnd));
						var result = _findMatch(blocks[i].pattern.regexEnd, testString, 0);
						if (result) {
							/* the end match is still valid */
							var captures = blocks[i].pattern.pattern.endCaptures || blocks[i].pattern.pattern.captures;
							if (captures) {
								getCaptureStyles(result, captures, e - result[0].length, endStyles);
							} else if (blocks[i].pattern.pattern.name) {
								endStyles.push({start: e - result[0].length, end: e, style: blocks[i].pattern.pattern.name});
							}
							e -= result[0].length;
						}
					}
				}

				var blockSubstyles = this._getStyles(blocks[i], model, text.substring(s - start, e - start), s);
				var blockStyle = blocks[i].pattern.pattern.contentName || blocks[i].pattern.pattern.name;
				if (blockStyle) {
					/*
					 * If a name was specified for the current block then apply its style throughout its
					 * content wherever a style is not provided by a sub-pattern.
					 */
					var index = s;
					blockSubstyles.forEach(function(current) {
						if (current.start - index) {
							styles.push({start: index, end: current.start, style: blockStyle});
						}
						styles.push(current);
						index = current.end;
					});
					if (e - index) {
						styles.push({start: index, end: e, style: blockStyle});
					}
				} else {
					styles = styles.concat(blockSubstyles);
				}
				styles = styles.concat(endStyles);
				offset = blockEnd;
			}
			if (offset < end) {
				/* content on that line that follows the end of the block */
				parse(text.substring(offset - start, end - start), offset, block, styles);
			}
			if (model.getBaseModel) {
				for (var j = 0; j < styles.length; j++) {
					var length = styles[j].end - styles[j].start;
					styles[j].start = model.mapOffset(styles[j].start, true);
					styles[j].end = styles[j].start + length;
				}
			}
			return styles;
		},
		_isRenderingWhitespace: function() {
			return this.whitespacesVisible && (this.tabsVisible || this.spacesVisible);
		},
		_onDestroy: function(e) {
			this.destroy();
		},
		_onLineStyle: function(e) {
			if (e.textView === this.view) {
				e.style = this._getLineStyle(e.lineIndex);
			}
			e.ranges = this._getStyles(this._rootBlock, e.textView.getModel(), e.lineText, e.lineStart);
			e.ranges.forEach(function(current) {
				if (current.style) {
					current.style = {styleClass: current.style.replace(/\./g, " ")};
				}
			});
			if (this._isRenderingWhitespace()) {
				if (this.spacesVisible) {
					this._spliceStyles(spacePattern, e.ranges, e.lineText, e.lineStart);
				}
				if (this.tabsVisible) {
					this._spliceStyles(tabPattern, e.ranges, e.lineText, e.lineStart);
				}
			}
		},
		_onSelection: function(e) {
			var oldSelection = e.oldValue;
			var newSelection = e.newValue;
			var view = this.view;
			var model = view.getModel();
			var lineIndex;
			if (this.highlightCaretLine) {
				var oldLineIndex = model.getLineAtOffset(oldSelection.start);
				lineIndex = model.getLineAtOffset(newSelection.start);
				var newEmpty = newSelection.start === newSelection.end;
				var oldEmpty = oldSelection.start === oldSelection.end;
				if (!(oldLineIndex === lineIndex && oldEmpty && newEmpty)) {
					if (oldEmpty) {
						view.redrawLines(oldLineIndex, oldLineIndex + 1);
					}
					if ((oldLineIndex !== lineIndex || !oldEmpty) && newEmpty) {
						view.redrawLines(lineIndex, lineIndex + 1);
					}
				}
			}
			if (!this.annotationModel) { return; }
			var remove = this._bracketAnnotations, add, caret;
			if (newSelection.start === newSelection.end && (caret = view.getCaretOffset()) > 0) {
				var mapCaret = caret - 1;
				if (model.getBaseModel) {
					mapCaret = model.mapOffset(mapCaret);
					model = model.getBaseModel();
				}
				var block = this._findBlock(this._rootBlock, mapCaret);
				var bracket = this._findMatchingBracket(model, block, mapCaret);
				if (bracket !== -1) {
					add = [
						mAnnotations.AnnotationType.createAnnotation(mAnnotations.AnnotationType.ANNOTATION_MATCHING_BRACKET, bracket, bracket + 1),
						mAnnotations.AnnotationType.createAnnotation(mAnnotations.AnnotationType.ANNOTATION_CURRENT_BRACKET, mapCaret, mapCaret + 1)
					];
				}
			}
			this._bracketAnnotations = add;
			this.annotationModel.replaceAnnotations(remove, add);
		},
		_onMouseDown: function(e) {
			if (e.clickCount !== 2) { return; }
			var view = this.view;
			var model = view.getModel();
			var offset = view.getOffsetAtLocation(e.x, e.y);
			if (offset > 0) {
				var mapOffset = offset - 1;
				var baseModel = model;
				if (model.getBaseModel) {
					mapOffset = model.mapOffset(mapOffset);
					baseModel = model.getBaseModel();
				}
				var block = this._findBlock(this._rootBlock, mapOffset);
				var bracket = this._findMatchingBracket(baseModel, block, mapOffset);
				if (bracket !== -1) {
					e.preventDefault();
					var mapBracket = bracket;
					if (model.getBaseModel) {
						mapBracket = model.mapOffset(mapBracket, true);
					}
					if (offset > mapBracket) {
						offset--;
						mapBracket++;
					}
					view.setSelection(mapBracket, offset);
				}
			}
		},
		_onModelChanged: function(e) {
			var start = e.start;
			var removedCharCount = e.removedCharCount;
			var addedCharCount = e.addedCharCount;
			var changeCount = addedCharCount - removedCharCount;
			var view = this.view;
			var viewModel = view.getModel();
			var baseModel = viewModel.getBaseModel ? viewModel.getBaseModel() : viewModel;
			var end = start + removedCharCount;
			var charCount = baseModel.getCharCount();
			var blocks = this._rootBlock.getBlocks();
			var blockCount = blocks.length;
			var lineStart = baseModel.getLineStart(baseModel.getLineAtOffset(start));
			var blockStart = this._binarySearch(blocks, lineStart, true);
			var blockEnd = this._binarySearch(blocks, end, false, blockStart - 1, blockCount);

			var ts;
			if (blockStart < blockCount && blocks[blockStart].start <= lineStart && lineStart < blocks[blockStart].end) {
				ts = blocks[blockStart].start;
				if (ts > start) { ts += changeCount; }
			} else {
				if (blockStart === blockCount && blockCount > 0 && charCount - changeCount === blocks[blockCount - 1].end) {
					ts = blocks[blockCount - 1].start;
				} else {
					ts = lineStart;
				}
			}

			var te, newBlocks;
			/*
			 * The case where the following loop will iterate more than once is a change to a block that causes it to expand
			 * through the subsequent block (eg.- removing the '/' from the end of a multi-line comment.  This is determined
			 * by a subsequent block's end pattern id changing as a result of the text change.  When this happens, the first
			 * block is expanded through subsequent blocks until one is found with the same ending pattern id to terminate it.
			 */
			do {
				if (blockEnd < blockCount) {
					te = blocks[blockEnd].end;
					if (te > start) { te += changeCount; }
					blockEnd += 1;
				} else {
					blockEnd = blockCount;
					te = charCount;	//TODO could it be smaller?
				}
				var text = baseModel.getText(ts, te), block;
				newBlocks = computeBlocks(baseModel, text, this._rootBlock, ts);
			} while (newBlocks.length && blocks.length && blockEnd < blockCount && newBlocks[newBlocks.length - 1].pattern.pattern.id !== blocks[blockEnd - 1].pattern.pattern.id);

			for (var i = blockStart; i < blocks.length; i++) {
				block = blocks[i];
				if (block.start > start) { block.adjustStart(changeCount); }
				if (block.start > start) { block.adjustEnd(changeCount); }
			}
			var redraw = (blockEnd - blockStart) !== newBlocks.length;
			if (!redraw) {
				for (i = 0; i < newBlocks.length; i++) {
					block = blocks[blockStart + i];
					var newBlock = newBlocks[i];
					if (block.start !== newBlock.start || block.end !== newBlock.end || block.type !== newBlock.type) {
						redraw = true;
						break;
					}
				}
			}
			var args = [blockStart, blockEnd - blockStart].concat(newBlocks);
			Array.prototype.splice.apply(blocks, args);
			if (redraw) {
				var redrawStart = ts;
				var redrawEnd = te;
				if (viewModel !== baseModel) {
					redrawStart = viewModel.mapOffset(redrawStart, true);
					redrawEnd = viewModel.mapOffset(redrawEnd, true);
				}
				view.redrawRange(redrawStart, redrawEnd);
			}

			if (this.annotationModel) {
				var remove = [], add = [];
				var allFolding = [];
				var iter = this.annotationModel.getAnnotations(ts, te);
				var doFolding = this.foldingEnabled && baseModel !== viewModel;
				while (iter.hasNext()) {
					var annotation = iter.next();
					if (doFolding && annotation.type === mAnnotations.AnnotationType.ANNOTATION_FOLDING) {
						allFolding.push(annotation);
						for (i = 0; i < newBlocks.length; i++) {
							if (annotation.start === newBlocks[i].start && annotation.end === newBlocks[i].end) {
								break;
							}
						}
						if (i === newBlocks.length) {
							remove.push(annotation);
							annotation.expand();
						} else {
							var annotationStart = annotation.start;
							var annotationEnd = annotation.end;
							if (annotationStart > start) {
								annotationStart -= changeCount;
							}
							if (annotationEnd > start) {
								annotationEnd -= changeCount;
							}
							if (annotationStart <= start && start < annotationEnd && annotationStart <= end && end < annotationEnd) {
								var startLine = baseModel.getLineAtOffset(annotation.start);
								var endLine = baseModel.getLineAtOffset(annotation.end);
								if (startLine !== endLine) {
									if (!annotation.expanded) {
										annotation.expand();
									}
								} else {
									this.annotationModel.removeAnnotation(annotation);
								}
							}
						}
						for (i = 0; i < newBlocks.length; i++) {
							block = newBlocks[i];
							for (var j = 0; j < allFolding.length; j++) {
								if (allFolding[j].start === block.start && allFolding[j].end === block.end) {
									break;
								}
							}
							if (j === allFolding.length) {
								annotation = this._createFoldingAnnotation(viewModel, baseModel, block.start, block.end);
								if (annotation) {
									add.push(annotation);
								}
							}
						}
					} else if (annotation.type === mAnnotations.AnnotationType.ANNOTATION_TASK) {
						remove.push(annotation);
					}
				}
				if (this.detectTasks) {
					for (i = 0; i < newBlocks.length; i++) {
						computeTasks(newBlocks[i], baseModel, add);
					}
				}
				this.annotationModel.replaceAnnotations(remove, add);
			}
		},
		_spliceStyles: function(whitespacePattern, ranges, text, offset) {
			var regex = whitespacePattern.regex;
			regex.lastIndex = 0;
			var rangeIndex = 0;
			var result = regex.exec(text);
			while (result) {
				var charIndex = offset + result.index;
				while (rangeIndex < ranges.length) {
					if (charIndex < ranges[rangeIndex].end) {
						break;
					}
					rangeIndex++;
				};
				var newStyle = {
					start: charIndex,
					end: charIndex + 1,
					style: whitespacePattern.style
				};
				if (rangeIndex < ranges.length && ranges[rangeIndex].start <= charIndex) {
					var endStyle = {start: charIndex + 1, end: ranges[rangeIndex].end, style: ranges[rangeIndex].style};
					ranges[rangeIndex].end = charIndex;
					ranges.splice(rangeIndex + 1, 0, endStyle);
					ranges.splice(rangeIndex + 1, 0, newStyle);
					rangeIndex += 2;
				} else {
					ranges.splice(rangeIndex, 0, newStyle);
					rangeIndex++;
				}
				result = regex.exec(text);
			}
		}
	};

	return {TextStyler: TextStyler};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define*/

define("orion/editor/stylers/text_x-php/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) { //$NON-NLS-0$
	var keywords = [
		"abstract", "and", "array", "as", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"break", //$NON-NLS-0$
		"callable", "case", "catch", "class", "clone", "const", "continue", //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"declare", "default", "die", "do", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"echo", "else", "elseif", "empty", "enddeclare", "endfor", //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"endforeach", "endif", "endswitch", "endwhile", "eval", "exit", "extends", //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"false", "FALSE", "final", "finally", "for", "foreach", "function", //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"global", "goto", //$NON-NLS-1$ //$NON-NLS-0$
		"if", "implements", "include", "include_once", "insteadof", "interface", "instanceof", "isset", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"list", //$NON-NLS-0$
		"namespace", "new", "null", "NULL", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"or", //$NON-NLS-0$
		"parent", "print", "private", "protected", "public", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"require", "require_once", "return", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"self", "static", "switch", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"throw", "trait", "try", "true", "TRUE", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"unset", "use", //$NON-NLS-1$ //$NON-NLS-0$
		"var", //$NON-NLS-0$
		"while", //$NON-NLS-0$
		"xor", //$NON-NLS-0$
		"yield", //$NON-NLS-0$
		"__halt_compiler", "__CLASS__", "__DIR__", "__FILE__", "__FUNCTION__",  //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"__LINE__", "__METHOD__", "__NAMESPACE__", "__TRAIT__"  //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	];

	var grammars = mLib.grammars;
	grammars.push({
		id: "orion.php",
		contentTypes: ["text/x-php"],
		patterns: [
			{
				include: "orion.lib#doc_block"
			}, {
				include: "orion.c-like"
			}, {
				match: "(?i)<\\?(?:=|php)?(?:\\s|$)",
				name: "entity.name.declaration.php",
			}, {
				match: "<%=?(?:\\s|$)",
				name: "entity.name.declaration.php",
			}, {
				match: "#.*",
				name: "comment.line.number-sign.php",
				patterns: [
					{
						include: "orion.lib#todo_comment_singleLine"
					}
				]
			}, {
				begin: "<<<(\\w+)$",
				end: "^\\1;$",
				name: "string.unquoted.heredoc.php"
			}, {
				begin: "<<<'(\\w+)'$",
				end: "^\\1;$",
				name: "string.unquoted.heredoc.nowdoc.php"
			}, {
				match: "\\b0[bB][01]+\\b",
				name: "constant.numeric.binary.php"
			}, {
				match: "\\b(?:" + keywords.join("|") + ")\\b",
				name: "keyword.control.php"
			}
		]
	});

	return {
		id: "orion.php",
		grammars: grammars,
		keywords: keywords
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define*/

define("orion/editor/stylers/application_xml/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) { //$NON-NLS-1$ //$NON-NLS-0$

	var grammars = mLib.grammars;
	grammars.push({
		id: "orion.xml",
		contentTypes: ["application/xml", "application/xhtml+xml"],
		patterns: [
			{
				include: "#comment"
			}, {
				include: "#doctype"
			}, {
				include: "#xmlDeclaration"
			}, {
				begin: "</?[A-Za-z0-9]+",
				end: "/?>",
				captures: {
					0: {name: "entity.name.tag.xml"},
				},
				name: "meta.tag.xml",
				patterns: [
					{
						include: "#comment"
					}, {
						include: "orion.lib#string_doubleQuote"
					}, {
						include: "orion.lib#string_singleQuote"
					}
				]
			}, {
				match: "&lt;|&gt;|&amp;",
				name: "constant.character"
			}
		],
		repository: {
			comment: {
				begin: "<!--",
				end: "-->",
				name: "comment.block.xml",
				patterns: [
					{
						match: "(\\b)(TODO)(\\b)(((?!-->).)*)",
						name: "meta.annotation.task.todo",
						captures: {
							2: {name: "keyword.other.documentation.task"},
							4: {name: "comment.line"}
						}
					}
				]
			},
			doctype: {
				begin: "<!(?:doctype|DOCTYPE)",
				end: ">",
				name: "meta.tag.doctype.xml",
				captures: {
					0: {name: "entity.name.tag.doctype.xml"},
				},
				patterns: [
					{
						include: "#comment"
					}, {
						include: "orion.lib#string_doubleQuote"
					}, {
						include: "orion.lib#string_singleQuote"
					}
				]
			},
			xmlDeclaration: {
				begin: "<\\?xml",
				end: "\\?>",
				captures: {
					0: {name: "entity.name.tag.declaration.xml"},
				},
				patterns: [
					{
						include: "#comment"
					}, {
						include: "orion.lib#string_doubleQuote"
					}, {
						include: "orion.lib#string_singleQuote"
					}
				],
				name: "meta.tag.declaration.xml"
			}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: []
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define*/

define("orion/editor/stylers/text_html/syntax", ["orion/editor/stylers/lib/syntax", "orion/editor/stylers/application_javascript/syntax", "orion/editor/stylers/text_css/syntax", "orion/editor/stylers/text_x-php/syntax", "orion/editor/stylers/application_xml/syntax"], //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	function(mLib, mJS, mCSS, mPHP, mXML) {

	var grammars = mLib.grammars.concat(mJS.grammars).concat(mCSS.grammars).concat(mPHP.grammars).concat(mXML.grammars);
	grammars.push({
		id: "orion.html",
		contentTypes: ["text/html"],
		patterns: [
			{
				include: "orion.xml"
			}, {
				begin: "(?i)(<style)([^>]*)(>)",
				end: "(?i)(</style>)",
				captures: {
					1: {name: "entity.name.tag.html"},
					3: {name: "entity.name.tag.html"}
				},
				contentName: "source.css.embedded.html",
				patterns: [
					{
						include: "orion.css"
					}
				]
			}, {
				begin: "(?i)<script\\s*>|<script\\s.*?(?:language\\s*=\\s*(['\"])javascript\\1|type\\s*=\\s*(['\"])(?:text|application)/(?:javascript|ecmascript)\\2).*?>",
				end: "(?i)</script>",
				captures: {
					0: {name: "entity.name.tag.html"}
				},
				contentName: "source.js.embedded.html",
				patterns: [
					{
						include: "orion.js"
					}
				]
			}, {
				begin: "(?i)<script\\s.*?(?:language\\s*=\\s*(['\"])php\\1|type\\s*=\\s*(['\"])text/x-php\\2).*?>",
				end: "(?i)</script>",
				captures: {
					0: {name: "entity.name.tag.html"}
				},
				contentName: "source.php.embedded.html",
				patterns: [
					{
						include: "orion.php"
					}
				]
			}, {
				begin: "(?i)<\\?(?:=|php)?(?:\\s|$)",
				end: "\\?>",
				captures: {
					0: {name: "entity.name.declaration.php"}
				},
				contentName: "source.php.embedded.html",
				patterns: [
					{
						include: "orion.php"
					}
				]
			}, {
				begin: "<%=?(?:\\s|$)",
				end: "%>",
				captures: {
					0: {name: "entity.name.declaration.php"}
				},
				contentName: "source.php.embedded.html",
				patterns: [
					{
						include: "orion.php"
					}
				]
			}
		],
		repository: {
			/* override orion.xml#xmlDeclaration (no-op) */
			xmlDeclaration: {}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: []
	};
});

/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
 
/*globals define Node */

define('orion/editor/edit', [ //$NON-NLS-0$
	"require", //$NON-NLS-0$
	"orion/editor/shim", //$NON-NLS-0$
	
	"orion/editor/textView", //$NON-NLS-0$
	"orion/editor/textModel", //$NON-NLS-0$
	"orion/editor/textTheme", //$NON-NLS-0$
	"orion/editor/projectionTextModel", //$NON-NLS-0$
	"orion/editor/eventTarget", //$NON-NLS-0$
	"orion/keyBinding", //$NON-NLS-0$
	"orion/editor/rulers", //$NON-NLS-0$
	"orion/editor/annotations", //$NON-NLS-0$
	"orion/editor/tooltip", //$NON-NLS-0$
	"orion/editor/undoStack", //$NON-NLS-0$
	"orion/editor/textDND", //$NON-NLS-0$
	
	"orion/editor/editor", //$NON-NLS-0$
	"orion/editor/editorFeatures", //$NON-NLS-0$
	
	"orion/editor/contentAssist", //$NON-NLS-0$
	"orion/editor/cssContentAssist", //$NON-NLS-0$
	"orion/editor/htmlContentAssist", //$NON-NLS-0$
	"orion/editor/jsTemplateContentAssist", //$NON-NLS-0$
	
	"orion/editor/AsyncStyler", //$NON-NLS-0$
	"orion/editor/mirror", //$NON-NLS-0$
	"orion/editor/textMateStyler", //$NON-NLS-0$
	"orion/editor/htmlGrammar", //$NON-NLS-0$
	"orion/editor/textStyler", //$NON-NLS-0$
	"orion/editor/stylers/application_javascript/syntax", //$NON-NLS-0$
	"orion/editor/stylers/text_css/syntax", //$NON-NLS-0$
	"orion/editor/stylers/text_html/syntax" //$NON-NLS-0$

], function(require, shim, mTextView, mTextModel, mTextTheme, mProjModel, mEventTarget, mKeyBinding, mRulers, mAnnotations,
			mTooltip, mUndoStack, mTextDND, mEditor, mEditorFeatures, mContentAssist, mCSSContentAssist, mHtmlContentAssist,
			mJSContentAssist, mAsyncStyler, mMirror, mTextMateStyler, mHtmlGrammar, mTextStyler, mJS, mCSS, mHTML) {

	/**	@private */
	function getDisplay(window, document, element) {
		var display;
		var temp = element;
		while (temp && temp !== document && display !== "none") { //$NON-NLS-0$
			if (window.getComputedStyle) {
				var style = window.getComputedStyle(temp, null);
				display = style.getPropertyValue("display"); //$NON-NLS-0$
			} else {
				display = temp.currentStyle.display;
			}
			temp = temp.parentNode;
		}
		return display;
	}

	/**	@private */
	function getTextFromElement(element) {
		var firstChild = element.firstChild;
		if (firstChild && firstChild.tagName === "TEXTAREA") { //$NON-NLS-0$
			return firstChild.value;
		}
		var document = element.ownerDocument;
		var window = document.defaultView || document.parentWindow;
		if (!window.getSelection ||
			(element.childNodes.length === 1 && firstChild.nodeType === Node.TEXT_NODE) ||
			getDisplay(window, document, element) === "none") //$NON-NLS-0$
		{
			return element.innerText || element.textContent;
		}
		var newRange = document.createRange();
		newRange.selectNode(element);
		var selection = window.getSelection();
		var oldRanges = [], i;
		for (i = 0; i < selection.rangeCount; i++) {
			oldRanges.push(selection.getRangeAt(i));
		}
		selection.removeAllRanges();
		selection.addRange(newRange);
		var text = selection.toString();
		selection.removeAllRanges();
		for (i = 0; i < oldRanges.length; i++) {
			selection.addRange(oldRanges[i]);
		}
		return text;
	}

	/**	@private */	
	function optionName(name) {
		var prefix = "data-editor-"; //$NON-NLS-0$
		if (name.substring(0, prefix.length) === prefix) {
			var key = name.substring(prefix.length);
			key = key.replace(/-([a-z])/ig, function(all, character) {
				return character.toUpperCase();
			});
			return key;
		}
		return undefined;
	}
	
	/**	@private */
	function merge(obj1, obj2) {
		for (var p in obj2) {
			if (obj2.hasOwnProperty(p)) {
				obj1[p] = obj2[p];
			}
		}
	}
	
	/**	@private */
	function mergeOptions(parent, defaultOptions) {
		var options = {};
		merge(options, defaultOptions);
		for (var attr, j = 0, attrs = parent.attributes, l = attrs.length; j < l; j++) {
			attr = attrs.item(j);
			var key = optionName(attr.nodeName);
			if (key) {
				var value = attr.nodeValue;
				if (value === "true" || value === "false") { //$NON-NLS-1$ //$NON-NLS-0$
					value = value === "true"; //$NON-NLS-0$
				}
				options[key] = value;
			}
		}
		return options;
	}
	
	/**	@private */
	function getParents(document, className) {
		if (document.getElementsByClassName) {
			return document.getElementsByClassName(className);
		}
		className = className.replace(/ *$/, '');
		if (document.querySelectorAll) {
			return document.querySelectorAll((' ' + className).replace(/ +/g, '.')); //$NON-NLS-1$ //$NON-NLS-0$
		}
		return null;
	}
	
	/**	@private */
	function getHeight(node) {
		return node.clientHeight;
	}
	
	/**
	 * @class This object describes the options for <code>edit</code>.
	 * @name orion.editor.EditOptions
	 *
	 * @property {String|DOMElement} parent the parent element for the view, it can be either a DOM element or an ID for a DOM element.
	 * @property {Boolean} [readonly=false] whether or not the view is read-only.
	 * @property {Boolean} [fullSelection=true] whether or not the view is in full selection mode.
	 * @property {Boolean} [tabMode=true] whether or not the tab keypress is consumed by the view or is used for focus traversal.
	 * @property {Boolean} [expandTab=false] whether or not the tab key inserts white spaces.
	 * @property {String} [themeClass] the CSS class for the view theming.
	 * @property {Number} [tabSize=4] The number of spaces in a tab.
	 * @property {Boolean} [singleMode=false] whether or not the editor is in single line mode.
	 * @property {Boolean} [wrapMode=false] whether or not the view wraps lines.
	 * @property {Boolean} [wrapable=false] whether or not the view is wrappable.
	 * @property {Function} [statusReporter] a status reporter.
	 * @property {String} [title=""] the editor title.
	 * @property {String} [contents=""] the editor contents.
	 * @property {String} [lang] @deprecated use contentType instead
	 * @property {String} [contentType] the type of the content (eg.- application/javascript, text/html, etc.)
	 * @property {Boolean} [showLinesRuler=true] whether or not the lines ruler is shown.
	 * @property {Boolean} [showAnnotationRuler=true] whether or not the annotation ruler is shown.
	 * @property {Boolean} [showOverviewRuler=true] whether or not the overview ruler is shown.
	 * @property {Boolean} [showFoldingRuler=true] whether or not the folding ruler is shown.
	 * @property {Boolean} [noFocus=false] whether or not to focus the editor on creation.
	 * @property {Number} [firstLineIndex=1] the line index displayed for the first line of text.
	 */
	/**
	 * Creates an editor instance configured with the given options.
	 * 
	 * @param {orion.editor.EditOptions} options the editor options.
	 */
	function edit(options) {
		var doc = options.document || document;
		var parent = options.parent;
		if (!parent) { parent = "editor"; } //$NON-NLS-0$
		if (typeof(parent) === "string") { //$NON-NLS-0$
			parent = doc.getElementById(parent);
		}
		if (!parent) {
			if (options.className) {
				var parents = getParents(doc, options.className);
				if (parents) {
					options.className = undefined;
					// Do not focus editors by default when creating multiple editors
					if (parents.length > 1 && options.noFocus === undefined) { options.noFocus = true; }
					var editors = [];
					for (var i = parents.length - 1; i >= 0; i--) {
						options.parent = parents[i];
						editors.push(edit(options));
					}
					return editors;
				}
			}
		}
		if (!parent) { throw "no parent"; } //$NON-NLS-0$
		options = mergeOptions(parent, options);
	
		if (typeof options.theme === "string") { //$NON-NLS-0$
			var theme = mTextTheme.TextTheme.getTheme(options.theme);
			var index = options.theme.lastIndexOf("/"); //$NON-NLS-0$
			var themeClass = options.theme; 
			if (index !== -1) {
				themeClass = themeClass.substring(index + 1);
			}
			var extension = ".css"; //$NON-NLS-0$
			if (themeClass.substring(themeClass.length - extension.length) === extension) {
				themeClass = themeClass.substring(0, themeClass.length - extension.length);
			}
			theme.setThemeClass(themeClass, {href: options.theme});
			options.theme = theme;
		}
		var textViewFactory = function() {
			return new mTextView.TextView({
				parent: parent,
				model: new mProjModel.ProjectionTextModel(options.model ? options.model : new mTextModel.TextModel("")),
				tabSize: options.tabSize ? options.tabSize : 4,
				readonly: options.readonly,
				fullSelection: options.fullSelection,
				tabMode: options.tabMode,
				expandTab: options.expandTab,
				singleMode: options.singleMode,
				themeClass: options.themeClass,
				theme: options.theme,
				wrapMode: options.wrapMode,
				wrappable: options.wrappable
			});
		};

		var contentAssist, contentAssistFactory;
		if (!options.readonly) {
			contentAssistFactory = {
				createContentAssistMode: function(editor) {
					contentAssist = new mContentAssist.ContentAssist(editor.getTextView());
					var contentAssistWidget = new mContentAssist.ContentAssistWidget(contentAssist);
					var result = new mContentAssist.ContentAssistMode(contentAssist, contentAssistWidget);
					contentAssist.setMode(result);
					return result;
				}
			};
		}
	
		var syntaxHighlighter = {
			styler: null, 
			
			highlight: function(contentType, editor) {
				if (this.styler && this.styler.destroy) {
					this.styler.destroy();
				}
				this.styler = null;

				/* to maintain backwards-compatibility convert previously-supported lang values to types */
				if (contentType === "js") { //$NON-NLS-0$
					contentType = "application/javascript"; //$NON-NLS-0$
				} else if (contentType === "css") { //$NON-NLS-0$
					contentType = "text/css"; //$NON-NLS-0$
				} else if (contentType === "html") { //$NON-NLS-0$
					contentType = "text/html"; //$NON-NLS-0$
				} else if (contentType === "java") { //$NON-NLS-0$
					contentType = "text/x-java-source"; //$NON-NLS-0$
				}

				var textView = editor.getTextView();
				var annotationModel = editor.getAnnotationModel();
				if (contentType) {
					contentType = contentType.replace(/[*|:/".<>?+]/g, '_');
					require(["./stylers/" + contentType + "/syntax"], function(grammar) { //$NON-NLS-1$ //$NON-NLS-0$
						this.styler = new mTextStyler.TextStyler(textView, annotationModel, grammar.grammars, grammar.id);
					});
				}
				if (contentType === "text/css") { //$NON-NLS-0$
					editor.setFoldingRulerVisible(options.showFoldingRuler === undefined || options.showFoldingRuler);
				}
			}
		};
		
		var editor = new mEditor.Editor({
			textViewFactory: textViewFactory,
			undoStackFactory: new mEditorFeatures.UndoFactory(),
			annotationFactory: new mEditorFeatures.AnnotationFactory(),
			lineNumberRulerFactory: new mEditorFeatures.LineNumberRulerFactory(),
			foldingRulerFactory: new mEditorFeatures.FoldingRulerFactory(),
			textDNDFactory: new mEditorFeatures.TextDNDFactory(),
			contentAssistFactory: contentAssistFactory,
			keyBindingFactory: new mEditorFeatures.KeyBindingsFactory(), 
			statusReporter: options.statusReporter,
			domNode: parent
		});
		editor.addEventListener("TextViewInstalled", function() { //$NON-NLS-0$
			var ruler = editor.getLineNumberRuler();
			if (ruler && options.firstLineIndex !== undefined) {
				ruler.setFirstLine(options.firstLineIndex);
			}
			var sourceCodeActions = editor.getSourceCodeActions();
			if (sourceCodeActions) {
				sourceCodeActions.setAutoPairParentheses(options.autoPairParentheses);
				sourceCodeActions.setAutoPairBraces(options.autoPairBraces);
				sourceCodeActions.setAutoPairSquareBrackets(options.autoPairSquareBrackets);
				sourceCodeActions.setAutoPairAngleBrackets(options.autoPairAngleBrackets);
				sourceCodeActions.setAutoPairQuotations(options.autoPairQuotations);
				sourceCodeActions.setAutoCompleteComments(options.autoCompleteComments);
				sourceCodeActions.setSmartIndentation(options.smartIndentation);
			}
		});
		
		var contents = options.contents;
		if (contents === undefined) {
			contents = getTextFromElement(parent); 
		}
		if (!contents) { contents=""; }
		
		editor.installTextView();
		editor.setLineNumberRulerVisible(options.showLinesRuler === undefined || options.showLinesRuler);
		editor.setAnnotationRulerVisible(options.showAnnotationRuler === undefined || options.showFoldingRuler);
		editor.setOverviewRulerVisible(options.showOverviewRuler === undefined || options.showOverviewRuler);
		editor.setFoldingRulerVisible(options.showFoldingRuler === undefined || options.showFoldingRuler);
		editor.setInput(options.title, null, contents, false, options.noFocus);
		
		syntaxHighlighter.highlight(options.contentType || options.lang, editor);
		if (contentAssist) {
			var cssContentAssistProvider = new mCSSContentAssist.CssContentAssistProvider();
			var htmlContentAssistProvider = new mHtmlContentAssist.HTMLContentAssistProvider();
			var jsTemplateContentAssistProvider = new mJSContentAssist.JSTemplateContentAssistProvider();
			contentAssist.addEventListener("Activating", function() { //$NON-NLS-0$
				if (/css$/.test(options.lang)) {
					contentAssist.setProviders([cssContentAssistProvider]);
				} else if (/js$/.test(options.lang)) {
					contentAssist.setProviders([jsTemplateContentAssistProvider]);
				} else if (/html$/.test(options.lang)) {
					contentAssist.setProviders([htmlContentAssistProvider]);
				}
			});
		}
		/* The minimum height of the editor is 50px */
		if (getHeight(parent) <= 50) {
			var height = editor.getTextView().computeSize().height;
			parent.style.height = height + "px"; //$NON-NLS-0$
		}
		return editor;
	}

	var editorNS = this.orion ? this.orion.editor : undefined;
	if (editorNS) {
		for (var i = 0; i < arguments.length; i++) {
			merge(editorNS, arguments[i]);	
		}
	}
	
	return edit;
});

var orion = this.orion || (this.orion = {});
var editor = orion.editor || (orion.editor = {});
editor.edit = require('orion/editor/edit');
