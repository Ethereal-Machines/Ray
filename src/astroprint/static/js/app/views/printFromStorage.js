/*********************************
* Code by Kanishka Mohan Madhuni *
**********************************/

var PrintFromStorageView = Backbone.View.extend({
	el: "#print-from-storage-view",
	events: {
    "click .utility-button": "getButtonName",
    'click .power-button': 'onPowerClicked',
    'click .power-off-modal': 'closePowerModal',
    'click .power-off-modal__button-container': 'noHideModel',
    'click .external-storage-button': 'getExternalFileNames'
  },
	initialize: function() {
		this.render();
	},
	render: function() {
		var nav = this.$(".printer-name");
    var name = this.$(".printer-name__value");
    var html = '<a href="#" class="back-to-home">';
    html += '<img width="56" height="56" src="../img/settings-page/back-icon.svg" />';
    html += '</a>';

    $(html).insertBefore(nav);
    nav.css('padding-left', '8px');
    name.text("Print from Storage");
	},
	onCloseReleaseInfoClicked: function(e) {
    e.preventDefault();
    this.$('.new-release').remove()
  },
  onPowerClicked: function() {
    this.$('.power-off-modal').removeClass('hide');
  },
  closePowerModal: function() {
    this.$('.power-off-modal').addClass('hide');
  },
  noHideModel: function(e) {
    e.stopPropagation();
  },
  getExternalFileNames: function() {
  	console.log("External storage options is being selected");

  	$.ajax({
  		url: '/api/files/usblist',
  		type: 'GET',
  		success: function(obj) {
  			// console.log(obj);
  			new ExternalStorageView(obj);

  		},
  		error: function(xhr) {
  			console.log(xhr);
  		}
  	});
  }
});

/* Code for the External Storage View goes here */
var ExternalStorageView = Backbone.View.extend({
	el: "#external-storage-view",
	fileList: null,
	template: _.template($("#external-storage-file-list").html()),
	initialize: function(params) {
		if (params !== undefined) {
			this.fileList = params;
			console.log(params);
		}

		this.render();

	},
	render: function() {

		if (this.fileList !== null) {
			this.$(".external-storage-wizard__files-list").html(this.template({
				fileList: this.fileList
			}));
		}
	}

});