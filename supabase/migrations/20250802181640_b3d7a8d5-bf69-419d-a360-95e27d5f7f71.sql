-- Create function to send welcome message to new Senseis
CREATE OR REPLACE FUNCTION public.send_welcome_message_to_sensei(sensei_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert welcome announcement for the specific sensei
  INSERT INTO public.admin_announcements (
    title,
    content,
    priority,
    target_audience,
    specific_sensei_ids,
    created_by_admin,
    is_active
  ) VALUES (
    'Welcome to One More Mile!',
    'Hi Sensei, welcome to One More Mile! This is your news board—stay tuned for updates and inspiration. We''re excited to have you join our community of adventure guides!',
    'high',
    'specific_senseis',
    ARRAY[sensei_id],
    true,
    true
  );
END;
$$;

-- Create trigger function for new sensei profiles
CREATE OR REPLACE FUNCTION public.handle_new_sensei_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Send welcome message when a new sensei profile is created
  PERFORM public.send_welcome_message_to_sensei(NEW.id);
  RETURN NEW;
END;
$$;

-- Create trigger function for approved applications
CREATE OR REPLACE FUNCTION public.handle_approved_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if application was just approved (status changed from not approved to approved)
  IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
    -- Check if a sensei profile exists for this user, if so send welcome message
    DECLARE
      sensei_profile_id UUID;
    BEGIN
      SELECT id INTO sensei_profile_id 
      FROM public.sensei_profiles 
      WHERE user_id = NEW.user_id 
      LIMIT 1;
      
      IF sensei_profile_id IS NOT NULL THEN
        PERFORM public.send_welcome_message_to_sensei(sensei_profile_id);
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trigger_new_sensei_welcome
  AFTER INSERT ON public.sensei_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_sensei_profile();

CREATE TRIGGER trigger_approved_application_welcome
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_approved_application();

-- Create a function to manually send welcome message (useful for existing senseis)
CREATE OR REPLACE FUNCTION public.send_welcome_to_all_existing_senseis()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sensei_record RECORD;
  welcome_count INTEGER := 0;
BEGIN
  -- Loop through all active senseis who don't have a welcome message yet
  FOR sensei_record IN 
    SELECT sp.id, sp.name
    FROM public.sensei_profiles sp
    WHERE sp.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.admin_announcements aa
      WHERE aa.title = 'Welcome to One More Mile!'
      AND aa.target_audience = 'specific_senseis'
      AND sp.id = ANY(aa.specific_sensei_ids)
    )
  LOOP
    PERFORM public.send_welcome_message_to_sensei(sensei_record.id);
    welcome_count := welcome_count + 1;
  END LOOP;
  
  RETURN welcome_count;
END;
$$;