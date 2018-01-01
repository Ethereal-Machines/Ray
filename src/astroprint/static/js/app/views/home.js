/*
 *  (c) Daniel Arroyo. 3DaGoGo, Inc. (daniel@astroprint.com)
 *
 *  Distributed under the GNU Affero General Public License http://www.gnu.org/licenses/agpl.html
 */

var HomeView = Backbone.View.extend({
  el: '#home-view',
  uploadBtn: null,
  events: {
    'show': 'onShow',
    'click .new-release a.check': 'onReleaseInfoClicked',
    'click .new-release a.close': 'onCloseReleaseInfoClicked'
  },
  initialize: function() {
    this.listenTo(app.printerProfile, 'change:driver', this.onDriverChanged);
    this.onDriverChanged(app.printerProfile, app.printerProfile.get('driver'));

    this.listenTo(app.socketData, 'new_sw_release', _.bind(function(data){
      this.$('.new-release .version-label').text(data.release.major+'.'+data.release.minor+'('+data.release.build+')');
      this.$('.new-release').removeClass('hide');
    }, this));
  },
  onDriverChanged: function(model, newDriver) {
    if (newDriver == 'marlin') {
      this.$("#app-container ul li.gcode-terminal-app-icon").removeClass('hide');
    } else {
      this.$("#app-container ul li.gcode-terminal-app-icon").addClass('hide');
    }
  },
  onReleaseInfoClicked: function(e) {
    e.preventDefault();
    if (!app.router.settingsView) {
      app.router.settingsView = new SettingsView();
    }

    app.router.settingsView.subviews['software-update'].onCheckClicked(e);
  },
  onCloseReleaseInfoClicked: function(e) {
    e.preventDefault();
    this.$('.new-release').remove()
  }
});
