# ???  2015-??-??

- [code] improve structure (poorly) basically around index.js
- [ui] upgrade ACE to show less warnings for ES6 features
- [ui] apply the new design (partly)
- [code] separate out react components, improve directory structure
- [code] remove react from the built file, much smaller JS file loaded in browser, and CDN used
- [code] minify build JS file
- [code] use myth CSS preprocessing, to allow some css future features
- [code] switch to JSCS for coding style checks, removed jsxcs since jscs has jsx built in now
- [code] switch to eslint and apply some rules that hopefully help the code to stay in better shape
- [code] add analytics
- [fix] show errors correctly in FF, closes #4

# 1.2.0  2015-03-26

- [feature] add basic jasmine support back in (just cleaning the results page is still broken)
  try http://tddbin.com/?test-runner=jasmine or for the mocha runner
  http://tddbin.com/?test-runner=mocha (mocha runner is default when nothing is given)
- [code] enable loading katas from http://katas.tddbin.com by building the URL, using a
  parameter `kata` http://tddbin.com/?kata=kataname (currently any name will always return the same kata)
  add your kata via a PR at https://github.com/tddbin/katas-service
- [feature] make a slow loading page not show the "oh, sorry" message  
- [feature] store code in localstorage, and allow to reset it with new button (thx Matthieu for PR #1)
- [feature] make ACE autocompletion work (load missing dependency) (use CTRL+Space for auto-completing)
- [feature] enable use of katas from http://katas.tddbin.com, using [xdomain]
- [feature] make app run offline too, without need for online connection (mainly interesting for 
  development) - use `npm run build-for-offline`
- [feature] kata loading and storing in localstorage flow implemented, so that a kata given in the URL
  always overrides what is currently in the editor, and the `?kata=...` is cleared from the URL after
  it was loaded
- [code] remove dependency on [ace-with-plugins] project, use pure ACE from vendor folder or CDN  
- [fix] [kata 10] threw `Can't find variable: Symbol` in browsers that have `Symbol` not yet defined, 
  [PR6] by [@tonovotny] fixed it

# 1.1.1  2015-03-05

- [code] upgraded some dependencies (broke the build)
- [build] ensure a breaking build doesn't get deployed
- [feature] write useful things on the index.html that gets shown when a broken site gets deployed
- [docs] updated README
- [ui] add links to twitter, github, trello and uxebu
- [feature] use the full screen height
- [feature] catch errors that might go to the console and show them in the result window
- [code] use ES6 and compatible react with it, to be able to easier move forward using ES6

# 1.1.0  2015-02-22

- [feature] add favicon
- [feature] enable ES6 for writing tests in tddbin, transpile it before executing tests
- [feature] move all tests to mocha+sinon
- [code] use babel (used to be 6to5) for transpiling ES6

# 1.0.0  2015-02-20

- [code] move to browserify (remove webpack)
- [code] make buildable
- [code] use mocha from CDN (due to problem with browserifying mocha)
- [build] create deploy that is triggered by travis after succeeding tests using gh-pages

# 0.0.2  2014-08-??

- [docs] added ROADMAP.md and LICENSE
- [ui] make shortcut overlay work
- [docs] add badges (travis, codacy, etc.)
- [feature] when browser looses focus trigger hiding of shortcut overlay
- [feature] make (shortcuts) work in FF Nightly, IE 10 and FF under Linux

# 0.0.1  2014-08-06

- added half-working jasmine test-runner
- added working mocha test-runner with jasmine-style assertion API (using referee)
- added behave.js style assertion API to mocha runner
- implement shortcut handling
- provide standalone tddbin example
- updated README

# Legend

[build] = changes in the build/deploy system  
[code] = changes, improvements in the source code, architecture, structure, etc.    
[docs] = change, improve documentation   
[feature] = features  
[ui] = user interaction related changes  
[fix] = a bug fix

[xdomain]: https://github.com/jpillora/xdomain
[kata 10]: http://tddbin.com/#?kata=es6/language/destructuring/array
[@tonovotny]: https://twitter.com/tonovotny
[PR6]: https://github.com/tddbin/tddbin-frontend/pull/6
[ace-with-plugins]: https://github.com/uxebu/ace-with-plugins 
