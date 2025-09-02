// Carefully construct the INNSKUDD line based on UTBYTTE pattern
console.log('UTBYTTE line analysis:')
const utbytteLine = '1000000003	2025-08-28	2025-08-28	2025-08-28	6627020	UTBYTTE	EQNR	NO0010096985	152	3,774				573,65		NOK					0	10573,65	10573,65	0		UTBYTTE EQNR 3.774 NOK/AKSJE			2072317806'
const utbytteFields = utbytteLine.split('\t')
console.log(`UTBYTTE fields (${utbytteFields.length}):`)
utbytteFields.forEach((field, i) => {
  console.log(`  [${i}]: "${field}"`)
})

console.log('\nConstructing INNSKUDD line with same structure:')
// Copy UTBYTTE structure and modify specific fields
const innskuddFields = [...utbytteFields]
innskuddFields[0] = '1000000001'  // ID
innskuddFields[5] = 'INNSKUDD'    // Transaction type
innskuddFields[6] = ''            // Verdipapir (empty)
innskuddFields[7] = ''            // ISIN (empty)
innskuddFields[8] = ''            // Antall (empty)
innskuddFields[9] = ''            // Kurs (empty)
innskuddFields[13] = '10000'      // Beløp
innskuddFields[21] = '10000'      // CalcSaldo
innskuddFields[22] = '10000'      // Saldo
innskuddFields[25] = 'Initial deposit'  // Text
innskuddFields[28] = '1234567890' // Verification number

const innskuddLine = innskuddFields.join('\t')
console.log('INNSKUDD line:', innskuddLine)

console.log('\nVerifying INNSKUDD fields:')
innskuddFields.forEach((field, i) => {
  if (i <= 25) { // Show first 26 fields
    console.log(`  [${i}]: "${field}"`)
  }
})

console.log('\nTesting new CSV:')
const newCsv = `Id	Bokføringsdag	Handelsdag	Oppgjörsdag	Portefölje	Transaksjonstype	Verdipapir	ISIN	Antall	Kurs	Rente	Totale Avgifter	Valuta	Beløp		Valuta	Kjøpsverdi	Valuta	Resultat	Valuta	Totalt antall	CalcSaldo	Saldo	Diff	Vekslingskurs	Transaksjonstekst	Makuleringsdato	Sluttseddelnummer	Verifikationsnummer	Kurtasje	Valuta	Valutakurs	Innledende rente
${utbytteLine}
${innskuddLine}
1000000002	2025-08-28	2025-08-28	2025-08-28	6627020	KJØPT	AAPL	US0378331005	10	150				1500		NOK					10	8500	8500	0		Buy Apple stock			1234567891`

const testLines = newCsv.split('\n').filter(line => line.trim())
const headers = testLines[0].split('\t')

for (let i = 1; i < testLines.length; i++) {
  const values = testLines[i].split('\t')
  console.log(`Line ${i + 1}: ${values.length} fields, Saldo="${values[22]}"`)
}
