export type OrderEmailData = {
  restaurantName: string
  tableLabel: string
  items: Array<{ name: string; quantity: number; unit_price: number }>
  total: number
  orderId: string
  createdAt: string
}

export function renderOrderEmail(data: OrderEmailData): string {
  const { restaurantName, tableLabel, items, total, orderId, createdAt } = data

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #1e2028;color:#d4d4d8;font-size:14px;">${item.name}</td>
        <td style="padding:8px 0;border-bottom:1px solid #1e2028;color:#a1a1aa;font-size:14px;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #1e2028;color:#d4d4d8;font-size:14px;text-align:right;">${(item.unit_price * item.quantity).toFixed(2)} €</td>
      </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirmation de commande — ${restaurantName}</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px auto;">
                <tr>
                  <td style="background-color:#f97316;border-radius:12px;width:44px;height:44px;text-align:center;vertical-align:middle;">
                    <span style="color:white;font-size:22px;font-weight:bold;line-height:44px;">Q</span>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">Qomand</p>
              <p style="margin:4px 0 0;font-size:13px;color:#71717a;">Votre commande a bien été reçue</p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#18181b;border:1px solid #27272a;border-radius:16px;padding:28px;">

              <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#ffffff;">
                Merci pour votre commande !
              </p>
              <p style="margin:0 0 24px;font-size:13px;color:#71717a;">
                ${restaurantName} · ${tableLabel}
              </p>

              <!-- Items -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <thead>
                  <tr>
                    <th style="padding-bottom:8px;text-align:left;font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;border-bottom:1px solid #27272a;">Article</th>
                    <th style="padding-bottom:8px;text-align:center;font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;border-bottom:1px solid #27272a;">Qté</th>
                    <th style="padding-bottom:8px;text-align:right;font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;border-bottom:1px solid #27272a;">Prix</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>

              <!-- Total -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr>
                  <td style="font-size:15px;color:#a1a1aa;font-weight:500;">Total payé</td>
                  <td style="font-size:20px;color:#ffffff;font-weight:700;text-align:right;">${total.toFixed(2)} €</td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #27272a;margin:20px 0;" />

              <!-- Meta -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px;color:#52525b;">Réf. commande</td>
                  <td style="font-size:12px;color:#71717a;text-align:right;font-family:monospace;">#${orderId.slice(0, 8).toUpperCase()}</td>
                </tr>
                <tr>
                  <td style="font-size:12px;color:#52525b;padding-top:4px;">Date</td>
                  <td style="font-size:12px;color:#71717a;text-align:right;padding-top:4px;">${createdAt}</td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#3f3f46;">
                Paiement sécurisé par Stripe · Propulsé par Qomand
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
