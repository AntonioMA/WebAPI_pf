// mozContacts polyfill!
// https://developer.mozilla.org/es/docs/Web/API/ContactManager

// I have to define the service protocol, and this is as good place as any. The
// protocol will be as follows:
// * Each request will have a numeric request id, set by the client
// * The answers will include the request id, so the client can know to which
//   request the answer corresponds

// For all the operations over a DeviceStorage object:
//  * Request: { id: requestId,
//               data: {
//                 operation: methodName,
//                 params: params
//               }
//             }
// * Answer: { id: requestId,
//             result|error: Whatever }

// For the oncontactchange operation
//  Request: { id: requestId,
//             data: {
//             operation: 'oncontactchange'
//           },
// Answer: Will be invoked when there's activity with
// the MozContactChangeEvent (like) object:
//    { id: requestId,
//      event: MozContactChangeEvent }

/* globals FakeDOMRequest, FakeDOMCursorRequest, NavConnectHelper */

(function(window) {
  'use strict';

  function debug(text) {
    console.log('*-*-*- MozContacts PF: ' + text);
  }

  // Wishful thinking at the moment...
  const CONTACTS_SERVICE = 'https://contactsservice.gaiamobile.org';

  var FakeDOMRequest = window.FakeDOMRequest;
  var FakeDOMCursorRequest = window.FakeDOMCursorRequest;
  var OnChangeRequest = window.OnChangeRequest;

  function FakeMozContacts() {
    this._oncontactchange = null;
    this._oncontactAlreadySet = false;

    function execOnChange(event) {
      this._oncontactchange && typeof this._oncontactchange === 'function' &&
        this._oncontactchange(event);
    }

    Object.defineProperty(this, 'oncontactchange', {
      get: function() {
        return this._oncontactchange;
      },

      set: function(cb) {
        this._oncontactchange = cb;
        if (this._oncontactAlreadySet) {
          return;
        }

        var self = this;

        this._oncontactAlreadySet = true;
        navConnHelper.createAndQueueRequest({
                                              operation: 'oncontactchange',
                                              callback: execOnChange.bind(self)
                                            }, OnChangeRequest);
      }
    });

    [{
      methodName: 'clear',
      numParams: 0
    },
    {
      methodName: 'find',
      numParams: 1
    },
    {
      methodName: 'getAll',
      numParams: 1,
      returnValue: FakeDOMCursorRequest
    },
    {
      methodName:'getCount',
      numParams: 0
    },
    {
      methodName:'getRevision',
      numParams: 0
    },
    {
      methodName:'remove',
      numParams: 1
    }
    ].forEach(methodInfo => {
      this[methodInfo.methodName] = navConnHelper.methodCall.bind(navConnHelper,
        {
          methodName: methodInfo.methodName,
          numParams: methodInfo.numParams,
          returnValue: methodInfo.returnValue || FakeDOMRequest
        });
    });

    this.save = function(contact) {
      var toSave = typeof contact.toJSON  === 'function' ? contact.toJSON() :
        contact;

      return navConnHelper.methodCall({
        methodName: 'save',
        numParams: 1,
        returnValue: FakeDOMRequest
      }, toSave);
    }
  }

  /** POLYFILL PART **/
  var navConnHelper = new NavConnectHelper(CONTACTS_SERVICE);

  navConnHelper.then(function(){}, e => {
    debug('Got an exception while connecting ' + e);
    window.navigator.mozContacts = null;
  });

  window.navigator.mozContacts = new FakeMozContacts();

})(window);
