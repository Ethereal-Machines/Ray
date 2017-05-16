/*********************************
* Code by Kanishka Mohan Madhuni *
**********************************/

var FilamentUnloadView = Backbone.View.extend({
	el: '#filament-unload-view',
	events: {
		'click .next-button' : 'revealNextStep'
	},
	xhrResponse: null,
	initialize: function() {},
	render: function() {},
	revealNextStep: function(e) {
		var currentView = this.$el.find('.active');
		var currentBtn = currentView.find('.next-button')[0];
		var currentBtnId = $(currentBtn).attr('id');

		if (currentBtnId === "filament-unload-wizard__preheating-progress-section-button") {
			
			/*
				We need to start the Retraction process when the button is clicked
			*/

			this.retractTapped(); // initializing the retraction process

			currentView.removeClass('active').addClass('hide');
			this.$el.find("#retraction-in-progress-section").removeClass('hide').addClass('active');

		} else if (currentBtnId === "retraction-in-progress-section-button") {

			// Killing the ajax command sent from the previous step on click of the NEXT button
			this.xhrResponse.abort();
			currentView.removeClass('active').addClass('hide');
			this.$el.find("#filament-unload-wizard__finish-section").removeClass('hide').addClass('active');

		} else {

			currentView.removeClass('active').addClass('hide');
			this.$el.find("#filament-unload-wizard__preheating-progress-section").removeClass('hide').addClass('active');
			
		}
	},
	retractTapped: function() {
		console.log("Retract Button is being pressed.");
		this._sendRetractionCommand(-1);
	},
	_sendRetractionCommand: function(direction) {
		
		var self = this;

		var printer_profile = app.printerProfile.toJSON();

		var data = {
	      command: "extrude",
	      amount: parseFloat(printer_profile.extrusion_amount * direction),
	      speed: parseFloat(printer_profile.extrusion_speed)
	    }

	    $.ajax({
	      url: API_BASEURL + "printer/tool",
	      type: "POST",
	      dataType: "json",
	      contentType: "application/json; charset=UTF-8",
	      data: JSON.stringify(data),
	      success: function(xhr) {
	      	self.xhrResponse = xhr;
	      },
	      error: function(xhr) {
	      	self.xhrResponse = xhr;
	      	console.log("The status code is : " + xhr.status);
	      	console.log("Msg form the server : " + xhr.responseText);
	      	console.log("Status text : " + xhr.statusText);
	      }
	    });
	}
});