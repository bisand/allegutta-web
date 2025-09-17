/**
 * Instrument Relationship Mapping System
 * Handles corporate actions, symbol changes, and related instruments
 * UPDATED: Fixed T-RETT cross-linking issue
 */

import prisma from './prisma'

/**
 * Enhanced instrument relationship detection with smart similarity algorithms
 * UPDATED: Fixed T-RETT cross-linking issue
 * Uses advanced algorithms for dynamic relationship detection
 */

export interface InstrumentRelationship {
  fromSymbol: string
  toSymbol: string
  relationshipType: 'SYMBOL_CHANGE' | 'SPLIT' | 'MERGER' | 'SPIN_OFF' | 'RIGHTS_ISSUE' | 'REVERSE_SPLIT'
  effectiveDate: Date
  ratio?: number // For splits/mergers: new shares per old share
  notes?: string
}

interface TransactionData {
  symbol: string
  date: Date | string
  type: string
  quantity: number
  price: number
  notes?: string | null
}

/**
 * Find all related instruments for a given symbol using smart detection
 */
export async function findRelatedInstruments(portfolioId: string, symbol: string): Promise<string[]> {
  const detection = await detectSmartRelationships(portfolioId)
  
  // Find any grouping that contains this symbol
  for (const group of detection.groupings) {
    if (group.relatedSymbols.includes(symbol)) {
      return group.relatedSymbols
    }
  }
  
  return [symbol] // Return just the symbol if no relationships found
}

// Known Norwegian instrument relationships - REMOVED: Using dynamic detection instead
export const KNOWN_RELATIONSHIPS: InstrumentRelationship[] = [
  // All relationships will be dynamically detected
]

/**
 * SMART INSTRUMENT RELATIONSHIP DETECTION
 * Dynamically detects relationships using multiple heuristics
 */

interface RelationshipScore {
  symbol1: string
  symbol2: string
  score: number
  evidence: string[]
  relationshipType: 'SYMBOL_CHANGE' | 'RIGHTS_ISSUE' | 'RELATED' | 'UNCLEAR'
  confidence: number
}

/**
 * Intelligent relationship detection using multiple heuristics
 */
export async function detectSmartRelationships(portfolioId: string): Promise<{
  relationships: RelationshipScore[]
  groupings: Array<{
    primarySymbol: string
    relatedSymbols: string[]
    confidence: number
    reason: string
  }>
}> {
  // Get all symbols with their transaction patterns
  const symbols = await prisma.transactions.findMany({
    where: { portfolioId },
    select: { 
      symbol: true,
      date: true,
      type: true,
      quantity: true,
      price: true,
      notes: true
    },
    orderBy: { date: 'asc' }
  })

  // Group by symbol
  const symbolData = new Map<string, Array<typeof symbols[0]>>()
  symbols.forEach(tx => {
    if (!symbolData.has(tx.symbol)) symbolData.set(tx.symbol, [])
    symbolData.get(tx.symbol)!.push(tx)
  })

  const allSymbols = Array.from(symbolData.keys()).filter(s => s !== 'CASH')
  const relationships: RelationshipScore[] = []

  // Compare every symbol pair
  for (let i = 0; i < allSymbols.length; i++) {
    for (let j = i + 1; j < allSymbols.length; j++) {
      const symbol1 = allSymbols[i]
      const symbol2 = allSymbols[j]
      
      const score = await calculateRelationshipScore(
        symbol1, 
        symbol2, 
        symbolData.get(symbol1)!, 
        symbolData.get(symbol2)!
      )
      
      if (score.score > 0.3) { // Minimum threshold
        relationships.push(score)
      }
    }
  }

  // Sort by confidence and group related instruments
  relationships.sort((a, b) => b.confidence - a.confidence)
  
  const groupings = createInstrumentGroups(relationships)
  
  return { relationships, groupings }
}

/**
 * Calculate relationship score using multiple heuristics
 */
