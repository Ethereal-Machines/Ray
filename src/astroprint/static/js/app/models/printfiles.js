/*
 *  (c) AstroPrint Product Team. 3DaGoGo, Inc. (product@astroprint.com)
 *
 *  Distributed under the GNU Affero General Public License http://www.gnu.org/licenses/agpl.html
 */

var PrintFile = Backbone.Model.extend({
  defaults: {
    'name': '',
    'images':[]
  }
});

// when this method is being called, it's giving us the list of itmes from present in the local
var PrintFileCollection = Backbone.Collection.extend({
  model: PrintFile,
  url: API_BASEURL + "astroprint/print-files",
  syncCloud: function(params)
  {
    if (!params) {
      params = {}
    }

    params.data = {forceSyncCloud: true}
    return this.fetch(params);
  }
});
