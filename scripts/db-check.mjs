import postgres from 'postgres'

const sql = postgres('postgresql://postgres:Hm1d7R94xVLUyuCB@db.sgsasisyljbubutjzvhb.supabase.co:5432/postgres', { ssl: 'require' })

async function checkSchema() {
  const tables = ['products', 'categories', 'profiles', 'quotations']
  
  for (const table of tables) {
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = ${table}
      ORDER BY ordinal_position;
    `
    console.log(`\n=== Table: ${table} ===\n`)
    console.table(columns)
  }
  
  process.exit(0)
}

checkSchema().catch(console.error)
