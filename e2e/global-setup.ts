import fs from "node:fs";
import { getAdminClient } from "./admin-client";
import { RUNTIME_DIR, USERS_FILE, type E2EUser, type E2EUsers } from "./fixtures";

const PASSWORD = "E2ePlaywright!2026";

async function createUser(
  email: string,
  full_name: string,
  role: "member" | "admin",
): Promise<E2EUser> {
  const admin = getAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (error || !data.user) {
    throw new Error(`E2E: falha ao criar usuário ${email}: ${error?.message ?? "sem user"}`);
  }
  const id = data.user.id;

  if (role === "admin") {
    // O trigger handle_new_user cria a linha em profiles; aguardamos e promovemos.
    let promoted = false;
    for (let i = 0; i < 10 && !promoted; i++) {
      const { error: upErr, count } = await admin
        .from("profiles")
        .update({ role: "admin" }, { count: "exact" })
        .eq("id", id);
      if (!upErr && (count ?? 0) > 0) promoted = true;
      else await new Promise((r) => setTimeout(r, 500));
    }
    if (!promoted) throw new Error(`E2E: não consegui promover ${email} a admin (profile não encontrado).`);
  }

  // Grandfather (0038): dispensa da nova jornada → publica normalmente, como um
  // membro existente. Retry pois a linha em profiles (FK) vem do trigger async.
  let gf = false;
  for (let i = 0; i < 10 && !gf; i++) {
    const { error: gErr } = await admin
      .from("member_onboarding")
      .upsert({ user_id: id, grandfathered_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (!gErr) gf = true;
    else await new Promise((r) => setTimeout(r, 500));
  }
  if (!gf) throw new Error(`E2E: não consegui grandfatherar ${email}.`);

  return { email, password: PASSWORD, id, full_name, role };
}

export default async function globalSetup() {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  const stamp = Date.now();

  const member = await createUser(
    `e2e-member-${stamp}@codex.community`,
    "E2E Membro",
    "member",
  );
  const admin = await createUser(
    `e2e-admin-${stamp}@codex.community`,
    "E2E Admin",
    "admin",
  );

  const users: E2EUsers = { member, admin, createdIds: [member.id, admin.id] };
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  console.log(`[e2e] usuários de teste criados: membro=${member.email} admin=${admin.email}`);
}
