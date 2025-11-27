import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Upload, FileText, Shield, AlertTriangle, CheckCircle, Loader2, X,
  BarChart3, PieChart, Files, ArrowLeft, Download, AlertCircle,
  TrendingUp, Clock, FileWarning, ChevronDown, ChevronUp
} from 'lucide-react';

export default function BatchProcessing() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [options, setOptions] = useState({
    redactPII: true,
    redactPHI: true,
    flagPrivilege: true,
    flagConfidentiality: true
  });

  const handleFilesChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
    setError(null);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setFiles([]);
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);

    try {
      const formData = new FormData();

      files.forEach(file => {
        formData.append('files', file);
      });

      formData.append('options', JSON.stringify(options));

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/batch', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Batch processing failed');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'HIGH': return 'text-red-600 bg-red-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskBgColor = (risk) => {
    switch (risk) {
      case 'HIGH': return 'bg-red-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Calculate percentages for pie chart visualization
  const calculatePercentages = (distribution) => {
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (total === 0) return { HIGH: 0, MEDIUM: 0, LOW: 0 };
    return {
      HIGH: Math.round((distribution.HIGH / total) * 100),
      MEDIUM: Math.round((distribution.MEDIUM / total) * 100),
      LOW: Math.round((distribution.LOW / total) * 100)
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Batch Processing - Contract Review</title>
        <meta name="description" content="Process multiple contracts at once" />
      </Head>

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Files className="h-8 w-8 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Batch Processing</h1>
                <p className="text-sm text-gray-500">Analyze multiple contracts at once</p>
              </div>
            </div>
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
              Back to Single Review
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {!result ? (
          /* Upload Section */
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Upload className="h-5 w-5 text-purple-600" />
                Upload Multiple Contracts
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* File Upload Zone */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
                  <label className="cursor-pointer">
                    <Files className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg text-gray-600 mb-2">
                      <span className="text-purple-600 font-medium">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-sm text-gray-500">Upload up to 20 files (PDF, DOCX, TXT)</p>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.doc,.txt"
                      multiple
                      onChange={handleFilesChange}
                    />
                  </label>
                </div>

                {/* Selected Files List */}
                {files.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-700">
                        Selected Files ({files.length})
                      </h3>
                      <button
                        type="button"
                        onClick={clearAllFiles}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="text-sm truncate max-w-xs">{file.name}</span>
                            <span className="text-xs text-gray-400">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Options */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-700 mb-3">Processing Options</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={options.redactPII}
                        onChange={(e) => setOptions({ ...options, redactPII: e.target.checked })}
                        className="rounded text-purple-600"
                      />
                      Redact PII
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={options.redactPHI}
                        onChange={(e) => setOptions({ ...options, redactPHI: e.target.checked })}
                        className="rounded text-purple-600"
                      />
                      Redact PHI
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={options.flagPrivilege}
                        onChange={(e) => setOptions({ ...options, flagPrivilege: e.target.checked })}
                        className="rounded text-purple-600"
                      />
                      Flag Privilege
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={options.flagConfidentiality}
                        onChange={(e) => setOptions({ ...options, flagConfidentiality: e.target.checked })}
                        className="rounded text-purple-600"
                      />
                      Flag Confidentiality
                    </label>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                  </div>
                )}

                {/* Progress Bar */}
                {loading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Processing {files.length} documents...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || files.length === 0}
                  className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing {files.length} Documents...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-5 w-5" />
                      Analyze {files.length} Contract{files.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Results Dashboard */
          <div className="space-y-6">
            {/* Header Stats */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Risk Dashboard</h2>
                <p className="text-gray-500">
                  Analyzed {result.aggregate.successfulDocuments} of {result.aggregate.totalDocuments} documents
                  in {(result.totalProcessingTime / 1000).toFixed(1)}s
                </p>
              </div>
              <button
                onClick={() => { setResult(null); setFiles([]); }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Upload className="h-4 w-4" />
                New Batch
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Files className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{result.aggregate.successfulDocuments}</div>
                    <div className="text-sm text-gray-500">Documents Processed</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{result.aggregate.redactions.total}</div>
                    <div className="text-sm text-gray-500">Total Redactions</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{result.aggregate.flags.total}</div>
                    <div className="text-sm text-gray-500">Total Flags</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <FileWarning className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{result.aggregate.riskDistribution.HIGH}</div>
                    <div className="text-sm text-gray-500">High Risk Documents</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-6">
              {/* Risk Distribution */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-gray-500" />
                  Risk Distribution
                </h3>
                <div className="flex items-center gap-8">
                  {/* Simple Pie Chart Visualization */}
                  <div className="relative w-40 h-40">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      {(() => {
                        const total = result.aggregate.riskDistribution.HIGH +
                          result.aggregate.riskDistribution.MEDIUM +
                          result.aggregate.riskDistribution.LOW;
                        if (total === 0) return <circle cx="50" cy="50" r="40" fill="#e5e7eb" />;

                        const highPct = (result.aggregate.riskDistribution.HIGH / total) * 100;
                        const medPct = (result.aggregate.riskDistribution.MEDIUM / total) * 100;
                        const lowPct = (result.aggregate.riskDistribution.LOW / total) * 100;

                        const highEnd = highPct * 2.51327;
                        const medEnd = medPct * 2.51327;
                        const lowEnd = lowPct * 2.51327;

                        return (
                          <>
                            <circle
                              cx="50" cy="50" r="40"
                              fill="transparent"
                              stroke="#ef4444"
                              strokeWidth="20"
                              strokeDasharray={`${highEnd} 251.327`}
                              strokeDashoffset="0"
                            />
                            <circle
                              cx="50" cy="50" r="40"
                              fill="transparent"
                              stroke="#eab308"
                              strokeWidth="20"
                              strokeDasharray={`${medEnd} 251.327`}
                              strokeDashoffset={`-${highEnd}`}
                            />
                            <circle
                              cx="50" cy="50" r="40"
                              fill="transparent"
                              stroke="#22c55e"
                              strokeWidth="20"
                              strokeDasharray={`${lowEnd} 251.327`}
                              strokeDashoffset={`-${highEnd + medEnd}`}
                            />
                          </>
                        );
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{result.aggregate.successfulDocuments}</div>
                        <div className="text-xs text-gray-500">Total</div>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span className="text-sm">High Risk</span>
                      <span className="font-bold">{result.aggregate.riskDistribution.HIGH}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <span className="text-sm">Medium Risk</span>
                      <span className="font-bold">{result.aggregate.riskDistribution.MEDIUM}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span className="text-sm">Low Risk</span>
                      <span className="font-bold">{result.aggregate.riskDistribution.LOW}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Redaction Types Bar Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-gray-500" />
                  Redactions by Type
                </h3>
                <div className="space-y-3">
                  {Object.entries(result.aggregate.redactions.byType)
                    .filter(([key]) => key !== 'totalRedactions')
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([type, count]) => {
                      const maxCount = Math.max(...Object.values(result.aggregate.redactions.byType).filter(v => typeof v === 'number'));
                      const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                      return (
                        <div key={type} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">{type.replace(/_/g, ' ')}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  {Object.keys(result.aggregate.redactions.byType).length === 0 && (
                    <p className="text-gray-500 text-sm">No redactions found</p>
                  )}
                </div>
              </div>
            </div>

            {/* Top Issues */}
            {result.aggregate.topIssues.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Top Issues Across All Documents
                </h3>
                <div className="space-y-2">
                  {result.aggregate.topIssues.slice(0, 5).map((issue, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${
                      issue.severity === 'HIGH' ? 'border-red-200 bg-red-50' :
                      issue.severity === 'MEDIUM' ? 'border-yellow-200 bg-yellow-50' :
                      'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(issue.severity)}`}>
                            {issue.severity}
                          </span>
                          <span className="font-medium">{issue.type}</span>
                        </div>
                        <span className="text-sm text-gray-500">{issue.document}</span>
                      </div>
                      {issue.reason && (
                        <p className="text-sm text-gray-600 mt-1">{issue.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents at Risk */}
            {(result.aggregate.documentsAtRisk.high.length > 0 || result.aggregate.documentsAtRisk.medium.length > 0) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileWarning className="h-5 w-5 text-red-500" />
                  Documents Requiring Attention
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {result.aggregate.documentsAtRisk.high.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-red-600 mb-2">High Risk ({result.aggregate.documentsAtRisk.high.length})</h4>
                      <div className="space-y-1">
                        {result.aggregate.documentsAtRisk.high.map((doc, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 bg-red-50 rounded text-sm">
                            <FileText className="h-4 w-4 text-red-500" />
                            <span className="truncate">{doc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.aggregate.documentsAtRisk.medium.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-yellow-600 mb-2">Medium Risk ({result.aggregate.documentsAtRisk.medium.length})</h4>
                      <div className="space-y-1">
                        {result.aggregate.documentsAtRisk.medium.map((doc, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 bg-yellow-50 rounded text-sm">
                            <FileText className="h-4 w-4 text-yellow-500" />
                            <span className="truncate">{doc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Individual Document Results */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Files className="h-5 w-5 text-gray-500" />
                Individual Document Results
              </h3>
              <div className="space-y-2">
                {result.documents.map((doc, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedDoc(expandedDoc === index ? null : index)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className={`h-5 w-5 ${doc.success ? 'text-gray-500' : 'text-red-500'}`} />
                        <span className="font-medium">{doc.filename}</span>
                        {doc.success ? (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(doc.summary.riskLevel)}`}>
                            {doc.summary.riskLevel} Risk
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium text-red-600 bg-red-100">
                            Failed
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        {doc.success && (
                          <>
                            <span className="text-sm text-gray-500">
                              {doc.summary.totalRedactions} redactions
                            </span>
                            <span className="text-sm text-gray-500">
                              {doc.summary.totalFlags} flags
                            </span>
                          </>
                        )}
                        {expandedDoc === index ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {expandedDoc === index && doc.success && (
                      <div className="border-t p-4 bg-gray-50">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <h4 className="font-medium text-gray-700 mb-2">Redactions</h4>
                            {Object.entries(doc.summary.redactionsByType)
                              .filter(([key]) => key !== 'totalRedactions')
                              .map(([type, count]) => (
                                <div key={type} className="flex justify-between">
                                  <span className="text-gray-600">{type}</span>
                                  <span className="font-medium">{count}</span>
                                </div>
                              ))}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-700 mb-2">Flags</h4>
                            {Object.entries(doc.summary.flagsByType).map(([type, count]) => (
                              <div key={type} className="flex justify-between">
                                <span className="text-gray-600">{type}</span>
                                <span className="font-medium">{count}</span>
                              </div>
                            ))}
                            {Object.keys(doc.summary.flagsByType).length === 0 && (
                              <span className="text-gray-400">No flags</span>
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-700 mb-2">Details</h4>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Pages</span>
                                <span className="font-medium">{doc.pages || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Processing Time</span>
                                <span className="font-medium">{doc.processingTime}ms</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">HIPAA Risk</span>
                                <span className={`font-medium ${
                                  doc.summary.hipaaRiskLevel === 'HIGH' ? 'text-red-600' :
                                  doc.summary.hipaaRiskLevel === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600'
                                }`}>{doc.summary.hipaaRiskLevel}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {expandedDoc === index && !doc.success && (
                      <div className="border-t p-4 bg-red-50">
                        <p className="text-red-600 text-sm">{doc.error}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          Zero-Error Contract Review Agent - Batch Processing Dashboard
        </div>
      </footer>
    </div>
  );
}
