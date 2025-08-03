-- Add beer-related credentials to Kenny Hermans' profile for testing enhanced sensei suggestions

-- First, get Kenny's sensei_id (assuming he exists)
DO $$
DECLARE
    kenny_sensei_id UUID;
BEGIN
    -- Find Kenny Hermans' sensei profile
    SELECT id INTO kenny_sensei_id 
    FROM public.sensei_profiles 
    WHERE name ILIKE '%kenny%' AND name ILIKE '%hermans%' 
    LIMIT 1;
    
    IF kenny_sensei_id IS NOT NULL THEN
        -- Add Beer Sommelier Certification
        INSERT INTO public.sensei_certificates (
            sensei_id,
            certificate_name,
            certificate_type,
            verification_status,
            verified_by_admin,
            verified_at,
            issuing_organization,
            issue_date,
            is_active
        ) VALUES (
            kenny_sensei_id,
            'Beer Sommelier Certification',
            'sommelier',
            'verified',
            true,
            NOW(),
            'International Beer Sommelier Association',
            '2023-06-15',
            true
        );
        
        -- Update specialties to include beer-related areas
        UPDATE public.sensei_profiles 
        SET specialties = array_cat(
            COALESCE(specialties, '{}'), 
            ARRAY['Beer Tours', 'Brewery Visits', 'Cultural Food Experiences']
        )
        WHERE id = kenny_sensei_id;
        
        -- Add beer tasting skill
        INSERT INTO public.sensei_skills (
            sensei_id,
            skill_name,
            skill_category,
            proficiency_level,
            years_experience,
            description,
            is_active,
            is_verified,
            verified_by_admin
        ) VALUES (
            kenny_sensei_id,
            'Beer Tasting & Evaluation',
            'culinary',
            'expert',
            5,
            'Expert in beer tasting, evaluation, and pairing with local cuisines',
            true,
            true,
            true
        );
        
        RAISE NOTICE 'Successfully added beer credentials to Kenny Hermans profile (ID: %)', kenny_sensei_id;
    ELSE
        RAISE NOTICE 'Kenny Hermans sensei profile not found';
    END IF;
END $$;