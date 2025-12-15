import { useState, useEffect } from 'react';
import { Users, TrendingUp, MousePointerClick, Clock, User, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { getBusinessAnalytics } from '../../services/api/analytics';
import { getApiErrorMessage } from '../../services/api/client';
import { useBusiness } from '../../contexts/BusinessContext';

export function CustomerInsights() {
  const { businessId, isLoading: businessLoading } = useBusiness();
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (businessLoading || !businessId) {
        setIsLoading(true);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await getBusinessAnalytics(businessId);
        if (response && response.analytics) {
          setAnalytics(response.analytics);
        } else {
          setAnalytics(null);
        }
      } catch (err) {
        console.error('Error loading analytics:', err);
        const errorMsg = getApiErrorMessage(err);
        setError(errorMsg);
        // Fall back to mock data if API fails
        setAnalytics(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [businessId, businessLoading]);

  const handleRefresh = async () => {
    if (!businessId) {
      setError('No business ID available');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getBusinessAnalytics(businessId);
      if (response && response.analytics) {
        setAnalytics(response.analytics);
      } else {
        setAnalytics(null);
      }
    } catch (err) {
      console.error('Error refreshing analytics:', err);
      const errorMsg = getApiErrorMessage(err);
      setError(errorMsg);
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Use real data if available, otherwise use mock data
  const totalCompletions = (analytics && typeof analytics.completedResponses === 'number') ? analytics.completedResponses : 0;
  const completionRate = (analytics && typeof analytics.completionRate === 'number') 
    ? (analytics.completionRate * 100).toFixed(1) 
    : '0.0';
  const avgTimeMinutes = (analytics && typeof analytics.averageDuration === 'number')
    ? (analytics.averageDuration / 60000).toFixed(1)
    : '0.0';
  const totalResponses = (analytics && typeof analytics.totalResponses === 'number') ? analytics.totalResponses : 0;

  // Convert popular choices to chart format
  const popularChoicesData = (analytics?.popularChoices && analytics.popularChoices.length > 0)
    ? analytics.popularChoices.slice(0, 4).map((choice: any) => ({
        name: `${choice.attribute || 'Unknown'} (${choice.choice || 'unknown'})`,
        value: choice.count || 0,
      }))
    : [
        { name: 'No data', value: 1 },
      ];

  // Mock time data (we don't have daily breakdown yet)
  const timeData = [
    { day: 'Mon', avgTime: parseFloat(avgTimeMinutes) || 0 },
    { day: 'Tue', avgTime: parseFloat(avgTimeMinutes) || 0 },
    { day: 'Wed', avgTime: parseFloat(avgTimeMinutes) || 0 },
    { day: 'Thu', avgTime: parseFloat(avgTimeMinutes) || 0 },
    { day: 'Fri', avgTime: parseFloat(avgTimeMinutes) || 0 },
    { day: 'Sat', avgTime: parseFloat(avgTimeMinutes) || 0 },
    { day: 'Sun', avgTime: parseFloat(avgTimeMinutes) || 0 },
  ];

  // Mock completion data (we don't have monthly breakdown yet)
  const completionData = [
    { month: 'Jan', completed: totalCompletions, abandoned: Math.max(0, totalResponses - totalCompletions) },
  ];

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Customer Insights</h1>
          <p className="text-gray-600">
            Analyze how customers interact with your decision tree questionnaires
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isLoading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">Error loading analytics: {error}</p>
            <p className="text-red-600 text-sm mt-2">Showing mock data. Complete some questionnaires to see real analytics.</p>
          </CardContent>
        </Card>
      )}

      {isLoading && !analytics && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">Loading analytics...</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Completions</p>
                <p className="text-gray-900 text-2xl">{totalCompletions.toLocaleString()}</p>
                <p className="text-gray-500 text-sm mt-1">out of {totalResponses.toLocaleString()} responses</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Completion Rate</p>
                <p className="text-gray-900 text-2xl">{completionRate}%</p>
                <p className="text-gray-500 text-sm mt-1">{totalCompletions} completed</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Avg. Time</p>
                <p className="text-gray-900 text-2xl">{avgTimeMinutes} min</p>
                <p className="text-gray-500 text-sm mt-1">per questionnaire</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Responses</p>
                <p className="text-gray-900 text-2xl">{totalResponses.toLocaleString()}</p>
                <p className="text-gray-500 text-sm mt-1">all questionnaires</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <MousePointerClick className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Completion Trends</CardTitle>
            <CardDescription>Monthly questionnaire completions vs abandonments</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={completionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Bar dataKey="completed" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                <Bar dataKey="abandoned" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popular Choices</CardTitle>
            <CardDescription>Most selected options across all questionnaires</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={popularChoicesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {popularChoicesData.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <Card>
        <CardHeader>
          <CardTitle>Average Completion Time</CardTitle>
          <CardDescription>How long users take to complete questionnaires by day</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" stroke="#6b7280" />
              <YAxis stroke="#6b7280" label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Line type="monotone" dataKey="avgTime" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest questionnaire completions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { user: 'Anonymous User', time: '2 minutes ago', result: 'Found matching product' },
              { user: 'Anonymous User', time: '15 minutes ago', result: 'Found matching product' },
              { user: 'Anonymous User', time: '32 minutes ago', result: 'Found matching product' },
              { user: 'Anonymous User', time: '1 hour ago', result: 'Exited early' },
              { user: 'Anonymous User', time: '2 hours ago', result: 'Found matching product' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-gray-900">{activity.user}</p>
                    <p className="text-gray-500 text-sm">{activity.time}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm ${
                  activity.result === 'Found matching product' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {activity.result}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}