"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Loader2, Table as TableIcon, ChevronLeft, ChevronRight, Download, Eye, EyeOff } from "lucide-react";
import { parse } from "papaparse";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { useSearchParams } from "next/navigation";
import Footer from "@/components/footer";
import Header from "@/components/header";

interface CsvData {
  headers: string[];
  rows: any[];
  filename: string;
  rawContent?: string;
}

// Chevron down icon component for the select input
function ChevronDown({ className }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}

export default function MultiFileCsvViewer() {
  const [csvDatasets, setCsvDatasets] = useState<CsvData[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [visibleColumnsCount, setVisibleColumnsCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const searchParams = useSearchParams();

  // Check if viewing on mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check on initial load
    checkIfMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    const loadCsvFiles = async () => {
      setLoading(true);
      const filesParam = searchParams.get("files");
      if (!filesParam) {
        setLoading(false);
        return;
      }

      try {
        const outputFiles: string[] = JSON.parse(
          decodeURIComponent(filesParam)
        );
        const datasets: CsvData[] = [];

        for (const filename of outputFiles) {
          const filePath = `/${filename}`;
          const response = await fetch(filePath);

          if (!response.ok) {
            console.error(
              `Failed to fetch ${filename}: ${response.statusText}`
            );
            continue;
          }

          const csvText = await response.text();
          const result = (await new Promise((resolve) => {
            parse(csvText, {
              header: true,
              skipEmptyLines: true,
              complete: resolve,
            });
          })) as any;

          datasets.push({
            headers: result.meta.fields || [],
            rows: result.data,
            filename: filename,
            rawContent: csvText,
          });
        }

        setCsvDatasets(datasets);

        if (datasets.length > 0) {
          // For mobile, initially show only the first few columns
          const initialHeaders = datasets[0].headers;
          const initialVisibility = initialHeaders.reduce(
            (acc, header, index) => {
              // On mobile, only show first 2 columns initially
              acc[header] = !isMobile || index < 2;
              return acc;
            },
            {} as Record<string, boolean>
          );
          
          setColumnVisibility(initialVisibility);
          setVisibleColumnsCount(isMobile ? 2 : initialHeaders.length);
        }
      } catch (error) {
        console.error("Error loading CSV files:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCsvFiles();
  }, [searchParams, isMobile]);

  const handleDownload = () => {
    if (csvDatasets.length <= selectedFileIndex) return;
    
    const dataset = csvDatasets[selectedFileIndex];
    const blob = new Blob([dataset.rawContent || ''], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = dataset.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleAllColumns = (value: boolean) => {
    if (csvDatasets.length <= selectedFileIndex) return;
    
    const newVisibility: Record<string, boolean> = {};
    const headers = csvDatasets[selectedFileIndex].headers;
    
    headers.forEach(header => {
      newVisibility[header] = value;
    });
    
    setColumnVisibility(newVisibility);
    setVisibleColumnsCount(value ? headers.length : 0);
  };

  const table = useReactTable({
    data: csvDatasets[selectedFileIndex]?.rows || [],
    columns: (csvDatasets[selectedFileIndex]?.headers || []).map((header) => ({
      accessorKey: header,
      header: header,
    })),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { 
      columnVisibility,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newState = updater({
          pageIndex,
          pageSize,
        });
        setPageIndex(newState.pageIndex);
        setPageSize(newState.pageSize);
      } else {
        setPageIndex(updater.pageIndex);
        setPageSize(updater.pageSize);
      }
    },
  });

  const memoizedTable = useMemo(() => table, [table]);

  useEffect(() => {
    if (table) {
      table.setPageSize(pageSize);
    }
  }, [pageSize, table]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />

        <div className="flex-1 flex justify-center items-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            <p className="text-gray-300 text-lg animate-pulse">Loading CSV data...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-900 to-black">
      <Header />
      <header className="mb-8 md:mb-8 text-center pt-4 md:pt-8"></header>

      <main className="flex-1 container mx-auto px-3 md:px-4 py-4 md:py-8 max-w-6xl">
        {csvDatasets.length === 0 ? (
          <div className="flex justify-center items-center p-6 md:p-12 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
            <div className="text-center">
              <TableIcon className="mx-auto h-10 w-10 md:h-12 md:w-12 text-gray-500 mb-4" />
              <p className="text-gray-300 text-base md:text-lg">
                No modified files available to display.
              </p>
              <p className="text-gray-400 mt-2 text-sm md:text-base">
                Please check the URL parameters or try another selection.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 md:mb-8 p-4 md:p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg transform transition-all duration-300 hover:border-blue-500/30 hover:shadow-blue-500/10">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2">
                  <label className="text-gray-300 font-medium text-sm md:text-base whitespace-nowrap">Select File:</label>
                  <div className="relative flex-1">
                    <select
                      value={selectedFileIndex}
                      onChange={(e) => {
                        const newIndex = Number(e.target.value);
                        setSelectedFileIndex(newIndex);
                        setPageIndex(0); // Reset to first page when changing files
                        
                        // Reset column visibility for new file
                        const headers = csvDatasets[newIndex].headers;
                        const newVisibility = headers.reduce(
                          (acc, header, index) => {
                            // On mobile, only show first 2 columns initially
                            acc[header] = !isMobile || index < 2;
                            return acc;
                          },
                          {} as Record<string, boolean>
                        );
                        
                        setColumnVisibility(newVisibility);
                        setVisibleColumnsCount(isMobile ? 2 : headers.length);
                      }}
                      className="w-full px-3 py-2 md:px-4 md:py-3 rounded-lg text-gray-100 bg-black/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70 transition-all duration-200 appearance-none text-sm md:text-base">
                      {csvDatasets.map((dataset, index) => (
                        <option key={index} value={index} className="bg-gray-800">
                          {dataset.filename}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                  <button
                    onClick={handleDownload}
                    className="px-3 py-2 md:px-4 md:py-2 rounded-lg bg-green-600 text-white text-sm md:text-base font-medium flex items-center gap-1 md:gap-2 hover:bg-green-500 transition-all duration-300 transform hover:scale-105">
                    <Download className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="whitespace-nowrap">Download CSV</span>
                  </button>
                  
                  {isMobile && (
                    <>
                      <button
                        onClick={() => toggleAllColumns(true)}
                        className="px-3 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium flex items-center gap-1 hover:bg-purple-500 transition-all duration-300 transform hover:scale-105">
                        <Eye className="h-4 w-4" />
                        <span>Show All</span>
                      </button>
                      <button
                        onClick={() => toggleAllColumns(false)}
                        className="px-3 py-2 rounded-lg bg-gray-600 text-white text-sm font-medium flex items-center gap-1 hover:bg-gray-500 transition-all duration-300 transform hover:scale-105">
                        <EyeOff className="h-4 w-4" />
                        <span>Hide All</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {isMobile && csvDatasets[selectedFileIndex]?.headers?.length > 0 && (
                <div className="mt-4 border-t border-white/10 pt-3">
                  <p className="text-gray-300 text-sm mb-2">Visible columns ({visibleColumnsCount}/{csvDatasets[selectedFileIndex].headers.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {csvDatasets[selectedFileIndex].headers.map((header, index) => (
                      <button
                        key={header}
                        onClick={() => {
                          const newVisibility = {
                            ...columnVisibility,
                            [header]: !columnVisibility[header]
                          };
                          setColumnVisibility(newVisibility);
                          setVisibleColumnsCount(
                            Object.values(newVisibility).filter(Boolean).length
                          );
                        }}
                        className={`px-2 py-1 text-xs rounded-md transition-colors duration-200 ${
                          columnVisibility[header]
                            ? "bg-blue-600 text-white"
                            : "bg-gray-700 text-gray-300"
                        }`}
                      >
                        {header.length > 12 ? header.substring(0, 10) + "..." : header}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg mb-4 md:mb-8 transform transition-all duration-300 hover:border-blue-500/30 hover:shadow-blue-500/10">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    {memoizedTable.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="px-3 py-3 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-200 border-b border-white/10 bg-black/30 backdrop-blur-sm whitespace-nowrap">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {memoizedTable.getRowModel().rows.map((row, i) => (
                      <tr 
                        key={row.id} 
                        className="transition-colors duration-200 hover:bg-white/10 group"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-3 py-2 md:px-6 md:py-4 text-xs md:text-sm text-gray-300 border-b border-white/5 transition-colors duration-200 group-hover:text-white">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center p-4 md:p-5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg transform transition-all duration-300 hover:border-blue-500/30 hover:shadow-blue-500/10 gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 md:px-3 md:py-2 rounded-lg text-gray-100 bg-black/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70 transition-all duration-200 appearance-none text-xs md:text-sm"
                >
                  {[5, 10, 20, 50].map((size) => (
                    <option key={size} value={size} className="bg-gray-800">
                      {size} rows
                    </option>
                  ))}
                </select>
                
                <span className="text-gray-300 text-xs md:text-sm hidden md:inline-block">
                  Showing {table.getRowModel().rows.length} of {csvDatasets[selectedFileIndex]?.rows.length || 0} rows
                </span>
              </div>
              
              <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
                <button
                  className="px-3 py-1 md:px-4 md:py-2 rounded-lg bg-blue-600 text-white text-xs md:text-sm font-medium flex items-center gap-1 md:gap-2 hover:bg-blue-500 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-blue-600"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}>
                  <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                  Prev
                </button>
                
                <span className="text-gray-300 text-xs md:text-sm font-medium whitespace-nowrap px-2">
                  {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </span>
                
                <button
                  className="px-3 py-1 md:px-4 md:py-2 rounded-lg bg-blue-600 text-white text-xs md:text-sm font-medium flex items-center gap-1 md:gap-2 hover:bg-blue-500 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-blue-600"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}>
                  Next
                  <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </main>
      
      <Footer />
    </div>
  );
}