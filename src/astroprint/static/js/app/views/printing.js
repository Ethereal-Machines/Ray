/*
 *  (c) 3DaGoGo, Inc. (product@astroprint.com)
 *
 *  Distributed under the GNU Affero General Public License http://www.gnu.org/licenses/agpl.html
 */

 var TempBarHorizontalView = TempBarView.extend({
  containerDimensions: null,
  scale: null,
  type: null,
  dragging: false,
  lastSent: null,
  events: _.extend(TempBarView.prototype.events, {
    // 'click': 'onClicked'
  }),
  setHandle: function(value) {
    if (!this.dragging) {
      var handle = this.$el.find('.temp-target');
      handle.find('span.target-value').html(value + " &deg;C");
    }
  },
  renderTemps: function(actual, target) {
    var handle = this.$el.find('.temp-target');
    var handleWidth = handle.innerWidth();

    if (target !== null) {
      if (target != handle.find('span.target-value').text()) {
        this.setHandle(Math.min(Math.round(target), this.scale[1]));
      }
    }

    if (actual !== null) {
      this.$el.find('.temp-current').html(Math.round(actual)+'&deg;');
    }
  }
});

var PrintingView = Backbone.View.extend({
  el: '#printing-view',
  events: {
    'click button.stop-print': 'stopPrint',
    'click button.pause-print': 'togglePausePrint',
    'click button.controls': 'showControlPage',
    'show': 'show',
    'hide': 'onHide'
  },
  nozzleBar: null,
  bedBar: null,
  photoView: null,
  printing_progress: null,
  paused: null,
  cancelDialog: null,
  tempObject: null,
  extruderPercentage: null,
  bedPercentage: null,
  initialize: function()
  {
    this.nozzleBar = new TempBarHorizontalView({
      scale: [0, app.printerProfile.get('max_nozzle_temp')],
      el: this.$el.find('.temp-bar.nozzle'),
      type: 'tool0'
    });
    this.bedBar = new TempBarHorizontalView({
      scale: [0, app.printerProfile.get('max_bed_temp')],
      el: this.$el.find('.temp-bar.bed'),
      type: 'bed'
    });

    this.printing_progress = app.socketData.get('printing_progress');
    this.paused = app.socketData.get('paused');

    this.listenTo(app.socketData, 'change:temps', this.onTempsChanged);
    this.listenTo(app.socketData, 'change:paused', this.onPausedChanged);
    this.listenTo(app.socketData, 'change:printing_progress', this.onProgressChanged);

    // this.photoView = new PhotoView({parent: this});
  },
  render: function()
  {
    //Progress data
    // var filenameNode = this.$('.progress .filename');
    var headingNode = this.$('.printing-file-name');

    if (this.printing_progress) {
      if (headingNode.text() != this.printing_progress.printFileName) {
        /* Adding the filename being printed to the Navbar and info section */
        // filenameNode.text(this.printing_progress.printFileName);
        headingNode.text(this.printing_progress.printFileName);
      }

      //progress bar
      // this.$el.find('.progress .meter').css('width', this.printing_progress.percent+'%');
      this.$el.find('.progress .progress-label').text(this.printing_progress.percent+'%');

      //time
      var time = this._formatTime(this.printing_progress.time_left);
      this.$el.find('.estimated-hours').text(time[0]);
      this.$el.find('.estimated-minutes').text(time[1]);
      this.$el.find('.estimated-seconds').text(time[2]);

      //layers
      this.$el.find('.current-layer').text(this.printing_progress.current_layer);
      if (this.printing_progress.layer_count) {
        this.$el.find('.layer-count').text(this.printing_progress.layer_count);
      }

      //heating up
      if (this.printing_progress.heating_up) {
        this.$el.addClass("heating-up");
      } else {
        this.$el.removeClass("heating-up");
      }
    }

    //Paused state
    var pauseBtn = this.$el.find('button.pause-print');
    // var controlBtn = this.$el.find('button.controls');

    if (this.paused) {
      pauseBtn.html('Resume Print');
      // controlBtn.show();
    } else {
      pauseBtn.html('Pause Print');
      // controlBtn.hide();
    }

    var profile = app.printerProfile.toJSON();

    this.nozzleBar.setMax(profile.max_nozzle_temp);

    if (profile.heated_bed) {
      this.bedBar.setMax(profile.max_bed_temp);
      this.bedBar.$el.removeClass('hide');
    } else {
      this.bedBar.$el.addClass('hide');
    }
  },
  onTempsChanged: function(s, value) {

    this.tempObject = value;

    if (!this.$el.hasClass('hide')) {
      this.nozzleBar.setTemps(value.extruder.actual, value.extruder.target);
      this.bedBar.setTemps(value.bed.actual, value.bed.target);

      this.updateProgressBar();
    }
  },
  updateProgressBar: function() {
    var progressBar1,
    progressBar2,
    extruderTarget,
    extruderActual,
    bedTarget,
    bedActual;

    progressBar1 = $('.printing-wizard__progress--nozzle');
    progressBar2 = $('.printing-wizard__progress--bed');

    extruderActual = this.tempObject.extruder.actual;
    extruderTarget = this.tempObject.extruder.target;
    bedActual = this.tempObject.bed.actual;
    bedTarget = this.tempObject.bed.target;

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
  },
  onProgressChanged: function(s, value)
  {
    this.printing_progress = value;
    this.render();
  },
  onPausedChanged: function(s, value)
  {
    this.paused = value;
    this.render();
    // this.photoView.render();
  },
  _formatTime: function(seconds)
  {
    if (seconds == null || isNaN(seconds)) {
      return ['--','--','--'];
    }

    var sec_num = parseInt(seconds, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return [hours, minutes, seconds];
  },
  show: function()
  {
    this.nozzleBar.onResize();
    this.bedBar.onResize();
    this.printing_progress = app.socketData.get('printing_progress');
    this.paused = app.socketData.get('paused');
    this.render();
    // this.photoView.render();
  },
  onHide: function()
  {
    // this.photoView.onPrintingHide();
  },
  stopPrint: function(e)
  {
    if (!this.cancelDialog) {
      this.cancelDialog = new CancelPrintDialog({parent: this});
    }

    this.cancelDialog.open();
  },
  togglePausePrint: function(e)
  {
    var loadingBtn = $(e.target).closest('.loading-button');
    var wasPaused = app.socketData.get('paused');

    loadingBtn.addClass('loading');
    this._jobCommand('pause', null, function(data){
      if (data && _.has(data, 'error')) {
        console.error(data.error);
      } else {
        app.socketData.set('paused', !wasPaused);
      }
      loadingBtn.removeClass('loading');
    });
  },
  showControlPage: function()
  {
    app.router.navigate('control', {trigger: true, replace: true});
    this.$el.addClass('hide');
  },
  _jobCommand: function(command, data, callback)
  {
    $.ajax({
      url: API_BASEURL + "job",
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify(_.extend({command: command}, data))
    }).
    done(function(data){
      if (callback) callback(data);
    }).
    fail(function(error) {
      if (callback) callback({error:error.responseText});
    });
  }
});

var CancelPrintDialog = Backbone.View.extend({
  el: '#cancel-print-modal',
  printJobId: null,
  events: {
    'click button.yes': 'onYesClicked',
    'click button.send': 'onSendClicked',
    'click button.no': 'close',
    'change input[name=reason]': 'onReasonChanged'
  },
  parent: null,
  initialize: function(params)
  {
    this.parent = params.parent;
  },
  open: function()
  {
    this.printJobId = null;
    // this.$el.foundation('reveal', 'open');
    this.$el.removeClass('hide');
    this.$("input[name=reason]").prop("checked", false);
    this.$("input[name=other_text]").val('').addClass('hide');
    this.$('.ask').removeClass('hide');
    this.$('.reasons').addClass('hide').find('h3').removeClass('animated bounceIn');
  },
  close: function()
  {
    // this.$el.foundation('reveal', 'close');
    this.$el.addClass('hide');

  },
  onYesClicked: function(e)
  {
    e.preventDefault();

    var loadingBtn = $(e.target).closest('.loading-button');

    loadingBtn.addClass('loading');

    this.parent._jobCommand('cancel', null, _.bind(function(data) {
      // this.parent.photoView.onHide();

      if (data && _.has(data, 'error')) {
        var error = JSON.parse(data.error);
        if (error.id == 'no_active_print') {
          noty({text: "No Print Job is active", type: "warning" , timeout: 3000});
          this.close();
        } else {
          noty({text: "There was an error canceling your job.", timeout: 3000});
        }
        loadingBtn.removeClass('loading');
      } else {
        if (data.print_job_id) {
          this.printJobId = data.print_job_id;
          this.$('.ask').addClass('hide');
          this.$('.reasons').removeClass('hide').find('h3').addClass('animated bounceIn');
          loadingBtn.removeClass('loading');
        } else {
          setTimeout(_.bind(function() {
            loadingBtn.removeClass('loading');
            this.close();
          }, this), 1500);
        }
      }
    }, this));

    this.$el.addClass('hide');
  },
  onSendClicked: function(e)
  {
    var reasonVal = this.$("input[name=reason]:checked").val();

    if (reasonVal && this.printJobId) {
      var loadingBtn = $(e.target).closest('.loading-button');
      var reasonData = null;

      loadingBtn.addClass('loading');

      reasonData = {
        reason: reasonVal
      };

      if (reasonVal == 'other') {
        var otherText = this.$("input[name=other_text]").val();

        if (otherText) {
          reasonData['other_text'] = otherText;
        }
      }

      $.ajax({
        url: API_BASEURL + 'astroprint/print-jobs/'+this.printJobId+'/add-reason',
        type: "PUT",
        dataType: "json",
        contentType: "application/json; charset=UTF-8",
        data: JSON.stringify(reasonData)
      })
        .always(_.bind(function(){
          loadingBtn.removeClass('loading');
          this.close();
        }, this))
        .fail(function(error) {
          console.error(error);
        });
    } else {
      this.close();
    }
  },
  onReasonChanged: function(e)
  {
    var value = $(e.currentTarget).val();
    var otherText = this.$('input[name=other_text]');

    if (value == 'other') {
      otherText.removeClass('hide').focus();
    } else {
      otherText.addClass('hide');
    }
  }
});
