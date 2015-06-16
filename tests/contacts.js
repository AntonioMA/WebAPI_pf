// mozContacts API tests (polyfilled!)
(function(window) {
  window.Tests = window.Tests || {};

  window.Tests['contacts'] = {
    dependencies: [
      '/WebAPI_pf/polyfills/common/webapi_poly_common.js',
      '/WebAPI_pf/polyfills/contacts/contacts.js'
    ],

    runTest: function() {
      var log = window.Tests.log.bind(undefined, 'contacts');
      var abort = window.Tests.abort;
      var _mozContacts = window.navigator.mozContacts ||
          abort('polyfill window.navigator.mozContacts not defined.');

      function saveTestContact() {
        return new Promise((resolve, reject) => {
          var saveRequest = _mozContacts.save(new mozContact({
            givenName: ['Test']
          }));

          saveRequest.onsuccess = function onsuccess() {
            log('Successfuly save ' + JSON.stringify(this.result));
            resolve();
          };

          saveRequest.onerror = function onerror() {
            var msg = 'save. Error: ' + this.error.name;
            log(msg);
            reject();
          };
        });
      }

      function findTestContact() {
        var options = {
          filterValue : "Test",
          filterBy    : ["givenName"],
          filterOp    : "equals"
        };

        return new Promise((resolve, reject) => {
          var request = _mozContacts.find(options);

          request.onsuccess = function onsuccess() {
            log('Successfuly find ' + JSON.stringify(this.result));
            resolve(this.result);
          };

          request.onerror = function onerror() {
            var msg = 'find. Error: ' + this.error.name;
            log(msg);
            reject();
          };
        });
      }

      function testGetCount() {
        log('***** TESTING getCount');
        var request = _mozContacts.getCount();

        request.onsuccess = function onsuccess() {
          log('Successfuly getCount ' + JSON.stringify(this.result));
        };

        request.onerror = function onerror() {
          var msg = 'getCount. Error: ' + this.error.name;
          log(msg);
        };
      }

      function testGetAll() {
        log('***** TESTING getAll');
        var cursor;
        try {
          cursor = _mozContacts.getAll();
        } catch (e) {
          log('Exception retrieving contacts ' + JSON.stringify(e));
        }

        cursor.onsuccess = function onsuccess() {
          log("testGetAll.cursor.onsuccess: " + this.done + ", " +
              JSON.stringify(this.result));
          if (!this.done) {
            this.continue();
          } else {
            log("testGetAll: All done!");
          }
        };
        cursor.onerror = function onerror() {
          var msg = 'getAll. Error: ' + this.error.name;
          log(msg);
        };
      }

      function testFind() {
        log('***** TESTING find');
        saveTestContact().then(() => {
          findTestContact();
        });
      }

      function testClear() {
        log('***** TESTING clear');
        var request = _mozContacts.clear();

        request.onsuccess = function onsuccess() {
          log('Successfuly clear ' + JSON.stringify(this.result));
        };

        request.onerror = function onerror() {
          var msg = 'clear. Error: ' + this.error.name;
          log(msg);
        };
      }

      function testSave() {
        log('***** TESTING save');
        saveTestContact();
      }

      function testGetRevision() {
        log('***** TESTING getRevision');
        var request = _mozContacts.getRevision();

        request.onsuccess = function onsuccess() {
          log('Successfuly getRevision ' + JSON.stringify(this.result));
        };

        request.onerror = function onerror() {
          var msg = 'getRevision. Error: ' + this.error.name;
          log(msg);
        };
      }

      function testRemove() {
        log('***** TESTING remove');
        saveTestContact().then(() => {
          findTestContact().then(result => {
            var contact = result[0];
            var request = _mozContacts.remove(contact);

            request.onsuccess = function onsuccess() {
              log('Successfuly remove ' + JSON.stringify(this.result));
            };

            request.onerror = function onerror() {
              var msg = 'remove. Error: ' + this.error.name;
              log(msg);
            };
          });
        });
      }

      try {
        log('Starting contacts polyfill tests');
        testGetCount();
        testGetAll();
        testFind();
        testClear();
        testSave();
        testGetRevision();
        testRemove();
      } catch (e) {
        log("Finished early with " + e);
      }
    }
  };

})(window);
