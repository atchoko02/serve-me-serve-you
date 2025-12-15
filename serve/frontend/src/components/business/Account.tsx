import { useState } from 'react';
import { User, CreditCard, Bell, Shield, LogOut } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';

export function Account() {
  const [profileData, setProfileData] = useState({
    fullName: 'John Doe',
    email: 'john.doe@business.com',
    company: 'Acme Corporation',
    phone: '+1 (555) 123-4567',
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    weeklyReports: true,
    customerAlerts: false,
    productUpdates: true,
  });

  const handleSaveProfile = () => {
    toast.success('Profile updated successfully');
  };

  const handleSaveNotifications = () => {
    toast.success('Notification preferences saved');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-gray-900 mb-2">Account Settings</h1>
        <p className="text-gray-600">
          Manage your account preferences and settings
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal and business details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={profileData.fullName}
                onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                value={profileData.company}
                onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveProfile}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscription & Billing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Subscription & Billing
          </CardTitle>
          <CardDescription>
            Manage your subscription plan and payment methods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div>
              <p className="text-gray-900">Professional Plan</p>
              <p className="text-gray-600 text-sm">$49/month • Unlimited questionnaires</p>
            </div>
            <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm">
              Active
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900">Payment Method</p>
                <p className="text-gray-500 text-sm">Visa ending in 4242</p>
              </div>
              <Button variant="outline" size="sm">Update</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900">Billing History</p>
                <p className="text-gray-500 text-sm">View past invoices and receipts</p>
              </div>
              <Button variant="outline" size="sm">View History</Button>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center pt-2">
            <Button variant="outline">Change Plan</Button>
            <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50">
              Cancel Subscription
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose what updates you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900">Email Notifications</p>
                <p className="text-gray-500 text-sm">Receive email updates about your account</p>
              </div>
              <Switch
                checked={notifications.emailNotifications}
                onCheckedChange={(checked: boolean) => 
                  setNotifications({ ...notifications, emailNotifications: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900">Weekly Reports</p>
                <p className="text-gray-500 text-sm">Get weekly analytics and insights</p>
              </div>
              <Switch
                checked={notifications.weeklyReports}
                onCheckedChange={(checked: boolean) => 
                  setNotifications({ ...notifications, weeklyReports: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900">Customer Alerts</p>
                <p className="text-gray-500 text-sm">Alerts when customers complete questionnaires</p>
              </div>
              <Switch
                checked={notifications.customerAlerts}
                onCheckedChange={(checked: boolean) => 
                  setNotifications({ ...notifications, customerAlerts: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900">Product Updates</p>
                <p className="text-gray-500 text-sm">News about new features and improvements</p>
              </div>
              <Switch
                checked={notifications.productUpdates}
                onCheckedChange={(checked: boolean) => 
                  setNotifications({ ...notifications, productUpdates: checked })
                }
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveNotifications}>Save Preferences</Button>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Security
          </CardTitle>
          <CardDescription>
            Manage your password and security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-900">Password</p>
              <p className="text-gray-500 text-sm">Last changed 3 months ago</p>
            </div>
            <Button variant="outline" size="sm">Change Password</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-900">Two-Factor Authentication</p>
              <p className="text-gray-500 text-sm">Add an extra layer of security</p>
            </div>
            <Button variant="outline" size="sm">Enable 2FA</Button>
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card>
        <CardContent className="pt-6">
          <Button variant="outline" className="w-full" onClick={() => toast.info('Sign out functionality would go here')}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
