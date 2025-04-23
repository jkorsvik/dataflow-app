import React, { useState, ChangeEvent, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import "./App.css";

const App: React.FC = () => {
  const [scriptName, setScriptName] = useState<string>("");
  const [scriptArgs, setScriptArgs] = useState<string>("");
  const [pythonOutput, setPythonOutput] = useState<string>("");
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const runScript = async () => {
    try {
      const argsArray = scriptArgs
        .split(",")
        .map((arg: string) => arg.trim())
        .filter((arg) => arg.length > 0);
      const result = await invoke<string>("run_python", {
        script: scriptName,
        args: argsArray,
      });
      setPythonOutput(result);
      setHtmlContent(result);
    } catch (error) {
      setPythonOutput((error as Error).message);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setHtmlContent(reader.result as string);
      };
      reader.readAsText(file, "UTF-8");
    }
  };

  const downloadHtml = async () => {
    try {
      const filePath = await save({
        filters: [{ name: 'HTML', extensions: ['html'] }],
        defaultPath: 'preview.html',
      });
      if (filePath) {
        await writeTextFile(filePath, htmlContent);
        alert('File saved successfully to: ' + filePath);
      }
    } catch (e) {
      alert('Error saving file: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  useEffect(() => {
    // Apply custom styles to make the app frameless
    document.documentElement.style.setProperty('--titlebar-height', '0');
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.documentElement.style.removeProperty('--titlebar-height');
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white text-gray-800 overflow-hidden">
      {/* Content area with sidebar and preview */}
      <div className="flex flex-grow overflow-hidden">
        {/* Collapsible Sidebar */}
        <aside 
          className={`flex flex-col transition-all duration-300 ease-in-out ${
            sidebarCollapsed 
              ? 'w-12 min-w-[3rem]' 
              : 'w-72 min-w-[18rem]'
          } h-full bg-gray-50 border-r border-gray-200 overflow-hidden`}
        >
          {/* Sidebar Header */}
          <div className={`flex items-center py-4 px-4 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!sidebarCollapsed && (
              <h1 className="text-base font-medium text-indigo-600">DataFlow</h1>
            )}
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="rounded-full p-1 hover:bg-gray-200 text-gray-500 transition-colors"
            >
              {sidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="13 17 18 12 13 7"></polyline>
                  <polyline points="6 17 11 12 6 7"></polyline>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              )}
            </button>
          </div>

          {/* Sidebar Content - only shown when expanded */}
          <div className={`flex-grow overflow-y-auto px-4 py-2 space-y-6 ${sidebarCollapsed ? 'hidden' : 'block'}`}>
            {/* Run Python Section */}
            <section className="space-y-3">
              <div className="flex items-center space-x-2 mb-3">
                <div className="h-3 w-3 rounded-full bg-indigo-500"></div>
                <h2 className="text-sm font-medium text-gray-700">Run Python</h2>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="script-path" className="block text-xs font-medium text-gray-500">
                  Script Path
                </label>
                <input
                  id="script-path"
                  className="w-full p-2 bg-white border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 focus:outline-none"
                  placeholder="Enter script path..."
                  value={scriptName}
                  onChange={(e) => setScriptName(e.currentTarget.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="script-args" className="block text-xs font-medium text-gray-500">
                  Arguments (comma separated)
                </label>
                <input
                  id="script-args"
                  className="w-full p-2 bg-white border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 focus:outline-none"
                  placeholder="arg1, arg2, arg3..."
                  value={scriptArgs}
                  onChange={(e) => setScriptArgs(e.currentTarget.value)}
                />
              </div>
              
              <button
                onClick={runScript}
                className="w-full bg-indigo-500 text-white p-2 rounded-md text-sm font-medium hover:bg-indigo-600 transition-colors flex items-center justify-center"
              >
                <svg className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Execute
              </button>
              
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-gray-500">Output</label>
                  <span className="text-xs text-gray-400">Python result</span>
                </div>
                <pre className="p-2 bg-gray-50 border border-gray-200 rounded-md text-xs h-28 overflow-auto font-mono text-gray-700">
                  {pythonOutput || "No output yet. Run a script to see results."}
                </pre>
              </div>
            </section>
            
            {/* HTML Management Section */}
            <section className="space-y-3 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 mb-3">
                <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                <h2 className="text-sm font-medium text-gray-700">HTML</h2>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Upload HTML</label>
                  <label 
                    className="flex items-center justify-center w-full p-2 border border-gray-200 border-dashed rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <span className="flex items-center text-xs text-gray-500">
                      <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Choose File
                    </span>
                    <input
                      type="file"
                      accept="text/html"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                  </label>
                </div>
                
                <button
                  onClick={downloadHtml}
                  className="w-full bg-emerald-500 text-white p-2 rounded-md text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center"
                >
                  <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>
            </section>
          </div>

          {/* Collapsed sidebar icons */}
          {sidebarCollapsed && (
            <div className="flex flex-col items-center py-4 space-y-6">
              <button 
                className="p-2 rounded-full bg-indigo-50 text-indigo-500 hover:bg-indigo-100"
                onClick={() => setSidebarCollapsed(false)}
                title="Run Python"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" />
                </svg>
              </button>
              <button 
                className="p-2 rounded-full bg-emerald-50 text-emerald-500 hover:bg-emerald-100"
                onClick={() => setSidebarCollapsed(false)}
                title="HTML Management"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" />
                </svg>
              </button>
            </div>
          )}
        </aside>
        
        {/* HTML Preview Area - More Prominent */}
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
              srcDoc={htmlContent}
              className="w-full h-full border-none"
            ></iframe>
          </div>
        </section>
      </div>
    </div>
  );
};

export default App;
