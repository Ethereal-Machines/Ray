/*
 *  (c) Daniel Arroyo. 3DaGoGo, Inc. (daniel@astroprint.com)
 *
 *  Distributed under the GNU Affero General Public License http://www.gnu.org/licenses/agpl.html
 */

var AppRouter = Backbone.Router.extend({
  homeView: null,
  filesView: null,
  controlView: null,
  // adding filament-wizard views
  filamentLoadView: null,
  filament2LoadView: null,
  filamentUnloadView: null,
  filament2UnloadView: null,
  // adding print-from-storage view
  printFromStorageView: null,
  // adding external storage view
  externalStorageView: null,
  preheatingView: null,
  generalSettingsView: null,
  settingsView: null,
  printingView: null,
  terminalView: null,
  cameraView: null,
  suppliesView: null,
  helpView: null,
  utilityView: null,
  aboutView: null,
  connectivityView: null,
  wifiView: null,
  routes: {
    "": "home",
    "files": "files",
    "file-info/:fileId": "fileInfo",
    "control": "control",
    // adding routes for the filament-wizards
    "filament-load-wizard": "filamentLoad",
    "filament-unload-wizard": "filamentUnload",
    "filament2-load-wizard": "filamentLoad2",
    "filament2-unload-wizard": "filamentUnload2",
    // adding routes for the print-from-storage
    "print-from-storage": "printFromStorage",
    // adding routes for the external storage view
    "external-storage": "externalStorage",
    // adding routes for the preheating view
    "preheating": "preHeating",
    "printing": "printing",
    "general-settings": "generalSettings",
    "settings": "settings",
    "utilities": "utilities",
    "about":"about",
    // adding routes for the connectivity view
    "connectivity": "connectivity",
    "connectivity/#wifi": "wifi",
    "settings/:page": "settings",
    "gcode-terminal": "terminal",
    "camera": "camera",
    "supplies": "supplies",
    "help": "help",
    "*notFound": "notFound"
  },
  turningOff: false,
  execute: function(callback, args)
  {
    if (callback) {
      is_paused = app.socketData.get('paused');
      is_printing = app.socketData.get('printing');

      if (is_printing || is_paused) {
        app.setPrinting();

        if  (callback != this.printing &&
          (callback != this.control || !is_paused)
        ) {
          this.navigate('printing', {trigger: true, replace:true});
          return;
        }
      } else if (callback == this.printing) {
        this.navigate('', {trigger: true, replace:true});
        return;
      }

      callback.apply(this, args);
    }
  },
  home: function()
  {
    if (!this.homeView) {
      this.homeView = new HomeView({forceSync: false});
    }

    this.selectView(this.homeView);
    app.selectQuickNav('dash');
  },
  files: function()
  {
    this.loadFilesView(false);
    this.selectView(this.filesView);
    app.selectQuickNav('files');
  },
  fileInfo: function(fileId)
  {
    var showDlg = _.bind(function(success) {
      if (success) {
        this.filesView.fileInfo(fileId);
      }
    }, this);

    if (this.filesView) {
      this.filesView.printFilesListView.refresh(true, showDlg);
    } else {
      this.filesView = new FilesView({
        forceSync: true,
        syncCompleted: showDlg
      });
    }

    this.navigate('files', {trigger: true, replace:true});
  },
  control: function()
  {
    if (!this.controlView) {
      this.controlView = new ControlView();
    }

    this.selectView(this.controlView);
    app.selectQuickNav('control');
  },
  /*
    adding function to handle the routing for 'filament-load' & 'filament-unload'
    wizard
  */
  filamentLoad: function() {
    if (!this.filamentLoadView) {
      this.filamentLoadView = new FilamentLoadView();
    }

    this.selectView(this.filamentLoadView);
  },
  filamentLoad2: function() {
    if (!this.filament2LoadView) {
      this.filament2LoadView = new Filament2LoadView();
    }

    this.selectView(this.filament2LoadView);
  },
  filamentUnload: function() {
    if (!this.filamentUnloadView) {
      this.filamentUnloadView = new FilamentUnloadView();
    }

    this.selectView(this.filamentUnloadView);
  },
  filamentUnload2: function() {
    if (!this.filament2UnloadView) {
      this.filament2UnloadView = new Filament2UnloadView();
    }

    this.selectView(this.filament2UnloadView);
  },
  /*
    adding function to handle the routing for 'print-from-storage'
  */
  printFromStorage: function() {
    if(!this.printFromStorageView) {
      this.printFromStorageView = new PrintFromStorageView();
    }

    this.selectView(this.printFromStorageView);
  },
  /*
    adding function to handle the routing for 'external-storage'
  */
  externalStorage: function() {
    var self = this;
    if (!this.externalStorageView) {
      this.externalStorageView = new ExternalStorageView();
    }

    this.selectView(this.externalStorageView);
  },
  /*
    adding function to handle the routing for 'preheating'
  */
  preHeating: function() {
    var self = this;
    if(!this.preheatingView) {
      this.preheatingView = new PreheatingView({
        updatedTemp: this.updatedTemp
      });
    }

    this.selectView(this.preheatingView);
  },
  printing: function()
  {
    if (!this.printingView) {
      this.printingView = new PrintingView();
    }

    this.selectView(this.printingView);
  },
  generalSettings: function() {
    if (!this.generalSettingsView) {
      this.generalSettingsView = new GeneralSettingsView();
    }

    this.selectView(this.generalSettingsView);
  },
  settings: function(page)
  {
    if (!this.settingsView) {
      this.settingsView = new SettingsView();
    }

    this.selectView(this.settingsView);

    /* 
      Commenting the below code as per the current SettingView page 
      This needs to be added later on in the project
    */
    // this.settingsView.menu.changeActive(page || 'printer-connection');
    // app.selectQuickNav('settings');
  },
   utilities: function()
  {
    if (!this.utilityView) {
      this.utilityView = new UtilityView();
    }

    this.selectView(this.utilityView);
  
  },
  /*about added*/
     about: function()
  {
    if (!this.aboutView) {
      this.aboutView = new AboutView();
    }

    this.selectView(this.aboutView);
  
  },
  connectivity: function() {
    if (!this.connectivityView) {
      this.connectivityView = new ConnectivityView();
    }

    this.selectView(this.connectivityView);
    this.connectivityView.getWifiSettings();
  },
  wifi: function() {
    if (!this.wifiView) {
      this.wifiView = new WifiView();
    }

    this.selectView(this.wifiView);
    this.wifiView.getStoredWifi();
  },
  terminal: function()
  {
    if (!this.terminalView) {
      this.terminalView = new TerminalView();
    }

    this.selectView(this.terminalView);
  },
  camera: function()
  {
    if (!this.cameraView) {
      this.cameraView = new CameraView();
    }

    this.selectView(this.cameraView);
    app.selectQuickNav('camera');
  },
  selectView: function(view)
  {
    var currentView = app.$el.find('.app-view.active');
    var targetView = view.$el;
    var targetId = targetView.attr('id');

    targetView.removeClass('hide').addClass('active');
    targetView.trigger('show');

    if (targetView.data('fullscreen')) {
      $('#app').addClass('hide');

      currentView.each(function(idx, el) {
        var $el = $(el);

        if ($el.attr('id') != targetId && $el.data('fullscreen')) {
          //If we have another fullscreen view, hide it
          $el.addClass('hide').removeClass('active');
        }
      });

      currentView.trigger('hide');
    } else {
      if (currentView.attr('id') != targetId) {
        currentView.addClass('hide').removeClass('active');
        currentView.trigger('hide');

        if (targetId == 'control-view') {

          /* 
          * below function call is commented because the
          * functionality is disabled for some time
          */

          /* Comment-change#1 */
          // this.controlView.tempView.resetBars();
        }
      }

      app.selectQuickNav();
    }
  },
  notFound: function()
  {
    this.navigate("", {trigger: true, replace: true});
  },
  supplies: function()
  {
    if (!this.suppliesView) {
      this.suppliesView = new SuppliesView();
    }

    this.selectView(this.suppliesView);
  },
  help: function()
  {
    if (!this.helpView) {
      this.helpView = new HelpView();
    }

    this.selectView(this.helpView);
  },

  // View Loading outside of navigation
  loadFilesView: function(syncCloud)
  {
    if (this.filesView) {
      return true;
    } else {
      var promise = $.Deferred();

      // Creating the new instance of FilesView object passing the arguments
      console.log(syncCloud);
      this.filesView = new FilesView({forceSync: syncCloud, syncCompleted: function(success) {
        if (success) {
          promise.resolve()
        } else {
          promise.reject('unable_to_refresh');
        }
      }});

      return promise;
    }

  }
});
