from flask import Flask
from flask import render_template


app = Flask(__name__)

def info():
    user = {'nickname': 'Praful', 'key': 'A154XWA256'}
    posts = {'company': 'Ethereal Machines', 'link': 'http://www.etherealmachines.com/', 'firmware' : 'Marlin Firmware', 'version': 'v1.01'}
    return render_template('index.html',  user=user, title= 'Try', posts=posts)
