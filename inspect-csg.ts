import { slFetch } from "./src/integrations/sap/sap-client.server";

async function inspectCsg() {
  const candidates = [
    "/CSG_LINHA",
    "/U_CSG_LINHA",
    "/CSG_DOCUMENTO",
    "/U_CSG_DOCUMENTO",
    "/FT_CSG_CADSUBG",
    "/UserObjectsMD('FT_CSG_CADSUBG')",
    "/UserTablesMD('CSG_LINHA')",
    "/UserTablesMD('CSG_DOCUMENTO')",
  ];

  for (const path of candidates) {
    try {
      const res = await slFetch(`${path}?$top=5`);
      console.log(`Path: ${path} -> Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`Data for ${path}:`, JSON.stringify(data, null, 2).slice(0, 500));
      }
    } catch (e: any) {
      console.log(`Path: ${path} -> Exception: ${e.message}`);
    }
  }
}

inspectCsg();
