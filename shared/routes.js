import { z } from "zod";

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  internal: z.object({ message: z.string() }),
};

const scanResponseSchema = z.object({
  diseaseName: z.string(),
  confidence: z.number(),
  symptoms: z.string(),
  causes: z.string(),
  recommendations: z.string().optional(),
  treatmentOrganic: z.string().optional(),
  treatmentChemical: z.string().optional(),
});

export const api = {
  scan: {
    analyze: {
      method: "POST",
      path: "/api/scan",
      input: z.object({ imageBase64: z.string() }),
      responses: { 200: scanResponseSchema, 400: errorSchemas.validation, 500: errorSchemas.internal },
    },
    analyzeText: {
      method: "POST",
      path: "/api/scan/text",
      input: z.object({ text: z.string().min(5) }),
      responses: { 200: scanResponseSchema, 400: errorSchemas.validation, 500: errorSchemas.internal },
    },
  },
  auth: {
    register: {
      method: "POST",
      path: "/api/auth/register",
      input: z.object({ email: z.string().email(), password: z.string().min(6) }),
      responses: { 200: z.object({ user: z.object({ id: z.number(), email: z.string() }) }) },
    },
    login: {
      method: "POST",
      path: "/api/auth/login",
      input: z.object({ email: z.string().email(), password: z.string() }),
      responses: {
        200: z.object({ user: z.object({ id: z.number(), email: z.string(), isAdmin: z.boolean() }) }),
        401: z.object({ message: z.string() }),
      },
    },
    logout: {
      method: "POST",
      path: "/api/auth/logout",
      responses: { 200: z.object({ success: z.boolean() }) },
    },
    me: {
      method: "GET",
      path: "/api/auth/me",
      responses: {
        200: z.object({ user: z.object({ id: z.number(), email: z.string(), isAdmin: z.boolean() }) }),
        401: z.object({ message: z.string() }),
      },
    },
  },
  history: {
    list: {
      method: "GET",
      path: "/api/history",
      responses: { 200: z.array(z.object({
        id: z.number(),
        element_name: z.string(),
        confidence: z.number(),
        symptoms: z.string().nullable(),
        causes: z.string().nullable(),
        recommendations: z.string().nullable(),
        image_thumbnail: z.string().nullable(),
        input_mode: z.string(),
        created_at: z.number(),
      })) },
    },
    save: {
      method: "POST",
      path: "/api/history",
      input: z.object({
        element_name: z.string(),
        confidence: z.number(),
        symptoms: z.string().optional(),
        causes: z.string().optional(),
        recommendations: z.string().optional(),
        image_thumbnail: z.string().optional(),
        input_mode: z.string().optional(),
      }),
      responses: { 200: z.object({ id: z.number() }) },
    },
  },
  admin: {
    getPrompt: {
      method: "GET",
      path: "/api/admin/prompt",
      responses: { 200: z.object({ prompt: z.string() }) },
    },
    updatePrompt: {
      method: "PUT",
      path: "/api/admin/prompt",
      input: z.object({ prompt: z.string().min(10) }),
      responses: { 200: z.object({ success: z.boolean() }) },
    },
    getRecommendations: {
      method: "GET",
      path: "/api/admin/recommendations",
      responses: { 200: z.record(z.string(), z.string()) },
    },
    updateRecommendations: {
      method: "PUT",
      path: "/api/admin/recommendations",
      input: z.object({ recommendations: z.record(z.string(), z.string()) }),
      responses: { 200: z.object({ success: z.boolean() }) },
    },
  },
};

export function buildUrl(path, params) {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) url = url.replace(`:${key}`, String(value));
    });
  }
  return url;
}
