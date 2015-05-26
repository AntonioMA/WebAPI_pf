// mozSettings API tests (polyfilled!)
(function(window) {
  window.Tests = window.Tests || {};

  window.Tests['systemxhr'] = {
    dependencies: [
      '/WebAPI_pf/polyfills/common/webapi_poly_common.js',
      '/WebAPI_pf/polyfills/systemxhr/systemxhr.js'
    ],

    runTest: function() {
      var log = window.Tests.log.bind(undefined, 'systemxhr');
      var abort = window.Tests.abort;

      try {
        log('Starting systemXHR polyfill tests');
        var newXHR = new XMLHttpRequest({ mozSystem: true });
        newXHR._updateXMLHttpRequestObject ||
          abort('polyfill window.XMLHttpRequest not defined.');

        log('polyfill window.XMLHttpRequest defined!');

        newXHR.onreadystatechange = evt => console.info(evt);
        newXHR.open('get',
                    'http://antonioma.github.io/WebAPI_pf/tests/test_list.json',
                    true);
        newXHR.send();

        newXHR.onload = function() {
          log('Throw onload');
          if (newXHR.status === 200) {
            if (newXHR.response)
              log ('We got a response: ' + JSON.stringify(newXHR.response));
              if (Object.keys(JSON.parse(newXHR.response)).length > 0) {
                log('And it has data');
              } else {
                log('but it has not data');
              }
          } else {
            log('XHR error. ' + newXHR.statusText);
          }
        };

      } catch (e) {
        log("Finished early with " + e);
      }
    }
  };

})(window);
