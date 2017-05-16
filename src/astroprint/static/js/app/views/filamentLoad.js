/*********************************
* Code by Kanishka Mohan Madhuni *
**********************************/

var FilamentLoadView = Backbone.View.extend({
	el: '#filament-load-view',
	events: {
		'click .next-button' : 'revealNextStep'
	},
	initialize: function() {},
	render: function() {},
	revealNextStep: function(e) {
		var currentView = this.$el.find('.active');
		var currentBtn = currentView.find('.next-button')[0];
		var currentBtnId = $(currentBtn).attr('id');

		if (currentBtnId === "preheating-progress-section-button") {

			currentView.removeClass('active').addClass('hide');
			this.$el.find("#insert-filament-section").removeClass('hide').addClass('active');

		} else if (currentBtnId === "insert-filament-section-button") {

			currentView.removeClass('active').addClass('hide');
			this.$el.find("#extruding-in-progress-section").removeClass('hide').addClass('active');

		} else if (currentBtnId === "extruding-in-progress-section-button") {

			currentView.removeClass('active').addClass('hide');
			this.$el.find("#filament-load-wizard__finish-section").removeClass('hide').addClass('active');

		} else {

			currentView.removeClass('active').addClass('hide');
			this.$el.find("#filament-load-wizard__preheating-progress-section").removeClass('hide').addClass('active');
			
		}
	}
});