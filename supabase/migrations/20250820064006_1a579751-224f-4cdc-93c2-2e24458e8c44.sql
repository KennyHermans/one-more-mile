-- Add field permissions for master Senseis to edit current_participants and group_size
INSERT INTO public.sensei_level_field_permissions (sensei_level, field_name, field_category, can_view, can_edit)
VALUES 
  ('master_sensei', 'current_participants', 'participants', true, true),
  ('master_sensei', 'group_size', 'participants', true, true)
ON CONFLICT (sensei_level, field_name) 
DO UPDATE SET 
  can_view = EXCLUDED.can_view,
  can_edit = EXCLUDED.can_edit;

-- Ensure journey_guide can view but not edit participant fields
INSERT INTO public.sensei_level_field_permissions (sensei_level, field_name, field_category, can_view, can_edit)
VALUES 
  ('journey_guide', 'current_participants', 'participants', true, false),
  ('journey_guide', 'group_size', 'participants', true, false)
ON CONFLICT (sensei_level, field_name) 
DO UPDATE SET 
  can_view = EXCLUDED.can_view,
  can_edit = EXCLUDED.can_edit;

-- Ensure apprentice can view but not edit participant fields
INSERT INTO public.sensei_level_field_permissions (sensei_level, field_name, field_category, can_view, can_edit)
VALUES 
  ('apprentice', 'current_participants', 'participants', true, false),
  ('apprentice', 'group_size', 'participants', true, false)
ON CONFLICT (sensei_level, field_name) 
DO UPDATE SET 
  can_view = EXCLUDED.can_view,
  can_edit = EXCLUDED.can_edit;

-- Create a trigger function to validate participant updates
CREATE OR REPLACE FUNCTION public.validate_participant_updates()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  sensei_level TEXT;
  is_admin_user BOOLEAN := false;
  is_master_sensei BOOLEAN := false;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = auth.uid() AND is_active = true
  ) INTO is_admin_user;
  
  -- If admin, allow all updates
  IF is_admin_user THEN
    -- Validate that current_participants is not negative
    IF NEW.current_participants < 0 THEN
      RAISE EXCEPTION 'Current participants cannot be negative';
    END IF;
    
    -- Validate that current_participants doesn't exceed max_participants
    IF NEW.current_participants > NEW.max_participants THEN
      RAISE EXCEPTION 'Current participants cannot exceed maximum participants';
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Check if user is the assigned sensei and get their level
  SELECT sp.sensei_level INTO sensei_level
  FROM public.sensei_profiles sp
  WHERE sp.id = NEW.sensei_id AND sp.user_id = auth.uid();
  
  -- If user is master sensei assigned to this trip
  IF sensei_level = 'master_sensei' THEN
    is_master_sensei := true;
  END IF;
  
  -- Check if participant fields are being updated
  IF (OLD.current_participants IS DISTINCT FROM NEW.current_participants OR 
      OLD.group_size IS DISTINCT FROM NEW.group_size) THEN
    
    -- Only allow if user is admin or master sensei
    IF NOT (is_admin_user OR is_master_sensei) THEN
      RAISE EXCEPTION 'Only admins and master senseis can update participant information';
    END IF;
    
    -- Validate current_participants
    IF NEW.current_participants < 0 THEN
      RAISE EXCEPTION 'Current participants cannot be negative';
    END IF;
    
    -- For master senseis, prevent exceeding max_participants
    IF is_master_sensei AND NEW.current_participants > NEW.max_participants THEN
      RAISE EXCEPTION 'Current participants cannot exceed maximum participants';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on trips table
DROP TRIGGER IF EXISTS validate_participant_updates_trigger ON public.trips;
CREATE TRIGGER validate_participant_updates_trigger
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_participant_updates();