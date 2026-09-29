async function run() {
  try {
    console.log("Consultando a API local do ngrok na porta 4040...");
    const res = await fetch("http://127.0.0.1:4040/api/tunnels");
    if (!res.ok) {
      console.error(`Erro ao consultar ngrok: HTTP ${res.status}`);
      return;
    }
    const data = await res.json();
    console.log("\nTúneis ngrok ativos:");
    if (data.tunnels && data.tunnels.length > 0) {
      data.tunnels.forEach((t) => {
        console.log(`- Nome:  ${t.name}`);
        console.log(`- URL:   ${t.public_url}`);
        console.log(`- Local: ${t.config.addr}\n`);
      });
    } else {
      console.log("Nenhum túnel ativo encontrado na API local do ngrok.");
    }
  } catch (err) {
    console.error("Não foi possível conectar ao ngrok local (porta 4040). Ele está rodando?");
    console.error(err.message);
  }
}

run();
