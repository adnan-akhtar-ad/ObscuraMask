// 'use client';

// import { useState, useEffect } from 'react';
// import { Download } from 'lucide-react';

// type Mode = 'encrypt' | 'decrypt';
// type FileItem = {
//   id: number;
//   name: string;
//   url: string;
//   mode: Mode
// };

// import Footer from '@/components/footer';
// import Header from '@/components/header';

// // Sample files for demonstration
// const DUMMY_FILES: FileItem[] = [
//   { id: 1, name: 'document1.pdf', url: '/downloads/document1.pdf', mode: 'encrypt' },
//   // { id: 2, name: 'report.xlsx', url: '/downloads/report.xlsx', mode: 'decrypt' },
//   // { id: 3, name: 'image.png', url: '/downloads/image.png', mode: 'encrypt' },
// ];

// export default function FileDownloadComponent() {
//   const [processedFiles, setProcessedFiles] = useState<FileItem[]>([]);

//   // Initialize with dummy files on component mount
//   useEffect(() => {
//     setProcessedFiles(DUMMY_FILES);
//   }, []);

//   const clearAllFiles = () => setProcessedFiles([]);

//   // Get the mode from the first file (assuming all files have same mode)
//   const mode = processedFiles.length > 0 ? processedFiles[0].mode : 'encrypt';
//   const title = mode === 'encrypt' ? 'Encrypted Files Available' : 'Decrypted Files Available';

//   return (
//     <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 to-black">
//       {/* Header would be here in the full application */}
//       <Header />
//       <header className="mb-8 md:mb-6 text-center pt-4 md:pt-6"></header>

//       <main className="flex-grow flex items-center justify-center p-4 mt-4 h-[50vh] md:h-[70vh]">
//         <div className="w-full max-w-4xl bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-xl p-6 md:p-8">
//           {/* Always show the title when there are files */}
//           {processedFiles.length > 0 && (
//             <h1 className="text-center text-2xl md:text-3xl font-bold mb-6 text-white flex items-center justify-center gap-3">
//               <span className="text-yellow-400">📁</span> {title}
//             </h1>
//           )}

//           {/* Controls - only show when files exist */}
//           {processedFiles.length > 0 && (
//             <div className="flex justify-between items-center mb-4">
//               <h2 className="text-lg font-medium text-white">All Files</h2>
//               <button
//                 onClick={clearAllFiles}
//                 className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1 rounded-md transition-all duration-300"
//               >
//                 Clear All
//               </button>
//             </div>
//           )}

//           {/* File List */}
//           {processedFiles.length > 0 && (
//             <ul className="flex flex-col space-y-3">
//               {processedFiles.map((file, index) => (
//                 <li
//                   key={file.id}
//                   className="bg-gray-800/70 hover:bg-gray-700/70 border border-gray-600 hover:border-gray-500 rounded-lg p-4 flex justify-between items-center transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg shadow-md"
//                   style={{
//                     animationDelay: `${index * 100}ms`,
//                     animationFillMode: 'both'
//                   }}
//                 >
//                   <div className="flex flex-col">
//                     <span className="font-medium truncate max-w-xs text-white">{file.name}</span>
//                     <span className="text-sm text-gray-300">Mode: {file.mode}</span>
//                   </div>
//                   <a
//                     href={file.url}
//                     download
//                     className="ml-4 bg-indigo-600/70 hover:bg-indigo-500 text-white px-4 py-2 rounded-md flex items-center transition-all duration-300"
//                   >
//                     <Download size={18} className="mr-2" /> Download
//                   </a>
//                 </li>
//               ))}
//             </ul>
//           )}

//           {/* Show message when no files */}
//           {processedFiles.length === 0 && (
//             <div className="text-center py-12">
//               <p className="text-gray-400 text-lg">No files available</p>
//               <p className="text-gray-500 mt-2">Processed files will appear here</p>
//             </div>
//           )}
//         </div>
//       </main>

//       {/* Footer would be here in the full application */}
//       <Footer />
//     </div>
//   );
// }



//xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

'use client';

import { useState, useEffect } from 'react';
import { Download, Eye, EyeOff } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Footer from '@/components/footer';
import Header from '@/components/header';

