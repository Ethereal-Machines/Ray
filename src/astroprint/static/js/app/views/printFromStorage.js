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
    'click .external-storage-button': 'getExternalFileNames',
    'click .power-off-button': 'doTurnoff',
    'click .restart-button': 'doRestart'
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
    name.html("<a href='#'>Print from Storage</a>");
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
  			console.log(obj);
  			new ExternalStorageView(obj);
  		},
  		error: function(xhr) {
  			console.log(xhr);
  		}
  	});
  },
  doTurnoff: function() {
    var data = {"action": "shutdown", "command": "sudo shutdown now"};
    $.ajax({
      url: API_BASEURL + "system",
      type: "POST",
      dataType: 'json',
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify(data),
      success: function() {
        console.log("success!!!!");
      },
      error: function(xhr) {
        console.log(xhr);
      }
    });
  },
  doRestart: function() {
    var data = {"action": "restart", "command": "sudo reboot now"};
    $.ajax({
      url: API_BASEURL + "system",
      type: "POST",
      dataType: 'json',
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify(data),
      success: function() {
        console.log("success!!!!");
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
  scrolled: 0,
	initialize: function(params) {
		if (params !== undefined) {
			this.fileList = params;
		}

    if (!$.isEmptyObject(params)) {
      this.$('.down-button').removeClass('disable-btn');
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
				'click .print-file--external-storage': 'printFile',
        'click .up-button': 'scrollUp',
        'click .down-button': 'scrollDown'
			});
		}
	},
	openPrintModal: function(e) {

		e.preventDefault();

		var target = $(e.target);
		var targetName = target.text();

		this.$(".external-stroage-wizard__confrim-print-modal").removeClass('hide');
		this.$(".external-stroage-wizard__confrim-print-modal").find('.file-name').text(targetName);
		this.$(".print-file--external-storage").css({'pointer-events': 'none', 'opacity': '.5'});

	},
	hidePrintModal: function() {
		this.$(".external-stroage-wizard__confrim-print-modal").addClass('hide');
		this.$(".print-info__no-details").text("Analyzing G-Code");
		this.$(".copy--external-storage").css({'pointer-events': 'auto', 'opacity': '1'});
		this.$(".print-file--external-storage").css({'pointer-events': 'none', 'opacity': '.5'});
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
							self.$(".copy--external-storage").css({'pointer-events': 'none', 'opacity': '.5'});
							self.$(".print-file--external-storage").css({'pointer-events': 'auto', 'opacity': '1'});

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
	},
  scrollDown: function() {
    var self = this;
    this.scrolled = this.scrolled + 280;
    this.$('.external-storage-wizard__files-list').animate({
      scrollTop: self.scrolled
    });

    self.$('.up-button').removeClass('disable-btn');

    var target = self.$('.external-storage-wizard__files-list');
    var scrollTop = target.scrollTop();
    var innerHeight = target.innerHeight();
    var scrollHeight = target[0].scrollHeight;

    target.scroll(function() {
      if (self.scrolled + innerHeight >= scrollHeight) {
        self.$('.down-button').addClass('disable-btn');
      }
    });
  },
  scrollUp: function() {
    var self = this;
    this.scrolled = this.scrolled - 280;
    this.$('.external-storage-wizard__files-list').animate({
      scrollTop: self.scrolled
    });

    var target = self.$('.external-storage-wizard__files-list');
    var scrollTop = target.scrollTop();
    var innerHeight = target.innerHeight();
    var scrollHeight = target[0].scrollHeight;

    self.$('.down-button').removeClass('disable-btn');

    target.scroll(function() {
      if (self.scrolled === 0) {
        // console.log("Reached bottom");
        self.$('.up-button').addClass('disable-btn');
      }
    });
  }
});