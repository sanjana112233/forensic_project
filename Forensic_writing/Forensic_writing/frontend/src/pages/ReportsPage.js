import React, { useState } from 'react';
import { FileText, Eye, Download, Zap, X, FileDown } from 'lucide-react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { toast } from 'react-toastify';

const ReportsPage = () => {
  const navigate = useNavigate();
  const [downloadModal, setDownloadModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  
  const { data: reportsData, isLoading, error, refetch } = useQuery(
    ['reports'],
    async () => {
      const response = await axios.get('/api/reports?limit=50');
      return response.data;
    },
    {
      refetchInterval: 5000 // Refresh every 5 seconds to show status updates
    }
  );

  const handleViewReport = (reportId) => {
    navigate(`/reports/${reportId}`);
  };

  const handleDownloadReport = (report) => {
    setSelectedReport(report);
    setDownloadModal(true);
  };

  const handleCloseDownloadModal = () => {
    setDownloadModal(false);
    setSelectedReport(null);
    setSelectedFormat('pdf');
  };

  const handleConfirmDownload = async () => {
    try {
      // First, let's try to get the file info to check if the format is supported
      console.log(`Attempting to download report ${selectedReport._id} in ${selectedFormat} format`);
      
      const config = {
        responseType: 'blob',
        timeout: 30000, // 30 second timeout
        headers: {
          'Accept': selectedFormat === 'xlsx' 
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : selectedFormat === 'docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/pdf',
          'Content-Type': 'application/json'
        }
      };

      const response = await axios.get(
        `/api/reports/${selectedReport._id}/download?format=${selectedFormat}`, 
        config
      );
      
      console.log('Download response received:', {
        status: response.status,
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length'],
        dataSize: response.data.size
      });

      // Check if we actually received data
      if (!response.data || response.data.size === 0) {
        throw new Error('No data received from server');
      }

      // Check content type from server response
      const serverContentType = response.headers['content-type'];
      console.log('Server content type:', serverContentType);

      // Get the correct MIME type for the blob based on format
      let mimeType;
      switch (selectedFormat) {
        case 'xlsx':
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case 'docx':
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case 'pdf':
          mimeType = 'application/pdf';
          break;
        default:
          mimeType = 'application/octet-stream';
      }

      // Use server content type if it matches our expected format, otherwise use our default
      const finalMimeType = serverContentType && serverContentType.includes(selectedFormat) 
        ? serverContentType 
        : mimeType;

      console.log('Using MIME type:', finalMimeType);

      // Create blob with correct MIME type
      const blob = new Blob([response.data], { type: finalMimeType });
      
      // Verify blob was created successfully
      if (blob.size === 0) {
        throw new Error('Failed to create blob - file may be corrupted');
      }

      console.log('Blob created successfully:', { size: blob.size, type: blob.type });

      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      
      // Generate proper filename with correct extension
      const reportTitle = selectedReport.title || 'Report';
      const sanitizedTitle = reportTitle.replace(/[^a-zA-Z0-9\s-_]/g, '').trim() || 'Report';
      const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const fileName = `${sanitizedTitle}_${timestamp}.${selectedFormat}`;
      
      link.setAttribute('download', fileName);
      link.style.display = 'none';
      
      console.log('Triggering download:', fileName);
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup with delay to ensure download starts
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      toast.success(`Report downloaded successfully as ${selectedFormat.toUpperCase()}`);
      handleCloseDownloadModal();
      
    } catch (err) {
      console.error('Download error details:', {
        message: err.message,
        response: err.response,
        status: err.response?.status,
        statusText: err.response?.statusText,
        headers: err.response?.headers
      });
      
      // More specific error messages based on the error type
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        toast.error('Download timeout - the file may be too large or server is busy');
      } else if (err.response?.status === 404) {
        toast.error('Report not found or not available for download');
      } else if (err.response?.status === 400) {
        toast.error(`${selectedFormat.toUpperCase()} format is not supported for this report`);
      } else if (err.response?.status === 500) {
        toast.error('Server error while generating the report. Please try PDF format.');
      } else if (err.message.includes('No data received')) {
        toast.error('No file data received from server. Please try again.');
      } else if (err.message.includes('corrupted')) {
        toast.error('File appears to be corrupted. Please try a different format.');
      } else {
        toast.error(`Failed to download report in ${selectedFormat.toUpperCase()} format. Try PDF instead.`);
      }
      
      // If DOCX or XLSX fails, suggest PDF as alternative
      if (selectedFormat !== 'pdf') {
        setTimeout(() => {
          toast.info('Tip: PDF format is most reliable for downloads');
        }, 2000);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Error loading reports: {error.message}</p>
        <button
          onClick={() => refetch()}
          className="btn-primary mt-4"
        >
          Retry
        </button>
      </div>
    );
  }

  const reports = reportsData?.reports || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-100">Reports</h1>
          <p className="text-dark-300 mt-2">Generate and manage forensic reports</p>
        </div>
        <button
          onClick={() => navigate('/cases')}
          className="btn-primary"
        >
          <Zap className="h-4 w-4 mr-2" />
          Generate New Report
        </button>
      </div>

      {reports.length > 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="table-container">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th>Report ID</th>
                    <th>Title</th>
                    <th>Case</th>
                    <th>Status</th>
                    <th>Generated By</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {reports.map((report) => {
                    const statusColors = {
                      draft: 'bg-gray-100 text-gray-800',
                      processing: 'bg-orange-100 text-orange-800',
                      completed: 'bg-blue-100 text-blue-800',
                      finalized: 'bg-green-100 text-green-800'
                    };

                    return (
                      <tr key={report._id}>
                        <td>
                          <span className="font-mono text-sm text-dark-300">
                            {report.reportId || report._id.substring(0, 8)}
                          </span>
                        </td>
                        <td>
                          <p className="font-medium text-dark-100">{report.title}</p>
                        </td>
                        <td>
                          <span className="text-sm text-dark-300">
                            {report.caseId?.caseId || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${statusColors[report.status] || statusColors.draft}`}>
                            {report.status}
                          </span>
                        </td>
                        <td>
                          <span className="text-sm text-dark-300">
                            {report.generatedBy?.firstName} {report.generatedBy?.lastName}
                          </span>
                        </td>
                        <td>
                          <span className="text-sm text-dark-300">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td>
                          <div className="flex space-x-2">
                            <button
                              className="text-primary-400 hover:text-primary-300"
                              onClick={() => handleViewReport(report._id)}
                              title="View Report"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {report.status === 'completed' || report.status === 'finalized' ? (
                              <button
                                className="text-primary-400 hover:text-primary-300"
                                onClick={() => handleDownloadReport(report)}
                                title="Download Report"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body text-center py-12">
            <FileText className="h-16 w-16 text-dark-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-dark-100 mb-2">No reports generated yet</h3>
            <p className="text-dark-400 mb-6">Start by selecting a case to generate your first forensic report</p>
            <button
              onClick={() => navigate('/cases')}
              className="btn-primary inline-flex items-center"
            >
              <Zap className="h-4 w-4 mr-2" />
              Generate First Report
            </button>
          </div>
        </div>
      )}

      {/* DOWNLOAD REPORT MODAL */}
      {downloadModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-900 rounded-lg p-6 w-full max-w-4xl mx-4 border border-dark-700">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <FileDown className="h-6 w-6 text-indigo-400 mr-3" />
                <h3 className="text-xl font-semibold text-white">Download Report</h3>
              </div>
              <button 
                onClick={handleCloseDownloadModal}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Report Preview */}
              <div className="bg-white rounded-lg p-6 border">
                {/* NEXUS Logo and Header */}
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-white font-bold text-lg">N</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">NEXUS</h4>
                    <p className="text-sm text-indigo-600">FORENSIC AI</p>
                  </div>
                </div>

                {/* Report Title */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {selectedReport.title || 'Case Summary Report'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {selectedReport.caseId?.caseId || 'CASE-2025-0012'}
                  </p>
                </div>

                {/* Report Content Preview */}
                <div className="space-y-4 text-sm text-gray-700">
                  <div>
                    <h3 className="font-semibold mb-2">1. Case Overview</h3>
                    <p className="text-xs leading-relaxed">
                      This report contains the summary of the case including evidence, analysis and timeline.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">2. Key Findings</h3>
                    <ul className="text-xs space-y-1 ml-4">
                      <li>• Digital evidence extracted successfully</li>
                      <li>• No tampering detected</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">3. Conclusion</h3>
                    <p className="text-xs leading-relaxed">
                      All findings are consistent with the investigation.
                    </p>
                  </div>
                </div>

                {/* Page indicator */}
                <div className="mt-6 pt-4 border-t text-center">
                  <span className="text-xs text-gray-500">Page 1 of 12</span>
                </div>
              </div>

              {/* Report Details */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Report Details</h4>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">Report Name</p>
                        <p className="text-white font-medium">
                          {selectedReport.title || 'Case Summary Report'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Type</p>
                        <p className="text-white font-medium">Case Report</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">Case ID</p>
                        <p className="text-white font-medium">
                          {selectedReport.caseId?.caseId || 'CASE-2025-0012'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Generated By</p>
                        <p className="text-white font-medium">
                          {selectedReport.generatedBy?.firstName} {selectedReport.generatedBy?.lastName || 'Admin User'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">Generated On</p>
                        <p className="text-white font-medium">
                          {new Date(selectedReport.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Pages</p>
                        <p className="text-white font-medium">12</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-400">File Size</p>
                      <p className="text-white font-medium">1.24 MB</p>
                    </div>
                  </div>
                </div>

                {/* Format Selection */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Choose Format</h4>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {/* PDF Option */}
                    <button
                      onClick={() => setSelectedFormat('pdf')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedFormat === 'pdf'
                          ? 'border-indigo-500 bg-indigo-500 bg-opacity-20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
                          <FileText className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-white">PDF</span>
                      </div>
                    </button>

                    {/* DOCX Option */}
                    <button
                      onClick={() => setSelectedFormat('docx')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedFormat === 'docx'
                          ? 'border-indigo-500 bg-indigo-500 bg-opacity-20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                          <FileText className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-white">DOCX</span>
                      </div>
                    </button>

                    {/* XLSX Option */}
                    <button
                      onClick={() => setSelectedFormat('xlsx')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedFormat === 'xlsx'
                          ? 'border-indigo-500 bg-indigo-500 bg-opacity-20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
                          <FileText className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-white">XLSX</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end space-x-3 pt-6">
                  <button
                    onClick={handleCloseDownloadModal}
                    className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDownload}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;