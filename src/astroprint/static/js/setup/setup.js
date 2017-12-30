/*
 *  (c) Daniel Arroyo. 3DaGoGo, Inc. (daniel@astroprint.com)
 *
 *  Distributed under the GNU Affero General Public License http://www.gnu.org/licenses/agpl.html
 */

$.ajaxSetup({
    type: 'POST',
    cache: false,
    headers: {
      "X-Api-Key": UI_API_KEY
    }
});

/******************/

var StepView = Backbone.View.extend({
  setup_view: null,
  events: {
    "submit form": "_onSubmit",
    "click .submit-action": "_onSubmitClicked"
  },
  initialize: function(params)
  {
    this.setup_view = params.setup_view;
  },
  onHide: function() {},
  onShow: function() {},
  onSubmit: function(data) {},
  _onSubmit: function(e)
  {
    e.preventDefault();
    var serializedData = $(e.currentTarget).serializeArray();
    console.log(serializedData);
    var data = {};
    _.each(serializedData, function(item) {
      data[item.name] = item.value;
    });

    console.log(data);

    this.onSubmit(data);
  },
  _onSubmitClicked: function()
  {
    this.$el.find('form').submit();
    return false;
  }
});

/**************
* Welcome
***************/

var StepWelcome = StepView.extend({
  el: "#step-welcome"
});

/*******************************
Setup Internet Connection Screen
*********************************/

var StepToInternetConnection = StepView.extend({
  el: "#step-to-internet-connection"
});

/**************
* Name
***************/

var StepName = StepView.extend({
  el: "#step-name",
  currentName: null,
  constructor: function()
  {
    this.events["keyup input"] = "onNameChanged";
    this.events['click .failed-state button'] = 'onShow';
    StepView.apply(this, arguments);
  },
  onShow: function()
  {
    this.$el.removeClass('settings failed');
    this.$el.addClass('checking');
    $.ajax({
      url: API_BASEURL + 'setup/name',
      method: 'GET',
      dataType: 'json',
      success: _.bind(function(data) {
        this.currentName = data.name;
        this.$el.find('input').val(data.name).focus();
        this.render();
        this.$el.addClass('settings');
      }, this),
      error: _.bind(function(xhr) {
        this.$el.addClass('failed');
        this.$el.find('.failed-state h3').text(xhr.responseText);
      }, this),
      complete: _.bind(function() {
        this.$el.removeClass('checking');
      }, this)
    })
  },
  render: function(name)
  {
    if (name == undefined) {
      name = this.$el.find('input').val();
    }

    this.$el.find('.hotspot-name').text(name);
    this.$el.find('.astrobox-url').text(name);
  },
  onNameChanged: function(e)
  {
    var name = $(e.target).val();

    if (/^[A-Za-z0-9\-]+$/.test(name)) {
      this.render(name);
    } else if (name) {
      $(e.target).val( $(e.target).val().slice(0, -1) );
    } else {
      this.render('');
    }
  },
  onSubmit: function(data)
  {
    if (data.name != this.currentName) {
      this.$el.find('.loading-button').addClass('loading');
      $.ajax({
        url: API_BASEURL + 'setup/name',
        method: 'post',
        data: data,
        success: _.bind(function() {
          location.href = this.$el.find('.submit-action').attr('href');
        }, this),
        error: function(xhr) {
          if (xhr.status == 400) {
            message = xhr.responseText;
          } else {
            message = "There was an error saving your name";
          }
          noty({text: message, timeout: 3000});
        },
        complete: _.bind(function() {
          this.$el.find('.loading-button').removeClass('loading');
        }, this)
      });
    } else {
      location.href = this.$el.find('.submit-action').attr('href');
    }
  }
});

/**************
* Internet
***************/

