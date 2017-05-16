/*********************************
* Code by Kanishka Mohan Madhuni *
**********************************/

var FilamentUnloadView = Backbone.View.extend({
	el: '#filament-unload-view',
	events: {
		'click .next-button' : 'revealNextStep'
	},
	initialize: function() {},
	render: function() {},
	revealNextStep: function(e) {
		var currentView = this.$el.find('.active');
		var currentBtn = currentView.find('.next-button')[0];
		var currentBtnId = $(currentBtn).attr('id');

		if (currentBtnId === "filament-unload-wizard__preheating-progress-section-button") {

			currentView.removeClass('active').addClass('hide');
			this.$el.find("#retraction-in-progress-section").removeClass('hide').addClass('active');

		} else if (currentBtnId === "retraction-in-progress-section-button") {

			currentView.removeClass('active').addClass('hide');
			this.$el.find("#filament-unload-wizard__finish-section").removeClass('hide').addClass('active');

		} else {

			currentView.removeClass('active').addClass('hide');
			this.$el.find("#filament-unload-wizard__preheating-progress-section").removeClass('hide').addClass('active');
			
		}
	}
});