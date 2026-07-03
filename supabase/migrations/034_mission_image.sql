-- Add optional cover image URL to missions
ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS image_url TEXT;
