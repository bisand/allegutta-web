/**
 * Market Schedule Utility
 * Handles Norwegian stock market (OSL) trading hours and overnight reset logic
 */

import { isNorwegianHoliday } from './holidayService.js'

export interface MarketSchedule {
    isMarketOpen: boolean
    isOvernightReset: boolean
    marketState: 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'POST_MARKET' | 'OVERNIGHT_RESET'
    nextMarketOpen?: Date
    nextMarketClose?: Date
}

/**
 * Get a Date object in Oslo timezone
 */
function getOsloDate(date?: Date): Date {
    const targetDate = date || new Date()

    // Convert to Oslo timezone using Intl.DateTimeFormat
    const osloTime = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Oslo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).formatToParts(targetDate)

    const year = parseInt(osloTime.find(p => p.type === 'year')?.value || '2025')
    const month = parseInt(osloTime.find(p => p.type === 'month')?.value || '1') - 1 // JavaScript months are 0-indexed
    const day = parseInt(osloTime.find(p => p.type === 'day')?.value || '1')
    const hour = parseInt(osloTime.find(p => p.type === 'hour')?.value || '0')
    const minute = parseInt(osloTime.find(p => p.type === 'minute')?.value || '0')
    const second = parseInt(osloTime.find(p => p.type === 'second')?.value || '0')

    return new Date(year, month, day, hour, minute, second)
}

/**
 * Check if a given date is a trading day (Mon-Fri, not a holiday)
 */
async function isTradingDay(date: Date): Promise<boolean> {
    // Weekend check (0 = Sunday, 6 = Saturday)
    const dayOfWeek = date.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false
    }

    // Holiday check using the new holiday service
    return !(await isNorwegianHoliday(date))
}

/**
 * Get market hours for a specific trading day
 * Returns null if it's not a trading day
 */
async function getMarketHours(date: Date): Promise<{ open: Date; close: Date } | null> {
    if (!(await isTradingDay(date))) {
        return null
    }

    // Norwegian market hours: 09:00 - 16:30 CET/CEST
    const marketOpen = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0, 0)
    const marketClose = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 16, 30, 0, 0)

    return { open: marketOpen, close: marketClose }
}

/**
 * Get the next trading day from a given date
 */
async function getNextTradingDay(fromDate: Date): Promise<Date> {
    const nextDay = new Date(fromDate)
    nextDay.setDate(nextDay.getDate() + 1)

    while (!(await isTradingDay(nextDay))) {
        nextDay.setDate(nextDay.getDate() + 1)
    }

    return nextDay
}

/**
 * Get the current market schedule and state
 * Uses Oslo timezone (Europe/Oslo) for Norwegian market
 */
export async function getCurrentMarketSchedule(): Promise<MarketSchedule> {
    // Use Oslo timezone for Norwegian market
    const now = getOsloDate()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Check if today is a trading day
    const todayMarketHours = await getMarketHours(today)

    if (todayMarketHours) {
        // Today is a trading day
        const { open: marketOpen, close: marketClose } = todayMarketHours

        if (now < marketOpen) {
            // Before market open
            if (now.getHours() >= 0 && now.getHours() < 9) {
                // Overnight reset period (00:00 - 09:00)
                return {
                    isMarketOpen: false,
                    isOvernightReset: true,
                    marketState: 'OVERNIGHT_RESET',
                    nextMarketOpen: marketOpen
                }
            } else {
                // Pre-market (rare case, but possible)
                return {
                    isMarketOpen: false,
                    isOvernightReset: false,
                    marketState: 'PRE_MARKET',
                    nextMarketOpen: marketOpen
                }
            }
        } else if (now >= marketOpen && now < marketClose) {
            // Market is open
            return {
                isMarketOpen: true,
                isOvernightReset: false,
                marketState: 'OPEN',
                nextMarketClose: marketClose
            }
        } else {
            // After market close
            const nextTradingDay = await getNextTradingDay(today)
            const nextMarketHours = await getMarketHours(nextTradingDay)

            return {
                isMarketOpen: false,
                isOvernightReset: false,
                marketState: 'POST_MARKET',
                nextMarketOpen: nextMarketHours?.open
            }
        }
    } else {
        // Today is not a trading day (weekend/holiday)
        const nextTradingDay = await getNextTradingDay(today)
        const nextMarketHours = await getMarketHours(nextTradingDay)

        // During weekend/holiday, check if it's the overnight reset period for the next trading day
        const isOvernightResetPeriod = now.getHours() >= 0 && now.getHours() < 9

        return {
            isMarketOpen: false,
            isOvernightReset: isOvernightResetPeriod,
            marketState: isOvernightResetPeriod ? 'OVERNIGHT_RESET' : 'CLOSED',
            nextMarketOpen: nextMarketHours?.open
        }
    }
}

/**
 * Check if the current time is in the overnight reset period
 * This is used to determine if market data should show reset values
 */
export async function isOvernightResetPeriod(): Promise<boolean> {
    const schedule = await getCurrentMarketSchedule()
    return schedule.isOvernightReset
}

/**
 * Check if the market is currently open
 */
export async function isMarketCurrentlyOpen(): Promise<boolean> {
    const schedule = await getCurrentMarketSchedule()
    return schedule.isMarketOpen
}

/**
 * Get a human-readable description of the current market state
 */
export async function getMarketStateDescription(): Promise<string> {
    const schedule = await getCurrentMarketSchedule()

    switch (schedule.marketState) {
        case 'OPEN':
            return 'Market is open'
        case 'CLOSED':
            return 'Market is closed'
        case 'PRE_MARKET':
            return 'Pre-market'
        case 'POST_MARKET':
            return 'After hours'
        case 'OVERNIGHT_RESET':
            return 'Market closed - showing reset values'
        default:
            return 'Market status unknown'
    }
}

/**
 * Check if a specific Date is in trading hours
 */
export async function isInTradingHours(dateTime: Date): Promise<boolean> {
    const osloTime = getOsloDate(dateTime)
    const day = new Date(osloTime.getFullYear(), osloTime.getMonth(), osloTime.getDate())
    const marketHours = await getMarketHours(day)

    if (!marketHours) {
        return false
    }

    return osloTime >= marketHours.open && osloTime < marketHours.close
}

/**
 * For testing purposes - allow overriding the current time
 */
let mockCurrentTime: Date | null = null

export function setMockCurrentTime(time: Date | null): void {
    mockCurrentTime = time
}

/**
 * Get current time (with mock support for testing)
 */
export function getCurrentTime(): Date {
    return mockCurrentTime || new Date()
}