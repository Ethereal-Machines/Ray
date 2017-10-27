/*********************************
* Code by Kanishka Mohan Madhuni *
**********************************/

var SettingsView = Backbone.View.extend({
  el: "#settings-view",
  events: {},
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
  	name.html("<a href='#'>Settings</a>");
  },
  onCloseReleaseInfoClicked: function(e) {
    e.preventDefault();
    this.$('.new-release').remove()
  }
});