import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, FileText, CheckCircle } from 'lucide-react';

type AnalyticsData = {
  totalRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  averageInvoiceValue: number;
  currency: string;
};

export const DashboardAnalytics: React.FC<{
  data?: AnalyticsData;
  loading?: boolean;
}> = ({ data, loading = false }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    averageInvoiceValue: 0,
    currency: 'USDC',
  });

  useEffect(() => {
    if (data) {
      setAnalytics(data);
    }
  }, [data]);

  const formatCurrency = (value: number) => {
    return `${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${analytics.currency}`;
  };

  const MetricCard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendPositive,
  }: {
    title: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    trend?: string;
    trendPositive?: boolean;
  }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Icon className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">{value}</p>
              {trend && (
                <p
                  className={`text-sm ${
                    trendPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {trendPositive ? '↑' : '↓'} {trend}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Dashboard Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={loading ? '...' : formatCurrency(analytics.totalRevenue)}
          icon={DollarSign}
          trend={analytics.totalRevenue > 0 ? '+12% this month' : 'No revenue yet'}
          trendPositive={analytics.totalRevenue > 0}
        />

        <MetricCard
          title="Total Invoices"
          value={loading ? '...' : analytics.totalInvoices.toString()}
          icon={FileText}
          trend={analytics.totalInvoices > 0 ? `${analytics.paidInvoices} paid` : 'No invoices'}
          trendPositive={analytics.paidInvoices > 0}
        />

        <MetricCard
          title="Paid Invoices"
          value={loading ? '...' : analytics.paidInvoices.toString()}
          icon={CheckCircle}
          trend={
            analytics.totalInvoices > 0
              ? `${Math.round((analytics.paidInvoices / analytics.totalInvoices) * 100)}% paid`
              : '0%'
          }
          trendPositive={analytics.paidInvoices > 0}
        />

        <MetricCard
          title="Pending Invoices"
          value={loading ? '...' : analytics.pendingInvoices.toString()}
          icon={TrendingUp}
          trend={analytics.pendingInvoices > 0 ? `Follow up needed` : 'All clear'}
          trendPositive={analytics.pendingInvoices === 0}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Average Invoice Value</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            {loading ? '...' : formatCurrency(analytics.averageInvoiceValue)}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Based on {analytics.totalInvoices} invoices
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
