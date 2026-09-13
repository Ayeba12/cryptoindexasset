# Create account

Route: `/register` | Purpose: explain registration and collect necessary details.

Primary action: Create account. Indexing: noindex; exclude from XML sitemap.

SEO title: Create an account | Crypto Index Asset

Meta description: Create your Crypto Index Asset account and review the service terms before you continue.

## Layout

Simplified header with brand and Sign in → G01 intro → G02 single-column form → G03 terms and risk text → compact legal footer.

Keep the form around 440px maximum width. Desktop may use a quiet secondary panel explaining the next step, with no return figures. On mobile remove decorative space and keep the form in normal document flow. Terms precede the primary button. Password controls have explicit Show password / Hide password labels.

## Page copy

### G01 · Introduction

H1: Create your account

Enter your details to begin. Read the service terms before you continue.

Existing-account link: Already have an account? Sign in. → `/login`

### G02 · Form

Label: Full name

Label: Email address

Email helper: Use an address you can access for account messages.

Label: Password

Password helper: Use a unique password for this account.

Label: Confirm password

Confirm helper: Enter the same password again.

### G03 · Terms and action

Proposed required checkbox: I agree to the Terms of service.

Terms link → `/terms`

Separate information line: Read the Privacy policy to understand how your information is handled. → `/policy`

Risk line: Crypto assets can lose value. You could lose all the money you invest.

Button: Create account

Support link: Need help registering? Contact support. → `/contact`

## Interface states

| State | Copy |
| --- | --- |
| Name missing | Enter your full name. |
| Email invalid | Enter an email address in the format name@example.com. |
| Password missing | Enter a password. |
| Password does not meet rules | Your password must meet the requirements shown above. |
| Confirmation mismatch | The passwords don't match. Enter the same password in both fields. |
| Terms unchecked | Read and agree to the Terms of service to continue. |
| Submitting | Creating account… |
| Success, session established | Your account is ready. Continue to your account. |
| Success, email verification required | Check your email to confirm your account. Follow the link to continue. |
| Duplicate or unavailable signup | We couldn't create an account with those details. Try signing in or contact support. |
| Server failure | We couldn't create your account. Try again or contact support. |

Error summary: Check the highlighted fields.

## Publication dependencies

D01, D07 and D09 apply. Mirror actual server password requirements above the field; the legacy server has not established the advertised eight-character rule. Add a phone field only if required by the supported registration flow, with a reason. Do not collect extra data solely because the legacy form did.

Use exactly one successful outcome matching the backend. Do not claim email delivery before the provider accepts it. No GitHub sign-up option until supported. Keep marketing opt-in separate and optional if it is introduced. Terms must be complete before visitors can accept them.
