import { createFileRoute } from "@tanstack/react-router";
import crypto from "crypto";
import { DEFAULT_EMAIL_BODY, renderEmailTemplate, sendEmail } from "@/integrations/email";
import { sendWhatsAppText } from "@/integrations/zenvia/zenvia.server";
import { isOptOutCommand } from "@/core/utils/phone.utils";
import { updateBusinessPartnerOptOut } from "@/integrations/sap/sap-client.server";
import {
  getNormalizedCategory,
  getTemplateScoreRange,
  isTemplateActive,
} from "@/features/templates/types";

/**
 * Validates webhook authenticity using timing-safe comparison if ZENVIA_WEBHOOK_SECRET is set.
 */
function isAuthorizedWebhook(request: Request): boolean {
  const configuredSecret = process.env.ZENVIA_WEBHOOK_SECRET;
  if (!configuredSecret) {
    console.error(
      "[ZENVIA WEBHOOK] ZENVIA_WEBHOOK_SECRET não configurado no servidor. Rejeitando requisição por segurança.",
    );
    return false; // Fail closed
  }

  const url = new URL(request.url);
  const token =
    request.headers.get("x-zenvia-token") ||
    request.headers.get("x-webhook-token") ||
    url.searchParams.get("token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) return false;

  try {
    const a = Buffer.from(token);
    const b = Buffer.from(configuredSecret);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/zenvia/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorizedWebhook(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const eventType = body.type as string | undefined;

        // 1. Tratar atualizações de status de entrega do Zenvia (MESSAGE_STATUS)
        if (eventType === "MESSAGE_STATUS") {
          const messageId = body.messageId as string | undefined;
          const messageStatus = (body.messageStatus ?? {}) as {
            status?: string;
            code?: string;
            description?: string;
          };
          const zenviaStatus = messageStatus.status;
          const description = messageStatus.description || messageStatus.code || "Erro no canal";

          console.log(
            `[WEBHOOK STATUS] Recebido status "${zenviaStatus}" para mensagem ID ${messageId}.`,
          );

          if (messageId && (zenviaStatus === "REJECTED" || zenviaStatus === "FAILED")) {
            // Buscar pesquisa correspondente por ID de mensagem Zenvia
            const { data: survey } = await supabaseAdmin
              .from("surveys")
              .select("*")
              .eq("zenvia_message_id", messageId)
              .maybeSingle();

            if (survey && (survey.status === "sent" || survey.status === "pending")) {
              if (survey.email) {
                try {
                  console.log(
                    `[WEBHOOK STATUS] Falha no WhatsApp detectada. Transbordando pesquisa ID ${survey.id} para e-mail: ${survey.email}`,
                  );
                  const { data: settings } = await supabaseAdmin
                    .from("app_settings")
                    .select("email_template_subject, email_template_body")
                    .eq("id", 1)
                    .maybeSingle();

                  const baseUrl = new URL(request.url).origin;
                  const emailSubject =
                    settings?.email_template_subject || "Pesquisa de Satisfação Petruz";
                  const emailBodyRaw = settings?.email_template_body || DEFAULT_EMAIL_BODY;

                  const html = renderEmailTemplate(emailBodyRaw, {
                    nome_cliente: survey.contact_name || survey.card_name || "",
                    id_pedido: survey.id,
                    token: (survey as Record<string, unknown>).response_token as string | undefined || survey.id,
                    baseUrl,
                  });

                  await sendEmail({
                    to: survey.email,
                    subject: emailSubject,
                    html,
                  });

                  await supabaseAdmin
                    .from("surveys")
                    .update({
                      status: "sent_email",
                      error_message: `WhatsApp rejeitado via webhook (${description}). Transbordado para E-mail.`,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", survey.id);

                  console.log(
                    `[WEBHOOK STATUS] Pesquisa ID ${survey.id} transbordada com sucesso para e-mail.`,
                  );
                } catch (mailErr) {
                  console.error(
                    `[WEBHOOK STATUS] Erro ao transbordar para e-mail para pesquisa ID ${survey.id}:`,
                    mailErr,
                  );
                  await supabaseAdmin
                    .from("surveys")
                    .update({
                      status: "failed",
                      error_message: `WhatsApp rejeitado (${description}) e e-mail falhou (${mailErr instanceof Error ? mailErr.message : String(mailErr)})`,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", survey.id);
                }
              } else {
                console.log(
                  `[WEBHOOK STATUS] WhatsApp falhou para pesquisa ID ${survey.id}, mas nenhum e-mail está cadastrado.`,
                );
                await supabaseAdmin
                  .from("surveys")
                  .update({
                    status: "failed",
                    error_message: `WhatsApp rejeitado via webhook: ${description}. Sem e-mail cadastrado.`,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", survey.id);
              }
            }
          }

          return new Response("ok", { status: 200 });
        }

        // 2. Tratar mensagens recebidas do cliente (MESSAGE)
        const message = (body.message ?? {}) as {
          from?: string;
          to?: string;
          direction?: string;
          contents?: Array<{ type?: string; text?: string }>;
        };

        // Se for mensagem de saída enviada pela própria empresa, apenas confirma o recebimento
        if (body.direction === "OUT" || message.direction === "OUT") {
          return new Response("ok", { status: 200 });
        }

        const from = (message.from ?? "").replace(/\D+/g, "");
        const text = (message.contents ?? []).find((c) => c.type === "text")?.text?.trim() ?? "";

        // Registrar no log de respostas
        const score = parseScore(text);
        await supabaseAdmin.from("survey_responses").insert({
          phone: from,
          raw_text: text,
          parsed_score: score,
          payload: body as never,
        });

        console.log(
          `[WEBHOOK] Mensagem recebida de ${from}. Texto: "${text}". Nota: ${score !== null ? score : "nenhuma"}`,
        );

        if (from) {
          const phoneCandidates = getPhoneCandidates(from);

          // 2.1 Verificar se o cliente enviou comando de OPT-OUT ("Sair", "Parar", "Cancelar", etc.)
          if (isOptOutCommand(text)) {
            console.log(
              `[WEBHOOK] Comando de Opt-Out identificado do telefone ${from} ("${text}"). Processando descadastro no SAP...`,
            );

            // Localizar pesquisa recente associada ao telefone para obter CardCode
            const { data: recentSurveys } = await supabaseAdmin
              .from("surveys")
              .select("id, card_code, card_name")
              .in("phone", phoneCandidates)
              .order("created_at", { ascending: false })
              .limit(1);

            const recentSurvey = recentSurveys?.[0];
            const cardCode = recentSurvey?.card_code;

            if (cardCode) {
              // Atualizar U_RecebePesquisa = "0" no SAP Service Layer
              await updateBusinessPartnerOptOut(cardCode, true);

              // Atualizar registro local e gerar log de auditoria
              if (recentSurvey?.id) {
                await supabaseAdmin
                  .from("surveys")
                  .update({
                    status: "answered",
                    comment: `[OPT-OUT VIA WHATSAPP] Solicitou descadastro: "${text}"`,
                    answered_at: new Date().toISOString(),
                  })
                  .eq("id", recentSurvey.id);
              }

              await supabaseAdmin.from("system_logs").insert({
                level: "info",
                category: "opt_out",
                message: `Cliente ${cardCode} (${recentSurvey.card_name}) optou por sair das pesquisas via WhatsApp. SAP atualizado (U_RecebePesquisa = 0).`,
                details: JSON.stringify({ phone: from, cardCode, text }),
              });
            } else {
              console.warn(
                `[WEBHOOK] Opt-Out recebido de ${from}, mas nenhum CardCode correspondente foi encontrado no histórico de pesquisas.`,
              );
            }

            // Enviar mensagem amigável de confirmação de descadastro (customizável via Modelos de Mensagens)
            try {
              const { data: allTemplates } = await supabaseAdmin
                .from("message_templates")
                .select("id, name, body, type, is_default");

              const optOutCandidates = (allTemplates ?? []).filter(
                (t) => isTemplateActive(t) && getNormalizedCategory(t.type, t.name) === "sair",
              );

              const optOutTemplate =
                optOutCandidates.find((t) => t.is_default) || optOutCandidates[0];

              const defaultOptOutText =
                "Você foi descadastrado com sucesso das nossas pesquisas de satisfação. Agradecemos sua atenção e parceria! 🙏 Caso deseje reativar no futuro, entre em contato conosco.";

              const optOutReply = optOutTemplate?.body || defaultOptOutText;
              await sendWhatsAppText({ to: from, text: optOutReply });
              console.log(`[WEBHOOK] Confirmação de Opt-Out enviada com sucesso para ${from}.`);
            } catch (err) {
              console.error("[WEBHOOK] Erro ao enviar confirmação de Opt-Out via WhatsApp:", err);
            }

            return new Response("ok", { status: 200 });
          }

          // 2.2 Fluxo normal de NPS: buscar última pesquisa enviada nos últimos 30 dias
          const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
          const { data: surveys } = await supabaseAdmin
            .from("surveys")
            .select("id, status")
            .in("phone", phoneCandidates)
            .gte("sent_at", since)
            .in("status", ["sent", "answered"])
            .order("sent_at", { ascending: false })
            .limit(1);

          const target = surveys?.[0];
          if (target) {
            await supabaseAdmin
              .from("surveys")
              .update({
                status: "answered",
                score,
                comment: text,
                answered_at: new Date().toISOString(),
              })
              .eq("id", target.id);

            // Resposta automática customizável de feedback/agradecimento ao cliente
            if (score !== null) {
              try {
                // 1. Buscar todos os templates do banco
                const { data: allTemplates } = await supabaseAdmin
                  .from("message_templates")
                  .select("id, name, body, type, is_default, zenvia_template_id");

                // 2. Filtrar apenas modelos ATIVOS
                const activeCandidates = (allTemplates ?? [])
                  .filter((t) => isTemplateActive(t))
                  .map((t) => ({
                    ...t,
                    range: getTemplateScoreRange(t),
                    category: getNormalizedCategory(t.type, t.name),
                  }));

                let matchedTemplateBody: string | null = null;

                // Prioridade 1: Modelo ativo do tipo INTERVALO cuja faixa abrange a nota
                const matchingIntervals = activeCandidates.filter(
                  (t) =>
                    t.category === "intervalo" &&
                    t.range &&
                    score >= t.range.min &&
                    score <= t.range.max,
                );

                if (matchingIntervals.length > 0) {
                  matchingIntervals.sort((a, b) => {
                    if (a.is_default !== b.is_default) {
                      return a.is_default ? -1 : 1;
                    }
                    const ampA = (a.range?.max ?? 10) - (a.range?.min ?? 0);
                    const ampB = (b.range?.max ?? 10) - (b.range?.min ?? 0);
                    return ampA - ampB;
                  });
                  matchedTemplateBody = matchingIntervals[0].body;
                }

                // Fallback padrão do sistema caso não haja modelo de intervalo ativo configurado para a nota
                const defaultPromoter =
                  "Muito obrigado pela sua resposta e pela excelente nota! Ficamos muito felizes em saber que teve uma boa experiência. 😊";
                const defaultPassive =
                  "Agradecemos o seu feedback! Trabalhamos constantemente para melhorar nossos serviços e sua opinião nos ajuda muito. 👍";
                const defaultDetractor =
                  "Agradecemos o seu feedback! Lamentamos que sua experiência não tenha sido ideal e entraremos em contato para entender como podemos melhorar. 🙏";

                const defaultMsg =
                  score >= 9 ? defaultPromoter : score >= 7 ? defaultPassive : defaultDetractor;

                const thankYouText = matchedTemplateBody || defaultMsg;

                await sendWhatsAppText({ to: from, text: thankYouText });

                console.log(
                  `[WEBHOOK] Resposta de feedback enviada para ${from} (Nota: ${score}). Mensagem: "${thankYouText.slice(0, 60)}..."`,
                );
              } catch (err) {
                console.error("Erro ao enviar mensagem automática de agradecimento:", err);
              }
            }
          } else {
            console.warn(
              `[WEBHOOK] Nenhuma pesquisa correspondente ativa encontrada nos últimos 30 dias para o remetente ${from}.`,
            );
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});

function parseScore(text: string): number | null {
  const m = text.match(/(?<![\d.,])(10|[0-9])(?![\d.,])/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 0 && n <= 10 ? n : null;
}

function getPhoneCandidates(rawPhone: string): string[] {
  const digits = rawPhone.replace(/\D+/g, "");
  if (!digits) return [];
  const set = new Set<string>();
  set.add(rawPhone);
  set.add(digits);
  set.add(`+${digits}`);

  // Brasil (DDI 55)
  if (digits.startsWith("55")) {
    const sem55 = digits.slice(2);
    set.add(sem55);
    set.add(`+${sem55}`);
    // Se tem DDD + 9 dígitos (13 dígitos total ex: 55 91 9 9999 9999)
    if (digits.length === 13) {
      // variação sem o 9 (12 dígitos ex: 55 91 9999 9999)
      const sem9 = digits.slice(0, 4) + digits.slice(5);
      set.add(sem9);
      set.add(`+${sem9}`);
      set.add(sem9.slice(2));
      set.add(`+${sem9.slice(2)}`);
    } else if (digits.length === 12) {
      // variação com o 9 adicionado
      const com9 = digits.slice(0, 4) + "9" + digits.slice(4);
      set.add(com9);
      set.add(`+${com9}`);
      set.add(com9.slice(2));
      set.add(`+${com9.slice(2)}`);
    }
  } else if (digits.length === 10 || digits.length === 11) {
    // DDD + número sem DDI 55
    set.add(`55${digits}`);
    set.add(`+55${digits}`);
    if (digits.length === 11) {
      const sem9 = digits.slice(0, 2) + digits.slice(3);
      set.add(sem9);
      set.add(`+${sem9}`);
      set.add(`55${sem9}`);
      set.add(`+55${sem9}`);
    }
  }

  return Array.from(set);
}

