import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO
from werkzeug.utils import secure_filename
import json

app = Flask(__name__)
CORS(app)

socketio = SocketIO(app, cors_allowed_origins='*')

UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

chat_messages = []

users = {}

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file part'})

    file = request.files['file']

    if file.filename == '':
        return jsonify({'success': False, 'message': 'No selected file'})

    if file and 'username' in request.form:
        username = request.form['username']
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        print("File saved at:", file_path)

        file_type = get_file_type(file_path)
        socketio.emit('file_uploaded', {'filename': filename, 'username': username, 'file_type': file_type}, namespace='/')

        return jsonify({'success': True, 'message': 'File Berhasil di Upload'})

    return jsonify({'success': False, 'message': 'Failed to upload file'})

def get_file_type(file_path):
    _, file_extension = os.path.splitext(file_path)
    return file_extension.lower()

@app.route('/saveChat', methods=['POST'])
def save_chat():
    global chat_messages
    try:
        chat_messages = request.json['chat']

        with open('chat_data.json', 'w') as file:
            json.dump(chat_messages, file)

        return jsonify({'success': True, 'message': 'Chat Berhasil Disimpan'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error saving chat: {str(e)}'})

@app.route('/getChat', methods=['GET'])
def get_chat():
    global chat_messages
    return jsonify(chat_messages)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@socketio.on('chat_message', namespace='/')
def handle_chat_message(data):
    global chat_messages
    if 'username' in data and 'message' in data:
        username = data['username']
        message = data['message']
        chat_messages.append({'username': username, 'message': message})
        socketio.emit('chat_message', {'username': username, 'message': message}, namespace='/')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=3000)
