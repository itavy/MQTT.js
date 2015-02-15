/**
 * Requires
 */
(function () {
  'use strict';
  var MqttServerWrapper, MqttSecureServerWrapper,
    net = require('net'),
    tls = require('tls'),
    util = require('util'),
    Connection = require('mqtt-connection');

  /**
   * MqttServer
   *
   * @param {Function} listener - fired on client connection
   */
  MqttServerWrapper = (function (_extend) {

    function MqttServer (listener) {
      var setupConnection,
        that = this;
      if (!(this instanceof MqttServer)) {
        return new MqttServer(listener);
      }

      setupConnection = function (duplex) {
        var connection = new Connection(duplex);
        that.emit('client', connection);
      };

      net.Server.call(this);

      this.on('connection', setupConnection);

      if (listener) {
        this.on('client', listener);
      }
      return that;
    }
    util.inherits(MqttServer, _extend);
    return MqttServer;
  }(net.Server));

  /**
   * MqttSecureServer
   *
   * @param {Object} opts - server options
   * @param {Function} listener
   */
  MqttSecureServerWrapper = (function (_extend) {

    function MqttSecureServer (opts, listener) {
      var setupConnection,
        that = this;

      if (!(this instanceof MqttSecureServer)) {
        return new MqttSecureServer(opts, listener);
      }

      setupConnection = function (duplex) {
        var connection = new Connection(duplex);
        that.emit('client', connection);
      };

      // new MqttSecureServer(function(){})
      if ('function' === typeof opts) {
        listener = opts;
        opts = {};
      }

      tls.Server.call(this, opts);

      if (listener) {
        this.on('client', listener);
      }

      this.on('secureConnection', setupConnection);

      return that;
    }
    util.inherits(MqttSecureServer, _extend);
    return MqttSecureServer;
  }(tls.Server));
  //util.inherits(MqttSecureServer, tls.Server);

  module.exports = {
    MqttServer: MqttServerWrapper,
    MqttSecureServer: MqttSecureServerWrapper
  };
}());
