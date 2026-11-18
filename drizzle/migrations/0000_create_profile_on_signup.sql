CREATE OR REPLACE FUNCTION public.heartmatch_create_profile_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  profile_age integer;
  profile_gender text;
BEGIN
  IF NEW.raw_user_meta_data ? 'name'
     AND NULLIF(trim(NEW.raw_user_meta_data->>'name'), '') IS NOT NULL
     AND NULLIF(trim(NEW.raw_user_meta_data->>'gender'), '') IS NOT NULL
     AND NULLIF(trim(NEW.raw_user_meta_data->>'mobile'), '') IS NOT NULL
     AND NULLIF(trim(NEW.raw_user_meta_data->>'location'), '') IS NOT NULL
     AND COALESCE(NEW.raw_user_meta_data->>'age', '') ~ '^[0-9]{1,3}$' THEN
    profile_age := (NEW.raw_user_meta_data->>'age')::integer;
    IF profile_age < 18 OR profile_age > 100 THEN
      RETURN NEW;
    END IF;

    profile_gender := CASE NEW.raw_user_meta_data->>'gender'
      WHEN 'Male' THEN 'Male'
      WHEN 'Female' THEN 'Female'
      ELSE 'Other'
    END;

    INSERT INTO public.profiles (
      user_id, name, age, gender, mobile, location, email
    ) VALUES (
      NEW.id,
      trim(NEW.raw_user_meta_data->>'name'),
      profile_age,
      profile_gender,
      trim(NEW.raw_user_meta_data->>'mobile'),
      trim(NEW.raw_user_meta_data->>'location'),
      COALESCE(NEW.email, '')
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.heartmatch_create_profile_on_signup() FROM PUBLIC;

CREATE TRIGGER heartmatch_create_profile_after_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.heartmatch_create_profile_on_signup();