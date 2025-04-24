import React, { useState, useEffect } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { downloadDir } from "@tauri-apps/api/path";
import "./App.css";

// ErrorBoundary component for catching render errors
class ErrorBoundary extends React.Component<any, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    // Log error to console
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'red', padding: 24 }}>
          <h2>Something went wrong in the UI.</h2>
          <pre>{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => {
  const [metadataPath, setMetadataPath] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleSelectMetadata = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Metadata",
          extensions: [
            "json",
            "sql",
            "vql",
            "ddl",
            "dbml",
            "csv",
            "tsv",
            "txt"
          ]
        }
      ],
    });
    if (typeof selected === "string") {
      setMetadataPath(selected);
      setStatus(`Selected metadata: ${selected}`);
      setError(null); // Clear any previous errors
    }
  };

  const handleGenerateFlow = async () => {
    if (!metadataPath) {
      setStatus("Please select a metadata file first.");
      return;
    }
    setStatus("Generating flow diagram... (Starting Python sidecar)");
    setError(null);
    setIframeUrl(null);
    setHtmlContent(null);
    try {
      const result = await invoke<any>("generate_flow", {
        metadata_path: metadataPath,
      });

      console.log('Received result from backend:', result);

      // Check if we got a successful response or error
      if (result.success === false) {
        setError(result.error || "Unknown error occurred");
        setStatus("Error generating flow diagram. See error details.");
        return;
      }

      const htmlPath = result.html_path as string;
      console.log('Received HTML path from backend:', htmlPath);

      // Read the HTML content
      const content = await readTextFile(htmlPath);
      setHtmlContent(content);
      console.log('Read HTML content.');

      const url = convertFileSrc(htmlPath);
      console.log('Generated iframe URL:', url);
      setIframeUrl(url);
      setStatus(`Generated HTML at: ${htmlPath}. Displaying preview...`);
    } catch (e: any) {
      console.error('Error generating flow or reading file:', e);
      setError(e?.message || String(e));
      setStatus("Error generating flow diagram or reading output. See error details.");
      setIframeUrl(null);
      setHtmlContent(null);
    }
  };

  // Function to handle download
  const handleDownloadHtml = async () => {
    if (!htmlContent) {
      setStatus("No HTML content available to download.");
      return;
    }

    try {
      setStatus("Preparing download...");
      const defaultPath = await downloadDir();
      const filePath = await save({
        title: "Save DataFlow HTML",
        defaultPath: `${defaultPath}/dataflow_diagram.html`,
        filters: [
          {
            name: "HTML Files",
            extensions: ["html"],
          },
        ],
      });

      if (filePath) {
        // Use writeTextFile to save the content
        // Note: The `save` dialog itself doesn't write the file content directly in newer tauri-plugin-dialog versions.
        // We need to write it manually using the chosen path.
        await writeTextFile(filePath, htmlContent);
        setStatus(`HTML saved to: ${filePath}`);
      } else {
        setStatus("Download cancelled.");
      }
    } catch (e: any) {
      console.error("Error saving file:", e);
      setError(e?.message || String(e));
      setStatus("Error saving HTML file. See error details.");
    }
  };

  useEffect(() => {
    document.documentElement.style.setProperty("--titlebar-height", "0");
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.removeProperty("--titlebar-height");
      document.body.style.overflow = "";
    };
  }, []);

  // Debugging: log state changes
  useEffect(() => {
    console.log('metadataPath:', metadataPath);
  }, [metadataPath]);
  useEffect(() => {
    console.log('status:', status);
  }, [status]);
  useEffect(() => {
    console.log('error:', error);
  }, [error]);
  useEffect(() => {
    console.log('iframeUrl:', iframeUrl);
  }, [iframeUrl]);
  useEffect(() => {
    console.log('htmlContent:', htmlContent);
  }, [htmlContent]);

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-white text-gray-800 overflow-hidden">
        <div className="flex flex-grow overflow-hidden">
          <aside className="flex flex-col w-72 min-w-[18rem] h-full bg-gray-50 border-r border-gray-200 overflow-hidden">
            <div className="flex items-center py-4 px-4 justify-between">
              <h1 className="text-base font-medium text-indigo-600">DataFlow</h1>
            </div>
            <div className="flex-grow overflow-y-auto px-4 py-2 space-y-6">
              <section className="space-y-3">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="h-3 w-3 rounded-full bg-indigo-500"></div>
                  <h2 className="text-sm font-medium text-gray-700">Generate Flow Diagram</h2>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={handleSelectMetadata}
                    className="w-full bg-gray-200 text-gray-700 p-2 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
                  >
                    {metadataPath ? "Change Metadata File" : "Select Metadata File"}
                  </button>
                  {metadataPath && (
                    <div className="text-xs text-gray-500 break-all">
                      {metadataPath}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleGenerateFlow}
                  className="w-full bg-indigo-500 text-white p-2 rounded-md text-sm font-medium hover:bg-indigo-600 transition-colors flex items-center justify-center"
                >
                  <svg className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Generate
                </button>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-gray-500">Status</label>
                  </div>
                  <pre className="p-2 bg-gray-50 border border-gray-200 rounded-md text-xs h-20 overflow-auto font-mono text-gray-700">
                    {status}
                  </pre>
                </div>

                {error && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-medium text-red-500">Error Details</label>
                    </div>
                    <pre className="p-2 bg-red-50 border border-red-200 rounded-md text-xs h-32 overflow-auto font-mono text-red-700">
                      {error}
                    </pre>
                  </div>
                )}
              </section>
            </div>
          </aside>
          <section className="flex-grow flex flex-col bg-white h-full">
            <div className="flex items-center justify-between py-3 px-6 border-b border-gray-200 bg-gray-50">
              <h2 className="text-sm font-medium text-gray-700">HTML Preview</h2>
              <div className="flex items-center space-x-3">
                {iframeUrl && htmlContent && (
                  <button
                    onClick={handleDownloadHtml}
                    title="Download HTML"
                    className="p-1 rounded hover:bg-gray-200 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                )}
                <div className="flex space-x-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400"></div>
                  <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                  <div className="h-3 w-3 rounded-full bg-green-400"></div>
                </div>
              </div>
            </div>
            <div className="flex-grow bg-white relative">
              {iframeUrl ? (
                <iframe
                  src={iframeUrl}
                  className="w-full h-full border-none"
                  title="DataFlow Preview"
                ></iframe>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  {error ? "An error occurred. See error details." : "No preview available. Generate a flow diagram first."}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;
