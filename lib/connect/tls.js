(function () {
  'use strict';
  var tlsWrapper,
    tls = require('tls');

  tlsWrapper = (function () {
    var buildBuilder;

    buildBuilder = function (mqttClient, opts) {
      var connection, handleTLSerrors;
      opts.port     = opts.port || 8883;
      opts.host     = opts.hostname || opts.host || 'localhost';

      opts.rejectUnauthorized = opts.rejectUnauthorized !== false;
      /*if (opts.protocol) {
        console.log(opts.protocol);
      }*/

      connection = tls.connect(opts);

      connection.on('secureConnect', function () {
        if (opts.rejectUnauthorized && !connection.authorized) {
          connection.emit('error', new Error('TLS not authorized'));
        } else {
          connection.removeListener('error', handleTLSerrors);
        }
      });

      handleTLSerrors = function (err) {
        // How can I get verify this error is a tls error?
        if (opts.rejectUnauthorized) {
          mqttClient.emit('error', err);
        }

        // close this connection to match the behaviour of net
        // otherwise all we get is an error from the connection
        // and close event doesn't fire. This is a work around
        // to enable the reconnect code to work the same as with
        // net.createConnection
        connection.end();
      };

      connection.on('error', handleTLSerrors);

      return connection;
    };
    return buildBuilder;
  }());

  module.exports = tlsWrapper;
}());