var StepInternet = StepView.extend({
  el: "#step-internet",
  networkListTemplate: null,
  networks: null,
  passwordDialog: null,
  notifyTemplate: _.template($("#notify-template").html()),
  // setupView: null,
  initialize: function() {
    // this.setupView = new SetupView();
    _.extend(this.events, {
      'click .failed-state button': 'onShow',
      'click .settings-state button.connect': 'onConnectClicked',
      'click .cancel-btn--wifi-network': 'onCancelClicked',
      'change .hotspot-off input': 'hotspotOffChanged',
      'click .retry-btn': 'retryForNetworks',
      'click .next-button--notify': 'closeErrorMsg'
    });
  },
  onShow: function() {
    console.log('onShow function is called');
    /* this 'onShow' function is called on initialization */
    this.$el.removeClass('success settings failed');

    /* on initialization we will checking for the connections first */
    this.$el.addClass('checking');

    /* if on initialization checking view is disable then enabling that */

    var checkClass = this.$('.checking-state').hasClass('hide');
    if (checkClass) {
      this.$('.checking-state').removeClass('hide');
      this.$('.failed-state').addClass('hide');
      this.$('.settings-state').addClass('hide');
      // this.$('.checking-state').removeClass('hide').addClass('active');
      // this.$('.failed-state').removeClass('active').addClass('hide');
    }
    $.ajax({
      url: API_BASEURL + 'setup/internet',
      method: 'GET',
      dataType: 'json',
      success: _.bind(function(data) {
        console.log(data);
        this.$('.checking-state').addClass('hide');
        if (data && data.connected) {
          this.$el.addClass('success');
          // this.$('.checking-state').addClass('hide');

          /* showing the success view if the connection is already stablished is received */
          // this.$('.success-state').removeClass('hide').addClass('active');
          this.$('.success-state').removeClass('hide');

        } else {
          /* 
          * if no internet connectivity is there..then getting the list of available netwokrs
          * and showing then as list 
          */
          if (!this.networkListTemplate) {
            this.networkListTemplate = _.template( $("#wifi-network-list-template").html() )
          }

          /* getting the list element from the view */
          var list = this.$el.find('.settings-state .wifi-network-list');
          list.empty(); // clearning the list item

          this.networks = _.sortBy(_.uniq(_.sortBy(data.networks, function(el){return el.name}), true, function(el){return el.name}), function(el){
            el.active = self.settings && self.settings.network.id == el.id;
            return -el.signal
          });

          /* adding the items to the list */
          list.html(this.networkListTemplate({
            networks: this.networks
          }));

          //Bind events
          list.find('ul li').bind('click', _.bind(this.networkSelected, this));

          this.$el.addClass('settings');

          /* enabling the 'settings-state' view and disabling the 'checking-state' view */
          this.$(".settings-state").removeClass('hide');
          // this.$(".checking-state").addClass('hide');
        }
      }, this),
      error: _.bind(function(xhr) {
        /* in case of error enabling the retry option for the user */
        console.log(xhr);
        this.$el.addClass('failed');
        this.$(".checking-state").addClass('hide');
        this.$(".failed-state").removeClass('hide');
        this.$('.failed-state p').text(xhr.responseText);
      }, this),
      complete: _.bind(function() {
        this.$el.removeClass('checking');
      }, this)
    })
  },
  networkSelected: function(e) {
    var networkRow = $(e.currentTarget);

    this.$('.wifi-network-list li.selected').removeClass('selected');
    networkRow.addClass('selected');

    var network = this.networks[networkRow.data('id')];
    if (network) {
      this.$('.settings-state button.connect').removeClass('disabled');
    }

    $('html,body').animate({
          scrollTop: this.$('.settings-state button.connect').offset().top
        }, 1000);
  },
  onConnectClicked: function() {
    console.log("Connect button is clicked");
    var networkRow = this.$el.find('.wifi-network-list li.selected');

    if (networkRow.length == 1) {
      var network = this.networks[networkRow.data('id')];

      if (network.secured) {
        if (!this.passwordDialog) {
          this.passwordDialog = new WiFiNetworkPasswordDialog({parent: this});
        }

        this.passwordDialog.open(network);
      } else {
        this.doConnect({id: network.id, password: null});
      }
    }
  },
  onCancelClicked: function() {
    this.$('.checking-state').removeClass('hide');
    this.$('.settings-state').addClass('hide');
  },
  hotspotOffChanged: function(e) {
    var target = $(e.currentTarget);

    $.ajax({
      url: '/api/setup/internet',
      method: 'PUT',
      data: JSON.stringify({
        'hotspotOnlyOffline': target.is(':checked')
      }),
      contentType: 'application/json',
      dataType: 'json'
    }).
    fail(function(){
      noty({text: "There was an error saving hotspot option.", timeout: 3000});
    })
  },
  doConnect: function(data, callback) {
    var loadingBtn = this.$el.find(".settings-state .loading-button");
    loadingBtn.addClass('loading');

    var self = this;

    $.ajax({
      url: API_BASEURL + 'setup/internet',
      type: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({id: data.id, password: data.password})
    })
    .done(_.bind(function(data) {
      if (data.name) {

        var connectionCb = null;

        //Start Timeout
        var connectionTimeout = setTimeout(function(){
          connectionCb.call(this, {status: 'failed', reason: 'timeout'});
        }, 70000); //1 minute

        connectionCb = function(connectionInfo) {
          console.log(connectionInfo);
          switch (connectionInfo.status) {
            case 'disconnected':
            case 'connecting':
              //Do nothing. the failed case should report the error
            break;

            case 'connected':
              setup_view.eventManager.off('astrobox:InternetConnectingStatus', connectionCb, this);
              /* We are not directly going to the share page*/
              // console.log(setup_view);
              // setup_view.setStep('share');
              /* Here we are navigating to the success state */
              console.log('Hiding the unnecerray items');
              this.$('#wifi-network-password-modal').toggleClass('hide');
              this.$('.settings-state').removeClass('active').addClass('hide');
              this.$('.success-state').removeClass('hide').addClass('active');
              
              // noty({text: "Your "+PRODUCT_NAME+" is now connected to "+connectionInfo.info.name+".", type: "success", timeout: 3000});
              loadingBtn.removeClass('loading');
              if (callback) callback(false);
              this.$el.removeClass('settings');
              this.$el.addClass('success');
              // var setupView = new SetupView();
              clearTimeout(connectionTimeout);
            break;

            case 'failed':
              setup_view.eventManager.off('astrobox:InternetConnectingStatus', connectionCb, this);
              if (connectionInfo.reason == 'no_secrets') {
                // noty({text: "Invalid password for "+data.name+".", timeout: 3000});
                var msg = "Invalid password for " + data.name + ".";
                self.$('#notify-view').removeClass('hide').html(self.notifyTemplate({ msg: msg, type: 'warning' }));
              } else {
                // noty({text: "Unable to connect to "+data.name+".", timeout: 3000});
                var msg = "Unable to connect to " + data.name + ".";
                self.$('#notify-view').removeClass('hide').html(self.notifyTemplate({ msg: msg, type: 'warning' }));
              }
              loadingBtn.removeClass('loading');
              if (callback) callback(true);
              clearTimeout(connectionTimeout);
              break;

            default:
              setup_view.eventManager.off('astrobox:InternetConnectingStatus', connectionCb, this);
              // noty({text: "Unable to connect to "+data.name+".", timeout: 3000});
              var msg = "Unable to connect to " + data.name + ".";
              self.$('#notify-view').removeClass('hide').html(self.notifyTemplate({ msg: msg, type: 'warning' }));
              loadingBtn.removeClass('loading');
              clearTimeout(connectionTimeout);
              if (callback) callback(true);
          }
        };

        setup_view.eventManager.on('astrobox:InternetConnectingStatus', connectionCb, this);

      } else if (data.message) {
        // noty({text: data.message, timeout: 3000});
        var msg = data.message;
        self.$('#notify-view').removeClass('hide').html(self.notifyTemplate({ msg: msg, type: 'warning' }));
        loadingBtn.removeClass('loading');
        if (callback) callback(true);
      }
    }, this))
    .fail(function(){
      // noty({text: "There was an error connecting.", timeout: 3000});
      var msg = "There was an error connecting.";
      self.$('#notify-view').removeClass('hide').html(self.notifyTemplate({ msg: msg, type: 'error' }));
      loadingBtn.removeClass('loading');
      if (callback) callback(true);
    })
  },
  closeErrorMsg: function() {
    this.$('#notify-view').addClass('hide');
  },
  retryForNetworks: function() {
    this.onShow();
  }
});

