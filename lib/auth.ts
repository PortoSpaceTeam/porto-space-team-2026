import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { getClient } from "./db";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { env } from "@/lib/env";
import { Resend } from "resend";
import { getVerificationEmailTemplate } from "@/lib/email-templates";

const resend = new Resend(env.RESEND_API_KEY);

/*
 * Cliente do mongoDB, cached para evitar
 * recriar conexões durante o desenvolvimento
 */
const db = await getClient();

/*
 * Configurações do better-auth. Mais informações:
 * https://www.better-auth.com/docs
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [`*.${env.BETTER_AUTH_URL}`],
  database: mongodbAdapter(db, {
    client: db.client,
  }),
  advanced:{
    cookiePrefix:"porto_space_team",
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        if (!ctx.body?.email.endsWith("@up.pt")) {
          throw new APIError("BAD_REQUEST", {
            message: "Email must end with @up.pt",
          });
        }
      }

      if (ctx.path === "/sign-in/email") {
        const email = ctx.body?.email;
        if (email) {
          const usersCollection = db.collection("user");
          const user = await usersCollection.findOne({ email });
          if (user && user.approvalStatus !== "APPROVED") {
            throw new APIError("FORBIDDEN", {
              message: "ACCOUNT_NOT_APPROVED",
            });
          }
        }
      }
    }),
  },
  user: {
    additionalFields: {
      department: { type: "string", input: true, required: true },
      approvalStatus: {
        type: "string",
        input: false,
        required: false,
        defaultValue: "PENDING",
      },
      approvedBy: {
        type: "string",
        input: false,
        required: false,
        defaultValue: null,
      },
      approvedAt: {
        type: "date",
        input: false,
        required: false,
        defaultValue: null,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
    minPasswordLength: 6,
    maxPasswordLength: 32,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, token }) => {
      const verificationUrl = `${env.BETTER_AUTH_URL}/verify-email?token=${token}`;

      await resend.emails.send({
        from: env.EMAIL_FROM,
        to: user.email,
        subject: "Verify your email - Porto Space Team",
        html: getVerificationEmailTemplate({
          url: verificationUrl,
          name: user.name,
        }),
      });
    },
  },
  plugins: [nextCookies()],
});
