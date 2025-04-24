import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import "./App.css";

const App: React.FC = () => {
  const [metadataPath, setMetadataPath] = useState<string | null>(null);
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

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
    }
  };

  const handleGenerateFlow = async () => {
    if (!metadataPath) {
      setStatus("Please select a metadata file first.");
      return;
    }
    setStatus("Generating flow diagram... (Starting Python sidecar)");
    try {
      const htmlPath = await invoke<string>("generate_flow", {
        metadataPath,
      });
      console.log('Received HTML path from backend:', htmlPath);
      setOutputPath(htmlPath);
      const url = convertFileSrc(htmlPath as string);
      console.log('Generated iframe URL:', url);
      setIframeUrl(url);
      setStatus(`Generated HTML at: ${htmlPath}. Displaying preview...`);
    } catch (e: any) {
      console.error('Error generating flow:', e);
      setStatus("Error: " + (e?.message || String(e)));
      // Reset iframe if we had an error
      setIframeUrl(null);
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

  return (
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
            </section>
          </div>
        </aside>
        <section className="flex-grow flex flex-col bg-white h-full">
          <div className="flex items-center justify-between py-3 px-6 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-medium text-gray-700">HTML Preview</h2>
            <div className="flex space-x-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400"></div>
              <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
              <div className="h-3 w-3 rounded-full bg-green-400"></div>
            </div>
          </div>
          <div className="flex-grow bg-white relative">
            <iframe
              src={iframeUrl || ""}
              className="w-full h-full border-none"
              title="DataFlow Preview"
            ></iframe>
          </div>
        </section>
      </div>
    </div>
  );
};

export default App;
