PRAGMA foreign_keys = ON;

-- Convert plain string time slots ("HH:MM") in schedule JSON to per-slot objects
-- {time, quantity} using the row's current dose_count as the quantity value.
-- Rows where $.days is already an object of slot-objects are idempotent (ELSE branch).
-- Rows with the very old legacy {"times":[...],"days":...} format have
-- json_type($.days) = 'text' or 'array', so the WHERE clause skips them;
-- parseScheduleJson handles those at read time.
UPDATE prescriptions
SET schedule = json_set(
  prescriptions.schedule,
  '$.days',
  json(COALESCE(
    (
      SELECT json_group_object(
        d.key,
        json(COALESCE(
          (
            SELECT json_group_array(
              CASE s.type
                WHEN 'text'
                  THEN json_object('time', s.value, 'quantity', prescriptions.dose_count)
                ELSE json(s.value)
              END
            )
            FROM json_each(d.value) AS s
          ),
          json('[]')
        ))
      )
      FROM json_each(json_extract(prescriptions.schedule, '$.days')) AS d
    ),
    json('{}')
  ))
)
WHERE json_type(json_extract(prescriptions.schedule, '$.days')) = 'object';

ALTER TABLE prescriptions DROP COLUMN dose_count;
