# 1.2.0  2015-??-??

- [ux] add basic jasmine support back in (just cleaning the results page is still broken)
  try http://tddbin.com/?test-runner=jasmine or for the mocha runner
  http://tddbin.com/?test-runner=mocha (mocha runner is default when nothing is given)
- [code] enable loading katas from http://katas.tddbin.com by building the URL, using a
  parameter `kata` http://tddbin.com/?kata=kataname (currently any name will always return the same kata)
  add your kata via a PR at https://github.com/tddbin/katas-service
- [ux] make a slow loading page not show the "oh, sorry" message  

# 1.1.1  2015-03-05

- [code] upgraded some dependencies (broke the build)
- [build] ensure a breaking build doesn't get deployed
- [ux] write useful things on the index.html that gets shown when a broken site gets deployed
- [docs] updated README
- [ui] add links to twitter, github, trello and uxebu
- [ux] use the full screen height
- [ux] catch errors that might go to the console and show them in the result window
- [code] use ES6 and compatible react with it, to be able to easier move forward using ES6

# 1.1.0  2015-02-22

- [ux] add favicon
- [ux] enable ES6 for writing tests in tddbin, transpile it before executing tests
- [ux] move all tests to mocha+sinon
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
- [ux] when browser looses focus trigger hiding of shortcut overlay
- [ux] make (shortcuts) work in FF Nightly, IE 10 and FF under Linux

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
[ux] = anything user experience related
[ui] = user interaction related changes
