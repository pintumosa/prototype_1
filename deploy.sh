#!/bin/bash
set -e

# ─── CONFIG ───────────────────────────────────────────────────────────────────
BACKUP_DIR="$HOME/supabase-backup"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║        WinzoIndia One-Click Deploy       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ─── INPUTS ───────────────────────────────────────────────────────────────────
read -p "New Supabase Project Ref (e.g. abcdefghijklmn): " NEW_REF
read -p "New Supabase URL (e.g. https://xxxx.supabase.co): " NEW_URL
read -p "New Supabase Anon Key: " NEW_ANON_KEY
read -p "New Supabase Service Role Key: " NEW_SERVICE_KEY
read -p "New Supabase DB Password: " NEW_DB_PASS
read -p "Supabase Access Token (sbp_...): " ACCESS_TOKEN
echo ""
read -p "Storj Access Key: " STORJ_ACCESS_KEY
read -p "Storj Secret Key: " STORJ_SECRET_KEY
read -p "Storj Endpoint (e.g. https://gateway.storjshare.io): " STORJ_ENDPOINT
read -p "Storj Bucket name: " STORJ_BUCKET
read -p "Storj Public Base URL: " STORJ_PUBLIC_BASE
echo ""

NEW_DB_URL="postgresql://postgres:${NEW_DB_PASS}@db.${NEW_REF}.supabase.co:5432/postgres"

# ─── 1. RESTORE DATABASE ──────────────────────────────────────────────────────
echo "▶ [1/5] Restoring database schema..."
PGPASSWORD="$NEW_DB_PASS" psql "$NEW_DB_URL" -f "$BACKUP_DIR/schema.sql" > /dev/null 2>&1 && echo "  ✓ Schema restored"

echo "▶ [2/5] Restoring database data + migrations..."
PGPASSWORD="$NEW_DB_PASS" psql "$NEW_DB_URL" -f "$BACKUP_DIR/data.sql" > /dev/null 2>&1 && echo "  ✓ Data restored"
for migration in "$PROJECT_DIR/supabase/migrations/"*.sql; do
  PGPASSWORD="$NEW_DB_PASS" psql "$NEW_DB_URL" -f "$migration" > /dev/null 2>&1
  echo "  ✓ Migration: $(basename $migration)"
done

# ─── 2. DEPLOY EDGE FUNCTIONS ─────────────────────────────────────────────────
echo "▶ [3/5] Linking & deploying edge functions..."
cd "$PROJECT_DIR"
SUPABASE_ACCESS_TOKEN="$ACCESS_TOKEN" supabase link --project-ref "$NEW_REF" > /dev/null 2>&1

for fn in supabase/functions/*/; do
  fname=$(basename "$fn")
  SUPABASE_ACCESS_TOKEN="$ACCESS_TOKEN" supabase functions deploy "$fname" --project-ref "$NEW_REF" > /dev/null 2>&1
  echo "  ✓ Deployed: $fname"
done

# ─── 3. SET SECRETS ───────────────────────────────────────────────────────────
echo "▶ [4/5] Setting secrets..."
SUPABASE_ACCESS_TOKEN="$ACCESS_TOKEN" supabase secrets set \
  SUPABASE_URL="$NEW_URL" \
  SUPABASE_ANON_KEY="$NEW_ANON_KEY" \
  SERVICE_ROLE_KEY="$NEW_SERVICE_KEY" \
  SUPABASE_SERVICE_ROLE_KEY="$NEW_SERVICE_KEY" \
  SUPABASE_DB_URL="$NEW_DB_URL" \
  STORJ_ACCESS_KEY="$STORJ_ACCESS_KEY" \
  STORJ_SECRET_KEY="$STORJ_SECRET_KEY" \
  STORJ_ENDPOINT="$STORJ_ENDPOINT" \
  STORJ_BUCKET="$STORJ_BUCKET" \
  STORJ_PUBLIC_BASE="$STORJ_PUBLIC_BASE" \
  --project-ref "$NEW_REF" > /dev/null 2>&1
echo "  ✓ Secrets set"

# ─── 4. UPDATE FRONTEND CONFIG ────────────────────────────────────────────────
echo "▶ [5/5] Updating frontend env.js..."
cat > "$PROJECT_DIR/frontend/public/js/env.js" <<EOF
window.WINZO_ENV = {
  SUPABASE_URL:     "$NEW_URL",
  SUPABASE_ANON_KEY: "$NEW_ANON_KEY",
  STORJ_UPLOAD_URL: "$NEW_URL/functions/v1/storj-upload",
};
EOF
echo "  ✓ env.js updated"

# ─── DONE ─────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║           ✅ Deploy Complete!            ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  New project URL : $NEW_URL"
echo "  Anon key        : ${NEW_ANON_KEY:0:20}..."
echo ""
echo "  ⚠  Don't forget to set Auth settings manually in Supabase dashboard"
echo "     (email providers, redirect URLs, JWT expiry)"
echo ""
