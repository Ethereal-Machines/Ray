/*
 *  (c) 3DaGoGo, Inc. (product@astroprint.com)
 *  (c) Kanishka Mohan Madhuni (kmmadhuni@gmail.com)
 *
 *  Distributed under the GNU Affero General Public License http://www.gnu.org/licenses/agpl.html
 */

var TempBarVerticalView = TempBarView.extend({
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
    if (!this.dragging && value !== 0) {
      var handle = this.$el.find('.temp-target');
      handle.find('span.target-value').html(value + " &deg;C");
    }
  },
  renderTemps: function(actual, target){
    if (actual !== null) {
      // this.$el.find('.current-temp-top').html(Math.round(actual)+'&deg;');
    }
    if (target !== null) {
      this.setHandle(Math.min(Math.round(target), this.scale[1]));
    }
  },
});

var TempView = Backbone.View.extend({
  el: '#temp-control',
  extraTempBar: null,
  nozzleTempBar: null,
  bedTempBar: null,
  initialize: function()
  { 
    // creating the new instance for controlling the nozzle temp-bar
    this.nozzleTempBar = new TempBarVerticalView({
      scale: [0, app.printerProfile.get('max_nozzle_temp')],
      el: this.$el.find('.temp-control-cont.nozzle'),
      type: 'tool0'
    });

    this.extraTempBar = new TempBarVerticalView({
      scale: [0, app.printerProfile.get('max_nozzle_temp')],
      el: this.$el.find('.temp-control-cont.nozzle1'),
      type: 'tool1'
    });

    // creating the new instance for controlling the bed temp-bar
    this.bedTempBar = new TempBarVerticalView({
      scale: [0, app.printerProfile.get('max_bed_temp')],
      el: this.$el.find('.temp-control-cont.bed'),
      type: 'bed'
    });

    this.render();
  },
  render: function(){
    var profile = app.printerProfile.toJSON();

    // here we are setting the nozzleTempBar temperature to the max-nozzle-temp from the 'printerProfile'
    this.nozzleTempBar.setMax(profile.max_nozzle_temp);
    this.extraTempBar.setMax(profile.max_nozzle_temp);

    if (profile.heated_bed) {
      // setting the bed temperature to the max-bed-temp form the printerprofile
      this.bedTempBar.setMax(profile.max_bed_temp);
      this.bedTempBar.$el.removeClass('disabled');
    } else {
      this.bedTempBar.$el.addClass('disabled');
    }
  },
  // this function is responsible for setting the nozzle and bed temperature
  updateBars: function(value)
  {
    if (value.extruder) {
      this.nozzleTempBar.setTemps(value.extruder.actual, value.extruder.target);
    }

    if (value.extra) {
      this.extraTempBar.setTemps(value.extra.actual, value.extra.target);
    }

    if (value.bed) {
      this.bedTempBar.setTemps(value.bed.actual, value.bed.target);
    }
  }
});

var ExtrusionControlView = Backbone.View.extend({
  el: "#extrusion-control",
  initialize: function() {},
  render: function() {}
});


// This 'view' will initialize all the parent views in the
// 'control-view' section
// this 'ControlView' ConstructorFunction will be called through the 'router.js' file
var ControlView = Backbone.View.extend({
  el: '#control-view',
  events: {
    'click .back-to-print button': 'resumePrinting',
    'show': 'render',
    'click .next-button--start-preheating': 'triggerPreheating'
  }, // 'back-to-print' class is used to resume the printing
  template: null,
  tempView: null,
  distanceControl: null,
  xyControlView: null,
  zControlView: null,
  extrusionView: null,
  fanView: null,
  filamentLoadPreheatView: null,
  filamentUnloadPreheatView: null,
  initialize: function(options){
    this.listenTo(app.socketData, 'change:temps', this.updateTemps);
    this.listenTo(app.socketData, 'change:paused', this.onPausedChanged);
  },
  updateTemps: function(s, value){
    this.value = value;
    if (!this.$el.hasClass('hide')) {
      if (this.tempView !== null) {
        this.tempView.updateBars(value);
      }
    }

    // Updating the Acutal and target temperature on the filament load and unload wizard
    if (this.filamentLoadPreheatView !== null) {
      this.filamentLoadPreheatView.updateBars(value);
    }

    if (this.filamentUnloadPreheatView !==null) {
      this.filamentUnloadPreheatView.updateBars(value);
    }
  },
  render: function() {
    this.onPausedChanged(app.socketData, app.socketData.get('paused'));
    this.changeTemplate();
  },
  triggerPreheating: function(e) {
    var parent = $(e.target)[0].parentElement;
    var extruder = $(parent).find('.temp-control-items--extruder').find('.target-value').text();
    var extra = $(parent).find('.temp-control-items--extra').find('.target-value').text();

    var bed = $(parent).find('.temp-control-items--bed').find('.target-value').text();
    this.tempView.extraTempBar.startPreheating(parseInt(extra.substr(0, extra.length - 3)));
    this.tempView.nozzleTempBar.startPreheating(parseInt(extruder.substr(0, extruder.length - 3)));
    this.tempView.bedTempBar.startPreheating(parseInt(bed.substr(0, bed.length - 3)));
  },
  // function for checking validating and rendering the selected template
  changeTemplate: function() {
    /* Added conditions to render the particular Utility based on the click from Utility page */
    var navHeading = this.$('.wizard-name');
    if (this.buttonName === "Manual_Controls_Button") {
      navHeading.text('Manual Controls');
      this.setTemplate(this.$("#xyz-controls-template").html(), null);
      this.distanceControl = new DistanceControl();
      this.xyControlView = new XYControlView({distanceControl: this.distanceControl});
      this.zControlView = new ZControlView({distanceControl: this.distanceControl});

    } else if (this.buttonName === "Filament_Button"){
      navHeading.text('Filament Utilities');
      this.setTemplate(this.$("#filament-template").html(), {profile: app.printerProfile.toJSON()});
      this.extrusionView = new ExtrusionControlView();

    } else if (this.buttonName === "Level_Bed_Button") {

      this.setTemplate( "<h1 align='center'> No template for the Automatic Bed Levling </h1>", null);

    } else if (this.buttonName === "Preheat_Button"){
      navHeading.text('Preheat');
      this.setTemplate( this.$("#pre-heat-template").html(), null);
      this.tempView = new TempView();
    }
  },
  /*
    function to set the template of Control View.
    The 'params' argument is the JSON object which we want to use in the template/child template.
    We will need to pass the model object in the parent object itself if we want to catch the
    values in the 'child' template
  */
  setTemplate: function(template, params) {
    this.template = _.template(template); 
    this.$('#manual-container').html(this.template(params));
  },
  resumePrinting: function(e)
  {
    app.setPrinting();
    app.router.navigate("printing", {replace: true, trigger: true});
    app.router.printingView.togglePausePrint(e);

    this.$el.addClass('hide');
  },
  onPrintingProgressChanged: function(model, printingProgress)
  {
    var el = this.$('.back-to-print .filename');

    if (printingProgress && printingProgress.printFileName && printingProgress.printFileName != el.text()) {
      el.text(printingProgress.printFileName)
    }
  },
  onPausedChanged: function(model, paused)
  {
    if (paused) {
      this.listenTo(app.socketData, 'change:printing_progress', this.onPrintingProgressChanged);
      this.$el.addClass('print-paused');
    } else {
      this.stopListening(app.socketData, 'change:printing_progress');

      if (app.socketData.get('printing')) {
        app.router.navigate("printing", {replace: true, trigger: true});
      } else {
        this.$el.removeClass('print-paused');
      }
    }
  }
});
