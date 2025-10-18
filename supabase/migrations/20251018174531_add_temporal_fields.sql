-- Add temporal fields to knowledge table
ALTER TABLE knowledge ADD COLUMN time_start TIMESTAMPTZ;
ALTER TABLE knowledge ADD COLUMN time_end TIMESTAMPTZ;

-- Create index for efficient temporal queries
CREATE INDEX idx_knowledge_time_start ON knowledge (time_start);
CREATE INDEX idx_knowledge_time_end ON knowledge (time_end);
CREATE INDEX idx_knowledge_time_range ON knowledge (time_start, time_end);

-- Add constraint to ensure logical time ordering
ALTER TABLE knowledge ADD CONSTRAINT valid_time_order 
CHECK (time_end IS NULL OR time_start IS NULL OR time_start <= time_end);

-- Add comments describing the temporal fields
COMMENT ON COLUMN knowledge.time_start IS
'Start time for the knowledge entity. Can represent birth, beginning of event, creation date, start of period, etc. Supports any granularity from years to minutes.';

COMMENT ON COLUMN knowledge.time_end IS
'End time for the knowledge entity. Can represent death, end of event, completion date, end of period, etc. NULL indicates ongoing or unknown end time.';

-- Example temporal queries that will now be possible:
--
-- Find entities active during Marlowe's lifetime:
-- SELECT * FROM knowledge 
-- WHERE (time_start <= '1593-05-30'::timestamptz OR time_start IS NULL)
-- AND (time_end >= '1564-02-26'::timestamptz OR time_end IS NULL);
--
-- Find entities from the Elizabethan era:
-- SELECT * FROM knowledge 
-- WHERE time_start >= '1558-11-17'::timestamptz 
-- AND time_end <= '1603-03-24'::timestamptz;
--
-- Find overlapping timeframes:
-- SELECT * FROM knowledge 
-- WHERE time_start <= $end_time AND (time_end >= $start_time OR time_end IS NULL);