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
  	$.ajax({
  		url: '/api/usbfiles/usblist',
  		type: 'GET',
  		success: function(obj) {
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
	printFileView: null,
	list: null,
	print_file: null,
	copySuccessData: null,
	initialize: function(params) {
		if (params !== undefined) {
			this.fileList = params;
		}

		this.printFileView = new PrintFileView({
			list: this.list,
			print_file: this.print_file
		});

		this.render();

	},
	render: function() {

		if (this.fileList !== null) {
			this.$(".external-storage-wizard__files-list").html(this.template({
				fileList: this.fileList
			}));

			this.delegateEvents({
				'click .external-storage__file-name': 'openPrintModal',
				'click .back-button--external-storage': 'hidePrintModal',
				'click .copy--external-storage': 'copyFileToLocal',
				'click .print-file--external-storage': 'printFile'
			});
		}
	},
	openPrintModal: function(e) {

		e.preventDefault();

		var target = $(e.target);
		var targetName = target.text();

		this.$(".external-stroage-wizard__confrim-print-modal").removeClass('hide');
		this.$(".external-stroage-wizard__confrim-print-modal").find('.file-name').text(targetName);
		this.$(".print-file--external-storage").css('pointer-events', 'none');

	},
	hidePrintModal: function() {
		this.$(".external-stroage-wizard__confrim-print-modal").addClass('hide');
	},
	copyFileToLocal: function(e) {
		e.preventDefault();
		var targetName = $(".file-name--external-storage").text();

		var name, fullpath;

		if (this.fileList !== null) {
			for (var key in this.fileList) {
				if (this.fileList[key].filename === targetName) {
					name = this.fileList[key].filename;
					fullpath = this.fileList[key].fullpath;

					var data = {
						filename: name,
						filepath: fullpath
					}

					var self = this;

					$.ajax({
						url: "/api/usbfiles/copyusb",
						method: "GET",
						data: data,
						success: function(data) {

							self.copySuccessData = data;

							self.$(".print-info__no-details").text("Your File Copied Successfully!");
							self.$(".copy--external-storage").css('pointer-events', 'none');
							self.$(".print-file--external-storage").css('pointer-events', 'auto');

						},
						error: function(xhr) {
							console.log(xhr);
						}
					});
				}
			}
		}

	},
	printFile: function(e) {
		var self = this;
		if (self.copySuccessData !== null) {
			self.printFileView.printClicked(e, {filename: self.copySuccessData.localFileName});
		} else {
			this.$(".print-info__no-details").text("First copy the file in order to print.");
			this.$(".print-file--external-storage").css('pointer-events', 'none');
		}

		this.$(".copy--external-storage").css('pointer-events', 'auto');
		this.$(".print-file--external-storage").css('pointer-events', 'none');
		this.$(".print-info__no-details").text("Analyzing G-code");
		this.hidePrintModal();
	}
});