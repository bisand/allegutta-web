// Test CSV data based on the structure from the attached file
const testCSVData = `"Id"	"Bokføringsdag"	"Handelsdag"	"Oppgjørsdag"	"Portefølje"	"Transaksjonstype"	"Verdipapir"	"ISIN"	"Antall"	"Kurs"	"Rente"	"Totale Avgifter"	"Valuta"	"Beløp"	"Valuta"	"Kjøpsverdi"	"Valuta"	"Resultat"	"Valuta"	"Totalt antall"	"Saldo"	"Vekslingskurs"	"Transaksjonstekst"	"Makuleringsdato"	"Sluttseddelnummer"	"Verifikationsnummer"	"Kurtasje"	"Valuta"	"Valutakurs"	"Innledende rente"
2208800073	2025-08-28	2025-08-18	2025-08-29	6627020	"UTBYTTE"	"EQNR"	"NO0010096985"	152	3.774				573.65	"NOK"					0	167919.71		"UTBYTTE EQNR 3.774 NOK/AKSJE"			2072317806				
2110569769	2025-05-27	2025-05-27	2025-05-30	6627020	"KJØPT"	"MOWI"	"NO0003054108"	156	192.3	0	45	"NOK"	-30043.8	"NOK"	30043.8	"NOK"	0	"NOK"	550	85010.31				2047824837	2047824837	45	"NOK"		
2107671137	2025-05-23	2025-05-23	2025-05-27	6627020	"SALG"	"ELO"	"NO0011002586"	280	42.1	0	29	"NOK"	11759	"NOK"			5179.21	"NOK"	1120	223775.73				2047174979	2047174979	29	"NOK"		`;

console.log('Test CSV data for Norwegian brokerage import:');
console.log(testCSVData);

// This demonstrates the format expected by the import functionality
export { testCSVData };
