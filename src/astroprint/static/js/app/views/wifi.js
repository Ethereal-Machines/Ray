/**********************************
* Code by Kanishka Mohan Madhuni *
**********************************/

var WifiView = Backbone.View.extend({
  el: '#wifi-view',
  storedWifi: null,
  availableNetworks: null,
  storedWifiTemplate: _.template( $('#stored-wifi-list-template').html() ),
  availableNetworkTemplate: _.template( $('#available-wifi-list-template').html() ),
  notifyView: null,
  loadingStatus: null,
  events: {
    'click .add-new-network': 'getWifiList',
    'click .cancel-btn': 'resetState'
  },
  initialize: function() {},
  getStoredWifi: function() {
    var self = this;
    $.ajax({
      url: API_BASEURL + 'settings/network',
      method: 'GET',
      dataType: 'json',
      success: function(data) {
        self.storedWifi = data.storedWifiNetworks;
        self.$('.section-sub-container--checking').addClass('hide');
        self.getStoredWifiStatus();
        self.showStoredWifi();
      },
      error: function(xhr) {
        // console.log(xhr);
        self.notifyView = new NotifyView({msg: 'The requested URL was not found on the server.  If you entered the URL manually please check your spelling and try again.', type: 'error'});
        app.router.selectView(self.notifyView);
      }
    });
  },
  getStoredWifiStatus: function() {
    if (this.storedWifi.length !== 0) {
      this.$('.section-sub-container--no-wifi').addClass('hide');
      this.$('.section-sub-container--stored-wifi').removeClass('hide').addClass('active');
    } else {
      this.$('.section-sub-container--no-wifi').removeClass('hide').addClass('active');
      this.$('.section-sub-container--stored-wifi').removeClass('active').addClass('hide');
      this.$('.section-sub-container--checking-available').removeClass('hide');
    }
  },
  showStoredWifi: function() {
    this.$('.stored-wifi-list').html(this.storedWifiTemplate({
      wifiItems: this.storedWifi
    }));

    // binding the click event to each list element
    this.$('.stored-wifi-list li').bind('click', _.bind(this.forgetNetworkModal, this));
  },
  forgetNetworkModal: function(e) {
    e.preventDefault();

    var network = $(e.currentTarget);
    var networkName = network.find('span').text();
    var networkObj;

    for (var key in this.storedWifi) {
      if (this.storedWifi[key].name === networkName) {
        networkObj = this.storedWifi[key];
      }
    }

    var forgetNetworkModal = new ForgetNetworkView({parent: this});
    forgetNetworkModal.open(networkObj);

  },
  getWifiList: function() {
    var self = this;
    self.changeState();

    if (self.availableNetworks != null) {
      self.availableNetworks.length = 0;
    }

    $.ajax({
      url: API_BASEURL + 'settings/network/wifi-networks',
      method: 'GET',
      dataType: 'json',
      success: function(data) {
        self.$('.section-sub-container--checking-available').addClass('hide');
        self.$('.section-sub-container--wifi-available').removeClass('hide');
        self.availableNetworks = data.networks;

        self.showAvailableWifi();
        // console.log(self.availableNetworks);
      },
      error: function(xhr) {
        console.log(xhr);
      }
    });
  },
  showAvailableWifi: function() {
    this.$('.available-wifi-list').html(this.availableNetworkTemplate({
      wifiItems: this.availableNetworks
    }));

    // binding the click event to each list element
    this.$('.available-wifi-list li').bind('click', _.bind(this.addPasswordModal, this));
  },
  resetState: function() {
    this.$('.back-button').removeClass('hide');
    this.$('.stored-wifi-list-section').removeClass('hide');
    this.$('.cancel-btn').addClass('hide');
    this.$('.section-sub-container--checking-available').removeClass('hide');
    this.$('.add-new-wifi-section').addClass('hide');
  },
  changeState: function() {
    this.$('.stored-wifi-list-section').addClass('hide');
    this.$('.add-new-wifi-section').removeClass('hide');
    this.$('.back-button').addClass('hide');
    this.$('.cancel-btn').removeClass('hide');
  },
  addPasswordModal: function(e) {
    e.preventDefault();

    var network = $(e.currentTarget);
    var networkName = network.find('span').text();
    var networkObj;

    for (var key in this.availableNetworks) {
      if (this.availableNetworks[key].name === networkName) {
        networkObj = this.availableNetworks[key];
      }
    }

    // console.log(networkObj);
    var addPasswordModal = new AddPasswordModal({parent: this});
    addPasswordModal.open(networkObj);
  },
  doConnect: function(id, password, childElement) {
    var childElement = childElement;

    // console.log(childElement);

    $.ajax({
      url: API_BASEURL + 'settings/network/active',
      type: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({id: id, password: password})
    })
      .done(_.bind(function(data) {
        if (data.name) {
          var connectionCb = null;

          //Start Timeout
          var connectionTimeout = setTimeout(function(){
            connectionCb.call(this, {status: 'failed', reason: 'timeout'});
          }, 70000); //1 minute

          connectionCb = function(connectionInfo){
            switch (connectionInfo.status) {
              case 'disconnected':
              case 'connecting':
                //Do nothing. the failed case should report the error
              break;

              case 'connected':
                app.eventManager.off('astrobox:InternetConnectingStatus', connectionCb, this);
                self.notifyView = new NotifyView({msg: 'Printer is now connected to ' + data.name , type: 'success'});
                app.router.selectView(self.notifyView);
                clearTimeout(connectionTimeout);

                childElement.randomCall({
                  status: 'connected',
                  msg: 'Connected to ' + data.name
                });

                childElement.successState();
              break;

              case 'failed':
                app.eventManager.off('astrobox:InternetConnectingStatus', connectionCb, this);
                if (connectionInfo.reason == 'no_secrets') {
                  message = "Invalid password for "+data.name+".";
                } else {
                  message = "Unable to connect to "+data.name+".";
                  childElement.resetState();
                }
                self.notifyView = new NotifyView({msg: message , type: 'warning'});
                app.router.selectView(self.notifyView);
                clearTimeout(connectionTimeout);
                break;

              default:
                app.eventManager.off('astrobox:InternetConnectingStatus', connectionCb, this);
                self.notifyView = new NotifyView({msg: 'Unable to connect to ' + data.name , type: 'error'});
                app.router.selectView(self.notifyView);
                childElement.resetState();
                clearTimeout(connectionTimeout);
            }
          };

          app.eventManager.on('astrobox:InternetConnectingStatus', connectionCb, this);

        } else if (data.message) {
          self.notifyView = new NotifyView({msg: data.message , type: 'warning'});
          app.router.selectView(self.notifyView);
          childElement.resetState();
        }
      }, this))
      .fail(_.bind(function(){
        self.notifyView = new NotifyView({msg: 'Something went wrong. Try again' , type: 'error'});
        app.router.selectView(self.notifyView);
        childElement.resetState();
      }, this));
  } 
});

