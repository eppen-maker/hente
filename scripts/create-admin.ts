/**
 * Creates the first SØRKYST administrator.
 *
 *   npm run create-admin -- <email> <password> [first name] [last name]
 */
import { createClient } from "@supabase/supabase-js";

const [email, password, firstName = "SØRKYST", lastName = "Admin"] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !password) {
  console.error("Usage: npm run create-admin -- <email> <password> [first name] [last name]");
  process.exit(1);
}
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName, role: "SORKYST_ADMIN" },
  });
  if (error || !data.user) throw error ?? new Error("Could not create the user");

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      { auth_user_id: data.user.id, email, first_name: firstName, last_name: lastName, role: "SORKYST_ADMIN" },
      { onConflict: "auth_user_id" },
    );
  if (profileError) throw profileError;

  console.log(`Created SØRKYST administrator ${email}. Sign in at /login.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
