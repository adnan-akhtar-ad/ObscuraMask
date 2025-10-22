import asyncio
import traceback
from io import BytesIO  # Ensure BytesIO is imported explicitly
import os
import fitz
from PyPDF2 import PdfReader, PdfWriter
import re
import json
from obfuscate.chat import chatlocal, chatlocal_async

# Global store for PII values discovered in the last call
data_dict = {}

async def predictpdfheaders_async(file_bytes):
    """
    Async version of PDF header prediction
    """
    global data_dict
    data_dict.clear()

    try:
        print(f"Type of file_bytes in predictpdfheaders_async: {type(file_bytes)}")
        
        # Ensure we're working with BytesIO object
        if not isinstance(file_bytes, BytesIO):
            print("Converting to BytesIO")
            if isinstance(file_bytes, str):
                file_bytes = file_bytes.encode('utf-8')
            pdf_file_obj = BytesIO(file_bytes)
        else:
            print("Already a BytesIO object")
            pdf_file_obj = file_bytes
            
        # Reset the BytesIO position to the beginning to ensure full reading
        pdf_file_obj.seek(0)
        
        # Use PyMuPDF (fitz) for better text extraction
        print("Opening PDF with fitz")
        doc = fitz.open(stream=pdf_file_obj, filetype="pdf")
        full_text = ""
        for page in doc:
            full_text += page.get_text()
        print(f"Extracted {len(full_text)} characters of text")

        systemprompt = """
        PII Field Detection Specialist - Strict Mode

        You are an AI assistant specialized in identifying ONLY the PII field names that ACTUALLY EXIST in the document. Your task is to:

        1. Analyze the document text carefully
        2. Identify ONLY field names that contain actual PII data in the document
        3. Ignore potential PII categories that aren't present in the document
        4. Return ONLY field names that you can verify exist in the document

        VERIFICATION RULES:
        - Only list a field if you can find ACTUAL EXAMPLES of that data type in the document
        - Do NOT list theoretical fields that might typically exist but aren't shown in this specific document
        - Each reported field must have corresponding data instances in the document

        FOCUS ON THESE COMMON PII FIELDS:
        - Email (e.g., example@domain.com)
        - Physical Address (street addresses, cities, states, zip codes)
        - Phone Numbers (any format)
        - Names (if clearly personal names)
        - Financial Information (account numbers, payment details)
        - Government IDs (SSN, driver's license, etc.)
        - Geographical Data (coordinates, specific locations)

        DOCUMENT ANALYSIS METHOD:
        1. First scan the document text for common PII data patterns
        2. Identify the field names that correspond to these patterns
        3. Verify that multiple instances of this data type exist
        4. Only report fields where you have high confidence

        EXAMPLE:
        If the document contains patterns like "john@example.com" or "email: john@example.com", you would report "Email"
        If it contains "123 Main St, Springfield, IL", you would report "Address"
        If no financial information appears, do NOT list "Credit Card" or "Bank Account"

        FORMAT INSTRUCTIONS:
        - Return ONLY the list of field names as a JSON array
        - Use standardized field names (Email, Address, Phone, etc.)
        - Do not include any explanations or uncertain fields
        - Maximum precision is required - no false positives
        
        NOTE : Analyze this document and identify ONLY the PII field names that ACTUALLY EXIST with corresponding data in the document. Return the verified field names as a JSON array.
        """
        
        # Use async version of chatlocal
        print("Calling chatlocal_async")
        detected = await chatlocal_async(systemprompt, full_text, True)
        detected = detected.strip()
        print(f"chatlocal_async response received, length: {len(detected)}")

        # Clean up the response to extract just the JSON list
        # First try to find a JSON array in the response
        match = re.search(r'\[(.*?)\]', detected, re.DOTALL)
        if match:
            detected = f"[{match.group(1)}]"
            
        # Try to parse the JSON list
        try:
            headers = json.loads(detected)
            # Make sure headers is a list
            if not isinstance(headers, list):
                print(f"Received non-list JSON: {type(headers)}")
                if isinstance(headers, dict) and "changed_names" in headers:
                    headers = headers["changed_names"]
                else:
                    headers = []
                    
            # Filter out any non-string headers and normalize
            final_headers = [str(h).strip() for h in headers if isinstance(h, (str, int, float))]
            print(f"Parsed JSON headers: {final_headers}")
        except (json.JSONDecodeError, TypeError) as json_error:
            print(f"JSON parsing error: {json_error}")
            # If JSON parsing fails, try to extract headers from text
            headers = []
            # Try to extract items that look like they're in a list format
            for line in detected.split('\n'):
                line = line.strip()
                # Remove list markers, quotes and commas
                line = re.sub(r'^["\'\s\-\*]+|["\'\s\,]+$', '', line)
                if line and len(line) > 1:
                    headers.append(line)
            final_headers = headers
            print(f"Extracted headers from text: {final_headers}")
        
        # If AI detection failed, try traditional methods
        if not final_headers:
            print("AI detection failed, trying traditional methods")
            # Extract headers from tabular structure in PDF
            lines = full_text.split('\n')
            # Look for potential header rows (usually near the top of the document)
            for i in range(min(15, len(lines))):
                line = lines[i].strip()
                if line and not re.match(r'^Page|^\d+', line):
                    # If line has multiple words separated by spaces or commas
                    if ',' in line or len(line.split()) > 2:
                        if ',' in line:
                            # Comma-separated values
                            potential_headers = [h.strip() for h in line.split(',')]
                        else:
                            # Space-separated values
                            potential_headers = re.split(r'\s{2,}', line)
                        
                        # Filter out empty or very short items
                        potential_headers = [h for h in potential_headers if len(h) > 1]
                        if len(potential_headers) >= 2:  # At least 2 columns to be considered headers
                            final_headers = potential_headers
                            print(f"Found potential headers from document structure: {final_headers}")
                            break
        
        # Common PII headers to look for in the extracted text
        common_pii_headers = [
            "Name", "Email", "Address", "Phone", "SSN", "Social Security", 
            "Date of Birth", "DOB", "Password", "Username", "Credit Card",
            "Account Number", "ID", "License", "Passport", "Gender", "Age"
        ]
        
        # Add any common PII headers found in the text
        for pii_header in common_pii_headers:
            pattern = re.compile(r'\b' + re.escape(pii_header) + r'(?:s|es|)?\b', re.IGNORECASE)
            if pattern.search(full_text) and pii_header not in final_headers:
                final_headers.append(pii_header)
                print(f"Added common PII header: {pii_header}")
        
        # Ensure we don't have duplicates (case-insensitive)
        seen = set()
        unique_headers = []
        for header in final_headers:
            if header.lower() not in seen:
                seen.add(header.lower())
                unique_headers.append(header)
        
        # Extract actual PII values for each header
        for header in unique_headers:
            # Simple pattern matching based on header type
            header_lower = header.lower()
            data_dict[header] = []
            
            # Extract potential PII values
            if "email" in header_lower:
                # Email pattern
                emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', full_text)
                data_dict[header].extend(emails)
                print(f"Found {len(emails)} emails")
            elif "phone" in header_lower:
                # Phone number patterns
                phones = re.findall(r'\b(?:\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b', full_text)
                data_dict[header].extend(phones)
                print(f"Found {len(phones)} phone numbers")
            elif "address" in header_lower:
                # Simple address pattern (not comprehensive)
                addresses = re.findall(r'\d+\s+\w+\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane)', full_text, re.IGNORECASE)
                data_dict[header].extend(addresses)
                print(f"Found {len(addresses)} addresses")
            elif "ssn" in header_lower or "social security" in header_lower:
                # SSN pattern
                ssns = re.findall(r'\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b', full_text)
                data_dict[header].extend(ssns)
                print(f"Found {len(ssns)} SSNs")
            elif "name" in header_lower:
                # This is simplified - in a real system you'd need more sophisticated name extraction
                names = re.findall(r'Mr\.\s+\w+|Mrs\.\s+\w+|Ms\.\s+\w+|Dr\.\s+\w+|\b[A-Z][a-z]+\s+[A-Z][a-z]+\b', full_text)
                data_dict[header].extend(names)
                print(f"Found {len(names)} names")
        
        # Return headers for the UI with a blank placeholder at the start
        final_result = [" "] + unique_headers
        print(f"Final headers with placeholder: {final_result}")
        return final_result

    except Exception as e:
        print(f"Error in predictpdfheaders_async: {e}")
        print(traceback.format_exc())
        return [" "]

