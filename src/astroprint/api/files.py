# coding=utf-8
__author__ = "Gina Häußge <osd@foosel.net>"
__author__ = "Daniel Arroyo <daniel@astroprint.com>"
__license__ = 'GNU Affero General Public License http://www.gnu.org/licenses/agpl.html'


import os
import shutil
import time
import octoprint.util as util

import flask
from flask import request, jsonify, make_response, url_for
from werkzeug import secure_filename

from octoprint.events import Events
from octoprint.settings import settings, valid_boolean_trues
from octoprint.server import eventManager, restricted_access, NO_CONTENT
from octoprint.server.api import api

from astroprint.printer.manager import printerManager
from astroprint.printfiles import FileDestinations

#~~ GCODE file handling


@api.route("/files", methods=["GET"])
def readPrintFiles():
	files = _getFileList(FileDestinations.LOCAL)
	files.extend(_getFileList(FileDestinations.SDCARD))
	return jsonify(files=files, free=util.getFreeBytes(settings().getBaseFolder("uploads")))


@api.route("/files/<string:origin>", methods=["GET"])
def readPrintFilesForOrigin(origin):
	if origin not in [FileDestinations.LOCAL, FileDestinations.SDCARD]:
		return make_response("Unknown origin: %s" % origin, 404)

	files = _getFileList(origin)

	if origin == FileDestinations.LOCAL:
		return jsonify(files=files, free=util.getFreeBytes(settings().getBaseFolder("uploads")))
	else:
		return jsonify(files=files)


def _getFileDetails(origin, filename):
	files = _getFileList(origin)
	for file in files:
		if file["name"] == filename:
			return file
	return None


def _getFileList(origin):
	if origin == FileDestinations.SDCARD:
		sdFileList = printerManager().getSdFiles()

		files = []
		if sdFileList is not None:
			for sdFile, sdSize in sdFileList:
				file = {
					"name": sdFile,
					"origin": FileDestinations.SDCARD,
					"refs": {
						"resource": url_for(".readPrintFile", target=FileDestinations.SDCARD, filename=sdFile, _external=True)
					}
				}
				if sdSize is not None:
					file.update({"size": sdSize})
				files.append(file)
	else:
		files = printerManager().fileManager.getAllFileData()
		for file in files:
			file.update({
				"refs": {
					"resource": url_for(".readPrintFile", target=FileDestinations.LOCAL, filename=file["name"], _external=True),
					"download": url_for("index", _external=True) + "downloads/files/" + FileDestinations.LOCAL + "/" + file["name"]
				}
			})
	return files


def _verifyFileExists(origin, filename):
	if origin == FileDestinations.SDCARD:
		availableFiles = map(lambda x: x[0], printerManager().getSdFiles())
	else:
		availableFiles = printerManager().fileManager.getAllFilenames()

	return filename in availableFiles


