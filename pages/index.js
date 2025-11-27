import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Upload, FileText, Shield, AlertTriangle, CheckCircle, Loader2, X, Download, ClipboardCheck, Heart, Plus, Trash2, Eye, EyeOff, Columns, Info, MessageCircle, Send, Bot, User, Files, RefreshCw, AlertCircle } from 'lucide-react';

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
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showHIPAAInfo, setShowHIPAAInfo] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Suggested questions for the chatbot
  const suggestedQuestions = [
    "What are the key obligations for each party?",
    "What is the termination clause?",
    "Are there any penalties or liabilities?",
    "What are the payment terms?",
    "Can either party terminate early?"
  ];

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

  // Get document name for exports
  const getDocumentName = () => {
    if (file) {
      return file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    }
    return `document-${new Date().toISOString().split('T')[0]}`;
  };

  const generatePDF = async () => {
    if (!result) return;

    setGeneratingPDF(true);
    setError(null);

    try {
      const formData = new FormData();

      // Use the original text from the result
      formData.append('text', result.originalText);

      const docName = getDocumentName();
      formData.append('options', JSON.stringify({
        ...options,
        exportPDF: true,
        documentName: docName,
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
        throw new Error(data.message || 'PDF generation failed');
      }

      // Update result with PDF data
      setResult(prev => ({
        ...prev,
        redactedPDF: data.redactedPDF,
        hipaaReportPDF: data.hipaaReportPDF
      }));
    } catch (err) {
      setError('PDF generation failed: ' + err.message);
    } finally {
      setGeneratingPDF(false);
    }
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

  // Send chat message with streaming support
  const sendChatMessage = async (question, isRetry = false) => {
    if (!question.trim() || !result?.originalText) return;

    // If not a retry, add user message to chat
    if (!isRetry) {
      const userMessage = { role: 'user', content: question };
      setChatMessages(prev => [...prev, userMessage]);
      setChatInput('');
    } else {
      // Remove the last error message before retrying
      setChatMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].isError) {
          newMessages.pop();
        }
        return newMessages;
      });
    }

    setChatLoading(true);

    // Add empty assistant message that will be populated with streaming content
    const streamingMessageIndex = isRetry ? chatMessages.length - 1 : chatMessages.length;
    setChatMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }]);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const response = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          contractText: result.originalText,
          chatHistory: chatMessages.filter(m => !m.isError && !m.isStreaming)
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Chat request failed');
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                // Update the streaming message with new content
                setChatMessages(prev => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  if (lastIndex >= 0 && newMessages[lastIndex].isStreaming) {
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      content: fullContent
                    };
                  }
                  return newMessages;
                });
              }
              if (parsed.error) {
                throw new Error(parsed.message || 'Stream error');
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
              if (e.message !== 'Stream error') continue;
              throw e;
            }
          }
        }
      }

      // Mark streaming as complete
      setChatMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        if (lastIndex >= 0 && newMessages[lastIndex].isStreaming) {
          newMessages[lastIndex] = {
            role: 'assistant',
            content: fullContent || "I couldn't generate a response. Please try again.",
            isStreaming: false
          };
        }
        return newMessages;
      });

    } catch (err) {
      clearTimeout(timeoutId);

      // If streaming failed, try the non-streaming fallback
      console.log('Streaming failed, trying fallback:', err.message);

      try {
        const fallbackResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            contractText: result.originalText,
            chatHistory: chatMessages.filter(m => !m.isError && !m.isStreaming)
          })
        });

        const fallbackData = await fallbackResponse.json();

        if (fallbackResponse.ok && fallbackData.answer) {
          // Success with fallback - update the message
          setChatMessages(prev => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (lastIndex >= 0) {
              newMessages[lastIndex] = {
                role: 'assistant',
                content: fallbackData.answer,
                isStreaming: false
              };
            }
            return newMessages;
          });
          setChatLoading(false);
          return;
        }

        // Fallback also failed
        throw new Error(fallbackData.message || 'Chat request failed');
      } catch (fallbackErr) {
        let errorMessage = fallbackErr.message || err.message;
        let retryable = true;

        if (err.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again.';
        } else if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }

        // Replace streaming message with error
        setChatMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          if (lastIndex >= 0) {
            newMessages[lastIndex] = {
              role: 'assistant',
              content: errorMessage,
              isError: true,
              retryable,
              originalQuestion: question
            };
          }
          return newMessages;
        });
      }
    } finally {
      setChatLoading(false);
    }
  };

  // Retry last failed message
  const retryChatMessage = (originalQuestion) => {
    sendChatMessage(originalQuestion, true);
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    sendChatMessage(chatInput);
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Contract Review Agent</h1>
                <p className="text-sm text-gray-500">AI-Powered Analysis with PII/PHI Redaction</p>
              </div>
            </div>
            <Link
              href="/batch"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Files className="h-5 w-5" />
              Batch Processing
            </Link>
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
                    <div className="flex flex-wrap gap-2">
                      {/* Generate PDF Button (if not already generated) */}
                      {!result.redactedPDF && (
                        <button
                          onClick={generatePDF}
                          disabled={generatingPDF}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400 transition-colors text-sm"
                        >
                          {generatingPDF ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Generating PDF...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4" />
                              Generate PDF
                            </>
                          )}
                        </button>
                      )}

                      {/* Download Redacted PDF */}
                      {result.redactedPDF && (
                        <button
                          onClick={() => downloadPDF(result.redactedPDF, `${getDocumentName()}-redacted.pdf`)}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                        >
                          <Download className="h-4 w-4" />
                          Download Redacted PDF
                        </button>
                      )}

                      {/* Download HIPAA Report PDF */}
                      {result.hipaaReportPDF && (
                        <button
                          onClick={() => downloadPDF(result.hipaaReportPDF, `${getDocumentName()}-hipaa-report.pdf`)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          <ClipboardCheck className="h-4 w-4" />
                          Download HIPAA Report
                        </button>
                      )}
                    </div>
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
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Heart className="h-5 w-5 text-green-600" />
                        HIPAA Compliance Report
                      </h2>
                      <button
                        onClick={() => setShowHIPAAInfo(true)}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <Info className="h-4 w-4" />
                        How is this calculated?
                      </button>
                    </div>

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

                {/* AI Analysis - Enhanced Summary View */}
                {result.aiAnalysis && !result.aiAnalysis.error && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      AI-Powered Analysis
                    </h2>

                    {/* Contract Classification */}
                    {result.aiAnalysis.classification && (
                      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Contract Type</div>
                            <div className="text-xl font-bold text-gray-900">{result.aiAnalysis.classification.type}</div>
                            {result.aiAnalysis.classification.subtype && (
                              <div className="text-sm text-gray-600">{result.aiAnalysis.classification.subtype}</div>
                            )}
                          </div>
                          {result.aiAnalysis.classification.confidence && (
                            <div className="text-right">
                              <div className="text-xs text-gray-500">Confidence</div>
                              <div className="text-lg font-bold text-blue-600">
                                {Math.round(result.aiAnalysis.classification.confidence * 100)}%
                              </div>
                            </div>
                          )}
                        </div>
                        {result.aiAnalysis.classification.description && (
                          <p className="mt-2 text-sm text-gray-600">{result.aiAnalysis.classification.description}</p>
                        )}
                      </div>
                    )}

                    {/* Executive Summary */}
                    {result.aiAnalysis.summary && (
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold text-gray-900 mb-2">Executive Summary</h3>
                        <p className="text-sm text-gray-700 leading-relaxed">{result.aiAnalysis.summary.summary}</p>

                        {/* Key Points */}
                        {result.aiAnalysis.summary.keyPoints && result.aiAnalysis.summary.keyPoints.length > 0 && (
                          <div className="mt-3">
                            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Key Points</h4>
                            <ul className="space-y-1">
                              {result.aiAnalysis.summary.keyPoints.slice(0, 5).map((point, idx) => (
                                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                  <span className="text-blue-500 mt-1">•</span>
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Important Dates */}
                        <div className="mt-3 flex flex-wrap gap-4 text-sm">
                          {result.aiAnalysis.summary.effectiveDate && (
                            <div>
                              <span className="text-gray-500">Effective:</span>{' '}
                              <span className="font-medium">{result.aiAnalysis.summary.effectiveDate}</span>
                            </div>
                          )}
                          {result.aiAnalysis.summary.terminationDate && (
                            <div>
                              <span className="text-gray-500">Termination:</span>{' '}
                              <span className="font-medium">{result.aiAnalysis.summary.terminationDate}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Risk Assessment */}
                    {result.aiAnalysis.risks && (
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900">Risk Assessment</h3>
                          <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                            result.aiAnalysis.risks.overallRiskScore > 7 ? 'bg-red-100 text-red-700' :
                            result.aiAnalysis.risks.overallRiskScore > 4 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {result.aiAnalysis.risks.overallRiskScore}/10
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                          <div
                            className={`h-3 rounded-full transition-all ${
                              result.aiAnalysis.risks.overallRiskScore > 7 ? 'bg-red-500' :
                              result.aiAnalysis.risks.overallRiskScore > 4 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${result.aiAnalysis.risks.overallRiskScore * 10}%` }}
                          />
                        </div>

                        {/* Risk Items */}
                        {result.aiAnalysis.risks.risks && result.aiAnalysis.risks.risks.length > 0 && (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {result.aiAnalysis.risks.risks.slice(0, 5).map((risk, idx) => (
                              <div key={idx} className={`p-2 rounded border-l-4 ${
                                risk.severity === 'HIGH' || risk.severity === 'high' ? 'border-red-500 bg-red-50' :
                                risk.severity === 'MEDIUM' || risk.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                                'border-gray-300 bg-white'
                              }`}>
                                <div className="flex justify-between items-start">
                                  <span className="text-sm font-medium text-gray-900">{risk.category || risk.description}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    risk.severity === 'HIGH' || risk.severity === 'high' ? 'bg-red-200 text-red-800' :
                                    risk.severity === 'MEDIUM' || risk.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                                    'bg-gray-200 text-gray-800'
                                  }`}>{risk.severity}</span>
                                </div>
                                {risk.recommendation && (
                                  <p className="text-xs text-gray-600 mt-1">{risk.recommendation}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Entities Found */}
                    {result.aiAnalysis.entities && (
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold text-gray-900 mb-3">Identified Entities</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {result.aiAnalysis.entities.parties && result.aiAnalysis.entities.parties.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Parties</h4>
                              <div className="space-y-1">
                                {result.aiAnalysis.entities.parties.slice(0, 3).map((party, idx) => (
                                  <div key={idx} className="text-sm">
                                    <span className="font-medium">{party.name}</span>
                                    {party.role && <span className="text-gray-500 text-xs ml-1">({party.role})</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {result.aiAnalysis.entities.amounts && result.aiAnalysis.entities.amounts.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Key Amounts</h4>
                              <div className="space-y-1">
                                {result.aiAnalysis.entities.amounts.slice(0, 3).map((amount, idx) => (
                                  <div key={idx} className="text-sm">
                                    <span className="font-medium text-green-700">{amount.value} {amount.currency}</span>
                                    {amount.context && <span className="text-gray-500 text-xs ml-1">({amount.context})</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Key Obligations */}
                    {result.aiAnalysis.obligations && result.aiAnalysis.obligations.obligations && result.aiAnalysis.obligations.obligations.length > 0 && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold text-gray-900 mb-3">Key Obligations</h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {result.aiAnalysis.obligations.obligations.slice(0, 4).map((obl, idx) => (
                            <div key={idx} className="p-2 bg-white rounded border border-gray-200">
                              <div className="text-sm">
                                <span className="font-medium text-blue-700">{obl.party}:</span>{' '}
                                <span className="text-gray-700">{obl.obligation}</span>
                              </div>
                              {obl.deadline && (
                                <div className="text-xs text-gray-500 mt-1">Deadline: {obl.deadline}</div>
                              )}
                            </div>
                          ))}
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

      {/* Chat Floating Button - Only show when result exists */}
      {result && (
        <button
          onClick={() => setShowChat(!showChat)}
          className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg transition-all z-40 ${
            showChat ? 'bg-gray-600 hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {showChat ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </button>
      )}

      {/* Chat Panel */}
      {showChat && result && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-40 overflow-hidden">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 flex items-center gap-3">
            <Bot className="h-6 w-6" />
            <div>
              <h3 className="font-semibold">Contract Assistant</h3>
              <p className="text-xs text-blue-100">Ask questions about your contract</p>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-4">Ask me anything about your contract!</p>

                {/* Suggested Questions */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Suggested questions:</p>
                  {suggestedQuestions.slice(0, 3).map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendChatMessage(q)}
                      className="block w-full text-left text-sm p-2 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors text-gray-700 hover:text-blue-700"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full ${msg.isError ? 'bg-red-100' : 'bg-blue-100'} flex items-center justify-center`}>
                      {msg.isError ? (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <Bot className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-lg text-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : msg.isError
                          ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-none'
                          : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.isError && msg.retryable && (
                      <button
                        onClick={() => retryChatMessage(msg.originalQuestion)}
                        disabled={chatLoading}
                        className="mt-2 flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Retry
                      </button>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Loading indicator */}
            {chatLoading && (
              <div className="flex gap-2 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
                <div className="bg-gray-100 p-3 rounded-lg rounded-bl-none">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Questions (when chat has messages) */}
          {chatMessages.length > 0 && (
            <div className="px-3 py-2 border-t bg-gray-50 overflow-x-auto">
              <div className="flex gap-2">
                {suggestedQuestions.slice(0, 3).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendChatMessage(q)}
                    disabled={chatLoading}
                    className="flex-shrink-0 text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:bg-blue-50 hover:border-blue-200 transition-colors disabled:opacity-50"
                  >
                    {q.length > 25 ? q.slice(0, 25) + '...' : q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Input */}
          <form onSubmit={handleChatSubmit} className="p-3 border-t bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about the contract..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={chatLoading}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* HIPAA Scoring Methodology Modal */}
      {showHIPAAInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Info className="h-6 w-6 text-blue-600" />
                HIPAA Scoring Methodology
              </h3>
              <button
                onClick={() => setShowHIPAAInfo(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-6">
              {/* What is 100/100 */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">What is a 100/100 Score?</h4>
                <p className="text-sm text-gray-600 mb-2">
                  A document with a score of 100 means:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    No PHI was found in the document, OR PHI was found and properly redacted
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    No PHI-related content flags (medical terms, patient references)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    No critical identifiers (SSN, MRN, Health Plan IDs)
                  </li>
                </ul>
              </div>

              {/* Scoring Logic */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Scoring Logic</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="pb-2">Finding</th>
                        <th className="pb-2 text-right">Impact</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      <tr className="border-t border-gray-200">
                        <td className="py-2">Each CRITICAL PHI category (SSN, MRN, Health Plan ID)</td>
                        <td className="py-2 text-right text-red-600 font-medium">-5 points</td>
                      </tr>
                      <tr className="border-t border-gray-200">
                        <td className="py-2">Each PHI content flag (medical mentions)</td>
                        <td className="py-2 text-right text-orange-600 font-medium">-3 points (max -15)</td>
                      </tr>
                      <tr className="border-t border-gray-200">
                        <td className="py-2">Redactions properly applied</td>
                        <td className="py-2 text-right text-green-600 font-medium">+5 points</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Grade Scale */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Grade Scale</h4>
                <div className="grid grid-cols-5 gap-2 text-center text-sm">
                  <div className="bg-green-100 text-green-700 rounded p-2">
                    <div className="font-bold">A</div>
                    <div className="text-xs">90-100</div>
                  </div>
                  <div className="bg-blue-100 text-blue-700 rounded p-2">
                    <div className="font-bold">B</div>
                    <div className="text-xs">80-89</div>
                  </div>
                  <div className="bg-yellow-100 text-yellow-700 rounded p-2">
                    <div className="font-bold">C</div>
                    <div className="text-xs">70-79</div>
                  </div>
                  <div className="bg-orange-100 text-orange-700 rounded p-2">
                    <div className="font-bold">D</div>
                    <div className="text-xs">60-69</div>
                  </div>
                  <div className="bg-red-100 text-red-700 rounded p-2">
                    <div className="font-bold">F</div>
                    <div className="text-xs">0-59</div>
                  </div>
                </div>
              </div>

              {/* 18 HIPAA Identifiers */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">18 HIPAA PHI Identifiers (45 CFR 164.514)</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Based on the HIPAA Safe Harbor De-identification Standard:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 p-1.5 bg-red-50 rounded">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <span>SSN (Critical)</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-red-50 rounded">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <span>Medical Record Numbers (Critical)</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-red-50 rounded">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <span>Health Plan IDs (Critical)</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-orange-50 rounded">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      <span>Names (High)</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-orange-50 rounded">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      <span>Geographic Data (High)</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-orange-50 rounded">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      <span>Dates (High)</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-orange-50 rounded">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      <span>Phone Numbers (High)</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-orange-50 rounded">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      <span>Email Addresses (High)</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-orange-50 rounded">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      <span>Account Numbers (High)</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 p-1.5 bg-orange-50 rounded">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      <span>License/Certificate Numbers (High)</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-orange-50 rounded">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      <span>IP Addresses (High)</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-orange-50 rounded">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      <span>Fax Numbers (High)</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-orange-50 rounded">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      <span>Full Face Photos (High)</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-yellow-50 rounded">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      <span>Vehicle Identifiers (Medium)</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-yellow-50 rounded">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      <span>Device Identifiers (Medium)</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-yellow-50 rounded">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      <span>Web URLs (Medium)</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-red-50 rounded">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <span>Biometric Identifiers (Critical)</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-orange-50 rounded">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      <span>Other Unique Identifiers (High)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Regulations */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Key Regulations Referenced</h4>
                <div className="text-xs text-gray-600 space-y-1 bg-gray-50 rounded-lg p-3">
                  <div><span className="font-medium">45 CFR 164.502(b)</span> - Minimum Necessary Standard</div>
                  <div><span className="font-medium">45 CFR 164.312(a)(1)</span> - Access Control</div>
                  <div><span className="font-medium">45 CFR 164.312(b)</span> - Audit Controls</div>
                  <div><span className="font-medium">45 CFR 164.312(e)(1)</span> - Transmission Security</div>
                  <div><span className="font-medium">45 CFR 164.508</span> - Uses and Disclosures</div>
                  <div><span className="font-medium">45 CFR 164.530(b)</span> - Training Requirements</div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  <span className="font-semibold">Disclaimer:</span> This automated review focuses on PHI detection and redaction.
                  A true HIPAA compliance assessment also requires verification of authorization, consent documentation,
                  Business Associate Agreements, access control policies, encryption, audit trails, and breach notification procedures.
                  Consult with qualified HIPAA compliance officers for official determinations.
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4">
              <button
                onClick={() => setShowHIPAAInfo(false)}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