var ForgetNetworkView = Backbone.View.extend({
  el: '.forget-network-modal',
  template: _.template( $('#forget-network-modal-template').html() ),
  network: null,
  notifyView: null,
  parent: null,
  events: {
    'click .forget-network-btn': 'forgetNetwork',
    'click .forget-network-cancel-btn': 'closeModal'
  },
  initialize: function(params) {
    /* setting the parent element */
    this.parent = params.parent;
    this.$el.removeClass('hide');
  },
  render: function(wifiInfo) {
    this.$el.html(this.template({
      network: wifiInfo
    }));
  },
  open: function(wifiInfo) {
    /* setting the current network object */
    this.network  = wifiInfo;
    this.render(wifiInfo);
  },
  forgetNetwork: function(e) {
    e.preventDefault();
    this.undelegateEvents();

    var self = this;
    $.ajax({
      url: API_BASEURL + "settings/network/stored-wifi/" + self.network.id,
      type: "DELETE",
      success: function() {
        self.notifyView = new NotifyView({msg: 'Network has been forgotten', type: 'success'});
        app.router.selectView(self.notifyView);

        /* updating the list of wifi after forgetting the stored wifi */
        self.parent.getStoredWifi();
      },
      error: function(xhr) {
        self.notifyView = new NotifyView({msg: xhr.responseText, type: 'warning'});
        app.router.selectView(self.notifyView);
      }
    });

    this.$el.addClass('hide');
  },
  closeModal: function(e) {
    e.preventDefault();
    this.undelegateEvents();

    this.$el.addClass('hide');
  }
});

var AddPasswordModal = Backbone.View.extend({
  el: '.add-password-modal',
  template: _.template( $('#add-password-modal-template').html() ),
  parent: null,
  network: null,
  events: {
    'click button.connect': 'connectClicked',
    'submit form': 'connectClicked',
    'click .cancel-btn--add-password': 'cancelClicked',
    'change .show-password': 'showPassword'
  },
  initialize: function(params) {
    this.parent = params.parent;
    this.parent.$('.section-sub-container--wifi-available').addClass('hide');
    this.parent.$('.cancel-btn').addClass('hide');
    this.$el.removeClass('hide');
    this.$('.network-password-field').focus();
  },
  render: function(wifiInfo) {
    this.$el.html(this.template({
      network: wifiInfo
    }));
  },
  open: function(wifiInfo) {
    this.network  = wifiInfo;
    this.render(wifiInfo);
    // console.log(this.network);
  },
  connectClicked: function(e) {
    e.preventDefault();
    this.undelegateEvents();

    var form = this.$el.find('form');
    var id = form.find('.network-id-field').val();
    var password = form.find('.network-password-field').val();

    // console.log({
    //   id: id,
    //   password: password
    // });

    this.parent.doConnect(id, password, this);
    this.$('.fa-spinner--add-password').removeClass('hide');
    this.$('button').addClass('disable-btn');
  },
  cancelClicked: function(e) {
    e.preventDefault();
    this.undelegateEvents();

    this.resetState();
  },
  showPassword: function(e) {
    var target = $(e.currentTarget);
    var checked = target.is(':checked');
    var field = this.$('input[name=password]');

    if (checked) {
      field.attr('type', 'text');
    } else {
      field.attr('type', 'password');
    }
  },
  randomCall: function(data) {
    // console.log(data);
  },
  resetState: function() {
    this.$el.addClass('hide');
    this.parent.$('.section-sub-container--wifi-available').removeClass('hide');
    this.parent.$('.cancel-btn').removeClass('hide');
    this.$('.fa-spinner--add-password').addClass('hide');
    this.$('button').removeClass('disable-btn');
  },
  successState: function() {
    this.$el.addClass('hide');
    this.$('.fa-spinner--add-password').addClass('hide');
    this.$('button').removeClass('disable-btn');
    this.parent.$('.section-sub-container--checking-available').removeClass('hide');
    this.parent.$('.stored-wifi-list-section').removeClass('hide');
    this.parent.$('.add-new-wifi-section').addClass('hide');
    this.parent.$('.back-button').removeClass('hide');
    this.parent.$('.cancel-btn').addClass('hide');
    this.parent.getStoredWifi();
  }
});