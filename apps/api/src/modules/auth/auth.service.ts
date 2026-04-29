import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../common/prisma.service";
import { UsersService } from "../users/users.service";
import { LoginDto } from "./dto/login.dto";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { Request } from "express";

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  // â”€â”€â”€ Login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async login(dto: LoginDto, req?: Request) {
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException("Credenciais invÃ¡lidas");
    if (!user.isActive) throw new ForbiddenException("UsuÃ¡rio inativo");

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Credenciais invÃ¡lidas");

    const tenants = await this.getTenantsForUser(user.id);
    const { accessToken, refreshToken } = await this.generateTokenPair(
      user,
      req
    );

    return {
      accessToken,
      refreshToken,
      user: this.safeUser(user),
      tenants,
    };
  }

  // â”€â”€â”€ Refresh â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async refresh(rawToken: string, req?: Request) {
    // Verificar assinatura JWT do refresh token
    let payload: { sub: string };
    try {
      payload = this.jwt.verify<{ sub: string }>(rawToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Refresh token invÃ¡lido ou expirado");
    }

    const tokenHash = this.hashToken(rawToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token revogado ou expirado");
    }

    if (stored.userId !== payload.sub) {
      throw new UnauthorizedException("Token invÃ¡lido");
    }

    // Revogar token atual e emitir novo par (rotaÃ§Ã£o)
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException();

    const { accessToken, refreshToken } = await this.generateTokenPair(
      user,
      req
    );
    return { accessToken, refreshToken };
  }

  // â”€â”€â”€ Logout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async logout(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken
      .update({
        where: { tokenHash },
        data: { revokedAt: new Date() },
      })
      .catch(() => {
        // token jÃ¡ revogado ou inexistente â€” ignorar silenciosamente
      });
    return { ok: true };
  }

  // â”€â”€â”€ Me â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async me(authUser: AuthenticatedUser) {
    const user = await this.users.findById(authUser.id);
    if (!user || !user.isActive) throw new UnauthorizedException();
    const tenants = await this.getTenantsForUser(user.id);
    return { user: this.safeUser(user), tenants };
  }

  // â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private async generateTokenPair(
    user: { id: string; email: string; role: UserRole },
    req?: Request
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>("JWT_SECRET"),
      expiresIn: this.config.get<string>("JWT_ACCESS_EXPIRES_IN", "15m"),
    });

    const rawRefresh = randomBytes(64).toString("hex");
    const tokenHash = this.hashToken(rawRefresh);
    const expiresIn = this.config.get<string>("JWT_REFRESH_EXPIRES_IN", "7d");
    const expiresAt = this.parseExpiry(expiresIn);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        userAgent: req?.headers["user-agent"],
        ipAddress: req?.ip,
      },
    });

    return { accessToken, refreshToken: rawRefresh };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private parseExpiry(expiry: string): Date {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error(`Invalid expiry format: ${expiry}`);
    const [, val, unit] = match;
    const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit]!;
    return new Date(Date.now() + parseInt(val) * ms);
  }

  private safeUser(user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  private async getTenantsForUser(userId: string) {
    const links = await this.prisma.tenantUser.findMany({
      where: { userId, isActive: true },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, status: true },
        },
      },
    });
    return links.map((l) => ({ ...l.tenant, role: l.role }));
  }
}
