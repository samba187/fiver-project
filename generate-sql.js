const xlsx = require('xlsx');
const fs = require('fs');

const filename = 'Fiveur_Academy_Fichier Pro de gestion (1).xlsx';
const workbook = xlsx.readFile(filename, { cellDates: true });
const worksheet = workbook.Sheets['Inscriptions'];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

let sql = `-- ==========================================\n`;
sql += `-- Importation depuis ${filename}\n`;
sql += `-- ==========================================\n\n`;
sql += `TRUNCATE TABLE academy_registrations CASCADE;\n\n`;

for (let i = 2; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length < 2 || !row[1]) continue;

  const nom = String(row[1]).replace(/'/g, "''").trim();
  const prenom = String(row[2]).replace(/'/g, "''").trim();
  
  let dateNaissance = 'NULL';
  if (row[3]) {
    try {
      const d = new Date(row[3]);
      if (!isNaN(d.getTime())) {
        dateNaissance = `'${d.toISOString().split('T')[0]}'`;
      }
    } catch(e){}
  }
  
  const sexe = row[5] === 'F' ? "'F'" : "'M'";
  const telephone_parent = row[6] ? `'${String(row[6]).replace(/'/g, "''")}'` : 'NULL';
  const adresse = row[7] ? `'${String(row[7]).replace(/'/g, "''")}'` : 'NULL';
  const football = row[8] === 'Oui' ? 'TRUE' : 'FALSE';
  const centre_loisirs = row[9] === 'Oui' ? 'TRUE' : 'FALSE';
  const categorie_foot = row[10] ? `'${String(row[10]).replace(/'/g, "''")}'` : 'NULL';
  
  const tarif_football = parseFloat(row[11]) || 0;
  const tarif_loisirs = parseFloat(row[12]) || 0;
  const tarif_total = parseFloat(row[13]) || (tarif_football + tarif_loisirs) || 0;
  
  const observations = row[16] ? `'${String(row[16]).replace(/'/g, "''")}'` : 'NULL';

  sql += `INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)\n`;
  sql += `VALUES ('${nom}', '${prenom}', ${dateNaissance}, ${sexe}, ${telephone_parent}, ${adresse}, ${football}, ${centre_loisirs}, ${categorie_foot}, ${tarif_football}, ${tarif_loisirs}, ${tarif_total}, 'en_attente', ${observations}, false);\n`;
}

fs.writeFileSync('import-academy-2.sql', sql);
console.log("SQL file generated: import-academy-2.sql");
