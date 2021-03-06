# coding=utf-8
__author__ = "AstroPrint Product Team <product@astroprint.com>"
__license__ = 'GNU Affero General Public License http://www.gnu.org/licenses/agpl.html'
__copyright__ = "Copyright (C) 2017 3DaGoGo, Inc - Released under terms of the AGPLv3 License"

# singleton
_instance = None


def printerProfileManager():
    global _instance
    if _instance is None:
        _instance = PrinterProfileManager()
    return _instance


import os
import yaml
import logging
import shutil

from octoprint.settings import settings


class PrinterProfileManager(object):
    def __init__(self):
        self._settings = settings()

        configDir = self._settings.getConfigFolder()

        self._infoFile = "%s/printer-profile.yaml" % configDir
        self._logger = logging.getLogger(__name__)

        self.data = {
            'driver': "marlin",
            'extruder_count': 2,
            'max_nozzle_temp': 280,
            'max_bed_temp': 140,
            'heated_bed': True,
            ## Code edited by: Toran Sahu (Ethereal Machines)
            'cancel_gcode': ['G28 X0 Y0 Z0 M104 S0'], # Added Z0, for Z-Homing on print cancel
            'invert_z': False,
            ## Code edited by: Kanishka M Madhuni (Ethereal Machines)
            'nozzle_1_default_temp': 210,
            'nozzle_2_default_temp': 210,
            'bed_default_temp': 75,
        }

        if not os.path.isfile(self._infoFile):
            factoryFile = "%s/printer-profile.factory" % configDir
            if os.path.isfile(factoryFile):
                shutil.copy(factoryFile, self._infoFile)
            else:
                open(self._infoFile, 'w').close()

        if self._infoFile:
            config = None
            with open(self._infoFile, "r") as f:
                config = yaml.safe_load(f)

            def merge_dict(a, b):
                for key in b:
                    if isinstance(b[key], dict):
                        merge_dict(a[key], b[key])
                    else:
                        a[key] = b[key]

            if config:
                merge_dict(self.data, config)

    def save(self):
        with open(self._infoFile, "wb") as infoFile:
            yaml.safe_dump(
                self.data,
                infoFile,
                default_flow_style=False,
                indent="    ",
                allow_unicode=True
            )

    def set(self, changes):
        for k in changes:
            if k in self.data:
                if self.data[k] != changes[k]:
                    if k == 'driver':
                        # change printer object
                        from astroprint.printer.manager import printerManager
                        printerManager(changes['driver'])

                    self.data[k] = self._clean(k, changes[k])
            else:
                self._logger.error(
                    "trying to set unkonwn printer profile field %s to %s" % \
                    (k, str(changes[k])))

    def _clean(self, field, value):
        if field in ['extruder_count', 'max_nozzle_temp', 'max_bed_temp']:
            return int(value)
        elif field == 'heated_bed':
            return bool(value)
        else:
            return value