var WiFiNetworkPasswordDialog = Backbone.View.extend({
  el: '#wifi-network-password-modal',
  events: {
    'click button.connect': 'connectClicked',
    'submit form': 'connectClicked',
    'click .cancel-btn-password': 'cancelClicked',
    'click #show-password': 'onShowPasswordChanged'
  },
  parent: null,
  template: _.template($('#wifi-network-password-modal-template').html()),
  initialize: function(params) {
    this.parent = params.parent;
  },
  render: function(wifiInfo) {
    this.$el.html( this.template({wifi: wifiInfo}) );
    this.$('.network-password-field').mlKeyboard({
      layout: 'en_US'
    });
    $('#mlkeyboard').addClass('active');
  },
  open: function(wifiInfo) {
    var wifiList = this.parent.$el.find('.step__content');
    this.render(wifiInfo);
    wifiList.toggleClass('hide');
    this.$el.toggleClass('hide');
    this.$el.find('.network-password-field').focus();
  },
  connectClicked: function(e) {
    e.preventDefault();
    $('#mlkeyboard').remove();
    var content = this.$el.find('.step__content');
    var form = this.$el.find('form');
    var connecting = this.$el.find('.connecting');
    var password = form.find('.network-password-field').val();
    var submitBtn = this.$('.connect').addClass('hide');

    this.$('.cancel-btn-password').addClass('hide');
    submitBtn.addClass('hide');
    content.toggleClass('hide');
    connecting.toggleClass('hide');
    this.parent.doConnect(
      {id: form.find('.network-id-field').val(), password: password},
      _.bind(function(error) { //callback
        form.find('.network-password-field').val('');
        if (!error) {
          connecting.toggleClass('hide');
          this.parent.$el.find('.step__content').toggleClass('hide');
          submitBtn.removeClass('hide');
        } else {
          submitBtn.removeClass('hide');
          content.toggleClass('hide');
          connecting.toggleClass('hide');
          this.$('.cancel-btn-password').removeClass('hide');
          this.$('.network-password-field').focus();
          this.$('.network-password-field').mlKeyboard({
            layout: 'en_US'
          });
          $('#mlkeyboard').addClass('active');
        }
      }, this)
    );
  },
  cancelClicked: function(e) {
    e.preventDefault();
    $('#mlkeyboard').remove();
    var wifiList = this.parent.$el.find('.step__content');
    wifiList.toggleClass('hide');
    this.$el.toggleClass('hide');
  },
  onShowPasswordChanged: function(e) {
    var target = $(e.currentTarget);
    target.toggleClass('checked');
    var checked = target.hasClass('checked');
    console.log(checked);
    var field = this.$('input[name=password]');

    if (checked) {
      field.attr('type', 'text');
      target.css('background-image', 'url("../../img/setup/show-password.svg")');
    } else {
      field.attr('type', 'password');
      target.css('background-image', 'url("../../img/setup/hide-password.svg")');
    }
  }
});

