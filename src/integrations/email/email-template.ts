/**
 * Email Template Renderer and Default Layout for Satisfaction Surveys.
 */

export const DEFAULT_EMAIL_BODY = `<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111;">
  <p>Olá <strong>{{nome_cliente}}</strong>,</p>
  <p>Agradecemos a sua preferência e confiança na Petruz!</p>
  <p>Para nos ajudar a aprimorar nosso atendimento, de 0 a 10, qual a probabilidade de você recomendar a Petruz a um amigo ou colega?</p>
  
  <table border="0" cellpadding="0" cellspacing="5" style="margin: 30px 0; width: 100%; text-align: center;">
    <tr>
      <td style="border-radius: 4px;" bgcolor="#dc2626"><a href="{{link_nota_0}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">0</a></td>
      <td style="border-radius: 4px;" bgcolor="#dc2626"><a href="{{link_nota_1}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">1</a></td>
      <td style="border-radius: 4px;" bgcolor="#ea580c"><a href="{{link_nota_2}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">2</a></td>
      <td style="border-radius: 4px;" bgcolor="#ea580c"><a href="{{link_nota_3}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">3</a></td>
      <td style="border-radius: 4px;" bgcolor="#eab308"><a href="{{link_nota_4}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">4</a></td>
      <td style="border-radius: 4px;" bgcolor="#eab308"><a href="{{link_nota_5}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">5</a></td>
      <td style="border-radius: 4px;" bgcolor="#eab308"><a href="{{link_nota_6}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">6</a></td>
      <td style="border-radius: 4px;" bgcolor="#84cc16"><a href="{{link_nota_7}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">7</a></td>
      <td style="border-radius: 4px;" bgcolor="#84cc16"><a href="{{link_nota_8}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">8</a></td>
      <td style="border-radius: 4px;" bgcolor="#16a34a"><a href="{{link_nota_9}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">9</a></td>
      <td style="border-radius: 4px;" bgcolor="#16a34a"><a href="{{link_nota_10}}" target="_blank" style="padding: 12px 0; color: #ffffff; text-decoration: none; font-weight: bold; display: block; font-size: 14px;">10</a></td>
    </tr>
  </table>

  <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
    Esta é uma pesquisa automática relacionada ao pedido #{{id_pedido}}. Sua opinião é de extrema importância para nós.
  </p>
</div>`;

export function renderEmailTemplate(
  template: string,
  vars: { nome_cliente: string; id_pedido: string; baseUrl: string },
): string {
  if (!template) return "";

  let rendered = template
    .replace(/\{\{\s*nome_cliente\s*\}\}/g, vars.nome_cliente || "")
    .replace(/\{\{\s*id_pedido\s*\}\}/g, vars.id_pedido || "");

  // Replace links for scores 0 to 10
  for (let i = 0; i <= 10; i++) {
    const regex = new RegExp(`\\{\\{\\s*link_nota_${i}\\s*\\}\\}`, "g");
    const link = `${vars.baseUrl}/api/public/nps/responder?pedido=${encodeURIComponent(vars.id_pedido)}&nota=${i}`;
    rendered = rendered.replace(regex, link);
  }

  return rendered;
}
