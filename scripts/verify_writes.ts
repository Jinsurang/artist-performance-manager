import postgres from "postgres";

async function verifyWrites() {
    const url = "postgresql://postgres.wuldgepokyxcmpydrexe:qkr4871625%40@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";
    const sql = postgres(url, { ssl: 'require' });

    try {
        console.log("🧪 Testing Write Operations...");

        // 1. Write a Test Notice
        const noticeTitle = "Test Notice " + Date.now();
        const noticeContent = "This is a test notice content.";
        const notice = await sql`
      INSERT INTO notices (title, content) VALUES (${noticeTitle}, ${noticeContent})
      RETURNING *
    `;
        console.log(`✅ Notice Written: [${notice[0].title}]`);

        // 2. Write a Test Setting
        const settingKey = "message_template";
        const settingValue = "Hello, this is a test template.";
        const setting = await sql`
      INSERT INTO settings (key, value) VALUES (${settingKey}, ${settingValue})
      ON CONFLICT (key) DO UPDATE SET value = ${settingValue}, updated_at = NOW()
      RETURNING *
    `;
        console.log(`✅ Setting Written: [${setting[0].key}] = ${setting[0].value}`);

        // 3. Verify Reads
        const readNotice = await sql`SELECT * FROM notices WHERE title = ${noticeTitle}`;
        const readSetting = await sql`SELECT * FROM settings WHERE key = ${settingKey}`;

        if (readNotice.length > 0 && readSetting.length > 0) {
            console.log("\n🎉 SUCCESS: All writes verified successfully!");
        } else {
            console.error("\n❌ FAILURE: Could not read back written data.");
        }

        await sql.end();
    } catch (error) {
        console.error("❌ Write Test Failed:", error);
    }
}

verifyWrites();
