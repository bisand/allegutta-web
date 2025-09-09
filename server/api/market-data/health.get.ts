/**
 * Market Data Health Check API
 * Provides insights into data quality and alerts
 */

export default defineEventHandler(async (_event) => {
  try {
    const { generateMarketDataHealthReport } = await import('../../lib/priceMonitor')

    const report = await generateMarketDataHealthReport()

    // Group alerts by severity
    const alertsBySeverity = {
      CRITICAL: report.alerts.filter((a) => a.severity === 'CRITICAL'),
      HIGH: report.alerts.filter((a) => a.severity === 'HIGH'),
      MEDIUM: report.alerts.filter((a) => a.severity === 'MEDIUM'),
      LOW: report.alerts.filter((a) => a.severity === 'LOW')
    }

    // Calculate health score (percentage of healthy records)
    const healthScore = report.totalRecords > 0 ?
      Math.round((report.healthyRecords / report.totalRecords) * 100) : 100

    return {
      success: true,
      data: {
        summary: {
          totalRecords: report.totalRecords,
          healthyRecords: report.healthyRecords,
          alertsCount: report.alertsCount,
          criticalIssues: report.criticalIssues,
          healthScore: healthScore
        },
        alertsBySeverity,
        recommendations: generateRecommendations(report.alerts)
      }
    }
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate market data health report'
    })
  }
})

function generateRecommendations(alerts: Array<{ alertType: string; suggestion?: string }>): string[] {
  const recommendations: string[] = []

  const exchangeMismatchCount = alerts.filter(a => a.alertType === 'EXCHANGE_MISMATCH').length
  const dataQualityCount = alerts.filter(a => a.alertType === 'DATA_QUALITY').length

  if (exchangeMismatchCount > 0) {
    recommendations.push(`${exchangeMismatchCount} stocks need exchange correction - update symbolYahoo to use .OL suffix`)
  }

  if (dataQualityCount > 0) {
    recommendations.push(`${dataQualityCount} data quality issues detected - review symbol mappings`)
  }

  if (alerts.length === 0) {
    recommendations.push('All market data looks healthy! 🎉')
  }

  return recommendations
}
