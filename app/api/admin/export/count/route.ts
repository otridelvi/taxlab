import { authorize } from "@/lib/api";
import { countExportParticipants } from "@/lib/db/export";
import { filterFromParams } from "@/lib/export/filter";

/** GET /api/admin/export/count?cell=1,2&status=completed&batch=&from=&to= → { count } */
export async function GET(request: Request) {
  const admin = await authorize("export:dataset");
  if (admin instanceof Response) return admin;
  const filter = filterFromParams(new URL(request.url).searchParams);
  filter.code = null;
  return Response.json({ count: await countExportParticipants(filter) });
}
