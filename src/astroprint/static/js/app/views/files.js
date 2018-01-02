/*
 *  (c) AstroPrint Product Team. 3DaGoGo, Inc. (product@astroprint.com)
 *  (c) Kanishka Mohan Madhuni (kmmadhuni@gmail.com)
 * 
 *  Distributed under the GNU Affero General Public License http://www.gnu.org/licenses/agpl.html
 */


/*
 * Changes included for new UI requirements
 * 1) Code for the PrintFileInfoDialog has been changed as per the new UI requirements
 * 2) Code realted to the Uploading items from the local machines have been removed
 */

var PrintFileInfoDialog = Backbone.View.extend({
  el: '#print-file-info',
  file_list_view: null,
  template: _.template( $("#printfile-info-template").html() ),
  print_file_view: null,
  notifyView: null,
  events: {
    'click .actions a.remove': 'onDeleteClicked',
    'click .actions a.print': 'onPrintClicked',
    'click .back-button': 'hideModel'
  },
  initialize: function(params)
  {
    this.file_list_view = params.file_list_view;
  },
  render: function()
  {
    this.$el.find('.dlg-content').html(this.template({
      p: this.print_file_view.print_file.toJSON(),
      time_format: app.utils.timeFormat
    }));

    // console.log(this.print_file_view.print_file);
  },
  open: function(print_file_view)
  {
    this.print_file_view = print_file_view;
    this.render();
    // this.$el.foundation('reveal', 'open');
    this.$el.removeClass('hide');
  },
  onDeleteClicked: function(e)
  {
    var self = this;
    e.preventDefault();

    var print_file = this.print_file_view.print_file;

    if (print_file) {
      var filename = print_file.get('local_filename');
      var id = print_file.get('id');
      var loadingBtn = $(e.currentTarget).closest('.loading-button');

      loadingBtn.addClass('loading');
      $.ajax({
        url: '/api/files/local/'+filename,
        type: "DELETE",
        success: _.bind(function() {
          //Update model
          if (print_file.get('local_only')) {
            this.file_list_view.file_list.remove(print_file);
          } else {
            print_file.set('local_filename', false);
            print_file.set('uploaded_on', null);
          }

          self.notifyView = new NotifyView({msg: filename+" deleted from your internal storage.", type: "success"});
          app.router.selectView(self.notifyView);

        }, this),
        error: function() {
          var self = this;
          self.notifyView = new NotifyView({msg: "Error deleting "+filename+".", type: "error"});
          app.router.selectView(self.notifyView);
        },
        always: function() {
          loadingBtn.removeClass('loading');
        }
      });
    }

    this.$el.addClass('hide');
  },
  onPrintClicked: function(e, params)
  {
    this.print_file_view.printClicked(e, null);
    this.$el.addClass('hide');
  },
  onDownloadClicked: function(e)
  {
    this.print_file_view.downloadClicked(e);
    this.$el.addClass('hide');
  },
  hideModel: function() {
    this.$el.addClass('hide');
  }
});

