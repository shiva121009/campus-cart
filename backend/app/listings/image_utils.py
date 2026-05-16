from flask import send_from_directory, Blueprint, current_app
import os

imagedisplay = Blueprint("imgdisplay", __name__)

@imagedisplay.route('/static/uploads/<path:filename>')
def serve_image(filename):
    upload_folder = os.path.join(current_app.root_path, 'static', 'uploads')
    return send_from_directory(upload_folder, filename)
