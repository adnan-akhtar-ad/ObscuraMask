import csv
import json
import os
import asyncio
from io import StringIO
import pandas as pd
from typing import Dict, List, Any

async def predictheaders_async(file_content):
    """
    Extract CSV headers from file content string (async version).
    """
    reader = csv.reader(StringIO(file_content))
    headers = next(reader, None)
    if not headers:
        raise Exception("CSV file is empty or invalid")
    return [' '] + headers

# Synchronous wrapper for backward compatibility
def predictheaders(file_content):
    """
    Synchronous wrapper for predictheaders_async.
    """
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(predictheaders_async(file_content))

async def maskobfcsv_async(json_data: Dict[str, Any], file_content: str) -> str:
    """
    Applies masking or obfuscation to specified columns in CSV content (async version).
    
    Args:
        json_data (dict): Configuration with fileName, headers (columns to process), and options
        file_content (str): CSV file content as string
    
    Returns:
        str: Path to the output CSV file
    """
    # Import inside function to avoid circular imports
    # from chat import chatlocal_async

    filename = json_data['fileName']
    
    # Read CSV from string content
    df = pd.read_csv(StringIO(file_content))
    updated_df = df.copy()

    column_info = json_data.get('headers', [])
    original_headers = set(df.columns)

    # Process columns that need obfuscation
    obfuscation_tasks = []
    columns_to_obfuscate = []

    # First handle masking (no async needed)
    for col in column_info:
        column_name = col.get('name')
        mode = col.get('mode')

        if column_name not in original_headers:
            print(f"Warning: Column '{column_name}' not found in file. Skipping.")
            continue

        if mode == "mask":
            print(f"Masking the data in column: {column_name}")
            updated_df[column_name] = df[column_name].apply(lambda x: '#' * len(str(x)))
        
        elif mode == "obfuscate":
            # Store for async processing
            columns_to_obfuscate.append(col)

    # Create a task for each column that needs obfuscation
    for col in columns_to_obfuscate:
        column_name = col.get('name')
        instruction = col.get('prompt')
        
        print(f"Queuing obfuscation for column: {column_name}")
        
        # Convert column to string and handle NaN/None values
        csv_col = df[column_name].fillna("").astype(str)
        
        # Create a comma-separated string of values
        data_string = ','.join(csv_col)
        
        # Create an async task for this column
        task = asyncio.create_task(
            process_obfuscation(
                column_name=column_name,
                data_string=data_string,
                instruction=instruction,
                updated_df=updated_df,
                csv_col=csv_col
            )
        )
        obfuscation_tasks.append(task)
    
    # Wait for all obfuscation tasks to complete
    if obfuscation_tasks:
        print(f"Processing {len(obfuscation_tasks)} columns for obfuscation...")
        await asyncio.gather(*obfuscation_tasks)
    
    # Save output
    output_path = json_data.get('outputPath', '')
    base_name = os.path.splitext(filename)[0]
    output_filename = f"{base_name}-output.csv"
    
    # Determine final output path
    final_output_path = os.path.join(
        output_path if output_path else os.path.join('..', 'client', 'public'),
        output_filename
    )

    # Ensure the directory exists
    os.makedirs(os.path.dirname(final_output_path), exist_ok=True)
    
    # Save the updated dataframe to CSV
    updated_df.to_csv(final_output_path, index=False)

    print(f"Output saved to: {final_output_path}")
    return final_output_path

async def process_obfuscation(column_name, data_string, instruction, updated_df, csv_col):
    """
    Helper function to process a single column obfuscation task asynchronously.
    """
    from obfuscate.chat import chatlocal_async
    
    print(f"Starting obfuscation for column: {column_name}")
    print(f"Processing {len(csv_col)} values")
    
    try:
        # Get obfuscated data from AI model
        modified_data_string = await chatlocal_async(instruction, data_string)
        
        # Check if we got a valid response
        if not modified_data_string:
            print(f"Warning: No valid response received for column '{column_name}'")
            return
        
        # Handle the case where the response might be raw JSON string
        if isinstance(modified_data_string, str) and modified_data_string.strip().startswith('{'):
            try:
                json_obj = json.loads(modified_data_string)
                if 'changed_names' in json_obj and isinstance(json_obj['changed_names'], list):
                    modified_data_string = ','.join(json_obj['changed_names'])
            except json.JSONDecodeError:
                # Continue with the string as-is if it's not valid JSON
                pass
        
        # Split the modified data string into individual values
        modified_values = modified_data_string.split(',')
        
        # Make sure we have enough values to apply (add padding if needed)
        if len(modified_values) < len(csv_col):
            # Pad with original values if we don't have enough obfuscated values
            print(f"Warning: Not enough obfuscated values returned for column '{column_name}'")
            modified_values.extend(csv_col[len(modified_values):])
        
        # Apply the modified values to the dataframe
        for i, value in enumerate(modified_values):
            if i < len(updated_df):
                updated_df.loc[i, column_name] = value.strip()
        
        print(f"Successfully obfuscated column: {column_name}")
        
    except Exception as e:
        print(f"Obfuscation failed for column '{column_name}': {str(e)}")
        print("Falling back to original values for this column")

# Synchronous wrapper for backward compatibility
def maskobfcsv(json_data, file_content):
    """
    Synchronous wrapper for maskobfcsv_async.
    """
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(maskobfcsv_async(json_data, file_content))