import type { DefaultSession } from 'next-auth';

type UserRole = 'user' | 'admin';
type Membership = 'free' | 'photo' | 'pro';

declare module 'next-auth' {
  interface User {
    role: UserRole;
    membership: Membership;
    isCreator: boolean;
    avatar?: string | null;
  }

  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      role: UserRole;
      membership: Membership;
      isCreator: boolean;
      avatar?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: UserRole;
    membership?: Membership;
    isCreator?: boolean;
  }
}
