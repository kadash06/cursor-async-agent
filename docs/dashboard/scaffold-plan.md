# Dashboard Scaffolding Plan

## Overview

This document provides a step-by-step plan for scaffolding the dashboard architecture outlined in `architecture.md`. The plan is designed to be incremental, allowing for easy rollback at any stage, and integrates seamlessly with the existing MCP server codebase.

## Prerequisites

- Node.js 18+ and npm/yarn
- Existing MCP server running and configured
- Git repository with proper branching strategy
- Environment variables configured (see Environment Setup)

## Environment Setup

### Required Environment Variables

Add these to your `.env.local` file in the dashboard directory:

```bash
# Dashboard-specific
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key

# MCP Server Integration
MCP_SERVER_URL=http://localhost:3000
CURSOR_API_KEY=your-cursor-api-key

# Webhook Configuration
WEBHOOK_SECRET=your-webhook-secret
DASHBOARD_WEBHOOK_URL=http://localhost:3001/api/webhooks

# Database (if needed for future features)
DATABASE_URL=postgresql://user:pass@localhost:5432/dashboard
```

## Step-by-Step Scaffolding Commands

### Phase 1: Project Initialization

#### Step 1.1: Create Dashboard Directory Structure
```bash
# Create the dashboard app directory
mkdir -p apps/dashboard

# Initialize Next.js project with TypeScript
cd apps/dashboard
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes

# Remove default files we don't need
rm -rf src/app/globals.css src/app/page.tsx src/app/layout.tsx
```

#### Step 1.2: Install Core Dependencies
```bash
# Core React and Next.js dependencies (already included with create-next-app)
npm install next@14 react@18 react-dom@18

# State management and data fetching
npm install @tanstack/react-query @tanstack/react-query-devtools zustand

# Form handling and validation
npm install react-hook-form @hookform/resolvers zod

# UI components and styling
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select
npm install @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-tooltip
npm install class-variance-authority clsx tailwind-merge lucide-react

# HTTP client and utilities
npm install axios date-fns recharts

# Development dependencies
npm install -D @types/node prettier eslint-config-prettier eslint-plugin-prettier
```

#### Step 1.3: Install shadcn/ui
```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init --yes

# Install essential components
npx shadcn-ui@latest add button card input label textarea select dialog dropdown-menu tabs toast

# Install form components
npx shadcn-ui@latest add form checkbox radio-group switch

# Install data display components
npx shadcn-ui@latest add table badge avatar progress skeleton

# Install navigation components
npx shadcn-ui@latest add sidebar navigation-menu breadcrumb
```

### Phase 2: Core Infrastructure Setup

#### Step 2.1: Configure TypeScript and Build Tools
```bash
# Create tsconfig.json for the dashboard
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

# Configure Tailwind CSS
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
EOF
```

#### Step 2.2: Set Up Core Application Structure
```bash
# Create main application layout
mkdir -p app/(auth) app/dashboard/agents app/api/agents app/api/auth app/api/webhooks
mkdir -p components/ui components/agents components/dashboard components/forms
mkdir -p lib/hooks lib/utils types

# Create root layout
cat > app/layout.tsx << 'EOF'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Cursor Dashboard',
  description: 'Manage your Cursor Background Agents',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
EOF

# Create global styles
cat > app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 84% 4.9%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 94.1%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
EOF
```

#### Step 2.3: Set Up Type Definitions
```bash
# Create shared types
cat > types/index.ts << 'EOF'
export * from './agent'
export * from './api'
EOF

# Create agent types
cat > types/agent.ts << 'EOF'
export interface Agent {
  id: string
  name: string
  status: 'CREATING' | 'RUNNING' | 'FINISHED' | 'ERROR'
  source: {
    repository: string
    ref: string
  }
  target: {
    branchName: string
    url: string
    autoCreatePr: boolean
    prUrl?: string
  }
  createdAt: string
  updatedAt?: string
}

export interface CreateAgentRequest {
  prompt: string
  repository: string
  ref?: string
  webhookUrl?: string
  webhookSecret?: string
}

export interface AgentFilters {
  status?: Agent['status']
  repository?: string
  dateRange?: {
    start: Date
    end: Date
  }
}
EOF

# Create API types
cat > types/api.ts << 'EOF'
export interface ApiResponse<T> {
  data: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ApiKeyInfo {
  apiKeyName: string
  createdAt: string
  userEmail?: string
}
EOF
```

### Phase 3: API Integration Setup

