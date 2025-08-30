-- Ensure avatars storage bucket exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
        INSERT INTO storage.buckets (id, name, public) 
        VALUES ('avatars', 'avatars', true);
    END IF;
END $$;

-- Create storage policies for avatars bucket (only if not already present)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Avatar images are publicly accessible'
    ) THEN
        CREATE POLICY "Avatar images are publicly accessible"
        ON storage.objects
        FOR SELECT USING (bucket_id = 'avatars');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload their own avatar'
    ) THEN
        CREATE POLICY "Users can upload their own avatar"
        ON storage.objects
        FOR INSERT WITH CHECK (
            bucket_id = 'avatars'
            AND auth.uid()::text = (storage.foldername(name))[1]
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own avatar'
    ) THEN
        CREATE POLICY "Users can update their own avatar"
        ON storage.objects
        FOR UPDATE USING (
            bucket_id = 'avatars'
            AND auth.uid()::text = (storage.foldername(name))[1]
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own avatar'
    ) THEN
        CREATE POLICY "Users can delete their own avatar"
        ON storage.objects
        FOR DELETE USING (
            bucket_id = 'avatars'
            AND auth.uid()::text = (storage.foldername(name))[1]
        );
    END IF;
END $$;

-- Update profiles table to ensure avatar_url column exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add index on user_id for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
