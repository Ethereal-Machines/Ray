/****************************************
* Code edited by Kanishka Mohan Madhuni *
*****************************************/

var TempBarView = Backbone.View.extend({
  containerDimensions: null,
  scale: null,
  type: null,
  dragging: false,
  lastSent: null,
  lastSentTimestamp: null,
  waitAfterSent: 2000, //During this time, ignore incoming target sets
  target: 0,
  actual: 0,
  events: {
    'mousedown .temp-target span.target-value': 'onTouchStart',
    'click .temp-target a.temp-edit': 'onEditClicked',
    'change .temp-target input': 'onTempFieldChanged',
    'blur .temp-target input': 'onTempFieldBlur'
  },
  initialize: function(params){
    this.scale = params.scale;
    this.type = params.type;
    this.setDefaultValue();
  },
  remove: function()
  {
    $(window).unbind("resize.app");
    Backbone.View.prototype.remove.call(this);
  },
  turnOff: function(e)
  {
    this._sendToolCommand('target', this.type, 0);
    this.setHandle(0);
  },
  setMax: function(value)
  {
    if (this.scale[1] != value) {
      this.scale[1] = value;
      var currentTemp = parseInt(this.$el.find('.temp-target span.target-value').text())

      if (!isNaN(currentTemp)) {
        this.setHandle(Math.min(currentTemp, value));
      }
    }
  },
  setDefaultValue: function() {
    if (this.type === "tool0") {
      this.setHandle(210);
    } else if (this.type === "bed") {
      this.setHandle(70);
    } else if (this.type === "tool1") {
      this.setHandle(210);
    }
  },
  onEditClicked: function(e)
  {
    e.preventDefault();
    e.stopPropagation();

    var target = $(e.currentTarget);
    var container = target.closest('.temp-target');
    var label = container.find('span.target-value');
    var input = container.find('input');
    var currentVal = input.val();

    label.addClass('hide');
    input.removeClass('hide');

    console.log(label.text());

    input.val(currentVal);
    setTimeout(function(){input.focus().select()},100);
  },
  onTempFieldChanged: function(e)
  {
    var input = $(e.target);
    var value = input.val();

    if (!isNaN(value) ) {
      value = Math.min(Math.max(value, this.scale[0]), this.scale[1]);
      // this._sendToolCommand('target', this.type, value);
      input.blur();

      this.setHandle(value);
    }
  },
  startPreheating: function(value) {
    // var input = $(e.target);
    // var value = input.val();

    var value = value;

    if (value != this.lastSent && !isNaN(value) ) {
      value = Math.min(Math.max(value, this.scale[0]), this.scale[1]);
      this._sendToolCommand('target', this.type, value);
      // input.blur();

      // this.setHandle(value);
    }
  },
  onTempFieldBlur: function(e)
  {
    var input = $(e.target);

    input.addClass('hide');
    input.closest('.temp-target').find('span.target-value').removeClass('hide');
  },
  _sendToolCommand: function(command, type, temp, successCb, errorCb)
  {

    if (temp == this.lastSent) return;

    var data = {
      command: command
    };

    var endpoint;
    if (type == "bed") {
      if ("target" == command) {
        data["target"] = parseInt(temp);
      } else if ("offset" == command) {
        data["offset"] = parseInt(temp);
      } else {
        return;
      }

      endpoint = "bed";
    } else {
      var group;
      if ("target" == command) {
        group = "targets";
      } else if ("offset" == command) {
        group = "offsets";
      } else {
        return;
      }
      data[group] = {};
      data[group][type] = parseInt(temp);

      endpoint = "tool";
    }

    $.ajax({
      url: API_BASEURL + "printer/" + endpoint,
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify(data),
      success: function() { if (successCb !== undefined) successCb(); },
      error: function() { if (errorCb !== undefined) errorCb(); }
    });

    this.lastSentTimestamp = new Date().getTime();
    this.lastSent = temp;
  },
  setTemps: function(actual, target)
  {
    // console.log("Set Temps is called");
    var now = new Date().getTime();

    if (this.lastSent !== null && this.lastSentTimestamp > (now - this.waitAfterSent) ) {
      // target = this.lastSent;
    }

    if (isNaN(actual)) {
      actual = null;
    }

    if (isNaN(target)) {
      target = null;
    }

    this.target = target;
    this.actual = actual;

    // console.log("I am also running you BITCH");
    this.renderTemps(actual, target);
  },

  //Implement these in subclasses
  setHandle: function(value) {},
  onTouchMove: function(e) {},
  onClicked: function(e) {},
  onResize: function() {},
  renderTemps: function(actual, target) {},
  _temp2px: function(temp) {},
  _px2temp: function(px) {}
});
