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
    // 'blur .temp-target input': 'onTempFieldBlur',
    'click .numpad__num': 'numpadClicked',
    'click .numpad__num__done': 'doneClicked',
    'click .numpad__num__clear': 'clearClicked'
  },
  initialize: function(params){
    this.scale = params.scale;
    this.type = params.type;
    this.setDefaultValue();
  },
  remove: function() {
    $(window).unbind("resize.app");
    Backbone.View.prototype.remove.call(this);
  },
  turnOff: function(e) {
    this._sendToolCommand('target', this.type, 0);
    this.setHandle(0);
  },
  setMax: function(value) {
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
  onEditClicked: function(e) {
    e.preventDefault();
    e.stopPropagation();

    var target = $(e.currentTarget);
    var container = target.closest('.temp-target');
    var label = container.find('span.target-value');
    var input = container.find('input');
    var numpad = container.find('.numpad-container');

    label.addClass('hide');
    input.removeClass('hide');
    numpad.removeClass('hide');

    setTimeout(function(){input.focus().select()},100);
  },
  numpadClicked: function(e) {
    e.preventDefault();
    e.stopPropagation();

    var self = this;
    var currentNum = $(e.currentTarget);
    var numpadTarget = currentNum.closest('.numpad').closest('.numpad-container');
    var targetInput = currentNum.closest('.numpad').closest('.numpad-container').closest('.temp-target').find('input');
    var target = currentNum.closest('.numpad').closest('.numpad-container').find('.numpad-target');
    target.append(currentNum.val());

    var doneBtn = currentNum.closest('.numpad').find('.numpad__num__done');
    var clearBtn = currentNum.closest('.numpad').find('.numpad__num__clear');
  },
  doneClicked: function(e) {
    var currentNum = $(e.currentTarget);
    var container = currentNum.closest('.numpad').closest('.numpad-container');
    var target = container.find('.numpad-target');
    var targetInput = container.closest('.temp-target').find('input');

    targetInput.val(target.text());
    this.onTempFieldChanged(targetInput);
    this.onTempFieldBlur(targetInput);
    target.empty();

  },
  clearClicked: function(e) {
    var currentNum = $(e.currentTarget);
    var container = currentNum.closest('.numpad').closest('.numpad-container');
    var target = container.find('.numpad-target');

    var targetText = target.text();

    if (targetText.length > 0) {
      var newText = targetText.slice(0, targetText.length - 1);
      target.text(newText);
    }
  },
  onTempFieldChanged: function(btn) {
    var input = btn;
    var value = input.val();

    if (!isNaN(value) ) {
      value = Math.min(Math.max(value, this.scale[0]), this.scale[1]);
      this.setHandle(value);
    }
  },
  startPreheating: function(value) {
    var value = value;

    if (value != this.lastSent && !isNaN(value) ) {
      value = Math.min(Math.max(value, this.scale[0]), this.scale[1]);
      this._sendToolCommand('target', this.type, value);
    }
  },
  onTempFieldBlur: function(btn) {
    var input = btn;

    input.addClass('hide');
    input.closest('.temp-target').find('.numpad-container').addClass('hide');
    input.closest('.temp-target').find('span.target-value').removeClass('hide');
  },
  _sendToolCommand: function(command, type, temp, successCb, errorCb) {

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
  setTemps: function(actual, target) {
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
