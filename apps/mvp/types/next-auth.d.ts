import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      roles: Role[];
      creatorOnboardingComplete: boolean;
    };
  }

  interface User {
    roles?: Role[];
  }
}
