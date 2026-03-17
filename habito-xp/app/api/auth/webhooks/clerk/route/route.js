import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from "@/lib/prisma" // Verifique se o caminho do seu prisma está correto

export async function POST(req: Request) {
  // 1. Pegar o Secret do painel do Clerk (vamos pegar no próximo passo)
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Erro: CLERK_WEBHOOK_SECRET não encontrado no .env')
  }

  // 2. Pegar os cabeçalhos de segurança do Svix
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Erro: Cabeçalhos do Svix ausentes', { status: 400 })
  }

  // 3. Pegar o corpo da requisição
  const payload = await req.json()
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent

  // 4. Verificar se a requisição veio mesmo do Clerk
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Erro ao verificar webhook:', err);
    return new Response('Erro ao verificar assinatura', { status: 400 })
  }

  // 5. Lógica para quando um usuário é criado
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses } = evt.data;
    
    // Pega o primeiro e-mail da lista
    const email = email_addresses[0].email_address;

    // SALVA NO SEU BANCO DE DADOS (PRISMA)
    try {
      await prisma.user.create({
        data: {
          id: id, // O ID do Clerk será o mesmo ID no seu banco
          email: email,
        },
      })
      console.log(`Usuário ${id} criado no Prisma com sucesso!`)
    } catch (error) {
      console.error("Erro ao salvar usuário no banco:", error)
    }
  }

  return new Response('Webhook processado', { status: 200 })
}