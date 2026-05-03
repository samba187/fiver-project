const xlsx = require('xlsx');

const filename = 'Fiveur_Academy_Fichier Pro de gestion (1).xlsx';
const workbook = xlsx.readFile(filename, { cellDates: true });
const worksheet = workbook.Sheets['Inscriptions'];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

console.log("Row 0:", data[0]);
console.log("Row 1:", data[1]);
console.log("Row 2:", data[2]);
console.log("Row 3:", data[3]);
