ALTER TABLE "additional_document_files" ADD COLUMN "is_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "additional_document_files" ADD COLUMN "verified_by" integer;--> statement-breakpoint
ALTER TABLE "additional_document_files" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "additional_document_files" ADD CONSTRAINT "additional_document_files_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;