async function calculateRelationshipScore(
  symbol1: string,
  symbol2: string,
  transactions1: TransactionData[],
  transactions2: TransactionData[]
): Promise<RelationshipScore> {
  // CRITICAL: Prevent T-RETT to T-RETT cross-linking
  if (symbol1.includes('T-RETT') && symbol2.includes('T-RETT')) {
    // Extract base symbols (remove T-RETT/X part)
    const base1 = symbol1.split(' T-RETT')[0]
    const base2 = symbol2.split(' T-RETT')[0]
    
    // Only allow relationship if they have the same base symbol
    if (base1 !== base2) {
      return {
        symbol1,
        symbol2,
        score: 0, // Block this relationship
        evidence: [`Blocked T-RETT cross-linking: ${base1} ≠ ${base2}`],
        relationshipType: 'UNCLEAR',
        confidence: 0
      }
    }
  }

  // Quick prefix similarity check - skip obviously unrelated symbols
  const prefixSimilarity = calculatePrefixSimilarity(symbol1, symbol2)
  
  if (prefixSimilarity < 0.3) {
    return {
      symbol1,
      symbol2,
      score: 0,
      evidence: ['No significant prefix match'],
      relationshipType: 'UNCLEAR',
      confidence: 0
    }
  }

  const evidence: string[] = []
  let totalScore = 0
  let relationshipType: RelationshipScore['relationshipType'] = 'UNCLEAR'

  // 1. NAME SIMILARITY ANALYSIS
  const nameSimilarity = calculateAdvancedSimilarity(symbol1, symbol2)
  
  if (nameSimilarity > 0.6) {
    totalScore += nameSimilarity * 0.4
    evidence.push(`High name similarity: ${(nameSimilarity * 100).toFixed(1)}%`)
    
    // Detect specific patterns
    if (symbol2.includes(symbol1) || symbol1.includes(symbol2)) {
      totalScore += 0.3
      evidence.push('One symbol contains the other')
      relationshipType = 'SYMBOL_CHANGE'
    }
    
    if (symbol1.includes('OLD') || symbol2.includes('OLD')) {
      totalScore += 0.25
      evidence.push('Contains "OLD" - likely symbol change')
      relationshipType = 'SYMBOL_CHANGE'
    }
    
    if (symbol1.includes('T-RETT') || symbol2.includes('T-RETT') || 
        symbol1.includes('RETT') || symbol2.includes('RETT')) {
      totalScore += 0.25
      evidence.push('Contains rights issue indicators')
      relationshipType = 'RIGHTS_ISSUE'
    }
  } else if (nameSimilarity > 0.3 && (symbol1.includes('OLD') || symbol2.includes('OLD'))) {
    // Special case for OLD pattern with lower name similarity threshold
    totalScore += nameSimilarity * 0.3  // Reduced weight
    evidence.push(`Moderate name similarity with OLD pattern: ${(nameSimilarity * 100).toFixed(1)}%`)
    
    if (symbol2.includes(symbol1) || symbol1.includes(symbol2)) {
      totalScore += 0.3
      evidence.push('One symbol contains the other')
      relationshipType = 'SYMBOL_CHANGE'
    }
    
    if (symbol1.includes('OLD') || symbol2.includes('OLD')) {
      totalScore += 0.25
      evidence.push('Contains "OLD" - likely symbol change')
      relationshipType = 'SYMBOL_CHANGE'
    }
  }

  // 2. TEMPORAL PATTERN ANALYSIS
  const temporalScore = analyzeTemporalPatterns(transactions1, transactions2)
  if (temporalScore.score > 0) {
    totalScore += temporalScore.score * 0.3
    evidence.push(...temporalScore.evidence)
    if (temporalScore.suggestedType) relationshipType = temporalScore.suggestedType
  }

  // 3. TRANSACTION PATTERN ANALYSIS  
  const patternScore = analyzeTransactionPatterns(transactions1, transactions2)
  if (patternScore.score > 0) {
    totalScore += patternScore.score * 0.2
    evidence.push(...patternScore.evidence)
  }

  // 4. ISIN/NOTES ANALYSIS
  const metadataScore = analyzeMetadata(transactions1, transactions2)
  if (metadataScore.score > 0) {
    totalScore += metadataScore.score * 0.1
    evidence.push(...metadataScore.evidence)
  }

  // Calculate final confidence based on evidence strength
  const confidence = Math.min(totalScore + (evidence.length * 0.05), 1.0)

  return {
    symbol1,
    symbol2,
    score: totalScore,
    evidence,
    relationshipType,
    confidence
  }
}

