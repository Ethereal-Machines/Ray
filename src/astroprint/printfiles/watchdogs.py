# coding=utf-8
__author__ = "Vivek Anand <vivekanand1101@gmail.com>"
__author__ = "Daniel Arroyo. 3DaGogo, Inc <daniel@astroprint.com>"
__author__ = "Gina Häußge <osd@foosel.net>"
__license__ = 'GNU Affero General Public License http://www.gnu.org/licenses/agpl.html'

import os
import time
import logging
import threading

import pyudev

from watchdog.events import PatternMatchingEventHandler
from watchdog.events import FileSystemEventHandler

from astroprint.printer.manager import printerManager
from astroprint.printfiles.map import SUPPORTED_EXTENSIONS

from octoprint.settings import settings


class UploadCleanupWatchdogHandler(PatternMatchingEventHandler):
    """
    Takes care of automatically deleting metadata entries for files
    that get deleted from the uploads folder
    """

    patterns = map(lambda x: "*.%s" % x, SUPPORTED_EXTENSIONS)

    def __init__(self):
        PatternMatchingEventHandler.__init__(self)

    def on_deleted(self, event):
        fm = printerManager().fileManager
        filename = fm._getBasicFilename(event.src_path)
        if not filename:
            return

        fm.removeFileFromMetadata(filename)


global CALLBACKS
class EtherBoxHandler():
    ''' Monitor udev for detection of usb '''

    def __init__(self):
        ''' Initiate the object '''
        self.logger = logging.getLogger(__name__)
        global CALLBACKS
        CALLBACKS = []
        thread = threading.Thread(target=self._work)
        thread.daemon = True
        thread.start()

    def _work(self):
        ''' Runs the actual loop to detect the events '''
        # initialize a few stuffs
        self.context = pyudev.Context()
        self.monitor = pyudev.Monitor.from_netlink(self.context)
        self.monitor.filter_by(subsystem='usb')
        self.logger.info("Starting to monitor for usb")
        self.monitor.start()
        for device in iter(self.monitor.poll, None):
            self.logger.info("Got USB event: %s", device.action)
            if device.action == 'add':
                self.on_created()
            else:
                self.on_deleted()

    def _get_gcode_files(self, directory):
        """ Get gcode files in the dir """
        allfiles = []
        self.logger.info("USB: directory we searched in is: %s", directory)
        for parent, d, pack in os.walk(directory):
            for files in pack:
                curr_file = {}
                # Code edited by: Toran Sahu <toran.sahu@yahoo.com>
                # Searching for .gcode files only
                if (
                        files.endswith('.gcode')
                        # or files.endswith('.g')
                        # or files.endswith('.txt')
                    ):
                    curr_file['fullpath'] = os.path.abspath(os.path.join(parent, files))
                    curr_file['filename'] = files
                    allfiles.append(curr_file)
        return allfiles

    def on_created(self):
        ''' Called when the media is inserted '''
        s = settings()
        # Code Edited by: Toran Sahu <toran.sahu@yahoo.com>
        # Added logic to get the correct usb mount point
        # Overriding usb_path = s.get(['usb', 'folder'])
        time.sleep(5)  # waiting for 5 sec, HW event taking time
        # usb_path = s.get(['usb', 'folder'])
        usb_path = 'None'
        expected_paths = ['/media/usb' + str(usb_id) for usb_id in range(0, 8)]
        for path in expected_paths:
            if len(os.listdir(path)) > 0:
                usb_path = path
                break
        self.logger.info("USB found at " + usb_path)
        gcode_files = self._get_gcode_files(usb_path)
        s.set(['usb', 'filelist'], gcode_files)

        alive_callbacks = []
        global CALLBACKS
        for callback in CALLBACKS:
            real_callback = ''
            try:
                # get original object
                real_callback = callback()
                if real_callback:
                    real_callback.sendEvent("usb_status", True)
                    self.logger.info("Event sent: %s", usb_path)
                    self.logger.info(CALLBACKS)
                    alive_callbacks.append(callback)
            except Exception as e:
                self.logger.exception("error: %s", e)
                self.logger.exception(CALLBACKS)
                pass
        CALLBACKS = alive_callbacks

    def on_deleted(self):
        s = settings()
        s.set(['usb', 'filelist'], [])

        alive_callbacks = []
        global CALLBACKS
        for callback in CALLBACKS:
            real_callback = ''
            try:
                # get original object
                real_callback = callback()
                if real_callback:
                    real_callback.sendEvent("usb_status", False)
                    self.logger.info(CALLBACKS)
                    alive_callbacks.append(callback)
            except Exception as e:
                self.logger.exception("error: %s", e)
                self.logger.exception("To %s", real_callback)
                self.logger.exception(CALLBACKS)
                pass
        CALLBACKS = alive_callbacks


def getEtherBoxHandlerCallback():
    ''' Give one EtherBoxHandler '''
    global CALLBACKS
    return CALLBACKS
