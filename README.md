[![Build Status](https://travis-ci.org/uxebu/tddbin-frontend.svg)](https://travis-ci.org/uxebu/tddbin-frontend)

# TDDbin frontend

This project contains all the UI stuff for TDDbin, it should be runnable separately
without any backend and aims to provide all components modularly.

# Test runners

The execution of tests takes place in a separate component, which can be hooked in
where needed.
This way adding a new test runner (e.g. qunit, tap, etc.) will be easy as long as it
complies to the API that a test runner has to provide.

## Jasmine Runner
It is in this repo, but is not finished.
Due to jasmine's stubborn architecture that doesn't allow to reinstanciate it for a new test run
as it would be needed for a single page app I just left it ... it's basically unusable :(.
To try what it currently can do run the examples/test-runner/jasmine.html in your browser.

## Mocha Runner
The mocha runner is integrated and will most probably become the default runner.
For an example navigate in your browser to the examples/test-runner directory.

### Assertion APIs
Mocha is assertion API agnostic, it brings it's own assert() function by default, that can be used.
By adding plugins various other styles can be provided. See below which ones come with it.
 
#### Jasmine-style
It is enhanced with [referee](https://github.com/busterjs/referee), which provides jasmine-style expect methods.
The tests can be written the same way as with jasmine (for the biggest part) - at least
all standard matchers are available, for details see [the docs](http://docs.busterjs.org/en/latest/modules/referee/#expectations).

#### Should-style
Also should-style assertions can be used. Thanks to [Roman Liutikov](https://twitter.com/roman01la/status/496720629555798016)
pointing that out, it was added. On how to use them see the [should.js documentation](https://github.com/visionmedia/should.js#assertions).

## Custom runner
This architecture allows to add any kind of runner now.
The easiest way for now is to duplicate the mocha runner and the example
and get one up and file it as a pull request.
