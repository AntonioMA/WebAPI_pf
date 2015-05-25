(function(window) {
  'use strict';

  function debug(str) {
    console.log('TCPSocketService -*-:' + str);
  }

  // Ok, this kinda sucks because most APIs (and settings is one of them) cannot
  // be accessed from outside the main thread. So basically everything has to go
  // down to the SW thread, then back up here for processing, then back down to
  // be sent to the client. Yay us!
  var _tcpSocket = navigator.mozTCPSocket;

  var _internalSockId = 0;
  var _sockets = {};

  // request structure:
  // {
  //    remotePortId: portToSWClientBridge
  //    remoteData: dataReceivedFromClient
  //
  // }
  // Answer structure:
  // {
  //   remotePortId: portToSWClientBridge,
  //   data: {
  //      id: request.id
  //      rest: depends on the response
  //   }
  // }

  // Answers a request through a channel, setting the response field (field)
  // with the data passed. Note that since this is more or less standard, this
  // could/should be moved to a common file. Just saying, me.
  function answerWith(channel, request, field, data) {
    // This is needed for the answer to be processed automatically by the
    // helper.
    var dataField = {
      id: request.remoteData.id
    };
    dataField[field] = data;

    channel.postMessage({
      remotePortId: request.remotePortId,
      data: dataField
    });
  }

  // There's a good chance of events going out in this process before the
  // calling process has time to set the event handlers. So we're going to do a
  // dirty trick here.
  var _eventQueue = {};
  function queueEvent(socketId, eventType, event) {
    debug('Queueing unset event ' + eventType + ' for ' + socketId);
    _eventQueue[socketId] = _eventQueue[socketId] || {};
    _eventQueue[socketId][eventType] = _eventQueue[socketId][eventType] || [];
    _eventQueue[socketId][eventType].push(event);
  }


  function setHandler(eventType, channel, request) {
    var socketId = request.remoteData.data.socketId;

    function handlerTemplate(evt) {
      // evt is a TCPSocketEvent which has:
      //   * data
      //   * target
      //   * type
      //   * then => undefined
      var evtCopy = {
        data: evt.data,
        target: socketId,
        type: evt.type,
        then: undefined
      };
      answerWith(channel, request, 'event', evtCopy);
    }

    if (_sockets[socketId]) {
      _sockets[socketId][eventType] = handlerTemplate;
      if (_eventQueue[socketId] && _eventQueue[socketId][eventType]) {
        var event;
        while (event = _eventQueue[socketId][eventType].shift()) {
          handlerTemplate(event);
        }
      }
    }
  }

  var _eventTypes = ['onopen', 'ondrain', 'ondata', 'onerror', 'onclose'];

  var _operations = {
    open: function(channel, request) {
      var funcData = request.remoteData.data;
      _sockets[++_internalSockId] =
        _tcpSocket.open(...funcData.params);
      _eventTypes.forEach(eventType => {
        _sockets[_internalSockId][eventType] =
          queueEvent.bind(this,
                          _internalSockId, eventType);
      });
      // And let's assume everything goes well
      answerWith(channel, request, 'socketId', _internalSockId);
    }
  };

  _eventTypes.forEach(event => {
    _operations[event] = setHandler.bind(undefined, event);
  });

  ['send', 'resume', 'close', 'upgradeToSecure'].forEach(op => {
    _operations[op] = function(channel, request) {
      var funcData = request.remoteData.data;
      _sockets[funcData.socketId][op](...funcData.params);
      // We're not going answer anything here
    };
  });

  // At this point I could change this (again) and move this to the common part
  var processSWRequest = function(channel, evt) {
    var operation = evt.data.remoteData.data.operation;

    _operations[operation] &&
      _operations[operation](channel, evt.data);

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
