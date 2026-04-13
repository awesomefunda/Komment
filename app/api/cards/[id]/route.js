import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// DELETE /api/cards/[id]
// Body: { deletion_token: string }
// No login required — the token stored in the browser acts as the key.
export async function DELETE(request, { params }) {
  const { id } = params;

  try {
    const body = await request.json();
    const { deletion_token } = body;

    if (!id || !deletion_token) {
      return NextResponse.json({ error: "Missing id or deletion_token" }, { status: 400 });
    }

    // Use admin client to bypass RLS — only deletes if BOTH id AND token match
    const { data, error } = await getAdminClient()
      .from("cards")
      .delete()
      .eq("id", id)
      .eq("deletion_token", deletion_token)
      .select("id");

    if (error) {
      console.error("Delete error:", error.message);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      // Token didn't match — return 403 without confirming whether the card exists
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
