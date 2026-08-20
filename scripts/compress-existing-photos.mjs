/**
 * Migration script v2: Compress existing photos using DELETE + RE-UPLOAD strategy.
 * Also lists file sizes to understand storage usage.
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabase = createClient(
  "https://xjesvlkjramwbnflqhmg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqZXN2bGtqcmFtd2JuZmxxaG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MjcwOTksImV4cCI6MjA4NzUwMzA5OX0.ZX4Wqb9SeMnLLfhns75rblmCarw-z6-DordjL3jwsLc"
);

const BUCKETS = ["academy_photos", "transport_photos", "academy_receipts"];

async function processBucket(bucket) {
  console.log(`\n📁 Bucket: ${bucket}`);

  const { data: files, error } = await supabase.storage.from(bucket).list("", { limit: 1000 });
  if (error) { console.log(`  ⚠ Error: ${error.message}`); return 0; }
  if (!files || files.length === 0) { console.log("  (empty)"); return 0; }

  console.log(`  ${files.length} fichiers trouvés`);

  let totalOriginal = 0;
  let totalNew = 0;
  let totalSaved = 0;
  let compressed = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    if (file.name === ".emptyFolderPlaceholder") continue;

    // Download
    const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(file.name);
    if (dlErr || !blob) { console.log(`  ⚠ Skip ${file.name}: download failed`); failed++; continue; }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const originalSize = buffer.length;
    totalOriginal += originalSize;

    // Skip PDFs (academy_receipts)
    if (file.name.endsWith(".pdf")) {
      console.log(`  📄 ${file.name}: ${(originalSize / 1024).toFixed(0)} KB (PDF, skip)`);
      totalNew += originalSize;
      skipped++;
      continue;
    }

    // Skip if already small
    if (originalSize < 200 * 1024) {
      console.log(`  ✓ ${file.name}: ${(originalSize / 1024).toFixed(0)} KB (déjà petit)`);
      totalNew += originalSize;
      skipped++;
      continue;
    }

    // Compress
    try {
      const compressedBuf = await sharp(buffer)
        .resize(800, 800, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const newSize = compressedBuf.length;

      // DELETE original
      const { error: delErr } = await supabase.storage.from(bucket).remove([file.name]);
      if (delErr) {
        console.log(`  ⚠ ${file.name}: delete failed (${delErr.message})`);
        totalNew += originalSize;
        failed++;
        continue;
      }

      // RE-UPLOAD compressed
      const { error: upErr } = await supabase.storage.from(bucket).upload(file.name, compressedBuf, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });

      if (upErr) {
        console.log(`  ⚠ ${file.name}: re-upload failed (${upErr.message}) — FILE DELETED!`);
        failed++;
        continue;
      }

      const saved = originalSize - newSize;
      totalNew += newSize;
      totalSaved += saved;
      compressed++;
      console.log(`  ✅ ${file.name}: ${(originalSize / 1024 / 1024).toFixed(1)} MB → ${(newSize / 1024).toFixed(0)} KB (−${(saved / 1024 / 1024).toFixed(1)} MB)`);
    } catch (err) {
      console.log(`  ⚠ ${file.name}: compression error (${err.message})`);
      totalNew += originalSize;
      failed++;
    }
  }

  console.log(`\n  📊 Résumé ${bucket}:`);
  console.log(`     Avant: ${(totalOriginal / 1024 / 1024).toFixed(1)} MB`);
  console.log(`     Après: ${(totalNew / 1024 / 1024).toFixed(1)} MB`);
  console.log(`     Économisé: ${(totalSaved / 1024 / 1024).toFixed(1)} MB`);
  console.log(`     Compressés: ${compressed}, Ignorés: ${skipped}, Échoués: ${failed}`);

  return totalSaved;
}

async function main() {
  console.log("🔄 Compression des photos existantes...\n");
  let grandTotal = 0;

  for (const bucket of BUCKETS) {
    grandTotal += await processBucket(bucket);
  }

  console.log(`\n🎉 TERMINÉ !`);
  console.log(`💾 Espace total libéré: ${(grandTotal / 1024 / 1024 / 1024).toFixed(2)} GB`);
}

main().catch(console.error);
