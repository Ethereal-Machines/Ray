/*
 *  (c) Daniel Arroyo. 3DaGoGo, Inc. (daniel@astroprint.com)
 *
 *  Distributed under the GNU Affero General Public License http://www.gnu.org/licenses/agpl.html
 */

$.ajaxSetup({
  type: 'POST',
  cache: false,
  headers: {
    "X-Api-Key": UI_API_KEY
  }
});

// console.log(UI_API_KEY);

var AppMenu = Backbone.View.extend({
  el: '#main-menu',
  turnOffModal: null,
  events: {
    'click li.logout': 'logoutClicked'
  },
  logoutClicked: function(e)
  {
    e.preventDefault();
    var el = $(e.currentTarget);
    console.log(el);
    var spinIcon = el.find('.icon-rocket-spinner');

    spinIcon.removeClass('hide');
    $.ajax({
      url: API_BASEURL + "astroprint",
      type: "DELETE",
      success: function() {
        location.reload();
      },
      complete: function() {
        spinIcon.addClass('hide');
      }
    });
  }
});

var AstroBoxApp = Backbone.View.extend({
  el: 'body',
  eventManager: null,
  appMenu: null,
  socketData: null,
  utils: null,
  router: null,
  connectionView: null,
  unreachableView: null,
  turnOffModal: null,
  printerProfile: null,
  events: {
    'click button.turn-off, a.turn-off': 'turnOffClicked',
    'click button.reboot': 'rebootClicked',
    'click a.launch-ap': 'launchAstroPrint'
  },
  initialize: function()
  {
    $(document).on('dragstart', function() {
      return false;
    });

    this.socketData = new SocketData();
    // console.log(this.socketData);
    
    /* AppMenu we are not including in the application */
    this.appMenu = new AppMenu();
    // console.log(this.appMenu);

    /* 
    * This is corresponds to the 'utils.js' file .
    * This will be included in the new application
    */
    this.utils = new Utils();
    // console.log(this.utils);

    /*
    * This the main property which is reponsible for
    * routing to the different applicaton pages of the application
    */
    this.router = new AppRouter();
    // console.log(this.router);

    /*
    * This is related to connections settings.
    * It will be included in the new app
    */
    this.connectionView = new ConnectionView({socket: this.socketData});
    console.log(this.socketData);

    /*
    * This is the Modal for the printer profile
    * Will be there in the new app
    */
    this.printerProfile = new PrinterProfile(initial_printer_profile);
    // console.log(this.printerProfile);

    /*
    * This is responsible for 
    */
    this.eventManager = Backbone.Events;
    // console.log(this.eventManager);
    this.socketData.connectionView = this.connectionView;
    // console.log(this.socketData.connectionView);
    this.socketData.connect(WS_TOKEN);
    this.listenTo(this.socketData, 'change:printing', this.reportPrintingChange );
    this.listenTo(this.socketData, 'change:online', this.onlineStatusChange );
    this.listenTo(this.socketData, "change:box_reachable", this.onReachableChanged );
  },
  turnOffClicked: function()
  {
    if (!this.turnOffModal) {
      this.turnOffModal = new TurnoffConfirmationModal();
    }

    this.turnOffModal.open();
  },
  rebootClicked: function()
  {
    if (!this.rebootModal) {
      this.rebootModal = new RebootConfirmationModal();
    }

    this.rebootModal.open();
  },
  // this function is responsible for showing the Control view when the prints complete
  // or cancelled
  reportPrintingChange: function(s, value)
  {
    if (value) {
      this.$('.quick-nav').hide();
      this.setPrinting();
      this.router.navigate("printing", {replace: true, trigger: true});
    } else {
      //clear current printing data
      this.socketData.set({
        printing_progress: null,
        print_capture: null,
        paused: false
      }, {silent: true});
      $('body').removeClass('printing');
      this.$('.quick-nav').show();
      // this.router.navigate("control", {replace: true, trigger: true});
      
      /* Navigating to the HOME page once the print is completed or cancelled */
      this.router.navigate("home", {replace: true, trigger: true});
    }
  },
  selectQuickNav: function(tab)
  {
    var nav = this.$('.quick-nav');
    nav.find('li.active').removeClass('active');
    if (tab) {
      nav.find('li.'+tab).addClass('active');
    }
  },
  onlineStatusChange: function(s, value)
  {
    if (value) {
      this.$('#app').addClass('online').removeClass('offline');
    } else {
      this.$('#app').addClass('offline').removeClass('online');
    }
  },
  onReachableChanged: function(s, value)
  {
    if (value != 'reachable') {
      //We need to wrap it in a setTimeout becuase otherwise it
      //flashes on FireFox when changing pages
      setTimeout(_.bind(function(){
        //Is it still unreachable?
        if (this.socketData.get('box_reachable') == 'unreachable') {
          if (!this.unreachableView) {
            this.unreachableView = new UnreachableView();
          }

          this.router.selectView(this.unreachableView);
        }
      },this), 1000);
    } else if (this.unreachableView) {
      this.unreachableView.hide();
    }
  },
  setPrinting: function()
  {
    $('body').addClass('printing');
    this.$('.quick-nav').hide();
  },
  launchAstroPrint: function(e)
  {
    e.preventDefault();

    if (initial_states.userLogged) {
      if (!this.launchingAp) {
        this.launchingAp = true;
        $.getJSON(API_BASEURL+'astroprint/login-key')
          .done(function(data){
            location.href = 'https://cloud.astroprint.com/account/loginKey/'+data.login_key;
          })
          .fail(function(){
            location.href = 'https://cloud.astroprint.com/account/login';
          })
          .always(_.bind(function(){
            this.launchingAp = false;
          }, this));
      }
    } else {
      location.href = 'https://cloud.astroprint.com/account/login';
    }
  }
});

app = new AstroBoxApp();

//ADDITION TO NAVIGATOR OBJECT FOR OBTAINING BROWSER NAME AND VERSION
navigator.sayswho= (function()
{
  var ua= navigator.userAgent, tem,
  M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
  if(/trident/i.test(M[1])){
      tem=  /\brv[ :]+(\d+)/g.exec(ua) || [];
      return 'IE '+(tem[1] || '');
  }
  if(M[1]=== 'Chrome'){
      tem= ua.match(/\b(OPR|Edge)\/(\d+)/);
      if(tem!= null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
  }
  M= M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
  if((tem= ua.match(/version\/(\d+)/i))!= null) M.splice(1, 1, tem[1]);
  return M.join(' ');
})();

//THIS IS A DEVELOPMENT VARIABLE
//IT ABLES AND DISABLES BROWSER
//DETECTOR
var navigatorPrevent = true;
//IT WILL DISSAPEAR WHEN COMPATIBILITY
//AND STANDARIZATION WITH VIDEO FORMAT
//AND BROWSERS FINISH

//This code is for astroprint.com communication with astrobox webUI window
//It doesn't really work now, so we comment it out for now
/*function receiveMessage(event)
{
  console.log(ASTROBOX_NAME);
  event.source.postMessage(ASTROBOX_NAME, event.origin);
}

window.addEventListener("message", receiveMessage, false);*/

Backbone.history.start();
