# coding=utf-8
__author__ = "Daniel Arroyo <daniel@astroprint.com>"
__license__ = 'GNU Affero General Public License http://www.gnu.org/licenses/agpl.html'

import threading
import logging
import os
import time
import re

from octoprint.events import eventManager, Events
from octoprint.util import getExceptionString

from makerbot_driver import GcodeAssembler
from makerbot_driver.errors import BuildCancelledError, ProtocolError, ExternalStopError, PacketTooBigError, BufferOverflowError
from makerbot_driver.Gcode import GcodeParser
from makerbot_driver.Gcode.errors import UnrecognizedCommandError

class PrintJobS3G(threading.Thread):
	UPDATE_INTERVAL_SECS = 2

	def __init__(self, printer, currentFile):
		super(PrintJobS3G, self).__init__()

		self._logger = logging.getLogger(__name__)
		self._printer = printer
		self._file = currentFile
		self._parser = None
		self._canceled = False
		self._heatingPlatform = False
		self._heatingTool = False
		self._heatupWaitStartTime = 0
		self.daemon = True
		self._regex_command = re.compile("^\s*([GM]\d+|T)")

	def exec_line(self, line):
		self._logger.debug('G-CODE: %s', line)
		line = self._preprocessGcode(line)

		if not line:
			return False

		while True:
			try:
				self._parser.execute_line(line)
				return True

			except BufferOverflowError:
				time.sleep(.2)

			except PacketTooBigError:
				self._logger.warn('Printer responded with PacketTooBigError to (%s)' % line)
				return False

			except UnrecognizedCommandError:
				self._logger.warn('The following GCode command was ignored: %s' % line)
				return False

	def cancel(self):
		self._canceled = True

	def run(self):
		profile = self._printer._profile

		try:
			assembler = GcodeAssembler(profile)
			start, end, variables = assembler.assemble_recipe()
			start_gcode = assembler.assemble_start_sequence(start)
			end_gcode = assembler.assemble_end_sequence(end)

			variables.update({
				'START_X': profile.values['print_start_sequence']['start_position']['start_x'],
				'START_Y': profile.values['print_start_sequence']['start_position']['start_y'],
				'START_Z': profile.values['print_start_sequence']['start_position']['start_z']
			})
			
			self._parser = GcodeParser()
			self._parser.environment.update(variables)
			self._parser.state.set_build_name(os.path.basename(self._file['filename'])[:15])
			self._parser.state.profile = profile
			self._parser.s3g = self._printer._comm

			self._parser.state.values['last_extra_index'] = 0
			self._parser.state.values['last_platform_index'] = 0

			if self._printer._firmwareVersion >= 700:
				vid, pid = self._printer._comm.get_vid_pid_iface()
				self._parser.s3g.x3g_version(1, 0, pid=pid) # Currently hardcode x3g v1.0

			self._printer._comm.reset()

			for line in start_gcode:
				self.exec_line(line)

			self._file['start_time'] = time.time()
			self._file['progress'] = 0

			lastProgressReport = 0
			lastProgressValueSentToPrinter = 0
			lastHeatingCheck = 0

			with open(self._file['filename'], 'r') as f:
				while True:
					try:
						line = f.readline()

						if self._canceled or not line:
							break

						if self.exec_line(line):

							now = time.time()
							if now - lastProgressReport > self.UPDATE_INTERVAL_SECS:
								position = f.tell()
								self._file['position'] = position
								self._file['progress'] = float(position) / float(self._file['size'])
								self._printer.mcProgress()

								printerProgress = int(self._file['progress'] * 100.0)

								if lastProgressValueSentToPrinter != printerProgress:
									try:
										self._parser.s3g.set_build_percent(printerProgress)
										lastProgressValueSentToPrinter = printerProgress
										lastProgressReport = now

									except BufferOverflowError:
										time.sleep(.2)

							if self._printer._heatingUp and now - lastHeatingCheck > self.UPDATE_INTERVAL_SECS:
								lastHeatingCheck = now

								if  	( not self._heatingPlatform or ( self._heatingPlatform and self._parser.s3g.is_platform_ready(0) ) )  \
									and ( not self._heatingTool or ( self._heatingTool and self._parser.s3g.is_tool_ready(0) ) ):
								 
									self._heatingTool = False
									self._heatingPlatform = False
									self._printer._heatingUp = False
									self._printer.mcHeatingUpUpdate(False)
									self._heatupWaitTimeLost = now - self._heatupWaitStartTime
									self._heatupWaitStartTime = now
									self._file['start_time'] += self._heatupWaitTimeLost

					except ProtocolError as e:
						self._logger.warn('ProtocolError: %s' % e)

			self._printer._changeState(self._printer.STATE_OPERATIONAL)

			payload = {
				"file": self._file['filename'],
				"filename": os.path.basename(self._file['filename']),
				"origin": self._file['origin'],
				"time": self._printer.getPrintTime()
			}

			if self._canceled:
				self._printer.printJobCancelled()
				eventManager().fire(Events.PRINT_FAILED, payload)
			else:
				self._printer.mcPrintjobDone()
				eventManager().fire(Events.PRINT_DONE, payload)

			for line in end_gcode:
				self.exec_line(line)

		except BuildCancelledError:
			self._logger.warn('Build Cancel detected')
			self.cancel()
			self._printer.printJobCancelled()
			eventManager().fire(Events.PRINT_FAILED, payload)

		except ExternalStopError:
			self._logger.warn('External Stop detected')
			self.cancel()
			self._printer._comm.writer.set_external_stop(False)
			self._printer.printJobCancelled()
			eventManager().fire(Events.PRINT_FAILED, payload)

		except Exception:
			self._errorValue = getExceptionString()
			self._printer._changeState(self._printer.STATE_ERROR)
			eventManager().fire(Events.ERROR, {"error": self._errorValue })
			self._logger.error(self._errorValue)

	# ~~~ GCODE handlers

	def _preprocessGcode(self, cmd):
		gcode = self._regex_command.search(cmd)
		if gcode:
			gcode = gcode.group(1)

			gcodeHandler = "_handleGcode_" + gcode
			if hasattr(self, gcodeHandler):
				cmd = getattr(self, gcodeHandler)(cmd)

		return cmd

	#G90: Absolute Positioning
	def _handleGcode_G90(self, cmd):
		return None #ignored

	#G21: Set to milimeters
	def _handleGcode_G21(self, cmd):
		return None #Ignored.

	#G28: Home Axis
	def _handleGcode_G28(self, cmd):
		return None

	def _handleGcode_M73(self, cmd):
		return None

	def _handleGcode_M84(self, cmd):
		return None

	#M101: Undo retraction
	def _handleGcode_M101(self, cmd):
		return None #ignore

	#M103: Turn all extruders off
	def _handleGcode_M103(self, cmd):
		return None #ignore

	def _handleGcode_M104(self, cmd):
		return None
		self._printer._heatingUp = True
		self._printer.mcHeatingUpUpdate(True)
		self._heatingTool = True
		self._heatupWaitStartTime = time.time()
		return cmd

	#M105: Get Temperature
	def _handleGcode_M105(self, cmd):
		return None #Ignore

	#M106: Fan On
	def _handleGcode_M106(self, cmd):
		return None #Ignore

	#M107: Fan Off
	def _handleGcode_M107(self, cmd):
		return None #Ignore

	#M108: Set Extruder Speed
	def _handleGcode_M108(self, cmd):
		codes, flags, comments = makerbot_driver.Gcode.parse_line(match.string)
		#Since were using variable_replace in gcode.utils, we need to make the codes dict
		#a dictionary of only strings
		string_codes = {}
		for key in codes:
			string_codes[str(key)] = str(codes[key])
		if 'T' not in codes:
			transformed_line = ''
		else:
			transformed_line = 'M135 T#T'  # Set the line up for variable replacement
			transformed_line = makerbot_driver.Gcode.variable_substitute(transformed_line, string_codes)
		return transformed_line

	def _handleGcode_M109(self, cmd):
		self._printer._heatingUp = True
		self._printer.mcHeatingUpUpdate(True)
		self._heatingPlatform = True
		self._heatupWaitStartTime = time.time()
		return cmd

	#M127: Set screen text
	def _handleGcode_M127(self, cmd):
		return None #Ignore

	def _handleGcode_M136(self, cmd):
		return None	

	def _handleGcode_M137(self, cmd):
		return None	
