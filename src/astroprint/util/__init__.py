import subprocess
import time
from threading import Thread as thread


def findProcess(processId):
    ''' Given the process id, find the name of the process '''
    ps = subprocess.Popen(
        "ps -ef | grep "+processId, shell=True, stdout=subprocess.PIPE)
    output = ps.stdout.read()
    ps.stdout.close()
    ps.wait()
    return output

def isProcessRunning(processId):
    ''' Given the process id, check if it's running or not '''
    nameProcess = processId

    lastChar = processId[len(processId)-1]
    processId = processId[:-1]
    processId = processId + '[' + lastChar + ']'

    output = findProcess(processId)

    if nameProcess in output:
        return True
    else:
        return False


class interval(thread):
    def __init__(self,period, callback,params=None):
        self.time = period
        self.originalCallback = callback
        self.params = params or []
        self.isRunning = None
        thread.__init__(self)
        self.daemon = True

    def run(self):
        self.isRunning = True
        while self.isRunning:
            time.sleep(self.time)
            if self.isRunning:
                self.originalCallback(*self.params)

    def cancel(self):
        self.isRunning = False
