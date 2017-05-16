/*
 *  (c) 3DaGoGo, Inc. (product@astroprint.com)
 *
 *  Distributed under the GNU Affero General Public License http://www.gnu.org/licenses/agpl.html
 */

// Dependency: /models/printerprofile.js, /widgets/tempbarview.js
// this object is being extended by the sub part 'TempView'
var TempBarVerticalView = TempBarView.extend({
  containerDimensions: null,
  scale: null,
  type: null,
  dragging: false,
  events: _.extend(TempBarView.prototype.events, {
    'click .temp-bar': 'onClicked',
    'click button.temp-off': 'turnOff'
  }),
  // this function is for sliding the horizontal bar on the temp-bar
  // this part will not be included in the new UI but a progress bar
  // showing the increasing temp will be needed to display
  setHandle: function(value)
  {
    if (!this.dragging) {
      var position = this._temp2px(value);
      var handle = this.$el.find('.temp-target');

      handle.css({transition: 'top 0.5s'});
      handle.css({top: position + 'px'});
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
  onClicked: function(e)
  {
    e.preventDefault();
    var target = this.$el.find('.temp-target');
    var newTop = e.pageY - this.containerDimensions.top - target.innerHeight()/2.0;

    newTop = Math.min( Math.max(newTop, 0), this.containerDimensions.maxTop );

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
  renderTemps: function(actual, target)
  {
    var handleHeight = this.$el.find('.temp-target').innerHeight();

    if (actual !== null) {
      this.$el.find('.current-temp-top').html(Math.round(actual)+'&deg;');
      this.$el.find('.current-temp').css({top: (this._temp2px(actual) + handleHeight/2 )+'px'});
    }

    if (target !== null) {
      this.setHandle(Math.min(Math.round(target), this.scale[1]));
    }
  },
  _temp2px: function(temp)
  {
    var px = temp * this.containerDimensions.px4degree;

    return this.containerDimensions.maxTop - px;
  },
  _px2temp: function(px)
  {
    return Math.round( ( (this.containerDimensions.maxTop - px) / this.containerDimensions.px4degree ) );
  }
});

// this object is controlling the temperature of bed and nozzle
// Basically this view is reponsible for preheating process
var TempView = Backbone.View.extend({
  el: '#temp-control',
  nozzleTempBar: null,
  bedTempBar: null,
  initialize: function()
  {
    this.nozzleTempBar = new TempBarVerticalView({
      scale: [0, app.printerProfile.get('max_nozzle_temp')],
      el: this.$el.find('.temp-control-cont.nozzle'),
      type: 'tool0'
    });
    this.bedTempBar = new TempBarVerticalView({
      scale: [0, app.printerProfile.get('max_bed_temp')],
      el: this.$el.find('.temp-control-cont.bed'),
      type: 'bed'
    });
  },
  render: function()
  {
    // Referencing the 'models/printerprofile.js' file to get the data
    var profile = app.printerProfile.toJSON();

    console.log(profile);

    console.log(this);

    this.nozzleTempBar.setMax(profile.max_nozzle_temp);

    if (profile.heated_bed) {
      this.bedTempBar.setMax(profile.max_bed_temp);
      this.bedTempBar.$el.removeClass('disabled');
    } else {
      this.bedTempBar.$el.addClass('disabled');
    }
  },
  resetBars: function()
  {
    this.nozzleTempBar.onResize();
    this.bedTempBar.onResize();
  },
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

// this 'view' is reponsible for setting the distance
var DistanceControl = Backbone.View.extend({
  el: '#distance-control',
  selected: 10,
  events: {
    'click button': 'selectDistance'
  },
  selectDistance: function(e)
  {
    var el = $(e.currentTarget);
    this.$el.find('.success').removeClass('success').addClass('secondary');
    el.addClass('success').removeClass('secondary');
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
    this.distanceControl = params.distanceControl;
  },
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

var XYControlView = MovementControlView.extend({
  el: '#xy-controls',
  events: {
    'click .control_btn_x_plus': 'xPlusTapped',
    'click .control_btn_x_minus': 'xMinusTapped',
    'click .control_btn_y_plus': 'yPlusTapped',
    'click .control_btn_y_minus': 'yMinusTapped',
    'click .home_z': 'homeTapped'
  },
  xPlusTapped: function()
  {
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


// this 'view' is responsible for the 'extrusion' processs
// We will need to map the below JS with our new UI
var ExtrusionControlView = Backbone.View.extend({
  el: '#extrusion-control',
  template: null,
  events: {
    'click .extrude': 'extrudeTapped',
    'click .retract': 'retractTapped',
    'change .extrusion-length': 'lengthChanged',
    'change .extrusion-speed': 'speedChanged',
    'keydown input.back-to-select': 'onKeyDownBackToSelect'
  },
  initialize: function()
  {
    this.template = _.template( this.$("#extruder-switch-template").html() );
  },
  render: function()
  {
    var printer_profile = app.printerProfile.toJSON();

    this.$('.row.extruder-switch').html(this.template({
      profile: printer_profile
    }));

    if (printer_profile.extruder_count > 1) {
      this.events['change .extruder-number'] = "extruderChanged";
    }

    this.delegateEvents(this.events);
  },
  extrudeTapped: function()
  {
    if (this._checkAmount()) {
      this._sendExtrusionCommand(1);
    }
  },
  retractTapped: function()
  {
    if (this._checkAmount()) {
      this._sendExtrusionCommand(-1);
    }
  },
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
  extruderChanged: function(e)
  {
    this._sendChangeToolCommand($(e.target).val())
  },
  onKeyDownBackToSelect: function(e)
  {
    if (e.keyCode == 27) { //ESC Key
      var target = $(e.currentTarget);
      var select = target.closest('div.select-with-text').find('select');

      //Find out the default value. Middle one
      var defaultValue = select.find('option[default]').val();

      target.closest('.row').addClass('hide');
      target.val(defaultValue);
      select.removeClass('hide').val(defaultValue);
    }
  },
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
    return !isNaN(this.$el.find('input[name="extrusion-length"]').val());
  },
  _sendExtrusionCommand: function(direction)
  {
    var data = {
      command: "extrude",
      amount: parseFloat(this.$('input[name="extrusion-length"]').val() * direction),
      speed: parseFloat(this.$('input[name="extrusion-speed"]').val())
    }

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


// this 'view' is responsible for the 'Fan Controling part'
// As of now this part is not included in the new UI
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
var ControlView = Backbone.View.extend({
  el: '#control-view',
  events: {
    'click .back-to-print button': 'resumePrinting',
    'show': 'render'
  },
  tempView: null,
  distanceControl: null,
  xyControlView: null,
  zControlView: null,
  extrusionView: null,
  fanView: null,
  initialize: function()
  {
    this.tempView = new TempView();
    this.distanceControl = new DistanceControl();
    this.xyControlView = new XYControlView({distanceControl: this.distanceControl});
    this.zControlView = new ZControlView({distanceControl: this.distanceControl});
    this.extrusionView = new ExtrusionControlView();
    this.fanView = new FanControlView();

    this.listenTo(app.socketData, 'change:temps', this.updateTemps);
    this.listenTo(app.socketData, 'change:paused', this.onPausedChanged);
  },
  updateTemps: function(s, value)
  {
    if (!this.$el.hasClass('hide')) {
      this.tempView.updateBars(value);
    }
  },
  render: function()
  {
    this.onPausedChanged(app.socketData, app.socketData.get('paused'));

    this.extrusionView.render();
    this.tempView.render();
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
