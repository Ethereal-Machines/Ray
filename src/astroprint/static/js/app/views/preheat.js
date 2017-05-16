/*********************************
* Code by Kanishka Mohan Madhuni *
**********************************/

var PreheatingView = Backbone.View.extend({
	el: "#preheat-view",
	updatedTemp: null,
	template1: null,
	template2: null,
	extruderPercentage: null,
	bedPercentage: null,
	events: {
		'click .finish-section-button': 'finishClicked'
	},

	// template: null,
	initialize: function(options) {
		// getting the temperature values from the app.socket js file
    this.listenTo(app.socketData, 'change:temps', this.tempUpdateAlert);

    // setting the templates for displaying the dynamic temperatures
    this.template1 = _.template('<span><%= Math.min(Math.round(tempObj.extruder.actual)) %> &deg;C/ <%= Math.min(Math.round(tempObj.extruder.target)) %> &deg;C</span>');
    this.template2 = _.template('<span><%= Math.min(Math.round(tempObj.bed.actual)) %> &deg;C/ <%= Math.min(Math.round(tempObj.bed.target)) %> &deg;C</span>');
	},
	render: function() {
		// Displaying the temperature when the real time data is available
		this.$(".nozzle-temp-progress .temp-value").html(this.template1({tempObj: this.updatedTemp}));
		this.$(".bed-temp-progress .temp-value").html(this.template2({tempObj: this.updatedTemp}));
	},
	tempUpdateAlert: function(s,value) {

		var currentView = this.$el.find('.active');

		this.updatedTemp = value; // setting the value of current object

		// display for the temperature will not show until we get the object for the current temperature
		if (this.updatedTemp !== null) {
	    this.render();
	    this.updateProgressBar();
    }

    if (this.extruderPercentage === 100 && this.bedPercentage === 100) {
    	currentView.removeClass('active').addClass('hide');;
    	this.$("#preheat-wizard__finish-section").removeClass('hide').addClass('active');
    }

	},
	finishClicked: function() {
		this.$("#preheat-wizard__finish-section").removeClass('active').addClass('hide');
		this.$("#preheat-wizard__preheating-progress").removeClass('hide').addClass('active');
	},
	updateProgressBar: function() {

		var progressBar1,
		progressBar2,
		extruderTarget,
		extruderActual,
		bedTarget,
		bedActual;

		progressBar1 = $('#extruder-progress-bar');
		progressBar2 = $('#bed-progress-bar');

		extruderActual = this.updatedTemp.extruder.actual;
		extruderTarget = this.updatedTemp.extruder.target;
		bedActual = this.updatedTemp.bed.actual;
		bedTarget = this.updatedTemp.bed.target;

		if (extruderActual > extruderTarget) {
			this.extruderPercentage = Math.min(Math.round(((extruderTarget/extruderActual)*100)));
		} else {
			this.extruderPercentage = Math.min(Math.round(((extruderActual/extruderTarget)*100)));
		}

		progressBar1.val(this.extruderPercentage);

		if (bedActual > bedTarget) {
			this.bedPercentage = Math.min(Math.round(((bedTarget/bedActual)*100)));
		} else {
			this.bedPercentage = Math.min(Math.round(((bedActual/bedTarget)*100)));
		}

		progressBar2.val(this.bedPercentage);
	}
});