import { defineStore } from 'pinia'

export interface Portfolio {
  id: string
  name: string
  description?: string
  currency?: string
  cashBalance?: number
  isDefault: boolean
  userId: string
  createdAt: string
  updatedAt: string
  athValue?: number | null
  athDate?: string | null
}

export interface Transaction {
  id: string
  portfolioId: string
  symbol: string
  isin?: string | null
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  currency?: string
  date: string
  fees?: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Holding {
  id: string
  portfolioId: string
  symbol: string
  isin?: string | null
  instrumentName: string
  quantity: number
  avgPrice: number
  currency?: string
  currentPrice?: number | null
  regularMarketChange?: number | null
  regularMarketChangePercent?: number | null
  regularMarketPreviousClose?: number | null
  regularMarketTime?: string | null
  lastUpdated?: string | null
  updatedAt: string
}

export interface PortfolioState {
  portfolios: Portfolio[]
  publicPortfolios: Portfolio[]
  currentPortfolio: Portfolio | null
  transactions: Transaction[]
  holdings: Holding[]
  loading: boolean
  initializing: boolean
  loadingTransactions: boolean
  loadingHoldings: boolean
  error: string | null
  lastUpdated: number // Timestamp for reactive updates
}

export interface CreatePortfolioData {
  name: string
  description?: string
  currency?: string
  isDefault?: boolean
}

export interface CreateTransactionData {
  symbol: string
  isin?: string
  type: 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAWAL' | 'SPLIT' | 'EXCHANGE_IN' | 'EXCHANGE_OUT'
  quantity: number
  price: number
  currency?: string
  date: string
  fee?: number
  notes?: string
}

export const usePortfolioStore = defineStore('portfolio', {
  state: (): PortfolioState => ({
    portfolios: [],
    publicPortfolios: [],
    currentPortfolio: null,
    transactions: [],
    holdings: [],
    loading: false,
    initializing: false,
    loadingTransactions: false,
    loadingHoldings: false,
    error: null,
    lastUpdated: Date.now()
  }),

  getters: {
    // Calculate market value (securities only, no cash)
    marketValue: (state): number => {
      return state.holdings.reduce((total, holding) => {
        return total + (holding.quantity * (holding.currentPrice || holding.avgPrice))
      }, 0)
    },

    // Calculate total portfolio value including cash balance
    totalValue: (state): number => {
      const securitiesValue = state.holdings.reduce((total, holding) => {
        return total + (holding.quantity * (holding.currentPrice || holding.avgPrice))
      }, 0)
      const cashBalance = state.currentPortfolio?.cashBalance || 0
      return securitiesValue + cashBalance
    },

    // Calculate total gain/loss
    totalGainLoss: (state): number => {
      return state.holdings.reduce((total, holding) => {
        const currentValue = holding.quantity * (holding.currentPrice || holding.avgPrice)
        const costBasis = holding.quantity * holding.avgPrice
        return total + (currentValue - costBasis)
      }, 0)
    },

    // Calculate percentage gain/loss
    totalGainLossPercentage: (state): number => {
      const costBasis = state.holdings.reduce((total, holding) => {
        return total + (holding.quantity * holding.avgPrice)
      }, 0)

      if (costBasis === 0) return 0

      const currentValue = state.holdings.reduce((total, holding) => {
        return total + (holding.quantity * (holding.currentPrice || holding.avgPrice))
      }, 0)

      return ((currentValue - costBasis) / costBasis) * 100
    },

    // Get transactions for current portfolio
    portfolioTransactions: (state): Transaction[] => {
      if (!state.currentPortfolio) return []
      return state.transactions.filter(t => t.portfolioId === state.currentPortfolio!.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    },

    // Get holdings for current portfolio
    portfolioHoldings: (state): Holding[] => {
      if (!state.currentPortfolio) return []
      return state.holdings.filter(h => h.portfolioId === state.currentPortfolio!.id)
        .sort((a, b) => b.quantity * (b.currentPrice || b.avgPrice) - a.quantity * (a.currentPrice || a.avgPrice))
    },

    // Check if user can manage portfolios (admin or portfolio admin)
    canManagePortfolios: (): boolean => {
      // This will be used by components via the auth composable
      // For now, return false as the auth composable will handle this
      return false
    },

    // Get all portfolios (public + user's private if authenticated)
    allPortfolios: (state): Portfolio[] => {
      // Combine public portfolios with user's private ones, removing duplicates
      const allPortfolios = [...state.publicPortfolios]
      state.portfolios.forEach(portfolio => {
        if (!allPortfolios.find(p => p.id === portfolio.id)) {
          allPortfolios.push(portfolio)
        }
      })
      return allPortfolios.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1
        if (!a.isDefault && b.isDefault) return 1
        return a.name.localeCompare(b.name)
      })
    }
  },

  actions: {
    async initialize(): Promise<void> {
      try {
        this.initializing = true
        // Always fetch public portfolios
        await this.fetchPublicPortfolios()

        // Try to initialize user data if authenticated (will fail silently if not authenticated)
        try {
          await this.initializeUser()
        } catch {
          // User not authenticated, that's fine
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error occurred'
        console.error('Failed to initialize:', error)
      } finally {
        this.initializing = false
      }
    },

    async initializeUser(): Promise<void> {
      try {
        this.loading = true
        await this.fetchPortfolios()

        // Set default portfolio if available
        if (this.portfolios.length > 0) {
          const defaultPortfolio = this.portfolios.find(p => p.isDefault) || this.portfolios[0]
          if (defaultPortfolio) {
            await this.setCurrentPortfolio(defaultPortfolio.id)
          }
        }
      } catch (error) {
        // Check if it's an authentication error
        if (error && typeof error === 'object' && 'statusCode' in error && (error as Error & { statusCode: number }).statusCode === 401) {
          console.log('Authentication failed, user not logged in')
          this.portfolios = []
          return
        }
        this.error = error instanceof Error ? error.message : 'Unknown error occurred'
        console.error('Failed to initialize user:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchPublicPortfolios(): Promise<void> {
      try {
        const response = await $fetch<{ data: Portfolio[] }>('/api/public/portfolios')
        this.publicPortfolios = response.data || []
      } catch (error) {
        console.error('Failed to fetch public portfolios:', error)
        // Don't throw error for public portfolios - it's not critical
      }
    },

    async fetchSpecificPortfolio(portfolioId: string): Promise<Portfolio | null> {
      try {
        const response = await $fetch<{ data: Portfolio }>(`/api/public/portfolios/${portfolioId}`)
        if (response.data) {
          // Check if it's already in public portfolios
          const existingIndex = this.publicPortfolios.findIndex(p => p.id === portfolioId)
          if (existingIndex >= 0) {
            // Update existing
            this.publicPortfolios[existingIndex] = response.data
          } else {
            // Add new
            this.publicPortfolios.push(response.data)
          }
          return response.data
        }
        return null
      } catch (error) {
        console.error('Failed to fetch specific portfolio:', error)
        return null
      }
    },

    async fetchPortfolios(): Promise<void> {
      try {
        // Get request headers for SSR authentication
        const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}

        // Try to fetch authenticated portfolios first
        try {
          const response = await $fetch<{ data: Portfolio[] }>('/api/portfolios', {
            headers: headers as HeadersInit
          })
          this.portfolios = response.data || []
          return
        } catch (authError) {
          // If it's a 401 error, fall back to public portfolios
          if (authError && typeof authError === 'object' && 'statusCode' in authError && (authError as Error & { statusCode: number }).statusCode === 401) {
            console.log('Not authenticated, fetching public portfolios instead')
            // Fetch public portfolios and populate the main portfolios array for fallback
            const publicResponse = await $fetch<{ data: Portfolio[] }>('/api/public/portfolios')
            this.portfolios = publicResponse.data || []
            this.publicPortfolios = publicResponse.data || []
            return
          }
          // Re-throw non-authentication errors
          throw authError
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to fetch portfolios'
        throw error
      }
    },

    async loadAllPortfolios(): Promise<void> {
      try {
        // Don't set main loading state for admin operations to avoid UI flickering
        await this.fetchPortfolios()
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to load portfolios'
        throw error
      }
    },

    async createPortfolio(portfolioData: CreatePortfolioData): Promise<Portfolio> {
      try {
        this.loading = true
        // Get request headers for SSR authentication
        const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}

        const response = await $fetch<{ data: Portfolio }>('/api/portfolios', {
          method: 'POST',
          headers: headers as HeadersInit,
          body: portfolioData
        })

        this.portfolios.push(response.data)

        // Set as current if it's the first portfolio
        if (this.portfolios.length === 1) {
          await this.setCurrentPortfolio(response.data.id)
        }

        return response.data
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to create portfolio'
        throw error
      } finally {
        this.loading = false
      }
    },

    async updatePortfolio(portfolioId: string, portfolioData: Partial<CreatePortfolioData>): Promise<Portfolio> {
      try {
        this.loading = true
        // Get request headers for SSR authentication
        const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}

        const response = await $fetch<{ data: Portfolio }>(`/api/portfolios/${portfolioId}`, {
          method: 'PUT' as const,
          headers: headers as HeadersInit,
          body: portfolioData
        })

        console.log('Update portfolio response:', response)

        // Update the portfolio in both portfolios and publicPortfolios arrays
        const updatedPortfolio = response.data

        // If this portfolio is being set as default, update other portfolios
        if (updatedPortfolio.isDefault) {
          // Set all other portfolios to not default
          this.portfolios = this.portfolios.map(p =>
            p.id === portfolioId ? updatedPortfolio : { ...p, isDefault: false }
          )
          this.publicPortfolios = this.publicPortfolios.map(p =>
            p.id === portfolioId ? updatedPortfolio : { ...p, isDefault: false }
          )
        } else {
          // Update in portfolios array
          const portfolioIndex = this.portfolios.findIndex(p => p.id === portfolioId)
          if (portfolioIndex !== -1) {
            this.portfolios[portfolioIndex] = updatedPortfolio
          }

          // Update in publicPortfolios array
          const publicPortfolioIndex = this.publicPortfolios.findIndex(p => p.id === portfolioId)
          if (publicPortfolioIndex !== -1) {
            this.publicPortfolios[publicPortfolioIndex] = updatedPortfolio
          }
        }

        // Update currentPortfolio if it's the one being updated
        if (this.currentPortfolio && this.currentPortfolio.id === portfolioId) {
          this.currentPortfolio = updatedPortfolio
        }

        console.log('Portfolio updated successfully in store')
        return updatedPortfolio
      } catch (error) {
        console.error('Store updatePortfolio error:', error)
        this.error = error instanceof Error ? error.message : 'Failed to update portfolio'
        throw error
      } finally {
        this.loading = false
      }
    },

    async deletePortfolio(portfolioId: string): Promise<void> {
      try {
        this.loading = true
        // Get request headers for SSR authentication
        const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}

        await $fetch(`/api/portfolios/${portfolioId}`, {
          method: 'DELETE' as const,
          headers: headers as HeadersInit
        })

        // Remove the portfolio from both arrays
        this.portfolios = this.portfolios.filter(p => p.id !== portfolioId)
        this.publicPortfolios = this.publicPortfolios.filter(p => p.id !== portfolioId)

        // Clear currentPortfolio if it's the one being deleted
        if (this.currentPortfolio && this.currentPortfolio.id === portfolioId) {
          this.currentPortfolio = null
          this.transactions = []
          this.holdings = []
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to delete portfolio'
        throw error
      } finally {
        this.loading = false
      }
    },

    async setCurrentPortfolio(portfolioId: string): Promise<void> {
      try {
        // Don't show main loading spinner for portfolio switches
        this.currentPortfolio = this.allPortfolios.find(p => p.id === portfolioId) || null

        if (this.currentPortfolio) {
          // Use granular loading states instead of main loading
          this.loadingTransactions = true
          this.loadingHoldings = true

          await Promise.all([
            this.fetchTransactions(portfolioId),
            this.fetchHoldings(portfolioId)
          ])
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to set current portfolio'
        throw error
      } finally {
        this.loadingTransactions = false
        this.loadingHoldings = false
      }
    },

    async fetchTransactions(portfolioId: string): Promise<void> {
      try {
        // Try authenticated endpoint first, fall back to public endpoint
        let response: { data: Transaction[] }
        try {
          // Get request headers for SSR authentication
          const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}
          response = await $fetch<{ data: Transaction[] }>(`/api/portfolios/${portfolioId}/transactions`, {
            headers: headers as HeadersInit
          })
        } catch {
          // If authenticated endpoint fails, try public endpoint
          response = await $fetch<{ data: Transaction[] }>(`/api/public/portfolios/${portfolioId}/transactions`)
        }
        this.transactions = response.data || []
        this.updateTimestamp()
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to fetch transactions'
        throw error
      }
    },

    async fetchHoldings(portfolioId: string): Promise<void> {
      try {
        console.log('[HOLDINGS] Starting holdings fetch...')
        this.loadingHoldings = true
        // Try authenticated endpoint first, fall back to public endpoint
        let response: { data: { portfolio: { id: string, name: string, cashBalance: number }, holdings: Holding[] } }
        try {
          // Get request headers for SSR authentication
          const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}
          response = await $fetch<{ data: { portfolio: { id: string, name: string, cashBalance: number }, holdings: Holding[] } }>(`/api/portfolios/${portfolioId}/holdings`, {
            headers: headers as HeadersInit
          })

          // Update holdings and cash balance if we have portfolio data
          this.holdings = response.data.holdings || []
          if (this.currentPortfolio && response.data.portfolio) {
            this.currentPortfolio.cashBalance = response.data.portfolio.cashBalance
          }
          this.updateTimestamp()
          console.log(`Holdings updated for portfolio ${portfolioId}:`, this.holdings.length, 'holdings')
        } catch {
          // If authenticated endpoint fails, try public endpoint (legacy structure)
          const publicResponse = await $fetch<{ data: Holding[] }>(`/api/public/portfolios/${portfolioId}/holdings`)
          this.holdings = publicResponse.data || []
          this.updateTimestamp()
          console.log(`Holdings updated (public) for portfolio ${portfolioId}:`, this.holdings.length, 'holdings')
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to fetch holdings'
        console.error('Error fetching holdings:', error)
        throw error
      } finally {
        console.log('[HOLDINGS] Holdings fetch completed')
        this.loadingHoldings = false
      }
    },

    async addTransaction(transactionData: CreateTransactionData): Promise<Transaction> {
      try {
        this.loading = true
        if (!this.currentPortfolio) {
          throw new Error('No current portfolio selected')
        }

        // Get request headers for SSR authentication
        const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}

        const response = await $fetch<{ data: Transaction }>(`/api/portfolios/${this.currentPortfolio.id}/transactions`, {
          method: 'POST',
          headers: headers as HeadersInit,
          body: transactionData
        })

        this.transactions.unshift(response.data)
        this.updateTimestamp()

        // Refresh holdings after adding transaction
        await this.fetchHoldings(this.currentPortfolio.id)

        return response.data
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to add transaction'
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateTransaction(transactionId: string, transactionData: Partial<CreateTransactionData>): Promise<Transaction> {
      try {
        this.loading = true
        if (!this.currentPortfolio) {
          throw new Error('No current portfolio selected')
        }

        // Get request headers for SSR authentication
        const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}

        const response = await $fetch<{ data: Transaction }>(`/api/portfolios/${this.currentPortfolio.id}/transactions/${transactionId}`, {
          method: 'PUT',
          headers: headers as HeadersInit,
          body: transactionData
        })

        const index = this.transactions.findIndex(t => t.id === transactionId)
        if (index !== -1) {
          this.transactions[index] = response.data
        }
        this.updateTimestamp()

        // Refresh holdings after updating transaction
        if (this.currentPortfolio) {
          await this.fetchHoldings(this.currentPortfolio.id)
        }

        return response.data
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to update transaction'
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteTransaction(transactionId: string): Promise<void> {
      try {
        this.loading = true
        // Get request headers for SSR authentication
        const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}

        await $fetch(`/api/transactions/${transactionId}`, {
          method: 'DELETE',
          headers: headers as HeadersInit
        })

        this.transactions = this.transactions.filter(t => t.id !== transactionId)
        this.updateTimestamp()

        // Refresh holdings after deleting transaction
        if (this.currentPortfolio) {
          await this.fetchHoldings(this.currentPortfolio.id)
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to delete transaction'
        throw error
      } finally {
        this.loading = false
      }
    },

    async updatePrices(): Promise<void> {
      try {
        this.loading = true
        if (!this.currentPortfolio) {
          throw new Error('No current portfolio selected')
        }

        // Trigger market data update
        await $fetch('/api/market-data/trigger-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            portfolioId: this.currentPortfolio.id
          })
        })

        // Refresh holdings after updating prices
        await this.fetchHoldings(this.currentPortfolio.id)
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to update prices'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Update timestamp for reactive watchers
    updateTimestamp(): void {
      this.lastUpdated = Date.now()
    },

    clearError(): void {
      this.error = null
    }
  }
})
