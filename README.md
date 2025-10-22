# ObscuraMask

ObscuraMask is a Generative AI-powered data masking and encryption tool that helps users protect sensitive data in CSV, Excel, PDF, and text files. It offers two key features: data obfuscation/redaction and secure file encryption/decryption for safe sharing.

---

## 🚀 Features

- 🔒 **Data Masking** – Mask sensitive information in CSV, Excel, PDF, and text files using redaction or obfuscation.
- 🔐 **File Encryption/Decryption** – Encrypt files before sending and decrypt received files securely.
- ⚙️ **Supports Multiple Formats** – Works seamlessly with CSV, Excel, PDF, and plain text files.
- 🤖 **AI-Powered Masking** – Uses Generative AI for intelligent data obfuscation while maintaining usability.
- 🔑 **Secure File Transfer** – Users can encrypt files before sharing and decrypt them upon receipt.

---

## 🏗 Tech Stack

- Frontend: Next.js
- Backend: Python
- AI: Generative AI models for masking
- Encryption: AES-256 or equivalent strong encryption

---

## 📌 Installation Guide

### Prerequisites

- Node.js
- Python 3.x
- Python packages listed in `requirements.txt`

### Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/obscuramask.git
   cd obscuramask
   ```

2. Install frontend dependencies:
   ```bash
   cd client
   npm install
   ```

3. Install backend dependencies:
   ```bash
   cd ../server
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   Create `.env` files in `server` directories with necessary keys.

   ```
   GOOGLE_API_KEY=your_gemini_api_key_here
   ```

5. Start the backend server:
   ```bash
   cd ../server
   python app.py
   ```

6. Start the frontend development server:
   ```bash
   cd ../client
   npm run dev
   ```

---

## 📂 Repository Structure

```
obscuramask/
│── client/                 # Next.js frontend application
│── server/                 # Python backend server
│── .gitignore             # Git ignore rules
│── LICENSE                # LICENSE
│── README.md              # Project documentation
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/your-username/obscuramask/issues).

---

## 📜 License

This project is licensed under the Apache License 2.0

---

<!-- ## 👤 Author

Krishna Sumit

--- -->

⭐ If you find this project useful, please give it a star on GitHub!