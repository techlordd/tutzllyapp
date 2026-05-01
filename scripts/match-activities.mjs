import { readFileSync } from 'fs';
import pg from 'pg';

// Load .env.local
const envFile = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    const { rows: counts } = await client.query(`
      SELECT COUNT(*) AS total FROM class_activities
      WHERE entry_status != 'deleted'
        AND (ssid IS NULL OR ssid = '' OR NOT EXISTS (
          SELECT 1 FROM sessions s WHERE s.ssid = class_activities.ssid AND s.entry_status != 'deleted'
        ))
    `);
    console.log('Unlinked activities:', counts[0].total);

    const { rows: unlinked } = await client.query(`
      SELECT record_id, ssid, tutor_id, student_id, course_name, class_activity_date
      FROM class_activities
      WHERE entry_status != 'deleted'
        AND (ssid IS NULL OR ssid = '' OR NOT EXISTS (
          SELECT 1 FROM sessions s WHERE s.ssid = class_activities.ssid AND s.entry_status != 'deleted'
        ))
    `);

    let matched = 0;
    let unmatched = 0;

    for (const act of unlinked) {
      if (!act.tutor_id || !act.student_id || !act.class_activity_date) {
        unmatched++;
        continue;
      }

      // Try exact course + tutor + student match, nearest date
      const { rows: candidates } = await client.query(`
        SELECT ssid, COALESCE(start_session_date, entry_date) AS session_date
        FROM sessions
        WHERE entry_status != 'deleted'
          AND tutor_id = $1
          AND student_id = $2
          AND LOWER(TRIM(COALESCE(course_name,''))) = LOWER(TRIM($3))
          AND COALESCE(start_session_date, entry_date) IS NOT NULL
        ORDER BY ABS(EXTRACT(EPOCH FROM (COALESCE(start_session_date, entry_date)::date - $4::date)))
        LIMIT 1
      `, [act.tutor_id, act.student_id, act.course_name || '', act.class_activity_date]);

      let best = candidates[0];

      if (!best) {
        // Broad: tutor + student only, nearest date
        const { rows: broad } = await client.query(`
          SELECT ssid, COALESCE(start_session_date, entry_date) AS session_date
          FROM sessions
          WHERE entry_status != 'deleted'
            AND tutor_id = $1
            AND student_id = $2
            AND COALESCE(start_session_date, entry_date) IS NOT NULL
          ORDER BY ABS(EXTRACT(EPOCH FROM (COALESCE(start_session_date, entry_date)::date - $3::date)))
          LIMIT 1
        `, [act.tutor_id, act.student_id, act.class_activity_date]);
        best = broad[0];
      }

      if (best) {
        const dayDiff = Math.abs(
          (new Date(act.class_activity_date).getTime() - new Date(best.session_date).getTime()) / 86400000
        );
        if (dayDiff <= 7) {
          await client.query(
            'UPDATE class_activities SET ssid=$1, last_updated=NOW() WHERE record_id=$2',
            [best.ssid, act.record_id]
          );
          console.log(`  ✓ record_id=${act.record_id} → ssid=${best.ssid} (${dayDiff.toFixed(1)}d apart)`);
          matched++;
          continue;
        }
      }

      console.log(`  ✗ record_id=${act.record_id} — no session within 7 days`);
      unmatched++;
    }

    console.log(`\nDone. Matched: ${matched} | Could not match: ${unmatched}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
