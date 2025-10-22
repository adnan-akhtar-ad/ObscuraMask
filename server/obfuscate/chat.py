import requests
import json
import asyncio
from pydantic import BaseModel, ValidationError
from typing import List, Union, Optional
from dotenv import load_dotenv
import os
import google.generativeai as genai

# Load environment variables
load_dotenv(".env")

# Configure Google Generative AI
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Define the Pydantic model for expected output
class ResponseFormat(BaseModel):
    changed_names: List[str]

# -----------------------------
# Async Local or Gemini-based chat function
# -----------------------------
async def chatlocal_async(system, content, is_pdf=False):
    """
    Send prompt to AI model and return obfuscated data (async version).
    
    Args:
        system (str): System instructions for obfuscation method
        content (str): Comma-separated data to obfuscate
        is_pdf (bool): Flag to indicate if this is a PDF processing request
    
    Returns:
        str: Comma-separated string of obfuscated values or raw model output for PDF processing
    """
    # Prompt system message
    pro_system_prompt = (
        "You are a data obfuscation tool that transforms values while preserving their general format and type. " +
        "Apply this specific transformation to each value: " + system + ". " +
        "Follow these rules strictly:\n" +
        "1. Generate COMPLETELY NEW values for each item that are SIGNIFICANTLY different from the original data\n" +
        "2. For numeric values: ensure at least a 30% difference (higher or lower) from the original value\n" +
        "3. For text values: replace with entirely different text, not just minor variations\n" +
        "4. Preserve the general data type and format (if it's a number, return a different number; if it's a name, return a different name)\n" +
        "5. For numbers, maintain the same number of digits before and after decimal points\n" +
        "6. Don't append suffixes like '_changed' to the values\n" +
        "7. Return ONLY the changed values as a JSON object with a 'changed_names' array\n\n" +
        "Example response format: {'changed_names': ['completely_new_value1', 'completely_new_value2', 'completely_new_value3']}\n\n" +
        "Example: If original value is '549.9041', an acceptable obfuscated value would be '238.4517' or '872.3106', NOT '587.951054'"
    )
    
    async def call_gemini_model():
        try:
            # Initialize the Gemini model
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            # Combine system prompt and content for context
            if is_pdf:
                combined_prompt = f"{system}\n\nInput data: {content}"
            else:
                combined_prompt = f"{pro_system_prompt}\n\nInput data: {content}"
            
            # Run the blocking call in a thread pool
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: model.generate_content(combined_prompt)
            )
            
            if not response or not hasattr(response, 'text'):
                print("Received empty response from Gemini API")
                return None
                
            return response.text
            
        except Exception as e:
            print(f"Google Gemini API call failed: {e}")
            return None

    # Use Gemini model
    raw_output = await call_gemini_model()
    
    # Handle API failure
    if raw_output is None:
        print("AI model returned no response, using original data")
        return content

    # If this is a PDF processing request, return the raw output
    if is_pdf:
        print(f"PDF processing mode, returning raw output: {raw_output[:100]}...")
        return raw_output

    # Try to parse the response as JSON into our ResponseFormat
    try:
        # Clean the output - sometimes AI returns code blocks or extra text
        if "```json" in raw_output:
            # Extract JSON from code blocks if present
            start = raw_output.find("```json") + 7
            end = raw_output.find("```", start)
            raw_output = raw_output[start:end].strip()
        elif "```" in raw_output:
            # Extract from generic code blocks
            start = raw_output.find("```") + 3
            end = raw_output.find("```", start)
            raw_output = raw_output[start:end].strip()
            
        # Remove any non-JSON text before or after the actual JSON content
        raw_output = raw_output.strip()
        if raw_output.startswith("{") and "}" in raw_output:
            end_pos = raw_output.rindex("}") + 1
            raw_output = raw_output[:end_pos]

        parsed_json = json.loads(raw_output)
        
        # Handle the case where parsed_json is a list instead of a dict
        if isinstance(parsed_json, list):
            print("Received JSON list instead of object, converting to compatible format")
            parsed_json = {"changed_names": parsed_json}
            
        validated_data = ResponseFormat(**parsed_json)
        comma_separated_string = ",".join(validated_data.changed_names)
        return comma_separated_string
        
    except (json.JSONDecodeError, ValidationError) as e:
        print(f"Error parsing model output: {e}")
        print("Raw output:", raw_output)
        
        # Try to extract data from a malformed response
        if "changed_names" in raw_output:
            try:
                # Try to extract just the array part
                start = raw_output.find("[")
                end = raw_output.find("]") + 1
                if start >= 0 and end > start:
                    array_part = raw_output[start:end]
                    parsed_array = json.loads(array_part)
                    if isinstance(parsed_array, list):
                        return ",".join(parsed_array)
            except:
                pass
                
        # If all else fails, return the raw output
        return raw_output

# Synchronous wrapper for backward compatibility
def chatlocal(system, content, is_pdf=False):
    """
    Synchronous wrapper around the async chatlocal function.
    """
    # Create an event loop if there isn't one already
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    # Run the async function and return its result
    return loop.run_until_complete(chatlocal_async(system, content, is_pdf))