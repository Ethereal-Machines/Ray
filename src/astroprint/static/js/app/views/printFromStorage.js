/*********************************
* Code by Kanishka Mohan Madhuni *
**********************************/

var PrintFromStorageView = Backbone.View.extend({
	el: "#print-from-storage-view",
	events: {
    "click .utility-button": "getButtonName"
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
	initialize: function() {

    this.getExternalFileNames();

		this.printFileView = new PrintFileView({
			list: this.list,
			print_file: this.print_file
		});

    this.listenTo(app.socketData, 'change:usb_status', this.usbStatusChanged);
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
  getExternalFileNames: function() {
    var self = this;
    $.ajax({
      url: '/api/usbfiles/usblist',
      type: 'GET',
      success: function(obj) {
        self.fileList = obj;
        self.render();
        if (!$.isEmptyObject(self.fileList)) {
          self.$('.down-button').removeClass('disable-btn');
        }
      },
      error: function(xhr) {
        console.log(xhr);
      }
    });
  },
  usbStatusChanged: function(s, value) {
    var self = this;
    if (value) {
      $.ajax({
        url: '/api/usbfiles/usblist',
        type: 'GET',
        success: function(obj) {
          self.fileList = obj;
          self.render();
          if (!$.isEmptyObject(self.fileList)) {
            self.$('.down-button').removeClass('disable-btn');
          }
        },
        error: function(xhr) {
          console.log(xhr);
        }
      });
    } else if (!value) {
      self.$('.external-storage-wizard__files-list').empty();
      self.$('.up-button').addClass('disable-btn');
      self.$('.down-button').addClass('disable-btn');
      self.scrolled = 0;
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