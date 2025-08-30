-- Add bio and avatar_url to profiles table
ALTER TABLE public.profiles 
ADD COLUMN bio text,
ADD COLUMN avatar_url text;