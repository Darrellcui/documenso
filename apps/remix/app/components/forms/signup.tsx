import { authClient } from '@documenso/auth/client';
import { useAnalytics } from '@documenso/lib/client-only/hooks/use-analytics';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { ZNameSchema } from '@documenso/lib/types/name';
import { env } from '@documenso/lib/utils/env';
import { zEmail } from '@documenso/lib/utils/zod';
import { ZPasswordSchema } from '@documenso/trpc/server/auth-router/schema';
import { cn } from '@documenso/ui/lib/utils';
import { Button } from '@documenso/ui/primitives/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@documenso/ui/primitives/form/form';
import { Input } from '@documenso/ui/primitives/input';
import { PasswordInput } from '@documenso/ui/primitives/password-input';
import { SignaturePadDialog } from '@documenso/ui/primitives/signature-pad/signature-pad-dialog';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { Turnstile } from '@marsidev/react-turnstile';
import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { FaIdCardClip } from 'react-icons/fa6';
import { FcGoogle } from 'react-icons/fc';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';

import { BrandingLogo } from '~/components/general/branding-logo';

/** Local part of an address, i.e. everything before the "@" (RFC 5322 dot-atom). */
const EMAIL_LOCAL_PART_REGEX = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;

/**
 * When signup is restricted to a single domain the email field accepts only the
 * local part and the domain is appended on submit, so `email` holds the local
 * part while the form is open. Otherwise it holds a full address.
 */
export const buildSignUpFormSchema = (lockedEmailDomain?: string) =>
  z
    .object({
      name: ZNameSchema,
      email: lockedEmailDomain
        ? z
            .string()
            .min(1)
            .regex(EMAIL_LOCAL_PART_REGEX, { message: msg`Enter the part before the @ — letters, digits, dots.`.id })
        : zEmail().min(1),
      password: ZPasswordSchema,
      signature: z.string().min(1, { message: msg`We need your signature to sign documents`.id }),
    })
    .refine(
      (data) => {
        const { name, email, password } = data;
        return !password.includes(name) && !password.includes(email.split('@')[0]);
      },
      {
        message: msg`Password should not be common or based on personal information`.id,
        path: ['password'],
      },
    );

export const ZSignUpFormSchema = buildSignUpFormSchema();

export const SIGNUP_ERROR_MESSAGES: Record<string, MessageDescriptor> = {
  SIGNUP_DISABLED: msg`Signup is currently disabled or not available for your email domain.`,
  SIGNUP_DISPOSABLE_EMAIL: msg`Disposable email addresses are not allowed. Please sign up with a permanent email address.`,
  [AppErrorCode.ALREADY_EXISTS]: msg`We were unable to create your account. If you already have an account, try signing in instead.`,
  [AppErrorCode.INVALID_REQUEST]: msg`We were unable to create your account. Please review the information you provided and try again.`,
};

export type TSignUpFormSchema = z.infer<typeof ZSignUpFormSchema>;

export type SignUpFormProps = {
  className?: string;
  initialEmail?: string;
  isEmailPasswordSignupEnabled?: boolean;
  isGoogleSignupEnabled?: boolean;
  isMicrosoftSignupEnabled?: boolean;
  isOidcSignupEnabled?: boolean;
  /** Set when signup is restricted to exactly one domain; locks the address suffix. */
  lockedEmailDomain?: string;
  returnTo?: string;
};

/** Strips a locked domain off a prefilled address so only the local part is shown. */
const toLocalPart = (email: string | undefined, lockedEmailDomain: string | undefined) => {
  if (!email) {
    return '';
  }

  if (!lockedEmailDomain || !email.includes('@')) {
    return email;
  }

  const [localPart, domain] = email.split('@');

  return domain.toLowerCase() === lockedEmailDomain.toLowerCase() ? localPart : '';
};

