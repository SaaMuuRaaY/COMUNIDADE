-- =============================================================================
-- seed.sql — Dados demo do CODEX Community
--
-- IMPORTANTE: este seed cria usuários demo via auth.users + profiles.
-- Em produção, prefira criar usuários via Supabase Auth API.
--
-- Usuários criados (senha: codex123!):
--   - admin@codex.community     (admin)
--   - mod@codex.community       (moderator)
--   - ana@codex.community       (member)
--   - bruno@codex.community     (member)
--   - clara@codex.community     (member)
-- =============================================================================

-- Garante extensões
create extension if not exists "pgcrypto";

do $$
declare
  v_admin_id    uuid := '11111111-1111-1111-1111-111111111111';
  v_mod_id      uuid := '22222222-2222-2222-2222-222222222222';
  v_ana_id      uuid := '33333333-3333-3333-3333-333333333333';
  v_bruno_id    uuid := '44444444-4444-4444-4444-444444444444';
  v_clara_id    uuid := '55555555-5555-5555-5555-555555555555';

  v_community_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_course1_id   uuid := 'cccccccc-cccc-cccc-cccc-ccccccccccc1';
  v_course2_id   uuid := 'cccccccc-cccc-cccc-cccc-ccccccccccc2';

  v_mod1_c1_id   uuid := 'dddddddd-dddd-dddd-dddd-dddddddddd11';
  v_mod2_c1_id   uuid := 'dddddddd-dddd-dddd-dddd-dddddddddd12';
  v_mod1_c2_id   uuid := 'dddddddd-dddd-dddd-dddd-dddddddddd21';
  v_mod2_c2_id   uuid := 'dddddddd-dddd-dddd-dddd-dddddddddd22';

  v_pwd_hash text := crypt('codex123!', gen_salt('bf'));
