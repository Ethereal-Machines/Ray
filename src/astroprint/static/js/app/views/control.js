/*
 *  (c) 3DaGoGo, Inc. (product@astroprint.com)
 *
 *  Distributed under the GNU Affero General Public License http://www.gnu.org/licenses/agpl.html
 */

/*############################
## TEMPERATURE VIEW CONTROL ##
##############################*/

// Dependency: /models/printerprofile.js, /widgets/tempbarview.js
// this object is being extended by the sub part 'TempView'

/* Comment-change#1 */
var TempBarVerticalView = TempBarView.extend({
  containerDimensions: null,
  scale: null, // array of the values coming from the printer profile
  type: null,
  dragging: false,
  events: _.extend(TempBarView.prototype.events, {
    /*
    * We have two different events here,
    * 1) When the .temp-bar is clicked
    * 2) When the off button is pressed
    */
    'click .temp-bar': 'onClicked',
    'click button.temp-off': 'turnOff'
  }),
  // this function is for sliding the 'temp-target' on the temp-bar
  // this part will not be included in the new UI but a progress bar
  // showing the increasing temp will be needed to display
  setHandle: function(value)
  {
    if (!this.dragging) {
      var position = this._temp2px(value);
      var handle = this.$el.find('.temp-target');

      // temp-target will move immediately when the value of temp is added
      handle.css({transition: 'top 0.5s'});
      handle.css({top: position + 'px'});

      // 'target-value' is the field where we input the temperature value
      handle.find('span.target-value').text(value);
      setTimeout(function() {
        handle.css({transition: ''});
      }, 800);
    }
  },
  onTouchMove: function(e)
  {
    // console.log(this);
    if (this.dragging) {
      e.preventDefault();
      e.stopPropagation();
      var target = this.$('.temp-target');

      if (e.type == 'mousemove') {
        var pageY = e.originalEvent.pageY;
      } else {
        var pageY = e.originalEvent.changedTouches[0].clientY + $(document).scrollTop();
      }

      var newTop = pageY - this.containerDimensions.top - target.innerHeight()/2.0;

      newTop = Math.min(Math.max(newTop, 0), this.containerDimensions.maxTop );

      target.css({top: newTop+'px'});
      target.find('span.target-value').text(this._px2temp(newTop));
    }
  },

  // callback function for handling the 'click' event on the 'temp-bar'
  onClicked: function(e)
  {
    e.preventDefault();
    var target = this.$el.find('.temp-target');
    console.log(target);
    var newTop = e.pageY - this.containerDimensions.top - target.innerHeight()/2.0;

    newTop = Math.min( Math.max(newTop, 0), this.containerDimensions.maxTop );
    // console.log(newTop);

    var temp = this._px2temp(newTop);

    this.setHandle(temp);
    this._sendToolCommand('target', this.type, temp);
  },
  onResize: function()
  {
    var container = this.$el.find('.temp-bar');
    var handle = container.find('.temp-target');
    var label = container.find('label');

    var height = container.height();
    var maxTop = height - handle.innerHeight() - label.innerHeight();

    this.containerDimensions = {
      top: container.offset().top,
      height: height,
      maxTop: maxTop,
      px4degree: maxTop / (this.scale[1] - this.scale[0])
    };
  },

  // this function will render the actual increasing temperature 
  renderTemps: function(actual, target)
  {
    var handleHeight = this.$el.find('.temp-target').innerHeight();

    if (actual !== null) {
      // changing the value of rising temp on the 'current-temp-top'
      this.$el.find('.current-temp-top').html(Math.round(actual)+'&deg;');

      // moving the horizontal bar based on the rising temperature
      // In new UI we will need to show this part as a progress bar
      this.$el.find('.current-temp').css({top: (this._temp2px(actual) + handleHeight/2 )+'px'});
    }

    if (target !== null) {
      this.setHandle(Math.min(Math.round(target), this.scale[1]));
    }
  },

  /*
  function for getting the values in pixel to move the slider to the same amount
  */
  _temp2px: function(temp)
  {
    var px = temp * this.containerDimensions.px4degree;

    return this.containerDimensions.maxTop - px;
  },

  /*
  this function will convert the pixel to the temperature
  */
  _px2temp: function(px)
  {
    return Math.round( ( (this.containerDimensions.maxTop - px) / this.containerDimensions.px4degree ) );
  }
});

// this object is controlling the temperature of bed and nozzle
// Basically this view is reponsible for preheating process

