# coding=utf-8
__author__ = "AstroPrint Product Team <product@astroprint.com>"
__license__ = 'GNU Affero General Public License http://www.gnu.org/licenses/agpl.html'

import logging

from .base import GstBasePipeline
from .bins.v4l2_video_src import UsbVideoSrcBin
from .bins.vp8_video_enc import VP8VideoEncBin

class GstVp8Pipeline(GstBasePipeline):
    def __init__(self, device, size, onFatalError, mainLoop, debugLevel):
        self._logger = logging.getLogger(__name__)
        super(GstVp8Pipeline, self).__init__(
            device, size, onFatalError, mainLoop, debugLevel)

    def _getVideoSrcBin(self, pipeline, device, size):
        return UsbVideoSrcBin(pipeline, device, size)

    def _getVideoEncBin(self):
        return VP8VideoEncBin()
