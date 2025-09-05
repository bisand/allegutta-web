// Test script to verify currency formatting
// This is just for testing - remove after verification

console.log('Testing currency formatting...')

// Test data
const testValues = [1234.56, 1000, 0.99, 1234567.89]

// Simulate Norwegian locale formatting
const formatNOK = (value) => {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

// Simulate US locale formatting  
const formatUSD = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

console.log('\nNorwegian (NOK) formatting:')
testValues.forEach(value => {
  console.log(`${value} -> ${formatNOK(value)}`)
})

console.log('\nUS (USD) formatting:')
testValues.forEach(value => {
  console.log(`${value} -> ${formatUSD(value)}`)
})

console.log('\nTesting complete!')
