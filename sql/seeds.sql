USE attendance_system;

-- Admin user (password: admin123)
INSERT INTO users (username, email, password, first_name, last_name, role)
VALUES (
  'admin',
  'admin@school.edu',
  '$2a$10$VwzuNoU1vDp/IQZjQvRnE.3DAUgd1X29RxUR/d3KvWpzDZdkTvQpO',
  'System',
  'Admin',
  'admin'
);

-- Teacher user (password: teacher123)
INSERT INTO users (username, email, password, first_name, last_name, role)
VALUES (
  'teacher1',
  'teacher@school.edu',
  '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq4H3zQYlR/.H6d8vJQz6dYi2Dd7mW',
  'John',
  'Smith',
  'teacher'
);

-- Student user (password: student123)
INSERT INTO users (username, email, password, first_name, last_name, role)
VALUES (
  'student1',
  'student@school.edu',
  '$2a$10$5rQ1ZzUzZBjJQ4XvY4hQp.8q9zW9v1l5X7JkYwV8LrN3yK1Xv6JW2',
  'Alice',
  'Johnson',
  'student'
);

-- Sample class
INSERT INTO classes (name, code, teacher_id, schedule)
VALUES (
  'Mathematics 101',
  'MATH101',
  (SELECT id FROM users WHERE username = 'teacher1'),
  'Monday/Wednesday 10:00-11:30'
);

-- Enrollment
INSERT INTO class_students (class_id, student_id)
VALUES (
  (SELECT id FROM classes WHERE code = 'MATH101'),
  (SELECT id FROM users WHERE username = 'student1')
);