/*********************************
Device Registration message Screen
**********************************/

var DeviceRegistration = StepView.extend({
  el: "#step-registration"
});

/**************
* Astroprint
***************/

var StepAstroprint = StepView.extend({
  el: "#step-astroprint",
  submitBtn : $('.access-key-submit-button'),
  nextBtn : $('.go-to-access-key'),
  cancelBtn : $('.access-key-cancel-button'),
  formBackBtn : $('.back-button-img'),
  initialize: function() {
    this.events["click a.logout"] = "onLogoutClicked";
    this.events["click .go-to-access-key"] = "toAccessKey";
    this.events["click .access-key-submit-button"] = "onSubmit";
    this.events["click .access-key-cancel-button"] = "cancelRegistration";
    this.events["click .back-button-img"] = "toMachineId";
    this.events["click .retry-btn"] = "retryVerification";
  },
  onShow: function() {
    this.$el.removeClass('success settings');
    this.$el.addClass('checking');
    $.ajax({
      url: API_BASEURL + 'setup/astroprint',
      method: 'GET',
      success: _.bind(function(data) {
        console.log(data);
        if (data.user) {
          console.log("User is found");
          this.$el.addClass('success');
          this.$el.find('.checking-state').addClass('hide');
          this.$el.find('.success-state').removeClass('hide');
          this.$el.find('span.email').text(data.user);
        } else {
          console.log("User is not found");
          this.$el.addClass('settings');
          this.$el.find('.checking-state').addClass('hide');
          this.$el.find('.settings-state').removeClass('hide');
          this.$el.find('#machineId').focus();
          this.$('#machineId').mlKeyboard({
            layout: 'en_US'
          });
          $('#mlkeyboard').addClass('active');
        }
      }, this),
      error: _.bind(function() {
        this.$el.addClass('settings');
        this.$el.find('.checking-state').addClass('hide');
        this.$el.find('.settings-state').removeClass('hide');
        this.$el.find('#machineId').focus();
        this.$('#machineId').mlKeyboard({
          layout: 'en_US'
        });
        $('#mlkeyboard').addClass('active');
      }, this),
      complete: _.bind(function() {
        this.$el.removeClass('checking');
      }, this)
    });
  },
  toAccessKey: function() {
    this.$('#machineId').addClass('hide');
    this.$('.form-msg').text('Enter the Access Code');
    $('#mlkeyboard').remove();
    this.submitBtn.removeClass('hide');
    this.cancelBtn.addClass('hide');
    this.nextBtn.addClass('hide');
    this.formBackBtn.removeClass('hide');

    this.$('#accessCode').removeClass('hide').focus();
    this.$('#accessCode').mlKeyboard({
      layout: 'en_US'
    });
    $('#mlkeyboard').addClass('active');
  },
  toMachineId: function() {
    $('#mlkeyboard').remove();
    // this.formBackBtn.addClass('hide');
    this.resetFormState();
    this.$('#accessCode').addClass('hide');
    this.$('#machineId').removeClass('hide').focus();
    // this.$('.form-msg').text('Enter the unique Machine Id');
    this.$('#machineId').mlKeyboard({
      layout: 'en_US'
    });
    $('#mlkeyboard').addClass('active');
  },
  cancelRegistration: function() {
    this.$('#machineId').removeClass('hide').val('');
    this.$('#accessCode').val('').addClass('hide');
    $('#mlkeyboard').remove();
    this.resetFormState();
  },
  resetFormState: function() {
    this.$('.form-msg').text('Enter the unique Machine Id');
    this.submitBtn.addClass('hide');
    this.nextBtn.removeClass('hide');
    this.cancelBtn.removeClass('hide');
    this.formBackBtn.addClass('hide');
  },
  onSubmit: function() {
    $('#mlkeyboard').remove();
    this.$('.settings-state').addClass('hide');
    this.$('.checking-state').removeClass('hide');
    console.log('Astroprint\'s onSubmit() fn is called');
    var data = {};
    var serializedData = $('.wifi-password-modal__form').serializeArray();
    serializedData.forEach(function (element) {
      data[element.name] = element.value;
    });
    console.log(data);

    $.ajax({
      url: API_BASEURL + 'setup/astroprint',
      method: 'post',
      data: JSON.stringify(data),
      dataType: 'json',
      contentType: "application/json;charset=utf-8",
      success: _.bind(function() {
        // location.href = this.$('.submit-action').attr('href');
        $('#mlkeyboard').remove();
        this.$('.success-state').removeClass('hide');
      }, this),
      error: _.bind(function(xhr) {
        console.log(xhr);
        $('#mlkeyboard').remove();
        this.$('.checking-state').addClass('hide');
        if (xhr.status == 400 || xhr.status == 401 || xhr.status == 503) {
          message = "Registration failed!";
          this.$('.failed-state').removeClass('hide');
          this.$('.failed-state .error-msg').text(message);
        } else {
          message = xhr.responseText;
          this.$('.failed-state').removeClass('hide');
          this.$('.failed-state .error-msg').text(message);
        }
        // noty({text: message, timeout: 3000});
        this.$('#machineId').focus();
      }, this),
      complete: _.bind(function() {
        this.$('.loading-button').removeClass('loading');
      }, this)
    });
  },
  retryVerification: function() {
    this.$('.failed-state').addClass('hide');
    this.$('.settings-state').removeClass('hide');
    this.cancelRegistration();
  },
  onLogoutClicked: function(e) {
    e.preventDefault();
    $.ajax({
      url: API_BASEURL + 'setup/astroprint',
      method: 'delete',
      success: _.bind(function() {
        this.$el.removeClass('success');
        this.$el.addClass('settings');
        this.$el.find('.success-state').addClass('hide');
        this.$el.find('.settings-state').removeClass('hide');
      }, this),
      error: _.bind(function(xhr) {
        noty({text: "Error logging you out", timeout: 3000});
      }, this)
    });
  }
});

