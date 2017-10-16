var NotifyView = Backbone.View.extend({
  el: "#notify-view",
  template: _.template( $("#notify-template").html() ),
  errorMsg: null,
  type: null,
  events: {
    'click .next-button--notify': 'closeErrorMsg'
  },
  initialize: function(params) {
    this.errorMsg = params.msg;
    this.type = params.type;
    this.render();
  },
  render: function() {
    this.$('#notify-wizard').html(this.template({msg: this.errorMsg, type: this.type}));
  },
  closeErrorMsg: function() {
    this.$el.addClass('hide');
  }
});