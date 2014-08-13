/**
 * JavaScript client for Bayesian Bandit testing server.
 *
 * @name Bayesian Bandit JavaScript Client
 * @version 0.0.1
 */

;(function (global, undefined) {
  'use strict';

  var NAME = 'BayesianBandit',
      VERSION = '0.0.1';


  function Storage() {
    this.name = NAME + ':storage';

    this._read();
  }

  Storage.prototype.get = function (key) {
    return this._store[key];
  };

  Storage.prototype.set = function (key, value) {
    this._store[key] = value;

    this._write();
  };

  Storage.prototype.delete = function (key) {
    delete this._store[key];

    this._write();
  };

  Storage.prototype._read = function () {
    var data = global.localStorage.getItem(this.name);

    this._store = (data) ? JSON.parse(data) : {};
  };

  Storage.prototype._write = function () {
    global.localStorage.setItem(this.name, JSON.stringify(this._store));
  };


  global[NAME] = (function () {

    var globalServerUrl;

    function validate() {
      if (!globalServerUrl) {
        throw new Error('Client is not initialized (call #init first).');
      }
    }

    function ajax(method, url, data, callback) {
      var request = new XMLHttpRequest();

      data = (data) ? JSON.stringify(data) : null;

      request.open(method, url, true);
      request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

      request.onreadystatechange = function() {
        var response = {},
            data;

        if (this.readyState === 4) {
          response.status = this.status;

          try {
            data = JSON.parse(this.responseText);

            if (data) {
              response.data = data;
            }
          } catch (e) {}

          callback(response);
        }
      };

      request.send(data);
    }

    return {
      VERSION: VERSION,

      /**
       * Initialize client. Must be called before any other methods.
       *
       * @param {String} serverUrl
       */
      init: function (serverUrl) {
        if (globalServerUrl) {
          throw new Error('Client is already initialized.');
        }

        globalServerUrl = serverUrl;

        this._storage = new Storage();
      },

      /**
       * Participate in specific test by receiving a designated version.
       *
       * @param {String}   testId
       * @param {String[]} versionIds
       * @param {Function} callback Called with designated version id (`String`).
       */
      'try': function (testId, versionIds, callback) {
        var self = this,
            version;

        validate();

        version = this._storage.get(testId);

        // if we have version stored, is it still relevant?
        if (version && versionIds.indexOf(version.id) === -1) {
          this._storage.delete(testId);
          version = null;
        }

        if (version) {

          // return stored version
          callback(version.id);

        } else {

          // we do not have version stored or the stored one is no longer relevant -> ask server
          ajax('PUT', globalServerUrl + testId, { versions: versionIds }, function (response) {
            version = {
              id: null,
              won: false
            };

            // use server's designated version or fallback to random one
            if (response.status === 200) {
              version.id = response.data.winning;
            } else {
              version.id = versionIds[Math.floor(Math.random() * versionIds.length)];
            }

            self._storage.set(testId, version);

            callback(version.id);
          });

        }
      },

      /**
       * Register conversion in specific test.
       *
       * @param {String} testId
       */
      win: function (testId) {
        var self = this,
            version;

        validate();

        version = this._storage.get(testId);

        if (version && !version.won) {

          // report to server only those conversions which have not been reported yet
          ajax('POST', globalServerUrl + testId + '/wins', { version: version.id }, function (response) {
            if (response.status === 200) {
              version.won = true;
              self._storage.set(testId, version);
            }
          });

        }
      }
    };

  })();

})(window);
