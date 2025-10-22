from flask import Flask, request, jsonify, send_from_directory
import os
from flask_cors import CORS
from pathlib import Path

from controller.csvhandler_controller import mask_obfuscate_csv, getcsvheader
from controller.pdfhandler_controller import maskpdf, getpdfheader
from controller.aeshandler_controller import encrypt_route, decrypt_route


# Configure upload and secured files directories
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'temp_uploads')
SECURED_FILES_FOLDER = os.path.join(BASE_DIR, 'secured_files')

# Ensure both directories exist
for folder in [UPLOAD_FOLDER, SECURED_FILES_FOLDER]:
    if not os.path.exists(folder):
        os.makedirs(folder)

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['SECURED_FILES_FOLDER'] = SECURED_FILES_FOLDER

# csv routes
@app.route("/getcsvheader", methods=['POST'])
def get_csv_header_route():
    return getcsvheader()

@app.route("/maskobfcsv", methods=['POST'])
def mask_csv_route():
    return mask_obfuscate_csv()


# pdf routes
@app.route("/getpdfheader", methods=['POST'])
def get_pdf_header_route():
    return getpdfheader()

@app.route("/maskobfpdf", methods=['POST'])
def mask_pdf_route():
    return maskpdf()

# encryption routes
@app.route("/encryptfile", methods=['POST'])
def encrypt_file_route():
    return encrypt_route()

@app.route("/decryptfile", methods=['POST']) 
def decrypt_file_route():
    return decrypt_route()


# File Download route
@app.route("/api/files/download/<filename>", methods=['GET'])
def download_file(filename):
    try:
        file_path = os.path.join(app.config['SECURED_FILES_FOLDER'], filename)
        
        # First check if file exists
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404

        # Send file to client
        response = send_from_directory(
            app.config['SECURED_FILES_FOLDER'],
            filename,
            as_attachment=True
        )
        
        # Delete the file after sending
        @response.call_on_close
        def on_close():
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    print(f"File {filename} has been removed after download")
            except Exception as e:
                print(f"Error removing file {filename}: {str(e)}")
                
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 404


if __name__ == "__main__":
    app.run(debug=True)