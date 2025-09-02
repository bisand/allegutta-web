import { defineStore } from 'pinia'

export interface Portfolio {
  id: string
  name: string
  description?: string
  isDefault: boolean
  userId: string
  createdAt: string
  updatedAt: string
}

interface Transaction {
  id: string
  portfolioId: string
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  date: string
  fee?: number
  notes?: string
  createdAt: string
  updatedAt: string
}

interface Holding {
  id: string
  portfolioId: string
  symbol: string
  quantity: number
  avgPrice: number
  currentPrice?: number
  updatedAt: string
}

interface PortfolioState {
  portfolios: Portfolio[]
  publicPortfolios: Portfolio[]
  currentPortfolio: Portfolio | null
  transactions: Transaction[]
  holdings: Holding[]
  loading: boolean
  error: string | null
}

interface CreatePortfolioData {
  name: string
  description?: string
  isDefault?: boolean
}

interface CreateTransactionData {
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
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
    error: null
  }),

  getters: {
    // Calculate total portfolio value
    totalValue: (state): number => {
      return state.holdings.reduce((total, holding) => {
        return total + (holding.quantity * (holding.currentPrice || holding.avgPrice))
      }, 0)
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
        this.loading = true
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
        this.loading = false
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
        this.error = error instanceof Error ? error.message : 'Unknown error occurred'
        console.error('Failed to initialize user:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchPublicPortfolios(): Promise<void> {
      try {
        const response = await $fetch('/api/public/portfolios') as { data: Portfolio[] }
        this.publicPortfolios = response.data || []
      } catch (error) {
        console.error('Failed to fetch public portfolios:', error)
        // Don't throw error for public portfolios - it's not critical
      }
    },

    async fetchPortfolios(): Promise<void> {
      try {
        // Get request headers for SSR authentication
        const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}
        
        const response = await $fetch('/api/portfolios', {
          headers: headers as HeadersInit
        }) as { data: Portfolio[] }
        this.portfolios = response.data || []
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to fetch portfolios'
        throw error
      }
    },

    async loadAllPortfolios(): Promise<void> {
      try {
        this.loading = true
        await this.fetchPortfolios()
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to load portfolios'
        throw error
      } finally {
        this.loading = false
      }
    },

    async createPortfolio(portfolioData: CreatePortfolioData): Promise<Portfolio> {
      try {
        this.loading = true
        // Get request headers for SSR authentication
        const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}
        
        const response = await $fetch('/api/portfolios', {
          method: 'POST',
          headers: headers as HeadersInit,
          body: portfolioData
        }) as { data: Portfolio }

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

    async setCurrentPortfolio(portfolioId: string): Promise<void> {
      try {
        this.loading = true
        this.currentPortfolio = this.allPortfolios.find(p => p.id === portfolioId) || null

        if (this.currentPortfolio) {
          await Promise.all([
            this.fetchTransactions(portfolioId),
            this.fetchHoldings(portfolioId)
          ])
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to set current portfolio'
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchTransactions(portfolioId: string): Promise<void> {
      try {
        // Try authenticated endpoint first, fall back to public endpoint
        let response
        try {
          // Get request headers for SSR authentication
          const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}
          response = await $fetch(`/api/portfolios/${portfolioId}/transactions`, {
            headers: headers as HeadersInit
          }) as { data: Transaction[] }
        } catch {
          // If authenticated endpoint fails, try public endpoint
          response = await $fetch(`/api/public/portfolios/${portfolioId}/transactions`) as { data: Transaction[] }
        }
        this.transactions = response.data || []
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to fetch transactions'
        throw error
      }
    },

    async fetchHoldings(portfolioId: string): Promise<void> {
      try {
        // Try authenticated endpoint first, fall back to public endpoint
        let response
        try {
          // Get request headers for SSR authentication
          const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}
          response = await $fetch(`/api/portfolios/${portfolioId}/holdings`, {
            headers: headers as HeadersInit
          }) as { data: Holding[] }
        } catch {
          // If authenticated endpoint fails, try public endpoint
          response = await $fetch(`/api/public/portfolios/${portfolioId}/holdings`) as { data: Holding[] }
        }
        this.holdings = response.data || []
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to fetch holdings'
        throw error
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

        const response = await $fetch(`/api/portfolios/${this.currentPortfolio.id}/transactions`, {
          method: 'POST',
          headers: headers as HeadersInit,
          body: transactionData
        }) as { data: Transaction }

        this.transactions.unshift(response.data)

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
        // Get request headers for SSR authentication
        const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}
        
        const response = await $fetch(`/api/transactions/${transactionId}`, {
          method: 'PUT',
          headers: headers as HeadersInit,
          body: transactionData
        }) as { data: Transaction }

        const index = this.transactions.findIndex(t => t.id === transactionId)
        if (index !== -1) {
          this.transactions[index] = response.data
        }

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

        // TODO: Implement price update API endpoint
        /*
        await $fetch(`/api/portfolios/${this.currentPortfolio.id}/update-prices`, {
          method: 'POST' as const
        })
        */

        console.log('Price update feature will be implemented later')

        // Refresh holdings after updating prices
        await this.fetchHoldings(this.currentPortfolio.id)
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to update prices'
        throw error
      } finally {
        this.loading = false
      }
    },

    clearError(): void {
      this.error = null
    }
  }
})
