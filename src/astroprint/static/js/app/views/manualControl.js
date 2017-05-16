/*********************************
* Code by Kanishka Mohan Madhuni *
**********************************/

/*******************
* Distance Control *
*********************/

var DistanceControl = Backbone.View.extend({
  el: '#distance-control',
  events: {
    'change .x-length-changed': 'xSelectedDistance',
    'change .y-length-changed': 'ySelectedDistance',
    'change .z-length-changed': 'zSelectedDistance'
  },
  /* Below we have set the default values for the x, y and z distance selector */
  xSelected: 10,
  ySelected: 10,
  zSelected: 10,

  /* Below functions will be triggered when the distance for the x, y or z get changed */
  xSelectedDistance: function(e) {
    var elem = $(e.target);
    this.xSelected = elem.val();
    console.log("The value of the x is being changed to : " + this.xSelected);
  },
  ySelectedDistance: function(e) {
    var elem = $(e.target);
    this.ySelected = elem.val();
    console.log("The vlaue of the y is being changed to : " + this.ySelected);
  },
  zSelectedDistance: function(e) {
    var elem = $(e.target);
    this.zSelected = elem.val();
    console.log("The value of the z is being changed to : " + this.zSelected);
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
    'click .control_btn_x_plus': 'xPlusTapped',
    'click .control_btn_x_minus': 'xMinusTapped',
    'click .control_btn_y_plus': 'yPlusTapped',
    'click .control_btn_y_minus': 'yMinusTapped',
    'click .home_z': 'homeTapped'
  },

  // call back functions for taking care of the click events on the control keys
  xPlusTapped: function()
  { 
    this.sendJogCommand('x', 1, this.distanceControl.xSelected);
  },
  xMinusTapped: function()
  {
    this.sendJogCommand('x', -1, this.distanceControl.xSelected);
  },
  yPlusTapped: function()
  {
    this.sendJogCommand('y', 1, this.distanceControl.ySelected);
  },
  yMinusTapped: function()
  {
    this.sendJogCommand('y', -1, this.distanceControl.ySelected);
  },
  homeTapped: function()
  {
    if (!app.socketData.get('paused')) {
      this.sendHomeCommand(['x', 'y']);
    }
  }
});

var ZControlView = MovementControlView.extend({
  el: '#z-controls',
  events: {
    'click .control_btn_z_plus': 'zPlusTapped',
    'click .control_btn_z_minus': 'zMinusTapped',
    'click .home_z': 'homeTapped'
  },
  zPlusTapped: function()
  {
    this.sendJogCommand('z', 1, this.distanceControl.zSelected);
  },
  zMinusTapped: function()
  {
    this.sendJogCommand('z', -1 , this.distanceControl.zSelected);
  },
  homeTapped: function()
  {
    if (!app.socketData.get('paused')) {
      this.sendHomeCommand('z');
    }
  }
});