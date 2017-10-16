/*********************************
* Code by Kanishka Mohan Madhuni *
**********************************/

var UtilityView = Backbone.View.extend({
  el: '#utility-view',
  events: {
    "click .utility-button": "getButtonName",
    'click .power-button': 'onPowerClicked',
    'click .power-off-modal': 'closePowerModal',
    'click .power-off-modal__button-container': 'noHideModel',
    'click .power-off-button': 'doTurnoff',
    'click .restart-button': 'doRestart'
  },
  initialize: function() {
    this.render();
  },
	render: function() {
    var nav = this.$(".printer-name");
    var name = this.$(".printer-name__value");
    var html = '<a href="#" class="back-to-home">';
    html += '<img width="56" height="56" src="../img/settings-page/back-icon.svg" />';
    html += '</a>';

    $(html).insertBefore(nav);
    nav.css('padding-left', '8px');
    name.html("<a href='#'>Utilities</a>");
  },

  /*
    Added new functionality to check which subview is clicked
  */
  getButtonName: function(e) {
    var el = $(e.currentTarget);
    var className = el.find('.control-link').attr('class').substring(13);
    ControlView.prototype.buttonName = className;
  },
  onCloseReleaseInfoClicked: function(e) {
    e.preventDefault();
    this.$('.new-release').remove()
  },
  onPowerClicked: function() {
    this.$('.power-off-modal').removeClass('hide');
  },
  closePowerModal: function() {
    this.$('.power-off-modal').addClass('hide');
  },
  noHideModel: function(e) {
    e.stopPropagation();
  },
  doTurnoff: function() {
    var data = {"action": "shutdown", "command": "sudo shutdown now"};
    $.ajax({
      url: API_BASEURL + "system",
      type: "POST",
      dataType: 'json',
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify(data),
      success: function() {
        console.log("success!!!!");
      },
      error: function(xhr) {
        console.log(xhr);
      }
    });
  },
  doRestart: function() {
    var data = {"action": "restart", "command": "sudo reboot now"};
    $.ajax({
      url: API_BASEURL + "system",
      type: "POST",
      dataType: 'json',
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify(data),
      success: function() {
        console.log("success!!!!");
      },
      error: function(xhr) {
        console.log(xhr);
      }
    });
  }
});  
