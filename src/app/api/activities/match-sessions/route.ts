import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAcademyId } from '@/lib/request-context';

/**
 * POST /api/activities/match-sessions
 * Scans class_activities that have no valid ssid and attempts to match each one
 * to a session by tutor_id + student_id + course_name + nearest date (within 7 days).
 * Updates class_activities.ssid on a successful match.
 */
export async function POST(request: NextRequest) {
  try {
    const academyId = getAcademyId(request);
    const scope = `(academy_id = $1 OR $1 = 0)`;

    // 1. Find activities with no ssid or ssid not present in sessions
    const unlinked = await query<{
      record_id: number;
      ssid: string | null;
      tutor_id: string;
      student_id: string;
      course_name: string;
      class_activity_date: string;
    }>(
      `SELECT ca.record_id, ca.ssid, ca.tutor_id, ca.student_id, ca.course_name, ca.class_activity_date
       FROM class_activities ca
       WHERE ca.entry_status != 'deleted'
         AND ${scope}
         AND (
           ca.ssid IS NULL
           OR ca.ssid = ''
           OR NOT EXISTS (
             SELECT 1 FROM sessions s WHERE s.ssid = ca.ssid AND s.entry_status != 'deleted'
           )
         )`,
      [academyId]
    );

    if (unlinked.length === 0) {
      return NextResponse.json({ matched: 0, unmatched: 0, message: 'All activities already linked.' });
    }

    let matched = 0;
    let unmatched = 0;
    const updates: { record_id: number; ssid: string }[] = [];

    for (const act of unlinked) {
      if (!act.tutor_id || !act.student_id || !act.course_name || !act.class_activity_date) {
        unmatched++;
        continue;
      }

      // Find sessions for the same tutor + student + course, ordered by date proximity
      const candidates = await query<{ ssid: string; session_date: string }>(
        `SELECT ssid,
                COALESCE(start_session_date, entry_date) AS session_date
         FROM sessions
         WHERE entry_status != 'deleted'
           AND ${scope}
           AND tutor_id = $2
           AND student_id = $3
           AND LOWER(TRIM(course_name)) = LOWER(TRIM($4))
           AND COALESCE(start_session_date, entry_date) IS NOT NULL
         ORDER BY ABS(EXTRACT(EPOCH FROM (COALESCE(start_session_date, entry_date)::date - $5::date)))
         LIMIT 1`,
        [academyId, act.tutor_id, act.student_id, act.course_name, act.class_activity_date]
      );

      if (candidates.length === 0) {
        // Try matching by tutor + student only (in case course_name differs slightly)
        const broadCandidates = await query<{ ssid: string; session_date: string }>(
          `SELECT ssid,
                  COALESCE(start_session_date, entry_date) AS session_date
           FROM sessions
           WHERE entry_status != 'deleted'
             AND ${scope}
             AND tutor_id = $2
             AND student_id = $3
             AND COALESCE(start_session_date, entry_date) IS NOT NULL
           ORDER BY ABS(EXTRACT(EPOCH FROM (COALESCE(start_session_date, entry_date)::date - $4::date)))
           LIMIT 1`,
          [academyId, act.tutor_id, act.student_id, act.class_activity_date]
        );

        if (broadCandidates.length > 0) {
          const dayDiff = Math.abs(
            (new Date(act.class_activity_date).getTime() - new Date(broadCandidates[0].session_date).getTime())
            / 86400000
          );
          if (dayDiff <= 7) {
            updates.push({ record_id: act.record_id, ssid: broadCandidates[0].ssid });
            matched++;
            continue;
          }
        }
        unmatched++;
        continue;
      }

      // Accept match only if within 7 days
      const dayDiff = Math.abs(
        (new Date(act.class_activity_date).getTime() - new Date(candidates[0].session_date).getTime())
        / 86400000
      );
      if (dayDiff <= 7) {
        updates.push({ record_id: act.record_id, ssid: candidates[0].ssid });
        matched++;
      } else {
        unmatched++;
      }
    }

    // Batch update
    for (const u of updates) {
      await query(
        `UPDATE class_activities SET ssid = $1, last_updated = NOW() WHERE record_id = $2`,
        [u.ssid, u.record_id]
      );
    }

    return NextResponse.json({
      matched,
      unmatched,
      total_scanned: unlinked.length,
      message: `Linked ${matched} activit${matched === 1 ? 'y' : 'ies'} to sessions. ${unmatched} could not be matched.`,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to match activities to sessions' }, { status: 500 });
  }
}
