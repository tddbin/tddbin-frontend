'use strict';

require('./sinon-cleanup');

var nodeAssert = require('assert');
var sinon = require('sinon');

var assert = {};
for (var key in nodeAssert) {
  assert[key] = nodeAssert[key];
}
for (var key in sinon.assert) {
  assert[key] = sinon.assert[key];
}

module.exports = assert;
