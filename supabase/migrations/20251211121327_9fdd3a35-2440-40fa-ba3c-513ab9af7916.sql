-- Drop existing update policy for lost_items
DROP POLICY IF EXISTS "Users can update their own lost items" ON public.lost_items;

-- Create policy for users to update their own lost items
CREATE POLICY "Users can update their own lost items" 
ON public.lost_items 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policy for authorities to update any lost items
CREATE POLICY "Authorities can update lost items" 
ON public.lost_items 
FOR UPDATE 
USING (has_role(auth.uid(), 'authority'::app_role) OR has_role(auth.uid(), 'admin'::app_role));