@api.route("/files/<string:target>", methods=["POST"])
@restricted_access
def uploadPrintFile(target):
	printer = printerManager()

	if not target in [FileDestinations.LOCAL, FileDestinations.SDCARD]:
		return make_response("Unknown target: %s" % target, 404)

	if not "file" in request.files.keys():
		return make_response("No file included", 400)

	if target == FileDestinations.SDCARD and not settings().getBoolean(["feature", "sdSupport"]):
		return make_response("SD card support is disabled", 404)

	file = request.files["file"]
	sd = target == FileDestinations.SDCARD
	selectAfterUpload = "select" in request.values.keys() and request.values["select"] in valid_boolean_trues
	printAfterSelect = "print" in request.values.keys() and request.values["print"] in valid_boolean_trues

	if sd:
		# validate that all preconditions for SD upload are met before attempting it
		if not (printer.isOperational() and not (printer.isPrinting() or printer.isPaused())):
			return make_response("Can not upload to SD card, printer is either not operational or already busy", 409)
		if not printer.isSdReady():
			return make_response("Can not upload to SD card, not yet initialized", 409)

	# determine current job
	currentFilename = None
	currentOrigin = None
	currentJob = printer.getCurrentJob()
	if currentJob is not None and "file" in currentJob.keys():
		currentJobFile = currentJob["file"]
		if "name" in currentJobFile.keys() and "origin" in currentJobFile.keys():
			currentFilename = currentJobFile["name"]
			currentOrigin = currentJobFile["origin"]

	# determine future filename of file to be uploaded, abort if it can't be uploaded
	futureFilename = printer.fileManager.getFutureFilename(file)
	if futureFilename is None or (not settings().getBoolean(["cura", "enabled"]) and not printer.fileManager.isValidFilename(futureFilename)):
		return make_response("Can not upload file %s, wrong format?" % file.filename, 415)

	# prohibit overwriting currently selected file while it's being printed
	if futureFilename == currentFilename and target == currentOrigin and printer.isPrinting() or printer.isPaused():
		return make_response("Trying to overwrite file that is currently being printed: %s" % currentFilename, 409)

	def fileProcessingFinished(filename, absFilename, destination):
		"""
		Callback for when the file processing (upload, optional slicing, addition to analysis queue) has
		finished.

		Depending on the file's destination triggers either streaming to SD card or directly calls selectAndOrPrint.
		"""
		if destination == FileDestinations.SDCARD:
			return filename, printerManager().addSdFile(filename, absFilename, selectAndOrPrint)
		else:
			selectAndOrPrint(filename, absFilename, destination)
			return filename

	def selectAndOrPrint(filename, absFilename, destination):
		"""
		Callback for when the file is ready to be selected and optionally printed. For SD file uploads this is only
		the case after they have finished streaming to the printer, which is why this callback is also used
		for the corresponding call to addSdFile.

		Selects the just uploaded file if either selectAfterUpload or printAfterSelect are True, or if the
		exact file is already selected, such reloading it.
		"""
		if selectAfterUpload or printAfterSelect or (currentFilename == filename and currentOrigin == destination):
			printerManager().selectFile(absFilename, destination == FileDestinations.SDCARD, printAfterSelect)

	try:
		filename, done = printer.fileManager.addFile(file, target, fileProcessingFinished)
	except IOError:
		return make_response("Your filesystem seems to be corrupt", 500)

	if filename is None:
		return make_response("Could not upload the file %s" % file.filename, 500)

	sdFilename = None
	if isinstance(filename, tuple):
		filename, sdFilename = filename

	eventManager.fire(Events.UPLOAD, {"file": filename, "target": target})

	files = {}
	location = url_for(".readPrintFile", target=FileDestinations.LOCAL, filename=filename, _external=True)
	files.update({
		FileDestinations.LOCAL: {
			"name": filename,
			"origin": FileDestinations.LOCAL,
			"refs": {
				"resource": location,
				"download": url_for("index", _external=True) + "downloads/files/" + FileDestinations.LOCAL + "/" + filename
			}
		}
	})

	if sd and sdFilename:
		location = url_for(".readPrintFile", target=FileDestinations.SDCARD, filename=sdFilename, _external=True)
		files.update({
			FileDestinations.SDCARD: {
				"name": sdFilename,
				"origin": FileDestinations.SDCARD,
				"refs": {
					"resource": location
				}
			}
		})

	r = make_response(jsonify(files=files, done=done), 201)
	r.headers["Location"] = location
	return r


@api.route("/files/<string:target>/<path:filename>", methods=["GET"])
def readPrintFile(target, filename):
	if not target in [FileDestinations.LOCAL, FileDestinations.SDCARD]:
		return make_response("Unknown target: %s" % target, 404)

	file = _getFileDetails(target, filename)
	if not file:
		return make_response("File not found on '%s': %s" % (target, filename), 404)

	return jsonify(file)


@api.route("/files/<string:target>/<path:filename>", methods=["POST"])
@restricted_access
def printFileCommand(filename, target):
	if not target in [FileDestinations.LOCAL, FileDestinations.SDCARD]:
		return make_response("Unknown target: %s" % target, 404)

	if not _verifyFileExists(target, filename):
		return make_response("File not found on '%s': %s" % (target, filename), 404)

	# valid file commands, dict mapping command name to mandatory parameters
	valid_commands = {
		"select": []
	}

	command, data, response = util.getJsonCommandFromRequest(request, valid_commands)
	if response is not None:
		return response

	printer = printerManager()

	if command == "select":
		# selects/loads a file
		printAfterLoading = False
		if "print" in data.keys() and data["print"]:
			if not printer.isOperational():
				#We try at least once
				printer.connect()

				start = time.time()
				connect_timeout = 5 #5 secs

				while not printer.isOperational() and not printer.isClosedOrError() and time.time() - start < connect_timeout:
					time.sleep(1)

				if not printer.isOperational():
					return make_response("The printer is not responding, can't start printing", 409)

			printAfterLoading = True

		sd = False
		if target == FileDestinations.SDCARD:
			filenameToSelect = filename
			sd = True
		else:
			filenameToSelect = printer.fileManager.getAbsolutePath(filename)
		printer.selectFile(filenameToSelect, sd, printAfterLoading)

	return NO_CONTENT

