#!/usr/bin/python2.7
# coding="UTF-8"

__author__ = "Toran Sahu <toran.sahu@yahoo.com>"
__license__ = "GNU Affero General Public License http://www.gnu.org/licenses/agpl.html"
__copyright__ = "Copyright (C) 2018 Ethereal Machines - Released under terms of the AGPLv3 License"

import re


def analyze_gcode(file_path):
    """
    Analyze gcode file for total_layers & print_time values.
    :param file_path: <path> absolute path to file
    :return: <dict> total_layers + print_time info
    """

    regex_layers = re.compile(r';LAYER.COUNT.*?([0-9.-]+)', flags=re.IGNORECASE)
    regex_time = re.compile(r';TIME.*?([0-9.-]+)', flags=re.IGNORECASE)

    count = 0
    result = []
    total_layers = None
    print_time = None

    with open(file_path, 'r') as f:
        for line in f:
            count += 1

            layer_match = regex_layers.match(line)
            if layer_match:
                result.append(layer_match.group(1))

            time_match = regex_time.match(line)
            if time_match:
                print_time = int(time_match.group(1))

            if count > 50:
                break
        total_layers = max(map(int, result))
    return {
        'gcode_data': {
            'total_layers': total_layers,
            'print_time': print_time,
        }
    }
