/**
 * Enhanced date and time formatting composable with true browser locale support
 */

export const useDateTime = () => {
  const { locale } = useI18n()
  
  // Get the actual browser locale, not just the i18n locale
  const getBrowserLocale = (): string => {
    // First try navigator.language (most accurate)
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language
    }
    
    // Fallback to i18n locale, then default
    return locale.value || 'no-NO'
  }
  
  /**
   * Formats a date with locale-specific formatting using browser's actual locale
   */
  const formatDate = (date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
    if (!date) return 'N/A'
    
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) return 'Invalid Date'
    
    const browserLocale = getBrowserLocale()
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }
    
    try {
      return new Intl.DateTimeFormat(browserLocale, { ...defaultOptions, ...options }).format(dateObj)
    } catch {
      // Fallback to browser's default if custom locale fails
      try {
        return new Intl.DateTimeFormat(undefined, { ...defaultOptions, ...options }).format(dateObj)
      } catch {
        return dateObj.toLocaleDateString()
      }
    }
  }
  
  /**
   * Formats a date with time (timestamp) with locale-specific formatting using browser's actual locale
   * Converts UTC dates to the browser's timezone
   */
  const formatDateTime = (date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
    if (!date) return 'N/A'
    
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) return 'Invalid Date'
    
    const browserLocale = getBrowserLocale()
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      // Don't force timezone, let browser decide
      timeZone: undefined
    }
    
    try {
      return new Intl.DateTimeFormat(browserLocale, { ...defaultOptions, ...options }).format(dateObj)
    } catch {
      // Fallback to browser's default
      try {
        return new Intl.DateTimeFormat(undefined, { ...defaultOptions, ...options }).format(dateObj)
      } catch {
        return dateObj.toLocaleString()
      }
    }
  }
  
  /**
   * Formats time only with locale-specific formatting using browser's actual locale
   */
  const formatTime = (date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
    if (!date) return 'N/A'
    
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) return 'Invalid Time'
    
    const browserLocale = getBrowserLocale()
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }
    
    try {
      return new Intl.DateTimeFormat(browserLocale, { ...defaultOptions, ...options }).format(dateObj)
    } catch {
      // Fallback to browser's default
      try {
        return new Intl.DateTimeFormat(undefined, { ...defaultOptions, ...options }).format(dateObj)
      } catch {
        return dateObj.toLocaleTimeString()
      }
    }
  }
  
  /**
   * Formats relative time (e.g., "2 days ago", "just now")
   */
  const formatRelativeTime = (date: string | Date | null | undefined): string => {
    if (!date) return 'N/A'
    
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) return 'Invalid Date'
    
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`
    
    // For older dates, use regular formatting
    return formatDate(dateObj)
  }
  
  /**
   * Formats duration between two dates
   */
  const formatDuration = (startDate: string | Date, endDate: string | Date = new Date()): string => {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Invalid Duration'
    
    const diffInMs = Math.abs(end.getTime() - start.getTime())
    const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Today'
    if (days === 1) return '1 day'
    if (days < 30) return `${days} days`
    if (days < 365) return `${Math.floor(days / 30)} months`
    
    return `${Math.floor(days / 365)} years`
  }
  
  return {
    formatDate,
    formatDateTime,
    formatTime,
    formatRelativeTime,
    formatDuration,
    getBrowserLocale
  }
}