#### Step 3.1: Create API Client
```bash
# Create API client utilities
cat > lib/api.ts << 'EOF'
import axios from 'axios'
import { Agent, CreateAgentRequest, ApiResponse, PaginatedResponse, ApiKeyInfo } from '@/types'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor for authentication
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const agentsApi = {
  // Get all agents with pagination and filters
  async getAgents(params?: {
    page?: number
    limit?: number
    status?: string
    repository?: string
  }): Promise<PaginatedResponse<Agent>> {
    const response = await api.get('/api/agents', { params })
    return response.data
  },

  // Get single agent by ID
  async getAgent(id: string): Promise<ApiResponse<Agent>> {
    const response = await api.get(`/api/agents/${id}`)
    return response.data
  },

  // Create new agent
  async createAgent(data: CreateAgentRequest): Promise<ApiResponse<Agent>> {
    const response = await api.post('/api/agents', data)
    return response.data
  },

  // Update agent (if supported)
  async updateAgent(id: string, data: Partial<Agent>): Promise<ApiResponse<Agent>> {
    const response = await api.put(`/api/agents/${id}`, data)
    return response.data
  },

  // Delete agent (if supported)
  async deleteAgent(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/api/agents/${id}`)
    return response.data
  },
}

export const authApi = {
  // Get current user info
  async getCurrentUser(): Promise<ApiResponse<ApiKeyInfo>> {
    const response = await api.get('/api/auth/me')
    return response.data
  },

  // Login (if implementing custom auth)
  async login(credentials: { email: string; password: string }): Promise<ApiResponse<{ token: string }>> {
    const response = await api.post('/api/auth/login', credentials)
    return response.data
  },
}

export default api
EOF
```

#### Step 3.2: Set Up React Query
```bash
# Create React Query provider
cat > lib/providers.tsx << 'EOF'
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors
              if (error?.response?.status >= 400 && error?.response?.status < 500) {
                return false
              }
              return failureCount < 3
            },
          },
          mutations: {
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
EOF

# Create custom hooks for data fetching
cat > lib/hooks/useAgents.ts << 'EOF'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agentsApi } from '@/lib/api'
import { Agent, CreateAgentRequest } from '@/types'

export function useAgents(params?: {
  page?: number
  limit?: number
  status?: string
  repository?: string
}) {
  return useQuery({
    queryKey: ['agents', params],
    queryFn: () => agentsApi.getAgents(params),
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: ['agent', id],
    queryFn: () => agentsApi.getAgent(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 1000, // Refetch every 10 seconds for real-time updates
  })
}

export function useCreateAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAgentRequest) => agentsApi.createAgent(data),
    onSuccess: () => {
      // Invalidate and refetch agents list
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}

export function useUpdateAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Agent> }) =>
      agentsApi.updateAgent(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate specific agent and agents list
      queryClient.invalidateQueries({ queryKey: ['agent', id] })
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}
EOF
```

### Phase 4: Authentication Setup

#### Step 4.1: Create Authentication Context
```bash
# Create authentication context
cat > lib/auth.tsx << 'EOF'
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { ApiKeyInfo } from '@/types'

interface AuthContextType {
  user: ApiKeyInfo | null
  isLoading: boolean
  login: (token: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiKeyInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing token and validate it
    const token = localStorage.getItem('auth-token')
    if (token) {
      // Validate token with API
      validateToken(token)
    } else {
      setIsLoading(false)
    }
  }, [])

  const validateToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/validate', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        localStorage.removeItem('auth-token')
      }
    } catch (error) {
      localStorage.removeItem('auth-token')
    } finally {
      setIsLoading(false)
    }
  }

  const login = (token: string) => {
    localStorage.setItem('auth-token', token)
    // You might want to decode the token to get user info
    // For now, we'll set a placeholder user
    setUser({
      apiKeyName: 'Current User',
      createdAt: new Date().toISOString(),
    })
  }

  const logout = () => {
    localStorage.removeItem('auth-token')
    setUser(null)
  }

  const value = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