/* Comment-change#1 */
var TempView = Backbone.View.extend({
  el: '#temp-control',
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

    // creating the new instance for controlling the bed temp-bar
    this.bedTempBar = new TempBarVerticalView({
      scale: [0, app.printerProfile.get('max_bed_temp')],
      el: this.$el.find('.temp-control-cont.bed'),
      type: 'bed'
    });

    this.render();
  },
  render: function()
  {
    // Referencing the 'models/printerprofile.js' file to get the data
    var profile = app.printerProfile.toJSON();

    // console.log(profile);
    // console.log(this);

    // here we are setting the nozzleTempBar temperature to the max-nozzle-temp
    // from the 'printerprofile'
    this.nozzleTempBar.setMax(profile.max_nozzle_temp);

    if (profile.heated_bed) {
      // setting the bed temperature to the max-bed-temp form the printerprofile
      this.bedTempBar.setMax(profile.max_bed_temp);
      this.bedTempBar.$el.removeClass('disabled');
    } else {
      this.bedTempBar.$el.addClass('disabled');
    }
  },

  // this function is having dependecies with: "router.js"
  resetBars: function()
  {
    this.nozzleTempBar.onResize();
    this.bedTempBar.onResize();
  },

  // this function is not having dependencies to outer js file
  // this function is responsible for setting the nozzle and bed temperature
  updateBars: function(value)
  {
    if (value.extruder) {
      this.nozzleTempBar.setTemps(value.extruder.actual, value.extruder.target);
    }

    if (value.bed) {
      this.bedTempBar.setTemps(value.bed.actual, value.bed.target);
    }
  }
});

/*#####################
## XY-Z CONTROL PANEL #
#######################*/

// this 'view' is reponsible for setting the distance to move when the extruder moves
// based on the click on the control panel in X, Y and Z directions correspondingly

/*
  Currently we are selecting a particular value and for all the directions this value
  be set. (5mm slelected means: click X --move 5 mm, click Y --move 5mm, click Z --move 5mm)
  
  In the new UI, we want to set the different values to the different directions
*/
var DistanceControl = Backbone.View.extend({
  el: '#distance-control',
  selected: 10, // this is the default value which we have set initially. we can change this
  events: {
    'click button': 'selectDistance' // this is the function which will be envoked on the click event
  },
  selectDistance: function(e)
  {
    var el = $(e.currentTarget); // this will get the target button which we hit
    // console.log(el);
    // this is removing the 'success' from other and adding the secondary class to the other
    this.$el.find('.success').removeClass('success').addClass('secondary');
    el.addClass('success').removeClass('secondary'); // then again adding the 'success' to itself

    // here we are setting the value of 'selected' property based on the value choosed
    this.selected = el.attr('data-value');
  }
});

// this 'view' is reponsible for the movents on x,y and z directions
// the subviews are 'XYControlView' and 'ZControlView' which are
// extending this view
var MovementControlView = Backbone.View.extend({
  distanceControl: null,
  printerProfile: null,
  initialize: function(params)
  {
    // console.log("I got a call for initialization");
    // console.log(params);
    this.distanceControl = params.distanceControl;
    // console.log(this.distanceControl);
  },

  // here we are sending a POST request whenever a jogging button in clicked
  sendJogCommand: function(axis, multiplier, distance)
  {
    if (typeof distance === "undefined")
      distance = 10;

    var data = {
      "command": "jog"
    }
    data[axis] = distance * multiplier;

    $.ajax({
      url: API_BASEURL + "printer/printhead",
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify(data)
    });
  },

  // here we are sending the POST request whenever a home button in clicked
  sendHomeCommand: function(axis)
  {
    var data = {
      "command": "home",
      "axes": axis
    }

    $.ajax({
      url: API_BASEURL + "printer/printhead",
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify(data)
    });
  }
});

// this 'view' is reponsible to handle the click events on the xy controller
var XYControlView = MovementControlView.extend({
  el: '#xy-controls',
  events: {
    'click .control_btn_x_plus': 'xPlusTapped',
    'click .control_btn_x_minus': 'xMinusTapped',
    'click .control_btn_y_plus': 'yPlusTapped',
    'click .control_btn_y_minus': 'yMinusTapped',
    'click .home_z': 'homeTapped'
  },

  // call back functions for taking care of the click events on the control keys
  xPlusTapped: function()
  { 
    console.log(this);
    // console.log(this.distanceControl.selected);
    this.sendJogCommand('x', 1, this.distanceControl.selected);
  },
  xMinusTapped: function()
  {
    this.sendJogCommand('x', -1, this.distanceControl.selected);
  },
  yPlusTapped: function()
  {
    this.sendJogCommand('y', 1, this.distanceControl.selected);
  },
  yMinusTapped: function()
  {
    this.sendJogCommand('y', -1, this.distanceControl.selected);
  },
  homeTapped: function()
  {
    if (!app.socketData.get('paused')) {
      this.sendHomeCommand(['x', 'y']);
    }
  }
});

