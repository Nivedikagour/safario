-- Create FIR reports table
CREATE TABLE public.fir_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fir_number TEXT NOT NULL UNIQUE,
  incident_type TEXT NOT NULL,
  description TEXT NOT NULL,
  location_lat NUMERIC NOT NULL,
  location_lng NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'filed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.fir_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for FIR reports
CREATE POLICY "Users can view their own FIR reports" 
ON public.fir_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own FIR reports" 
ON public.fir_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authorities can view all FIR reports" 
ON public.fir_reports 
FOR SELECT 
USING (has_role(auth.uid(), 'authority'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authorities can update FIR reports" 
ON public.fir_reports 
FOR UPDATE 
USING (has_role(auth.uid(), 'authority'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_fir_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_fir_reports_updated_at
BEFORE UPDATE ON public.fir_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_fir_updated_at();