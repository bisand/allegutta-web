const { updateSecurityHoldings } = require('./server/lib/portfolioCalculations.ts');

async function testACRCalculation() {
  console.log('Testing ACR calculation...');
  try {
    await updateSecurityHoldings('92131b46-55b9-40c6-9651-a4658e3f901b', 'ACR');
    console.log('ACR calculation completed');
  } catch (error) {
    console.error('Error calculating ACR:', error);
  }
}

testACRCalculation();
