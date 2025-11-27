import { useState } from 'react';
import Head from 'next/head';
import { Upload, FileText, Shield, AlertTriangle, CheckCircle, Loader2, X } from 'lucide-react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [options, setOptions] = useState({
    redactPII: true,
    redactPHI: true,
    flagPrivilege: true,
    flagConfidentiality: true,
    useAI: false
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setText('');
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();

      if (file) {
        formData.append('file', file);
      } else if (text) {
        formData.append('text', text);
      } else {
        throw new Error('Please upload a file or enter text');
      }

      formData.append('options', JSON.stringify(options));

      const response = await fetch('/api/review', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Processing failed');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Legal Contract Review - AI-Powered Analysis</title>
        <meta name="description" content="AI-powered contract review with PII/PHI redaction" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contract Review Agent</h1>
              <p className="text-sm text-gray-500">AI-Powered Analysis with PII/PHI Redaction</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Upload Contract
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <button
                        type="button"
                        onClick={clearFile}
                        className="ml-2 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">PDF, DOCX, or TXT (max 10MB)</p>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.doc,.txt"
                        onChange={handleFileChange}
                      />
                    </label>
                  )}
                </div>

                {/* Or Text Input */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or paste text</span>
                  </div>
                </div>

                <textarea
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Paste contract text here..."
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setFile(null);
                  }}
                  disabled={!!file}
                />

                {/* Options */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-medium text-gray-700">Processing Options</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={options.redactPII}
                        onChange={(e) => setOptions({ ...options, redactPII: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      Redact PII
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={options.redactPHI}
                        onChange={(e) => setOptions({ ...options, redactPHI: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      Redact PHI
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={options.flagPrivilege}
                        onChange={(e) => setOptions({ ...options, flagPrivilege: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      Flag Privilege
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={options.flagConfidentiality}
                        onChange={(e) => setOptions({ ...options, flagConfidentiality: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      Flag Confidentiality
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-sm border-t pt-3">
                    <input
                      type="checkbox"
                      checked={options.useAI}
                      onChange={(e) => setOptions({ ...options, useAI: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span className="font-medium">Enable AI Analysis</span>
                    <span className="text-xs text-gray-500">(Azure OpenAI)</span>
                  </label>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || (!file && !text)}
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Shield className="h-5 w-5" />
                      Analyze Contract
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {result ? (
              <>
                {/* Summary */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Analysis Complete
                  </h2>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{result.summary?.totalRedactions || 0}</div>
                      <div className="text-xs text-gray-600">Redactions</div>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{result.summary?.flags || 0}</div>
                      <div className="text-xs text-gray-600">Flags</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-600">{result.processingTime}ms</div>
                      <div className="text-xs text-gray-600">Processing Time</div>
                    </div>
                  </div>
                </div>

                {/* Redacted Text */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">Redacted Text</h2>
                  <div className="max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-lg text-sm font-mono whitespace-pre-wrap">
                    {result.redactedText || 'No text to display'}
                  </div>
                </div>

                {/* Redactions List */}
                {result.redactions?.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">Redactions ({result.redactions.length})</h2>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {result.redactions.map((redaction, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                          <span className="font-medium text-blue-600">[{redaction.type}]</span>
                          <span className="text-gray-500 truncate max-w-xs">{redaction.original}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flags */}
                {result.flags?.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      Flags ({result.flags.length})
                    </h2>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {result.flags.map((flag, index) => (
                        <div key={index} className={`p-3 rounded-lg border ${getSeverityColor(flag.severity)}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{flag.type}</span>
                            <span className="text-xs uppercase">{flag.severity}</span>
                          </div>
                          <p className="text-sm mt-1 opacity-80">{flag.description || flag.match}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Analysis */}
                {result.aiAnalysis && !result.aiAnalysis.error && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">AI Analysis</h2>

                    {result.aiAnalysis.classification && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <div className="font-medium">Contract Type: {result.aiAnalysis.classification.type}</div>
                        <div className="text-sm text-gray-600">{result.aiAnalysis.classification.description}</div>
                      </div>
                    )}

                    {result.aiAnalysis.summary && (
                      <div className="mb-4">
                        <h3 className="font-medium mb-2">Summary</h3>
                        <p className="text-sm text-gray-700">{result.aiAnalysis.summary.summary}</p>
                      </div>
                    )}

                    {result.aiAnalysis.risks && (
                      <div className="mb-4">
                        <h3 className="font-medium mb-2">Risk Score: {result.aiAnalysis.risks.overallRiskScore}/10</h3>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${result.aiAnalysis.risks.overallRiskScore > 7 ? 'bg-red-500' : result.aiAnalysis.risks.overallRiskScore > 4 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${result.aiAnalysis.risks.overallRiskScore * 10}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No Results Yet</h3>
                <p className="text-sm text-gray-500 mt-1">Upload a contract or paste text to begin analysis</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          Zero-Error Contract Review Agent - AI-Powered Legal Document Analysis
        </div>
      </footer>
    </div>
  );
}
