var WifiView = Backbone.View.extend({
  el: '#wifi-view',
  storedWifi: null,
  storedWifiTemplate: _.template( $('#stored-wifi-list-template').html() ),
  events: {},
  initialize: function() {
    console.log('WifiView is initialized');
  },
  getStoredWifi: function() {
    var self = this;
    $.ajax({
      url: API_BASEURL + 'settings/network',
      method: 'GET',
      dataType: 'json',
      success: function(data) {
        // console.log(data);
        self.storedWifi = data.storedWifiNetworks;
        self.getStoredWifiStatus();
        self.showStoredWifi();
        console.log(self.storedWifi);
      },
      error: function(xhr) {
        console.log(xhr);
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
        console.log(networkObj);
      }
    }

    var forgetNetworkModal = new ForgetNetworkView(networkObj);

  }
});

var ForgetNetworkView = Backbone.View.extend({
  el: '.forget-network-modal',
  template: _.template( $('#forget-network-modal-template').html() ),
  network: null,
  notifyView: null,
  events: {
    'click .forget-network-btn': 'forgetNetwork',
    'click .forget-network-cancel-btn': 'closeModal'
  },
  initialize: function(params) {
    this.$el.removeClass('hide');
    this.render(params);
    this.network = params;
  },
  render: function(params) {
    var networkObj = params;
    this.$el.html(this.template({
      network: networkObj
    }));
  },
  forgetNetwork: function() {
    var self = this;
    console.log(self.network.id);
    $.ajax({
      url: API_BASEURL + "settings/network/stored-wifi/" + this.network.id,
      type: "DELETE",
      success: function() {
        self.notifyView = new NotifyView({msg: 'Network has been forgotten', type: 'success'});
        app.router.selectView(self.notifyView);

        // self.wifiView.getStoredWifi();
      },
      error: function(xhr) {
        self.notifyView = new NotifyView({msg: xhr.responseText, type: 'warning'});
        app.router.selectView(self.notifyView);
      }
    });

    this.$el.addClass('hide');
  },
  closeModal: function() {
    this.$el.addClass('hide');
    var self = this;
    console.log(self.network.id);
  }
});

// "421c6674-f6b7-4532-8fdd-cda333a5b3a3"
// "2984df18-002e-4b3e-aef6-09c6af5d5210"
// "b500696b-5c9c-4d7d-8687-0a87f448a8bf"
// "e255f85c-188d-47a5-bc06-d73104d9957e"
// "d2ff355b-8fb6-4753-a536-a03a131e36d4"