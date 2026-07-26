import { Router } from "express";
import { AsyncHandler } from "../../shared/utils/asyncHandler";
import { authController } from "../../controller";
import { authRateLimit, loginRateLimit } from "../../middleware/ratelimit";
import { authenticate } from "../../middleware/authentication";

const router = Router();

router.post(
  "/register",
  authRateLimit,
  AsyncHandler(authController.register.bind(authController)),
);

router.post(
  "/verify-email",
  AsyncHandler(authController.verifyEmail.bind(authController)),
);

router.post(
  "/resend-email-verification",
  authRateLimit,
  AsyncHandler(authController.resendVerifyEmail.bind(authController)),
);

router.post(
  "/login",
  loginRateLimit,
  AsyncHandler(authController.login.bind(authController)),
);

router.post(
  "/refresh",
  AsyncHandler(authController.refreshToken.bind(authController)),
);

router.post(
  "/forget-password",
  authRateLimit,
  AsyncHandler(authController.forgetPassword.bind(authController)),
);

router.post(
  "/reset-password",
  AsyncHandler(authController.resetPassword.bind(authController)),
);

router.post(
  "/logout",
  authenticate,
  AsyncHandler(authController.logout.bind(authController)),
);

router.post(
  "/clinic/:clinicId/activate",
  authenticate,
  AsyncHandler(authController.activateClinic.bind(authController)),
);

export default router;
