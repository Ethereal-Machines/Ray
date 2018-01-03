# coding=utf-8
__author__ = "Vivek Anand <vivekanand1101@gmail.com>"
__author__ = "Daniel Arroyo. 3DaGogo, Inc <daniel@astroprint.com>"
__author__ = "Gina Häußge <osd@foosel.net>"
__license__ = 'GNU Affero General Public License http://www.gnu.org/licenses/agpl.html'

import os
import glib
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


def _get_gcode_files(usb_path):
    """ Get gcode files in the dir """
    allfiles = []
    directory = os.path.abspath(os.path.join(usb_path, os.pardir))
    for parent, d, pack in os.walk(directory):
        for files in pack:
            curr_file = {}
            if (
                    files.endswith('.gcode')
                    or files.endswith('.g')
                    or files.endswith('.txt')):
                curr_file['fullpath'] = os.path.abspath(os.path.join(parent, files))
                curr_file['filename'] = files
                allfiles.append(curr_file)
    return allfiles


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
        self.monitor.start()
        for device in iter(self.monitor.poll, None):
            if device.action == 'add':
                self.on_created()
            else:
                self.on_deleted()

    def device_event(self, observer, action, device):
        ''' Catch the addition/removal of usb '''
        if action == 'add':
            return self.on_created()
        return self.on_deleted()

    def on_created(self):
        ''' Called when the media is inserted '''
        s = settings()
        usb_path = s.get(['usb', 'folder'])
        gcode_files = _get_gcode_files(usb_path)
        if not gcode_files:
            return
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
                    self.logger.info("Usb removed: %s", event.src_path)
                    self.logger.info(CALLBACKS)
                    alive_callbacks.append(callback)
            except Exception as e:
                self.logger.exception("error in removed: %s", event)
                self.logger.exception("error: %s", e)
                self.logger.exception("To %s", real_callback)
                self.logger.exception(CALLBACKS)
                pass
        CALLBACKS = alive_callbacks


def getEtherBoxHandlerCallback():
    ''' Give one EtherBoxHandler '''
    global CALLBACKS
    return CALLBACKS
