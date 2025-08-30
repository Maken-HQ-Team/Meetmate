-- Check the current notifications table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check if there are any constraints on the type column
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'notifications' 
AND table_schema = 'public';