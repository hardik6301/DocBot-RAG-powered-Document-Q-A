import { NextResponse } from "next/server";
import { requireUserOrResponse } from "@/lib/auth";
import {
  addWorkspaceMember,
  assignDocumentWorkspace,
  createWorkspace,
  listWorkspacesForUser,
} from "@/lib/sharing";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUserOrResponse();
  if (user instanceof Response) return user;

  try {
    const workspaces = await listWorkspacesForUser(user.id);
    return NextResponse.json({ workspaces });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list workspaces" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await requireUserOrResponse();
  if (user instanceof Response) return user;

  const body = (await request.json().catch(() => null)) as {
    action?: "create" | "invite" | "assign-doc";
    name?: string;
    workspaceId?: string;
    email?: string;
    role?: "admin" | "member";
    documentId?: string;
  } | null;

  try {
    if (body?.action === "invite") {
      if (!body.workspaceId || !body.email) {
        return NextResponse.json(
          { error: "workspaceId and email required" },
          { status: 400 },
        );
      }
      const member = await addWorkspaceMember({
        workspaceId: body.workspaceId,
        email: body.email,
        role: body.role,
        actorUserId: user.id,
      });
      return NextResponse.json({ member }, { status: 201 });
    }

    if (body?.action === "assign-doc") {
      if (!body.documentId) {
        return NextResponse.json(
          { error: "documentId required" },
          { status: 400 },
        );
      }
      await assignDocumentWorkspace({
        documentId: body.documentId,
        workspaceId: body.workspaceId ?? null,
        ownerUserId: user.id,
      });
      return NextResponse.json({ ok: true });
    }

    if (!body?.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const workspace = await createWorkspace(body.name, user.id);
    return NextResponse.json({ workspace }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Workspace action failed" },
      { status: 400 },
    );
  }
}
