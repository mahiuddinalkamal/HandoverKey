import { JWTPayload } from "../auth/jwt";
import { UserService } from "./user-service";

export class SessionService {
  /**
   * Validates a session by checking server-side data, not user-controlled input
   * This prevents user-controlled bypass of security checks
   */
  static async validateSession(
    payload: JWTPayload | undefined,
  ): Promise<boolean> {
    if (!payload) {
      return false;
    }

    // Validate payload structure (server-side validation)
    if (
      !payload.userId ||
      typeof payload.userId !== "string" ||
      !payload.email ||
      typeof payload.email !== "string" ||
      !payload.sessionId ||
      typeof payload.sessionId !== "string"
    ) {
      return false;
    }

    try {
      // Server-side validation - check if user exists in database
      const user = await UserService.findUserById(payload.userId);

      if (!user) {
        return false;
      }

      // Validate email matches (server-side check)
      if (user.email !== payload.email) {
        return false;
      }

      // Additional server-side validations can be added here
      // such as checking if session is still active, not revoked, etc.

      return true;
    } catch (error) {
      console.error("Session validation error:", error);
      return false;
    }
  }

  /**
   * Validates authentication for a request using server-side checks
   */
  static async isAuthenticated(req: { user?: JWTPayload }): Promise<boolean> {
    return await this.validateSession(req.user);
  }
}