# Synchronous wrapper
def predictpdfheaders(file_bytes):
    """
    Synchronous wrapper for predictpdfheaders_async
    """
    try:
        print(f"Type of file_bytes in predictpdfheaders: {type(file_bytes)}")
        
        # Ensure we're working with BytesIO object
        if not isinstance(file_bytes, BytesIO):
            print("Converting to BytesIO in predictpdfheaders")
            if isinstance(file_bytes, str):
                file_bytes = file_bytes.encode('utf-8')
            file_bytes_io = BytesIO(file_bytes)
        else:
            print("Already a BytesIO object in predictpdfheaders")
            file_bytes_io = file_bytes
            
        # Reset the BytesIO position
        file_bytes_io.seek(0)
            
        # Get or create event loop
        try:
            print("Getting event loop")
            loop = asyncio.get_event_loop()
        except RuntimeError:
            print("Creating new event loop")
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        print("Running predictpdfheaders_async")
        result = loop.run_until_complete(predictpdfheaders_async(file_bytes_io))
        print(f"Result from predictpdfheaders_async: {result}")
        return result
    except Exception as e:
        print(f"Error in predictpdfheaders: {e}")
        print(traceback.format_exc())
        return [" "]



async def process_field_async(field, orig_values):
    """
    Process a single field asynchronously
    """
    try:
        name = field["name"]
        mode = field["mode"]
        prompt = field.get("prompt", "")

        if not orig_values:
            print(f"No original values for field {name}")
            return name, ""

        print(f"Processing field {name} with mode {mode}, {len(orig_values)} values")
        
        if mode == "mask":
            # Masking can be done synchronously
            joined = ",".join(orig_values)
            result = name, "#" * len(joined)
            print(f"Masked {name}: replaced with {len(joined)} '#' characters")
            return result
        
        elif mode == "obfuscate":
            joined = ",".join(orig_values)
            systemprompt = (
                "You are a tool that can modify PII data. "
                "Return ONLY the comma‑separated modified values, no extra text."
            )
            # Use async version of chatlocal
            print(f"Calling chatlocal_async for obfuscation of {name}")
            modified = await chatlocal_async(systemprompt, joined + " " + prompt)
            print(f"Obfuscated {name}: {modified[:50]}...")
            return name, modified.strip()
        
        print(f"Unknown mode {mode} for field {name}")
        return name, None
    except Exception as e:
        print(f"Error in process_field_async: {str(e)}")
        print(traceback.format_exc())
        return field.get("name", "unknown"), None


