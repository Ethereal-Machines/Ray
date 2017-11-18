var ConnectivityView = Backbone.View.extend({
  el: '#connectivity-view',
  events: {},
  currentSettings: null,
  initialize: function() {
    console.log('ConnectivityView is initialized');
  },
  getWifiSettings: function() {
    var self = this;
    $.ajax({
      url: API_BASEURL + 'settings/network',
      method: 'GET',
      dataType: 'json',
      success: function(data) {
        console.log(data);
        self.currentSettings = data;
        self.checkCurrentStatus();
      },
      error: function(xhr) {
        console.log(xhr);
      }
    });
  },
  checkCurrentStatus: function() {
    if (this.currentSettings.networks.wired != null) {
      this.$('.lan-connectivity__status').text('LAN Connected');
    }

    if (this.currentSettings.networks.wireless != null) {
      var networkName = this.currentSettings.networks.wireless.name;
      this.$('.wifi-connectivity__status').text('Connected to ' + networkName);
    }
  },
  getWifiList: function() {
    $.ajax({
      url: API_BASEURL + 'settings/network/wifi-networks',
      method: 'GET',
      dataType: 'json',
      success: function(data) {
        console.log(data);
      },
      error: function(xhr) {
        console.log(xhr);
      }
    });
  }
});

// settings/network/name
// settings/network/active
// settings/network/stored-wifi/