export const SignUpForm = ({
  className,
  initialEmail,
  isEmailPasswordSignupEnabled = true,
  isGoogleSignupEnabled,
  isMicrosoftSignupEnabled,
  isOidcSignupEnabled,
  lockedEmailDomain,
  returnTo,
}: SignUpFormProps) => {
  const { _ } = useLingui();
  const { toast } = useToast();

  const analytics = useAnalytics();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const utmSrc = searchParams.get('utm_source') ?? null;

  const turnstileSiteKey = env('NEXT_PUBLIC_TURNSTILE_SITE_KEY');
  const turnstileRef = useRef<TurnstileInstance>(null);

  const hasSocialAuthEnabled = isGoogleSignupEnabled || isMicrosoftSignupEnabled || isOidcSignupEnabled;

  const formSchema = useMemo(() => buildSignUpFormSchema(lockedEmailDomain), [lockedEmailDomain]);

  const form = useForm<TSignUpFormSchema>({
    values: {
      name: '',
      email: toLocalPart(initialEmail, lockedEmailDomain),
      password: '',
      signature: '',
    },
    mode: 'onChange',
    resolver: zodResolver(formSchema),
  });

  const isSubmitting = form.formState.isSubmitting;

  const onFormSubmit = async ({ name, email: emailInput, password, signature }: TSignUpFormSchema) => {
    // With a locked domain the field carries only the local part.
    const email = lockedEmailDomain ? `${emailInput}@${lockedEmailDomain}` : emailInput;

    try {
      let token: string | undefined;

      if (turnstileSiteKey) {
        token = await turnstileRef.current?.getResponsePromise(3000).catch((_err) => undefined);

        if (!token) {
          toast({
            title: _(msg`Human verification required`),
            description: _(msg`Please complete the CAPTCHA challenge before signing in.`),
            variant: 'destructive',
          });

          return;
        }
      }

      await authClient.emailPassword.signUp({
        name,
        email,
        password,
        signature,
        captchaToken: token ?? undefined,
      });

      await navigate(returnTo ? returnTo : '/unverified-account');

      toast({
        title: _(msg`Registration Successful`),
        description: _(
          msg`You have successfully registered. Please verify your account by clicking on the link you received in the email.`,
        ),
        duration: 5000,
      });

      analytics.capture('App: User Sign Up', {
        email,
        timestamp: new Date().toISOString(),
        custom_campaign_params: { src: utmSrc },
      });
    } catch (err) {
      const error = AppError.parseError(err);

      const errorMessage = SIGNUP_ERROR_MESSAGES[error.code] ?? SIGNUP_ERROR_MESSAGES.INVALID_REQUEST;

      toast({
        title: _(msg`An error occurred`),
        description: _(errorMessage),
        variant: 'destructive',
      });

      turnstileRef.current?.reset();
    }
  };

  const onSignUpWithGoogleClick = async () => {
    try {
      await authClient.google.signIn();
    } catch {
      toast({
        title: _(msg`An unknown error occurred`),
        description: _(msg`We encountered an unknown error while attempting to sign you Up. Please try again later.`),
        variant: 'destructive',
      });
    }
  };

  const onSignUpWithMicrosoftClick = async () => {
    try {
      await authClient.microsoft.signIn();
    } catch {
      toast({
        title: _(msg`An unknown error occurred`),
        description: _(msg`We encountered an unknown error while attempting to sign you Up. Please try again later.`),
        variant: 'destructive',
      });
    }
  };

  const onSignUpWithOIDCClick = async () => {
    try {
      await authClient.oidc.signIn();
    } catch {
      toast({
        title: _(msg`An unknown error occurred`),
        description: _(msg`We encountered an unknown error while attempting to sign you Up. Please try again later.`),
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const hash = window.location.hash.slice(1);

    const params = new URLSearchParams(hash);

    const email = params.get('email');

    if (email) {
      form.setValue('email', toLocalPart(email, lockedEmailDomain));
    }
  }, [form, lockedEmailDomain]);

  return (
    <div className={cn('flex justify-center gap-x-12', className)}>
      {/* Brand panel — internal tool, so it states what this is rather than selling it. */}
      <div className="relative hidden flex-1 overflow-hidden rounded-xl border border-border bg-primary xl:flex">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative flex h-full w-full flex-col justify-between p-10">
          <BrandingLogo className="h-9 w-auto brightness-0 invert" />

          <div>
            <h2 className="max-w-md font-semibold text-3xl text-white leading-tight">
              <Trans>Xenvera Sign</Trans>
            </h2>
            <p className="mt-1 font-medium text-base text-white/60">
              <Trans>Internal e-signature workspace</Trans>
            </p>

            <p className="mt-6 max-w-md text-base text-white/70 leading-relaxed">
              <Trans>
                Send contracts and supplier agreements for signature, track their status, and keep every signed copy in
                one place.
              </Trans>
            </p>
          </div>

          <div className="space-y-2.5">
            {[
              msg`Accounts are for Xenvera staff only`,
              msg`Suppliers sign by link — no account needed`,
              msg`Every signed document is stored and auditable`,
            ].map((item) => (
              <div key={item.id} className="flex items-center gap-2.5 text-sm text-white/70">
                <span aria-hidden="true" className="text-white/40">
                  —
                </span>
                {_(item)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex min-h-[min(850px,80vh)] w-full max-w-lg flex-col rounded-xl border border-border bg-neutral-100 p-6 dark:bg-background">
        <div className="h-20">
          <h1 className="font-semibold text-xl md:text-2xl">
            <Trans>Create your account</Trans>
          </h1>

          <p className="mt-2 text-muted-foreground text-xs md:text-sm">
            {lockedEmailDomain ? (
              <Trans>
                Xenvera Sign accounts are for team members with an @{lockedEmailDomain} address. Your signature is drawn
                once here and reused on every document you sign.
              </Trans>
            ) : (
              <Trans>Your signature is drawn once here and reused on every document you sign.</Trans>
            )}
          </p>
        </div>

        <hr className="-mx-6 my-4" />

        <Form {...form}>
          <form className="flex w-full flex-1 flex-col gap-y-4" onSubmit={form.handleSubmit(onFormSubmit)}>
            <fieldset className="flex w-full flex-col gap-y-4" disabled={isSubmitting}>
              {isEmailPasswordSignupEnabled && (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans>Full Name</Trans>
                        </FormLabel>
                        <FormControl>
                          <Input type="text" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans>Email Address</Trans>
                        </FormLabel>

                        {lockedEmailDomain ? (
                          // FormControl wraps the input itself (not this row) so the
                          // label's htmlFor still targets the real field.
                          <div
                            className={cn(
                              'flex h-10 w-full items-stretch overflow-hidden rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                              fieldState.error && '!ring-destructive ring-2',
                            )}
                          >
                            <FormControl>
                              <input
                                {...field}
                                type="text"
                                autoComplete="username"
                                spellCheck={false}
                                autoCapitalize="none"
                                placeholder="name"
                                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground/40 md:text-sm"
                              />
                            </FormControl>
                            <span
                              aria-hidden="true"
                              className="flex select-none items-center border-input border-l bg-muted px-3 font-medium text-muted-foreground text-sm"
                            >
                              @{lockedEmailDomain}
                            </span>
                          </div>
                        ) : (
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                        )}

                        {lockedEmailDomain && (
                          <p className="text-muted-foreground text-xs">
                            <Trans>Only @{lockedEmailDomain} addresses can create an account.</Trans>
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans>Password</Trans>
                        </FormLabel>

                        <FormControl>
                          <PasswordInput {...field} />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="signature"
                    render={({ field: { onChange, value } }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans>Sign Here</Trans>
                        </FormLabel>
                        <FormControl>
                          <SignaturePadDialog
                            disabled={isSubmitting}
                            value={value}
                            onChange={(v) => onChange(v ?? '')}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {turnstileSiteKey && (
                <Turnstile
                  ref={turnstileRef}
                  siteKey={turnstileSiteKey}
                  options={{
                    size: 'flexible',
                    appearance: 'always',
                  }}
                />
              )}

              {hasSocialAuthEnabled && (
                <div className="relative flex items-center justify-center gap-x-4 py-2 text-xs uppercase">
                  <div className="h-px flex-1 bg-border" />
                  <span className="bg-transparent text-muted-foreground">
                    <Trans>Or</Trans>
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}

              {isGoogleSignupEnabled && (
                <Button
                  type="button"
                  size="lg"
                  variant={'outline'}
                  className="border bg-background text-muted-foreground"
                  disabled={isSubmitting}
                  onClick={onSignUpWithGoogleClick}
                >
                  <FcGoogle className="mr-2 h-5 w-5" />
                  <Trans>Sign Up with Google</Trans>
                </Button>
              )}

              {isMicrosoftSignupEnabled && (
                <Button
                  type="button"
                  size="lg"
                  variant={'outline'}
                  className="border bg-background text-muted-foreground"
                  disabled={isSubmitting}
                  onClick={onSignUpWithMicrosoftClick}
                >
                  <img className="mr-2 h-4 w-4" alt="Microsoft Logo" src={'/static/microsoft.svg'} />
                  <Trans>Sign Up with Microsoft</Trans>
                </Button>
              )}

              {isOidcSignupEnabled && (
                <Button
                  type="button"
                  size="lg"
                  variant={'outline'}
                  className="border bg-background text-muted-foreground"
                  disabled={isSubmitting}
                  onClick={onSignUpWithOIDCClick}
                >
                  <FaIdCardClip className="mr-2 h-5 w-5" />
                  <Trans>Sign Up with OIDC</Trans>
                </Button>
              )}

              <p className="mt-4 text-muted-foreground text-sm">
                <Trans>
                  Already have an account?{' '}
                  <Link to="/signin" className="font-medium text-primary duration-200 hover:opacity-70">
                    Sign in instead
                  </Link>
                </Trans>
              </p>
            </fieldset>

            {isEmailPasswordSignupEnabled && (
              <Button loading={form.formState.isSubmitting} type="submit" size="lg" className="mt-6 w-full">
                <Trans>Create account</Trans>
              </Button>
            )}
          </form>
        </Form>
        <p className="mt-6 text-muted-foreground text-xs">
          <Trans>
            Xenvera Sign is an internal system of Xenvera Innovation. Accounts and documents are for company business
            only. Need help? Email{' '}
            <a href="mailto:support@xenvera.com" className="font-medium text-primary duration-200 hover:opacity-70">
              support@xenvera.com
            </a>
            .
          </Trans>
        </p>
      </div>
    </div>
  );
};
