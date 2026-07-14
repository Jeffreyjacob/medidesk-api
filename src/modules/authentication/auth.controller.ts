import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import {
  forgetPasswordSchema,
  loginSchema,
  logoutSchema,
  registerSchema,
  resendEmailVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.validation";
import { ResponseHelper } from "../../shared/utils/apiResponse";
import { setRefreshTokenCookie } from "../../shared/utils/tokenUtils";
import { env } from "../../config/env";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async register(req: Request, res: Response): Promise<void> {
    const data = registerSchema.parse(req.body);
    const result = await this.authService.registerUser(data);
    req.log?.info({ userId: result.user.id }, "User Created");
    ResponseHelper.created(res, result.user, result.message);
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    const data = verifyEmailSchema.parse(req.body);
    const result = await this.authService.verifyEmail(data);
    req.log?.info({ email: data.email }, "email verification");
    ResponseHelper.success(res, "", 200, result.message);
  }

  async resendVerifyEmail(req: Request, res: Response): Promise<void> {
    const data = resendEmailVerificationSchema.parse(req.body);
    const result = await this.authService.resendVerificationEmail(data);
    ResponseHelper.success(res, "", 200, result.message);
  }

  async login(req: Request, res: Response): Promise<void> {
    const data = loginSchema.parse(req.body);
    const result = await this.authService.login(data);
    req.log?.info({ userId: result.user.id }, "User logged in");
    setRefreshTokenCookie(res, result.refreshToken);
    ResponseHelper.success(
      res,
      { user: result.user, accessToken: result.accessToken },
      200,
      "User logged in successfully!",
    );
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    const refresh = req.cookies[env.REFRESH_TOKEN_NAME];
    const result = await this.authService.refreshToken(refresh);
    const { refreshToken, accessToken } = result;
    setRefreshTokenCookie(res, refreshToken);
    ResponseHelper.success(
      res,
      { accessToken },
      200,
      "token has been refreshed",
    );
  }

  async forgetPassword(req: Request, res: Response): Promise<void> {
    const data = forgetPasswordSchema.parse(req.body);
    const result = await this.authService.forgetPassword(data);
    ResponseHelper.success(res, "", 200, result.message);
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    const data = resetPasswordSchema.parse(req.body);
    const result = await this.authService.resetPassword(data);
    ResponseHelper.success(res, "", 200, result.message);
  }

  async logout(req: Request, res: Response): Promise<void> {
    const data = logoutSchema.parse(req.body);
    const refresh = req.cookies[env.REFRESH_TOKEN_NAME];
    const result = await this.authService.logout(data.accessToken, refresh);
    req.log?.info({ userId: req.user?.userId }, "User logged out");
    ResponseHelper.success(res, "", 200, result.message);
  }
}