// this view is responsible to handle the click events on the z-control of printer
var ZControlView = MovementControlView.extend({
  el: '#z-controls',
  events: {
    'click .control_btn_z_plus': 'zPlusTapped',
    'click .control_btn_z_minus': 'zMinusTapped',
    'click .home_z': 'homeTapped'
  },
  zPlusTapped: function()
  {
    this.sendJogCommand('z', 1, this.distanceControl.selected);
  },
  zMinusTapped: function()
  {
    this.sendJogCommand('z', -1 , this.distanceControl.selected);
  },
  homeTapped: function()
  {
    if (!app.socketData.get('paused')) {
      this.sendHomeCommand('z');
    }
  }
});


/*#######################
## EXTRUSION CONTROL ####
#########################*/

// this 'view' is responsible for the 'extrusion' processs
// We will need to map the below JS with our new UI

/* Comment-change#1 */
var ExtrusionControlView = Backbone.View.extend({
  el: '#extrusion-control',
  template: null,
  events: {
    /* below 2 events will be fired when the user clicks the extrude or retract*/
    'click .extrude': 'extrudeTapped',
    'click .retract': 'retractTapped',
    'change .extrusion-length': 'lengthChanged',
    'change .extrusion-speed': 'speedChanged',
    'keydown input.back-to-select': 'onKeyDownBackToSelect'
  },
  initialize: function()
  {
    // getting the subtemplate to be attached in the parent template
    this.template = _.template( this.$("#extruder-switch-template").html() );
    this.render(); // calling the 'render' function of the View
  },
  render: function()
  {
    // getting the printer profile
    var printer_profile = app.printerProfile.toJSON();

    // attaching the child template to the parent template
    this.$('.row.extruder-switch').html(this.template());

    if (printer_profile.extruder_count > 1) {
      /*
      * if extruder count is more than 1, then we are going to add
      * another event to the event list and also added the event handler function
      * "extruderChanged"
      */
      this.events['change .extruder-number'] = "extruderChanged";
    }

    this.delegateEvents(this.events);
  },

  /* Below function is the callback when the extrude button is tapped */
  extrudeTapped: function()
  {
    if (this._checkAmount()) { // checking the value of extrude amount
      // sending the POST request to the server for starting the extrusion
      this._sendExtrusionCommand(1);
    }
  },

  /* Below function is the callback when the retract button is tapped */
  retractTapped: function()
  {
    if (this._checkAmount()) { // checking the value of the extrude amount
      // sending the POST request to the server for starting the retraction
      this._sendExtrusionCommand(-1);
    }
  },

  // This function is reponsible to get the value from the UI if the 
  // Other option is selected for AMOUT
  lengthChanged: function(e)
  {
    var elem = $(e.target);
    if (elem.val() == 'other') {
      elem.addClass('hide');
      this.$('.other-length').removeClass('hide').find('input').focus().select();
    } else {
      this.$('input[name="extrusion-length"]').val(elem.val());
    }
  },

  // if Other option is selected for SPEED
  speedChanged: function(e)
  {
    var elem = $(e.target);

    if (elem.val() == 'other') {
      elem.addClass('hide');
      this.$('.other-speed').removeClass('hide').find('input').focus().select();
    } else {
      this.$('input[name="extrusion-speed"]').val(elem.val());
    }
  },

  /* Callback function in case we have more than 1 extruder */
  extruderChanged: function(e)
  {
    this._sendChangeToolCommand($(e.target).val())
  },

  /*
    In case while selecting the 'Other' options from the SPEED or AMOUNT, we didn't enter
    any custom value and pressed the ESC key, then the below function is responsible to
    set the things back to the default.
  */
  onKeyDownBackToSelect: function(e)
  {
    if (e.keyCode == 27) { //ESC Key
      var target = $(e.currentTarget);
      console.log(target);
      var select = target.closest('div.select-with-text').find('select');

      //Find out the default value. Middle one
      var defaultValue = select.find('option[default]').val();

      target.closest('.row').addClass('hide');
      target.val(defaultValue);
      select.removeClass('hide').val(defaultValue);
    }
  },

  // function to send the POST request when tool changes
  _sendChangeToolCommand: function(tool)
  {
    var data = {
      command: "select",
      tool: 'tool'+tool
    }

    $.ajax({
      url: API_BASEURL + "printer/tool",
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify(data)
    });
  },
  _checkAmount: function()
  {
    // this is checking the value of exturedAmount from the input
    return !isNaN(this.$el.find('input[name="extrusion-length"]').val());
  },

  /* This function will send the POST request to the server for starting
  the extrusion process 
  */
  _sendExtrusionCommand: function(direction)
  {
    // this is the data to be send to the server in the POST request

    console.log("Extrusion length: " + this.$('input[name="extrusion-length"]').val() * direction);
    console.log("Extrusion speed: " + this.$('input[name="extrusion-speed"]').val());

    var data = {
      command: "extrude",
      amount: parseFloat(this.$('input[name="extrusion-length"]').val() * direction),
      speed: parseFloat(this.$('input[name="extrusion-speed"]').val())
    }

    // this value will only come if there will be more than 1 extruder
    var extruder = this.$('select.extruder-number').val();

    if (extruder) {
      data['tool'] = 'tool'+extruder;
    }

    $.ajax({
      url: API_BASEURL + "printer/tool",
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify(data)
    });
  }
});

