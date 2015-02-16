(function () {
  'use strict';
  var utilWrapper,
    through = require('through2'),
    setImmediate = global.setImmediate || function (callback) {
      setTimeout(callback, 0);
    };
  utilWrapper = (function () {
    var testStream;
    testStream = function () {
      return through(function (buf, enc, cb) {
        var that = this;
        setImmediate(function () {
          that.push(buf);
          cb();
        });
      });
    };
    return testStream;
  }());
  module.exports.testStream = utilWrapper;
}());