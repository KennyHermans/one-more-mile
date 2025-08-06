-- Step 1: Temporarily disable the problematic trigger
DROP TRIGGER IF EXISTS handle_sensei_level_change_trigger ON public.sensei_profiles;

-- Step 2: Fix the get_sensei_permissions function with proper JSON building
CREATE OR REPLACE FUNCTION public.get_sensei_permissions(p_sensei_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    sensei_data RECORD;
    permissions JSONB;
    field_permissions TEXT[];
BEGIN
    -- Get sensei data
    SELECT sensei_level INTO sensei_data
    FROM public.sensei_profiles
    WHERE id = p_sensei_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Sensei not found');
    END IF;

    -- Get level permissions with proper JSONB construction
    SELECT 
        jsonb_build_object(
            'can_view_trips', COALESCE(slp.can_view_trips, true),
            'can_apply_backup', COALESCE(slp.can_apply_backup, true),
            'can_edit_profile', COALESCE(slp.can_edit_profile, true),
            'can_edit_trips', COALESCE(slp.can_edit_trips, false),
            'can_create_trips', COALESCE(slp.can_create_trips, false),
            'can_use_ai_builder', COALESCE(slp.can_use_ai_builder, false),
            'can_publish_trips', COALESCE(slp.can_publish_trips, false),
            'can_modify_pricing', COALESCE(slp.can_modify_pricing, false),
            'trip_edit_fields', COALESCE(
                (SELECT jsonb_agg(slfp.field_name) 
                 FROM public.sensei_level_field_permissions slfp 
                 WHERE slfp.sensei_level = sensei_data.sensei_level AND slfp.can_edit = true),
                '[]'::jsonb
            )
        ) INTO permissions
    FROM public.sensei_level_permissions slp
    WHERE slp.sensei_level = sensei_data.sensei_level;

    -- If no permissions found, return defaults
    IF permissions IS NULL THEN
        permissions := jsonb_build_object(
            'can_view_trips', true,
            'can_apply_backup', true,
            'can_edit_profile', true,
            'can_edit_trips', false,
            'can_create_trips', false,
            'can_use_ai_builder', false,
            'can_publish_trips', false,
            'can_modify_pricing', false,
            'trip_edit_fields', '[]'::jsonb
        );
    END IF;

    RETURN permissions;
END;
$function$;