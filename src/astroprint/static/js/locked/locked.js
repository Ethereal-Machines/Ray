$.ajaxSetup({
  cache: false
});

LoginForm = Backbone.View.extend({
  el: '#login-form',
  events: {
    'submit': 'onSubmit'
  },
  onSubmit: function(e)
  {
    e.preventDefault();

    var loadingIcon = this.$('.loading-icon');

    loadingIcon.removeClass('hide');

    var self = this;

    $.ajax({
      type: 'POST',
      url: '/api/login',
      data: this.$el.serializeArray(),
      headers: {
        "X-Api-Key": UI_API_KEY
      }
    })
    .done(function(){
      location.reload();
      loadingIcon.addClass('hide');
    })
    .fail(function(xhr){
      var message = "Unkonwn error. Please refresh the page";

      if (xhr.status == 401) {
        if (xhr.responseText.toLowerCase() == 'invalid api key') {
          message = "The access key has changed. Please refresh the page.";
        } else {
          message = "Invalid Password";
        }
      }

      var notifyView = new NotifyView({msg: message, type: 'warning'});
      notifyView.$el.removeClass('hide');

      loadingIcon.addClass('hide');
      
    });

    return false;
  }
});

LockedView = Backbone.View.extend({
  form: null,
  initialize: function()
  {
    this.form = new LoginForm();
    this.startPolling();
  },
  startPolling: function()
  {
    setInterval(_.bind(function(){
      $.ajax({type:'POST', url: '/accessKeys'})
        .done(function(data){
          if (_.isObject(data)) {
            location.reload();
          }
        })
    }, this), 3000);
  }
});

var NotifyView = Backbone.View.extend({
  el: "#notify-wizard",
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
    this.$el.html(this.template({msg: this.errorMsg, type: this.type}));
  },
  closeErrorMsg: function() {
    this.$el.addClass('hide');
  }
});

var lockedVide = new LockedView();