var PrintFileView = Backbone.View.extend({
  template: _.template( $("#print-file-template").html() ),
  print_file: null,
  list: null,
  printWhenDownloaded: false,
  downloadProgress: null,
  notifyView: null,
  initialize: function(options)
  {
    this.list = options.list;
    this.print_file = options.print_file;
  },
  render: function()
  {
    var print_file = this.print_file.toJSON();

    if (print_file.local_filename) {
      this.$el.removeClass('remote');
    } else {
      this.$el.addClass('remote');
    }

    if (print_file.printFileName) {
      print_file.name = print_file.printFileName;
    }

    this.$el.empty();
    this.downloadProgress = null;

    /* Adding the template to the div, passing the details*/
    this.$el.html(this.template({
      p: print_file,
      time_format: app.utils.timeFormat,
      size_format: app.utils.sizeFormat
    }));

    this.delegateEvents({
      // 'infoClicked function will display the informations regarding the files being clicked'
      // 'click .left-section, .middle-section': 'infoClicked',
      'click .left-section, .middle-section__heading': 'infoClicked',
      // handeling the event when Print button is clicked
      'click a.print': 'printClicked',
    });
  },
  // callback funtion to handle the Info Button clicked event
  infoClicked: function(evt)
  {
    if (evt) evt.preventDefault();

    // $("#print-file-info").css('display', 'block');
    $("#print-file-info").removeClass('hide');

    this.list.info_dialog.open(this);
  },
  // callback function to handle the Print button clicked event
  printClicked: function (evt, params)
  {
    var self = this;

    if (evt) evt.preventDefault();

    if (params !== null) {
      var filename = params.filename;
    } else {
      var filename = this.print_file.get('local_filename');
    }

    if (filename) {
      //We can't use evt because this can come from another source than the row print button
      var loadingBtn = this.$('.loading-button.print');

      loadingBtn.addClass('loading');
      $.ajax({
          url: '/api/files/local/'+filename,
          type: "POST",
          dataType: "json",
          contentType: "application/json; charset=UTF-8",
          data: JSON.stringify({command: "select", print: true})
      })
      .done(_.bind(function() {
        setTimeout(function(){
          loadingBtn.removeClass('loading');
        },2000);
      }, this))
      .fail(function(xhr) {
        var error = null;
        if (xhr.status == 409) {
          error = xhr.responseText;
        }

        self.notifyView = new NotifyView({msg: "There was an error starting the print.", type: "error"});
        app.router.selectView(self.notifyView);
      })
    } else {
      //We need to download and print
      this.printWhenDownloaded = true;
      this.downloadClicked();
    }
  }
});

var StorageControlView = Backbone.View.extend({
  print_file_view: null,
  events: {
    'click a.local': 'localClicked',
    'click a.cloud': 'cloudClicked'
  },
  selected: null,
  initialize: function(options)
  {
    this.print_file_view = options.print_file_view;
  },
  selectStorage: function(storage)
  {
    this.$('a.active').removeClass('active');
    this.$('a.'+storage).addClass('active');
    this.selected = storage;
    this.print_file_view.render();
  },
  localClicked: function(e)
  {
    e.preventDefault();
    this.selectStorage('local');
  },
  cloudClicked: function(e)
  {
    e.preventDefault();

    if (LOGGED_USER) {
      this.selectStorage('cloud');
    } else {
      $('#login-modal').foundation('reveal', 'open');
    }
  }
});