/*******************
* Connect Printer
********************/

// var StepConnectPrinter = StepView.extend({
//   el: "#step-connect-printer",
//   constructor: function()
//   {
//     StepView.apply(this, arguments);
//   }
// });

/**************
* Printer
***************/

// var StepPrinter = StepView.extend({
//   el: "#step-printer",
//   template: _.template( $("#step-printer-template").html() ),
//   onShow: function()
//   {
//     this._checkPrinters()
//   },
//   render: function(settings)
//   {
//     this.$('form').html(this.template({
//       settings: settings
//     }));
//   },
//   onSubmit: function(data)
//   {
//     this._setConnecting(true);
//     $.ajax({
//       url: API_BASEURL + 'setup/printer',
//       method: 'post',
//       data: data,
//       success: _.bind(function() {
//         this.listenTo(setup_view, 'sock-flags', function(flags) {
//           if (flags.operational) {
//             this._setConnecting(false);
//             this.stopListening(setup_view, 'sock-flags');
//             location.href = this.$el.find('.submit-action').attr('href');
//           } else if (flags.error) {
//             this.stopListening(setup_view, 'sock-flags');
//             this._setConnecting(false, true);
//           }
//         }, this);
//       }, this),
//       error: _.bind(function(xhr) {
//         if (xhr.status == 400 || xhr.status == 401) {
//           message = xhr.responseText;
//           noty({text: message, timeout: 3000});
//         }
//         this._setConnecting(false, true);
//       }, this)
//     });
//   },
//   _checkPrinters: function()
//   {
//     this.$el.removeClass('success settings');
//     this.$el.addClass('checking');
//     $.ajax({
//       url: API_BASEURL + 'setup/printer',
//       method: 'GET',
//       success: _.bind(function(data) {
//         this.$el.addClass('settings');
//         if (data.portOptions && (data.baudrateOptions || data.driver == 's3g')) {
//           this.render(data);
//           this.delegateEvents(_.extend(this.events, {
//             'click a.retry-ports': 'retryPortsClicked',
//             'change #settings-printer-driver': 'driverChanged'
//           }));
//         } else {
//           noty({text: "Error reading printer connection settings", timeout: 3000});
//         }
//       }, this),
//       error: _.bind(function(xhr) {
//         this.$el.addClass('settings');
//         if (xhr.status == 400) {
//           message = xhr.responseText;
//         } else {
//           message = "Error reading printer connection settings";
//         }
//         noty({text: message, timeout: 3000});

