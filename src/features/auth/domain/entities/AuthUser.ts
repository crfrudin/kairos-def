import type { Email } from '../value-objects/Email';

export type AuthUserId = string;

export type AuthUserProps = {
  id: AuthUserId;
  email: Email;
  emailConfirmed: boolean;
  createdAt: Date;
};

export class AuthUser {
  private readonly id: AuthUserId;
  private readonly email: Email;
  private readonly emailConfirmed: boolean;
  private readonly createdAt: Date;

  private constructor(props: AuthUserProps) {
    this.id = props.id;
    this.email = props.email;
    this.emailConfirmed = props.emailConfirmed;
    this.createdAt = props.createdAt;
  }

  public static create(props: AuthUserProps): AuthUser {
    // Entidade mínima, sem IO.
    return new AuthUser(props);
  }

  public getId(): AuthUserId {
    return this.id;
  }

  public getEmail(): Email {
    return this.email;
  }

  public isEmailConfirmed(): boolean {
    return this.emailConfirmed;
  }

  public getCreatedAt(): Date {
    return new Date(this.createdAt.getTime());
  }
}
