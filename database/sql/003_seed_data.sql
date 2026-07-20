-- ============================================================================
-- THE CODING PROFESSIONALS — Seed Data
-- Run after 001 and 002. Creates categories and default settings.
-- Note: profiles/courses seed data should be added after you have real
-- auth.users (profiles are auto-created via trigger on signup), so this
-- file intentionally only seeds data that has no auth dependency.
-- ============================================================================

insert into categories (name, slug, description, icon) values
  ('Web Development', 'web-development', 'HTML, CSS, JavaScript, frameworks and full-stack development', 'code'),
  ('Data Science', 'data-science', 'Python, statistics, machine learning and data analysis', 'bar-chart'),
  ('Mobile Development', 'mobile-development', 'iOS, Android, React Native and Flutter', 'smartphone'),
  ('DevOps & Cloud', 'devops-cloud', 'AWS, Docker, Kubernetes and CI/CD', 'cloud'),
  ('UI/UX Design', 'ui-ux-design', 'Design principles, Figma and prototyping', 'pen-tool'),
  ('Cybersecurity', 'cybersecurity', 'Ethical hacking, network security and cryptography', 'shield'),
  ('Databases', 'databases', 'SQL, PostgreSQL, MongoDB and database design', 'database'),
  ('Career & Soft Skills', 'career-soft-skills', 'Interview prep, freelancing and communication', 'briefcase')
on conflict (slug) do nothing;

insert into settings (key, value) values
  ('site_name', '"The Coding Professionals"'),
  ('site_currency', '"USD"'),
  ('platform_fee_percent', '20'),
  ('support_email', '"support@techdreamafrica.org"'),
  ('maintenance_mode', 'false')
on conflict (key) do nothing;

-- To make a user an admin after they sign up, run:
-- update profiles set role = 'admin' where email = 'you@example.com';