var PrintFilesListView = Backbone.View.extend({
  info_dialog: null,
  print_file_views: [],
  storage_control_view: null,
  file_list: null,
  refresh_threshold: 1000, //don't allow refreshes faster than this (in ms)
  last_refresh: 0,
  refreshing: false,
  notifyView: null,
  events: {
    'click .list-header button.sync': 'forceSync'
  },
  initialize: function(options) {
    this.file_list = new PrintFileCollection();
    this.info_dialog = new PrintFileInfoDialog({file_list_view: this});
    this.storage_control_view = new StorageControlView({
      el: this.$('.list-header ul.storage'),
      print_file_view: this
    });

    app.eventManager.on('astrobox:cloudDownloadEvent', this.downloadProgress, this);
    app.eventManager.on('astrobox:MetadataAnalysisFinished', _.bind(this.onMetadataAnalysisFinished, this));
    this.listenTo(this.file_list, 'remove', this.onFileRemoved);

    this.refresh(options.forceSync, options.syncCompleted);
  },
  render: function()
  {
    var list = this.$('.design-list-container');
    var selectedStorage = this.storage_control_view.selected;

    list.children().detach();

    if (selectedStorage) {
      var filteredViews = _.filter(this.print_file_views, function(p){
        if (selectedStorage == 'local') {
          if (p.print_file.get('local_filename')) {
            return true
          }
        } else if (!p.print_file.get('local_only')) {
          return true;
        }

        return false;
      });
    } else {
      var filteredViews = this.print_file_views;
    }

    if (filteredViews.length) {
      _.each(filteredViews, function(p) {
        list.append(p.$el);
      });
    } else {
      list.html(
        '<div class="empty panel radius" align="center">'+
        ' <i class="icon-inbox empty-icon"></i>'+
        ' <h3>Nothing here yet.</h3>'+
        '</div>'
      );
    }
  },
  refresh: function(syncCloud, doneCb)
  {
    var now = new Date().getTime();
    var self = this;
    if (this.last_refresh == 0 || this.last_refresh < (now - this.refresh_threshold) ) {
      this.last_refresh = now;

      if ( !this.refreshing ) {
        this.refreshing = true;

        if (syncCloud) {
          var loadingArea = this.$('.loading-button.sync');
          var syncPromise = this.file_list.syncCloud();
        } else {
          var loadingArea = this.$('.local-loading');
          var syncPromise = this.file_list.fetch();
        }

        loadingArea.addClass('loading');
        syncPromise
          .done(_.bind(function(){
            this.print_file_views = [];
            this.file_list.each(_.bind(function(print_file, idx) {
              var print_file_view = new PrintFileView({
                list: this,
                print_file: print_file,
                attributes: {'class': 'row'+(idx % 2 ? ' dark' : '')}
              });
              print_file_view.render();
              this.print_file_views.push( print_file_view );
            }, this));

            this.$('.design-list-container').empty();
            this.render();

            if (_.isFunction(doneCb)) {
              doneCb(true);
            }

            $.localtime.format(this.$el);

            loadingArea.removeClass('loading');
            this.refreshing = false;
          }, this))
          .fail(_.bind(function(){
            self.notifyView = new NotifyView({msg: "There was an error retrieving print files.", type: "error"});
            app.router.selectView(self.notifyView);

            if (_.isFunction(doneCb)) {
              doneCb(false);
            }

            loadingArea.removeClass('loading');
            this.refreshing = false;
          }, this));
      }
    }
  },
  downloadProgress: function(data)
  {
    var print_file_view = _.find(this.print_file_views, function(v) {
      return v.print_file.get('id') == data.id;
    });

    if (print_file_view) {
      var progressContainer = print_file_view.$('.print-file-options');

      switch (data.type) {
        case 'progress':
        {
          if (!progressContainer.hasClass('downloading')) {
            progressContainer.addClass('downloading');
          }

          if (!print_file_view.downloadProgress) {
            var progress = progressContainer.find('.download-progress');

            // using jquery-circle-progress Plugin to display the progress
            print_file_view.downloadProgress = progress.circleProgress({
              value: 0,
              animation: false,
              size: progressContainer.innerWidth() - 25,
              fill: { color: 'black' }
            });
          } else {
            print_file_view.downloadProgress.circleProgress({value: data.progress / 100.0});
          }

          var label = print_file_view.$('.download-progress span');

          label.html(Math.floor(data.progress) + '<i>%</i>');
        }
        break;

        case 'success':
        {
          var print_file = print_file_view.print_file;

          if (print_file) {
            print_file.set('local_filename', data.filename);
            print_file.set('print_time', data.print_time);
            print_file.set('layer_count', data.layer_count);
            print_file.set('uploaded_on', Date.now() / 1000);

            print_file_view.render();
            $.localtime.format(print_file_view.$el);

            if (print_file_view.printWhenDownloaded) {
              print_file_view.printWhenDownloaded = false;
              print_file_view.printClicked();
            }
          }
        }
        break;

        case 'error':
        {
          progressContainer.removeClass('downloading').addClass('failed');
          console.error('Error downloading file: '+data.reason);
          setTimeout(function(){
            progressContainer.removeClass('failed');
          },3000);
        }
        break;

        case 'cancelled':
        {
          progressContainer.removeClass('downloading');
        }
        break;
      }
    }
  },
  forceSync: function()
  {
    this.refresh(true);
  },
  onFileRemoved: function(print_file)
  {
    //Find the view that correspond to this print file
    var view = _.find(this.print_file_views, function(v) {
      return v.print_file == print_file;
    });

    if (view) {
      //Remove from DOM
      view.remove();

      //Remove from views array
      this.print_file_views.splice(this.print_file_views.indexOf(view), 1);
    }
  },
  onMetadataAnalysisFinished: function(data)
  {
    var affected_view = _.find(this.print_file_views, function(v){
      return v.print_file.get('name') == data.file;
    });

    if (affected_view) {
      affected_view.print_file.set('info', data.result);
      affected_view.render();
    }
  }
});

