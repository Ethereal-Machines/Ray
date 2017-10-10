/*
  Commenting the below initialization code as we are not using the Uploading feature in new UI
*/
var HomeView = Backbone.View.extend({
  el: '#home-view',
  uploadBtn: null,
  events: {
    'show': 'onShow',
    'click .new-release a.check': 'onReleaseInfoClicked',
    'click .new-release a.close': 'onCloseReleaseInfoClicked',
    'click .power-button': 'onPowerClicked',
    'click .power-off-modal': 'closePowerModal',
    'click .power-off-modal__button-container': 'noHideModel',
    'click .power-off-button': 'doTurnoff'
  },
  initialize: function() {
    this.listenTo(app.printerProfile, 'change:driver', this.onDriverChanged);
    this.onDriverChanged(app.printerProfile, app.printerProfile.get('driver'));

    this.listenTo(app.socketData, 'new_sw_release', _.bind(function(data){
      this.$('.new-release .version-label').text(data.release.major+'.'+data.release.minor+'('+data.release.build+')');
      this.$('.new-release').removeClass('hide');
    }, this));
  },
  onDriverChanged: function(model, newDriver) {
    if (newDriver == 'marlin') {
      this.$("#app-container ul li.gcode-terminal-app-icon").removeClass('hide');
    } else {
      this.$("#app-container ul li.gcode-terminal-app-icon").addClass('hide');
    }
  },
  onReleaseInfoClicked: function(e) {
    e.preventDefault();
    if (!app.router.settingsView) {
      app.router.settingsView = new SettingsView();
    }

    app.router.settingsView.subviews['software-update'].onCheckClicked(e);
  },
  onCloseReleaseInfoClicked: function(e) {
    e.preventDefault();
    this.$('.new-release').remove()
  },
  onPowerClicked: function() {
    this.$('.power-off-modal').removeClass('hide');
  },
  closePowerModal: function() {
    this.$('.power-off-modal').addClass('hide');
  },
  noHideModel: function(e) {
    e.stopPropagation();
  },
  doTurnoff: function() {
    console.log("Turn off button is clicked");
    console.log(API_BASEURL);
    var data = {"action": "shutdown"};
    $.ajax({
      url: API_BASEURL + "system",
      type: "POST",
      dataType: 'json',
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify(data)
    })
    .success(console.log("This is the success part"))
    .error(console.log("Fail to shutdown"));
  }
});
