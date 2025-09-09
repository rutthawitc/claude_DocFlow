ALTER TABLE "documents" ADD COLUMN "has_additional_docs" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "additional_docs_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "additional_docs" text[];