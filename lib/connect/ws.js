/*jshint browser: true*/
(function () {
  'use strict';
  var wsWrapper,
    websocket = require('websocket-stream'),
    URL = require('url');

  wsWrapper = (function () {
    var buildBuilder;
    if (process.title !== 'browser') {
      //define buildBuilder for browser
      buildBuilder = function (client, opts) {
        var host = opts.hostname || 'localhost',
          port = opts.port || 80,
          url = opts.protocol + '://' + host + ':' + port,
          ws =  websocket(url, {
            protocol: 'mqttv3.1'
          });
        return ws;
      };
    } else {
      buildBuilder = function (mqttClient, opts) {
        var host, port, url,
          parsed = URL.parse(document.URL);

        if (!opts.protocol) {
          if (parsed.protocol === 'https:') {
            opts.protocol = 'wss';
          } else {
            opts.protocol = 'ws';
          }
        }

        if (!opts.host) {
          opts.host = parsed.hostname;
        }

        if (!opts.port) {
          opts.port = parsed.port;
        }

        host = opts.hostname || opts.host;
        port = opts.port;
        url = opts.protocol + '://' + host + ':' + opts.port;

        return websocket(url);
      };
    }
    return buildBuilder;
  }());

  module.exports = wsWrapper;
}());