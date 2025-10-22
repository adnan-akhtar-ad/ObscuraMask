from flask import Flask, request, jsonify
import os
import json
from flask_cors import CORS
from PyPDF2 import PdfReader
from obfuscate.pdfhandler import predictpdfheaders, maskobfpdf
import traceback
from io import BytesIO


app = Flask(__name__)
CORS(app)

def getpdfheader():
    """
    Get and process PDF headers from uploaded file
    """
    # Accepts multipart/form-data with uploaded file
    uploaded = request.files.get('file')
    if not uploaded:
        return jsonify({"error": "No file uploaded"}), 400
    
    try:
        # Read the file content as bytes
        file_bytes = uploaded.read()
        
        print("File read, creating BytesIO object")
        # Create BytesIO object
        file_bytes_io = BytesIO(file_bytes)
        
        # Verify the PDF is valid by trying to open it with PyPDF2
        try:
            print("Verifying PDF with PyPDF2")
            reader = PdfReader(file_bytes_io)
            num_pages = len(reader.pages)
            print(f"PDF has {num_pages} pages")
            
            # Reset file position to beginning for subsequent operations
            file_bytes_io.seek(0)
        except Exception as pdf_error:
            print(f"PDF validation error: {pdf_error}")
            print(traceback.format_exc())
            return jsonify({"error": f"Invalid PDF file: {str(pdf_error)}"}), 400
        
        # Call the PDFhandler function to identify headers
        print("Calling predictpdfheaders")
        headers = predictpdfheaders(file_bytes_io)
        
        return jsonify({
            "headers": headers,
            "message": "These columns can be selected for obfuscation"
        })
    except Exception as e:
        print(f"Error in getpdfheader endpoint: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    
def maskpdf():
    """
    Process PDF file for masking/obfuscation
    """
    # Get the form data
    uploaded = request.files.get('file')
    headers_json = request.form.get('headers')
    output_path = request.form.get('outputPath', '')
    input_path = request.form.get('inputPath', '')
    
    print(f"Output path: {output_path}")
    print(f"Input path: {input_path}")
    print(f"Headers JSON: {headers_json}")
    
    if not uploaded or not headers_json:
        return jsonify({'error': 'Missing file or headers'}), 400
    
    try:
        # Read file as bytes
        file_bytes = uploaded.read()
        
        print("Creating BytesIO object for maskpdf")
        # Create BytesIO object 
        file_bytes_io = BytesIO(file_bytes)
        
        # Verify the PDF is valid
        try:
            print("Verifying PDF in maskpdf")
            reader = PdfReader(file_bytes_io)
            num_pages = len(reader.pages)
            print(f"PDF has {num_pages} pages")
            
            # Reset file position to beginning for subsequent operations
            file_bytes_io.seek(0)
        except Exception as pdf_error:
            print(f"PDF validation error in maskpdf: {pdf_error}")
            print(traceback.format_exc())
            return jsonify({"error": f"Invalid PDF file: {str(pdf_error)}"}), 400
        
        # Ensure output directory exists
        if output_path:
            os.makedirs(output_path, exist_ok=True)
        
        # Parse the headers JSON to ensure it's a proper Python object
        try:
            headers = json.loads(headers_json)
            print(f"Successfully parsed headers: {headers}")
        except json.JSONDecodeError as json_err:
            print(f"Failed to parse headers JSON: {json_err}")
            return jsonify({"error": f"Invalid headers JSON: {str(json_err)}"}), 400
        
        # Prepare JSON data
        json_data = {
            'fileName': uploaded.filename,
            'headers': headers,  # Now passing parsed Python object instead of raw JSON string
            'outputPath': output_path
        }
        
        # Process the PDF file
        print("Calling maskobfpdf")
        output_file = maskobfpdf(json_data, file_bytes_io)
        
        # Get just the filename from the full path
        filename = os.path.basename(output_file)
        
        return jsonify({
            'output': output_file,
            'filename': filename
        })
        
    except Exception as e:
        print(f"Error in maskpdf endpoint: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)