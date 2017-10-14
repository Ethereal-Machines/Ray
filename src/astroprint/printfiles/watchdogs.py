# coding=utf-8
__author__ = "Vivek Anand <vivekanand1101@gmail.com>"
__author__ = "Daniel Arroyo. 3DaGogo, Inc <daniel@astroprint.com>"
__author__ = "Gina Häußge <osd@foosel.net>"
__license__ = 'GNU Affero General Public License http://www.gnu.org/licenses/agpl.html'

import os
import logging


from astroprint.printer.manager import printerManager
from astroprint.printfiles.map import SUPPORTED_EXTENSIONS

from watchdog.events import PatternMatchingEventHandler
from watchdog.events import FileSystemEventHandler

from octoprint.settings import settings


logger = logging.getLogger(__name__)

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


def _get_gcode_files(directory):
    """ Get gcode files in the dir """
    allfiles = []
    for parent, d, pack in os.walk(directory):
        for files in pack:
            curr_file = {}
            if files.endswith('.gcode'):
                curr_file['fullpath'] = os.path.abspath(os.path.join(parent, files))
                curr_file['filename'] = files
                allfiles.append(curr_file)
    return allfiles


global CALLBACKS
class EtherBoxHandler(FileSystemEventHandler):
    ''' Watch for USB insertion for print from storage feature '''

    def __init__(self, *args, **kwargs):
        ''' Initiate the object '''
        super(EtherBoxHandler, self).__init__(*args, **kwargs)
        global CALLBACKS
        CALLBACKS = []

    def on_created(self, event):
        ''' Called when the media is inserted '''
        usb_path = event.src_path
        gcode_files = _get_gcode_files(usb_path)
        if not gcode_files:
            return
        for callback in CALLBACKS:
            try:
                callback.sendEvent("usb_inserted", usb_path)
                logger.info("Event sent: %s", usb_path)
                logger.info("All callbacks %s", CALLBACKS)
            except Exception as e:
                logger.info("error: %s", e)
                pass
        s = settings()
        s.set(['usb', 'filelist'], gcode_files)

    def on_deleted(self, event):
        s = settings()
        s.set(['usb', 'filelist'], [])

        for callback in CALLBACKS:
            try:
                callback.sendEvent("usb_removed", None)
            except Exception as e:
                logger.info("error in removed: %s", event)
                logger.info("error: %s", e)
                logger.info("Event sent: %s", event.src_path)
                logger.info("To %s", callback)
                logger.info("All callbacks %s", CALLBACKS)
                pass


def getEtherBoxHandlerCallback():
    ''' Give one EtherBoxHandler '''
    global CALLBACKS
    return CALLBACKS
