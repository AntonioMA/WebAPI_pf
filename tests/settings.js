// mozSettings API tests (polyfilled!)
(function(window) {
  window.Tests = window.Tests || {};

  var dependencies = ['/WebAPI_pf/polyfills/common/webapi_poly_common.js',
                      '/WebAPI_pf/polyfills/settings/settings.js'];

  window.Tests['settings'] =
    LazyLoader.dependencyLoad(dependencies).then(() => {
      var log = window.Tests.log.bind(undefined, 'settings');
      return {
        runTest: function() {
          function abort(e) {
            throw e;
          }

          try {
            log('Starting settings polyfill tests');
            window.mozSettings || abort('window.mozSettings not defined.');

            log('window.mozSettings defined!');
            var lock = window.mozSettings.createLock();

            lock && log('We got a lock!') &&
              (lock.serialize && log('And it\'s fake!')) ||
              abort('And it\'s a real one... Done!');

            // Going to kill two stones with a bird. Or something... :P
            window.mozSettings.setObserver('i.am.a.setting', function(e) {
              log('Got a event for my setting: ' + JSON.stringify(e));
            });

            lock.set('i.am.a.setting', 'abcd1234').then(() => {
              log('Setting set! (hopefully)');
            });
            lock.get('i.am.a.setting').then(e => {
              log('Setting read! ' + JSON.stringify(e));
            });

          } catch (e) {
            log("Finished early with " + e);
          }

        }
      };
    });

})(window);
