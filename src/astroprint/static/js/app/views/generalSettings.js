/*********************************
* Code by Kanishka Mohan Madhuni *
**********************************/

var GeneralSettingsView = Backbone.View.extend({
  el: '#general-settings-view',
  printerProfile: null,
  events: {
    'click .btn--pla': 'plaSettings',
    'click .btn--abs': 'absSettings'
  },
  initialize: function() {
    this.printerProfile = app.printerProfile;
    this.listenTo(app.printerProfile, 'change:nozzle1Temp', this.changeProfile);
    this.listenTo(app.printerProfile, 'change:nozzle2Temp', this.changeProfile);
    this.listenTo(app.printerProfile, 'change:bedTemp', this.changeProfile);
  },
  plaSettings: function(e) {
    var btn = $(e.currentTarget);
    btn.addClass('selected');
    this.$('.btn--abs').removeClass('selected');

    app.printerProfile.set('nozzle1Temp', '215');
    app.printerProfile.set('nozzle2Temp', '215');
    app.printerProfile.set('bedTemp', '72');
    
    console.log(app.printerProfile);
  },
  absSettings: function(e) {
    var btn = $(e.currentTarget);
    btn.addClass('selected');
    this.$('.btn--pla').removeClass('selected');

    app.printerProfile.set('nozzle1Temp', '235');
    app.printerProfile.set('nozzle2Temp', '235');
    app.printerProfile.set('bedTemp', '90');

    console.log(app.printerProfile);
  },
  changeProfile: function() {
    this.$('.extruder-1-temp').text(app.printerProfile.get('nozzle1Temp'));
    this.$('.extruder-2-temp').text(app.printerProfile.get('nozzle2Temp'));
    this.$('.bed-temp').text(app.printerProfile.get('bedTemp'));
  }
});