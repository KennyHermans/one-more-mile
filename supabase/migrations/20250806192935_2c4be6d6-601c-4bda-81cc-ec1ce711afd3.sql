-- Add debug logging and temporarily disable INSERT to isolate the issue
CREATE OR REPLACE FUNCTION public.admin_update_sensei_level(
    p_sensei_id UUID,
    p_new_level TEXT,
    p_reason TEXT,
    p_admin_override BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    sensei_record RECORD;
    old_level TEXT;
    eligibility_check JSONB;
    eligible_level TEXT;
    error_message TEXT;
BEGIN
    -- Input validation
    IF p_sensei_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Sensei ID is required'
        );
    END IF;
    
    IF p_new_level IS NULL OR p_new_level NOT IN ('apprentice', 'journey_guide', 'master_sensei') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid sensei level'
        );
    END IF;
    
    IF p_reason IS NULL OR LENGTH(trim(p_reason)) < 3 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Reason must be at least 3 characters'
        );
    END IF;
    
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.admin_roles 
        WHERE user_id = auth.uid() 
        AND is_active = true 
        AND role = 'admin'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Admin access required'
        );
    END IF;
    
    -- Get current sensei data
    SELECT * INTO sensei_record
    FROM public.sensei_profiles
    WHERE id = p_sensei_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Sensei not found'
        );
    END IF;
    
    old_level := COALESCE(sensei_record.sensei_level, 'apprentice');
    
    -- Debug logging
    RAISE NOTICE 'DEBUG: sensei_id=%, old_level=%, new_level=%, changed_by=%, reason=%, trimmed_reason=%',
        p_sensei_id, old_level, p_new_level, auth.uid(), p_reason, trim(p_reason);
    
    -- Check if level is actually changing
    IF old_level = p_new_level THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Sensei is already at this level'
        );
    END IF;
    
    -- Check eligibility unless admin override is used
    IF NOT p_admin_override THEN
        BEGIN
            eligibility_check := public.check_sensei_level_eligibility(p_sensei_id);
            
            -- Check if the function returned an error
            IF eligibility_check ? 'error' THEN
                error_message := COALESCE(eligibility_check->>'error', 'Unknown eligibility check error');
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'Could not check sensei eligibility: ' || error_message
                );
            END IF;
            
            -- Extract eligible level safely
            eligible_level := eligibility_check->>'eligible_level';
            
            IF eligible_level IS NULL OR eligible_level != p_new_level THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'Sensei does not meet requirements for this level. Use admin override if needed.'
                );
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Error checking sensei eligibility. Use admin override if needed.'
            );
        END;
    END IF;
    
    -- Update the sensei level
    UPDATE public.sensei_profiles
    SET 
        sensei_level = p_new_level,
        level_achieved_at = now(),
        updated_at = now()
    WHERE id = p_sensei_id;
    
    -- TEMPORARILY COMMENT OUT THE INSERT TO TEST
    -- Record in level history
    /*
    INSERT INTO public.sensei_level_history (
        sensei_id,
        previous_level,
        new_level,
        changed_by,
        change_reason
    ) VALUES (
        p_sensei_id,
        old_level,
        p_new_level,
        auth.uid(),
        trim(p_reason)
    );
    */
    
    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'message', format('Sensei level updated from %s to %s (INSERT temporarily disabled for testing)', old_level, p_new_level),
        'previous_level', old_level,
        'new_level', p_new_level,
        'admin_override_used', p_admin_override
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Enhanced error handling with more detail
    RETURN jsonb_build_object(
        'success', false,
        'error', format('Database error: %s (State: %s)', SQLERRM, SQLSTATE)
    );
END;
$$;