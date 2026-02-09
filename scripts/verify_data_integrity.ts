import postgres from "postgres";

async function verifyDataIntegrity() {
    const url = "postgresql://postgres.wuldgepokyxcmpydrexe:qkr4871625%40@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";
    const sql = postgres(url, { ssl: 'require' });

    try {
        console.log("🔍 Verifying Data Integrity in Supabase...");

        // 1. Check Users (Admin)
        const users = await sql`SELECT * FROM users`;
        console.log(`\n👤 Users (${users.length}):`);
        users.forEach(u => console.log(` - [${u.role}] ${u.name || 'No Name'} (OpenID: ${u.open_id})`));

        // 2. Check Artists
        const artists = await sql`SELECT * FROM artists ORDER BY created_at DESC LIMIT 5`;
        console.log(`\n🎤 Recent Artists (${artists.length}):`);
        artists.forEach(a => console.log(` - ${a.name} (${a.genre}) - Created: ${a.created_at}`));

        // 3. Check Notices
        const notices = await sql`SELECT * FROM notices ORDER BY created_at DESC LIMIT 5`;
        console.log(`\n📢 Recent Notices (${notices.length}):`);
        notices.forEach(n => console.log(` - [${n.title}] ${n.content?.substring(0, 30)}...`));

        // 4. Check Settings (Message Template)
        const settings = await sql`SELECT * FROM settings`;
        console.log(`\n⚙️ Settings (${settings.length}):`);
        settings.forEach(s => console.log(` - ${s.key}: ${s.value?.substring(0, 50)}...`));

        await sql.end();
    } catch (error) {
        console.error("❌ Verification failed:", error);
    }
}

verifyDataIntegrity();
