


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."fn_chip_ledger_deposit"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF (NEW.status = 'approved' OR NEW.status = 'success')
     AND (OLD.status IS DISTINCT FROM 'approved' AND OLD.status IS DISTINCT FROM 'success') THEN
    INSERT INTO chip_ledger(uid, type, amount, direction, ref_id, note)
    VALUES (NEW.uid, 'deposit', NEW.amount, 'credit', NEW.id::text, 'Deposit via ' || COALESCE(NEW.method,'UPI'));
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_chip_ledger_deposit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_chip_ledger_withdraw"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF (NEW.status = 'approved')
     AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO chip_ledger(uid, type, amount, direction, ref_id, note)
    VALUES (NEW.uid, 'withdraw', NEW.amount, 'debit', NEW.id::text, 'Withdrawal via ' || COALESCE(NEW.method,'UPI'));
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_chip_ledger_withdraw"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."blacklist" (
    "id" "text" NOT NULL,
    "name" "text",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."blacklist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."challenges" (
    "id" "text" NOT NULL,
    "game_id" "text",
    "uid" "text",
    "by_name" "text",
    "value" integer,
    "game_type" "text",
    "accepted_by" "text",
    "accepted_by_name" "text",
    "accepted_at" bigint,
    "room_code" "text",
    "at" bigint,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "started_by" "text",
    "status" "text",
    "started_at" bigint,
    "room_code_shared_at" "text",
    "room_code_copied_at" "text",
    "cancelled_by" "text",
    "cancelled_at" "text",
    "setter_started_at" "text",
    "acceptor_started_at" "text",
    "refunded" boolean DEFAULT false
);


