import { useState } from 'react';
import Head from 'next/head';
import { Upload, FileText, Shield, AlertTriangle, CheckCircle, Loader2, X, Download, ClipboardCheck, Heart, Plus, Trash2, Eye, EyeOff, Columns } from 'lucide-react';

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
    useAI: false,
    generateHIPAA: false,
    exportPDF: false
  });
  const [customRules, setCustomRules] = useState([]);
  const [newRule, setNewRule] = useState({ name: '', pattern: '', type: 'PII' });
  const [showCustomRules, setShowCustomRules] = useState(false);
  const [comparisonView, setComparisonView] = useState(false);

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

      formData.append('options', JSON.stringify({
        ...options,
        customPatterns: customRules.map(rule => ({
          type: rule.name.toUpperCase().replace(/\s+/g, '_'),
          regex: rule.pattern,
          priority: 5,
          confidence: 'medium'
        }))
      }));

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

  const addCustomRule = () => {
    if (newRule.name && newRule.pattern) {
      try {
        // Validate regex
        new RegExp(newRule.pattern, 'gi');
        setCustomRules([...customRules, { ...newRule, id: Date.now() }]);
        setNewRule({ name: '', pattern: '', type: 'PII' });
      } catch (e) {
        setError('Invalid regex pattern: ' + e.message);
      }
    }
  };

  const removeCustomRule = (id) => {
    setCustomRules(customRules.filter(rule => rule.id !== id));
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const downloadPDF = (base64Data, filename) => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getComplianceGradeColor = (grade) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100';
      case 'B': return 'text-blue-600 bg-blue-100';
      case 'C': return 'text-yellow-600 bg-yellow-100';
      case 'D': return 'text-orange-600 bg-orange-100';
      case 'F': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
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
                  <label className="flex items-center gap-2 text-sm border-t pt-3 mt-3">
                      <input
                        type="checkbox"
                        checked={options.generateHIPAA}
                        onChange={(e) => setOptions({ ...options, generateHIPAA: e.target.checked })}
                        className="rounded text-green-600"
                      />
                      <Heart className="h-4 w-4 text-green-600" />
                      <span>Generate HIPAA Report</span>
                    </label>
                </div>

                {/* Custom Redaction Rules */}
                <div className="border rounded-lg p-4">
                  <button
                    type="button"
                    onClick={() => setShowCustomRules(!showCustomRules)}
                    className="flex items-center gap-2 font-medium text-gray-700 w-full"
                  >
                    {showCustomRules ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    Custom Redaction Rules
                    {customRules.length > 0 && (
                      <span className="ml-auto bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                        {customRules.length}
                      </span>
                    )}
                  </button>

                  {showCustomRules && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-1 gap-2">
                        <input
                          type="text"
                          placeholder="Rule name (e.g., Employee ID)"
                          value={newRule.name}
                          onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="Regex pattern (e.g., EMP-\d{5})"
                          value={newRule.pattern}
                          onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex gap-2">
                          <select
                            value={newRule.type}
                            onChange={(e) => setNewRule({ ...newRule, type: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="PII">PII (Personal Info)</option>
                            <option value="PHI">PHI (Health Info)</option>
                            <option value="Financial">Financial</option>
                            <option value="Confidential">Confidential</option>
                          </select>
                          <button
                            type="button"
                            onClick={addCustomRule}
                            disabled={!newRule.name || !newRule.pattern}
                            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <Plus className="h-4 w-4" />
                            Add
                          </button>
                        </div>
                      </div>

                      {customRules.length > 0 && (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {customRules.map(rule => (
                            <div key={rule.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                              <div className="flex-1">
                                <span className="font-medium">{rule.name}</span>
                                <span className="text-gray-500 ml-2 font-mono text-xs">{rule.pattern}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">{rule.type}</span>
                                <button
                                  type="button"
                                  onClick={() => removeCustomRule(rule.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-gray-500">
                        Add custom patterns to redact specific information unique to your organization.
                      </p>
                    </div>
                  )}
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

                  {/* Export Options & Download Buttons */}
                  <div className="mt-4 pt-4 border-t">
                    {/* PDF Export Toggle (if not already exported) */}
                    {!result.redactedPDF && (
                      <div className="mb-3 p-3 bg-purple-50 rounded-lg">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={options.exportPDF}
                            onChange={(e) => setOptions({ ...options, exportPDF: e.target.checked })}
                            className="rounded text-purple-600"
                          />
                          <Download className="h-4 w-4 text-purple-600" />
                          <span className="font-medium">Enable PDF Export</span>
                          <span className="text-xs text-gray-500">(Re-run analysis to generate)</span>
                        </label>
                      </div>
                    )}

                    {/* Download Buttons */}
                    {(result.redactedPDF || result.hipaaReportPDF) && (
                      <div className="flex flex-wrap gap-2">
                        {result.redactedPDF && (
                          <button
                            onClick={() => downloadPDF(result.redactedPDF, 'redacted-document.pdf')}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                          >
                            <Download className="h-4 w-4" />
                            Download Redacted PDF
                          </button>
                        )}
                        {result.hipaaReportPDF && (
                          <button
                            onClick={() => downloadPDF(result.hipaaReportPDF, 'hipaa-compliance-report.pdf')}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                          >
                            <ClipboardCheck className="h-4 w-4" />
                            Download HIPAA Report
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Text View - Toggle Between Redacted and Comparison */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">
                      {comparisonView ? 'Before / After Comparison' : 'Redacted Text'}
                    </h2>
                    <button
                      onClick={() => setComparisonView(!comparisonView)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        comparisonView
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Columns className="h-4 w-4" />
                      {comparisonView ? 'Show Redacted Only' : 'Compare Before/After'}
                    </button>
                  </div>

                  {comparisonView ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1">
                          <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                          Original
                        </h3>
                        <div className="max-h-64 overflow-y-auto p-3 bg-red-50 border border-red-200 rounded-lg text-sm font-mono whitespace-pre-wrap">
                          {result.originalText || 'No text to display'}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                          Redacted
                        </h3>
                        <div className="max-h-64 overflow-y-auto p-3 bg-green-50 border border-green-200 rounded-lg text-sm font-mono whitespace-pre-wrap">
                          {result.redactedText || 'No text to display'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-lg text-sm font-mono whitespace-pre-wrap">
                      {result.redactedText || 'No text to display'}
                    </div>
                  )}
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
                          <p className="text-sm mt-1 opacity-80">{flag.reason || flag.description || flag.match}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* HIPAA Compliance Report */}
                {result.hipaaReport && !result.hipaaReport.error && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Heart className="h-5 w-5 text-green-600" />
                      HIPAA Compliance Report
                    </h2>

                    {/* Compliance Score */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`text-4xl font-bold px-4 py-2 rounded-lg ${getComplianceGradeColor(result.hipaaReport.complianceScore?.grade)}`}>
                        {result.hipaaReport.complianceScore?.grade || 'N/A'}
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{result.hipaaReport.complianceScore?.score || 0}/100</div>
                        <div className="text-sm text-gray-600">{result.hipaaReport.complianceScore?.interpretation}</div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-lg font-bold">{result.hipaaReport.summary?.totalPHIIdentifiersFound || 0}</div>
                        <div className="text-xs text-gray-500">PHI Found</div>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded">
                        <div className="text-lg font-bold text-red-600">{result.hipaaReport.summary?.criticalFindings || 0}</div>
                        <div className="text-xs text-gray-500">Critical</div>
                      </div>
                      <div className="text-center p-2 bg-orange-50 rounded">
                        <div className="text-lg font-bold text-orange-600">{result.hipaaReport.summary?.highFindings || 0}</div>
                        <div className="text-xs text-gray-500">High</div>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <div className="text-lg font-bold text-blue-600">{result.hipaaReport.summary?.categoriesAffected || 0}</div>
                        <div className="text-xs text-gray-500">Categories</div>
                      </div>
                    </div>

                    {/* PHI Categories Found */}
                    {result.hipaaReport.phiFindings && Object.keys(result.hipaaReport.phiFindings).length > 0 && (
                      <div className="mb-4">
                        <h3 className="font-medium mb-2 text-sm">PHI Categories Detected:</h3>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(result.hipaaReport.phiFindings).map(([category, finding]) => (
                            <span
                              key={category}
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                finding.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                finding.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {finding.label} ({finding.count})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top Recommendations */}
                    {result.hipaaReport.recommendations?.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-2 text-sm">Top Recommendations:</h3>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {result.hipaaReport.recommendations.slice(0, 3).map((rec, index) => (
                            <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                              <span className={`font-medium ${
                                rec.priority === 'CRITICAL' ? 'text-red-600' :
                                rec.priority === 'HIGH' ? 'text-orange-600' : 'text-blue-600'
                              }`}>[{rec.priority}]</span>
                              {' '}{rec.action}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* HIPAA Quick Check (if no full report) */}
                {result.hipaaQuickCheck && !result.hipaaReport && (
                  <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                    result.hipaaQuickCheck.riskLevel === 'HIGH' ? 'border-red-500' :
                    result.hipaaQuickCheck.riskLevel === 'MEDIUM' ? 'border-yellow-500' : 'border-green-500'
                  }`}>
                    <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5" />
                      HIPAA Quick Check
                    </h2>
                    <p className="text-sm text-gray-700">{result.hipaaQuickCheck.message}</p>
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
