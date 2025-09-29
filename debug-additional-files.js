// Debug script to check additional files in database
// Run with: node debug-additional-files.js

const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

const sql = postgres('postgresql://postgres:postgres@localhost:5432/docflow_db');
const db = drizzle(sql);

async function debugAdditionalFiles() {
  try {
    // Get the latest document that has additional files
    const result = await sql`
      SELECT
        id,
        document_id,
        item_index,
        item_name,
        original_filename,
        file_size,
        created_at
      FROM additional_document_files
      ORDER BY created_at DESC
      LIMIT 10
    `;

    console.log('Recent additional document files:');
    console.table(result);

    // Check for any document that has both emendation and additional files
    const docWithFiles = await sql`
      SELECT
        document_id,
        COUNT(*) as total_files,
        COUNT(CASE WHEN item_index = 0 THEN 1 END) as emendation_files,
        COUNT(CASE WHEN item_index > 0 THEN 1 END) as additional_files
      FROM additional_document_files
      GROUP BY document_id
      HAVING COUNT(*) > 1
      ORDER BY document_id DESC
    `;

    console.log('\nDocuments with multiple files:');
    console.table(docWithFiles);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

debugAdditionalFiles();