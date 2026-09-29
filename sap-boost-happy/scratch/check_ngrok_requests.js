async function run() {
  try {
    console.log("Consultando histórico de requisições do ngrok local...");
    const res = await fetch("http://127.0.0.1:4040/api/requests?limit=10");
    if (!res.ok) {
      console.error(`Erro ao consultar ngrok: HTTP ${res.status}`);
      return;
    }
    const data = await res.json();
    console.log("\nÚltimas 10 requisições recebidas pelo ngrok:");
    if (data.requests && data.requests.length > 0) {
      data.requests.forEach((r, idx) => {
        console.log(`\n[${idx + 1}] Método: ${r.method}`);
        console.log(`    URL:    ${r.uri}`);
        console.log(`    Status: ${r.response.status_code}`);
        console.log(`    Hora:   ${r.start_time}`);
        console.log(`    Origem: ${r.remote_addr}`);
      });
    } else {
      console.log("Nenhuma requisição recebida no ngrok ainda.");
    }
  } catch (err) {
    console.error("Não foi possível conectar ao ngrok local na porta 4040.");
    console.error(err.message);
  }
}

run();
