(function () {
  'use strict';
  /**
   * Testing dependencies
   */
  var port, wsServer, attachWebsocketServer,
    http = require('http'),
    websocket = require('websocket-stream'),
    WebSocketServer = require('ws').Server,
    Connection = require('mqtt-connection'),
    wsAbstractClientTests = require('./abstract_client'),
    setImmediate = global.setImmediate || function (callback) {
      // works in node v0.8
      process.nextTick(callback);
    };

  /**
   * Testing options
   */
  port = 9999;

  /**
   * Test server
   */

  wsServer = http.createServer();

  attachWebsocketServer = function (server) {
    var wss = new WebSocketServer({server: server});

    wss.on('connection', function (ws) {
      var stream = websocket(ws),
        connection = new Connection(stream);

      server.emit('client', connection);
    });

    return server;
  };

  attachWebsocketServer(wsServer);

  wsServer.on('client', function (client) {
    client.on('connect', function (packet) {
      if (packet.clientId === 'invalid') {
        client.connack({returnCode: 2});
      } else {
        wsServer.emit('connect', client);
        client.connack({returnCode: 0});
      }
    });

    client.on('publish', function (packet) {
      setImmediate(function () {
        switch (packet.qos) {
          case 0:
            break;
          case 1:
            client.puback(packet);
            break;
          case 2:
            client.pubrec(packet);
            break;
        }
      });
    });

    client.on('pubrel', function (packet) {
      client.pubcomp(packet);
    });

    client.on('pubrec', function (packet) {
      client.pubrel(packet);
    });

    client.on('pubcomp', function (/*packet*/) {
      // Nothing to be done
    });

    client.on('subscribe', function (packet) {
      client.suback({
        messageId: packet.messageId,
        granted: packet.subscriptions.map(function (e) {
          return e.qos;
        })
      });
    });

    client.on('unsubscribe', function (packet) {
      client.unsuback(packet);
    });

    client.on('pingreq', function (/*packet*/) {
      client.pingresp();
    });
  }).listen(port);

  describe('Websocket Client', function () {
    var config = { protocol: 'ws', port: port };
    wsAbstractClientTests(wsServer, config);
  });
}());
