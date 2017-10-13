/*********************************
* Code by Kanishka Mohan Madhuni *
**********************************/

/*******************
* Distance Control *
*********************/

var DistanceControl = Backbone.View.extend({
  el: '.distance-control',
  events: {
    'change .x-length-changed': 'xSelectedDistance',
    'change .y-length-changed': 'ySelectedDistance',
    'change .z-length-changed': 'zSelectedDistance'
  },
  /* Below we have set the default values for the x, y and z distance selector */
  xSelected: 3,
  ySelected: 3,
  zSelected: 1,

  /* Below functions will be triggered when the distance for the x, y or z get changed */
  xSelectedDistance: function(e) {
    var elem = $(e.target);
    this.xSelected = elem.val();
    // console.log("The value of the x is being changed to : " + this.xSelected);
  },
  ySelectedDistance: function(e) {
    var elem = $(e.target);
    this.ySelected = elem.val();
    // console.log("The vlaue of the y is being changed to : " + this.ySelected);
  },
  zSelectedDistance: function(e) {
    var elem = $(e.target);
    this.zSelected = elem.val();
    // console.log("The value of the z is being changed to : " + this.zSelected);
  }
});

/************************
* Movement Control View *
*************************/

var MovementControlView = Backbone.View.extend({
  distanceControl: null,
  printerProfile: null,
  initialize: function(params)
  {
    this.distanceControl = params.distanceControl;
  },

  // here we are sending a POST request whenever a jogging button in clicked
  sendJogCommand: function(axis, multiplier, distance)
  {
    if (typeof distance === "undefined")
      distance = 10;

    var data = {
      "command": "jog"
    }
    
    // setting the axis and it's value to the data object
    data[axis] = distance * multiplier;

    console.log(data);
    
    $.ajax({
      url: API_BASEURL + "printer/printhead",
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify(data),
      success: function() {},
      error: function(xhr) {
        console.log("The status code is : " + xhr.status);
        console.log("Msg form the server : " + xhr.responseText);
        console.log("Status text : " + xhr.statusText);
      }
    });
  },

  // here we are sending the POST request whenever a home button in clicked
  sendHomeCommand: function(axis)
  {
    var data = {
      "command": "home",
      "axes": axis
    }

    console.log(data);

    $.ajax({
      url: API_BASEURL + "printer/printhead",
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify(data),
      success: function() {},
      error: function(xhr) {
        console.log("The status code is : " + xhr.status);
        console.log("Msg form the server : " + xhr.responseText);
        console.log("Status text : " + xhr.statusText);
      }
    });
  }
});

/*************************
* XY and Z Control Views *
**************************/

var XYControlView = MovementControlView.extend({
  el: '#xy-controls',
  events: {
    // adding two different events for continuous touch on the X+ button
    // this functionality will be added to all the buttons once tested on printer
    'mousedown .control_btn_x_plus': 'xPlusTapped',
    'mouseup .control_btn_x_plus': 'xPlusReleased',
    'mousedown .control_btn_x_minus': 'xMinusTapped',
    'mouseup .control_btn_x_minus' : 'xMinusReleased',
    'mousedown .control_btn_y_plus': 'yPlusTapped',
    'mouseup .control_btn_y_plus': 'yPlusReleased',
    'mousedown .control_btn_y_minus': 'yMinusTapped',
    'mouseup .control_btn_y_minus': 'yMinusReleased',
    'click .home_z': 'homeTapped'
  },
  init00: null,

  // call back functions for taking care of the click events on the control keys
  xPlusTapped: function(){ 
    var self = this;
    this.init00 = setInterval(function() {

      self.sendJogCommand('x', 1, self.distanceControl.xSelected);

    }, 30);
    // this.sendJogCommand('x', 1, this.distanceControl.xSelected);
  },
  xPlusReleased: function() {
    clearInterval(this.init00);
  },
  xMinusTapped: function() {
    var self = this;
    this.init00 = setInterval(function() {

      self.sendJogCommand('x', -1, self.distanceControl.xSelected);

    }, 30);
  },
  xMinusReleased: function() {
    clearInterval(this.init00);
  },
  yPlusTapped: function() {
    var self = this;
    this.init00 = setInterval(function() {

      self.sendJogCommand('y', 1, self.distanceControl.ySelected);

    }, 30);
  },
  yPlusReleased: function() {
    clearInterval(this.init00);
  },
  yMinusTapped: function() {
    var self = this;
    this.init00 = setInterval(function() {

      self.sendJogCommand('y', -1, self.distanceControl.ySelected);

    }, 30);
  },
  yMinusReleased: function() {
    clearInterval(this.init00);
  },
  homeTapped: function() {
    if (!app.socketData.get('paused')) {
      this.sendHomeCommand(['x', 'y']);
    }
  }
});

var ZControlView = MovementControlView.extend({
  el: '#z-controls',
  events: {
    'mousedown .control_btn_z_plus': 'zPlusTapped',
    'mouseup .control_btn_z_plus': 'zPlusReleased',
    'mousedown .control_btn_z_minus': 'zMinusTapped',
    'mouseup .control_btn_z_minus': 'zMinusReleased',
    'click .home_z': 'homeTapped'
  },
  init00: null,
  zPlusTapped: function() {
    var self = this;
    this.init00 = setInterval(function() {

      self.sendJogCommand('z', 1, self.distanceControl.zSelected);

    }, 300);
  },
  zPlusReleased: function() {
    clearInterval(this.init00);
  },
  zMinusTapped: function() {
    var self = this;
    this.init00 = setInterval(function() {

      self.sendJogCommand('z', -1 , self.distanceControl.zSelected);

    }, 300);
    // this.sendJogCommand('z', -1 , this.distanceControl.zSelected);
  },
  zMinusReleased: function() {
    clearInterval(this.init00);
  },
  homeTapped: function() {
    if (!app.socketData.get('paused')) {
      this.sendHomeCommand('z');
    }
  }
});