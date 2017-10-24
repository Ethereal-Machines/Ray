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
  zSelected: 2,

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
  notifyView: null,
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
    var self = this;
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
        self.notifyView = new NotifyView({msg: xhr.responseText, type: "error"});
        app.router.selectView(self.notifyView);
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
  isMouseDown: false,

  // call back functions for taking care of the click events on the control keys
  xPlusTapped: function(){

    this.$(".control_btn_x_plus").css('box-shadow', '0px 0px 8px 1px black');
    
    var self = this;

    if (this.init00) clearInterval(this.init00);

    self.sendJogCommand('x', 1, self.distanceControl.xSelected);
    self.isMouseDown = true;    

    if (self.isMouseDown) {
      self.init00 = setInterval(function() {

        self.sendJogCommand('x', 1, self.distanceControl.xSelected);

      }, 30);
    }
  },
  xPlusReleased: function() {
    this.$(".control_btn_x_plus").css('box-shadow', '0px 0px 8px 6px black');
    this.isMouseDown = false;
    clearInterval(this.init00);
    this.init00 = null;
  },
  xMinusTapped: function() {

    this.$(".control_btn_x_minus").css('box-shadow', '0px 0px 8px 1px black');

    var self = this;

    if (this.init00) clearInterval(this.init00);

    self.sendJogCommand('x', -1, self.distanceControl.xSelected);
    self.isMouseDown = true;    

    if (self.isMouseDown) {
      self.init00 = setInterval(function() {

        self.sendJogCommand('x', -1, self.distanceControl.xSelected);

      }, 30);
    }
  },
  xMinusReleased: function() {
    this.$(".control_btn_x_minus").css('box-shadow', '0px 0px 8px 6px black');
    this.isMouseDown = false;
    clearInterval(this.init00);
    this.init00 = null;
  },
  yPlusTapped: function() {

    this.$(".control_btn_y_plus").css('box-shadow', '0px 0px 8px 1px black');

    var self = this;

    if (this.init00) clearInterval(this.init00);

    self.sendJogCommand('y', 1, self.distanceControl.ySelected);
    self.isMouseDown = true;    

    if (self.isMouseDown) {
      self.init00 = setInterval(function() {

        self.sendJogCommand('y', 1, self.distanceControl.ySelected);

      }, 30);
    }
  },
  yPlusReleased: function() {
    this.$(".control_btn_y_plus").css('box-shadow', '0px 0px 8px 6px black');
    this.isMouseDown = false;
    clearInterval(this.init00);
    this.init00 = null;
  },
  yMinusTapped: function() {

    this.$(".control_btn_y_minus").css('box-shadow', '0px 0px 8px 1px black');

    var self = this;

    if (this.init00) clearInterval(this.init00);

    self.sendJogCommand('y', -1, self.distanceControl.ySelected);
    self.isMouseDown = true;    

    if (self.isMouseDown) {
      self.init00 = setInterval(function() {

        self.sendJogCommand('y', -1, self.distanceControl.ySelected);

      }, 30);
    }
  },
  yMinusReleased: function() {
    this.$(".control_btn_y_minus").css('box-shadow', '0px 0px 8px 6px black');
    this.isMouseDown = false;
    clearInterval(this.init00);
    this.init00 = null;
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
    'mousedown .control_btn_z_plus': 'zMinusTapped',
    'mouseup .control_btn_z_plus': 'zMinusReleased',
    'mousedown .control_btn_z_minus': 'zPlusTapped',
    'mouseup .control_btn_z_minus': 'zPlusReleased',
    'click .home_z': 'homeTapped'
  },
  init01: null,
  isMouseDown: false,
  zPlusTapped: function(e) {

    this.$(".control_btn_z_minus").css('box-shadow', '0px 0px 8px 1px black');

    var self = this;

    if (this.init01) clearInterval(this.init01);

    self.sendJogCommand('z', 1, self.distanceControl.zSelected);
    self.isMouseDown = true;    

    if (self.isMouseDown) {
      self.init01 = setInterval(function() {

        self.sendJogCommand('z', 1, self.distanceControl.zSelected);

      }, 430);
    }
  },
  zPlusReleased: function(e) {
    this.$(".control_btn_z_minus").css('box-shadow', '0px 0px 8px 6px black');
    this.isMouseDown = false;
    clearInterval(this.init01);
    this.init01 = null;
    return false;
  },
  zMinusTapped: function(e) {

    this.$(".control_btn_z_plus").css('box-shadow', '0px 0px 8px 1px black');

    var self = this;

    if (this.init01) clearInterval(this.init01);

    self.sendJogCommand('z', -1, self.distanceControl.zSelected);
    self.isMouseDown = true;    

    if (self.isMouseDown) {
      self.init01 = setInterval(function() {

        self.sendJogCommand('z', -1, self.distanceControl.zSelected);

      }, 430);
    }
  },
  zMinusReleased: function(e) {
    this.$(".control_btn_z_plus").css('box-shadow', '0px 0px 8px 6px black');
    this.isMouseDown = false;
    clearInterval(this.init01);
    this.init01 = null;
    return false;
  },
  homeTapped: function() {
    if (!app.socketData.get('paused')) {
      this.sendHomeCommand('z');
    }
  }
});