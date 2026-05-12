BEGIN;

ALTER TABLE user_roles
  DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (
    role IN (
      'visitor',
      'member',
      'counselor',
      'catalog_viewer',
      'catalog_operator',
      'operator',
      'admin'
    )
  );

COMMIT;