/*###############
## FAN CONTROL ##
#################*/

// this 'view' is responsible for the 'Fan Controling part'
// As of now this part is not included in the new UI

/* Comment-change#1 */
var FanControlView = Backbone.View.extend({
  el: '#temp-control .fan-control',
  events: {
    'click button.fan-on': "fanOn",
    'click button.fan-off': "fanOff"
  },
  fanOn: function()
  {
    this._setFanSpeed(255);
    this.$('.fan_icon').addClass('animate-spin');
  },
  fanOff: function()
  {
    this._setFanSpeed(0);
    this.$('.fan_icon').removeClass('animate-spin');
  },
  _setFanSpeed: function(speed)
  {
    var data = {
      command: "set",
      tool: 0,
      speed: speed
    }

    $.ajax({
      url: API_BASEURL + "printer/fan",
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify(data)
    });
  }
});


// This 'view' will initialize all the parent views in the
// 'control-view' section
// this 'ControlView' ConstructorFunction will be called through the 'router.js' file
var ControlView = Backbone.View.extend({
  el: '#control-view',
  events: {
    'click .back-to-print button': 'resumePrinting',
    'show': 'render'
  }, // 'back-to-print' class is used to resume the printing
  template: null,
  tempView: null,
  distanceControl: null,
  xyControlView: null,
  zControlView: null,
  extrusionView: null,
  fanView: null,
  initialize: function(options)
  {
    /*
      Since the views will access the DOM, we have to initialize as well as
      render the templates before initializing any other instances of different
      views.
    */
 
    // here we have created the new instances for all the views on the #control-page

    // this.tempView = new TempView(); /* Comment-change#1 */
    // this.distanceControl = new DistanceControl();
    // this.xyControlView = new XYControlView({distanceControl: this.distanceControl});
    // this.zControlView = new ZControlView({distanceControl: this.distanceControl});
    // this.extrusionView = new ExtrusionControlView(); /* Comment-change#1 */
    // this.fanView = new FanControlView(); /* Comment-change#1 */

    // this function is listening for the 'temps' to be changed, and once it changes
    // it use to call the 'updateTemps' function and that ultimately call the 
    // 'updateBars' function to display the change in temperature
    this.listenTo(app.socketData, 'change:temps', this.updateTemps);
    this.listenTo(app.socketData, 'change:paused', this.onPausedChanged);
  },

  // this is responsible for updating the temp on the bars when the panel is initialized
  updateTemps: function(s, value)
  {
    if (!this.$el.hasClass('hide')) {
      this.tempView.updateBars(value);
    }
  },

  // this is the render function for the controlView. It will initialized all the
  // render function for the child views
  render: function()
  {

    this.onPausedChanged(app.socketData, app.socketData.get('paused'));

    // this.extrusionView.render(); /* Comment-change#1 */
    // this.tempView.render(); /* Comment-change#1 */
    this.changeTemplate();
  },
  // function for checking validating and rendering the selected template
  changeTemplate: function() {

    /* Added conditions to render the particular Utility based on the click from Utility page */

    if (this.buttonName === "Manual_Controls_Button") {

      this.setTemplate(this.$("#xyz-controls-template").html(), null);
      this.distanceControl = new DistanceControl();
      this.xyControlView = new XYControlView({distanceControl: this.distanceControl});
      this.zControlView = new ZControlView({distanceControl: this.distanceControl});

    } else if (this.buttonName === "Filament_Button"){

      this.setTemplate(this.$("#filament-template").html(), {profile: app.printerProfile.toJSON()});
      this.extrusionView = new ExtrusionControlView();

    } else if (this.buttonName === "Level_Bed_Button") {

      this.setTemplate( "<h1 align='center'> No template for the Automatic Bed Levling </h1>", null);

    } else {

      this.setTemplate( this.$("#pre-heat-template").html(), null);
      this.tempView = new TempView();
      this.fanView = new FanControlView();
    }

    /* Initializing the Views when the selected template has been rendered */

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
