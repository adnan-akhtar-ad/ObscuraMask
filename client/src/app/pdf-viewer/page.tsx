"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ChevronLeft, ChevronRight, FileText, Loader2, ZoomIn, ZoomOut, Download, RefreshCw } from "lucide-react";
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

import Footer from "@/components/footer";
import Header from "@/components/header";

// Dynamic imports for PDF components
const PDFDocument = dynamic(
  () => import('react-pdf').then(mod => mod.Document),
  { 
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center p-24">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
          <p className="text-gray-300 text-lg animate-pulse">Loading PDF viewer...</p>
        </div>
      </div>
    )
  }
);

const PDFPage = dynamic(
  () => import('react-pdf').then(mod => mod.Page),
  { ssr: false }
);

const PdfViewer = () => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfFiles, setPdfFiles] = useState<string[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [docLoading, setDocLoading] = useState(true);
  const [scale, setScale] = useState(1.0);
  const [error, setError] = useState<string | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  const searchParams = useSearchParams();

  // Load PDF files with better error handling
  useEffect(() => {
    const loadFiles = async () => {
      setIsLoading(true);
      setError(null);
      
      const filesParam = searchParams.get('files');
      if (!filesParam) {
        setIsLoading(false);
        return;
      }

      try {
        const files = JSON.parse(decodeURIComponent(filesParam));
        if (Array.isArray(files) && files.length > 0) {
          setPdfFiles(files);
          setCurrentFileIndex(0);
          
          // Prefetch first PDF as soon as we have the list
          if (files[0]) {
            prefetchPdf(files[0]);
          }
        } else {
          setError("No valid PDF files found in parameters");
        }
      } catch (error) {
        console.error('Error parsing files parameter:', error);
        setError("Failed to parse file parameters");
      } finally {
        setIsLoading(false);
        setTimeout(() => setViewerReady(true), 500); // Ensure viewer is ready after a short delay
      }
    };

    loadFiles();
  }, [searchParams]);

  // Prefetch PDF function for faster loading
  const prefetchPdf = useCallback((filename: string) => {
    const pdfUrl = `/${filename}`; // Update path to root level
    
    const prefetchRequest = new Request(pdfUrl, {
      method: 'GET',
      cache: 'force-cache',
      mode: 'cors',
      credentials: 'same-origin',
    });
    
    fetch(prefetchRequest)
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        // Store in browser cache but don't process further
        return response.blob();
      })
      .then(() => {
        console.log(`Prefetched: ${filename}`);
      })
      .catch(error => {
        console.warn(`Failed to prefetch ${filename}:`, error);
      });
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setDocLoading(false);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error("Error loading PDF:", error);
    setError(`Failed to load PDF: ${error.message}`);
    setDocLoading(false);
  }, []);

  // Get current PDF file path with better error handling
  const currentPdfPath = useMemo(() => {
    if (!pdfFiles[currentFileIndex]) return null;
    return `/${pdfFiles[currentFileIndex]}`;
  }, [pdfFiles, currentFileIndex]);

  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.2, 2.5));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  }, []);

  // Enhanced preloading logic for better performance
  useEffect(() => {
    if (pdfFiles.length <= 1) return;
    
    // Prefetch adjacent PDFs for faster navigation
    const preloadFiles = async () => {
      // Preload next file if it exists
      if (currentFileIndex < pdfFiles.length - 1) {
        prefetchPdf(pdfFiles[currentFileIndex + 1]);
      }
      
      // Preload previous file if it exists
      if (currentFileIndex > 0) {
        prefetchPdf(pdfFiles[currentFileIndex - 1]);
      }
    };
    
    preloadFiles();
  }, [currentFileIndex, pdfFiles, prefetchPdf]);

  // Handle PDF selection from dropdown
  const handlePdfSelection = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIndex = parseInt(e.target.value);
    if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < pdfFiles.length) {
      setDocLoading(true);
      setCurrentFileIndex(selectedIndex);
    }
  }, [pdfFiles.length]);

  // Download current PDF function
  const downloadCurrentPdf = useCallback(async () => {
    if (!currentPdfPath || !pdfFiles[currentFileIndex]) return;
    
    try {
      setDownloadProgress(0);
      
      const response = await fetch(currentPdfPath);
      if (!response.ok) throw new Error('Failed to download PDF');
      
      const contentLength = response.headers.get('Content-Length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to read response');
      
      let receivedBytes = 0;
      const chunks: Uint8Array[] = [];
      
      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        receivedBytes += value.length;
        
        if (totalBytes) {
          setDownloadProgress(Math.round((receivedBytes / totalBytes) * 100));
        }
      }
      
      // Combine chunks into a single Uint8Array
      const allChunks = new Uint8Array(receivedBytes);
      let position = 0;
      for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
      }
      
      // Create a blob and download
      const blob = new Blob([allChunks], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFiles[currentFileIndex];
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setDownloadProgress(null);
      }, 100);
      
    } catch (error) {
      console.error('Download failed:', error);
      setError(`Failed to download: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setDownloadProgress(null);
    }
  }, [currentPdfPath, pdfFiles, currentFileIndex]);

  // Reload current PDF (in case of loading issues)
  const reloadCurrentPdf = useCallback(() => {
    setDocLoading(true);
    setTimeout(() => {
      setDocLoading(false); // Force re-render of PDF component
    }, 100);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-900 to-black">
      <Header />
      <header className="mb-8 md:mb-6 text-center pt-4 md:pt-6"></header>
      <main className="flex-1 container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-6xl">
        {isLoading ? (
          <div className="flex justify-center items-center p-12 sm:p-24">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
              <p className="text-gray-300 text-lg animate-pulse">Loading document list...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center p-6 sm:p-12 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <p className="text-gray-300 text-lg">
                {error}
              </p>
              <p className="text-gray-400 mt-2">
                Please check the URL parameters or try again.
              </p>
              <button 
                onClick={reloadCurrentPdf}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg 
                          flex items-center gap-2 mx-auto hover:bg-blue-500 transition-colors"
              >
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
            </div>
          </div>
        ) : pdfFiles.length === 0 ? (
          <div className="flex justify-center items-center p-6 sm:p-12 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-500 mb-4" />
              <p className="text-gray-300 text-lg">
                No PDF files available to display.
              </p>
              <p className="text-gray-400 mt-2">
                Please check the URL parameters or try another selection.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* PDF selection dropdown and controls section */}
            <div className="mb-4 sm:mb-6 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg">
              <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
                {/* File Selection Section */}
                <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2">
                  <h2 className="text-gray-300 font-medium whitespace-nowrap text-sm sm:text-base">
                    Select File:
                  </h2>
                  <select 
                    value={currentFileIndex}
                    onChange={handlePdfSelection}
                    className="flex-1 bg-black/30 text-white border border-white/20 rounded-lg 
                             px-4 py-2 text-sm sm:text-base
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                             transition-all duration-200"
                  >
                    {pdfFiles.map((file, index) => (
                      <option key={index} value={index} className="bg-gray-900">
                        {file}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Controls Section */}
                <div className="flex flex-row items-center gap-3">
                  {/* Zoom Controls */}
                  <div className="flex items-center bg-black/30 rounded-lg border border-white/10">
                    <button
                      onClick={zoomOut}
                      className="px-3 py-2 rounded-l-lg hover:bg-white/10 transition-all duration-200
                               flex items-center gap-2 text-gray-300 hover:text-white"
                      title="Zoom out"
                    >
                      <ZoomOut className="h-4 w-4" />
                      <span className="hidden sm:inline text-sm">Zoom Out</span>
                    </button>
                    <span className="px-3 font-medium text-gray-300 border-x border-white/10 text-sm min-w-[60px] text-center">
                      {Math.round(scale * 100)}%
                    </span>
                    <button
                      onClick={zoomIn}
                      className="px-3 py-2 rounded-r-lg hover:bg-white/10 transition-all duration-200
                               flex items-center gap-2 text-gray-300 hover:text-white"
                      title="Zoom in"
                    >
                      <span className="hidden sm:inline text-sm">Zoom In</span>
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Download Button */}
                  <button
                    onClick={downloadCurrentPdf}
                    disabled={!!downloadProgress || !currentPdfPath}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg 
                             transition-all duration-200 flex items-center gap-2
                             disabled:opacity-50 disabled:cursor-not-allowed
                             text-white hover:shadow-lg"
                    title="Download PDF"
                  >
                    {downloadProgress !== null ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm whitespace-nowrap">{downloadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span className=" text-sm whitespace-nowrap">Download PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* PDF Viewer with continuous scroll */}
            <div className="overflow-hidden rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg mb-6 transform transition-all duration-300 hover:border-blue-500/30 hover:shadow-blue-500/10">
              <div className="h-full flex flex-col">
                <div className="flex-grow overflow-auto relative flex justify-center py-4 px-2 sm:px-4 bg-black/30 min-h-[300px] sm:min-h-[600px]">
                  {docLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 text-blue-500 animate-spin" />
                        <p className="text-gray-300 animate-pulse text-sm sm:text-base">Loading document...</p>
                      </div>
                    </div>
                  ) : viewerReady ? (
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 text-blue-500 animate-spin" />
                      </div>
                    }>
                      <div className="w-full max-w-full overflow-x-auto">
                        <PDFDocument 
                          file={currentPdfPath}
                          onLoadSuccess={onDocumentLoadSuccess}
                          onLoadError={onDocumentLoadError}
                          options={{
                            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/cmaps/',
                            cMapPacked: true,
                          }}
                        >
                          {Array.from(new Array(numPages), (_, index) => (
                            <div key={`page_${index + 1}`} className="mb-4 max-w-full">
                              <PDFPage 
                                pageNumber={index + 1} 
                                scale={scale} 
                                renderTextLayer={true}
                                renderAnnotationLayer={true}
                              />
                            </div>
                          ))}
                        </PDFDocument>
                      </div>
                    </Suspense>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 text-blue-500 animate-spin" />
                        <p className="text-gray-300 animate-pulse text-sm sm:text-base">Initializing viewer...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default PdfViewer;