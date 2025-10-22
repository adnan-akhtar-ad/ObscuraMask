"use client";
import React, { useState, useEffect } from "react";
import { useDropzone, type DropzoneOptions } from "react-dropzone";
import {
  Upload,
  Check,
  X,
  Loader2,
  Lock,
  Unlock,
  BarChart3,
  Eye,
  EyeOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Footer from "@/components/footer";
import Header from "@/components/header";

// Define processing modes
type ProcessingMode = "obfuscate" | "encrypt" | "decrypt";

interface HeaderControl {
  visible: boolean;
  mode: "mask" | "obfuscate" | null;
  prompt: string;
}

const API_BASE_URL = "http://localhost:5000";

// Unified API caller: detects FormData vs JSON
const callApi = async (
  endpoint: string,
  data: any,
  isForm: boolean = false
) => {
  try {
    console.log(`Calling ${endpoint} with data:`, data);
    const options: RequestInit = {
      method: "POST",
    };

    // If it's a form data, set output path based on file type
    if (isForm && data instanceof FormData) {
      const file = data.get('file') as File;
      const ext = file?.name.split('.').pop()?.toLowerCase();
      
      // Use relative path for output directory
      const outputPath = './public/output';
      data.append('outputPath', outputPath);
    }

    if (isForm) {
      options.body = data;
    } else {
      options.headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    console.log(`Response from ${endpoint}:`, result);
    return result;
  } catch (error) {
    console.error(`API call failed to ${endpoint}:`, error);
    throw error;
  }
};


export default function HeaderControl() {
  const [files, setFiles] = useState<File[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(-1);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [backendColumns, setBackendColumns] = useState<Record<number, string[]>>({});
  const [headerControls, setHeaderControls] = useState<Record<number, Record<string, HeaderControl>>>({});
  const [submitResponse, setSubmitResponse] = useState<string | null>(null);
  const [outputPath, setOutputPath] = useState<string>("");
  const [processingQueue, setProcessingQueue] = useState<number[]>([]);
  const [activeMode, setActiveMode] = useState<ProcessingMode>("obfuscate");
  const [encryptionKeys, setEncryptionKeys] = useState<Record<number, string>>({});
  const [showKeys, setShowKeys] = useState<Record<number, boolean>>({});
  const [processedFiles, setProcessedFiles] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const processNextFileInQueue = async () => {
      if (processingQueue.length > 0 && !isUploading && activeMode === "obfuscate") {
        const fileIndex = processingQueue[0];
        setIsUploading(true);
        await processFile(files[fileIndex], fileIndex);
        setProcessingQueue((prev) => prev.slice(1));
      }
    };
    processNextFileInQueue();
  }, [processingQueue, isUploading, files, activeMode]);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const startIdx = files.length;
    setFiles((prev) => [...prev, ...acceptedFiles]);

    if (activeFileIndex === -1) {
      setActiveFileIndex(startIdx);
    }

    // Only add to processing queue if in obfuscate mode
    if (activeMode === "obfuscate") {
      const newIndices = Array.from(
        { length: acceptedFiles.length },
        (_, i) => startIdx + i
      );
      setProcessingQueue((prev) => [...prev, ...newIndices]);
    }
  };

  const processFile = async (file: File, fileIndex: number) => {
    if (!file || activeMode !== "obfuscate") {
      setIsUploading(false);
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    let endpoint = "";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("outputPath", outputPath);

    // Determine endpoint based on file type
    if (ext === "csv") {
      endpoint = "/getcsvheader";
    } else if (ext === "pdf") {
      endpoint = "/getpdfheader";
    } else if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext!)) {
      endpoint = "/getimageentities";
    } else if (["mp3", "wav"].includes(ext!)) {
      endpoint = "/getaudio";
    } else {
      console.error("Unsupported file type");
      setIsUploading(false);
      return;
    }

    try {
      const result = await callApi(endpoint, formData, true);

      if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext!)) {
        setBackendColumns((prev) => ({
          ...prev,
          [fileIndex]: result.entities || [],
        }));

        const initialControls: Record<string, HeaderControl> = (
          result.entities || []
        ).reduce((acc: any, entity: string) => {
          acc[entity] = { visible: true, mode: "mask", prompt: "" };
          return acc;
        }, {});

        setHeaderControls((prev) => ({
          ...prev,
          [fileIndex]: initialControls,
        }));
      } else {
        const headers: string[] = result.headers.slice(1);
        setBackendColumns((prev) => ({ ...prev, [fileIndex]: headers }));

        const initialControls: Record<string, HeaderControl> = headers.reduce(
          (acc, col) => {
            acc[col] = { visible: true, mode: null, prompt: "" };
            return acc;
          },
          {} as Record<string, HeaderControl>
        );

        setHeaderControls((prev) => ({
          ...prev,
          [fileIndex]: initialControls,
        }));
      }
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
    } finally {
      setIsUploading(false);
    }
  };

  const dropzoneOptions: DropzoneOptions = { onDrop, multiple: true };
  const { getRootProps, getInputProps, isDragActive } =
    useDropzone(dropzoneOptions);

  const toggleColumnVisibility = (columnId: string) => {
    if (activeFileIndex === -1) return;
    setHeaderControls((prev) => ({
      ...prev,
      [activeFileIndex]: {
        ...prev[activeFileIndex],
        [columnId]: {
          ...prev[activeFileIndex][columnId],
          visible: !prev[activeFileIndex][columnId].visible,
        },
      },
    }));
  };

  const setMode = (columnId: string, mode: "mask" | "obfuscate" | null) => {
    if (activeFileIndex === -1) return;
    setHeaderControls((prev) => ({
      ...prev,
      [activeFileIndex]: {
        ...prev[activeFileIndex],
        [columnId]: {
          ...prev[activeFileIndex][columnId],
          mode,
        },
      },
    }));
  };

  const setPrompt = (columnId: string, prompt: string) => {
    if (activeFileIndex === -1) return;
    setHeaderControls((prev) => ({
      ...prev,
      [activeFileIndex]: {
        ...prev[activeFileIndex],
        [columnId]: {
          ...prev[activeFileIndex][columnId],
          prompt,
        },
      },
    }));
  };

  const switchActiveFile = (index: number) => {
    setActiveFileIndex(index);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let outputFilesList: any[] = [];

      for (const [index, file] of files.entries()) {
        const form = new FormData();
        form.append("file", file);
        form.append("outputPath", outputPath);

        let endpoint = "";
        if (activeMode === "encrypt" || activeMode === "decrypt") {
          endpoint = activeMode === "encrypt" ? "/encryptfile" : "/decryptfile";
          const headers = [{
            name: file.name,
            mode: activeMode,
            key: encryptionKeys[index]
          }];
          form.append("headers", JSON.stringify(headers));
        } else {
          const ext = file.name.split(".").pop()?.toLowerCase();
          endpoint = ext === "csv" ? "/maskobfcsv" :
            ext === "pdf" ? "/maskobfpdf" : "/redactimage";

          const controls = headerControls[index] || {};
          const selected = Object.entries(controls)
            .filter(([, c]) => c.visible)
            .map(([key, c]) => ({ name: key, mode: c.mode, prompt: c.prompt }));

          form.append("headers", JSON.stringify(selected));
        }

        const response = await callApi(endpoint, form, true);
        console.log("Response from API:", response);
        
        // Handle the response based on the mode
        if (activeMode === "encrypt" || activeMode === "decrypt") {
          // Extract the file information from the response
          const IsfileInfo = response.files && response.files[0];
          if (IsfileInfo) {
            const fileInfo = response.files[0];
            outputFilesList.push({
              path:(activeMode==='encrypt') ? fileInfo.encryptedPath : fileInfo.decryptedPath   || "",
              filename: fileInfo.filename || file.name,
              status: fileInfo.status || "success",
              length: fileInfo.length || 1,
              mode: activeMode
            });
          }
        } 
        else if (response.filename) {
          outputFilesList.push(response.filename);
        }
      }

      console.log("Output files list:", outputFilesList);
      setProcessedFiles(outputFilesList);
      setSubmitResponse(JSON.stringify(outputFilesList, null, 2));

      // Determine output route based on file type and mode
      let outputRoute = "";
      if (activeMode === "encrypt" || activeMode === "decrypt") {
        outputRoute = "/ase-viewer";
      } else {
        // For obfuscate mode, check file type of first file
        const firstFileExt = files[0]?.name.split(".").pop()?.toLowerCase();
        outputRoute = firstFileExt === "pdf" ? "/pdf-viewer" : "/csv-viewer";
      }

      // Navigate to the appropriate viewer with the processed files
      router.push(`${outputRoute}?files=${encodeURIComponent(JSON.stringify(outputFilesList))}`);
    } catch (error) {
      console.error("Processing error:", error);
      setSubmitResponse("Error processing files");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isProcessing = isUploading || processingQueue.length > 0;

  // Get the appropriate icon based on active mode
  const getModeIcon = (mode: ProcessingMode) => {
    switch (mode) {
      case "obfuscate":
        return <BarChart3 className="w-6 h-6" />;
      case "encrypt":
        return <Lock className="w-6 h-6" />;
      case "decrypt":
        return <Unlock className="w-6 h-6" />;
    }
  };

  // Add this function after all state declarations
  const resetAllStates = () => {
    setFiles([]);
    setActiveFileIndex(-1);
    setIsUploading(false);
    setIsSubmitting(false);
    setBackendColumns({});
    setHeaderControls({});
    setSubmitResponse(null);
    setOutputPath("");
    setProcessingQueue([]);
    setEncryptionKeys({});
    setShowKeys({});
    setProcessedFiles([]);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-b from-blue-50 via-white to-blue-50">
        {/* Header */}
        <Header />
        {/* Update container class for better responsiveness */}
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 w-full md:max-w-6xl">
          <header className="mb-8 md:mb-12 text-center pt-6 md:pt-10"></header>
          <div className="mb-6 md:mb-8 flex justify-center">
            <div className="bg-white rounded-lg p-2 flex flex-col sm:flex-row gap-2 sm:gap-3 shadow-lg border border-gray-100 w-full sm:w-auto">
              {(["obfuscate", "encrypt", "decrypt"] as ProcessingMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    // Clear all states when mode changes
                    if (activeMode !== mode) {
                      resetAllStates();
                      setActiveMode(mode);
                    }
                  }}
                  className={`
      px-4 sm:px-8 py-3 sm:py-4 rounded-lg flex items-center justify-center
      min-w-[120px] sm:min-w-[160px] 
      transition-all duration-200 ease-in-out
      ${activeMode === mode
                      ? "bg-blue-600 text-white shadow-md transform scale-105"
                      : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                    }
    `}
                >
                  <span className="mr-2 sm:mr-3">{getModeIcon(mode)}</span>
                  <span className="capitalize font-medium text-base sm:text-lg">{mode}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mode Instructions - Make responsive */}
          <div className="mb-6 bg-gray-800 rounded-lg p-4 text-center">
            {activeMode === "obfuscate" && (
              <div className="space-y-3">
                <p className="text-blue-100 text-sm sm:text-base" >
                  Upload files to detect and mask/obfuscate sensitive information
                </p>
              </div>
            )}
            {activeMode === "encrypt" && (
              <div className=" bg-gray-800 rounded-lg text-center">
                <p className="text-blue-100 text-sm sm:text-base">
                  Upload files to encrypt them using a secure key
                </p>
              </div>
            )}
            {activeMode === "decrypt" && (
              <div className="bg-gray-800 rounded-lg text-center">
                <p className="text-blue-100 text-sm sm:text-base">
                  Upload encrypted files to decrypt them using your key
                </p>
              </div>
            )}
          </div>


          <div
            {...getRootProps()}
            className={`
              border-2 sm:border-3 border-dashed rounded-xl sm:rounded-2xl 
              p-6 sm:p-12 mb-6 sm:mb-8 text-center cursor-pointer
              transition-all duration-300 transform hover:scale-[1.02]
              ${isDragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-blue-400 hover:bg-blue-50"
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6">
              {isProcessing ? (
                <>
                  <Loader2 className="w-12 h-12 sm:w-20 sm:h-20 text-blue-600 animate-spin" />
                  <p className="text-xl sm:text-2xl font-medium text-gray-700">Processing...</p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 sm:w-20 sm:h-20 text-blue-500" />
                  <div className="space-y-2 sm:space-y-3">
                    <p className="text-lg sm:text-2xl font-medium text-gray-700">
                      {isDragActive ? "Drop files here..." : "Drag & drop files here upto n files"}
                    </p>
                    <p className="text-sm sm:text-base text-gray-500">
                      or click to browse
                    </p>
                    <p className="text-xs sm:text-sm text-gray-400 mt-4 sm:mt-6">
                      Supported formats: CSV, PDF, JPG, PNG, GIF
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {files.length > 0 && (
            <div className="mb-6 overflow-x-auto">
              <div className="flex flex-wrap gap-2 mb-4">
                {files.map((file, index) => {
                  const isProcessed = backendColumns[index] !== undefined;
                  const isProcessing = processingQueue.includes(index);
                  return (
                    <button
                      key={index}
                      onClick={() => (isProcessed ? switchActiveFile(index) : null)}
                      className={`px-3 py-1 rounded-md text-sm flex items-center ${activeFileIndex === index
                        ? "bg-blue-600 text-gray-100"
                        : isProcessed
                          ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          : "bg-gray-800 text-gray-400 cursor-default"
                        }`}
                      disabled={!isProcessed}>
                      {isProcessing && (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      )}
                      {file.name}
                      {isProcessed && (
                        <Check className="w-3 h-3 ml-1 text-green-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {isProcessing && (
                <div className="text-sm text-blue-400 mb-2">
                  <Loader2 className="w-4 h-4 mr-1 inline animate-spin" />
                  Processing files... ({processingQueue.length} remaining)
                </div>
              )}

              <button
                onClick={() => {
                  setFiles([]);
                  setBackendColumns({});
                  setHeaderControls({});
                  setActiveFileIndex(-1);
                  setProcessingQueue([]);
                  setSubmitResponse(null);
                  setProcessedFiles([]);
                }}
                className="text-sm text-red-500 hover:text-red-400">
                Clear All Files
              </button>
            </div>
          )}

          {activeMode === "obfuscate" && activeFileIndex !== -1 && backendColumns[activeFileIndex]?.length > 0 && (
            <div className="space-y-4 overflow-x-auto bg-gray-800 rounded-md p-4">
              <div className="min-w-full overflow-hidden rounded-xl shadow-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold ">
                        Check
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold ">
                        Header
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold ">
                        Mode
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold ">
                        Prompt
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {backendColumns[activeFileIndex].map((column) => {
                      const control = headerControls[activeFileIndex]?.[
                        column
                      ] || {
                        visible: true,
                        mode: null,
                        prompt: "",
                      };
                      return (
                        <tr
                          key={column}
                          className={control.visible ? "" : "opacity-50"}>
                          <td className="px-4 py-2 text-sm text-gray-300">
                            <button
                              onClick={() => toggleColumnVisibility(column)}
                              className="p-1 rounded-full hover:bg-gray-700"
                              aria-label={
                                control.visible ? "Hide column" : "Show column"
                              }>
                              {control.visible ? (
                                <Check className="w-5 h-5 text-green-400" />
                              ) : (
                                <X className="w-5 h-5 text-red-400" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-300">
                            {column.replace(/^\d+\.\s/, "")}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-300">
                            <div className="flex items-center space-x-4">
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  checked={control.mode === "mask"}
                                  onChange={() => setMode(column, "mask")}
                                  className="form-radio h-4 w-4 text-blue-600 bg-gray-700 border-gray-600"
                                />
                                <span className="ml-2 text-gray-300">Mask</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  checked={control.mode === "obfuscate"}
                                  onChange={() => setMode(column, "obfuscate")}
                                  className="form-radio h-4 w-4 text-blue-600 bg-gray-700 border-gray-600"
                                />
                                <span className="ml-2 text-gray-300">
                                  Obfuscate
                                </span>
                              </label>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-300">
                            <input
                              type="text"
                              value={control.prompt}
                              onChange={(e) => setPrompt(column, e.target.value)}
                              placeholder="Enter prompt"
                              className="w-full px-2 py-1 text-sm border rounded text-gray-100 bg-gray-700 border-gray-600"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Encryption/Decryption Controls */}
          {(activeMode === "encrypt" || activeMode === "decrypt") && activeFileIndex !== -1 && (
            <div className="space-y-4 overflow-x-auto bg-gray-800 rounded-md p-4 mt-6">
              <div className="min-w-full overflow-hidden rounded-xl shadow-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold">
                        S.NO
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold">
                        File Name
                      </th>
                      <th className="hidden md:inline px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold">
                        Mode
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold">
                        Encryption Key
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {files.map((file, index) => (
                      <tr key={index}>
                        <td className="px-4 md:px-8  py-2 text-sm text-gray-300">
                          {index + 1}
                        </td>
                        <td className="px-4 py-2 text-[12px] md:text-sm text-gray-300">
                          {file.name}
                        </td>
                        <td className="hidden md:inline px-4 py-2 text-sm text-gray-300">
                          {activeMode === "encrypt" ? "Encrypt" : "Decrypt"}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-300">
                          <div className="relative flex items-center">
                            <input
                              type={showKeys[index] ? "text" : "password"}
                              value={encryptionKeys[index] || ""}
                              onChange={(e) =>
                                setEncryptionKeys((prev) => ({
                                  ...prev,
                                  [index]: e.target.value,
                                }))
                              }
                              placeholder="Enter encryption key"
                              className="w-full px-2 py-1 text-sm border rounded text-gray-100 bg-gray-700 border-gray-600 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowKeys(prev => ({
                                ...prev,
                                [index]: !prev[index]
                              }))}
                              className="absolute right-2 p-1 text-gray-400 hover:text-gray-300 focus:outline-none"
                            >
                              {showKeys[index] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Submit Button - Make responsive */}
          <div className="flex justify-end mt-6">
            <button
              onClick={handleSubmit}
              // disabled={
              //   isSubmitting ||
              //   files.length === 0 ||
              //   !outputPath.trim() ||
              //   ((activeMode === "encrypt" || activeMode === "decrypt") && 
              //     files.some((_, index) => !encryptionKeys[index]))
              // }
              className={`
                w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-medium
                text-base sm:text-lg transition-all duration-200
                flex items-center justify-center min-w-[160px] sm:min-w-[200px]
                ${isSubmitting || files.length === 0
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg"
                }
              `}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {activeMode === "obfuscate" && "Process Files"}
                  {activeMode === "encrypt" && "Encrypt Files"}
                  {activeMode === "decrypt" && "Decrypt Files"}
                </>
              )}
            </button>
          </div>

          {/* Results Section - Make responsive */}
          {submitResponse && (
            <div className="mt-6 bg-gray-800 rounded-lg p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-200">
                Processing Results:
              </h3>
              <pre className="p-3 sm:p-4 rounded text-xs sm:text-sm overflow-x-auto text-gray-300 bg-gray-700">
                {submitResponse}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}