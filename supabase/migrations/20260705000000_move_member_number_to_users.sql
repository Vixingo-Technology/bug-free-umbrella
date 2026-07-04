-- Move member_number from students to users so every role (not just STUDENT)
-- can hold a JKA-BD-YYMMxxx Reg No.
--
-- 1. Add users.member_number with the unique constraint.
-- 2. Copy any existing student.member_number values to their user row.
-- 3. Drop students.member_number.

alter table public.users
    add column if not exists member_number text;

update public.users u
   set member_number = s.member_number
  from public.students s
 where u.id = s.id
   and s.member_number is not null
   and u.member_number is null;

do $$
begin
    if not exists (
        select 1 from pg_indexes
         where schemaname = 'public'
           and tablename = 'users'
           and indexname = 'users_member_number_key'
    ) then
        alter table public.users
            add constraint users_member_number_key unique (member_number);
    end if;
end$$;

alter table public.students
    drop column if exists member_number;