/**
 * Advanced name similarity using multiple algorithms
 */
function calculateAdvancedSimilarity(symbol1: string, symbol2: string): number {
  const s1 = symbol1.toUpperCase()
  const s2 = symbol2.toUpperCase()

  // Multiple similarity measures
  const levenshtein = 1 - (levenshteinDistance(s1, s2) / Math.max(s1.length, s2.length))
  const jaccard = jaccardSimilarity(s1, s2)
  const lcs = longestCommonSubstring(s1, s2) / Math.max(s1.length, s2.length)
  
  // Weighted combination
  return (levenshtein * 0.4) + (jaccard * 0.3) + (lcs * 0.3)
}

/**
 * Analyze temporal trading patterns
 */
function analyzeTemporalPatterns(transactions1: TransactionData[], transactions2: TransactionData[]): {
  score: number
  evidence: string[]
  suggestedType?: RelationshipScore['relationshipType']
} {
  const evidence: string[] = []
  let score = 0
  let suggestedType: RelationshipScore['relationshipType'] | undefined

  if (transactions1.length === 0 || transactions2.length === 0) {
    return { score: 0, evidence: [] }
  }

  const dates1 = transactions1.map(t => new Date(t.date))
  const dates2 = transactions2.map(t => new Date(t.date))
  
  const firstDate1 = new Date(Math.min(...dates1.map(d => d.getTime())))
  const lastDate1 = new Date(Math.max(...dates1.map(d => d.getTime())))
  const firstDate2 = new Date(Math.min(...dates2.map(d => d.getTime())))
  const lastDate2 = new Date(Math.max(...dates2.map(d => d.getTime())))

  // Check for sequential trading (one stops, other starts)
  const daysDiff = Math.abs(lastDate1.getTime() - firstDate2.getTime()) / (1000 * 60 * 60 * 24)
  if (daysDiff < 90) { // Within 3 months
    score += 0.4
    evidence.push(`Sequential trading pattern (${Math.round(daysDiff)} days gap)`)
    suggestedType = 'SYMBOL_CHANGE'
  }

  // Check for overlapping periods
  const overlap = Math.max(0, Math.min(lastDate1.getTime(), lastDate2.getTime()) - 
                             Math.max(firstDate1.getTime(), firstDate2.getTime()))
  if (overlap > 0) {
    const overlapDays = overlap / (1000 * 60 * 60 * 24)
    if (overlapDays < 30) { // Short overlap suggests transition
      score += 0.3
      evidence.push(`Brief overlap period (${Math.round(overlapDays)} days)`)
    }
  }

  return { score, evidence, suggestedType }
}

/**
 * Analyze transaction patterns and quantities
 */
