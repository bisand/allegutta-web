const fs = require('fs');

async function testSimpleImport() {
    try {
        // Create a minimal CSV for testing
        const csvContent = `Id,Bokføringsdag,Handelsdag,Oppgjørsdag,Portefølje,Transaksjonstype,Verdipapir,ISIN,Antall,Kurs,Beløp,Gebyr,Netto beløp,Saldo,Transaksjonsid,Valutakurs,Opprinnelig kurs,Opprinnelig valuta
1000000001,2025-09-02,2025-09-02,2025-09-02,Portefølje 1,INNSKUDD,,,,,,,-10000,-10000,transaction-1,,,NOK`;

        fs.writeFileSync('debug/simple-test.csv', csvContent);

        const FormData = require('form-data');
        const fetch = (await import('node-fetch')).default;
        
        const form = new FormData();
        form.append('csvFile', fs.createReadStream('debug/simple-test.csv'));
        
        console.log('Testing simple CSV import...');
        
        const response = await fetch('http://localhost:3000/api/portfolios/cmf487ylz0002l1kzh5exa4n0/transactions/import', {
            method: 'POST',
            body: form
        });
        
        const result = await response.text();
        console.log('Import result:', result.slice(0, 500));
        
        // Cleanup
        fs.unlinkSync('debug/simple-test.csv');
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testSimpleImport();