EOF
```

#### Step 4.2: Create Login Page
```bash
# Create login page
cat > app/(auth)/login/page.tsx << 'EOF'
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [apiKey, setApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Validate API key with the MCP server
      const response = await fetch('/api/auth/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      })

      if (response.ok) {
        login(apiKey)
        router.push('/dashboard')
      } else {
        setError('Invalid API key')
      }
    } catch (error) {
      setError('Failed to authenticate. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login to Cursor Dashboard</CardTitle>
          <CardDescription>
            Enter your Cursor API key to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Cursor API key"
                required
              />
            </div>
            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Authenticating...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
EOF
```

### Phase 5: Core Dashboard Pages

#### Step 5.1: Create Dashboard Layout
```bash
# Create dashboard layout
cat > app/dashboard/layout.tsx << 'EOF'
'use client'

import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { Providers } from '@/lib/providers'
import { AuthProvider } from '@/lib/auth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <AuthProvider>
      <Providers>
        <div className="flex h-screen bg-gray-100">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
              {children}
            </main>
          </div>
        </div>
      </Providers>
    </AuthProvider>
  )
}
EOF

# Create dashboard home page
cat > app/dashboard/page.tsx << 'EOF'
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAgents } from '@/lib/hooks/useAgents'
import { Activity, Users, Zap, AlertCircle } from 'lucide-react'

export default function DashboardPage() {
  const { data: agentsResponse, isLoading } = useAgents({ limit: 100 })

  if (isLoading) {
    return <div>Loading dashboard...</div>
  }

  const agents = agentsResponse?.data || []
  const stats = {
    total: agents.length,
    running: agents.filter(a => a.status === 'RUNNING').length,
    finished: agents.filter(a => a.status === 'FINISHED').length,
    error: agents.filter(a => a.status === 'ERROR').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your Cursor Background Agents</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.running}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finished</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.finished}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.error}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Agents */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Agents</CardTitle>
          <CardDescription>Latest background agent activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agents.slice(0, 5).map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium">{agent.name}</h3>
                    <Badge variant={
                      agent.status === 'RUNNING' ? 'default' :
                      agent.status === 'FINISHED' ? 'secondary' :
                      agent.status === 'ERROR' ? 'destructive' : 'outline'
                    }>
                      {agent.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{agent.source.repository}</p>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(agent.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
EOF
```

### Phase 6: API Routes Setup

#### Step 6.1: Create Agent API Routes
```bash
# Create agents API route
cat > app/api/agents/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { cursorClient } from '@/lib/cursor-client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const cursor = searchParams.get('cursor') || undefined

    const result = await cursorClient.listAgents(limit, cursor)

    return NextResponse.json({
      data: result.agents,
      pagination: {
        hasNext: !!result.nextCursor,
        nextCursor: result.nextCursor,
      },
    })
  } catch (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, repository, ref, webhookUrl, webhookSecret } = body

    const launchRequest = {
      prompt: {
        text: prompt,
      },
      source: {
        repository,
        ref: ref || 'main',
      },
      webhook: webhookUrl ? {
        url: webhookUrl,
        secret: webhookSecret,
      } : undefined,
    }

    const result = await cursorClient.launchAgent(launchRequest)

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Error creating agent:', error)
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    )
  }
}
EOF

# Create individual agent API route
cat > app/api/agents/[id]/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'

// Note: The current MCP server doesn't have a get single agent endpoint
// This is a placeholder for future implementation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // For now, return mock data
    // In the future, this would call the MCP server
    const mockAgent = {
      id: params.id,
      name: `Agent ${params.id}`,
      status: 'RUNNING',
      source: {
        repository: 'https://github.com/example/repo',
        ref: 'main',
      },
      target: {
        branchName: `agent-${params.id}`,
        url: 'https://github.com/example/repo',
        autoCreatePr: true,
      },
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json({ data: mockAgent })
  } catch (error) {
    console.error('Error fetching agent:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    )
  }
}
EOF
```

#### Step 6.2: Create Authentication API Routes
```bash
# Create auth validation API route
cat > app/api/auth/validate-key/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { cursorClient } from '@/lib/cursor-client'

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      )
    }

    // Temporarily set the API key for validation
    process.env.CURSOR_API_KEY = apiKey

    try {
      const info = await cursorClient.getApiKeyInfo()
      return NextResponse.json({ data: info })
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Error validating API key:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
EOF
```

### Phase 7: Build and Development Setup

#### Step 7.1: Update package.json Scripts
```bash
# Update package.json with development and build scripts
cat > package.json << 'EOF'
{
  "name": "@cursor/dashboard",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-query-devtools": "^5.0.0",
    "zustand": "^4.4.0",
    "react-hook-form": "^7.45.0",
    "@hookform/resolvers": "^3.1.0",
    "zod": "^3.22.0",
    "axios": "^1.5.0",
    "date-fns": "^2.30.0",
    "recharts": "^2.7.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^1.0.0",
    "@radix-ui/react-select": "^1.0.0",
    "@radix-ui/react-tabs": "^1.0.0",
    "@radix-ui/react-toast": "^1.0.0",
    "@radix-ui/react-tooltip": "^1.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^1.14.0",
    "lucide-react": "^0.292.0",
    "next-themes": "^0.2.0",
    "tailwindcss-animate": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "prettier": "^3.0.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.0",
    "@storybook/nextjs": "^7.0.0",
    "@storybook/addon-essentials": "^7.0.0",
    "@storybook/addon-interactions": "^7.0.0",
    "@storybook/addon-links": "^7.0.0",
    "@storybook/arknight": "^7.0.0",
    "@storybook/manager-api": "^7.0.0",
    "@storybook/preview-api": "^7.0.0",
    "@storybook/theming": "^7.0.0"
  }
}
EOF
```

#### Step 7.2: Create Next.js Configuration
```bash
# Create next.config.js
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*', // Proxy to MCP server
      },
    ]
  },
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
}

