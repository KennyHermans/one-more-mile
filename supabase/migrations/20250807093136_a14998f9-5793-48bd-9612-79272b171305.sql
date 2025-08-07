-- Create trigger to automatically grant elevated permissions when sensei is assigned
CREATE OR REPLACE TRIGGER trips_auto_grant_permissions_trigger
  AFTER UPDATE OF sensei_id ON public.trips
  FOR EACH ROW
  WHEN (NEW.sensei_id IS NOT NULL AND (OLD.sensei_id IS NULL OR OLD.sensei_id != NEW.sensei_id))
  EXECUTE FUNCTION public.auto_grant_elevated_permissions();

-- Also trigger on INSERT when sensei_id is set
CREATE OR REPLACE TRIGGER trips_auto_grant_permissions_insert_trigger
  AFTER INSERT ON public.trips
  FOR EACH ROW
  WHEN (NEW.sensei_id IS NOT NULL)
  EXECUTE FUNCTION public.auto_grant_elevated_permissions();

-- Apply retroactively to existing trips with assigned senseis
DO $$
DECLARE
  trip_record RECORD;
BEGIN
  -- Process all existing trips that have senseis assigned
  FOR trip_record IN 
    SELECT id, sensei_id, required_permission_level, created_by_sensei_level
    FROM public.trips 
    WHERE sensei_id IS NOT NULL 
    AND is_active = TRUE
  LOOP
    -- Simulate the trigger by calling the function for each trip
    UPDATE public.trips 
    SET updated_at = now() 
    WHERE id = trip_record.id;
  END LOOP;
END $$;