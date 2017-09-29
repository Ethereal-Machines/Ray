/*********************************
* Code by Kanishka Mohan Madhuni *
**********************************/

var TempFilamentLoadPreheatView = Backbone.View.extend({
  el: '#filament-load-wizard__temp-control',
  nozzleTempBar: null,
  initialize: function(){ 
    // creating the new instance for controlling the nozzle temp-bar
    this.nozzleTempBar = new TempBarVerticalView({
      scale: [0, app.printerProfile.get('max_nozzle_temp')],
      el: this.$el.find('.temp-control-cont.nozzle'),
      type: 'tool0'
    });

    this.render();
  },
  render: function(){
    var profile = app.printerProfile.toJSON();
    // here we are setting the nozzleTempBar temperature to the max-nozzle-temp from the 'printerProfile'
    this.nozzleTempBar.setMax(profile.max_nozzle_temp);
  },
  // this function is responsible for setting the nozzle and bed temperature
  updateBars: function(value){
    if (value.extruder) {
      this.nozzleTempBar.setTemps(value.extruder.actual, value.extruder.target);
    }
  }
});

var TempFilamentUnloadPreheatView = Backbone.View.extend({
  el: '#filament-unload-wizard__temp-control',
  nozzleTempBar: null,
  initialize: function(){ 
    // creating the new instance for controlling the nozzle temp-bar
    this.nozzleTempBar = new TempBarVerticalView({
      scale: [0, app.printerProfile.get('max_nozzle_temp')],
      el: this.$el.find('.temp-control-cont.nozzle'),
      type: 'tool0'
    });

    this.render();
  },
  render: function(){
    var profile = app.printerProfile.toJSON();
    // here we are setting the nozzleTempBar temperature to the max-nozzle-temp from the 'printerProfile'
    this.nozzleTempBar.setMax(profile.max_nozzle_temp);
  },
  // this function is responsible for setting the nozzle and bed temperature
  updateBars: function(value){
    if (value.extruder) {
      this.nozzleTempBar.setTemps(value.extruder.actual, value.extruder.target);
    }
  }
});