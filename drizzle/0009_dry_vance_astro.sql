CREATE TABLE "additional_document_correction_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"item_index" integer NOT NULL,
	"item_name" varchar(255) NOT NULL,
	"correction_count" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "additional_document_correction_tracking_document_id_item_index_unique" UNIQUE("document_id","item_index")
);
--> statement-breakpoint
CREATE TABLE "emendation_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"file_size" integer NOT NULL,
	"uploader_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "additional_document_files" ADD COLUMN "correction_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "additional_document_files" ADD COLUMN "due_date" date;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "department_name" varchar(255);--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "additional_docs_due_dates" text[];--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "send_back_original_document" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "send_back_date" date;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "deadline_date" date;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "received_paper_doc_date" date;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "additional_docs_received_date" date;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "disbursement_date" date;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "disbursement_confirmed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "disbursement_paid" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "additional_document_correction_tracking" ADD CONSTRAINT "additional_document_correction_tracking_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emendation_documents" ADD CONSTRAINT "emendation_documents_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emendation_documents" ADD CONSTRAINT "emendation_documents_uploader_id_users_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;