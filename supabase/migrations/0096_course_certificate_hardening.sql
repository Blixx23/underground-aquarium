-- Course certificates, made safe to print.
-- Safe to run more than once. Existing certificates are not changed in any way.
--
-- 1. One certificate per person per COURSE (it was per course title, so two
--    courses with the same title blocked each other, and two requests arriving
--    together made the second one fail).
-- 2. The member confirms the name to print before the certificate is created.
--    Once created, the name is locked and can't be changed.
-- 3. A certificate already earned can still be downloaded if the course is
--    later unpublished.

-- 1. Uniqueness: per course for course certificates, unchanged for the others.
drop index if exists public.society_certificates_once;
create unique index if not exists society_certificates_once
  on public.society_certificates (club_id, user_id, kind, coalesce(title, ''))
  where kind <> 'course';
create unique index if not exists society_certificates_course_once
  on public.society_certificates (user_id, course_id)
  where kind = 'course';

-- 2 and 3. The issuing function now takes the confirmed name.
drop function if exists public.issue_course_certificate(uuid);

create or replace function public.issue_course_certificate(p_course uuid, p_name text default null)
returns public.society_certificates
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_club uuid;
  v_course public.courses;
  v_done public.course_completions;
  v_row public.society_certificates;
  v_name text;
  v_try int := 0;
begin
  if v_user is null then
    raise exception 'Sign in first.';
  end if;

  -- Already issued? Hand back that one, unchanged (the name is locked).
  select * into v_row from public.society_certificates
    where user_id = v_user and kind = 'course' and course_id = p_course
    limit 1;
  if found then
    if v_row.status = 'revoked' then
      raise exception 'This certificate was revoked. Contact hello@undergroundaquarium.com.';
    end if;
    return v_row;
  end if;

  -- New certificates only for live courses the member has finished.
  select * into v_course from public.courses where id = p_course and is_published;
  if not found then
    raise exception 'That course doesn''t exist.';
  end if;
  select * into v_done from public.course_completions where user_id = v_user and course_id = p_course;
  if not found then
    raise exception 'Finish the course to get its certificate.';
  end if;

  -- The name the member confirmed on the certificate page, tidied: single
  -- spaces, no edge spaces. (Called without one, it falls back to the profile
  -- name like before, so nothing breaks between running this and the deploy.)
  v_name := nullif(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
  if v_name is null then
    select coalesce(nullif(btrim(p.full_name), ''), p.username, 'Aquarist') into v_name
      from public.profiles p where p.id = v_user;
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'The name must be 2 to 60 characters.';
  end if;

  select id into v_club from public.clubs where slug = 'underground-aquarium-society';

  loop
    begin
      insert into public.society_certificates
        (club_id, user_id, kind, program, title, detail, recipient_name, course_id, code, legacy_code, issued_at)
      values
        (v_club, v_user, 'course', 'C', v_course.title, nullif(btrim(v_course.badge_title), ''), v_name, p_course,
         public.ua_code('C'),
         -- The old credential ID keeps working, as long as nobody else holds it.
         case when v_done.certificate_code is not null
                and not exists (select 1 from public.society_certificates x where x.legacy_code = v_done.certificate_code)
              then v_done.certificate_code end,
         coalesce(v_done.completed_at, now()))
      returning * into v_row;
      return v_row;
    exception when unique_violation then
      -- Another request issued it a moment ago: return that one.
      select * into v_row from public.society_certificates
        where user_id = v_user and kind = 'course' and course_id = p_course
        limit 1;
      if found then
        return v_row;
      end if;
      -- Otherwise the random code collided; try a fresh code.
      v_try := v_try + 1;
      if v_try > 5 then
        raise;
      end if;
    end;
  end loop;
end;
$function$;

revoke all on function public.issue_course_certificate(uuid, text) from public, anon;
grant execute on function public.issue_course_certificate(uuid, text) to authenticated, service_role;
