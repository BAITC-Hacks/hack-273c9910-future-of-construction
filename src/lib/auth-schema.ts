import { z } from "zod";

export const loginSchema = z.string().trim().min(3, "Логин должен содержать от 3 до 30 символов.")
  .max(30, "Логин должен содержать от 3 до 30 символов.")
  .regex(/^[a-zA-Z0-9_]+$/, "В логине можно использовать латинские буквы, цифры и знак _.")
  .transform((value) => value.toLowerCase());

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Укажите имя.").max(60, "Имя — не больше 60 символов."),
  bio: z.string().trim().max(500, "О себе — не больше 500 символов."),
});

export const credentialsSchema = z.object({
  login: loginSchema,
  password: z.string().min(1, "Введите пароль.").max(128, "Пароль — не больше 128 символов."),
});

export const registerSchema = credentialsSchema.extend({
  displayName: profileSchema.shape.displayName,
  password: z.string().min(8, "Пароль должен содержать не менее 8 символов.").max(128, "Пароль — не больше 128 символов."),
});

export type PublicUser = {
  id: string;
  login: string;
  displayName: string;
  bio: string;
  createdAt: string;
};
