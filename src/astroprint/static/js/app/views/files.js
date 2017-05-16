/******************************************
* Code modified by Kanishka Mohan Madhuni *
*******************************************/

/***********
* Changes: *
************
1) Code for the PrintFileInfoDialog has been changed as per the new UI requirements
2) Code realted to the Uploading items from the local machines have been removed
*/

var PrintFileInfoDialog = Backbone.View.extend({
  el: '#print-file-info',
  file_list_view: null,
  template: _.template( $("#printfile-info-template").html() ),
  print_file_view: null,
  events: {
    'click .actions a.remove': 'onDeleteClicked',
    'click .actions a.print': 'onPrintClicked',
    'click .back-button': 'hideModel'
  },
  initialize: function(params)
  {
    console.log("PrintFileInfoDialog is being initialized");
    this.file_list_view = params.file_list_view;
  },
  render: function()
  {
    this.$el.find('.dlg-content').html(this.template({
      p: this.print_file_view.print_file.toJSON(),
      time_format: app.utils.timeFormat
    }));
  },
  open: function(print_file_view)
  {
    this.print_file_view = print_file_view;
    this.render();
    this.$el.foundation('reveal', 'open');
  },
  onDeleteClicked: function(e)
  {
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

          noty({text: filename+" deleted from your "+PRODUCT_NAME, type:"success", timeout: 3000});
          this.print_file_view.render();
          this.$el.foundation('reveal', 'close');
        }, this),
        error: function() {
          noty({text: "Error deleting "+filename, timeout: 3000});
        },
        always: function() {
          loadingBtn.removeClass('loading');
        }
      });
    }
  },
  onPrintClicked: function(e)
  {
    this.print_file_view.printClicked(e);
    this.$el.foundation('reveal', 'close');
  },
  onDownloadClicked: function(e)
  {
    this.print_file_view.downloadClicked(e);
    this.$el.foundation('reveal', 'close');
  },
  hideModel: function() {
    console.log("Back button is clicked");
    console.log(this.$el);
    this.$el.css('opacity', '0');
  }
});

var PrintFileView = Backbone.View.extend({
  template: _.template( $("#print-file-template").html() ),
  print_file: null,
  list: null,
  printWhenDownloaded: false,
  downloadProgress: null,
  initialize: function(options)
  {
    console.log("PrintFileView is being initialized");
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
    this.$el.html(this.template({
      p: print_file,
      time_format: app.utils.timeFormat,
      size_format: app.utils.sizeFormat
    }));

    this.delegateEvents({
      // 'infoClicked function will display the informations regarding the files being clicked'
      'click .left-section, .middle-section': 'infoClicked',
      // handeling the event when Print button is clicked
      'click a.print': 'printClicked',
      // hadeling the event when Download button is clicked
      'click a.download': 'downloadClicked',
      // handeling the event when the CancelDownload button is clicked
      'click a.dw-cancel': 'cancelDownloadClicked'
    });
  },
  // callback funtion to handle the Info Button clicked event
  infoClicked: function(evt)
  {
    if (evt) evt.preventDefault();
    
    $("#print-file-info").css('opacity', '1');

    this.list.info_dialog.open(this);
  },

  // callback function to handle the Dowload button clicked event
  downloadClicked: function(evt)
  {
    if (evt) evt.preventDefault();

    $.getJSON('/api/astroprint/print-files/'+this.print_file.get('id')+'/download')
      .fail(function(){
        noty({text: "There was an error starting the download.", timeout: 3000});
      });
  },

  // callback function to handle the Cancel Download button clicked event
  cancelDownloadClicked: function(evt)
  {
    evt.preventDefault();

    $.ajax({
      url: '/api/astroprint/print-files/'+this.print_file.get('id')+'/download',
      method: 'DELETE'
    })
      .fail(function() {
        noty({text: "Unable to cancel download.", timeout: 3000});
      });
  },

  // callback function to handle the Print button clicked event
  printClicked: function (evt)
  {
    if (evt) evt.preventDefault();

    var filename = this.print_file.get('local_filename');

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
        noty({text: error ? error : "There was an error starting the print", timeout: 3000});
        loadingBtn.removeClass('loading');
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
    console.log("StorageControlView is being initialized");
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
  events: {
    'click .list-header button.sync': 'forceSync'
  },
  initialize: function(options) {
    console.log("PrintFilesListView is being initialized");
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
            noty({text: "There was an error retrieving print files", timeout: 3000});

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
  events: {
    'show': 'onShow'
  },
  initialize: function(options){
    // Initializing the PrintFilesListView and passing the params
    this.printFilesListView = new PrintFilesListView({
      el: this.$el.find('.design-list'),
      forceSync: options.forceSync, // taking the values from the options parameter
      syncCompleted: options.syncCompleted // taking the values from the options parameter
    });

    this.listenTo(app.printerProfile, 'change:driver', this.onDriverChanged);
  },
  onShow: function(){
    this.printFilesListView.refresh(false);
  },
  // this function is the callback function for the event is Driver changes
  onDriverChanged: function(){
    this.uploadView.render();
    this.printFilesListView.refresh(true);
  }
});