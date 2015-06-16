(function(window) {
  var services = [];
  var servData;

  function installServices() {
    // Could get this from the href but not really worth the hassle
    var relPath = '/WebAPI_pf/services/';
    function installApp(i) {
      function installNextApp() {
        if (++i < services.length) {
          installApp(i);
        }
      }
      var origin = servData[services[i]].origin || document.location.origin;
      //console.log('Installing app: ' + i + ': ' + services[i]);
      console.log('Installing app: ' + i + ': ' + origin + relPath +
                  services[i] + '/manifest.webappservices[i]');
      navigator.mozApps.install(origin + relPath + services[i] +
                                '/manifest.webapp').
        then(installNextApp).catch(installNextApp);
    }
    installApp(0);
  }

  function installTests() {
    var origin = document.location.origin;
    // Could get this from the href but not really worth the hassle
    navigator.mozApps.install(origin + '/WebAPI_pf/tests/manifest.webapp');
  }

  // Testing purpose only!!!!
  window.addEventListener('load', function () {
    console.log('Getting service list.');
    var serviceListDiv = document.getElementById('service_list');
    var install = document.querySelector('#install');
    var tests = document.querySelector('#tests');
    tests.addEventListener('click', installTests);

    LazyLoader.getJSON('tests/test_list.json').then(tests => {
      servData = tests;
      var serv_list = document.getElementById('service_list');
      for(var serv in tests) {
        services.push(serv);
        window.DOMUtils.addText(serv_list, "Service: " + serv + ". " + JSON.stringify(tests[serv]));
        window.DOMUtils.createElementAt(serv_list, 'br');
      }
      install.addEventListener('click', installServices);
    }).catch(e => {
      console.error("Cannot get the service list, aborting! " + JSON.stringify(e));
    });

  });
})(window);
