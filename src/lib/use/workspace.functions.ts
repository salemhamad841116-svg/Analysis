import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getWorkspaceHistory = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    // Fetch the current strategy
    const { data: current } = await db.from("use_strategies").select("*").eq("id", data.id).single();
    if (!current) throw new Error("Strategy not found");

    const history = [current];
    let parentId = current.parent_indicator_id;
    let depth = 0;
    while (parentId && depth < 20) {
      const { data: parent } = await db.from("use_strategies").select("*").eq("id", parentId).single();
      if (!parent) break;
      history.push(parent);
      parentId = parent.parent_indicator_id;
      depth++;
    }

    // Children (newer versions created from this one)
    const { data: children } = await db.from("use_strategies").select("id,name,created_at").eq("parent_indicator_id", data.id).order("created_at", { ascending: false });

    return {
      current,
      history: history.reverse(), // oldest to newest
      children: children ?? [],
    };
  });
