
var tls = require("tls");
var fs = require('fs');

function checkCert(element) {
  var retBuff;
  if (!(element instanceof Buffer)) {
    if ('string' === typeof element) {
      retBuff = fs.readFileSync(element);
    } else {
      retBuff = null;
    }
  } else {
    retBuff = element;
  }
  return retBuff;
}

function buildBuilder(mqttClient, opts) {
  var kCA;
  opts.port     = opts.port || 8883;
  opts.host     = opts.hostname || opts.host || 'localhost';

  if (opts.cert) {
    opts.cert = checkCert(opts.cert);
    if (!opts.cert) {
      throw new Error("Certificate must be a string or an instance of a buffer");
    }
  }

  if (opts.key) {
    opts.key = checkCert(opts.key);
    if (!opts.key) {
      throw new Error("Key must be a string or an instance of a buffer");
    }
  }

  if (opts.ca) {
    if ('[object Array]' === Object.prototype.toString.call(opts.ca)) {
      for (kCA = 0; kCA < opts.ca.length; kCA += 1) {
        opts.ca[kCA] = checkCert(opts.ca[kCA]);
        if (!opts.ca[kCA]) {
          throw new Error("CA must be a string or an instance of a buffer; position" + kCA);
        }
      }
    } else {
      throw new Error("Wrong format for CA option");
    }
  }

  opts.rejectUnauthorized = !(opts.rejectUnauthorized === false);

  var connection = tls.connect(opts)

  connection.on('secureConnect', function() {
    if (opts.rejectUnauthorized && !connection.authorized) {
      connection.emit('error', new Error('TLS not authorized'));
    } else {
      connection.removeListener('error', handleTLSerrors)
    }
  });

  function handleTLSerrors(err) {
    // How can I get verify this error is a tls error?
    if (opts.rejectUnauthorized) {
      mqttClient.emit('error', err)
    }

    // close this connection to match the behaviour of net
    // otherwise all we get is an error from the connection
    // and close event doesn't fire. This is a work around
    // to enable the reconnect code to work the same as with
    // net.createConnection
    connection.end();
  }

  connection.on('error', handleTLSerrors)

  return connection;
}

module.exports = buildBuilder;

