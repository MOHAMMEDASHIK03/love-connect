CREATE POLICY "Users can delete interests involving them"
ON public.interests
FOR DELETE
TO authenticated
USING ((auth.uid() = from_user_id) OR (auth.uid() = to_user_id));