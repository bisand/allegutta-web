// Create CSV with proper tab separation
function createTestCSV() {
  const headers = [
    'Id', 'Bokføringsdag', 'Handelsdag', 'Oppgjörsdag', 'Portefölje', 'Transaksjonstype', 
    'Verdipapir', 'ISIN', 'Antall', 'Kurs', 'Rente', 'Totale Avgifter', 'Valuta', 'Beløp', 
    '', 'Valuta', 'Kjöpsverdi', 'Valuta', 'Resultat', 'Valuta', 'Totalt antall', 'CalcSaldo', 
    'Saldo', 'Diff', 'Vekslingskurs', 'Transaksjonstekst', 'Makuleringsdato', 
    'Sluttseddelnummer', 'Verifikationsnummer', 'Kurtasje', 'Valuta', 'Valutakurs', 'Innledende rente'
  ]

  // Row data arrays - each array represents one CSV row
  const rows = [
    // UTBYTTE transaction (originally first in CSV but should be last chronologically)
    ['1000000003', '2025-08-28', '2025-08-28', '2025-08-28', '6627020', 'UTBYTTE', 
     'EQNR', 'NO0010096985', '152', '3,774', '', '', '', '573,65', '', 'NOK', 
     '', '', '', '', '0', '10573,65', '10573,65', '0', '', 'UTBYTTE EQNR 3.774 NOK/AKSJE', 
     '', '', '2072317806', '', '', '', ''],
    
    // INNSKUDD transaction (should be first chronologically)
    ['1000000001', '2025-08-28', '2025-08-28', '2025-08-28', '6627020', 'INNSKUDD', 
     '', '', '', '', '', '', '', '10000', '', 'NOK', 
     '', '', '', '', '0', '10000', '10000', '0', '', 'Initial deposit', 
     '', '', '1234567890', '', '', '', ''],
    
    // KJØPT transaction (should be second chronologically)
    ['1000000002', '2025-08-28', '2025-08-28', '2025-08-28', '6627020', 'KJØPT', 
     'AAPL', 'US0378331005', '10', '150', '', '', '', '1500', '', 'NOK', 
     '', '', '', '', '10', '8500', '8500', '0', '', 'Buy Apple stock', 
     '', '', '1234567891', '', '', '', '']
  ]

  // Build CSV
  const headerLine = headers.join('\t')
  const dataLines = rows.map(row => row.join('\t'))
  const csv = [headerLine, ...dataLines].join('\n')
  
  console.log('Generated CSV:')
  console.log('Header count:', headers.length)
  
  // Test parsing
  const lines = csv.split('\n')
  console.log('\nParsing test:')
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t')
    const id = values[0]
    const type = values[5]
    const saldo = values[22]
    console.log(`Row ${i}: ID=${id}, Type=${type}, Values=${values.length}, Saldo="${saldo}"`)
  }
  
  return csv
}

const csvData = createTestCSV()
export { csvData }