@api.route("/files/<string:target>/<path:filename>", methods=["DELETE"])
@restricted_access
def deletePrintFile(filename, target):
	if not target in [FileDestinations.LOCAL, FileDestinations.SDCARD]:
		return make_response("Unknown target: %s" % target, 404)

	if not _verifyFileExists(target, filename):
		return make_response("File not found on '%s': %s" % (target, filename), 404)

	sd = target == FileDestinations.SDCARD

	printer = printerManager()

	currentJob = printer.getCurrentJob()
	currentFilename = None
	currentSd = None
	if currentJob is not None and "filename" in currentJob.keys() and "sd" in currentJob.keys():
		currentFilename = currentJob["filename"]
		currentSd = currentJob["sd"]

	# prohibit deleting the file that is currently being printed
	if currentFilename == filename and currentSd == sd and (printer.isPrinting() or printer.isPaused()):
		make_response("Trying to delete file that is currently being printed: %s" % filename, 409)

	# deselect the file if it's currently selected
	if currentFilename is not None and filename == currentFilename:
		printer.unselectFile()

	# delete it
	if sd:
		printer.deleteSdFile(filename)
	else:
		printer.fileManager.removeFile(filename)

	return NO_CONTENT


@api.route("/usbfiles/usblist")
@api.route("/usbfiles/usblist/")
def get_files_from_usb():
    s = settings()
    files = s.get(['usb', 'filelist'])
    d = {}
    for i in range(len(files)):
        d[i] = files[i]
    return flask.jsonify(d)


@api.route("/usbfiles/copyusb")
@api.route("/usbfiles/copyusb/")
def copy_from_usb():
    filename = flask.request.args.get('filename')
    filepath = flask.request.args.get('filepath')
    if not os.path.exists(filepath):
        return flask.jsonify({
            'status': 'failed',
            'msg': 'File not there, did the user unplug the usb?'
        })

    # copy the file
    s = settings()
    path = s.getBaseFolder("uploads")
    futurepath = os.path.abspath(os.path.join(path, secure_filename(filename)))
    try:
        shutil.copy2(filepath, path)
    except Exception as e:
        return flask.jsonify({
            'status': 'failed',
            'msg': e,
        })
    return flask.jsonify({
            'status': 'success',
            'msg': 'File copied',
            'futurepath': futurepath,
            'localFileName': secure_filename(filename),
    })


@api.route("/usbfiles/usbinfo")
@api.route("/usbfiles/usbinfo/")
def usb_file_info():
    ''' Get file info which is Currently in usb '''

    filename = flask.request.args.get('filename')
    filepath = flask.request.args.get('filepath')
    data = _getFileDetails('local', filepath)
    return flask.jsonify(data)


@api.route("/usbfiles/printfile")
@api.route("/usbfiles/printfile/")
def usbprintFileCommand():
    filepath = flask.request.args.get('futurepath')
    #if not os.path.exists(filepath):
    #    return make_response("File not found %s" % (filepath), 404)

    # valid file commands, dict mapping command name to mandatory parameters
    valid_commands = {
        "select": []
    }

    printer = printerManager()
    # selects/loads a file
    printAfterLoading = False
    if not printer.isOperational():
        #We try at least once
        printer.connect()

        start = time.time()
        connect_timeout = 5 #5 secs

        while not printer.isOperational() and not printer.isClosedOrError() and time.time() - start < connect_timeout:
            time.sleep(1)

        if not printer.isOperational():
            return make_response("The printer is not responding, can't start printing", 409)
        printAfterLoading = True
        sd = False
        filenameToSelect = printer.fileManager.getAbsolutePath(filename)
        printer.selectFile(filenameToSelect, sd, printAfterLoading)
        # printer.selectFile(filepath, sd, printAfterLoading)

    return NO_CONTENT
# @api.route("/files/printusb")
# @api.route("/files/printusb/")
# def print_from_usb():
    # filename = flask.request.args.get('futurepath')
    # if not os.path.exists(filepath):
        # return flask.jsonify({
                # 'status': 'failed',
                # 'msg': 'File not there, did the user unplug the usb?'
        # })

    # # print it
    # pm = printerManager()
    # if (not pm.isOperational()) or pm.isPaused() or pm.isPrinting():
        # return make_response("Printer is either not operational or is busy")

    # return flask.jsonify({
            # 'status': 'success',
            # 'msg': 'File copied',
    # })
