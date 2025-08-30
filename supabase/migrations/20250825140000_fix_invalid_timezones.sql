-- Fix any existing profiles with invalid timezone 'America/Calgary'
UPDATE public.profiles 
SET timezone = 'America/Edmonton' 
WHERE timezone = 'America/Calgary';

-- Fix any existing availability records with invalid timezone 'America/Calgary'
UPDATE public.availability 
SET timezone = 'America/Edmonton' 
WHERE timezone = 'America/Calgary';