var FilesView = Backbone.View.extend({
  el: '#files-view',
  printFilesListView: null,
  scrolled: 0,
  fileListLength: 0,
  checkFiles: null,
  reachedBottom: false,
  events: {
    'show': 'onShow',
    'click .up-button': 'scrollUp',
    'click .down-button': 'scrollDown'
  },
  initialize: function(options){
    // Initializing the PrintFilesListView and passing the params
    this.printFilesListView = new PrintFilesListView({
      el: this.$el.find('.design-list'),
      forceSync: options.forceSync, // taking the values from the options parameter
      syncCompleted: options.syncCompleted // taking the values from the options parameter
    });

    var actualFilesLength = this.printFilesListView.print_file_views.length;

    // console.log("Actual no of files are " + actualFilesLength);

    this.fileListLength = actualFilesLength;

    var self = this;

    this.checkFiles = setInterval(function() {

      var actualFilesLength = self.printFilesListView.print_file_views.length;
      self.fileListLength = actualFilesLength;
      // console.log("The current no of files are : " + self.fileListLength);

      if (actualFilesLength <= 5) {
        // console.log("No of files are < than 5, no scrolling");
        self.$('.down-button').addClass('disable-btn');
        self.$('.up-button').addClass('disable-btn');
      } else {
        // self.reachedBottom = false;
        if (self.reachedBottom === true) {
          // console.log("Hey hey I have reached to the bottom, again adding the disable-btn class to Down btn");
          self.$('.down-button').addClass('disable-btn');
        } else {
          // console.log("No of files are > 5, scrolling enabled, removing the disable-btn class from Down btn");
          self.$('.down-button').removeClass('disable-btn');
        }
      }
    }, 1000);

    this.listenTo(app.printerProfile, 'change:driver', this.onDriverChanged);
  },
  onShow: function(){
    this.printFilesListView.refresh(false);
  },
  // this function is the callback function for the event is Driver changes
  onDriverChanged: function(){
    this.uploadView.render();
    this.printFilesListView.refresh(true);
  },
  scrollDown: function() {
    var self = this;
    this.scrolled = this.scrolled + 282;
    this.$('.design-list-container').animate({
      scrollTop: self.scrolled
    });

    self.$('.up-button').removeClass('disable-btn');

    var target = self.$('.design-list-container');
    var scrollTop = target.scrollTop();
    var innerHeight = target.innerHeight();
    var scrollHeight = target[0].scrollHeight;

    target.scroll(function() {
      if (self.scrolled + innerHeight >= scrollHeight) {
        self.reachedBottom = true;
        self.$('.down-button').addClass('disable-btn');
      }
    });
  },
  scrollUp: function() {
    var self = this;
    // making the reachedBottom 'false' immediately when the Scroll Up button is clicked
    self.reachedBottom = false;
    this.scrolled = this.scrolled - 282;
    this.$('.design-list-container').animate({
      scrollTop: self.scrolled
    });

    self.$('.down-button').removeClass('disable-btn');

    var target = self.$('.design-list-container');
    var scrollTop = target.scrollTop();
    var innerHeight = target.innerHeight();
    var scrollHeight = target[0].scrollHeight;

    target.scroll(function() {
      if (self.scrolled === 0) {
        // console.log("Reached bottom");
        self.$('.up-button').addClass('disable-btn');
      }
    });
  }
});