function analyzeTransactionPatterns(transactions1: TransactionData[], transactions2: TransactionData[]): {
  score: number
  evidence: string[]
} {
  const evidence: string[] = []
  let score = 0

  // Compare quantity patterns
  const qty1 = transactions1.reduce((sum, t) => sum + (t.type === 'BUY' ? t.quantity : -t.quantity), 0)
  const qty2 = transactions2.reduce((sum, t) => sum + (t.type === 'BUY' ? t.quantity : -t.quantity), 0)

  // Similar final quantities suggest relationship
  if (qty1 > 0 && qty2 > 0) {
    const ratio = Math.min(qty1, qty2) / Math.max(qty1, qty2)
    if (ratio > 0.8) {
      score += 0.3
      evidence.push(`Similar final quantities (${qty1.toFixed(0)} vs ${qty2.toFixed(0)})`)
    }
  }

  // Check for exchange transactions
  const hasExchange1 = transactions1.some(t => t.type.includes('EXCHANGE'))
  const hasExchange2 = transactions2.some(t => t.type.includes('EXCHANGE'))
  
  if (hasExchange1 || hasExchange2) {
    score += 0.4
    evidence.push('Contains exchange transactions')
  }

  return { score, evidence }
}

/**
 * Analyze metadata (ISIN, notes) for relationships
 */
function analyzeMetadata(transactions1: TransactionData[], transactions2: TransactionData[]): {
  score: number
  evidence: string[]
} {
  const evidence: string[] = []
  let score = 0

  // Check notes for relationship indicators
  const allNotes = [...transactions1, ...transactions2]
    .map(t => t.notes || '')
    .join(' ')
    .toUpperCase()

  const relationshipKeywords = [
    'FUSJON', 'MERGER', 'SPLIT', 'SPIN-OFF', 'NAVNEENDRING', 
    'NAME CHANGE', 'SYMBOL CHANGE', 'CORPORATE ACTION', 'TEGNERET'
  ]

  for (const keyword of relationshipKeywords) {
    if (allNotes.includes(keyword)) {
      score += 0.5
      evidence.push(`Found relationship indicator: "${keyword}"`)
      break
    }
  }

  return { score, evidence }
}

/**
 * Create instrument groups from relationship scores
 */
