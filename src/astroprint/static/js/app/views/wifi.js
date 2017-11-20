/**********************************
* Code by Kanishka Mohan Madhuni *
**********************************/

var WifiView = Backbone.View.extend({
  el: '#wifi-view',
  storedWifi: null,
  storedWifiTemplate: _.template( $('#stored-wifi-list-template').html() ),
  notifyView: null,
  loadingStatus: null,
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
      this.$('.section-sub-container--wifi-available').removeClass('hide').addClass('active');
    } else {
      this.$('.section-sub-container--no-wifi').removeClass('hide').addClass('active');
      this.$('.section-sub-container--wifi-available').removeClass('active').addClass('hide');
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