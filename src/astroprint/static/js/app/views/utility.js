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
  events: {
    "click .utility-button": "getButtonName"
  },
  initialize: function() {},
	onShow: function() {},
  getButtonName: function(e) {
    // console.log("I am clicked");
    // console.log(e.currentTarget);
    var el = $(e.currentTarget);
    var className = el.find('img').attr('class');
    console.log(className);
    ControlView.prototype.buttonName = className;

  }
});  
