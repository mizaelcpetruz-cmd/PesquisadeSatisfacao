import { supabaseAdmin } from "../src/integrations/supabase/client.server";

async function main() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    console.error("Erro ao listar usuários:", error);
  } else {
    console.log(
      "Auth users list:",
      data.users.map((u) => ({
        id: u.id,
        email: u.email,
        email_confirmed_at: u.email_confirmed_at,
        user_metadata: u.user_metadata,
        app_metadata: u.app_metadata,
      })),
    );
  }
}

main().catch(console.error);
