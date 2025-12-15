// Business Export Page
import { useState } from 'react';
import { useBusiness } from '../../contexts/BusinessContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { FileDown, Download, Loader2 } from 'lucide-react';
import { exportAnalytics } from '../../services/api/export';
import { getApiErrorMessage } from '../../services/api/client';
import { toast } from 'sonner';

export function ExportPage() {
  const { businessId } = useBusiness();
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleExport = async (type: 'preferences' | 'recommendations' | 'full-report' | 'raw-data') => {
    if (!businessId) {
      toast.error('No business ID available');
      return;
    }

    setIsExporting(type);
    try {
      const blob = await exportAnalytics(businessId, type);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename based on type
      const filename = `analytics-${type}-${new Date().toISOString().split('T')[0]}.${
        type === 'full-report' ? 'pdf' : 'csv'
      }`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Exported ${type} successfully`);
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error(`Failed to export: ${getApiErrorMessage(error)}`);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-gray-900 mb-2 text-3xl font-bold">Export Analytics</h1>
        <p className="text-gray-600">
          Download your customer preference data and analytics reports
        </p>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileDown className="w-5 h-5" />
              Customer Preferences Report
            </CardTitle>
            <CardDescription>
              CSV file with popular choices, attribute preferences, and completion statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => handleExport('preferences')}
              disabled={isExporting !== null}
              className="w-full"
            >
              {isExporting === 'preferences' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileDown className="w-5 h-5" />
              Product Recommendations Report
            </CardTitle>
            <CardDescription>
              CSV file with most recommended products, frequencies, and average scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => handleExport('recommendations')}
              disabled={isExporting !== null}
              className="w-full"
            >
              {isExporting === 'recommendations' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileDown className="w-5 h-5" />
              Full Analytics Report
            </CardTitle>
            <CardDescription>
              PDF report with complete analytics dashboard, charts, and executive summary
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => handleExport('full-report')}
              disabled={isExporting !== null}
              className="w-full"
            >
              {isExporting === 'full-report' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileDown className="w-5 h-5" />
              Raw Data Export
            </CardTitle>
            <CardDescription>
              CSV file with all customer responses and recommendations for data analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => handleExport('raw-data')}
              disabled={isExporting !== null}
              className="w-full"
            >
              {isExporting === 'raw-data' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

