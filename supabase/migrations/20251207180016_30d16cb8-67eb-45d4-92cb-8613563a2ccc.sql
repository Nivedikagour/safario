-- Add UPDATE policy for users to update their own roles
CREATE POLICY "Users can update their own role" 
ON public.user_roles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);