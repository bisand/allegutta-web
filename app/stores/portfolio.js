import { defineStore } from 'pinia'

export const usePortfolioStore = defineStore('portfolio', {
  state: () => ({
    portfolios: [],
    currentPortfolio: null,
    transactions: [],
    holdings: [],
    loading: false,
    error: null
  }),

  getters: {
    // Calculate total portfolio value
    totalValue: (state) => {
      return state.holdings.reduce((total, holding) => {
        return total + (holding.quantity * (holding.currentPrice || holding.avgPrice))
      }, 0)
    },

    // Calculate total gain/loss
    totalGainLoss: (state) => {
      return state.holdings.reduce((total, holding) => {
        const currentValue = holding.quantity * (holding.currentPrice || holding.avgPrice)
        const costBasis = holding.quantity * holding.avgPrice
        return total + (currentValue - costBasis)
      }, 0)
    },

    // Calculate percentage gain/loss
    totalGainLossPercentage: (state) => {
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
    portfolioTransactions: (state) => {
      if (!state.currentPortfolio) return []
      return state.transactions.filter(t => t.portfolioId === state.currentPortfolio.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    },

    // Get holdings for current portfolio
    portfolioHoldings: (state) => {
      if (!state.currentPortfolio) return []
      return state.holdings.filter(h => h.portfolioId === state.currentPortfolio.id)
        .sort((a, b) => b.quantity * (b.currentPrice || b.avgPrice) - a.quantity * (a.currentPrice || a.avgPrice))
    }
  },

  actions: {
    async initializeUser() {
      try {
        this.loading = true
        await this.fetchPortfolios()
        
        // Set default portfolio if available
        if (this.portfolios.length > 0) {
          const defaultPortfolio = this.portfolios.find(p => p.isDefault) || this.portfolios[0]
          await this.setCurrentPortfolio(defaultPortfolio.id)
        }
      } catch (error) {
        this.error = error.message
        console.error('Failed to initialize user:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchPortfolios() {
      try {
        // Token will be added automatically by the plugin
        const { data } = await $fetch('/api/portfolios')
        this.portfolios = data || []
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async createPortfolio(portfolioData) {
      try {
        this.loading = true
        const { data } = await $fetch('/api/portfolios', {
          method: 'POST',
          body: portfolioData
        })
        
        this.portfolios.push(data)
        
        // Set as current if it's the first portfolio
        if (this.portfolios.length === 1) {
          await this.setCurrentPortfolio(data.id)
        }
        
        return data
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async setCurrentPortfolio(portfolioId) {
      try {
        this.loading = true
        this.currentPortfolio = this.portfolios.find(p => p.id === portfolioId)
        
        if (this.currentPortfolio) {
          await Promise.all([
            this.fetchTransactions(portfolioId),
            this.fetchHoldings(portfolioId)
          ])
        }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchTransactions(portfolioId) {
      try {
        const { data } = await $fetch(`/api/portfolios/${portfolioId}/transactions`)
        this.transactions = data || []
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async fetchHoldings(portfolioId) {
      try {
        const { data } = await $fetch(`/api/portfolios/${portfolioId}/holdings`)
        this.holdings = data || []
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async addTransaction(transactionData) {
      try {
        this.loading = true
        const { data } = await $fetch(`/api/portfolios/${this.currentPortfolio.id}/transactions`, {
          method: 'POST',
          body: transactionData
        })
        
        this.transactions.unshift(data)
        
        // Refresh holdings after adding transaction
        await this.fetchHoldings(this.currentPortfolio.id)
        
        return data
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateTransaction(transactionId, transactionData) {
      try {
        this.loading = true
        const { data } = await $fetch(`/api/transactions/${transactionId}`, {
          method: 'PUT',
          body: transactionData
        })
        
        const index = this.transactions.findIndex(t => t.id === transactionId)
        if (index !== -1) {
          this.transactions[index] = data
        }
        
        // Refresh holdings after updating transaction
        await this.fetchHoldings(this.currentPortfolio.id)
        
        return data
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteTransaction(transactionId) {
      try {
        this.loading = true
        await $fetch(`/api/transactions/${transactionId}`, {
          method: 'DELETE'
        })
        
        this.transactions = this.transactions.filter(t => t.id !== transactionId)
        
        // Refresh holdings after deleting transaction
        await this.fetchHoldings(this.currentPortfolio.id)
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async updatePrices() {
      try {
        this.loading = true
        await $fetch(`/api/portfolios/${this.currentPortfolio.id}/update-prices`, {
          method: 'POST'
        })
        
        // Refresh holdings after updating prices
        await this.fetchHoldings(this.currentPortfolio.id)
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    clearError() {
      this.error = null
    }
  }
})
