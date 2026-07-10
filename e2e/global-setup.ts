import fs from "node:fs";
import { getAdminClient } from "./admin-client";
import { RUNTIME_DIR, USERS_FILE, type E2EUser, type E2EUsers } from "./fixtures";
import { seedWelcomeVideoSettings } from "./settings-backup";

const PASSWORD = "E2ePlaywright!2026";

async function createUser(
  email: string,
  full_name: string,
  role: "member" | "admin",
  opts?: { grandfather?: boolean },
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
  // O usuário `journey` NÃO é grandfatherado: é ele quem exercita a jornada.
  if (opts?.grandfather !== false) {
    let gf = false;
    for (let i = 0; i < 10 && !gf; i++) {
      const { error: gErr } = await admin
        .from("member_onboarding")
        .upsert({ user_id: id, grandfathered_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (!gErr) gf = true;
      else await new Promise((r) => setTimeout(r, 500));
    }
    if (!gf) throw new Error(`E2E: não consegui grandfatherar ${email}.`);
  } else {
    // Garante que o profile existe (trigger async) antes dos testes usarem o id.
    let ready = false;
    for (let i = 0; i < 10 && !ready; i++) {
      const { data } = await admin.from("profiles").select("id").eq("id", id).maybeSingle();
      if (data) ready = true;
      else await new Promise((r) => setTimeout(r, 500));
    }
    if (!ready) throw new Error(`E2E: profile de ${email} não apareceu.`);
  }

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
  // NÃO grandfathered: único que passa pela Onboarding Journey.
  const journey = await createUser(
    `e2e-journey-${stamp}@codex.community`,
    "E2E Jornada",
    "member",
    { grandfather: false },
  );

  const users: E2EUsers = {
    member,
    admin,
    journey,
    createdIds: [member.id, admin.id, journey.id],
  };
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  // Semeia o vídeo ANTES de qualquer request popular o cache de getSettings().
  await seedWelcomeVideoSettings();

  console.log(
    `[e2e] usuários criados: membro=${member.email} admin=${admin.email} jornada=${journey.email}`,
  );
}
