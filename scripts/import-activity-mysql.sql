-- Import recent activity from old site DB (admin_richdatingnetwork) into new DB (admin_testdating)
-- Run on production MySQL: mysql -u USER -p < import-activity-mysql.sql
--
-- Only imports activities for users that exist in the new DB.
-- Skips system/login activities. Safe to re-run (uses INSERT IGNORE on id if ids match,
-- otherwise just appends — remove the id column from the SELECT if you want auto-increment).

USE admin_testdating;

INSERT INTO activity (type, user_id, title, message, time)
SELECT
  a.a_type,
  a.uid,
  a.title,
  CASE
    WHEN a.message LIKE '{%' THEN
      COALESCE(
        SUBSTRING_INDEX(SUBSTRING_INDEX(a.message, '"message":"', -1), '"', 1),
        a.title
      )
    ELSE a.message
  END AS message,
  CAST(a.time AS UNSIGNED)
FROM admin_richdatingnetwork.activity a
WHERE a.a_type NOT IN ('system', 'login')
  AND a.uid > 0
  AND EXISTS (
    SELECT 1 FROM admin_testdating.users u WHERE u.id = a.uid
  )
  AND NOT EXISTS (
    SELECT 1 FROM admin_testdating.activity na
    WHERE na.user_id = a.uid
      AND na.title = a.title
      AND na.time = CAST(a.time AS UNSIGNED)
  )
ORDER BY CAST(a.time AS UNSIGNED) DESC
LIMIT 10000;

SELECT ROW_COUNT() AS rows_imported;
