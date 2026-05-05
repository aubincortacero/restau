import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface AuthTransferCode {
  id: string;
  code: string;
  user_id: string;
  refresh_token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  console.log("[AUTH_CONTINUE] Demande de transfert avec code:", code ? "présent" : "manquant");

  // 1. Vérifier que le code est présent
  if (!code) {
    console.error("[AUTH_CONTINUE] Code manquant dans l'URL");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // Utiliser le client admin pour lire la table auth_transfer_codes
    // (la table peut avoir RLS activé)
    const adminClient = createAdminClient();

    // 2. Récupérer le code de transfert
    const { data: transferData, error: fetchError } = await adminClient
      .from("auth_transfer_codes")
      .select("*")
      .eq("code", code)
      .eq("used", false)
      .single<AuthTransferCode>();

    if (fetchError || !transferData) {
      console.error("[AUTH_CONTINUE] Code invalide ou déjà utilisé:", fetchError?.message);
      return NextResponse.redirect(new URL("/login", request.url));
    }

    console.log("[AUTH_CONTINUE] Code trouvé pour user_id:", transferData.user_id);

    // 3. Vérifier l'expiration
    const expiresAt = new Date(transferData.expires_at);
    const now = new Date();
    
    if (expiresAt < now) {
      const elapsed = Math.floor((now.getTime() - expiresAt.getTime()) / 1000);
      console.error(`[AUTH_CONTINUE] Code expiré depuis ${elapsed}s`);
      
      // Marquer comme utilisé même si expiré pour éviter les réutilisations
      await adminClient
        .from("auth_transfer_codes")
        .update({ used: true })
        .eq("id", transferData.id);
      
      return NextResponse.redirect(new URL("/login", request.url));
    }

    console.log("[AUTH_CONTINUE] Code valide, expire dans:", Math.floor((expiresAt.getTime() - now.getTime()) / 1000), "secondes");

    // 4. Marquer le code comme utilisé AVANT d'établir la session
    // (pour éviter les race conditions)
    const { error: updateError } = await adminClient
      .from("auth_transfer_codes")
      .update({ used: true })
      .eq("id", transferData.id);

    if (updateError) {
      console.error("[AUTH_CONTINUE] Erreur lors du marquage comme utilisé:", updateError.message);
      return NextResponse.redirect(new URL("/login", request.url));
    }

    console.log("[AUTH_CONTINUE] Code marqué comme utilisé");

    // 5. Établir la session avec le refresh token
    // Utiliser le client normal (pas admin) pour que les cookies soient bien gérés
    const supabase = await createClient();
    
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: "", // Sera généré automatiquement depuis le refresh_token
      refresh_token: transferData.refresh_token,
    });

    if (sessionError || !sessionData.session || !sessionData.user) {
      console.error("[AUTH_CONTINUE] Erreur lors de l'établissement de la session:", sessionError?.message);
      return NextResponse.redirect(new URL("/login", request.url));
    }

    console.log("[AUTH_CONTINUE] Session établie avec succès pour user:", sessionData.user.id);
    console.log("[AUTH_CONTINUE] Redirection vers:", redirectTo);

    // 6. Rediriger vers la destination
    // Les cookies de session sont automatiquement gérés par Supabase SSR
    return NextResponse.redirect(new URL(redirectTo, request.url));
    
  } catch (error) {
    console.error("[AUTH_CONTINUE] Erreur inattendue:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
