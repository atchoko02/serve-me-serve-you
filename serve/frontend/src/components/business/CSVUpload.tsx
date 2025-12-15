import React, { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2, Send, CheckCircle2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { uploadCSV } from '../../services/api/csv';
import { getApiErrorMessage } from '../../services/api/client';
import { CSVHeaderDisplay } from '../shared/CSVHeaderDisplay';
import { CSVRowPreview } from '../shared/CSVRowPreview';
import { CSVErrorLog } from '../shared/CSVErrorLog';
import { useAuth } from '../../contexts/AuthContext';

interface CSVUploadProps {
  onProcessData: (data: any) => void;
}

export function CSVUpload({ onProcessData }: CSVUploadProps) {
  const navigate = useNavigate();
  const { businessId, isAuthenticated, role } = useAuth();
  
  // Ensure user is authenticated as business
  if (!isAuthenticated || role !== 'business' || !businessId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Please log in as a business user to upload CSV files.</p>
        </CardContent>
      </Card>
    );
  }
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [successRows, setSuccessRows] = useState<any[]>([]);
  const [errorRows, setErrorRows] = useState<any[]>([]);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [questionnaireCreated, setQuestionnaireCreated] = useState<{ shareableLink: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    // Reset questionnaire created state when new file is selected
    setQuestionnaireCreated(null);
    
    setFileName(file.name);
    setIsUploading(true);
    setIsProcessing(false);
    setSuccessRows([]);
    setErrorRows([]);
    setHeaders([]);
    setUploadResult(null);

    try {
      // Upload CSV to backend
      const result = await uploadCSV(file, businessId, {
        businessName: 'My Business',
        businessEmail: 'business@example.com',
      });

      setUploadResult(result);
      setIsUploading(false);

      // Fetch products to display preview
      if (result.products.stored > 0) {
        setIsProcessing(true);
        try {
          const { getProducts } = await import('../../services/api/csv');
          const productsResponse = await getProducts(businessId);
          
          // Extract headers from product attributes
          if (productsResponse.products.length > 0) {
            const firstProduct = productsResponse.products[0];
            const extractedHeaders = Object.keys(firstProduct.attributes);
            setHeaders(extractedHeaders);
            
            // Convert products to row format for preview
            const rows = productsResponse.products.map(p => 
              extractedHeaders.map(h => String(p.attributes[h] || ''))
            );
            setSuccessRows(rows);
          }
        } catch (error) {
          console.error('Error fetching products:', error);
        }
        setIsProcessing(false);
      }

      // Display CSV errors if any
      if (result.csvErrors.count > 0) {
        setErrorRows(result.csvErrors.samples);
        toast.warning(`CSV uploaded with ${result.csvErrors.count} error(s)`);
      } else {
        toast.success(`CSV uploaded successfully! ${result.products.stored} products stored.`);
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      const errorMessage = getApiErrorMessage(error);
      toast.error(`Failed to upload CSV: ${errorMessage}`);
      setIsUploading(false);
      setErrorRows([
        {
          type: 'UploadError',
          rowIndex: null,
          message: errorMessage,
        },
      ]);
    }
  };

  const handleRemoveFile = () => {
    setFileName(null);
    setHeaders([]);
    setSuccessRows([]);
    setErrorRows([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProcessCSV = async () => {
    if (!uploadResult || uploadResult.products.stored === 0) {
      toast.error('No products to process');
      return;
    }

    setIsProcessing(true);
    toast.success('Building decision tree...');
    
    try {
      // Build tree using backend API
      const { buildTree } = await import('../../services/api/trees');
      const treeResult = await buildTree(businessId);
      
      if (!treeResult || !treeResult.tree || !treeResult.tree.id) {
        throw new Error('Failed to build tree: Invalid response');
      }
      
      // Generate questionnaire
      const { generateQuestionnaire } = await import('../../services/api/questionnaire');
      const questionnaireResult = await generateQuestionnaire(businessId, {
        treeId: treeResult.tree.id,
        name: `Questionnaire for ${fileName}`,
      });

      if (!questionnaireResult || !questionnaireResult.questionnaire) {
        throw new Error('Failed to generate questionnaire: Invalid response');
      }

      // Show success message with shareable link and copy button
      const shareableLink = `${window.location.origin}/q/${questionnaireResult.questionnaire.shareableLink}`;
      
      // Store questionnaire info for display
      setQuestionnaireCreated({
        shareableLink: questionnaireResult.questionnaire.shareableLink,
        name: questionnaireResult.questionnaire.name || `Questionnaire for ${fileName}`,
      });
      
      // Reset processing state first
      setIsProcessing(false);

      // Show success toast with action to view questionnaire
      toast.success(
        `Questionnaire generated successfully!`,
        { 
          duration: 8000,
          action: {
            label: 'View Questionnaires',
            onClick: () => {
              navigate('/business/questionnaires');
            },
          },
        }
      );
      
      // Also show the link in a more visible way
      setTimeout(() => {
        toast.info(
          `Shareable Link: ${shareableLink}`,
          { 
            duration: 10000,
            action: {
              label: 'Copy Link',
              onClick: async () => {
                try {
                  await navigator.clipboard.writeText(shareableLink);
                  toast.success('Link copied to clipboard!');
                } catch (err) {
                  console.error('Failed to copy link:', err);
                  toast.error('Failed to copy link');
                }
              },
            },
          }
        );
      }, 500);

      // Optionally pass data to parent component (for preview/testing)
      if (onProcessData) {
        onProcessData({
          businessId,
          treeId: treeResult.tree.id,
          questionnaireId: questionnaireResult.questionnaire.id,
          shareableLink: questionnaireResult.questionnaire.shareableLink,
          filename: fileName,
          headers: headers,
          productCount: uploadResult.products.stored,
        });
      }

      // Navigate to questionnaires page automatically after a short delay
      setTimeout(() => {
        console.log('Navigating to /business/questionnaires');
        try {
          navigate('/business/questionnaires', { replace: false });
        } catch (navError) {
          console.error('Navigation error:', navError);
          // Fallback: try window.location if navigate fails
          window.location.href = '/business/questionnaires';
        }
      }, 1500);
    } catch (error) {
      console.error('Error processing CSV:', error);
      const errorMessage = getApiErrorMessage(error);
      toast.error(`Failed to process: ${errorMessage}`);
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" />
          Upload Product CSV
        </CardTitle>
        <CardDescription>
          Upload your existing product data in CSV format
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!fileName ? (
          <>
            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              }`}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-900 mb-1">
                    Drop your CSV file here, or click to browse
                  </p>
                  <p className="text-gray-500 text-sm">CSV only • RFC 4180 compliant</p>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="text-center">
              <button className="text-blue-600 hover:text-blue-700 text-sm">
                View example CSV format
              </button>
            </div>
          </>
        ) : (
          <>
            {/* File Info */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    ) : (
                      <FileText className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium">{fileName}</p>
                    <p className="text-gray-600 text-sm">
                      {isUploading
                        ? 'Uploading to server...'
                        : isProcessing
                        ? `Fetching products... ${successRows.length} rows`
                        : uploadResult
                        ? `${uploadResult.products.stored} products stored • ${headers.length} columns`
                        : `${successRows.length} rows • ${headers.length} columns`}
                    </p>
                  </div>
                </div>
                {!isUploading && !isProcessing && (
                  <button
                    onClick={handleRemoveFile}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Upload/Processing Indicator */}
            {(isUploading || isProcessing) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <div>
                    <p className="text-blue-900">
                      {isUploading ? 'Uploading CSV file...' : 'Processing products...'}
                    </p>
                    <p className="text-blue-700 text-sm">
                      {isUploading 
                        ? 'Sending to server for processing'
                        : 'Fetching product data from server'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Result Summary */}
            {!isUploading && !isProcessing && uploadResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="space-y-2">
                  <p className="text-green-900 font-medium">
                    ✅ Upload Complete
                  </p>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>• {uploadResult.products.stored} products stored</p>
                    <p>• Business: {uploadResult.business.name}</p>
                    {uploadResult.csvErrors.count > 0 && (
                      <p className="text-yellow-700">
                        • {uploadResult.csvErrors.count} rows had errors
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Headers */}
            {!isUploading && !isProcessing && headers.length > 0 && (
              <CSVHeaderDisplay headers={headers} />
            )}

            {/* Parsed Rows */}
            {!isUploading && !isProcessing && successRows.length > 0 && (
              <CSVRowPreview
                headers={headers}
                rows={successRows}
                totalRows={successRows.length}
              />
            )}

            {/* Errors */}
            {!isUploading && !isProcessing && errorRows.length > 0 && (
              <CSVErrorLog errors={errorRows} />
            )}

            {/* Success Message - Questionnaire Created */}
            {questionnaireCreated && !isProcessing && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-green-900 font-medium mb-1">
                      Questionnaire Created Successfully!
                    </h3>
                    <p className="text-green-700 text-sm mb-3">
                      {questionnaireCreated.name}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => navigate('/business/questionnaires')}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View All Questionnaires
                      </Button>
                      <Button
                        onClick={() => {
                          const link = `${window.location.origin}/q/${questionnaireCreated.shareableLink}`;
                          window.open(link, '_blank');
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Test Questionnaire
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Process Button - Build Tree & Generate Questionnaire */}
            {!isUploading && !isProcessing && uploadResult && uploadResult.products.stored > 0 && !questionnaireCreated && (
              <>
                <Button
                  onClick={handleProcessCSV}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Building Tree & Generating Questionnaire...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Build Decision Tree & Generate Questionnaire
                    </>
                  )}
                </Button>
                <p className="text-sm text-gray-500 text-center mt-2">
                  This will build a decision tree and create a shareable questionnaire. You'll be redirected to view it.
                </p>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
