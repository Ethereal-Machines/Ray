/*
 *  (c) Daniel Arroyo. 3DaGoGo, Inc. (daniel@astroprint.com)
 *
 *  Distributed under the GNU Affero General Public License http://www.gnu.org/licenses/agpl.html
 */

 var PrinterProfile = Backbone.Model.extend({
	url: API_BASEURL + "printer-profile",
	defaults: {
		'id': 'profile',
		'extruder_count': 2,
		'max_nozzle_temp': 280,
		'max_bed_temp': 140,
		'heated_bed': true,
		'cancel_gcode': null,
		'invert_z': false,
		// below two properties have been added for the extrusion process
		'extrusion_amount': 5,
		'extrusion_speed': 2,

		/*
		* The nozzle and bed temperature's default values are set
		* These values are corresponds to the material 'PLA'
		*/
		'nozzle1Temp': 215,
		'nozzle2Temp': 215,
		'bedTemp': 72
	},
});