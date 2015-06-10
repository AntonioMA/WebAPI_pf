(function(window) {
  'use strict';

  function debug(str) {
    console.log('SystemXHRService -*-:' + str);
  }

  // Ok, this kinda sucks because most APIs (and settings is one of them) cannot
  // be accessed from outside the main thread. So basically everything has to go
  // down to the SW thread, then back up here for processing, then back down to
  // be sent to the client. Yay us!
  var _XMLHttpRequests = {};
  var _listeners = {};
  var _lastOpenRequest = null;
  var _currentOperations = 0;
  var _clearCurrentOperationsId = null;

  function buildDOMRequestAnswer(channel, request) {
    debug('Building call --> ' + JSON.stringify(request));
    var remotePortId = request.remotePortId;
    var reqId = request.remoteData.id;
    var requestOp = request.remoteData.data;
    _XMLHttpRequests[reqId] = new XMLHttpRequest(requestOp.options);
    // Let's assume this works always...
    channel.postMessage({remotePortId: remotePortId, data: {id: reqId}});
  }

  function executeOperation(operation, channel, request) {
    // Params for the local operation:
    var opData = request.remoteData.data.params || [];
    var xhrId = request.remoteData.data.xhrId;
    if (operation === 'open' && opData[2] === null ||
        typeof opData[2] === 'undefined') {
        opData[2] = true;
    }
    _XMLHttpRequests[xhrId][operation](...opData);
  }

  function setHandler(eventType, channel, request) {
    var remotePortId = request.remotePortId;
    var reqId = request.remoteData.id;
    var xhrId = request.remoteData.data.xhrId;

    function _buildResponseHeadersObject(responseHeaders) {
      var headers = responseHeaders.split(/\n/);
      var obj = {};
      // Last item is useless
      headers.pop();
      headers.forEach(header => {
        var trimeHeader = header.trim();
        var split = trimeHeader.split(/: /);
        obj[split[0].trim()] = split[1].trim();
      });

      return obj;
    }

    function onChangeTemplate(evt) {
      var clonedEvent = window.ServiceHelper.cloneObject(evt, true);
      clonedEvent.responseHeaders =
        _buildResponseHeadersObject(evt.target.getAllResponseHeaders());
      channel.postMessage({
        remotePortId: remotePortId,
        data: {
          id: reqId,
          event: clonedEvent
        }
      });
    }

    _XMLHttpRequests[xhrId][eventType] = onChangeTemplate;
  };

  function addEventTargetEvent(channel, request) {
    var requestOp = request.remoteData.data;
    var reqId = request.remoteData.id;
    var xhrId = request.remoteData.data.xhrId;

    function listenerTemplate(evt) {
      channel.postMessage({
        remotePortId: remotePortId,
        data: {
          id: reqId,
          event: window.ServiceHelper.cloneObject(evt, true)
        }
      });
    }

    _listeners[reqId] = listenerTemplate;
    _XMLHttpRequests[xhrId].addEventListener(requestOp.type,
      _listeners[reqId], requestOp.useCapture);
  }

  var _operations = {
    createXMLHttpRequest: buildDOMRequestAnswer.bind(this),

    abort: executeOperation.bind(this, 'abort'),

    open: executeOperation.bind(this, 'open'),

    overrideMimeType: executeOperation.bind(this, 'overrideMimeType'),

    send: executeOperation.bind(this, 'send'),

    setRequestHeader: executeOperation.bind(this, 'setRequestHeader'),

    set: function(channel, request) {
      var xhrId = request.remoteData.data.xhrId;
      var opData = request.remoteData.data.params;
      _XMLHttpRequests[xhrId][opData[0]] = opData[1];
    },

    addEventListener: addEventTargetEvent.bind(this),

    removeEventListener: function(channel, request) {
      var requestOp = request.remoteData.data;
      var xhrId = request.remoteData.data.xhrId;
      _XMLHttpRequests[xhrId].removeEventListener(
        _listeners[requestOp.listenerId]);
    },

    dispatchEvent: function(channel, request) {
      var requestOp = request.remoteData.data;
      var xhrId = request.remoteData.data.xhrId;
      _XMLHttpRequests[xhrId].dispatchEvent(requestOp.event);
    }
  };
  ['onabort', 'onerror', 'onload', 'onloadend', 'onloadstart', 'onprogress',
    'ontimeout', 'onreadystatechange'].forEach( evt => {
      _operations[evt] = setHandler.bind(undefined, evt);
  });

  var processSWRequest = function(aAcl, aChannel, aEvt) {
    // We can get:
    // * methodName
    // * onpropertychange
    // * createXMLHttpRequest
    // * addEventListener
    // * removeEventListener
    // * dispatchEvent
    // All the operations have a requestId, and all the operations over
    // a XMLHttpRequest also include a xhr id.
    var request = aEvt.data.remoteData;
    var requestOp = request.data.operation;
    var targetURL = aEvt.data.targetURL;
    var opParams = request.data.params;

    var checkParams = function(expectedParams) {
      var hasErrors = false;
      opParams.forEach((param, index) => {
        var key = _getKeyFromIndex(index, expectedParams);
        var regExp = new RegExp(constraints.params[key]);
        forbidden = !regExp.test(param);
        if (forbidden) {
          return;
        }
      });

      return hasErrors;
    }

    var resetState = function() {
      _currentOperations = 0;
      clearTimeout(_clearCurrentOperationsId);
    }

    var checkLastRequest = function(maxPetitionsPerSecond) {
      var timestamp = Date.now();
      if (!_lastOpenRequest || timestamp - _lastOpenRequest >= 1000 ||
          _currentOperations < maxPetitionsPerSecond) {
        _currentOperations++;
        // Update timestamp
        _lastOpenRequest = timestamp;

        // Need to update the timeout
        _clearCurrentOperationsId && clearTimeout(_clearCurrentOperationsId);

        _clearCurrentOperationsId = setTimeout(resetState, 1000);

        return false;
      }

      debug('checkLastRequest --> Too many petitions');
      return true;
    };

    var _getKeyFromIndex = function(index, object) {
      return Object.keys(object)[index];
    }

    // TODO: Add resource access constraint
    // It should return true if resource access is forbidden,
    // false if it's allowed
    var forbidCall = function(constraints) {
      var forbidden = false;
      switch(requestOp) {
        case 'createXMLHttpRequest':
        case 'setRequestHeader':
        case 'overrideMimeType':
          forbidden = checkParams(constraints.params);
          break;
        case 'open':
          var maxPetitionsPerSecond =
            constraints.throttle.maxPetitionsPerSecond;
          forbidden = checkParams(constraints.params) ||
                      checkLastRequest(maxPetitionsPerSecond);
          break;
        case 'set':
          forbidden = constraints.indexOf(opParams[0]) === -1;
          break;
        case 'send':
          var regExp = new RegExp(constraints.type);
          forbidden = opParams[0] && !regExp.test(opParams[0].constructor.name);
          break;
      }
      return forbidden;
    };

    if (window.ServiceHelper.isForbidden(aAcl, targetURL, requestOp,
                                         forbidCall)) {
      return;
    }

    debug('processSWRequest --> processing a msg:' +
          (aEvt.data ? JSON.stringify(aEvt.data): 'msg without data'));
    if (requestOp in _operations) {
      _operations[requestOp] &&
        _operations[requestOp](aChannel, aEvt.data);
    } else {
      console.error('SystemXHR service unknown operation:' + requestOp);
    }
  };


  // Testing purpose only!!!!
  window.addEventListener('load', function () {
    if (window.ServiceHelper) {
      debug('APP serviceWorker in navigator');
      window.ServiceHelper.register(processSWRequest);
    } else {
      debug('APP navigator does not have ServiceWorker');
      return;
    }
  });

})(window);
