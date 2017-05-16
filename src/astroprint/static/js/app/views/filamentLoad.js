/*********************************
* Code by Kanishka Mohan Madhuni *
**********************************/

var FilamentLoadView = Backbone.View.extend({
	el: '#filament-load-view',
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

		if (currentBtnId === "preheating-progress-section-button") {

			currentView.removeClass('active').addClass('hide');
			this.$el.find("#insert-filament-section").removeClass('hide').addClass('active');

		} else if (currentBtnId === "insert-filament-section-button") {
			/*
				We need to start the extrusion process as soon as this next button is pressed.

			*/
			this.extrudeTapped(); // initializing the extrusion process
			
			currentView.removeClass('active').addClass('hide');
			this.$el.find("#extruding-in-progress-section").removeClass('hide').addClass('active');

		} else if (currentBtnId === "extruding-in-progress-section-button") {

			// Killing the ajax command sent from the previous step on click of the NEXT button
			console.log(this.xhr);
			this.xhrResponse.abort();
			currentView.removeClass('active').addClass('hide');
			this.$el.find("#filament-load-wizard__finish-section").removeClass('hide').addClass('active');

		} else {

			currentView.removeClass('active').addClass('hide');
			this.$el.find("#filament-load-wizard__preheating-progress-section").removeClass('hide').addClass('active');

		}
	},
	extrudeTapped: function() {
		console.log("Extrude button is being pressed.");
		this._sendExtrusionCommand(1);
	},
	_sendExtrusionCommand: function(direction) {

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