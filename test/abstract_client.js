/*jshint expr: true*/
(function () {
  'use strict';
  var abstractClientWrapper,
    should        = require('should'),
    sinon         = require('sinon'),
    setImmediate  = global.setImmediate || function (callback) {
      // for node v0.8 support
      process.nextTick(callback);
    };
  abstractClientWrapper = (function () {
    var abstractClientTests,
      mqtt          = require('../');

    /**
     * Testing dependencies
     */
    abstractClientTests = function (server, config) {
      var tTopic = 'testTopic',
        tMessage = 'testMessage',
        connect;
      connect = function (opts) {
        opts = Object.keys(config).reduce(function (acc, key) {
          acc[key] = config[key];
          return acc;
        }, opts || {});

        if (!opts.mochaId) {
          opts.mochaId = config.mochaId;
        }

        return mqtt.connect(opts);
      };

      describe('closing', function () {
        it('should emit close if stream closes', function (done) {
          var client = connect();

          client.once('connect', function () {
            client.stream.end();
          });
          client.once('close', function () {
            client.end();
            done();
          });
        });

        it('should mark the client as disconnected', function (done) {
          var client = connect();

          client.once('close', function () {
            client.end();
            if (!client.connected) {
              done();
            } else {
              done(new Error('Not marked as disconnected'));
            }
          });
          client.once('connect', function () {
            client.stream.end();
          });
        });

        it('should stop ping timer if stream closes', function (done) {
          var client = connect();

          client.once('close', function () {
            should.not.exist(client.pingTimer);
            client.end();
            done();
          });

          client.once('connect', function () {
            should.exist(client.pingTimer);
            client.stream.end();
          });
        });

        it('should emit close after end called', function (done) {
          var client = connect();

          client.once('close', function () {
            done();
          });

          client.once('connect', function () {
            client.end();
          });

        });

        it('should stop ping timer after end called', function (done) {
          var client = connect();

          client.once('connect', function () {
            should.exist(client.pingTimer);
            client.end();
            should.not.exist(client.pingTimer);
            done();
          });

        });
      });

      describe('connecting', function () {

        it('should connect to the broker', function (done) {
          var client = connect();

          client.once('connect', function () {
            client.end();
            done();
          });
        });

        it('should send a default client id', function (done) {
          var client = connect();
          /*
            check if default client id is set ok on client and then
            compare with the one from the packet
          */
          client.options.clientId.should.match(/mqttjs.*/);

          server.once('client', function (serverClient) {
            serverClient.once('connect', function (packet) {
              packet.clientId.should.match(client.options.clientId);
              serverClient.disconnect();
              done();
            });
          });
        });

        it('should send be clean by default', function (done) {
          var client = connect();
          /*
            check if clean is set on client and then
            check if it was sent to server
          */
          client.options.clean.should.be.true;

          server.once('client', function (serverClient) {
            serverClient.once('connect', function (packet) {
              packet.clean.should.be.true;
              serverClient.disconnect();
              done();
            });
          });
        });

        it('should connect with the given client id', function (done) {
          var client = connect({clientId: 'testclient'});
          /*
            check if clientId is set on client and then
            check if it was sent to server
          */
          client.options.clientId.should.be.equal('testclient');

          server.once('client', function (serverClient) {
            serverClient.once('connect', function (packet) {
              packet.clientId.should.be.equal('testclient');
              serverClient.disconnect();
              done();
            });
          });
        });

        it('should connect with the client id and unclean state', function (done) {
          var client = connect({clientId: 'testclient', clean: false});

          /*
            check if clientId and clean are set on client and then
            check if they are sent to server
          */
          client.options.clientId.should.be.equal('testclient');
          client.options.clean.should.be.false;

          server.once('client', function (serverClient) {
            serverClient.once('connect', function (packet) {
              packet.clientId.should.be.equal('testclient');
              packet.clean.should.be.false;
              serverClient.disconnect();
              done();
            });
          });
        });

        it('should require a clientId with clean=false', function (done) {
          var fCleanFalse;
          fCleanFalse = function () {
            var client = connect({ clean: false });
            client.on('connect', function () {
              //dummy function
            });
          };
          should(fCleanFalse).throw('Missing clientId for unclean clients');
          /*(function () {
            var client = connect({ clean: false });
            client.on('connect', function () {
              //dummy function
            });
          }).should.throw('Missing clientId for unclean clients2');*/
          done();
        });

        it('should default to localhost', function (done) {
          var client = connect({clientId: 'testclient'});

          /*
            the check shall be made on client side
            and on server side call disconnect
            to be sure that it connected to localhost indeed
          */
          //console.log(client);
          // it seems that are different fields for mqtt and mqtts
          // in ws it seems it is not set so no check
          // TODO to be investigated
          switch (config.protocol) {
            case 'mqtts':
              client.options.host.should.be.equal('localhost');
              break;
            case 'mqtt':
              client.options.hostname.should.be.equal('localhost');
              break;
            default:
              //do nothing
              break;
          }

          server.once('client', function (serverClient) {
            serverClient.once('connect', function (packet) {
              packet.clientId.should.be.equal('testclient');
              serverClient.disconnect();
              done();
            });
          });
        });

        it('should emit connect', function (done) {
          var client = connect();
          client.once('connect', function () {
            client.end();
            done();
          });
          // if there is an error at connecting, this shall not pass
          //client.once('error', done);
        });

        it('should mark the client as connected', function (done) {
          var client = connect();
          client.once('connect', function () {
            client.connected.should.be.true;
            client.end();
            done();
          });
        });

        it('should emit error', function (done) {
          // check what error is throwing
          var client = connect({clientId: 'invalid'});
          client.once('connect', function () {
            throw new Error('invalid error');
          });
          client.once('error', function (error) {
            error.message.should.equal('Connection refused: Identifier rejected');
            client.end();
            done();
          });
        });

        it('should have different client ids', function () {
          var client1 = connect(),
            client2 = connect();

          client1.options.clientId.should.not.equal(client2.options.clientId);
          client1.end();
          client2.end();
        });
      });

      describe('offline messages', function () {
        it('should queue message until connected', function (done) {
          var client = connect();

          client.publish('test', 'test');
          client.subscribe('test');
          client.unsubscribe('test');
          client.queue.length.should.equal(3);

          client.once('connect', function () {
            client.queue.length.should.equal(0);
            client.end();
            done();
          });
        });

        if (!process.env.TRAVIS) {
          it('should queue message until connected', function (done) {
            var client = connect();

            client.subscribe('test');
            client.publish('test', 'test');
            client.queue.length.should.equal(2);

            client.on('queueEmpty', client.end.bind(client));

            server.once('client', function (serverClient) {
              serverClient.on('subscribe', function () {
                serverClient.on('publish', function (/*packet*/) {
                  done();
                });
              });
            });
          });

          it('should delay closing everything up until the queue is depleted', function (done) {
            var client = connect();

            server.once('client', function (serverClient) {
              serverClient.on('subscribe', function () {
                serverClient.on('publish', function (packet) {
                  serverClient.publish(packet);
                });
              });
            });

            client.once('message', function (t, m/*, packet*/) {
              /*
                check if it is correct message on the right topic
                future test TODO check for buffer and string message
              */
              t.should.be.equal(tTopic);
              m.toString().should.be.equal(tMessage);
              done();
            });

            client.subscribe(tTopic);
            client.publish(tTopic, tMessage);
            client.end();
          });

          it('should delay ending up until all inflight messages are delivered', function (done) {
            var client = connect();

            client.on('connect', function () {
              client.subscribe(tTopic, function () {
                done();
              });
              client.publish(tTopic, tMessage, function () {
                client.end();
              });
            });
          });

          it('wait QoS 1 publish messages', function (done) {
            var client = connect();

            client.on('connect', function () {
              client.subscribe(tTopic);
              client.publish(tTopic, tMessage, { qos: 1 }, function () {
                client.end();
              });
              client.on('message', function (t, m/*, packet*/) {
                t.should.be.equal(tTopic);
                m.toString().should.be.equal(tMessage);
                done();
              });
            });

            server.once('client', function (serverClient) {
              serverClient.on('subscribe', function () {
                serverClient.on('publish', function (packet) {
                  serverClient.publish(packet);
                });
              });
            });
          });
        }
      });

      describe('publishing', function () {
        it('should publish a message (offline)', function (done) {
          var client = connect();

          client.publish(tTopic, tMessage);

          server.once('client', function (serverClient) {
            serverClient.once('publish', function (packet) {
              packet.topic.should.equal(tTopic);
              packet.payload.toString().should.equal(tMessage);
              packet.qos.should.equal(0);
              packet.retain.should.equal(false);
              serverClient.disconnect();
              done();
            });
          });
        });

        it('should publish a message (online)', function (done) {
          var client = connect();

          client.on('connect', function () {
            client.publish(tTopic, tMessage);
          });

          server.once('client', function (serverClient) {
            serverClient.once('publish', function (packet) {
              packet.topic.should.equal(tTopic);
              packet.payload.toString().should.equal(tMessage);
              packet.qos.should.equal(0);
              packet.retain.should.equal(false);
              serverClient.disconnect();
              done();
            });
          });
        });

        it('should accept options', function (done) {
          var client = connect(),
            opts = {
              retain: true,
              qos: 1
            };

          client.once('connect', function () {
            client.publish(tTopic, tMessage, opts);
          });

          server.once('client', function (serverClient) {
            serverClient.once('publish', function (packet) {
              packet.topic.should.equal(tTopic);
              packet.payload.toString().should.equal(tMessage);
              packet.qos.should.equal(opts.qos, 'incorrect qos');
              packet.retain.should.equal(opts.retain, 'incorrect ret');
              serverClient.disconnect();
              done();
            });
          });
        });

        it('should fire a callback (qos 0)', function (done) {
          var client = connect();

          client.once('connect', function () {
            client.publish('a', 'b', function () {
              client.end();
              done();
            });
          });
        });

        it('should fire a callback (qos 1)', function (done) {
          var client = connect(),
            opts = {qos: 1};

          client.once('connect', function () {
            client.publish('a', 'b', opts, function () {
              client.end();
              done();
            });
          });
        });

        it('should fire a callback (qos 2)', function (done) {
          var client = connect(),
            opts = {qos: 2};

          client.once('connect', function () {
            client.publish('a', 'b', opts, function () {
              client.end();
              done();
            });
          });
        });

        it('should support UTF-8 characters in topic', function (done) {
          var client = connect();

          client.once('connect', function () {
            client.publish('中国', 'hello', function () {
              client.end();
              done();
            });
          });
        });

        it('should support UTF-8 characters in payload', function (done) {
          var client = connect();

          client.once('connect', function () {
            client.publish('hello', '中国', function () {
              client.end();
              done();
            });
          });
        });
      });

      describe('unsubscribing', function () {
        it('should send an unsubscribe packet (offline)', function (done) {
          var client = connect();

          client.unsubscribe(tTopic);

          server.once('client', function (serverClient) {
            serverClient.once('unsubscribe', function (packet) {
              packet.unsubscriptions.should.containEql(tTopic);
              serverClient.disconnect();
              done();
            });
          });
        });

        it('should send an unsubscribe packet', function (done) {
          var client = connect();

          client.once('connect', function () {
            client.unsubscribe(tTopic);
          });

          server.once('client', function (serverClient) {
            serverClient.once('unsubscribe', function (packet) {
              packet.unsubscriptions.should.containEql(tTopic);
              serverClient.disconnect();
              done();
            });
          });
        });

        it('should accept an array of unsubs', function (done) {
          var client = connect(),
            topics = ['topic1', 'topic2'];

          client.once('connect', function () {
            client.unsubscribe(topics);
          });

          server.once('client', function (serverClient) {
            serverClient.once('unsubscribe', function (packet) {
              packet.unsubscriptions.should.eql(topics);
              serverClient.disconnect();
              done();
            });
          });
        });

        it('should fire a callback on unsuback', function (done) {
          var client = connect();

          client.once('connect', function () {
            client.unsubscribe(tTopic, function () {
              client.end();
              done();
            });
          });

          server.once('client', function (serverClient) {
            serverClient.once('unsubscribe', function (packet) {
              serverClient.unsuback(packet);
            });
          });
        });

        it('should unsubscribe from a chinese topic', function (done) {
          var client = connect(),
            topic = '中国';

          client.once('connect', function () {
            client.unsubscribe(topic);
          });

          server.once('client', function (serverClient) {
            serverClient.once('unsubscribe', function (packet) {
              packet.unsubscriptions.should.containEql(topic);
              serverClient.disconnect();
              done();
            });
          });
        });
      });

      describe('keepalive', function () {
        var clock;

        beforeEach(function () {
          clock = sinon.useFakeTimers();
        });

        afterEach(function () {
          clock.restore();
        });

        it('should checkPing at keepalive interval', function (done) {
          var interval = 3,
          client = connect({keepalive: interval});

          client._checkPing = sinon.spy();

          client.once('connect', function () {

            clock.tick(interval * 1000);
            client._checkPing.callCount.should.equal(1);

            clock.tick(interval * 1000);
            client._checkPing.callCount.should.equal(2);

            clock.tick(interval * 1000);
            client._checkPing.callCount.should.equal(3);

            client.end();
            done();
          });
        });
      });

      describe('pinging', function () {

        it('should set a ping timer', function (done) {
          var client = connect({keepalive: 3});
          client.once('connect', function () {
            should.exist(client.pingTimer);
            client.end();
            done();
          });
        });
        it('should not set a ping timer keepalive=0', function (done) {
          var client = connect({keepalive:0});
          client.on('connect', function () {
            should.not.exist(client.pingTimer);
            client.end();
            done();
          });
        });
        it('should reconnect if pingresp is not sent', function (done) {
          var client = connect({keepalive:1, reconnectPeriod: 50});

          // Fake no pingresp being send by stubbing the _handlePingresp function
          client._handlePingresp = function () {};

          client.once('connect', function () {
            client.once('connect', function () {
              client.end();
              done();
            });
          });
        });
        it('should not reconnect if pingresp is successful', function (done) {
          var notClosedByEndTest = true,
            client = connect({keepalive:100});
          client.once('close', function () {
            if (notClosedByEndTest) {
              done(new Error('Client closed connection'));
            }
          });
          setTimeout(function () {
            notClosedByEndTest = false;
            client.end();
            done();
          }, 1000);
        });
      });

      describe('subscribing', function () {
        it('should send a subscribe message (offline)', function (done) {
          var client = connect();

          client.subscribe(tTopic);

          server.once('client', function (serverClient) {
            serverClient.once('subscribe', function (packet) {
              if (packet.subscriptions[0]){
                packet.subscriptions[0].should.eql({
                  topic: tTopic,
                  qos:0
                });
                serverClient.disconnect();
                done();
              }
            });
          });
        });

        it('should send a subscribe message', function (done) {
          var client = connect();

          client.once('connect', function () {
            client.subscribe(tTopic);
          });

          server.once('client', function (serverClient) {
            serverClient.once('subscribe', function (packet) {
              packet.subscriptions.should.containEql({
                topic: tTopic,
                qos: 0
              });
              serverClient.disconnect();
              done();
            });
          });
        });

        it('should accept an array of subscriptions', function (done) {
          var client = connect(),
            subs = ['test1', 'test2'];

          client.once('connect', function (/*args*/) {
            client.subscribe(subs);
          });

          server.once('client', function (serverClient) {
            serverClient.once('subscribe', function (packet) {
              // i.e. [{topic: 'a', qos: 0}, {topic: 'b', qos: 0}]
              var expected = subs.map(function (i) {
                return {topic: i, qos: 0};
              });

              packet.subscriptions.should.eql(expected);
              serverClient.disconnect();
              done();
            });
          });
        });

        it('should accept an hash of subscriptions', function (done) {
          var client = connect(),
            topics = {'test1': 0, 'test2': 1};

          client.once('connect', function () {
            client.subscribe(topics);
          });

          server.once('client', function (serverClient) {
            serverClient.once('subscribe', function (packet) {
              var k,
                expected = [];

              for (k in topics) {
                if (topics.hasOwnProperty(k)) {
                  expected.push({
                    topic: k,
                    qos: topics[k]
                  });
                }
              }

              packet.subscriptions.should.eql(expected);
              serverClient.disconnect();
              done();
            });
          });
        });

        it('should accept an options parameter', function (done) {
          var client = connect(),
            opts = {qos: 1};
          client.once('connect', function (/*args*/) {
            client.subscribe(tTopic, opts);
          });

          server.once('client', function (serverClient) {
            serverClient.once('subscribe', function (packet) {
              var expected = [{topic: tTopic, qos: 1}];

              packet.subscriptions.should.eql(expected);
              serverClient.disconnect();
              done();
            });
          });
        });

        it('should fire a callback on suback', function (done) {
          var client = connect();
          client.once('connect', function (/*args*/) {
            client.subscribe(tTopic, {qos:2}, function (err, granted) {
              if (err) {
                done(err);
              } else {
                should.exist(granted, 'granted not given');
                granted.should.containEql({topic: tTopic, qos: 2});
                client.end();
                done();
              }
            });
          });
        });

        it('should subscribe with a chinese topic', function (done) {
          var client = connect(),
            topic = '中国';

          client.once('connect', function () {
            client.subscribe(topic);
          });

          server.once('client', function (serverClient) {
            serverClient.once('subscribe', function (packet) {
              packet.subscriptions.should.containEql({
                topic: topic,
                qos: 0
              });
              serverClient.disconnect();
              done();
            });
          });
        });
      });

      describe('receiving messages', function () {
        it('should fire the message event', function (done) {
          var client = connect(),
            testPacket = {
              topic: 'test',
              payload: 'message',
              retain: true,
              qos: 1,
              messageId: 5
            };

          client.subscribe(testPacket.topic);
          client.once('message',
              function (topic, message, packet) {
            topic.should.equal(testPacket.topic);
            message.toString().should.equal(testPacket.payload);
            packet.should.equal(packet);
            client.end();
            done();
          });

          server.once('client', function (serverClient) {
            serverClient.on('subscribe', function (/*packet*/) {
              serverClient.publish(testPacket);
            });
          });
        });

        it('should support binary data', function (done) {
          var client = connect({ encoding: 'binary' }),
            testPacket = {
              topic: 'test',
              payload: 'message',
              retain: true,
              qos: 1,
              messageId: 5
            };

          client.subscribe(testPacket.topic);
          client.once('message', function (topic, message, packet) {
            topic.should.equal(testPacket.topic);
            message.should.be.an.instanceOf(Buffer);
            message.toString().should.equal(testPacket.payload);
            packet.should.equal(packet);
            client.end();
            done();
          });

          server.once('client', function (serverClient) {
            serverClient.on('subscribe', function (/*packet*/) {
              serverClient.publish(testPacket);
            });
          });
        });

        it('should emit a message event (qos=2)', function (done) {
          var client = connect(),
            testPacket = {
              topic: 'test',
              payload: 'message',
              retain: true,
              qos: 2,
              messageId: 5
            };

          server.testPublish = testPacket;

          client.subscribe(testPacket.topic);
          client.once('message', function (topic, message, packet) {
            topic.should.equal(testPacket.topic);
            message.toString().should.equal(testPacket.payload);
            packet.should.equal(packet);
            client.end();
            done();
          });

          server.once('client', function (serverClient) {
            serverClient.on('subscribe', function (/*packet*/) {
              serverClient.publish(testPacket);
            });
          });
        });

        it('should emit a message event (qos=2) - repeated publish', function (done) {
          var client = connect(),
            testPacket = {
              topic: 'test',
              payload: 'message',
              retain: true,
              qos: 2,
              messageId: 5
            };

          server.testPublish = testPacket;

          client.subscribe(testPacket.topic);
          client.on('message', function (topic, message, packet) {
            topic.should.equal(testPacket.topic);
            message.toString().should.equal(testPacket.payload);
            packet.should.equal(packet);
            client.end();
            done();
          });

          server.once('client', function (serverClient) {
            serverClient.on('subscribe', function (/*packet*/) {
              serverClient.publish(testPacket);
              // twice, should be ignored
              serverClient.publish(testPacket);
            });
          });
        });

        it('should support chinese topic', function (done) {
          var client = connect({ encoding: 'binary' }),
            testPacket = {
              topic: '国',
              payload: 'message',
              retain: true,
              qos: 1,
              messageId: 5
            };

          client.subscribe(testPacket.topic);
          client.once('message', function (topic, message, packet) {
              topic.should.equal(testPacket.topic);
              message.should.be.an.instanceOf(Buffer);
              message.toString().should.equal(testPacket.payload);
              packet.should.equal(packet);
              client.end();
              done();
            });

          server.once('client', function (serverClient) {
            serverClient.on('subscribe', function (/*packet*/) {
              serverClient.publish(testPacket);
            });
          });
        });
      });

      describe('qos handling', function () {

        it('should follow qos 0 semantics (trivial)', function (done) {
          var client = connect();

          client.once('connect', function () {
            client.subscribe(tTopic, {qos: 0});
          });

          client.on('message', function (t, m, packet) {
            t.should.be.equal(tTopic);
            m.toString().should.be.equal(tMessage);
            packet.qos.should.be.equal(0);
            client.end();
            done();
          });

          server.once('client', function (serverClient) {
            serverClient.once('subscribe', function (/*packet*/) {
              serverClient.publish({
                topic: tTopic,
                payload: tMessage,
                qos: 0,
                retain: false
              });
            });
          });
        });

        it('should follow qos 1 semantics', function (done) {
          var client = connect(),
            mid = 50;

          client.once('connect', function (/*args*/) {
            client.subscribe(tTopic, {qos: 1});
          });

          client.on('message', function (t, m, packet) {
            t.should.be.equal(tTopic);
            m.toString().should.be.equal(tMessage);
            packet.qos.should.be.equal(1);
            packet.messageId.should.be.equal(mid);
          });

          server.once('client', function (serverClient) {
            serverClient.once('subscribe', function (/*packet*/) {
              serverClient.publish({
                topic: tTopic,
                payload: tMessage,
                messageId: mid,
                qos: 1
              });
            });

            serverClient.once('puback', function (packet) {
              packet.messageId.should.equal(mid);
              serverClient.disconnect();
              done();
            });
          });
        });

        it('should follow qos 2 semantics', function (done) {
          var client = connect(),
            mid = 253;

          client.once('connect', function () {
            client.subscribe(tTopic, {qos: 2});
          });

          client.on('message', function (t, m, packet) {
            t.should.be.equal(tTopic);
            m.toString().should.be.equal(tMessage);
            packet.qos.should.be.equal(2);
            packet.messageId.should.be.equal(mid);
          });

          server.once('client', function (serverClient) {
            serverClient.once('subscribe', function (/*packet*/) {
              serverClient.publish({
                topic: tTopic,
                payload: tMessage,
                qos: 2,
                messageId: mid
              });
            });
            serverClient.once('pubcomp', function (packet) {
              packet.messageId.should.equal(mid);
              serverClient.disconnect();
              done();
            });
          });
        });
      });

      describe('auto reconnect', function () {
        it('should mark the client disconnecting if #end called', function () {
          var client = connect();

          client.end();
          client.disconnecting.should.eql(true);
        });

        it('should reconnect after stream disconnect', function (done) {
          var client = connect(),
            tryReconnect = true;

          client.on('connect', function () {
            if (tryReconnect) {
              tryReconnect = false;
              client.stream.end();
            } else {
              //extra close to cleanup the client
              client.end();
              done();
            }
          });
        });

        it('should emit \'reconnect\' when reconnecting', function (done) {
          var client = connect(),
            tryReconnect = true,
            reconnectEvent = false;

          client.on('reconnect', function () {
            reconnectEvent = true;
          });

          client.on('connect', function () {
            if (tryReconnect) {
              tryReconnect = false;
              client.stream.end();
            } else {
              reconnectEvent.should.equal(true);
              //extra close to cleanup the client
              client.end();
              done();
            }
          });
        });

        it('should emit \'offline\' after going offline', function (done) {
          var client = connect(),
            tryReconnect = true,
            offlineEvent = false;

          client.on('offline', function () {
            offlineEvent = true;
          });

          client.on('connect', function () {
            if (tryReconnect) {
              tryReconnect = false;
              client.stream.end();
            } else {
              offlineEvent.should.equal(true);
              //extra close to cleanup the client
              client.end();
              done();
            }
          });
        });

        it('should not reconnect if it was ended by the user', function (done) {
          var client = connect();

          client.on('connect', function () {
            client.end();
            done(); // it will raise an exception if called two times
          });
        });

        it('should setup a reconnect timer on disconnect', function (done) {
          var client = connect();

          client.once('connect', function () {
            should.not.exist(client.reconnectTimer);
            client.stream.end();
          });

          client.once('close', function () {
            should.exist(client.reconnectTimer);
            done();
          });
        });

        it('should allow specification of a reconnect period', function (done) {
          var end,
            period = 200,
            client = connect({reconnectPeriod: period}),
            reconnect = false,
            start = Date.now();

          client.on('connect', function () {
            if (!reconnect) {
              reconnect = true;
              client.stream.end();
            } else {
              client.end();
              end = Date.now();
              if (end - start >= period) {
                //extra close to cleanup the client
                client.end();
                // Connected in about 2 seconds, that's good enough
                done();
              } else {
                done(new Error('Strange reconnect period'));
              }
            }
          });
        });

        it('should resend in-flight QoS 1 publish messages from the client', function (done) {
          var client = connect({reconnectPeriod: 200});
            //reconnect = false;

          server.once('client', function (serverClient) {
            serverClient.on('connect', function () {
              setImmediate(function () {
                serverClient.stream.destroy();
              });
            });

            server.once('client', function (serverClient) {
              serverClient.on('publish', function () {
                serverClient.disconnect();
                done();
              });
            });
          });

          client.publish('hello', 'world', { qos: 1 });
        });

        it('should resend in-flight QoS 2 publish messages from the client', function (done) {
          var client = connect({reconnectPeriod: 200});
            //, reconnect = false;

          server.once('client', function (serverClient) {
            serverClient.on('publish', function () {
              setImmediate(function () {
                serverClient.stream.destroy();
              });
            });

            server.once('client', function (serverClient) {
              serverClient.on('pubrel', function () {
                serverClient.disconnect();
                done();
              });
            });
          });

          client.publish('hello', 'world', { qos: 2 });
        });
      });
    };
    return abstractClientTests;
  }());
  module.exports = abstractClientWrapper;
}());