begin

  -- auth.users -----------------------------------------------------------------
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  )
  values
    ('00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated','authenticated',
     'admin@codex.community', v_pwd_hash, now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Administrador CODEX","username":"admin"}'::jsonb,
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_mod_id, 'authenticated','authenticated',
     'mod@codex.community', v_pwd_hash, now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Marina Moderadora","username":"marina"}'::jsonb,
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_ana_id, 'authenticated','authenticated',
     'ana@codex.community', v_pwd_hash, now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Ana Silva","username":"ana"}'::jsonb,
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_bruno_id, 'authenticated','authenticated',
     'bruno@codex.community', v_pwd_hash, now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Bruno Costa","username":"bruno"}'::jsonb,
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_clara_id, 'authenticated','authenticated',
     'clara@codex.community', v_pwd_hash, now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Clara Rodrigues","username":"clara"}'::jsonb,
     now(), now(), '', '', '', '')
  on conflict (id) do nothing;

  -- profiles (atualiza role admin/mod — trigger já criou as linhas) -------------
  update public.profiles set role = 'admin'     where id = v_admin_id;
  update public.profiles set role = 'moderator' where id = v_mod_id;

  -- communities ---------------------------------------------------------------
  insert into public.communities (id, name, slug, description, primary_color, visibility)
  values (v_community_id, 'CODEX Community', 'codex-community',
          'Comunidade oficial de aprendizado, networking e construção colaborativa.',
          '#0a0a0a', 'private')
  on conflict (id) do nothing;

  insert into public.community_members (community_id, user_id, role)
  values
    (v_community_id, v_admin_id, 'admin'),
    (v_community_id, v_mod_id,   'moderator'),
    (v_community_id, v_ana_id,   'member'),
    (v_community_id, v_bruno_id, 'member'),
    (v_community_id, v_clara_id, 'member')
  on conflict (community_id, user_id) do nothing;

  -- settings ------------------------------------------------------------------
  insert into public.settings (key, value) values
    ('community.name',        '"CODEX Community"'::jsonb),
    ('community.description', '"Sua plataforma para crescer com comunidade, cursos e recursos."'::jsonb),
    ('community.primary_color','"#0a0a0a"'::jsonb),
    ('community.visibility',  '"private"'::jsonb)
  on conflict (key) do update set value = excluded.value;

  -- posts ---------------------------------------------------------------------
  insert into public.posts (community_id, author_id, category, title, body) values
    (v_community_id, v_admin_id, 'avisos',
     'Bem-vindo ao CODEX Community',
     'Estamos no ar! Use este espaço para compartilhar projetos, dúvidas e resultados. Boas-vindas a todos. 🚀'),
    (v_community_id, v_ana_id, 'apresentacoes',
     'Olá, sou a Ana',
     'Trabalho com **front-end** há 3 anos e quero aprender mais sobre IA generativa este ano. Quem está nessa jornada também?'),
    (v_community_id, v_bruno_id, 'duvidas',
     'Qual stack pra MVP rápido?',
     'Estou montando um MVP e penso em `Next.js + Supabase`. Alguém tem experiência? Quais armadilhas evitar?'),
    (v_community_id, v_clara_id, 'projetos',
     'Lançando minha automação no n8n',
     'Construí um fluxo que processa leads do Instagram e envia para um Sheets. Posso compartilhar o workflow se interessar.'),
    (v_community_id, v_mod_id, 'resultados',
     '+R$ 12k em 30 dias com a Calculadora MotorBoost',
     'Compartilhando resultados aplicando o que aprendi no curso de IA aplicada. Quem quiser detalhes, comenta aqui.');

  -- recursos ------------------------------------------------------------------
  insert into public.resources (title, description, category, file_url, file_type, created_by) values
    ('Apostila: Fundamentos de Lógica', 'Material PDF com exercícios práticos.', 'apostilas',
     'https://codex.community/sample/logica.pdf', 'application/pdf', v_admin_id),
    ('Template Next.js + Supabase', 'Starter kit pronto para MVPs.', 'templates',
     'https://codex.community/sample/starter.zip', 'application/zip', v_admin_id),
    ('Planilha de Métricas SaaS', 'Modelo Excel para acompanhar MRR/CAC/LTV.', 'planilhas',
     'https://codex.community/sample/saas.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', v_admin_id),
    ('Checklist de Lançamento', 'Passo a passo para lançar um produto digital.', 'checklists',
     'https://codex.community/sample/launch.pdf', 'application/pdf', v_mod_id);

  -- apps ----------------------------------------------------------------------
  insert into public.apps (name, description, category, type, status, url, icon_url, created_by) values
    ('Claude', 'Assistente de IA para escrita, código e raciocínio.', 'ia', 'link', 'active',
     'https://claude.ai', null, v_admin_id),
    ('n8n', 'Automação de fluxos low-code, self-hosted ou cloud.', 'automacao', 'link', 'active',
     'https://n8n.io', null, v_admin_id),
    ('Notion', 'Workspace para notas, docs e gestão de projetos.', 'produtividade', 'link', 'active',
     'https://notion.so', null, v_admin_id),
    ('Calculadora MotorBoost', 'Ferramenta interna de simulação para lojistas.', 'ferramentas-internas', 'embed', 'beta',
     'http://localhost:3002', null, v_admin_id);

  -- events --------------------------------------------------------------------
  insert into public.events (title, description, event_type, starts_at, external_url, created_by) values
    ('Live de boas-vindas', 'Apresentação da plataforma e roadmap 2026.', 'live',
     now() + interval '3 days', 'https://meet.google.com/codex-live', v_admin_id),
    ('Mentoria: Carreira em IA', 'Conversa aberta com Q&A sobre transição para IA.', 'mentoria',
     now() + interval '10 days', 'https://meet.google.com/mentoria-ia', v_mod_id),
    ('Desafio mensal: Construa um agente', 'Crie e publique um agente em até 30 dias.', 'desafio',
     now() + interval '20 days', null, v_admin_id);

  -- cursos --------------------------------------------------------------------
  insert into public.courses (id, community_id, title, slug, description, status, order_index, created_by) values
    (v_course1_id, v_community_id, 'Lógica de Programação', 'logica-de-programacao',
     'Construa o pensamento computacional do zero — variáveis, condicionais, loops e estruturas de dados.',
     'published', 1, v_admin_id),
    (v_course2_id, v_community_id, 'Criando Aplicações com IA', 'aplicacoes-com-ia',
     'Do conceito ao deploy: como construir produtos sobre LLMs com Claude, RAG e ferramentas modernas.',
     'published', 2, v_admin_id)
  on conflict (id) do nothing;

  -- módulos curso 1 -----------------------------------------------------------
  insert into public.course_modules (id, course_id, title, description, order_index) values
    (v_mod1_c1_id, v_course1_id, 'Fundamentos', 'Variáveis, tipos, operadores e fluxo de execução.', 1),
    (v_mod2_c1_id, v_course1_id, 'Estruturas de Controle', 'Condicionais, loops e funções.', 2)
  on conflict (id) do nothing;

  insert into public.lessons (module_id, course_id, title, description, content, order_index, duration_seconds) values
    (v_mod1_c1_id, v_course1_id, 'Apresentação do curso',
     'Como o curso está organizado e o que você vai aprender.',
     'Bem-vindo ao curso de **Lógica de Programação**. Aqui você vai construir base sólida para qualquer linguagem.',
     1, 180),
    (v_mod1_c1_id, v_course1_id, 'Variáveis e Tipos',
     'Como representar dados em memória.', null, 2, 420),
    (v_mod2_c1_id, v_course1_id, 'Condicionais',
     'if/else, switch e tomada de decisão.', null, 1, 360),
    (v_mod2_c1_id, v_course1_id, 'Loops',
     'while, for e iteração.', null, 2, 480);

  -- módulos curso 2 -----------------------------------------------------------
  insert into public.course_modules (id, course_id, title, description, order_index) values
    (v_mod1_c2_id, v_course2_id, 'Introdução a LLMs', 'O que são e como funcionam modelos de linguagem.', 1),
    (v_mod2_c2_id, v_course2_id, 'Construindo com Claude', 'Tool use, RAG e padrões de produto.', 2)
  on conflict (id) do nothing;

  insert into public.lessons (module_id, course_id, title, description, content, order_index, duration_seconds, is_free) values
    (v_mod1_c2_id, v_course2_id, 'O que é uma LLM',
     'Visão geral sobre modelos de linguagem grandes.',
     'Modelos de linguagem aprendem padrões a partir de bilhões de tokens. Esta aula traz a intuição básica.',
     1, 540, true),
    (v_mod1_c2_id, v_course2_id, 'Prompt engineering essencial',
     'Boas práticas para resultados consistentes.', null, 2, 720, false),
    (v_mod2_c2_id, v_course2_id, 'Tool use com Claude',
     'Como expor ferramentas externas para o modelo.', null, 1, 660, false),
    (v_mod2_c2_id, v_course2_id, 'RAG na prática',
     'Recuperação aumentada com embeddings.', null, 2, 900, false);

  -- pontos demo (idempotente via award_points) --------------------------------
  perform public.award_points(v_ana_id,   'post_created',     10, 'post', null);
  perform public.award_points(v_ana_id,   'comment_created',   5, 'comment', null);
  perform public.award_points(v_bruno_id, 'post_created',     10, 'post', null);
  perform public.award_points(v_clara_id, 'lesson_completed', 15, 'lesson', null);
  perform public.award_points(v_mod_id,   'event_attended',   20, 'event', null);

end $$;
