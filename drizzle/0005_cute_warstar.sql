CREATE TABLE "additional_document_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"item_index" integer NOT NULL,
	"item_name" text NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"file_size" integer NOT NULL,
	"uploader_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "additional_document_files" ADD CONSTRAINT "additional_document_files_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "additional_document_files" ADD CONSTRAINT "additional_document_files_uploader_id_users_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;