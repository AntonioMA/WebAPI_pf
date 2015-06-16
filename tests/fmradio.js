// mozFMRadio API tests (polyfilled!)
(function(window) {
  'use strict';

  window.Tests = window.Tests || {};

  function onChange(log, e) {
    log('onchangeproperty-received' + JSON.stringify(e));
  };

  function setHandlers(mozFMRadio, log) {
    var onChangeEvents = ['onenabled', 'onfrequencychange', 'ondisabled',
      'onantennaavailablechange'];

    onChangeEvents.forEach(eventType => {
      mozFMRadio[eventType] = onChange.bind(undefined, log);
    });
  };

  window.Tests['fmradio'] = {
    dependencies: [
      '/WebAPI_pf/polyfills/common/webapi_poly_common.js',
      '/WebAPI_pf/polyfills/fmradio/fmradio.js'
    ],

    runTest: function() {
      var log = window.Tests.log.bind(undefined, 'fmradio');
      var abort = window.Tests.abort;
      var _mozFMRadio = window.navigator.mozFMRadio ||
          abort('polyfill window.navigator.mozFMRadio not defined.');

      var properties = ['enabled', 'antennaAvailable', 'frequencyUpperBound',
       'frequencyLowerBound', 'channelWidth', 'frequency'];
      var frequencyTest = 87.5;

      var _resolve;
      var _reject;

      function seek(operation) {
        return new Promise((resolve, reject) => {
          var request = _mozFMRadio[operation]();

          request.onsuccess = function onsuccess() {
            log('Successfuly ' + operation + ' ' + JSON.stringify(this.result));
            resolve();
          };

          request.onerror = function onerror() {
            log(operation + '. Error: ' + this.error.name);
            reject();
          };
        });
      }

      function testEnable() {
        log('***** TESTING enable');
        return new Promise((resolve, reject) => {
          var request = _mozFMRadio.enable(frequencyTest);

          request.onsuccess = function onsuccess() {
            log('Successfuly enable ' + JSON.stringify(this.result));
            resolve(this.result);
          };

          request.onerror = function onerror() {
            log('enable. Error: ' + this.error.name);
            reject(this.error);
          };
        });
      }

      function testDisable() {
        log('***** TESTING disable');
        return new Promise((resolve, reject) => {
          var request = _mozFMRadio.disable();

          request.onsuccess = function onsuccess() {
            log('Successfuly disable ' + JSON.stringify(this.result));
            resolve();
          };

          request.onerror = function onerror() {
            log('disable. Error: ' + this.error.name);
            reject(this.error);
          };
        });
      }

      function testSeek() {
        log('***** TESTING seek');
        return new Promise((resolve, reject) => {
          seek('seekUp').then(seek.bind(undefined, 'seekDown')).then(() => {
            seek('seekUp');
            seek('cancelSeek').then(resolve).catch(error => {
              reject(error);
            });
          });
        });
      }

      function testSetFrequency() {
        log('***** TESTING setFrequency');
        return new Promise((resolve, reject) => {
          var request = _mozFMRadio.setFrequency(97.1);

          request.onsuccess = function onsuccess() {
            log('Successfuly setFrequency ' + JSON.stringify(this.result));
            resolve();
          };

          request.onerror = function onerror() {
            log('setFrequency. Error: ' + this.error.name);
            reject(this.error);
          };
        });
      }

      function testGetters() {
        return new Promise((resolve, reject) => {
          properties.forEach(property => {
            log('Get ' + property + ' Value: ' + _mozFMRadio[property]);
          });
          resolve();
        });
      }

      try {
        log('Starting fmradio polyfill tests');
        setHandlers(_mozFMRadio, log);

        testEnable().then(testSeek).then(testSetFrequency).
          then(testGetters).then(testDisable).catch(error => {
            log('Something went wrong ' + error);
          });
      } catch (e) {
        log("Finished early with " + e);
      }
    }
  };

})(window);
