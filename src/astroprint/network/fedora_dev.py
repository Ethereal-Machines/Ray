# coding=utf-8
__author__ = "Daniel Arroyo <daniel@astroprint.com>"
__license__ = 'GNU Affero General Public License http://www.gnu.org/licenses/agpl.html'

import logging

from astroprint.network import NetworkManager as NetworkManagerBase

class FedoraDevNetworkManager(NetworkManagerBase):
    def __init__(self):
        self.name = "astrobox-dev"
        self.logger = logging.getLogger(__name__)
        super(FedoraDevNetworkManager, self).__init__()

    def getActiveConnections(self):
        return {
            'wired': {
                'id': 'localhost',
                'signal': None,
                'name': 'Localhost',
                'ip': '127.0.0.1:5000',
                'secured': True
            },
            'wireless': None,
            'manual': None
        }

    def storedWifiNetworks(self):
        return [
            {'id': '1', 'name': 'Test Connection 1', 'active': True},
            {'id': '2', 'name': 'Test Connection 2', 'active': False},
            {'id': '3', 'name': 'Test Connection 3', 'active': False}
        ]

    def deleteStoredWifiNetwork(self, networkId):
        return (networkId in [c['id'] for c in self.storedWifiNetworks()])

    def hasWifi(self):
        return False

    def isOnline(self):
        return True

    def startHotspot(self):
        # return True when succesful
        return "Not supporded on Mac"

    def stopHotspot(self):
        # return True when succesful
        return "Not supporded on Mac"

    def getHostname(self):
        return self.name

    def setHostname(self, name):
        self.name = name
        self.logger.info('Host name is set to %s ' % name)
        return True
