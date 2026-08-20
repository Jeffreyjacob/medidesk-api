-- A FUNCTION is a reusable piece of logic Postgres can run — think of it
-- like defining a function in TypeScript, except it lives inside the database.
CREATE OR REPLACE FUNCTION patient_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', COALESCE(NEW."firstName", '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW."lastName", '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW."email", '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- A TRIGGER says "run this function automatically whenever X happens."
-- Here: before any INSERT or UPDATE on Patient, run the function above first.
CREATE TRIGGER patient_search_vector_trigger
BEFORE INSERT OR UPDATE ON "Patient"
FOR EACH ROW EXECUTE FUNCTION patient_search_vector_update();