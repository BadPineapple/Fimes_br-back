import { prisma } from '../../db/prisma.js';

export async function loginOrRegister(email: string, name?: string) {
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, name: name ?? null, role: 'user' }
    });
  }
  return user;
}
