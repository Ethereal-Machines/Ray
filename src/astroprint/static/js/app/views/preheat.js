/*********************************
* Code by Kanishka Mohan Madhuni *
**********************************/

var PreheatingView = Backbone.View.extend({
	el: "#preheat-view",
	updatedTemp: null,
	extraTemplate1: null,
	template1: null,
	template2: null,
	extruderPercentage: null,
	extraPercentage: null,
	bedPercentage: null,
	events: {
		'click .finish-section-button': 'finishClicked',
		'click .preheat-wizard__cancel-button': 'openCancelModal',
		'click .yes-button': 'stopPreheating',
		'click .no-button': 'closeModal',
		'click .preheat-wizard__confirm-cancel-modal': 'closeModal',
		'click .preheat-wizard__confirm-cancel-modal__inner': 'noHideModal'
	},

	// template: null,
	initialize: function(options) {
		// getting the temperature values from the app.socket js file
    this.listenTo(app.socketData, 'change:temps', this.tempUpdateAlert);

    // setting the templates for displaying the dynamic temperatures
    this.extraTemplate1 = _.template('<span><%= Math.min(Math.round(tempObj.extra.actual)) %> &deg;C/ <%= Math.min(Math.round(tempObj.extra.target)) %> &deg;C</span>');
    this.template1 = _.template('<span><%= Math.min(Math.round(tempObj.extruder.actual)) %> &deg;C/ <%= Math.min(Math.round(tempObj.extruder.target)) %> &deg;C</span>');
    this.template2 = _.template('<span><%= Math.min(Math.round(tempObj.bed.actual)) %> &deg;C/ <%= Math.min(Math.round(tempObj.bed.target)) %> &deg;C</span>');
	},
	render: function() {
		// Displaying the temperature when the real time data is available
		this.$(".extra-temp-progress .temp-value").html(this.extraTemplate1({tempObj: this.updatedTemp}));
		this.$(".nozzle-temp-progress .temp-value").html(this.template1({tempObj: this.updatedTemp}));
		this.$(".bed-temp-progress .temp-value").html(this.template2({tempObj: this.updatedTemp}));
	},
	tempUpdateAlert: function(s,value) {

		var currentView = this.$el.find('.active');

		this.updatedTemp = value; // setting the value of current object

		console.log(this.updatedTemp);

		// display for the temperature will not show until we get the object for the current temperature
		if (this.updatedTemp !== null) {
	    this.render();
	    this.updateProgressBar();
    }

    if (this.extruderPercentage === 100 && this.extraPercentage === 100 && this.bedPercentage === 100) {
    	currentView.removeClass('active').addClass('hide');;
    	this.$("#preheat-wizard__finish-section").removeClass('hide').addClass('active');
    }

	},
	finishClicked: function() {
		this.$("#preheat-wizard__finish-section").removeClass('active').addClass('hide');
		this.$("#preheat-wizard__preheating-progress").removeClass('hide').addClass('active');
	},
	openCancelModal: function() {
		this.$(".preheat-wizard__confirm-cancel-modal").removeClass('hide');
	},
	noHideModal: function(e) {
		e.stopPropagation();
	},
	closeModal: function() {
		this.$(".preheat-wizard__confirm-cancel-modal").addClass('hide');
	},
	stopPreheating: function() {
    
		var data1 = {
			command: "target",
			targets: {
				tool0: 0
			}
		};

		var extradata = {
			command: "target",
			targets: {
				tool1: 0
			}
		};

		var data2 = {
			command: "target",
			target: 0
		}

		$.ajax({
      url: API_BASEURL + "printer/" + "tool",
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify(data1),
      success: function() {
      	// console.log("Tool: The request was successfull");
      },
      error: function() {
      	console.log("Tool: There was an error!");
      }
    });

    $.ajax({
      url: API_BASEURL + "printer/" + "tool",
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify(extradata),
      success: function() {
      	// console.log("Tool: The request was successfull");
      },
      error: function() {
      	console.log("Tool: There was an error!");
      }
    });

    $.ajax({
      url: API_BASEURL + "printer/" + "bed",
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify(data2),
      success: function() {
      	// console.log("Bed: The request was successfull");
      },
      error: function() {
      	console.log("Bed: There was an erro!");
      }
    });

    this.closeModal();

	},
	updateProgressBar: function() {

		var progressBar1,
		progressBar2,
		extraProgressBar,
		extruderTarget,
		extruderActual,
		extraTarget,
		extraActual,
		bedTarget,
		bedActual;

		progressBar1 = $('#extruder-progress-bar');
		extraProgressBar = $('#extra-progress-bar');
		progressBar2 = $('#bed-progress-bar');

		extruderActual = this.updatedTemp.extruder.actual;
		extruderTarget = this.updatedTemp.extruder.target;
		extraActual = this.updatedTemp.extra.actual;
		extraTarget = this.updatedTemp.extra.target;
		bedActual = this.updatedTemp.bed.actual;
		bedTarget = this.updatedTemp.bed.target;

		if (extruderActual > extruderTarget) {
			this.extruderPercentage = Math.min(Math.round(((extruderTarget/extruderActual)*100)));
		} else {
			this.extruderPercentage = Math.min(Math.round(((extruderActual/extruderTarget)*100)));
		}

		progressBar1.val(this.extruderPercentage);

		if (extraActual > extraTarget) {
			this.extraPercentage = Math.min(Math.round(((extraTarget/extraActual)*100)));
		} else {
			this.extraPercentage = Math.min(Math.round(((extraActual/extraTarget)*100)));
		}

		extraProgressBar.val(this.extraPercentage);

		if (bedActual > bedTarget) {
			this.bedPercentage = Math.min(Math.round(((bedTarget/bedActual)*100)));
		} else {
			this.bedPercentage = Math.min(Math.round(((bedActual/bedTarget)*100)));
		}

		progressBar2.val(this.bedPercentage);
	}
});