function createInstrumentGroups(relationships: RelationshipScore[]): Array<{
  primarySymbol: string
  relatedSymbols: string[]
  confidence: number
  reason: string
}> {
  const groups: Array<{
    primarySymbol: string
    relatedSymbols: string[]
    confidence: number
    reason: string
  }> = []

  const processedSymbols = new Set<string>()

  for (const rel of relationships) {
    if (rel.confidence < 0.3) continue // Only basic confidence relationships
    
    if (processedSymbols.has(rel.symbol1) || processedSymbols.has(rel.symbol2)) {
      continue // Already in a group
    }

    // Determine if this is a rights issue relationship
    const isRightsRelationship = rel.relationshipType === 'RIGHTS_ISSUE' ||
      rel.evidence.some(e => e.includes('rights') || e.includes('T-RETT'))

    if (isRightsRelationship) {
      // For rights issues, only group base symbol with its specific rights symbol
      const baseSymbol = getBaseSymbolFromPair(rel.symbol1, rel.symbol2)
      const rightsSymbol = baseSymbol === rel.symbol1 ? rel.symbol2 : rel.symbol1
      
      groups.push({
        primarySymbol: baseSymbol,
        relatedSymbols: [baseSymbol, rightsSymbol],
        confidence: rel.confidence,
        reason: `Rights issue: ${rightsSymbol} relates to ${baseSymbol}`
      })

      processedSymbols.add(rel.symbol1)
      processedSymbols.add(rel.symbol2)
    } else {
      // For non-rights relationships, use the original grouping logic
      const relatedSymbols = [rel.symbol1, rel.symbol2]
      const evidence = [...rel.evidence]

      // Look for additional related symbols (but be more selective)
      for (const otherRel of relationships) {
        if (otherRel === rel) continue
        if (otherRel.confidence < 0.6) continue
        
        // Don't mix rights and non-rights relationships
        const otherIsRights = otherRel.relationshipType === 'RIGHTS_ISSUE' ||
          otherRel.evidence.some(e => e.includes('rights') || e.includes('T-RETT'))
        if (otherIsRights) continue

        if (relatedSymbols.includes(otherRel.symbol1) && !relatedSymbols.includes(otherRel.symbol2)) {
          relatedSymbols.push(otherRel.symbol2)
          evidence.push(...otherRel.evidence)
        } else if (relatedSymbols.includes(otherRel.symbol2) && !relatedSymbols.includes(otherRel.symbol1)) {
          relatedSymbols.push(otherRel.symbol1)
          evidence.push(...otherRel.evidence)
        }
      }

      // Choose primary symbol (prefer shorter name for symbol changes)
      const primarySymbol = relatedSymbols.reduce((shortest, current) => 
        current.length < shortest.length ? current : shortest
      )

      groups.push({
        primarySymbol,
        relatedSymbols,
        confidence: rel.confidence,
        reason: evidence.slice(0, 3).join('; ') // Top 3 pieces of evidence
      })

      relatedSymbols.forEach(s => processedSymbols.add(s))
    }
  }

  return groups.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Extract base symbol from a rights issue pair
 */
function getBaseSymbolFromPair(symbol1: string, symbol2: string): string {
  // The base symbol is the one without T-RETT indicators
  if (symbol1.includes('T-RETT') && !symbol2.includes('T-RETT')) {
    return symbol2
  }
  if (symbol2.includes('T-RETT') && !symbol1.includes('T-RETT')) {
    return symbol1
  }
  
  // If both or neither have T-RETT, choose the shorter one as likely base
  return symbol1.length <= symbol2.length ? symbol1 : symbol2
}

/**
 * Jaccard similarity for character n-grams
 */
function jaccardSimilarity(str1: string, str2: string): number {
  const bigrams1 = new Set<string>()
  const bigrams2 = new Set<string>()

  for (let i = 0; i < str1.length - 1; i++) {
    bigrams1.add(str1.substr(i, 2))
  }
  for (let i = 0; i < str2.length - 1; i++) {
    bigrams2.add(str2.substr(i, 2))
  }

  const intersection = new Set([...bigrams1].filter(x => bigrams2.has(x)))
  const union = new Set([...bigrams1, ...bigrams2])

  return union.size === 0 ? 0 : intersection.size / union.size
}

/**
 * Longest common substring
 */
function longestCommonSubstring(str1: string, str2: string): number {
  let longest = 0
  for (let i = 0; i < str1.length; i++) {
    for (let j = 0; j < str2.length; j++) {
      let k = 0
      while (str1[i + k] === str2[j + k] && i + k < str1.length && j + k < str2.length) {
        k++
      }
      longest = Math.max(longest, k)
    }
  }
  return longest
}

/**
 * Get the transformation chain for calculating cost basis
 */
export function getTransformationChain(fromSymbol: string, toSymbol: string): InstrumentRelationship[] {
  const chain: InstrumentRelationship[] = []
  const currentSymbol = fromSymbol
  
  // Simple direct relationship check
  for (const rel of KNOWN_RELATIONSHIPS) {
    if (rel.fromSymbol === currentSymbol && rel.toSymbol === toSymbol) {
      chain.push(rel)
      break
    }
  }
  
  return chain
}

/**
 * Calculate effective cost basis across instrument relationships
 */
export async function calculateCombinedCostBasis(
  portfolioId: string, 
  targetSymbol: string
): Promise<{
  combinedQuantity: number
  combinedCost: number
  avgPrice: number
  explanation: string[]
}> {
  const relatedSymbols = await findRelatedInstruments(portfolioId, targetSymbol)
  console.log(`🔗 Found related instruments for ${targetSymbol}:`, relatedSymbols)
  
  let totalQuantity = 0
  let totalCost = 0
  const explanations: string[] = []
  
  for (const symbol of relatedSymbols) {
    // Get all buy transactions for this related symbol
    const transactions = await prisma.transactions.findMany({
      where: {
        portfolioId,
        symbol,
        type: {
          in: ['BUY', 'EXCHANGE_IN', 'SPIN_OFF_IN']
        }
      },
      orderBy: { date: 'asc' }
    })
    
    if (transactions.length === 0) continue
    
    let symbolQuantity = 0
    let symbolCost = 0
    
    for (const tx of transactions) {
      // Apply transformation ratios if needed
      const ratio = getTransformationRatio(symbol, targetSymbol)
      const adjustedQuantity = tx.quantity * ratio
      const adjustedCost = (tx.quantity * tx.price) + (tx.fees || 0)
      
      symbolQuantity += adjustedQuantity
      symbolCost += adjustedCost
    }
    
    if (symbolQuantity > 0) {
      totalQuantity += symbolQuantity
      totalCost += symbolCost
      explanations.push(`${symbol}: ${symbolQuantity.toFixed(4)} shares, cost: ${symbolCost.toFixed(2)} NOK`)
    }
  }
  
  const avgPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0
  
  return {
    combinedQuantity: totalQuantity,
    combinedCost: totalCost,
    avgPrice,
    explanation: explanations
  }
}

/**
 * Get transformation ratio between two symbols (default 1:1 for smart detection)
 */
export function getTransformationRatio(fromSymbol: string, toSymbol: string): number {
  if (fromSymbol === toSymbol) return 1.0
  
  // For smart detection, assume 1:1 ratio unless we detect specific patterns
  // This could be enhanced with ML to detect split ratios from transaction patterns
  if (fromSymbol.includes('SPLIT') || toSymbol.includes('SPLIT')) {
    // Could analyze transaction quantities before/after to determine ratio
    return 1.0 // Default assumption
  }
  
  return 1.0 // Default 1:1 ratio
}

/**
 * Check if two symbols should be calculated together
 */
export async function shouldCombineInstruments(portfolioId: string, symbol1: string, symbol2: string): Promise<boolean> {
  const related1 = await findRelatedInstruments(portfolioId, symbol1)
  return related1.includes(symbol2)
}

/**
 * Auto-detect instrument relationships from transaction patterns (REMOVED OLD VERSION)
 * This function has been replaced by detectSmartRelationships
 */
export async function detectInstrumentRelationships(portfolioId: string): Promise<{
  detectedRelationships: Array<{
    fromSymbol: string
    toSymbol: string
    confidence: number
    evidence: string[]
  }>
  suggestions: string[]
}> {
  const smartDetection = await detectSmartRelationships(portfolioId)
  
  // Convert smart detection format to old format for compatibility
  const detectedRelationships = smartDetection.relationships.map(rel => ({
    fromSymbol: rel.symbol1,
    toSymbol: rel.symbol2,
    confidence: rel.confidence,
    evidence: rel.evidence
  }))
  
  const suggestions = smartDetection.groupings.map(group => 
    `Consider combining ${group.relatedSymbols.join(', ')} (${group.reason})`
  )
  
  return {
    detectedRelationships,
    suggestions
  }
}

/**
 * Calculate similarity between two symbol names (REMOVED - using advanced similarity in smart detection)
 */

/**
 * Calculate prefix similarity by matching characters from the start
 * Returns the ratio of matching prefix length to the shorter symbol length
 */
function calculatePrefixSimilarity(symbol1: string, symbol2: string): number {
  if (!symbol1 || !symbol2) return 0
  
  const s1 = symbol1.trim().toUpperCase()
  const s2 = symbol2.trim().toUpperCase()
  
  if (s1 === s2) return 1
  
  // Find the longest common prefix
  let matchLength = 0
  const minLength = Math.min(s1.length, s2.length)
  
  for (let i = 0; i < minLength; i++) {
    if (s1[i] === s2[i]) {
      matchLength++
    } else {
      break
    }
  }
  
  // Return the ratio of matching prefix to the shorter symbol
  return matchLength / minLength
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      )
    }
  }
  
  return matrix[str2.length][str1.length]
}
