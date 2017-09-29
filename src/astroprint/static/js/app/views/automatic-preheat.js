/*********************************
* Code by Kanishka Mohan Madhuni *
**********************************/

var TempFilamentLoadPreheatView = Backbone.View.extend({
  el: '#filament-load-wizard__temp-control',
  nozzleTempBar: null,
  initialize: function(){ 

var TempFilamentLoadPreheat = TempBarView.extend({
  containerDimensions: null,
  scale: null, // array of the values coming from the printer profile
  type: null,
  dragging: false,
  // adding 'value' property to hold the object when the temperature updates
  value: null,
  events: _.extend(TempBarView.prototype.events, {
    'click button.temp-off': 'turnOff'
  }),
  setHandle: function(value){
    if (!this.dragging) {
      var handle = this.$el.find('.temp-target');
      handle.find('span.target-value').text(value);
    }
  },
  renderTemps: function(actual, target){
    if (actual !== null) {
      this.$el.find('.current-temp-top').html(Math.round(actual)+'&deg;');
    }
    if (target !== null) {
      this.setHandle(Math.min(Math.round(target), this.scale[1]));
    }
  },
});

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