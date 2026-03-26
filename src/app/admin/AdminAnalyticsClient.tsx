"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { startOfMonth, subMonths, format, endOfMonth, isWithinInterval } from "date-fns"
import { FileText, CheckCircle, Clock, XCircle, DollarSign, Percent } from "lucide-react"

export type QuotationStatus = 'pending' | 'negotiating' | 'approved' | 'rejected' | 'on_hold'

interface Quotation {
  id: string
  quotation_number: string
  created_at: string
  grand_total: number
  status: QuotationStatus
  profiles: { id: string; full_name: string } | null
}

const COLORS = {
  pending: '#9ca3af',     // gray-400
  negotiating: '#3b82f6', // blue-500
  approved: '#22c55e',    // green-500
  rejected: '#ef4444',    // red-500
  on_hold: '#f59e0b',     // amber-500
}

export default function AdminAnalyticsClient({ quotations }: { quotations: Quotation[] }) {
  // Generate last 12 months for selector
  const monthsList = useMemo(() => {
    const list = []
    const today = new Date()
    for (let i = 0; i < 12; i++) {
        list.push(startOfMonth(subMonths(today, i)))
    }
    return list
  }, [])

  const [selectedMonthStr, setSelectedMonthStr] = useState<string>(monthsList[0].toISOString())
  const selectedMonth = new Date(selectedMonthStr)

  // Filter quotations for the selected month
  const currentMonthQuotations = useMemo(() => {
    const start = startOfMonth(selectedMonth)
    const end = endOfMonth(selectedMonth)
    return quotations.filter(q => {
      const date = new Date(q.created_at)
      return isWithinInterval(date, { start, end })
    })
  }, [quotations, selectedMonth])

  // --- KPI Cards Calculations ---
  const totalQuotations = currentMonthQuotations.length
  const approvedQuotes = currentMonthQuotations.filter(q => q.status === 'approved')
  const pendingNegotiatingQuotes = currentMonthQuotations.filter(q => q.status === 'pending' || q.status === 'negotiating')
  const rejectedQuotes = currentMonthQuotations.filter(q => q.status === 'rejected')
  
  const totalRevenue = approvedQuotes.reduce((sum, q) => sum + (q.grand_total || 0), 0)
  const conversionRate = totalQuotations > 0 ? (approvedQuotes.length / totalQuotations) * 100 : 0

  const kpiStats = [
    { title: "Total Quotations", value: totalQuotations, icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
    { title: "Approved Quotations", value: approvedQuotes.length, icon: CheckCircle, color: "text-green-500", bg: "bg-green-50" },
    { title: "Pending / Negotiating", value: pendingNegotiatingQuotes.length, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
    { title: "Rejected", value: rejectedQuotes.length, icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
    { title: "Total Revenue (Approved)", value: `₹${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-purple-500", bg: "bg-purple-50" },
    { title: "Conversion Rate", value: `${conversionRate.toFixed(1)}%`, icon: Percent, color: "text-teal-500", bg: "bg-teal-50" },
  ]

  // --- Bar Chart: Quotations per week within selected month ---
  const barChartData = useMemo(() => {
    const weeks = [0, 0, 0, 0, 0] // Up to 5 weeks in a month
    currentMonthQuotations.forEach(q => {
      const date = new Date(q.created_at)
      const day = date.getDate()
      const weekIndex = Math.min(Math.floor((day - 1) / 7), 4)
      weeks[weekIndex]++
    })
    return [
      { name: "Week 1", count: weeks[0] },
      { name: "Week 2", count: weeks[1] },
      { name: "Week 3", count: weeks[2] },
      { name: "Week 4", count: weeks[3] },
      { name: "Week 5+", count: weeks[4] },
    ].filter(w => w.count > 0 || w.name !== "Week 5+") // Hide week 5 if 0
  }, [currentMonthQuotations])

  // --- Donut Chart: Status Breakdown ---
  const donutData = useMemo(() => {
    const counts = { pending: 0, negotiating: 0, approved: 0, rejected: 0, on_hold: 0 }
    currentMonthQuotations.forEach(q => {
        if(counts[q.status || 'pending'] !== undefined) {
             counts[q.status || 'pending']++
        }
    })
    return Object.entries(counts)
      .map(([key, value]) => ({ name: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '), value, colorKey: key }))
      .filter(item => item.value > 0)
  }, [currentMonthQuotations])

  // --- Line Chart: 6 Months Revenue Trend (Always visible regardless of month selector) ---
  const lineChartData = useMemo(() => {
    const today = new Date()
    const data = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(today, i))
      const monthEnd = endOfMonth(monthStart)
      
      const approvedThisMonth = quotations.filter(q => {
        const d = new Date(q.created_at)
        return q.status === 'approved' && isWithinInterval(d, { start: monthStart, end: monthEnd })
      })
      
      const revenue = approvedThisMonth.reduce((sum, q) => sum + (q.grand_total || 0), 0)
      data.push({
        name: format(monthStart, "MMM yyyy"),
        Revenue: revenue
      })
    }
    return data
  }, [quotations])

  // --- Leaderboard Table: Top 5 Salespeople ---
  const leaderboardData = useMemo(() => {
    const userStats: Record<string, { name: string; count: number; value: number }> = {}
    
    // Only looking at approved quotes for leaderboard
    approvedQuotes.forEach(q => {
      const userId = q.profiles?.id || 'unknown'
      const userName = q.profiles?.full_name || 'Unknown User'
      
      if (!userStats[userId]) {
        userStats[userId] = { name: userName, count: 0, value: 0 }
      }
      userStats[userId].count++
      userStats[userId].value += (q.grand_total || 0)
    })

    return Object.values(userStats)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [approvedQuotes])


  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-96 flex items-center justify-center text-sm font-medium text-gray-400">Loading analytics...</div>
  }

  return (
    <div className="space-y-8">
      {/* Header and Month Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-black">Analytics Dashboard</h2>
          <p className="text-sm font-medium text-gray-500">In-depth insights into your quotation performance.</p>
        </div>
        <div className="w-[200px]">
          <Select value={selectedMonthStr} onValueChange={setSelectedMonthStr}>
            <SelectTrigger className="bg-white rounded-xl shadow-sm border-gray-200 focus:ring-black">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {monthsList.map(date => (
                <SelectItem key={date.toISOString()} value={date.toISOString()}>
                  {format(date, "MMMM yyyy")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiStats.map((stat, i) => (
          <Card key={i} className="rounded-2xl border-none shadow-sm ring-1 ring-gray-100 bg-white">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-400 mb-1">{stat.title}</p>
                <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              </div>
              <div className={`p-4 rounded-xl ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bar Chart */}
        <Card className="rounded-3xl border-none shadow-sm ring-1 ring-gray-100 bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-black tracking-tight">Quotations per Week</CardTitle>
            <CardDescription className="text-xs font-bold text-gray-400">Activity for {format(selectedMonth, "MMMM yyyy")}</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             {barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: "#9CA3AF" }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: "#9CA3AF" }} />
                    <Tooltip cursor={{ fill: "#F3F4F6" }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" fill="#000000" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm font-bold text-gray-400">No quotations this month.</div>
              )}
          </CardContent>
        </Card>

        {/* Donut Chart */}
        <Card className="rounded-3xl border-none shadow-sm ring-1 ring-gray-100 bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-black tracking-tight">Status Breakdown</CardTitle>
            <CardDescription className="text-xs font-bold text-gray-400">Distribution for {format(selectedMonth, "MMMM yyyy")}</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {donutData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value">
                    {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.colorKey as keyof typeof COLORS] || '#000'} />
                    ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                </PieChart>
                </ResponsiveContainer>
             ) : (
                <div className="h-full flex items-center justify-center text-sm font-bold text-gray-400">No data available.</div>
             )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Line Chart */}
        <Card className="rounded-3xl border-none shadow-sm ring-1 ring-gray-100 bg-white lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-black tracking-tight">Revenue Trend (Last 6 Months)</CardTitle>
            <CardDescription className="text-xs font-bold text-gray-400">Total value of approved quotations</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: "#9CA3AF" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: "#9CA3AF" }} width={80} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                />
                <Line type="monotone" dataKey="Revenue" stroke="#8b5cf6" strokeWidth={4} dot={{ r: 6, fill: "#8b5cf6", strokeWidth: 2, stroke: "#ffffff" }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="rounded-3xl border-none shadow-sm ring-1 ring-gray-100 bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-black tracking-tight">Top Performers</CardTitle>
            <CardDescription className="text-xs font-bold text-gray-400">By approved value in {format(selectedMonth, "MMMM")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="border-b-gray-100 hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Salesperson</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Quotes</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboardData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-sm font-bold text-gray-400">No approved quotations.</TableCell>
                    </TableRow>
                  ) : (
                    leaderboardData.map((user, i) => (
                      <TableRow key={i} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
                               {user.name.charAt(0)}
                            </div>
                            <span className="text-xs font-bold text-black">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-gray-500">{user.count}</TableCell>
                        <TableCell className="text-right text-xs font-black text-emerald-600">
                          ₹{user.value.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
