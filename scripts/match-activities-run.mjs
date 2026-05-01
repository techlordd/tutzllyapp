import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_BNa8T5GmUpkK@ep-patient-mode-a4ycodsc-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

try {
  // Count unlinked
  const { rows: [{ total }] } = await pool.query(`
    SELECT COUNT(*) AS total FROM class_activities
    WHERE entry_status != 'deleted'
      AND (ssid IS NULL OR ssid = ''
        OR NOT EXISTS (SELECT 1 FROM sessions s WHERE s.ssid = class_activities.ssid AND s.entry_status != 'deleted'))
  `);
  console.log('Unlinked activities:', total);

  // Fetch unlinked activities
  const { rows: unlinked } = await pool.query(`
    SELECT record_id, ssid, tutor_id, student_id, course_name, class_activity_date
    FROM class_activities
    WHERE entry_status != 'deleted'
      AND (ssid IS NULL OR ssid = ''
        OR NOT EXISTS (SELECT 1 FROM sessions s WHERE s.ssid = class_activities.ssid AND s.entry_status != 'deleted'))
    ORDER BY record_id
  `);

  let matched = 0, skipped = 0, unmatched = 0;
  const usedSsids = new Set();

  for (const act of unlinked) {
    if (!act.tutor_id || !act.student_id || !act.class_activity_date) { unmatched++; continue; }

    const { rows } = await pool.query(`
      SELECT ssid, COALESCE(start_session_date, entry_date) AS session_date
      FROM sessions
      WHERE entry_status != 'deleted'
        AND tutor_id = $1 AND student_id = $2
        AND LOWER(TRIM(COALESCE(course_name,''))) = LOWER(TRIM($3))
        AND COALESCE(start_session_date, entry_date) IS NOT NULL
        AND ABS(COALESCE(start_session_date, entry_date)::date - $4::date) <= 7
      ORDER BY ABS(COALESCE(start_session_date, entry_date)::date - $4::date)
      LIMIT 5
    `, [act.tutor_id, act.student_id, act.course_name || '', act.class_activity_date]);

    // Find a session not already claimed in this run
    const best = rows.find(r => !usedSsids.has(r.ssid));
    if (!best) { unmatched++; continue; }

    // Check if another activity already has this ssid in DB
    const { rows: [existing] } = await pool.query(
      `SELECT record_id FROM class_activities WHERE ssid = $1 AND entry_status != 'deleted' AND record_id != $2 LIMIT 1`,
      [best.ssid, act.record_id]
    );
    if (existing) { skipped++; continue; }

    await pool.query(
      `UPDATE class_activities SET ssid = $1, last_updated = NOW() WHERE record_id = $2`,
      [best.ssid, act.record_id]
    );
    usedSsids.add(best.ssid);
    console.log(`  matched activity#${act.record_id} -> session ${best.ssid}`);
    matched++;
  }

  console.log(`\nDone. Matched: ${matched} | Skipped (conflict): ${skipped} | No match: ${unmatched}`);
} catch(e) {
  console.error('ERROR:', e.message);
} finally {
  await pool.end();
}
