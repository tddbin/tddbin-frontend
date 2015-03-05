1.1.1  2015-??-??
=================
- upgraded some dependencies (broke the build)
- ensure a breaking build doesn't get deployed
- write useful things on the index.html that gets shown when a broken site gets deployed
- updated README
- add links to twitter, github, trello and uxebu
- use the full screen height
- catch errors that might go to the console and show them in the result window
- use ES6 and compatible react with it, to be able to easier move forward using ES6

1.1.0  2015-02-22
=================
- add favicon
- enable ES6 for writing tests in tddbin, transpile it before executing tests
- move all tests to mocha+sinon
- use babel (used to be 6to5) for transpiling ES6

1.0.0  2015-02-20
=================
- move to browserify (remove webpack)
- make buildable
- use mocha from CDN (due to problem with browserifying mocha)
- create deploy that is triggered by travis after succeeding tests using gh-pages

0.0.2  2014-08-??
=================
- added ROADMAP.md and LICENSE
- make shortcut overlay work
- add badges (travis, codacy, etc.)
- when browser looses focus trigger hiding of shortcut overlay
- make (shortcuts) work in FF Nightly, IE 10 and FF under Linux

0.0.1  2014-08-06
=================
- added half-working jasmine test-runner
- added working mocha test-runner with jasmine-style assertion API (using referee)
- added behave.js style assertion API to mocha runner
- implement shortcut handling
- provide standalone tddbin example
- updated README