module.exports = nextConfig
EOF
```

## Rollback Strategy

### Quick Rollback Commands

#### Phase 1-2 Rollback (Project Setup)
```bash
# Remove the entire dashboard directory
rm -rf apps/dashboard

# Revert package.json changes if using monorepo
# (Manual step: remove dashboard-related dependencies)
```

#### Phase 3 Rollback (API Integration)
```bash
# Remove API-related files
rm -rf apps/dashboard/lib/api.ts
rm -rf apps/dashboard/lib/hooks/
rm -rf apps/dashboard/app/api/

# Keep the UI components and basic structure
```

#### Phase 4 Rollback (Authentication)
```bash
# Remove auth-related files
rm -rf apps/dashboard/lib/auth.tsx
rm -rf apps/dashboard/app/(auth)/

# Restore simple dashboard layout without auth
```

#### Phase 5 Rollback (Dashboard Pages)
```bash
# Remove dashboard pages but keep layout
rm -rf apps/dashboard/app/dashboard/agents/
rm -rf apps/dashboard/app/dashboard/analytics/
rm -rf apps/dashboard/app/dashboard/settings/

# Keep basic dashboard page
```

### Gradual Rollback Strategy

1. **Feature Flags**: Use environment variables to disable features
   ```bash
   # Disable authentication
   DISABLE_AUTH=true

   # Disable real-time updates
   DISABLE_REALTIME=true

   # Disable advanced features
   DISABLE_ADVANCED=true
   ```

2. **Component-Level Rollback**: Replace complex components with simple versions
   ```bash
   # Replace complex agent list with simple table
   # Replace advanced forms with basic forms
   ```

3. **API Rollback**: Fall back to mock data
   ```bash
   # Use mock API responses instead of real API calls
   MOCK_API=true
   ```

### Data Preservation

- **Environment Variables**: Keep `.env.local` intact during rollback
- **User Preferences**: Store preferences in localStorage (automatically preserved)
- **Build Artifacts**: Keep `node_modules` and build cache for quick restoration

### Recovery Commands

```bash
# Quick recovery after rollback
cd apps/dashboard
npm install
npm run dev

# Validate MCP server is still running
curl http://localhost:3000/health

# Test API key validation
curl -X POST http://localhost:3001/api/auth/validate-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"your-api-key"}'
```

## Testing Strategy

### Development Testing
```bash
# Run dashboard in development mode
cd apps/dashboard
npm run dev

# Test with mock data (optional)
npm run dev:mock

# Run linting
npm run lint

# Type checking
npm run type-check
```

### Integration Testing
```bash
# Test with actual MCP server
# 1. Start MCP server on port 3000
cd /workspace
npm run dev

# 2. Start dashboard on port 3001
cd apps/dashboard
npm run dev

# 3. Test API proxying
curl http://localhost:3001/api/agents
```

### Production Readiness Checklist

- [ ] All environment variables configured
- [ ] MCP server running and accessible
- [ ] Authentication working with valid API keys
- [ ] Basic CRUD operations functional
- [ ] Error handling implemented
- [ ] Loading states working
- [ ] Mobile responsive design
- [ ] Accessibility compliance (WCAG 2.1)
- [ ] Performance optimized (Lighthouse score > 90)
- [ ] Security audit passed
- [ ] Documentation updated

This scaffold plan provides a comprehensive, incremental approach to building the dashboard while maintaining the ability to rollback at any stage. The modular structure allows for independent development and testing of each phase.