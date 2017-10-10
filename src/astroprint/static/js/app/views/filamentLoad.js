/*********************************
* Code by Kanishka Mohan Madhuni *
**********************************/

var FilamentLoadView = Backbone.View.extend({
	el: '#filament-load-view',
	events: {
		'click .next-button': 'revealNextStep',
		'click .cancel-button': 'resetState',
		'click #load-select-preheat-temp-button': 'startHeating',
		'click #filament-load-wizard__finish-button' : 'resetState'
	},
	xhrResponse: null,
	tempView: null,
	updatedTemp: null,
	template1: null,
	extruderPercentage: null,
	timeLoading: null,
	initialize: function(options) {
		this.listenTo(app.socketData, 'change:temps', this.tempUpdateAlert);

		this.tempView = new TempBarVerticalView({
      scale: [0, app.printerProfile.get('max_nozzle_temp')],
      el: this.$el.find('.temp-control-cont.nozzle'),
      type: 'tool0'
    });

		this.template1 = _.template('<span><%= Math.min(Math.round(tempObj.extruder.actual)) %> &deg;C/ <%= Math.min(Math.round(tempObj.extruder.target)) %> &deg;C</span>');
	},
	render: function() {
		this.$("#filament-load-wizard__preheating-progress-section").find('.temp-value').html(this.template1({tempObj: this.updatedTemp}));
	},
	startHeating: function(e) {
		var parent = $(e.target)[0].parentElement;
    var extruder = $(parent).find('.target-value-input').val();
    this.tempView.startPreheating(extruder);
	},
	tempUpdateAlert: function(s, value) {
		this.updatedTemp = value;

		if (this.updatedTemp !== null) {
	    this.render();
	    this.updateProgressBar();

	  }

    if (this.extruderPercentage === 100) {
    	this.revealNextBtn();
    }
	},
	updateProgressBar: function() {
		var progressBar,
		extruderTarget,
		extruderActual;

		progressBar = this.$el.find('.progress-bar-container progress');

		extruderActual = this.updatedTemp.extruder.actual;
		extruderTarget = this.updatedTemp.extruder.target;

		if (extruderActual > extruderTarget) {
			this.extruderPercentage = Math.min(Math.round(((extruderTarget/extruderActual)*100)));
		} else {
			this.extruderPercentage = Math.min(Math.round(((extruderActual/extruderTarget)*100)));
		}

		progressBar.val(this.extruderPercentage);
	},
	revealNextBtn: function() {
		this.$('#preheating-progress-section-button').removeClass('disable-btn').addClass('enable-btn');
	},
	resetState: function() {
		var currentView = this.$el.find('.active');
		$(currentView).removeClass('active').addClass('hide');
		this.$("#filament-load-wizard__temp-control").removeClass('hide').addClass('active');
		this.$('#preheating-progress-section-button').removeClass('enable-btn').addClass('disable-btn');
	},
	revealNextStep: function(e) {
		var currentView = this.$el.find('.active');
		var currentBtn = currentView.find('.next-button')[0];
		var currentBtnId = $(currentBtn).attr('id');

		if (currentBtnId === "load-select-preheat-temp-button") {

			currentView.removeClass('active').addClass('hide');
			this.$el.find("#filament-load-wizard__preheating-progress-section").removeClass('hide').addClass('active');


		} else if (currentBtnId === "preheating-progress-section-button") {

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
			// this.xhrResponse.abort();

			clearInterval(this.timeLoading);
			currentView.removeClass('active').addClass('hide');
			this.$el.find("#filament-load-wizard__finish-section").removeClass('hide').addClass('active');

		} else {

			currentView.removeClass('active').addClass('hide');
			this.$el.find("#filament-load-wizard__temp-control").removeClass('hide').addClass('active');

		}
	},
	extrudeTapped: function() {
		var self = this;

		this._sendExtrusionCommand(1);

		this.timeLoading = setInterval(function() {

			console.log("10mm extrusion command is send in 5 sec");
      self._sendExtrusionCommand(1);

    }, 2500);

	},
	_sendExtrusionCommand: function(direction, handleData) {

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
      success: function() {},
      error: function(xhr) {
      	self.xhrResponse = xhr;
      	console.log("The status code is : " + xhr.status);
      	console.log("Msg form the server : " + xhr.responseText);
      	console.log("Status text : " + xhr.statusText);
      }
    });
	}
});