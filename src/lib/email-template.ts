export type OrderEmailData = {
  restaurantName: string
  tableLabel: string
  items: Array<{ name: string; size_label?: string | null; quantity: number; unit_price: number }>
  total: number
  orderId: string
  createdAt: string
  pickupCode?: string
}

export function renderOrderEmail(data: OrderEmailData): string {
  const { restaurantName, tableLabel, items, total, orderId, createdAt, pickupCode } = data

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #1e2028;color:#d4d4d8;font-size:14px;">${item.name}${item.size_label ? ` ${item.size_label}` : ''}</td>
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
                    <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyOCIgaGVpZ2h0PSIyOCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgOGMtMS41IDAtMi43NS43NS0zLjUgMS45TTEyIDhjMS41IDAgMi43NS43NSAzLjUgMS45TTEyIDhWNW0wIDEzdi0ybS02LjUtM0gzbTE4IDBoLTIuNU02LjM0IDE3LjY2bC0xLjQyIDEuNDJNMTkuMDggNS45MmwtMS40MiAxLjQyTTE3LjY2IDE3LjY2bDEuNDIgMS40Mk00LjkyIDUuOTJsMS40MiAxLjQyIi8+PC9zdmc+" alt="Qomand" width="28" height="28" style="display:block;margin:8px auto;" />
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

              ${pickupCode ? `<!-- Code retrait -->
              <div style="background-color:#1c1917;border:2px solid #f97316;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
                <p style="margin:0 0 6px;font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Votre code de retrait</p>
                <p style="margin:0;font-size:34px;font-weight:900;color:#f97316;letter-spacing:0.2em;font-family:monospace;">${pickupCode}</p>
                <p style="margin:8px 0 0;font-size:12px;color:#71717a;">Présentez ce code au comptoir pour récupérer votre commande</p>
              </div>
              <hr style="border:none;border-top:1px solid #27272a;margin:20px 0;" />
              ` : ''}

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

export type PickupReadyEmailData = {
  restaurantName: string
  pickupCode: string
  orderId: string
}

export function renderPickupReadyEmail(data: PickupReadyEmailData): string {
  const { restaurantName, pickupCode, orderId } = data
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Votre commande est prête — ${restaurantName}</title>
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
                    <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyOCIgaGVpZ2h0PSIyOCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgOGMtMS41IDAtMi43NS43NS0zLjUgMS45TTEyIDhjMS41IDAgMi43NS43NSAzLjUgMS45TTEyIDhWNW0wIDEzdi0ybS02LjUtM0gzbTE4IDBoLTIuNU02LjM0IDE3LjY2bC0xLjQyIDEuNDJNMTkuMDggNS45MmwtMS40MiAxLjQyTTE3LjY2IDE3LjY2bDEuNDIgMS40Mk00LjkyIDUuOTJsMS40MiAxLjQyIi8+PC9zdmc+" alt="Qomand" width="28" height="28" style="display:block;margin:8px auto;" />
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">Qomand</p>
              <p style="margin:4px 0 0;font-size:13px;color:#71717a;">Votre commande est prête !</p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#18181b;border:1px solid #27272a;border-radius:16px;padding:28px;">

              <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#ffffff;">
                Passez au comptoir 🎉
              </p>
              <p style="margin:0 0 24px;font-size:13px;color:#71717a;">
                ${restaurantName} a préparé votre commande. Rendez-vous au comptoir pour la récupérer.
              </p>

              <!-- Code retrait -->
              <div style="background-color:#1c1917;border:2px solid #f97316;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;">
                <p style="margin:0 0 6px;font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Votre code de retrait</p>
                <p style="margin:0;font-size:38px;font-weight:900;color:#f97316;letter-spacing:0.2em;font-family:monospace;">${pickupCode}</p>
                <p style="margin:8px 0 0;font-size:12px;color:#71717a;">Présentez ce code au comptoir</p>
              </div>

              <!-- Meta -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px;color:#52525b;">Réf. commande</td>
                  <td style="font-size:12px;color:#71717a;text-align:right;font-family:monospace;">#${orderId.slice(0, 8).toUpperCase()}</td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#3f3f46;">
                Propulsé par Qomand
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
