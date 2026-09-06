import React, { useState } from 'react';
import { 
  FileCode2, 
  Copy, 
  Check, 
  Download, 
  Terminal, 
  FolderArchive, 
  FileText
} from 'lucide-react';
import JSZip from 'jszip';
import { PYTHON_FILES, PythonFile } from '../pythonCodeStore';

export const PythonCodebaseTab: React.FC = () => {
  const [activeFile, setActiveFile] = useState<PythonFile>(PYTHON_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      
      // Add each file to the zip
      PYTHON_FILES.forEach(file => {
        zip.file(file.name, file.code);
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nse_alpha_quant_windows.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate ZIP', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Download Action */}
      <div className="bg-[#111113] border border-[#1E1E24] rounded-lg p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
            <FileCode2 className="w-5 h-5 text-[#4A90E2]" />
            <span>Complete Modular Python Web Application Codebase</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Production-ready, PEP-8 compliant Python package tailored for local execution on Windows (http://localhost:8501).
          </p>
        </div>

        <button
          id="btn-download-python-zip"
          onClick={handleDownloadZip}
          disabled={isZipping}
          className="px-5 py-2.5 bg-[#4A90E2] hover:bg-[#3B82F6] text-white rounded-md text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-[#4A90E2]/25 disabled:opacity-50 cursor-pointer"
        >
          <FolderArchive className="w-4 h-4" />
          <span>{isZipping ? 'Bundling ZIP...' : 'Download Full Python ZIP'}</span>
        </button>
      </div>

      {/* Windows CMD / PowerShell Instructions Box */}
      <div className="bg-[#111113] border border-[#1E1E24] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-zinc-200">
            <Terminal className="w-4 h-4 text-[#4A90E2]" />
            <span>How to Run Locally on Your Computer (Two Execution Modes)</span>
          </div>
          <span className="text-[11px] text-zinc-400">Windows CMD, PowerShell or macOS/Linux Terminal</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Option 1: Exact React Preview UI */}
          <div className="bg-[#0A0A0B] p-3.5 rounded-lg border border-[#4A90E2]/30 shadow-sm font-mono">
            <div className="flex items-center justify-between mb-1">
              <span className="text-zinc-300 font-sans text-[11px] font-bold">
                1. Exact Web Preview UI (React + Tailwind)
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#4A90E2]/20 text-[#60A5FA]">
                Port 3000
              </span>
            </div>
            <div className="text-emerald-400 font-bold mb-0.5">run_preview_ui.bat</div>
            <div className="text-zinc-400 text-[11px]">or: <span className="text-zinc-200">npm install &amp;&amp; npm run dev</span></div>
            <div className="text-zinc-500 text-[10px] mt-1.5 font-sans leading-relaxed">
              Launches the <strong>100% exact interactive UI</strong> shown in Google AI Studio Preview at <span className="text-[#60A5FA]">http://localhost:3000</span>.
            </div>
          </div>

          {/* Option 2: Python / Streamlit Engine */}
          <div className="bg-[#0A0A0B] p-3.5 rounded-lg border border-[#1E1E24] font-mono">
            <div className="flex items-center justify-between mb-1">
              <span className="text-zinc-300 font-sans text-[11px] font-bold">
                2. Python Quantitative Engine (Streamlit)
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300">
                Port 8501
              </span>
            </div>
            <div className="text-emerald-400 font-bold mb-0.5">run_windows.bat</div>
            <div className="text-zinc-400 text-[11px]">or: <span className="text-zinc-200">streamlit run app.py</span></div>
            <div className="text-zinc-500 text-[10px] mt-1.5 font-sans leading-relaxed">
              Launches the Python-native quantitative dashboard at <span className="text-zinc-300">http://localhost:8501</span> with matching dark terminal theme.
            </div>
          </div>
        </div>
      </div>

      {/* Code Viewer Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* File Tree List */}
        <div className="bg-[#111113] border border-[#1E1E24] rounded-lg p-3 space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-2 py-1 mb-1">
            Application Files ({PYTHON_FILES.length})
          </div>
          {PYTHON_FILES.map((file) => {
            const isSelected = activeFile.name === file.name;
            return (
              <button
                key={file.name}
                onClick={() => setActiveFile(file)}
                className={`w-full text-left px-3 py-2 rounded text-xs transition flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-[#181820] text-[#60A5FA] font-bold border border-[#4A90E2]/30'
                    : 'text-zinc-400 hover:bg-[#16161A] hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate font-mono">{file.name}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Code Content Window */}
        <div className="md:col-span-3 bg-[#111113] border border-[#1E1E24] rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-[#0E0E10] border-b border-[#1E1E24] flex justify-between items-center">
            <div>
              <span className="font-mono text-xs font-bold text-white">{activeFile.name}</span>
              <p className="text-[11px] text-zinc-400 mt-0.5">{activeFile.description}</p>
            </div>

            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-[#16161A] hover:bg-[#202026] text-zinc-200 border border-[#23232A] rounded text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 bg-[#0A0A0B] font-mono text-xs text-zinc-300 overflow-x-auto max-h-[550px] leading-relaxed select-text">
            <pre className="whitespace-pre">{activeFile.code}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};
