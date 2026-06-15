-- Sync photos from photos table into users.photo / users.photo_thumb
-- Run on production MySQL: mysql -u USER -p admin_testdating < sync-photos-mysql.sql
--
-- Updates every user whose photo field is empty with their first approved photo.
-- Safe to re-run: only affects users with an empty photo field.

USE admin_testdating;

UPDATE users u
INNER JOIN (
  SELECT p1.user_id, p1.photo AS best_photo, COALESCE(p1.thumb, p1.photo) AS best_thumb
  FROM photos p1
  WHERE p1.approved = 1
    AND NOT EXISTS (
      SELECT 1 FROM photos p2
      WHERE p2.user_id = p1.user_id
        AND p2.approved = 1
        AND (p2.main > p1.main OR (p2.main = p1.main AND p2.id < p1.id))
    )
) best ON best.user_id = u.id
SET u.photo = best.best_photo,
    u.photo_thumb = best.best_thumb
WHERE (u.photo IS NULL OR u.photo = '');

SELECT ROW_COUNT() AS users_updated;
