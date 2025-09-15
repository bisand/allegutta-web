/**
 * Norwegian Holiday Service
 * Provides a robust, multi-source approach to Norwegian holiday data
 */

import getHolidays from 'holidays-norway-ts'

export interface Holiday {
    date: string // YYYY-MM-DD format
    name: string
    localName?: string
    type: 'public' | 'bank' | 'observance'
    fixed: boolean
}

/**
 * Cache for holiday data to avoid repeated API calls and calculations
 */
interface CacheEntry {
    holidays: Holiday[]
    timestamp: number
}

const holidayCache = new Map<number, CacheEntry>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

interface _NagerHoliday {
    date: string
    name: string
    localName: string
    fixed: boolean
    types: string[]
}

interface _HolidayPackageEntry {
    date: string
    name: string
    fixed: boolean
}

/**
 * Critical Norwegian holidays (fallback for when all other sources fail)
 * Only includes holidays that definitely affect financial markets
 */
const CRITICAL_NORWEGIAN_HOLIDAYS = [
    // Fixed holidays that always affect markets
    { date: '01-01', name: 'New Year\'s Day', localName: 'Nyttårsdag', type: 'public' as const, fixed: true },
    { date: '05-01', name: 'Labor Day', localName: 'Første mai', type: 'public' as const, fixed: true },
    { date: '05-17', name: 'Constitution Day', localName: 'Grunnlovsdag', type: 'public' as const, fixed: true },
    { date: '12-24', name: 'Christmas Eve', localName: 'Julaften', type: 'public' as const, fixed: true },
    { date: '12-25', name: 'Christmas Day', localName: 'Første juledag', type: 'public' as const, fixed: true },
    { date: '12-26', name: 'Boxing Day', localName: 'Andre juledag', type: 'public' as const, fixed: true },
    { date: '12-31', name: 'New Year\'s Eve', localName: 'Nyttårsaften', type: 'public' as const, fixed: true }
]

/**
 * Get Norwegian holidays from Nager.Date API (primary source)
 */
async function fetchHolidaysFromAPI(year: number): Promise<Holiday[]> {
    try {
        const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/NO`, {
            headers: {
                'User-Agent': 'AlleGutta-Portfolio/1.0',
                'Accept': 'application/json'
            },
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(5000)
        })

        if (!response.ok) {
            throw new Error(`API responded with status ${response.status}`)
        }

        const data = await response.json() as _NagerHoliday[]

        return data.map((holiday) => ({
            date: holiday.date,
            name: holiday.name,
            localName: holiday.localName,
            type: holiday.types?.includes('Bank') ? 'bank' as const : 'public' as const,
            fixed: holiday.fixed
        }))
    } catch (error) {
        console.warn(`Failed to fetch holidays from API for ${year}:`, error)
        throw error
    }
}

/**
 * Get Norwegian holidays from npm package (secondary source)
 */
function getHolidaysFromPackage(year: number): Holiday[] {
    try {
        const holidays = getHolidays(year) as _HolidayPackageEntry[]

        return holidays.map((holiday) => ({
            date: holiday.date,
            name: holiday.name,
            localName: holiday.name, // Package doesn't separate these
            type: 'public' as const,
            fixed: holiday.fixed
        }))
    } catch (error) {
        console.warn(`Failed to get holidays from package for ${year}:`, error)
        throw error
    }
}

/**
 * Get critical holidays for a year (emergency fallback)
 */
function getCriticalHolidays(year: number): Holiday[] {
    return CRITICAL_NORWEGIAN_HOLIDAYS.map(holiday => ({
        ...holiday,
        date: `${year}-${holiday.date}`
    }))
}

/**
 * Get Norwegian holidays for a specific year with fallback strategy
 */
export async function getNorwegianHolidays(year: number): Promise<Holiday[]> {
    // Check cache first
    const cacheKey = year
    const cached = holidayCache.get(cacheKey) as CacheEntry | undefined

    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        return cached.holidays
    }

    let holidays: Holiday[] = []
    let source = ''

    try {
        // Primary: Try API first (most up-to-date)
        holidays = await fetchHolidaysFromAPI(year)
        source = 'API'
    } catch {
        try {
            // Secondary: Fall back to npm package
            holidays = getHolidaysFromPackage(year)
            source = 'Package'
        } catch {
            // Emergency: Use critical holidays only
            holidays = getCriticalHolidays(year)
            source = 'Critical fallback'
            console.error(`All holiday sources failed for ${year}, using critical holidays only`)
        }
    }

    // Cache the result
    holidayCache.set(cacheKey, {
        holidays,
        timestamp: Date.now()
    })

    console.log(`Norwegian holidays for ${year} loaded from: ${source} (${holidays.length} holidays)`)
    return holidays
}

/**
 * Check if a specific date is a Norwegian holiday
 */
export async function isNorwegianHoliday(date: Date): Promise<boolean> {
    const year = date.getFullYear()
    const holidays = await getNorwegianHolidays(year)
    const dateString = date.toISOString().split('T')[0] // YYYY-MM-DD

    return holidays.some(holiday => holiday.date === dateString)
}

/**
 * Get holiday information for a specific date
 */
export async function getHolidayInfo(date: Date): Promise<Holiday | null> {
    const year = date.getFullYear()
    const holidays = await getNorwegianHolidays(year)
    const dateString = date.toISOString().split('T')[0] // YYYY-MM-DD

    return holidays.find(holiday => holiday.date === dateString) || null
}

/**
 * Clear the holiday cache (useful for testing or manual refresh)
 */
export function clearHolidayCache(): void {
    holidayCache.clear()
}

/**
 * Get cache statistics (for monitoring)
 */
export function getHolidayCacheStats(): { size: number; entries: Array<{ year: number; source: string; count: number }> } {
    const entries = Array.from(holidayCache.entries()).map(([year, cache]) => ({
        year,
        source: 'cached',
        count: cache.holidays.length
    }))

    return {
        size: holidayCache.size,
        entries
    }
}