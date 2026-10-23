import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/nps/responder")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const url = new URL(request.url);
        const pedido = url.searchParams.get("pedido");
        const notaStr = url.searchParams.get("nota");

        if (!pedido || !notaStr) {
          return new Response(renderErrorPage("Parâmetros inválidos ou ausentes."), {
            status: 400,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }

        const nota = parseInt(notaStr, 10);
        if (isNaN(nota) || nota < 0 || nota > 10) {
          return new Response(renderErrorPage("Nota inválida. Deve ser entre 0 e 10."), {
            status: 400,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }

        // 1. Look up survey by UUID or DocEntry
        let query = supabaseAdmin.from("surveys").select("*");
        if (
          pedido.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
          )
        ) {
          query = query.eq("id", pedido);
        } else {
          const docEntry = parseInt(pedido, 10);
          if (isNaN(docEntry)) {
            return new Response(renderErrorPage("Código de pedido inválido."), {
              status: 400,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            });
          }
          query = query.eq("sap_doc_entry", docEntry);
        }

        const { data: surveys, error: fetchErr } = await query
          .order("created_at", { ascending: false })
          .limit(1);
        const survey = surveys?.[0];

        if (fetchErr || !survey) {
          return new Response(
            renderErrorPage("Pesquisa correspondente não localizada no sistema."),
            {
              status: 404,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            },
          );
        }

        // 2. Record the score
        const { error: updateErr } = await supabaseAdmin
          .from("surveys")
          .update({
            status: "answered",
            score: nota,
            answered_at: new Date().toISOString(),
          })
          .eq("id", survey.id);

        if (updateErr) {
          console.error("[NPS Responder] Erro ao gravar nota:", updateErr.message);
        }

        // 3. Load settings for thank you message
        const { data: settings } = await supabaseAdmin
          .from("app_settings")
          .select("thank_you_promoter, thank_you_detractor")
          .eq("id", 1)
          .maybeSingle();

        const defaultPromoter =
          "Muito obrigado pela sua resposta e pela excelente nota! Ficamos muito felizes em saber que teve uma boa experiência. 😊";
        const defaultPassive =
          "Agradecemos o seu feedback! Trabalhamos constantemente para melhorar nossos serviços e sua opinião nos ajuda muito. 👍";
        const defaultDetractor =
          "Agradecemos o seu feedback! Lamentamos que sua experiência não tenha sido ideal e entraremos em contato para entender como podemos melhorar. 🙏";

        const thankYouMessage =
          nota >= 9
            ? settings?.thank_you_promoter || defaultPromoter
            : nota >= 7
              ? defaultPassive
              : settings?.thank_you_detractor || defaultDetractor;

        return new Response(
          renderSuccessPage({
            pedido: survey.id,
            nota,
            message: thankYouMessage,
          }),
          {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          },
        );
      },
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let formData: URLSearchParams;
        try {
          const bodyText = await request.text();
          formData = new URLSearchParams(bodyText);
        } catch {
          return new Response(renderErrorPage("Dados de formulário inválidos."), {
            status: 400,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }

        const pedido = formData.get("pedido")?.trim() || "";
        const rawComentario = formData.get("comentario")?.trim() || "";
        const comentario = rawComentario.slice(0, 2000);

        if (!pedido || (!pedido.match(/^[0-9a-fA-F-]{36}$/) && isNaN(Number(pedido)))) {
          return new Response(renderErrorPage("Parâmetro de pedido inválido ou ausente."), {
            status: 400,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }

        // Update comment
        let updateQuery = supabaseAdmin.from("surveys").update({ comment: comentario });
        if (pedido.match(/^[0-9a-fA-F-]{36}$/)) {
          updateQuery = updateQuery.eq("id", pedido);
        } else {
          updateQuery = updateQuery.eq("sap_doc_entry", parseInt(pedido, 10));
        }

        const { error: updateErr } = await updateQuery;

        if (updateErr) {
          console.error("[NPS Responder] Erro ao gravar comentário:", updateErr.message);
        }

        return new Response(renderCommentSuccessPage(), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      },
    },
  },
});

function renderSuccessPage(opts: { pedido: string; nota: number; message: string }): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Agradecemos sua Resposta!</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
    <style>
      body {
        font-family: 'Outfit', sans-serif;
        background-color: #0c0516;
        color: #f3f4f6;
        display: grid;
        place-items: center;
        min-height: 100vh;
        margin: 0;
        padding: 1.5rem;
      }
      .card {
        background: rgba(26, 15, 42, 0.6);
        border: 1px solid rgba(139, 92, 246, 0.15);
        backdrop-filter: blur(16px);
        max-width: 32rem;
        width: 100%;
        text-align: center;
        padding: 3rem 2.5rem;
        border-radius: 1rem;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      }
      .circle {
        width: 5rem;
        height: 5rem;
        border-radius: 50%;
        background-color: rgba(16, 185, 129, 0.1);
        border: 2px solid #10b981;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.5rem;
        animation: scaleIn 0.5s ease-out;
      }
      .circle svg {
        width: 2.5rem;
        height: 2.5rem;
        color: #10b981;
      }
      h1 {
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0 0 1rem;
        color: #ffffff;
      }
      p {
        color: #9ca3af;
        font-size: 1.05rem;
        line-height: 1.6;
        margin: 0 0 2rem;
      }
      .badge {
        display: inline-block;
        background: rgba(139, 92, 246, 0.15);
        color: #a78bfa;
        font-weight: 600;
        font-size: 0.85rem;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        margin-bottom: 1.5rem;
        border: 1px solid rgba(139, 92, 246, 0.25);
      }
      .feedback-form {
        margin-top: 2rem;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding-top: 2rem;
        text-align: left;
      }
      .feedback-form label {
        display: block;
        font-size: 0.9rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: #d1d5db;
      }
      .feedback-form textarea {
        width: 100%;
        box-sizing: border-box;
        background: rgba(12, 5, 22, 0.8);
        border: 1px solid rgba(139, 92, 246, 0.2);
        border-radius: 0.5rem;
        padding: 0.75rem;
        color: #ffffff;
        font-family: inherit;
        font-size: 0.95rem;
        resize: vertical;
        min-height: 6rem;
        margin-bottom: 1rem;
        outline: none;
        transition: border-color 0.2s;
      }
      .feedback-form textarea:focus {
        border-color: #8b5cf6;
      }
      .feedback-form button {
        background: #8b5cf6;
        color: #ffffff;
        font-weight: 600;
        border: none;
        border-radius: 0.5rem;
        padding: 0.75rem 1.5rem;
        font-size: 0.95rem;
        cursor: pointer;
        width: 100%;
        transition: background 0.2s;
      }
      .feedback-form button:hover {
        background: #7c3aed;
      }
      @keyframes scaleIn {
        from { transform: scale(0.8); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="circle">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <div class="badge">Nota registrada: ${opts.nota}/10</div>
      <h1>Muito Obrigado!</h1>
      <p>${opts.message}</p>
      
      <form class="feedback-form" method="POST" action="/api/public/nps/responder">
        <input type="hidden" name="pedido" value="${opts.pedido}" />
        <label for="comentario">Deseja adicionar algum comentário ou sugestão? (Opcional)</label>
        <textarea id="comentario" name="comentario" placeholder="Escreva aqui seu comentário..."></textarea>
        <button type="submit">Enviar Comentário</button>
      </form>
    </div>
  </body>
</html>`;
}

function renderCommentSuccessPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Comentário Recebido!</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
    <style>
      body {
        font-family: 'Outfit', sans-serif;
        background-color: #0c0516;
        color: #f3f4f6;
        display: grid;
        place-items: center;
        min-height: 100vh;
        margin: 0;
        padding: 1.5rem;
      }
      .card {
        background: rgba(26, 15, 42, 0.6);
        border: 1px solid rgba(139, 92, 246, 0.15);
        backdrop-filter: blur(16px);
        max-width: 32rem;
        width: 100%;
        text-align: center;
        padding: 3rem 2.5rem;
        border-radius: 1rem;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      }
      .logo {
        max-height: 3.5rem;
        margin-bottom: 2rem;
        object-contain: contain;
      }
      .circle {
        width: 5rem;
        height: 5rem;
        border-radius: 50%;
        background-color: rgba(16, 185, 129, 0.1);
        border: 2px solid #10b981;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.5rem;
        animation: scaleIn 0.5s ease-out;
      }
      .circle svg {
        width: 2.5rem;
        height: 2.5rem;
        color: #10b981;
      }
      h1 {
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0 0 1rem;
        color: #ffffff;
      }
      p {
        color: #9ca3af;
        font-size: 1.05rem;
        line-height: 1.6;
        margin: 0;
      }
      @keyframes scaleIn {
        from { transform: scale(0.8); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="circle">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h1>Comentário Registrado!</h1>
      <p>Agradecemos sinceramente a sua opinião adicional. Ela foi salva com sucesso no nosso sistema e nos ajudará a melhorar continuamente!</p>
    </div>
  </body>
</html>`;
}

function renderErrorPage(message: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Erro ao registrar pesquisa</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
    <style>
      body {
        font-family: 'Outfit', sans-serif;
        background-color: #0c0516;
        color: #f3f4f6;
        display: grid;
        place-items: center;
        min-height: 100vh;
        margin: 0;
        padding: 1.5rem;
      }
      .card {
        background: rgba(26, 15, 42, 0.6);
        border: 1px solid rgba(239, 68, 68, 0.15);
        backdrop-filter: blur(16px);
        max-width: 30rem;
        width: 100%;
        text-align: center;
        padding: 3rem 2.5rem;
        border-radius: 1rem;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      }
      .circle {
        width: 5rem;
        height: 5rem;
        border-radius: 50%;
        background-color: rgba(239, 68, 68, 0.1);
        border: 2px solid #ef4444;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.5rem;
      }
      .circle svg {
        width: 2.5rem;
        height: 2.5rem;
        color: #ef4444;
      }
      h1 {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0 0 1rem;
        color: #ffffff;
      }
      p {
        color: #9ca3af;
        font-size: 1rem;
        line-height: 1.5;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="circle">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h1>Ops, algo deu errado!</h1>
      <p>${message}</p>
    </div>
  </body>
</html>`;
}
