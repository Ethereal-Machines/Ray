# coding=utf-8
__author__ = "AstroPrint Product Team <product@astroprint.com>"
__license__ = 'GNU Affero General Public License http://www.gnu.org/licenses/agpl.html'

from gi.repository import Gst

from .base_video_src import VideoSrcBinBase

#
# Base class for V4L2 Based Video sources
#

class V4L2VideoSrcBin(VideoSrcBinBase):
    def __init__(self, pipeline, device, size):
        super(V4L2VideoSrcBin, self).__init__(pipeline, device, size)
        self.__videoSourceElement = None
        self.__videoLogoElement = None
        self.__videoSourceCaps = None

    # Creates, adds to the bine and links elements for the source Chain.
    # returns the last element of the chain
    def _constructSrcChain(self):
        width, height = self._size

        self.__videoSourceElement = Gst.ElementFactory.make(
            'v4l2src', 'video_source')
        self.__videoSourceElement.set_property("device", self._device)

        logoHeight = round(height * self.LOGO_HEIGHT_PERCENT)
        logoWidth = round(logoHeight / self.LOGO_ASPECT_RATIO)

        # ASTROPRINT'S LOGO FROM DOWN RIGHT CORNER
        self.__videoLogoElement = Gst.ElementFactory.make(
            'gdkpixbufoverlay', 'logo_overlay')
        self.__videoLogoElement.set_property(
            'location', '/AstroBox/src/astroprint/static/img/astroprint_logo.png')
        self.__videoLogoElement.set_property(
            'overlay-width', logoWidth)
        self.__videoLogoElement.set_property(
            'overlay-height', logoHeight)
        self.__videoLogoElement.set_property(
            'offset-x', width - (logoWidth + 10 ))
        self.__videoLogoElement.set_property(
            'offset-y', height - (logoHeight + 5))

        self.__videoSourceCaps = Gst.ElementFactory.make(
            "capsfilter", "caps_filter")
        self.__videoSourceCaps.set_property(
            "caps", Gst.Caps.from_string(self._getVideoSourceCaps()))

        #Add Elements to the pipeline
        self._bin.add(self.__videoSourceElement)
        self._bin.add(self.__videoSourceCaps)
        self._bin.add(self.__videoLogoElement)

        #Link Elements
        self.__videoSourceElement.link(self.__videoSourceCaps)
        self.__videoSourceCaps.link(self.__videoLogoElement)

        return self.__videoLogoElement

    #Implement this in the subclasses below
    def _getVideoSourceCaps(self):
        pass

#
# Base class for USB Based Video sources
#

class UsbVideoSrcBin(V4L2VideoSrcBin):
    def _getVideoSourceCaps(self):
        # Vivek, you have tried to change this string
        return_str = 'video/x-raw,format={ I420, YV12, Y41B, Y42B, YVYU, Y444, '
        'NV21, NV12, RGB, BGR, RGBx, xRGB, BGRx, xBGR, GRAY8 },width=%d,'
        'height=%d,framerate={ 5/1, 10/1, 15/1, 25/1, 30/1 }' % self._size
        return return_str

#
# Base class for Raspicam Based Video sources
#

class RaspicamVideoSrcBin(V4L2VideoSrcBin):
    def _getVideoSourceCaps(self):
        return 'video/x-raw,format=I420,width=%d,height=%d,framerate=30/1' % \
            self._size
