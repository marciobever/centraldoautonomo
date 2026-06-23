/**
 * Helper to generate Pix BR Code (Copy & Paste) EMV payload.
 * Follows the Central Bank of Brazil (BACEN) standards.
 */
export function generatePixPayload(
  key: string,
  merchantName: string,
  merchantCity: string,
  amount: number = 0,
  txid: string = "CENTRALME"
): string {
  // Normalize string to remove accents and limit characters
  const cleanName = merchantName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .substring(0, 25)
    .trim()
    .toUpperCase();

  const cleanCity = merchantCity
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .substring(0, 15)
    .trim()
    .toUpperCase();

  // Normalize key depending on type (remove formatting for numbers/CPFs)
  // Celular format: +55...
  let cleanKey = key.trim();
  if (/^\+?\d{10,14}$/.test(cleanKey.replace(/[\s()-]/g, ""))) {
    cleanKey = cleanKey.replace(/[^\d+]/g, ""); // Keep numbers and '+' for phone keys
    if (cleanKey.startsWith("0")) {
      cleanKey = "+55" + cleanKey.substring(1);
    } else if (!cleanKey.startsWith("+")) {
      cleanKey = "+55" + cleanKey;
    }
  } else if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cleanKey) || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(cleanKey)) {
    cleanKey = cleanKey.replace(/\D/g, ""); // CPF or CNPJ
  }

  // 00 Payload Format Indicator
  let payload = "000201";

  // 26 Merchant Account Info - Pix
  const gui = "0014br.gov.bcb.pix";
  const keyPart = `01${cleanKey.length.toString().padStart(2, "0")}${cleanKey}`;
  const merchantAccountInfo = `${gui}${keyPart}`;
  payload += `26${merchantAccountInfo.length.toString().padStart(2, "0")}${merchantAccountInfo}`;

  // 52 Merchant Category Code (always 0000 for standard merchants)
  payload += "52040000";

  // 53 Transaction Currency (986 is BRL)
  payload += "5303986";

  // 54 Transaction Amount (optional)
  if (amount > 0) {
    const amtStr = amount.toFixed(2);
    payload += `54${amtStr.length.toString().padStart(2, "0")}${amtStr}`;
  }

  // 58 Country Code
  payload += "5802BR";

  // 59 Merchant Name
  payload += `59${cleanName.length.toString().padStart(2, "0")}${cleanName}`;

  // 60 Merchant City
  payload += `60${cleanCity.length.toString().padStart(2, "0")}${cleanCity}`;

  // 62 Additional Data Field Template (TxID)
  // Limit TxID to alphanumeric, standard Pix limit is 25 chars.
  const cleanTxid = txid.replace(/[^A-Za-z0-9]/g, "").substring(0, 25) || "CENTRALME";
  const txidPart = `05${cleanTxid.length.toString().padStart(2, "0")}${cleanTxid}`;
  payload += `62${txidPart.length.toString().padStart(2, "0")}${txidPart}`;

  // 63 CRC16 Template
  payload += "6304";

  // Calculate CRC16 CCITT (0xFFFF)
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    const code = payload.charCodeAt(i);
    crc ^= code << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  
  const crcHex = (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
  return payload + crcHex;
}
