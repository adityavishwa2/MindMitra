ALTER TABLE "SessionQuestion" ADD COLUMN "snapshot" JSONB;
UPDATE "SessionQuestion" sq SET "snapshot"=jsonb_build_object('id',q.id,'number',q.number,'text',q.text,'type',q.type,'options',q.options,'subject',q.subject,'topic',q.topic,'sourcePage',q."sourcePage",'explanation',q.explanation) FROM "Question" q WHERE q.id=sq."questionId";
ALTER TABLE "SessionQuestion" ALTER COLUMN "snapshot" SET NOT NULL;
