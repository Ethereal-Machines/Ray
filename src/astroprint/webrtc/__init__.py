# coding=utf-8
__author__ = "Daniel Arroyo <daniel@astroprint.com>"
__license__ = 'GNU Affero General Public License http://www.gnu.org/licenses/agpl.html'

# singleton
_instance = None

def WebRtcManager():
	global _instance
	if _instance is None:
		_instance = WebRtc()
	return _instance

import logging
import threading

from astroprint.webrtc.janus import Plugin, Session, KeepAlive

class WebRtc(object):
	def __init__(self):
		self._connectedPeers = {}
		self._logger = logging.getLogger(__name__)
		self._peerCondition = threading.Condition()

	def startPeerSession(self):
		with self._peerCondition:
			if len(self._connectedPeers.keys()) == 0:
				self.startJanus()

			peer = ConnectionPeer()

			sessionId = peer.start()
			if sessionId:
				self._connectedPeers[sessionId] = peer
				return sessionId

			else:
				#something went wrong, no session started. Do we still need Janus up?
				if len(self._connectedPeers.keys()) == 0:
					self.stopJanus()

				return None

	def closePeerSession(self, sessionId):
		with self._peerCondition:
			try:
				peer = self._connectedPeers[sesionId]

			except KeyError:
				self._logger.warning('Session [%s] for peer not found' % sessionId)
				peer = None

			if peer:
				peer.close()
				del self._connectedPeers[sessionId]

			if len(self._connectedPeers.keys()) == 0:
				self.stopJanus()

	def tickleIceCandidate(self, sessionId, candidate, sdp_mid, sdp_mline_index):
		try:
			peer = self._connectedPeers[sessionId]

		except KeyError:
			self._logger.warning('Peer with session [%s] is not found' % sessionId)
			peer = None

		if peer:
			peer.add_ice_candidate(candidate, sdp_mid, sdp_mline_index)

	def startJanus(self):
		#Start janus command here
		pass

	def stopJanus(self):
		#Stop janus server
		pass

class StreamingPlugin(Plugin):
	name = 'janus.plugin.streaming'

class ConnectionPeer(object):
	def __init__(self):
		self.session = None
		self.sessionKa = None
		self.id = None
		self.streamingPlugin = None

	def start(self):
		self.streamingPlugin = StreamingPlugin()
		self.session = Session('ws://127.0.0.1:8088', secret='astroprint_janus')
		self.session.register_plugin(self.streamingPlugin);
		self.session.connect();

		self.sessionKa = KeepAlive(self.session)
		self.sessionKa.daemon = True
		self.sessionKa.start()

		return self.streamingPlugin.id

	def close(self):
		#stop the keepalive worker
		self.sessionKa.stop()
		self.sessionKa.join()
		self.sessionKa = None

		#kill the current session
		self.session.unregister_plugin(self.streamingPlugin)
		self.session.disconnect()
		self.session = None
		self.streamingPlugin = None