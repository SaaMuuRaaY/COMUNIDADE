import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "./admin-client";
import { USERS_FILE, type E2EUsers } from "./fixtures";

// Testes adversariais de RLS direto na API (PostgREST), sem browser:
// provam que as policies seguram o que a UI nem tenta fazer.

/**
 * signOut() tem escopo GLOBAL por padrão: revogaria todos os refresh tokens do
 * usuário e invalidaria o storageState que os projetos do Playwright usam.
 * Só encerramos a sessão local (efêmera) deste cliente.
 */
async function signOutLocal(client: SupabaseClient): Promise<void> {
  await client.auth.signOut({ scope: "local" });
}

function anonClient(): SupabaseClient {
  loadEnvConfig(path.join(__dirname, ".."), true);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("E2E: faltam NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local");
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

test.describe("RLS adversarial (API)", () => {
  let users: E2EUsers;
  let member: SupabaseClient;
  let communityId: string;
  let draftCourseId: string;
  let conversationId: string;
  const scratchUsers: string[] = [];

  test.beforeAll(async () => {
    users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8")) as E2EUsers;
    member = anonClient();
    const { error: loginErr } = await member.auth.signInWithPassword({
      email: users.member.email,
      password: users.member.password,
    });
    if (loginErr) throw new Error(`E2E: login do membro falhou: ${loginErr.message}`);

    const admin = getAdminClient();
    const stamp = Date.now();

    const { data: comm, error: commErr } = await admin
      .from("communities")
      .select("id")
      .limit(1)
      .single();
    if (commErr || !comm) throw new Error(`E2E: comunidade não encontrada: ${commErr?.message}`);
    communityId = comm.id;

    const { data: course, error: courseErr } = await admin
      .from("courses")
      .insert({
        community_id: communityId,
        title: `E2E Curso Draft ${stamp}`,
        slug: `e2e-draft-${stamp}`,
        status: "draft",
        created_by: users.admin.id,
      })
      .select("id")
      .single();
    if (courseErr || !course) throw new Error(`E2E: seed de curso draft falhou: ${courseErr?.message}`);
    draftCourseId = course.id;

    const { data: mod, error: modErr } = await admin
      .from("course_modules")
      .insert({ course_id: draftCourseId, title: "Módulo E2E" })
      .select("id")
      .single();
    if (modErr || !mod) throw new Error(`E2E: seed de módulo falhou: ${modErr?.message}`);
    await admin
      .from("lessons")
      .insert({ module_id: mod.id, course_id: draftCourseId, title: "Aula em rascunho" });

    const { data: peer, error: peerErr } = await admin.auth.admin.createUser({
      email: `e2e-peer-${stamp}@codex.community`,
      password: users.member.password,
      email_confirm: true,
      user_metadata: { full_name: "E2E Peer" },
    });
    if (peerErr || !peer.user) throw new Error(`E2E: criação do peer falhou: ${peerErr?.message}`);
    scratchUsers.push(peer.user.id);

    const [a, b] = [users.admin.id, peer.user.id].sort();
    const { data: conv, error: convErr } = await admin
      .from("dm_conversations")
      .insert({ user_a: a, user_b: b })
      .select("id")
      .single();
    if (convErr || !conv) throw new Error(`E2E: seed de conversa falhou: ${convErr?.message}`);
    conversationId = conv.id;
    await admin
      .from("direct_messages")
      .insert({ conversation_id: conversationId, sender_id: users.admin.id, body: "segredo entre terceiros" });
  });

  test.afterAll(async () => {
    const admin = getAdminClient();
    if (draftCourseId) await admin.from("courses").delete().eq("id", draftCourseId);
    if (conversationId) await admin.from("dm_conversations").delete().eq("id", conversationId);
    for (const id of scratchUsers) {
      try {
        await admin.auth.admin.deleteUser(id);
      } catch {
        // melhor esforço — o teardown global não conhece estes usuários
      }
    }
    await signOutLocal(member);
  });

  test("membro não lê aulas de curso draft", async () => {
    const { data } = await member.from("lessons").select("id").eq("course_id", draftCourseId);
    expect(data ?? []).toHaveLength(0);
  });

  test("membro não lê DM de terceiros", async () => {
    const { data } = await member
      .from("direct_messages")
      .select("id")
      .eq("conversation_id", conversationId);
    expect(data ?? []).toHaveLength(0);
  });

  test("membro não escreve em DM de terceiros", async () => {
    const { error } = await member
      .from("direct_messages")
      .insert({ conversation_id: conversationId, sender_id: users.member.id, body: "invasão" });
    expect(error).not.toBeNull();
  });

  test("membro não executa award_points (lockdown 0031)", async () => {
    const { error } = await member.rpc("award_points", {
      p_user: users.member.id,
      p_action: "e2e_forge",
      p_points: 999,
    });
    expect(error).not.toBeNull();
  });

  test("anti-lockout: admin não rebaixa nem bane a si mesmo (RPC)", async () => {
    const adminClient = anonClient();
    const { error: loginErr } = await adminClient.auth.signInWithPassword({
      email: users.admin.email,
      password: users.admin.password,
    });
    expect(loginErr).toBeNull();

    const { error: roleErr } = await adminClient.rpc("admin_set_role", {
      p_user: users.admin.id,
      p_role: "member",
    });
    expect(roleErr, "admin_set_role em si mesmo deve falhar").not.toBeNull();

    const { error: banErr } = await adminClient.rpc("admin_set_banned", {
      p_user: users.admin.id,
      p_banned: true,
    });
    expect(banErr, "admin_set_banned em si mesmo deve falhar").not.toBeNull();

    await signOutLocal(adminClient);
  });

  test("usuário banido não publica", async () => {
    const admin = getAdminClient();
    const stamp = Date.now();
    const email = `e2e-banned-${stamp}@codex.community`;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: users.member.password,
      email_confirm: true,
      user_metadata: { full_name: "E2E Banido" },
    });
    if (createErr || !created.user) throw new Error(`E2E: criação do banido falhou: ${createErr?.message}`);
    scratchUsers.push(created.user.id);

    // Aguarda o trigger handle_new_user criar o profile antes de aplicar o ban.
    let banned = false;
    for (let i = 0; i < 10 && !banned; i++) {
      const { count, error } = await admin
        .from("profiles")
        .update({ is_banned: true }, { count: "exact" })
        .eq("id", created.user.id);
      if (!error && (count ?? 0) > 0) banned = true;
      else await new Promise((r) => setTimeout(r, 500));
    }
    expect(banned).toBe(true);

    const client = anonClient();
    const { error: loginErr } = await client.auth.signInWithPassword({
      email,
      password: users.member.password,
    });
    expect(loginErr).toBeNull();
    const { error: postErr } = await client.from("posts").insert({
      community_id: communityId,
      author_id: created.user.id,
      category: "duvidas-gerais",
      body: "post de usuário banido",
    });
    expect(postErr).not.toBeNull();
    await signOutLocal(client);
  });
});
