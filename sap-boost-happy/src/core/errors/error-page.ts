export function renderErrorPage(
  message = "Ocorreu um erro interno ao processar a solicitação.",
): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Erro - Pesquisa Petruz</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1rem;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 2rem;
      max-width: 28rem;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
    }
    .icon {
      width: 3rem;
      height: 3rem;
      color: #ef4444;
      margin: 0 auto 1rem;
    }
    h1 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0 0 0.5rem;
    }
    p {
      color: #64748b;
      font-size: 0.875rem;
      line-height: 1.5;
      margin: 0 0 1.5rem;
    }
    a {
      display: inline-block;
      background-color: #0284c7;
      color: #ffffff;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
    }
    a:hover {
      background-color: #0369a1;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠️</div>
    <h1>Ops! Algo deu errado</h1>
    <p>${message}</p>
    <a href="/">Voltar ao Início</a>
  </div>
</body>
</html>`;
}
