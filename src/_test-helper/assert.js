'use strict';

import './sinon-cleanup';

import nodeAssert from 'assert';
import sinon from 'sinon';

export var assert = {};
for (var key in nodeAssert) {
  assert[key] = nodeAssert[key];
}
for (var key in sinon.assert) {
  assert[key] = sinon.assert[key];
}
