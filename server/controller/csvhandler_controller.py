from flask import Flask, request, jsonify
import os
import json
from flask_cors import CORS
from obfuscate.csvhandler import predictheaders, maskobfcsv

def getcsvheader():
    # Accepts multipart/form-data with uploaded file
    uploaded = request.files.get('file')
    if not uploaded:
        return jsonify({"error": "No file uploaded"}), 400

    try:
        content = uploaded.read().decode('utf-8')
        headers = predictheaders(content)
        return jsonify({
            "headers": headers, 
            "message": "These columns can be selected for obfuscation"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    
def mask_obfuscate_csv():
    # Accepts multipart/form-data with CSV file and JSON form fields
    uploaded = request.files.get('file')
    headers_json = request.form.get('headers')
    output_path = request.form.get('outputPath', '')
    input_path = request.form.get('inputPath', '')

    if not uploaded or not headers_json:
        return jsonify({'error': 'Missing file or headers'}), 400

    try:
        file_content = uploaded.read().decode('utf-8')
        json_data = {
            'fileName': uploaded.filename,
            'headers': headers_json,
            'outputPath': output_path,
            'inputPath': input_path
        }
        # Ensure headers are parsed if they're in string format
        if isinstance(json_data['headers'], str):
            try:
                json_data['headers'] = json.loads(json_data['headers'])
            except:
                pass
                
        # maskobfcsv now expects (json_data, file_content)
        output_file = maskobfcsv(json_data, file_content)
        return jsonify({
            'output': output_file,
            'filename': os.path.basename(output_file)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500