ALTER TABLE "public"."challenges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chip_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "uid" "text" NOT NULL,
    "type" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "direction" "text" NOT NULL,
    "ref_id" "text",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."chip_ledger" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conflicts" (
    "id" "text" NOT NULL,
    "challenge_id" "text",
    "game_id" "text",
    "setter_uid" "text",
    "setter_name" "text",
    "setter_phone" "text",
    "acceptor_uid" "text",
    "acceptor_name" "text",
    "acceptor_phone" "text",
    "game_type" "text",
    "amount" numeric,
    "room_code" "text",
    "setter_started_at" "text",
    "acceptor_started_at" "text",
    "setter_proof_url" "text",
    "acceptor_proof_url" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "resolved_by" "text",
    "resolved_at" "text",
    "refund_to" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conflicts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deposits" (
    "id" "text" NOT NULL,
    "uid" "text",
    "user_name" "text",
    "user_phone" "text",
    "user_email" "text",
    "amount" integer,
    "method" "text",
    "txn_id" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."deposits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."games" (
    "id" "text" NOT NULL,
    "name" "text",
    "type" "text" DEFAULT 'regular'::"text",
    "entry" integer DEFAULT 0,
    "prize" integer DEFAULT 0,
    "players" integer DEFAULT 2,
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."games" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."join_requests" (
    "id" "text" NOT NULL,
    "challenge_id" "text" NOT NULL,
    "requester_uid" "text" NOT NULL,
    "requester_name" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."join_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "text" NOT NULL,
    "reporter_uid" "text",
    "reporter_name" "text",
    "opponent" "text",
    "details" "text",
    "proof_url" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."results" (
    "id" "text" NOT NULL,
    "challenge_id" "text",
    "game_id" "text",
    "submitter_uid" "text",
    "submitter_name" "text",
    "submitter_phone" "text",
    "opponent_uid" "text",
    "opponent_name" "text",
    "opponent_phone" "text",
    "game_type" "text",
    "amount" integer,
    "room_code" "text",
    "result" "text",
    "proof_url" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "screenshot_at" "text"
);


ALTER TABLE "public"."results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "key" "text" NOT NULL,
    "value" "text"
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournaments" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "game" "text" NOT NULL,
    "entry" numeric DEFAULT 0 NOT NULL,
    "prize" numeric DEFAULT 0 NOT NULL,
    "players" "text" DEFAULT '0/0'::"text",
    "status" "text" DEFAULT 'upcoming'::"text" NOT NULL,
    "start_time" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tournaments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "uid" "text" NOT NULL,
    "full_name" "text",
    "phone" "text",
    "email" "text",
    "kyc_type" "text",
    "kyc_url" "text",
    "kyc_verified" boolean DEFAULT false,
    "chips" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_admin" boolean DEFAULT false,
    "kyc_back_url" "text",
    "kyc_back_key" "text",
    "aadhaar_number" "text",
    "pan_number" "text",
    "pan_url" "text",
    "pan_key" "text",
    "kyc_rejected" boolean DEFAULT false,
    "kyc_key" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."withdraws" (
    "id" "text" NOT NULL,
    "uid" "text",
    "user_name" "text",
    "user_phone" "text",
    "user_email" "text",
    "amount" integer,
    "method" "text",
    "upi_id" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."withdraws" OWNER TO "postgres";


ALTER TABLE ONLY "public"."blacklist"
    ADD CONSTRAINT "blacklist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chip_ledger"
    ADD CONSTRAINT "chip_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conflicts"
    ADD CONSTRAINT "conflicts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deposits"
    ADD CONSTRAINT "deposits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."join_requests"
    ADD CONSTRAINT "join_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("uid");



ALTER TABLE ONLY "public"."withdraws"
    ADD CONSTRAINT "withdraws_pkey" PRIMARY KEY ("id");



CREATE INDEX "chip_ledger_created_idx" ON "public"."chip_ledger" USING "btree" ("created_at" DESC);



CREATE INDEX "chip_ledger_uid_idx" ON "public"."chip_ledger" USING "btree" ("uid");



CREATE OR REPLACE TRIGGER "trg_chip_ledger_deposit" AFTER UPDATE ON "public"."deposits" FOR EACH ROW EXECUTE FUNCTION "public"."fn_chip_ledger_deposit"();



CREATE OR REPLACE TRIGGER "trg_chip_ledger_withdraw" AFTER UPDATE ON "public"."withdraws" FOR EACH ROW EXECUTE FUNCTION "public"."fn_chip_ledger_withdraw"();



CREATE POLICY "Admin can read all users" ON "public"."users" FOR SELECT TO "authenticated" USING (((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text") OR ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Admin full access" ON "public"."users" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "admin write tournaments" ON "public"."tournaments" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "admin_all" ON "public"."blacklist" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "admin_all" ON "public"."challenges" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "admin_all" ON "public"."deposits" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "admin_all" ON "public"."reports" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "admin_all" ON "public"."results" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "admin_all" ON "public"."users" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "admin_all" ON "public"."withdraws" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "allow all" ON "public"."blacklist" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."challenges" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."deposits" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."games" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."reports" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."results" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."settings" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."users" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."withdraws" USING (true) WITH CHECK (true);



CREATE POLICY "allow_insert_on_signup" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"())::"text" = "uid"));



ALTER TABLE "public"."blacklist" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."challenges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "challenges_read_all_authenticated" ON "public"."challenges" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "challenges_select" ON "public"."challenges" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."chip_ledger" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chip_ledger_read_own" ON "public"."chip_ledger" FOR SELECT TO "authenticated" USING (("uid" = ("auth"."uid"())::"text"));



ALTER TABLE "public"."conflicts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conflicts_admin_all" ON "public"."conflicts" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "conflicts_player_insert" ON "public"."conflicts" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "conflicts_player_read" ON "public"."conflicts" FOR SELECT TO "authenticated" USING ((("setter_uid" = ("auth"."uid"())::"text") OR ("acceptor_uid" = ("auth"."uid"())::"text")));



CREATE POLICY "conflicts_player_update_proof" ON "public"."conflicts" FOR UPDATE TO "authenticated" USING ((("setter_uid" = ("auth"."uid"())::"text") OR ("acceptor_uid" = ("auth"."uid"())::"text")));



ALTER TABLE "public"."deposits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "deposits_read_own" ON "public"."deposits" FOR SELECT TO "authenticated" USING (("uid" = ("auth"."uid"())::"text"));



CREATE POLICY "deposits_select" ON "public"."deposits" FOR SELECT USING (((("auth"."uid"())::"text" = "uid") OR (("auth"."role"() = 'authenticated'::"text") AND "public"."is_admin"())));



ALTER TABLE "public"."games" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."join_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "jr_insert" ON "public"."join_requests" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "jr_read" ON "public"."join_requests" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "jr_update" ON "public"."join_requests" FOR UPDATE TO "authenticated", "anon" USING (true);



CREATE POLICY "public read tournaments" ON "public"."tournaments" FOR SELECT USING (true);



ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reports_select" ON "public"."reports" FOR SELECT USING (((("auth"."uid"())::"text" = "reporter_uid") OR (("auth"."role"() = 'authenticated'::"text") AND "public"."is_admin"())));



ALTER TABLE "public"."results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "results_read_own" ON "public"."results" FOR SELECT TO "authenticated" USING ((("submitter_uid" = ("auth"."uid"())::"text") OR ("opponent_uid" = ("auth"."uid"())::"text")));



CREATE POLICY "results_select" ON "public"."results" FOR SELECT USING (((("auth"."uid"())::"text" = "submitter_uid") OR (("auth"."uid"())::"text" = "opponent_uid") OR (("auth"."role"() = 'authenticated'::"text") AND "public"."is_admin"())));



ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournaments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_insert_own" ON "public"."users" FOR INSERT WITH CHECK ((("auth"."uid"())::"text" = "uid"));



CREATE POLICY "users_read_own" ON "public"."users" FOR SELECT TO "authenticated" USING ((("auth"."uid"())::"text" = "uid"));



CREATE POLICY "users_select_own" ON "public"."users" FOR SELECT USING (((("auth"."uid"())::"text" = "uid") OR (("auth"."role"() = 'authenticated'::"text") AND "public"."is_admin"())));



ALTER TABLE "public"."withdraws" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "withdraws_read_own" ON "public"."withdraws" FOR SELECT TO "authenticated" USING (("uid" = ("auth"."uid"())::"text"));



CREATE POLICY "withdraws_select" ON "public"."withdraws" FOR SELECT USING (((("auth"."uid"())::"text" = "uid") OR (("auth"."role"() = 'authenticated'::"text") AND "public"."is_admin"())));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."join_requests";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."fn_chip_ledger_deposit"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_chip_ledger_deposit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_chip_ledger_deposit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_chip_ledger_withdraw"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_chip_ledger_withdraw"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_chip_ledger_withdraw"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";


















GRANT ALL ON TABLE "public"."blacklist" TO "anon";
GRANT ALL ON TABLE "public"."blacklist" TO "authenticated";
GRANT ALL ON TABLE "public"."blacklist" TO "service_role";



GRANT ALL ON TABLE "public"."challenges" TO "anon";
GRANT ALL ON TABLE "public"."challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."challenges" TO "service_role";



GRANT ALL ON TABLE "public"."chip_ledger" TO "anon";
GRANT ALL ON TABLE "public"."chip_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."chip_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."conflicts" TO "anon";
GRANT ALL ON TABLE "public"."conflicts" TO "authenticated";
GRANT ALL ON TABLE "public"."conflicts" TO "service_role";



GRANT ALL ON TABLE "public"."deposits" TO "anon";
GRANT ALL ON TABLE "public"."deposits" TO "authenticated";
GRANT ALL ON TABLE "public"."deposits" TO "service_role";



GRANT ALL ON TABLE "public"."games" TO "anon";
GRANT ALL ON TABLE "public"."games" TO "authenticated";
GRANT ALL ON TABLE "public"."games" TO "service_role";



GRANT ALL ON TABLE "public"."join_requests" TO "anon";
GRANT ALL ON TABLE "public"."join_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."join_requests" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."results" TO "anon";
GRANT ALL ON TABLE "public"."results" TO "authenticated";
GRANT ALL ON TABLE "public"."results" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."tournaments" TO "anon";
GRANT ALL ON TABLE "public"."tournaments" TO "authenticated";
GRANT ALL ON TABLE "public"."tournaments" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."withdraws" TO "anon";
GRANT ALL ON TABLE "public"."withdraws" TO "authenticated";
GRANT ALL ON TABLE "public"."withdraws" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