//       }, this),
//       complete: _.bind(function() {
//         this.$el.removeClass('checking');
//       }, this)
//     });
//   },
//   _setConnecting: function(connecting, error)
//   {
//     if (connecting) {
//       this.$('.loading-button').addClass('loading');
//       this.$('.skip-step').hide();
//     } else if (error) {
//       this.$('.loading-button').removeClass('loading').addClass('error');
//       this.$('.skip-step').hide();
//       setTimeout(_.bind(function(){
//         this.$('.loading-button').removeClass('error');
//         this.$('.skip-step').show();
//       },this), 3000);
//     } else {
//       this.$('.loading-button').removeClass('loading');
//       this.$('.skip-step').show();
//     }
//   },
//   retryPortsClicked: function(e)
//   {
//     e.preventDefault();
//     this.onShow();
//   },
//   driverChanged: function(e)
//   {
//     this.$el.removeClass('success settings');
//     this.$el.addClass('checking');
//     $.ajax({
//       url: API_BASEURL + 'setup/printer/profile',
//       method: 'POST',
//       data: {
//         driver: $(e.target).val()
//       },
//       success: _.bind(function() {
//         this._checkPrinters();
//       }, this),
//       error: _.bind(function(xhr) {
//         this.$el.addClass('settings');
//         if (xhr.status == 400) {
//           message = xhr.responseText;
//         } else {
//           message = "Error saving printer connection settings";
//         }
//         noty({text: message, timeout: 3000});

//       }, this),
//       complete: _.bind(function() {
//         this.$el.removeClass('checking');
//       }, this)
//     });
//   }
// });

/**************
* Share
***************/

var StepShare = StepView.extend({
  el: "#step-share",
  constructor: function()
  {
    this.events["click .share-button.facebook"] = "onFacebookClicked";
    this.events["click .share-button.twitter"] = "onTwitterClicked";
    this.events["click .setup-done"] = "onSetupDone";
    StepView.apply(this, arguments);
  },
  onFacebookClicked: function(e)
  {
    e.preventDefault();
    window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(shareOptions.facebook.link),'facebook','width=740,height=280,left=300,top=300');
    this.$el.find('a.button.setup-done').show();
  },
  onTwitterClicked: function(e)
  {
    e.preventDefault();
    window.open('https://twitter.com/share?url='+encodeURIComponent(shareOptions.twitter.link)+'&text='+encodeURIComponent(shareOptions.twitter.copy),'twitter','width=740,height=280,left=300,top=300');
    this.$el.find('a.button.setup-done').show();
  },
  onSetupDone: function(e)
  {
    e.preventDefault();
    $.ajax({
      url: API_BASEURL + 'setup/done',
      method: 'post',
      success: function() {
        location.href = "/";
      },
      error: function() {
        noty({text: "There was an error saving your settings.", timeout: 3000});
      }
    });
  }
});

