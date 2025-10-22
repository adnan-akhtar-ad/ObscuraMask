import os
from pathlib import Path
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Hash import SHA256  # Import the hash module properly

# Constants
SALT_SIZE = 16       # Recommended salt size
KEY_SIZE = 32        # 32 bytes = AES-256
IV_SIZE = 12         # 12 bytes = GCM standard
PBKDF2_ITERATIONS = 200_000

# Folder path
BASE_DIR = Path(__file__).resolve().parent.parent
FILES_FOLDER = os.path.join(BASE_DIR, "secured_files")

# Ensure folder exists
def ensure_folder_exists(folder_path=None):
    """Ensures the target folder exists"""
    target_folder = folder_path if folder_path else FILES_FOLDER
    if not os.path.exists(target_folder):
        os.makedirs(target_folder)
    return target_folder

# ENCRYPT
def encrypt_file(input_file_path, encryption_key, output_path=None):
    """
    Encrypts a file using AES-GCM mode with password-based key derivation.
    """
    try:
        # Ensure input file exists
        if not os.path.exists(input_file_path):
            raise FileNotFoundError(f"Input file not found: {input_file_path}")
        
        # Setup output path
        output_folder = ensure_folder_exists(output_path)
        secure_filename = os.path.basename(input_file_path)
        output_file_path = os.path.join(output_folder, f"{secure_filename}.enc")
        
        # Convert encryption key to bytes if it's a string
        if isinstance(encryption_key, str):
            encryption_key = encryption_key.encode('utf-8')
        
        # Perform encryption with correct hash module
        salt = get_random_bytes(SALT_SIZE)
        derived = PBKDF2(
            password=encryption_key,
            salt=salt,
            dkLen=KEY_SIZE + IV_SIZE,
            count=PBKDF2_ITERATIONS,
            hmac_hash_module=SHA256  # Use the correct import
        )
        key = derived[:KEY_SIZE]
        iv = derived[KEY_SIZE:]
        
        cipher = AES.new(key, AES.MODE_GCM, nonce=iv)
        
        # Read and encrypt file
        with open(input_file_path, 'rb') as f:
            plaintext = f.read()
        
        ciphertext, tag = cipher.encrypt_and_digest(plaintext)
        
        # Save encrypted file
        with open(output_file_path, 'wb') as f:
            f.write(salt + tag + ciphertext)
        
        print(f"✅ File encrypted successfully: {output_file_path}")
        return output_file_path
        
    except Exception as e:
        print(f"❌ Encryption error: {str(e)}")
        raise

# 🔓 DECRYPT
def decrypt_file(encrypted_file_path, encryption_key, output_path=None):
    """
    Decrypts a file using AES-GCM mode with password-based key derivation.
    """
    try:
        # Setup output path
        if output_path:
            ensure_folder_exists(output_path)
            filename = os.path.basename(encrypted_file_path)
            if filename.endswith('.enc'):
                output_filename = filename[:-4]
            else:
                output_filename = f"decrypted_{filename}"
            output_file_path = os.path.join(output_path, output_filename)
        else:
            ensure_folder_exists()
            filename = os.path.basename(encrypted_file_path)
            if filename.endswith('.enc'):
                output_filename = filename[:-4]
            else:
                output_filename = f"decrypted_{filename}"
            output_file_path = os.path.join(FILES_FOLDER, output_filename)

        # Convert encryption key to bytes if it's a string
        if isinstance(encryption_key, str):
            encryption_key = encryption_key.encode('utf-8')
        
        with open(encrypted_file_path, 'rb') as f:
            file_data = f.read()
        
        salt = file_data[:SALT_SIZE]
        tag = file_data[SALT_SIZE:SALT_SIZE+16]
        ciphertext = file_data[SALT_SIZE+16:]
        
        derived = PBKDF2(
            password=encryption_key,
            salt=salt,
            dkLen=KEY_SIZE + IV_SIZE,
            count=PBKDF2_ITERATIONS,
            hmac_hash_module=SHA256  # Use the correct import
        )
        key = derived[:KEY_SIZE]
        iv = derived[KEY_SIZE:]
        
        cipher = AES.new(key, AES.MODE_GCM, nonce=iv)
        plaintext = cipher.decrypt_and_verify(ciphertext, tag)
        
        with open(output_file_path, 'wb') as f:
            f.write(plaintext)
        
        print("✅ File decrypted successfully!")
        print(f"📁 Decrypted file saved to: {output_file_path}")
        return output_file_path
        
    except ValueError as e:
        print("❌ Incorrect password or file tampered.")
        raise ValueError("Decryption failed: Invalid password or corrupted file")
    except Exception as e:
        print(f"❌ Error during decryption: {str(e)}")
        raise

# # Example usage
# if __name__ == "__main__":
#     import sys
    
#     if len(sys.argv) < 4:
#         print("Usage:")
#         print("  For encryption: python script.py encrypt <file_path> <password>")
#         print("  For decryption: python script.py decrypt <file_path> <password>")
#         sys.exit(1)
    
#     action = sys.argv[1].lower()
#     file_path = sys.argv[2]
#     password = sys.argv[3]
    
#     if action == "encrypt":
#         encrypt_file(file_path, password)
#     elif action == "decrypt":
#         decrypt_file(file_path, password)
#     else:
#         print("Invalid action. Use 'encrypt' or 'decrypt'")