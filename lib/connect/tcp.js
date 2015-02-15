(function () {
  'use strict';
  var tcpWrapper,
    net = require('net');

  tcpWrapper = (function () {
    var buildBuilder;
    buildBuilder = function (client, opts) {
      opts.port     = opts.port || 1883;
      opts.hostname = opts.hostname || opts.host || 'localhost';

      var port = opts.port,
      host = opts.hostname;

      return net.createConnection(port, host);
    };
    return buildBuilder;

  }());
  module.exports = tcpWrapper;
}());
