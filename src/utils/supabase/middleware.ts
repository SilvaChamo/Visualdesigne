import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { applySharedAuthCookieOptions } from "@/lib/panel-origin";

export const updateSession = async (request: NextRequest) => {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const hostname = request.headers.get("host") ?? undefined;

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(
                            name,
                            value,
                            applySharedAuthCookieOptions(options, hostname),
                        )
                    );
                },
            },
        }
    );

    // This will refresh the session if it's expired
    try {
        await supabase.auth.getUser();
    } catch (error) {
        // Refresh token inválido/revogado (ex.: cookie antigo de uma sessão já
        // encerrada no servidor) fazia isto rebentar sem apanhar — como o
        // middleware corre em TODOS os pedidos, qualquer visitante com um
        // cookie de sessão desactualizado ficava com "Internal Server Error"
        // em todo o site. Tratar como sem sessão e deixar as páginas/rotas
        // tratarem o utilizador como visitante, tal como já fazem quando não
        // há cookie nenhum.
        console.error("[middleware] auth.getUser falhou:", error);
    }

    return response;
};
