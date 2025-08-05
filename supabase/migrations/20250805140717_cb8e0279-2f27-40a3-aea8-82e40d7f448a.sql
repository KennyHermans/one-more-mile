-- Fix security warnings by setting search_path for functions
ALTER FUNCTION public.check_backup_requirements() SET search_path TO 'public';

-- Update the function to include search_path
CREATE OR REPLACE FUNCTION public.check_backup_requirements()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Automatically set requires_backup_sensei for high-value or high-risk trips
    IF NEW.trip_status = 'approved' AND NEW.requires_backup_sensei IS NULL THEN
        -- Parse price to determine if it's a high-value trip (>$2000)
        DECLARE
            price_numeric numeric;
        BEGIN
            price_numeric := CAST(REPLACE(REPLACE(NEW.price, '$', ''), ',', '') AS numeric);
            
            -- Set backup requirement for high-value trips or international destinations
            IF price_numeric > 2000 OR NEW.difficulty_level IN ('Challenging', 'Expert') THEN
                NEW.requires_backup_sensei := true;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- If price parsing fails, default to false
                NEW.requires_backup_sensei := COALESCE(NEW.requires_backup_sensei, false);
        END;
    END IF;
    
    RETURN NEW;
END;
$$;