(function(window) {
  'use strict';

  function debug(str) {
    console.log('-*-*- ServHelper: ' + str);
  }

  // This is a very basic sample app that uses a SW and acts as a server for
  // navigator.connect. I'm going to mark with a comment where the app MUST
  // add some extra code to use the navigator.connect POLYFILL
  // So if you just want to know that, search for:
  // ADDED FOR POLYFILL

  var ACCESS_CTRL_FILE = 'acl.json';

  function getACL(aUrl) {
    function aclPathFromURL(aUrl) {
      if (!aUrl) {
        debug('Trying to recover acl file from no url');
        return {};
      }
      // Error ctrl?
      var url = new URL(aUrl);
      var pathname = url.pathname;
      return pathname.substring(0, pathname.lastIndexOf('/') + 1);
    }

    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', aclPathFromURL(aUrl) + ACCESS_CTRL_FILE, true);
      xhr.responseType = 'json';

      xhr.onerror = function(error) {
        reject(error);
      };
      xhr.onload = function() {
        if (xhr.response !== null) {
          resolve(xhr.response);
        } else {
          reject(new Error('No valid JSON object was found (' +
			    xhr.status + ' ' + xhr.statusText + ')'));
        }
      };
      xhr.send();
    });
  };

  var register = function(evt) {
    debug('APP executing register...');
    var origin = document.location.origin;
    navigator.serviceWorker.
      register('/WebAPI_pf/services/sw.js', {scope: './'}).
      then(function(reg) {
        debug('APP Registration succeeded. Scope: ' + reg.scope);
        if (reg.installing) {
          debug('APP registration --> installing');
        } else if (reg.waiting) {
          debug('APP registration --> waiting');
        } else if (reg.active) {
          debug('APP registration --> active');
        }
      }).catch(function(error) {
        debug('APP Registration failed with ' + error);
      });
  };

  var unregister = function(evt) {
    debug('APP Unregister...');
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => {
        reg.unregister();
        debug('APP Unregister done');
      });
    });
  };

  // Circular objects will cause this to hang
  var cloneObject = function(obj, recursive) {
    if (typeof obj === 'string') {
      return obj;
    }
    var cloned = {};
    for (var key in obj) {
      if (Array.isArray(obj[key])) {
        cloned[key] = [];
        var dest = cloned[key];
        var source = obj[key];
        for (var i = 0, l = source.length; i < l; i++) {
          dest[i] = cloneObject(source[i], recursive);
        }
      } else if (typeof obj[key] === 'object') {
        cloned[key] = recursive && cloneObject(obj[key], recursive) || obj[key];
      } else if (typeof obj[key] !== 'function' || obj[key] === null) {
        cloned[key] = obj[key];
      }
    }
    return cloned;
  };

  if ('serviceWorker' in navigator) {
    window.ServiceHelper = {
      register: function(processSWRequest) {
        register();
        var aclPromise = getACL(document.location.href);
        Promise.all([aclPromise, navigator.serviceWorker.ready]).then(
          ([acl, sw]) => {
            // Let's pass the SW some way to talk to us...
            var mc = new MessageChannel();
            mc.port1.onmessage = processSWRequest.bind(this, acl, mc.port1);
            sw.active && sw.active.postMessage({'acl': acl}, [mc.port2]);
          }
        ).catch(error => debug('Error during register: ' + error));
      },
      unregister: unregister,
      cloneObject: cloneObject
    };
  } else {
    debug('APP navigator does not have ServiceWorker');
    return;
  }
})(window);
