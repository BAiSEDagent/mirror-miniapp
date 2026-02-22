import { minikitConfig } from '@/minikit.config';

export async function GET() {
  return Response.json({
    accountAssociation: minikitConfig.accountAssociation,
    miniapp:            minikitConfig.miniapp,
  });
}
