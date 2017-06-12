/***
Created by Punit Kumar
*/
/*
var UtilityPage = Backbone.View.extend({
  parent: null,
  initialize: function(params) {
    this.parent = params.parent;
  },
  show: function() {
    this.parent.$el.find('.utility-page').addClass('hide');
    this.$el.removeClass('hide');
  }
});*/
var UtilityView = Backbone.View.extend({
  el: '#utility-view',
  menu: null,
  subviews: null,
  initialize: function() {
    this.subviews = {
     
    };
   // this.menu = new SettingsMenu({subviews: this.subviews});
  },
  onShow: function() {
    //this.subviews['printer-connection'].show();
  }
});