async def maskobfpdf_async(json_data, file_bytes):
    """
    Async version of PDF masking/obfuscation with improved implementation
    
    Args:
        json_data (dict): Configuration with fileName, headers (fields to process), and options
        file_bytes: PDF file content as bytes or BytesIO
    """
    try:
        import fitz  # PyMuPDF for better text modification
        import io
        import os
        import json
        
        # Convert input to BytesIO if needed
        pdf_file_obj = BytesIO(file_bytes) if not isinstance(file_bytes, BytesIO) else file_bytes
        pdf_file_obj.seek(0)
            
        # Parse the headers from JSON data if it's a string
        headers = json_data.get("headers", [])
        if isinstance(headers, str):
            try:
                headers = json.loads(headers)
                print(f"Parsed headers from JSON string: {headers}")
            except json.JSONDecodeError as json_err:
                print(f"Failed to parse headers JSON: {json_err}")
                headers = []
        
        if not isinstance(headers, list):
            print(f"Invalid headers format: {type(headers)}")
            headers = []

        # Open the PDF with PyMuPDF for better text handling
        doc = fitz.open(stream=pdf_file_obj, filetype="pdf")
        print(f"Opened PDF with {len(doc)} pages")
        
        # Process fields
        tasks = []
        for field in headers:
            if not isinstance(field, dict):
                print(f"Skipping non-dict field: {field}")
                continue
                
            name = field.get("name")
            if not name or name == " ":  # Skip blank placeholder
                continue
                
            orig_values = data_dict.get(name, [])
            if not orig_values:
                print(f"No original values for field {name}")
                continue
                
            print(f"Adding task for field {name} with {len(orig_values)} values")
            tasks.append(process_field_async(field, orig_values))

        # Process all fields concurrently
        modified_dict = {}
        if tasks:
            results = await asyncio.gather(*tasks)
            modified_dict = {name: value for name, value in results if value is not None}
            print(f"Processed {len(modified_dict)} fields: {list(modified_dict.keys())}")

        # Print some diagnostics about what we're replacing
        for field_name, replacement in modified_dict.items():
            original_values = data_dict.get(field_name, [])
            print(f"Field {field_name}: Replacing {len(original_values)} values with '{replacement[:20]}...'")

        # Process PDF pages - search and replace text on each page
        replacements_made = 0
        for page_num, page in enumerate(doc):
            for field_name, replacement in modified_dict.items():
                original_values = data_dict.get(field_name, [])
                
                for original in original_values:
                    if not original:
                        continue
                        
                    # Use PyMuPDF's search_for method to find text instances
                    text_instances = page.search_for(original)
                    
                    if text_instances:
                        print(f"Found {len(text_instances)} instances of '{original[:20]}...' on page {page_num+1}")
                        
                        # For each found text instance, add redaction annotation
                        for inst in text_instances:
                            # First, add the redaction annotation
                            annot = page.add_redact_annot(inst, replacement)
                            
                            # Then apply the redaction with the replacement text
                            page.apply_redactions()
                            replacements_made += 1

        print(f"Made a total of {replacements_made} replacements in the document")

        # Save output
        base_name = json_data.get('fileName', 'document.pdf')
        output_path = json_data.get('outputPath', '')
        out_name = f"{os.path.splitext(base_name)[0]}-output.pdf"
        
        # Use same directory structure as CSV handler
        final_output_path = os.path.join(
            output_path if output_path else os.path.join('..', 'client', 'public'),
            out_name
        )

        # Ensure directory exists
        os.makedirs(os.path.dirname(final_output_path), exist_ok=True)
        
        # Save the modified PDF
        doc.save(final_output_path)
        print(f"Saved modified PDF to {final_output_path}")
        
        # Close the document
        doc.close()

        return final_output_path

    except Exception as e:
        print(f"Error in maskobfpdf_async: {e}")
        print(traceback.format_exc())
        return str(e)

def maskobfpdf(json_data, file_bytes):
    """
    Synchronous wrapper for maskobfpdf_async with improved error handling
    """
    try:
        # Ensure json_data headers are parsed if provided as string
        if isinstance(json_data.get('headers'), str):
            try:
                json_data['headers'] = json.loads(json_data['headers'])
                print(f"Parsed headers in maskobfpdf: {json_data['headers']}")
            except json.JSONDecodeError as json_err:
                print(f"Failed to parse headers JSON in maskobfpdf: {json_err}")
                json_data['headers'] = []
                
        # Get or create event loop
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # Run the async function
        return loop.run_until_complete(maskobfpdf_async(json_data, file_bytes))
    except Exception as e:
        print(f"Error in maskobfpdf: {e}")
        print(traceback.format_exc())
        return str(e)