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
              <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2ODMuODQ0IiBoZWlnaHQ9IjE0NC44MSIgdmlld0JveD0iMCAwIDY4My44NDQgMTQ0LjgxIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNDc1LjE1NiAtNDY3LjE3KSI+PHBhdGggZD0iTTQ5LjkzMi04Ny4yMUE0NC40ODEsNDQuNDgxLDAsMCwwLDUuNDcyLTQyLjc1LDQ0LjU5MSw0NC41OTEsMCwwLDAsNDkuOTMyLDEuNzFhNDQuNDgxLDQ0LjQ4MSwwLDAsMCw0NC40Ni00NC40NkE0NC4zNzEsNDQuMzcxLDAsMCwwLDQ5LjkzMi04Ny4yMVpNMjUuNjUtNDIuNzVBMjQuMzc2LDI0LjM3NiwwLDAsMSw0OS45MzItNjcuMDMyLDI0LjM3NiwyNC4zNzYsMCwwLDEsNzQuMjE0LTQyLjc1LDI0LjM3NiwyNC4zNzYsMCwwLDEsNDkuOTMyLTE4LjQ2OCwyNC4zNzYsMjQuMzc2LDAsMCwxLDI1LjY1LTQyLjc1Wk0xMTAuODA4LDBoMjAuMTc4Vi00Ni4xN2MwLTEzLjUwOSw5LjA2My0yMi4wNTksMjAuNjkxLTIyLjA1OSwxMC43NzMsMCwxOC4zLDYuNjY5LDE4LjMsMjEuMDMzVjBoMjAuMTc4Vi00Ni41MTJjMC0xMy4xNjcsOS4wNjMtMjEuNzE3LDIwLjY5MS0yMS43MTcsMTAuNzczLDAsMTguMyw2LjY2OSwxOC4zLDIxLjAzM1YwaDIwLjE3OFYtNTEuNDcxYzAtMjEuNzE3LTEzLjY4LTM1LjczOS0zMy41MTYtMzUuNzM5LTEzLjY4LDAtMjIuNzQzLDYuMzI3LTMwLjQzOCwxNi4wNzQtNS40NzItMTAuMDg5LTE1LjczMi0xNi4wNzQtMjguNzI4LTE2LjA3NGEzNS40NzQsMzUuNDc0LDAsMCwwLTI1LjY1LDEwLjk0NFYtODUuNUgxMTAuODA4Wk0zODIuNywwVi00Ni4xN2MwLTEzLjUwOSw5LjA2My0yMi4wNTksMjAuNjkxLTIyLjA1OSwxMC43NzMsMCwxOC4zLDYuNjY5LDE4LjMsMjEuMDMzVjBoMjAuMTc4Vi01MS40NzFjMC0yMS43MTctMTMuNjgtMzUuNzM5LTMzLjUxNi0zNS43MzlBMzUuNDc0LDM1LjQ3NCwwLDAsMCwzODIuNy03Ni4yNjZWLTg1LjVIMzYyLjUyVjBaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg2MTUgNTkyKSIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik02LjE1Ni02MS41NkE2My4zNDYsNjMuMzQ2LDAsMCwwLDY5LjQyNiwxLjcxYTYxLjU4MSw2MS41ODEsMCwwLDAsMzIuNDktOS4yMzRsMjQuNjcyLDI3LjVMMTQxLjQ2NSw2LjQ3MSwxMTcuNDc3LTIwLjUyQTYyLjg2Miw2Mi44NjIsMCwwLDAsMTMyLjctNjEuNTZhNjMuMzQ2LDYzLjM0NiwwLDAsMC02My4yNy02My4yN0E2My4zNDYsNjMuMzQ2LDAsMCwwLDYuMTU2LTYxLjU2Wm02My4yNy00My4wOTJBNDMuMTMxLDQzLjEzMSwwLDAsMSwxMTIuNTE4LTYxLjU2YTQyLjQ4NSw0Mi40ODUsMCwwLDEtOC44OTIsMjUuODIxczEyLjEyMywxMy4xNzgsMTMuODUxLDE1LjIxOS0xMy43MywxNC45NjctMTUuNTYxLDEzUzg3LjcyMy0yMy4yNTYsODcuNzIzLTIzLjI1NmEzNi45NTEsMzYuOTUxLDAsMCwxLTE4LjMsNC43ODhBNDMuMTMxLDQzLjEzMSwwLDAsMSwyNi4zMzQtNjEuNTYsNDMuMTMxLDQzLjEzMSwwLDAsMSw2OS40MjYtMTA0LjY1MloiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ2OSA1OTIpIiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTQ0LDg4QTQ0LjAxMiw0NC4wMTIsMCwwLDEsMjYuODczLDMuNDU4LDQ0LjAxMSw0NC4wMTEsMCwwLDEsNjEuMTI3LDg0LjU0Miw0My43MjMsNDMuNzIzLDAsMCwxLDQ0LDg4Wm0wLTY3LjhhMjMuNzIxLDIzLjcyMSwwLDEsMCw5LjI2MiwxLjg3QTIzLjY0NiwyMy42NDYsMCwwLDAsNDQsMjAuMloiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDg3NiA1MDYpIiBmaWxsPSIjZmZmIi8+PHJlY3Qgd2lkdGg9IjE5LjkiIGhlaWdodD0iNDMiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDk0NCA1NTApIiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTQ0LDg4QTQ0LjAxMiw0NC4wMTIsMCwwLDEsMjYuODczLDMuNDU4LDQ0LjAxMSw0NC4wMTEsMCwwLDEsNjEuMTI3LDg0LjU0Miw0My43MjMsNDMuNzIzLDAsMCwxLDQ0LDg4Wm0wLTY3LjhhMjMuNzIxLDIzLjcyMSwwLDEsMCw5LjI2MiwxLjg3QTIzLjY0NiwyMy42NDYsMCwwLDAsNDQsMjAuMloiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEwNzEgNTA2KSIgZmlsbD0iI2ZmZiIvPjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIxMjUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDExMzkgNDY5KSIgZmlsbD0iI2ZmZiIvPjwvZz48L3N2Zz4=" alt="Qomand" width="160" height="34" style="display:block;margin:0 auto 16px auto;" />
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
              <div style="background-color:#1c1917;border:2px solid #F07A4F;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
                <p style="margin:0 0 6px;font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Votre code de retrait</p>
                <p style="margin:0;font-size:34px;font-weight:900;color:#F07A4F;letter-spacing:0.2em;font-family:monospace;">${pickupCode}</p>
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
              <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2ODMuODQ0IiBoZWlnaHQ9IjE0NC44MSIgdmlld0JveD0iMCAwIDY4My44NDQgMTQ0LjgxIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNDc1LjE1NiAtNDY3LjE3KSI+PHBhdGggZD0iTTQ5LjkzMi04Ny4yMUE0NC40ODEsNDQuNDgxLDAsMCwwLDUuNDcyLTQyLjc1LDQ0LjU5MSw0NC41OTEsMCwwLDAsNDkuOTMyLDEuNzFhNDQuNDgxLDQ0LjQ4MSwwLDAsMCw0NC40Ni00NC40NkE0NC4zNzEsNDQuMzcxLDAsMCwwLDQ5LjkzMi04Ny4yMVpNMjUuNjUtNDIuNzVBMjQuMzc2LDI0LjM3NiwwLDAsMSw0OS45MzItNjcuMDMyLDI0LjM3NiwyNC4zNzYsMCwwLDEsNzQuMjE0LTQyLjc1LDI0LjM3NiwyNC4zNzYsMCwwLDEsNDkuOTMyLTE4LjQ2OCwyNC4zNzYsMjQuMzc2LDAsMCwxLDI1LjY1LTQyLjc1Wk0xMTAuODA4LDBoMjAuMTc4Vi00Ni4xN2MwLTEzLjUwOSw5LjA2My0yMi4wNTksMjAuNjkxLTIyLjA1OSwxMC43NzMsMCwxOC4zLDYuNjY5LDE4LjMsMjEuMDMzVjBoMjAuMTc4Vi00Ni41MTJjMC0xMy4xNjcsOS4wNjMtMjEuNzE3LDIwLjY5MS0yMS43MTcsMTAuNzczLDAsMTguMyw2LjY2OSwxOC4zLDIxLjAzM1YwaDIwLjE3OFYtNTEuNDcxYzAtMjEuNzE3LTEzLjY4LTM1LjczOS0zMy41MTYtMzUuNzM5LTEzLjY4LDAtMjIuNzQzLDYuMzI3LTMwLjQzOCwxNi4wNzQtNS40NzItMTAuMDg5LTE1LjczMi0xNi4wNzQtMjguNzI4LTE2LjA3NGEzNS40NzQsMzUuNDc0LDAsMCwwLTI1LjY1LDEwLjk0NFYtODUuNUgxMTAuODA4Wk0zODIuNywwVi00Ni4xN2MwLTEzLjUwOSw5LjA2My0yMi4wNTksMjAuNjkxLTIyLjA1OSwxMC43NzMsMCwxOC4zLDYuNjY5LDE4LjMsMjEuMDMzVjBoMjAuMTc4Vi01MS40NzFjMC0yMS43MTctMTMuNjgtMzUuNzM5LTMzLjUxNi0zNS43MzlBMzUuNDc0LDM1LjQ3NCwwLDAsMCwzODIuNy03Ni4yNjZWLTg1LjVIMzYyLjUyVjBaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg2MTUgNTkyKSIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik02LjE1Ni02MS41NkE2My4zNDYsNjMuMzQ2LDAsMCwwLDY5LjQyNiwxLjcxYTYxLjU4MSw2MS41ODEsMCwwLDAsMzIuNDktOS4yMzRsMjQuNjcyLDI3LjVMMTQxLjQ2NSw2LjQ3MSwxMTcuNDc3LTIwLjUyQTYyLjg2Miw2Mi44NjIsMCwwLDAsMTMyLjctNjEuNTZhNjMuMzQ2LDYzLjM0NiwwLDAsMC02My4yNy02My4yN0E2My4zNDYsNjMuMzQ2LDAsMCwwLDYuMTU2LTYxLjU2Wm02My4yNy00My4wOTJBNDMuMTMxLDQzLjEzMSwwLDAsMSwxMTIuNTE4LTYxLjU2YTQyLjQ4NSw0Mi40ODUsMCwwLDEtOC44OTIsMjUuODIxczEyLjEyMywxMy4xNzgsMTMuODUxLDE1LjIxOS0xMy43MywxNC45NjctMTUuNTYxLDEzUzg3LjcyMy0yMy4yNTYsODcuNzIzLTIzLjI1NmEzNi45NTEsMzYuOTUxLDAsMCwxLTE4LjMsNC43ODhBNDMuMTMxLDQzLjEzMSwwLDAsMSwyNi4zMzQtNjEuNTYsNDMuMTMxLDQzLjEzMSwwLDAsMSw2OS40MjYtMTA0LjY1MloiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ2OSA1OTIpIiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTQ0LDg4QTQ0LjAxMiw0NC4wMTIsMCwwLDEsMjYuODczLDMuNDU4LDQ0LjAxMSw0NC4wMTEsMCwwLDEsNjEuMTI3LDg0LjU0Miw0My43MjMsNDMuNzIzLDAsMCwxLDQ0LDg4Wm0wLTY3LjhhMjMuNzIxLDIzLjcyMSwwLDEsMCw5LjI2MiwxLjg3QTIzLjY0NiwyMy42NDYsMCwwLDAsNDQsMjAuMloiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDg3NiA1MDYpIiBmaWxsPSIjZmZmIi8+PHJlY3Qgd2lkdGg9IjE5LjkiIGhlaWdodD0iNDMiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDk0NCA1NTApIiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTQ0LDg4QTQ0LjAxMiw0NC4wMTIsMCwwLDEsMjYuODczLDMuNDU4LDQ0LjAxMSw0NC4wMTEsMCwwLDEsNjEuMTI3LDg0LjU0Miw0My43MjMsNDMuNzIzLDAsMCwxLDQ0LDg4Wm0wLTY3LjhhMjMuNzIxLDIzLjcyMSwwLDEsMCw5LjI2MiwxLjg3QTIzLjY0NiwyMy42NDYsMCwwLDAsNDQsMjAuMloiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEwNzEgNTA2KSIgZmlsbD0iI2ZmZiIvPjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIxMjUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDExMzkgNDY5KSIgZmlsbD0iI2ZmZiIvPjwvZz48L3N2Zz4=" alt="Qomand" width="160" height="34" style="display:block;margin:0 auto 16px auto;" />
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
              <div style="background-color:#1c1917;border:2px solid #F07A4F;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;">
                <p style="margin:0 0 6px;font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Votre code de retrait</p>
                <p style="margin:0;font-size:38px;font-weight:900;color:#F07A4F;letter-spacing:0.2em;font-family:monospace;">${pickupCode}</p>
                <p style="margin:8px 0 0;font-size:12px;color:#71717a;">ésentez ce code au comptoir</p>
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
