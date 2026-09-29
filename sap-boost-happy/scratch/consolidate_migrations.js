import fs from "fs";
import path from "path";

const migrationsDir = "supabase/migrations";
const outputFile = "scratch/combined_migrations.sql";

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let combinedContent = `-- Cleanup existing objects if they exist to prevent conflicts on rerun
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TABLE IF EXISTS public.survey_responses CASCADE;
DROP TABLE IF EXISTS public.system_logs CASCADE;
DROP TABLE IF EXISTS public.surveys CASCADE;
DROP TABLE IF EXISTS public.schedules CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.message_templates CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

`;

for (const file of files) {
  const filePath = path.join(migrationsDir, file);
  const content = fs.readFileSync(filePath, "utf8");
  combinedContent += content + "\n\n";
}

fs.writeFileSync(outputFile, combinedContent, "utf8");
console.log("Migrations consolidated successfully in UTF-8!");