// Define comprehensive types based on the actual API response
type FileProcessingMode = 'encrypt' | 'decrypt' | 'obfuscate';

type ProcessedFile = {
  path: string;
  filename: string;
  status: string;
  length: number;
  mode: FileProcessingMode;
};

export default function AseViewer() {
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [showEncryptionKeys, setShowEncryptionKeys] = useState<Record<string, boolean>>({});
  const [decryptionKeys, setDecryptionKeys] = useState<Record<string, string>>({});
  const searchParams = useSearchParams();

  // Parse the files from URL query parameter
  useEffect(() => {
    const filesParam = searchParams.get('files');
    if (filesParam) {
      try {
        const parsedFiles = JSON.parse(decodeURIComponent(filesParam));
        setProcessedFiles(Array.isArray(parsedFiles) ? parsedFiles : [parsedFiles]);
        
        // Initialize decryption keys and visibility state
        const initialKeys: Record<string, string> = {};
        const initialVisibility: Record<string, boolean> = {};
  
        if (Array.isArray(parsedFiles)) {
          parsedFiles.forEach((file) => {
            initialKeys[file.filename] = '';
            initialVisibility[file.filename] = false;
          });
        } else if (parsedFiles) {
          initialKeys[parsedFiles.filename] = '';
          initialVisibility[parsedFiles.filename] = false;
        }
        
        setDecryptionKeys(initialKeys);
        setShowEncryptionKeys(initialVisibility);
      } catch (error) {
        console.error('Error parsing files parameter:', error);
      }
    }
  }, [searchParams]);
  const handleDownload = (file: ProcessedFile) => {
    console.log(`Downloading file: ${file.filename} with path: ${file.path}`);

    file.filename = file.path.split(/[/\\]/).pop() || '';
    const serverBaseUrl = 'http://localhost:5000';

    const encodedFilename = encodeURIComponent(file.filename);
    const downloadUrl = `${serverBaseUrl}/api/files/download/${encodedFilename}`;
    
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Get the mode from the first file (assuming all files have same mode)
  const mode = processedFiles.length > 0 ? processedFiles[0].mode : 'encrypt';
  const title = mode === 'encrypt' ? 'Encrypted Files Available' : 'Decrypted Files Available';

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <Header />
      <header className="mb-8 md:mb-6 text-center pt-4 md:pt-6"></header>

      <main className="flex-grow flex items-center justify-center p-4 mt-4 h-full md:h-[70vh]">
        <div className="w-full max-w-4xl bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-xl p-6 md:p-8 ">
          {/* Always show the title when there are files */}
          {processedFiles.length > 0 && (
            <h1 className="text-center text-xl md:text-3xl font-bold mb-6 text-white flex items-center justify-center gap-3">
              <span className="text-yellow-400">📁</span> {title}
            </h1>
          )}

          {/* Controls - only show when files exist */}
          {processedFiles.length > 0 && (
            <div className="flex justify-between items-center mb-6">
              <h2 className="md:text-lg font-medium text-white">
                {processedFiles.length} {processedFiles.length === 1 ? 'File' : 'Files'} Available
              </h2>
              <button
                onClick={() => setProcessedFiles([])}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1 rounded-md transition-all duration-300"
              >
                Clear All
              </button>
            </div>
          )}

          {/* File List */}
          {processedFiles.length > 0 && (
            <ul className="flex flex-col space-y-4">
              {processedFiles.map((file, index) => (
                <li
                  key={`${file.filename}-${index}`}
                  className="bg-gray-800/70 hover:bg-gray-700/70 border border-gray-600 hover:border-gray-500 rounded-lg p-4 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg shadow-md"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animationFillMode: 'both'
                  }}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4">
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-xs text-white">{file.filename}</span>
                    </div>
                    <button
                      onClick={() => handleDownload(file)}
                      className="w-full md:w-auto ml-0 md:ml-4 mt-3 md:mt-0 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md flex items-center justify-center transition-all duration-300"
                    >
                      <Download size={18} className="mr-2" /> Download
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Show message when no files */}
          {processedFiles.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No files available</p>
              <p className="text-gray-500 mt-2">Processed files will appear here</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}