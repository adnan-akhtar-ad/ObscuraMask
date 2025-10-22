from flask import request, jsonify, current_app
import os
import json
from werkzeug.utils import secure_filename
from aes.aes import encrypt_file, decrypt_file

def encrypt_route():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    files = request.files.getlist('file')
    headers_str = request.form.get('headers')
    output_path = request.form.get('outputPath', '')
#or current_app.config['SECURED_FILES_FOLDER']
    
    print("Output pathxxxxxxxxxxxx:", output_path)
    
    # Parse headers JSON to get encryption key
    try:
        headers = json.loads(headers_str) if headers_str else []
        encryption_key = next((h.get('key') for h in headers if h.get('mode') == 'encrypt'), None)
    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid headers format'}), 400
    
    # print("Files:", files)
    # print("Headers:", headers)
    # print("Output path:", output_path)
    
    if not files:
        return jsonify({'error': 'No files uploaded'}), 400
    
    if not encryption_key:
        return jsonify({'error': 'No encryption key provided in headers'}), 400
    
    results = []
    
    for file in files:
        temp_path = None
        try:
            if file.filename == '':
                continue
                
            # Secure the filename and create full paths
            secure_name = secure_filename(file.filename)
            temp_path = os.path.join(current_app.config['UPLOAD_FOLDER'], f"temp_{secure_name}")
            
            # Save uploaded file temporarily
            file.save(temp_path)
            
            # Encrypt the file
            encrypted_path = encrypt_file(temp_path, encryption_key, output_path)
            
            results.append({
                'filename': secure_name,
                'encryptedPath': encrypted_path,
                'status': 'success'
            })
            
        except Exception as e:
            results.append({
                'filename': file.filename,
                'error': str(e),
                'status': 'failed'
            })
        finally:
            # Clean up temporary file
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
    
    return jsonify({
        'status': 'success',
        'files': results,
        'totalProcessed': len(results)
    })
    
    
def decrypt_route():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    files = request.files.getlist('file')
    headers_str = request.form.get('headers')
    output_path = request.form.get('outputPath') or current_app.config['SECURED_FILES_FOLDER']
    
    # Parse headers JSON to get encryption key
    try:
        headers = json.loads(headers_str) if headers_str else []
        encryption_key = next((h.get('key') for h in headers if h.get('mode') == 'decrypt'), None)
    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid headers format'}), 400
    
    if not files:
        return jsonify({'error': 'No files uploaded'}), 400
    
    if not encryption_key:
        return jsonify({'error': 'No encryption key provided in headers'}), 400
    
    results = []
    
    for file in files:
        temp_path = None
        try:
            if file.filename == '':
                continue
                
            # Secure the filename and create full paths
            secure_name = secure_filename(file.filename)
            temp_path = os.path.join(current_app.config['UPLOAD_FOLDER'], f"temp_{secure_name}")
            
            # Save uploaded file temporarily
            file.save(temp_path)
            
            # Decrypt the file
            decrypted_path = decrypt_file(temp_path, encryption_key, output_path)
            
            results.append({
                'filename': secure_name,
                'decryptedPath': decrypted_path,
                'status': 'success'
            })
            
        except Exception as e:
            results.append({
                'filename': file.filename,
                'error': str(e),
                'status': 'failed'
            })
        finally:
            # Clean up temporary file
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
    
    return jsonify({
        'status': 'success',
        'files': results,
        'totalProcessed': len(results)
    })