var SetupView = Backbone.View.extend({
  steps: null,
  current_step: 'welcome',
  router: null,
  eventManager: null,
  _socket: null,
  _autoReconnecting: false,
  _autoReconnectTrial: 0,
  _autoReconnectTimeouts: [1, 1, 2, 2, 2, 3, 3, 5, 5, 10],
  previousflags: null,
  initialize: function()
  {
    console.log("SetupView is initialized");
    this.steps = {
      'welcome': new StepWelcome({'setup_view': this}),
      'goToInternet': new StepToInternetConnection({'step_view': this}),
      'deviceRegistration': new DeviceRegistration({ 'step_view': this }),
      'name': new StepName({'setup_view': this}),
      'internet': new StepInternet({'setup_view': this}),
      'astroprint': new StepAstroprint({'setup_view': this}),
      // 'connect-printer': new StepConnectPrinter({'setup_view': this}),
      // 'printer': new StepPrinter({'setup_view': this}),
      'share': new StepShare({'setup_view': this})
    };

    console.log(this.steps);

    this.eventManager = Backbone.Events;
    this.router = new SetupRouter({'setup_view': this});
    this.connect(WS_TOKEN);
  },
  connect: function(token)
  {
    this._socket = new SockJS(SOCKJS_URI+'?token='+token);
    this._socket.onopen = _.bind(this._onConnect, this);
    this._socket.onclose = _.bind(this._onClose, this);
    this._socket.onmessage = _.bind(this._onMessage, this);
  },
  reconnect: function()
  {
    if (this._socket) {
      this._socket.close();
      delete this._socket;
    }

    $.getJSON('/wsToken')
      .done(_.bind(function(data){
        if (data && data.ws_token) {
          this.connect(data.ws_token);
        }
      }, this))
      .fail(_.bind(function(){
        this._onClose();
      }, this));
  },
  _onConnect: function()
  {
    self._autoReconnecting = false;
    self._autoReconnectTrial = 0;
  },
  _onClose: function(e)
  {
    if (e && e.code == 1000) {
      // it was us calling close
      return;
    }

    if (this._autoReconnectTrial < this._autoReconnectTimeouts.length) {
      var timeout = this._autoReconnectTimeouts[this._autoReconnectTrial];
      console.log("Reconnect trial #" + this._autoReconnectTrial + ", waiting " + timeout + "s");
      setTimeout(_.bind(this.reconnect, this), timeout * 1000);
      this._autoReconnectTrial++;
    }
  },
  _onMessage: function(e)
  {
    for (var prop in e.data) {
      var data = e.data[prop];

      switch (prop) {
        case "connected":
          // update the current UI API key and send it with any request
          UI_API_KEY = data["apikey"];
          $.ajaxSetup({
            headers: {"X-Api-Key": UI_API_KEY}
          });
        break;

        case "event": {
          var type = data["type"];
          var payload = data["payload"];

          if (type == 'InternetConnectingStatus') {
            this.eventManager.trigger('astrobox:InternetConnectingStatus', data["payload"]);
          }
        }
        break;

        case "current": {
          var flags = data.state.flags;

          if (flags != this.previousflags) {
            this.trigger('sock-flags', flags);
            this.previousflags = flags;
          }
        }
        break;
      }
    }
  },
  setStep: function(step)
  {
    // console.log("setStep function is called");
    // console.log(step);
    // console.log(this.steps[step]);
    if (this.steps[step] != undefined) {
      this.steps[this.current_step].$el.addClass('hide');
      this.steps[this.current_step].onHide();
      this.steps[step].$el.removeClass('hide');
      this.steps[step].onShow();
      this.current_step = step;
    } else {
      this.router.navigate("/", {trigger: true, replace: true});
    }
  }
});

var SetupRouter = Backbone.Router.extend({
  setup_view: null,
  routes: {
    "": "setStep",
    ":step": "setStep",
    "*notFound": "notFound"
  },
  initialize: function(params)
  {
    this.setup_view = params.setup_view;
  },
  setStep: function(step)
  {
    this.setup_view.setStep(step || 'welcome');
  },
  notFound: function()
  {
    this.navigate("", {trigger: true, replace: true});
  }
});

var setup_view = new SetupView();

Backbone.history.start();
