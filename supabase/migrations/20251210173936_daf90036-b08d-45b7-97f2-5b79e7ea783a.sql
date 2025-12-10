-- Enable realtime for lost_items and fir_reports tables
ALTER TABLE public.lost_items REPLICA IDENTITY FULL;
ALTER TABLE public.fir_reports REPLICA IDENTITY FULL;

-- Add tables to realtime publication (only if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'lost_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lost_items;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'fir_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fir_reports;
  END IF;
END $$;