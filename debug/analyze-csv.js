// Analyze CSV structure more carefully
const csvData = `Id	Bokføringsdag	Handelsdag	Oppgjørsdag	Portefølje	Transaksjonstype	Verdipapir	ISIN	Antall	Kurs	Rente	Totale Avgifter	Valuta	Beløp		Valuta	Kjøpsverdi	Valuta	Resultat	Valuta	Totalt antall	CalcSaldo	Saldo	Diff	Vekslingskurs	Transaksjonstekst	Makuleringsdato	Sluttseddelnummer	Verifikationsnummer	Kurtasje	Valuta	Valutakurs	Innledende rente
1000000003	2025-08-28	2025-08-28	2025-08-28	6627020	UTBYTTE	EQNR	NO0010096985	152	3,774				573,65		NOK					0	10573,65	10573,65	0		UTBYTTE EQNR 3.774 NOK/AKSJE			2072317806
1000000001	2025-08-28	2025-08-28	2025-08-28	6627020	INNSKUDD						10000		NOK					0	10000	10000	0		Initial deposit			1234567890			
1000000002	2025-08-28	2025-08-28	2025-08-28	6627020	KJØPT	AAPL	US0378331005	10	150				1500		NOK					10	8500	8500	0		Buy Apple stock			1234567891`

const lines = csvData.split('\n').filter(line => line.trim())
const headers = lines[0].split('\t')

console.log('Analyzing field positions for each line...\n')

for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split('\t')
  console.log(`Line ${i + 1}:`)
  console.log(`  Total fields: ${values.length}`)
  console.log(`  Expected fields: ${headers.length}`)
  
  // Show fields around the saldo position (index 22)
  for (let j = 18; j <= 26; j++) {
    const header = headers[j] || 'undefined'
    const value = values[j] || 'undefined'
    const marker = j === 22 ? ' <<< SALDO' : ''
    console.log(`    [${j}] ${header}: "${value}"${marker}`)
  }
  console.log()
}
