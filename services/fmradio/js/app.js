(function(window) {
  'use strict';

  function debug(str) {
    console.log('FMRadioService -*-:' + str);
  }

  var _mozFMRadio = navigator.mozFMRadio;

  function buildDOMRequestAnswer(operation, channel, request) {
    debug('Building call --> ' + JSON.stringify(request));
    var remotePortId = request.remotePortId;
    var reqId = request.remoteData.id;
    var opData = request.remoteData.data.params || [];
    var requestOp = request.remoteData.data;

    if (operation === 'get') {
      if (opData.length === 0) {
        channel.postMessage({
          remotePortId: remotePortId,
          data: {
            id: reqId,
            error: {
              type: 'OperationFailed',
              message: 'Parameters missing'
            }
          }
        });
        return;
      }
      // Let's assume this works always..
      channel.postMessage({
        remotePortId: remotePortId,
        data: {
          id: reqId,
          result: {
            name: opData[0],
            value: _mozFMRadio[opData[0]]
          }
        }
      });
      return;
    }

    _mozFMRadio[operation](...opData).then(result => {
      channel.postMessage({
        remotePortId: remotePortId,
        data: {
          id: reqId,
          result: result
        }
      });
    }).catch(error => {
      channel.postMessage({
        remotePortId: remotePortId,
        data: {
          id: reqId,
          error: window.ServiceHelper.cloneObject(error)
        }
      });
    });
  }

  function setHandler(eventType, channel, request) {
    var remotePortId = request.remotePortId;
    var reqId = request.remoteData.id;
    var requestOp = request.remoteData.data;

    function onPropertyChangeTemplate() {
      channel.postMessage({
        remotePortId: remotePortId,
        data: {
          id: reqId,
          event: {
            type: eventType,
            property: requestOp.property,
            propertyValue: _mozFMRadio[requestOp.property]
          }
        }
      });
    }

    _mozFMRadio[eventType] = onPropertyChangeTemplate;
  };

  var _operations = {
    disable: buildDOMRequestAnswer.bind(this, 'disable'),

    enable: buildDOMRequestAnswer.bind(this, 'enable'),

    seekUp: buildDOMRequestAnswer.bind(this, 'seekUp'),

    seekDown: buildDOMRequestAnswer.bind(this, 'seekDown'),

    cancelSeek: buildDOMRequestAnswer.bind(this, 'cancelSeek'),

    setFrequency: buildDOMRequestAnswer.bind(this, 'setFrequency'),

    get: buildDOMRequestAnswer.bind(this, 'get')
  };
  ['onfrequencychange', 'onenabled', 'ondisabled', 'onantennaavailablechange'].
    forEach(evt => {
      _operations[evt] = setHandler.bind(undefined, evt);
  });

  // Ok, this kinda sucks because most APIs (and settings is one of them) cannot
  // be accessed from outside the main thread. So basically everything has to go
  // down to the SW thread, then back up here for processing, then back down to
  // be sent to the client. Yay us!
  var processSWRequest = function(aAcl, aChannel, aEvt) {
    // We can get:
    // * get
    // * methodName
    // * onpropertychange
    // All the operations have a requestId
    var request = aEvt.data.remoteData;
    var requestOp = request.data.operation;
    var targetURL = aEvt.data.targetURL;

    // TODO: Add resource access constraint
    // It should return true if resource access is forbidden,
    // false if it's allowed
    var forbidCall = function(constraints) {
      return false;
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
      console.error('FMRadio service unknown operation:' + requestOp);
    }
  };

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
